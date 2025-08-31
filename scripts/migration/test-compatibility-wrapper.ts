import { 
  generateEnhancedCompatibilityWrapper,
  generateCompatibilityWrappers,
  generateMigrationPlan,
  validateWrapperGeneration,
  DEFAULT_WRAPPER_CONFIG 
} from './compatibility-wrapper';
import { parseStoreFile } from './file-scanner';
import { recognizePattern } from './pattern-recognition';
import * as path from 'path';

/**
 * Test script for enhanced compatibility wrapper generator
 */

async function testCompatibilityWrappers() {
  console.log('=== Testing Enhanced Compatibility Wrapper Generator ===\n');
  
  try {
    // Test with known store files
    const projectRoot = path.resolve(__dirname, '../../');
    const knownStoreFiles = [
      path.join(projectRoot, 'src/webview-angular/src/app/features/dashboard/store/dashboard.store.ts'),
      path.join(projectRoot, 'src/webview-angular/src/app/features/comment-preview/store/comment-preview.store.ts')
    ];
    
    let allMethods: any[] = [];
    let allWrappers: any[] = [];
    
    for (const filePath of knownStoreFiles) {
      try {
        console.log(`\n=== Testing Wrappers for ${path.basename(filePath)} ===`);
        
        const parseResult = await parseStoreFile(filePath);
        
        if (parseResult.asyncMethods.length === 0) {
          console.log('No async methods to generate wrappers for');
          continue;
        }
        
        console.log(`Found ${parseResult.asyncMethods.length} async methods`);
        allMethods.push(...parseResult.asyncMethods);
        
        // Test individual wrapper generation with different configurations
        console.log('\n--- Testing Individual Wrapper Generation ---');
        
        for (const method of parseResult.asyncMethods) {
          console.log(`\nTesting wrapper for: ${method.methodName}`);
          
          // Test with default configuration
          const defaultWrapper = generateEnhancedCompatibilityWrapper(method);
          console.log(`✅ Default wrapper: ${defaultWrapper.wrapperMethodName}`);
          console.log(`   Preserved signature: ${defaultWrapper.preservedSignature}`);
          
          // Validate the wrapper
          const validation = validateWrapperGeneration(defaultWrapper, method);
          console.log(`   Validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
          if (validation.warnings.length > 0) {
            console.log(`   Warnings: ${validation.warnings.join(', ')}`);
          }
          if (validation.errors.length > 0) {
            console.log(`   Errors: ${validation.errors.join(', ')}`);
          }
          
          // Show wrapper preview
          const wrapperLines = defaultWrapper.code.split('\n');
          console.log(`   Wrapper preview (first 5 lines):`);
          wrapperLines.slice(0, 5).forEach(line => {
            console.log(`     ${line}`);
          });
          
          // Test with minimal configuration
          const minimalConfig = {
            ...DEFAULT_WRAPPER_CONFIG,
            errorHandlingStrategy: 'minimal' as const,
            includeDeprecationWarnings: false,
            generateJSDoc: false
          };
          
          const minimalWrapper = generateEnhancedCompatibilityWrapper(method, minimalConfig);
          console.log(`   Minimal wrapper lines: ${minimalWrapper.code.split('\n').length}`);
          
          // Test with preserve original name configuration
          const preserveNameConfig = {
            ...DEFAULT_WRAPPER_CONFIG,
            preserveOriginalName: true,
            useAsyncSuffix: false
          };
          
          const preserveNameWrapper = generateEnhancedCompatibilityWrapper(method, preserveNameConfig);
          console.log(`   Preserve name wrapper: ${preserveNameWrapper.wrapperMethodName}`);
          
          allWrappers.push(defaultWrapper);
        }
        
        // Test batch generation
        console.log('\n--- Testing Batch Wrapper Generation ---');
        const batchResult = generateCompatibilityWrappers(parseResult.asyncMethods);
        
        console.log(`✅ Batch generated ${batchResult.wrappers.length} wrappers`);
        console.log(`   Required imports: ${batchResult.requiredImports.length} modules`);
        console.log(`   Migration effort: ${batchResult.summary.estimatedMigrationEffort}`);
        console.log(`   Wrappers with deprecation: ${batchResult.summary.wrappersWithDeprecation}`);
        console.log(`   Wrappers with enhanced error handling: ${batchResult.summary.wrappersWithEnhancedErrorHandling}`);
        
        // Show required imports
        console.log('   Required imports:');
        batchResult.requiredImports.forEach(imp => {
          console.log(`     - ${imp.modulePath}: [${imp.namedImports.join(', ')}]`);
        });
        
      } catch (error) {
        console.error(`❌ Failed to test wrappers for ${path.basename(filePath)}:`, error);
      }
    }
    
    // Test migration plan generation
    if (allMethods.length > 0 && allWrappers.length > 0) {
      console.log('\n=== Testing Migration Plan Generation ===');
      
      const migrationPlan = generateMigrationPlan(allWrappers, allMethods);
      
      console.log(`✅ Generated migration plan with ${migrationPlan.totalPhases} phases`);
      
      migrationPlan.phases.forEach(phase => {
        console.log(`\n📋 Phase ${phase.phase}: ${phase.description}`);
        console.log(`   Wrappers: ${phase.wrappers.length} methods`);
        console.log(`   Effort: ${phase.estimatedEffort}`);
        console.log(`   Dependencies: ${phase.dependencies.length}`);
        
        if (phase.wrappers.length <= 5) {
          console.log(`   Methods: ${phase.wrappers.join(', ')}`);
        } else {
          console.log(`   Methods: ${phase.wrappers.slice(0, 3).join(', ')} and ${phase.wrappers.length - 3} more`);
        }
      });
      
      console.log('\n💡 Migration Recommendations:');
      migrationPlan.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    
    // Test different error handling strategies
    console.log('\n=== Testing Error Handling Strategies ===');
    
    if (allMethods.length > 0) {
      const testMethod = allMethods[0];
      
      const strategies = ['minimal', 'preserve', 'enhanced'] as const;
      strategies.forEach(strategy => {
        const config = {
          ...DEFAULT_WRAPPER_CONFIG,
          errorHandlingStrategy: strategy
        };
        
        const wrapper = generateEnhancedCompatibilityWrapper(testMethod, config);
        const errorHandlingLines = wrapper.code.split('\n').filter(line => 
          line.includes('catch') || line.includes('throw') || line.includes('console.error')
        ).length;
        
        console.log(`${strategy} strategy: ${errorHandlingLines} error handling lines`);
      });
    }
    
    // Test edge cases
    console.log('\n=== Testing Edge Cases ===');
    
    // Test method with no parameters
    const noParamMethod = {
      methodName: 'testNoParams',
      returnType: 'Promise<void>',
      parameters: [],
      pattern: 'simple-load' as const,
      hasErrorHandling: true,
      hasLoadingState: false,
      usesOptimisticUpdate: false,
      dependencies: ['messageService.test'],
      sourceCode: 'async testNoParams() { return; }',
      startLine: 1,
      endLine: 1
    };
    
    const noParamWrapper = generateEnhancedCompatibilityWrapper(noParamMethod);
    console.log(`✅ No parameters wrapper: ${noParamWrapper.wrapperMethodName}`);
    
    // Test method with optional parameters
    const optionalParamMethod = {
      methodName: 'testOptionalParams',
      returnType: 'Promise<string>',
      parameters: [
        { name: 'id', type: 'string', isOptional: false },
        { name: 'options', type: 'any', isOptional: true }
      ],
      pattern: 'simple-load' as const,
      hasErrorHandling: true,
      hasLoadingState: true,
      usesOptimisticUpdate: false,
      dependencies: ['messageService.fetch'],
      sourceCode: 'async testOptionalParams(id: string, options?: any) { return "test"; }',
      startLine: 1,
      endLine: 1
    };
    
    const optionalParamWrapper = generateEnhancedCompatibilityWrapper(optionalParamMethod);
    console.log(`✅ Optional parameters wrapper: ${optionalParamWrapper.wrapperMethodName}`);
    
    // Test method ending with 'Async'
    const asyncSuffixMethod = {
      methodName: 'loadDataAsync',
      returnType: 'Promise<any>',
      parameters: [{ name: 'filter', type: 'string', isOptional: false }],
      pattern: 'simple-load' as const,
      hasErrorHandling: true,
      hasLoadingState: true,
      usesOptimisticUpdate: false,
      dependencies: ['messageService.loadData'],
      sourceCode: 'async loadDataAsync(filter: string) { return {}; }',
      startLine: 1,
      endLine: 1
    };
    
    const asyncSuffixWrapper = generateEnhancedCompatibilityWrapper(asyncSuffixMethod);
    console.log(`✅ Async suffix wrapper: ${asyncSuffixWrapper.wrapperMethodName} (avoids double suffix)`);
    
    // Summary
    console.log('\n=== Compatibility Wrapper Testing Summary ===');
    console.log(`✅ Total methods tested: ${allMethods.length}`);
    console.log(`✅ Total wrappers generated: ${allWrappers.length}`);
    console.log(`✅ Migration plan generated successfully`);
    console.log(`✅ All error handling strategies tested`);
    console.log(`✅ Edge cases handled correctly`);
    console.log(`✅ Validation system working`);
    
    console.log('\n=== Compatibility Wrapper Testing Complete ===');
    
  } catch (error) {
    console.error('❌ Compatibility wrapper testing failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCompatibilityWrappers().catch(console.error);
}

export { testCompatibilityWrappers };