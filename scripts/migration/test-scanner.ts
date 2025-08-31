import { discoverStoreFiles, parseStoreFile, validateStoreStructure } from './file-scanner';
import * as path from 'path';

/**
 * Test script for the file scanner and discovery system
 */

async function testFileScanner() {
  console.log('=== Testing File Scanner and Discovery System ===\n');
  
  try {
    // Test 1: Discover store files
    const projectRoot = path.resolve(__dirname, '../../');
    console.log('1. Testing store file discovery...');
    const storeFiles = await discoverStoreFiles(projectRoot);
    
    if (storeFiles.length === 0) {
      console.log('⚠️  No store files found. This might be expected for testing.');
    } else {
      console.log(`✅ Found ${storeFiles.length} store files`);
    }
    
    // Test 2: Parse each store file
    console.log('\n2. Testing store file parsing...');
    for (const filePath of storeFiles) {
      try {
        console.log(`\nParsing: ${path.relative(projectRoot, filePath)}`);
        const result = await parseStoreFile(filePath);
        
        console.log(`  - Async methods found: ${result.asyncMethods.length}`);
        console.log(`  - Store state properties: ${result.context.storeState.length}`);
        console.log(`  - Injected services: ${result.context.injectedServices.length}`);
        console.log(`  - Existing RxMethods: ${result.context.existingRxMethods.length}`);
        console.log(`  - Has loading state: ${result.context.hasLoadingState}`);
        console.log(`  - Has error state: ${result.context.hasErrorState}`);
        
        // Show details of found async methods
        if (result.asyncMethods.length > 0) {
          console.log('  - Async methods details:');
          result.asyncMethods.forEach(method => {
            console.log(`    * ${method.methodName}: ${method.pattern} pattern (lines ${method.startLine}-${method.endLine})`);
            console.log(`      Parameters: ${method.parameters.length}, Dependencies: ${method.dependencies.length}`);
            console.log(`      Error handling: ${method.hasErrorHandling}, Loading state: ${method.hasLoadingState}`);
          });
        }
        
        // Validate store structure
        const validation = validateStoreStructure(result.sourceFile);
        console.log(`  - Valid store structure: ${validation.isValidStore}`);
        if (validation.errors.length > 0) {
          console.log(`  - Validation errors: ${validation.errors.join(', ')}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to parse ${filePath}:`, error);
      }
    }
    
    // Test 3: Test with known store files if they exist
    console.log('\n3. Testing specific known store files...');
    const knownStoreFiles = [
      path.join(projectRoot, 'src/webview-angular/src/app/features/dashboard/store/dashboard.store.ts'),
      path.join(projectRoot, 'src/webview-angular/src/app/features/comment-preview/store/comment-preview.store.ts')
    ];
    
    for (const filePath of knownStoreFiles) {
      try {
        const fs = require('fs').promises;
        await fs.access(filePath);
        
        console.log(`\nTesting known store: ${path.basename(filePath)}`);
        const result = await parseStoreFile(filePath);
        
        console.log(`  ✅ Successfully parsed with ${result.asyncMethods.length} async methods`);
        
        // Show method patterns
        const patternCounts = result.asyncMethods.reduce((acc, method) => {
          acc[method.pattern] = (acc[method.pattern] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('  - Pattern distribution:', patternCounts);
        
      } catch (error) {
        console.log(`  ⚠️  Could not access ${path.basename(filePath)}: file may not exist`);
      }
    }
    
    console.log('\n=== File Scanner Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFileScanner().catch(console.error);
}

export { testFileScanner };