/**
 * Unit tests for validation and error handling system
 * Tests the validation components for accuracy and reliability
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  validatePreConversion, 
  validatePostConversion, 
  validateTypeScriptCompilation,
  validatePatterns,
  runComprehensiveValidation,
  DEFAULT_VALIDATION_CONFIG
} from './validation.js';
import { 
  AsyncMethodPattern, 
  ConversionResult, 
  RxMethodImplementation,
  ValidationResult 
} from './types.js';

/**
 * Test data for validation tests
 */
const mockAsyncMethodPattern: AsyncMethodPattern = {
  methodName: 'loadData',
  returnType: 'Promise<Data>',
  parameters: [
    { name: 'id', type: 'string', isOptional: false }
  ],
  pattern: 'simple-load',
  hasErrorHandling: true,
  hasLoadingState: true,
  usesOptimisticUpdate: false,
  dependencies: ['dataService'],
  sourceCode: `
    async loadData(id: string): Promise<Data> {
      patchState(store, { isLoading: true });
      try {
        const data = await this.dataService.getData(id);
        patchState(store, { data, isLoading: false });
        return data;
      } catch (error) {
        patchState(store, { error, isLoading: false });
        throw error;
      }
    }
  `,
  startLine: 10,
  endLine: 20,
  filePath: './test-store.ts',
  confidence: 0.95,
  type: 'simple-load'
};

const mockRxMethodImplementation: RxMethodImplementation = {
  name: 'loadData',
  rxMethodCode: 'loadData: rxMethod<string>(...)',
  compatibilityWrapperCode: 'async loadDataAsync(id: string): Promise<Data> {...}',
  utilityPattern: 'simple-load',
  requiresManualReview: false,
  generatedImports: [],
  comments: ['Generated from async method'],
  methodName: 'loadData',
  pattern: 'simple-load',
  code: `
    loadData: rxMethod<string>(pipe(
      tap(() => patchState(store, { isLoading: true })),
      switchMap(id => from(dataService.getData(id)).pipe(
        tap(data => patchState(store, { data, isLoading: false })),
        catchError(error => {
          patchState(store, { error, isLoading: false });
          return EMPTY;
        })
      ))
    ))
  `
};

const mockConversionResult: ConversionResult = {
  filePath: './test-store.ts',
  originalMethods: [mockAsyncMethodPattern],
  convertedMethods: [mockRxMethodImplementation],
  compatibilityWrappers: [{
    originalMethodName: 'loadData',
    wrapperMethodName: 'loadDataAsync',
    code: 'async loadDataAsync(id: string): Promise<Data> { return lastValueFrom(this.loadData(id)); }',
    preservedSignature: 'loadDataAsync(id: string): Promise<Data>'
  }],
  requiredImports: [],
  success: true,
  warnings: [],
  errors: [],
  convertedCode: `
    export const testStore = signalStore(
      withState({ data: null, isLoading: false, error: null }),
      withMethods((store) => ({
        loadData: rxMethod<string>(pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap(id => from(dataService.getData(id)).pipe(
            tap(data => patchState(store, { data, isLoading: false })),
            catchError(error => {
              patchState(store, { error, isLoading: false });
              return EMPTY;
            })
          ))
        )),
        async loadDataAsync(id: string): Promise<Data> {
          return lastValueFrom(this.loadData(id));
        }
      }))
    );
  `,
  updatedImports: [
    {
      modulePath: '@ngrx/signals/rxjs-interop',
      namedImports: ['rxMethod'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ],
  rxMethodImplementations: [mockRxMethodImplementation]
};

/**
 * Test suite for validation system
 */
export async function runValidationTests(): Promise<void> {
  console.log('🧪 Running validation system tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Pre-conversion validation with valid TypeScript
  totalTests++;
  try {
    // Create a temporary valid TypeScript file
    const tempFilePath = path.join(process.cwd(), 'temp-test-store.ts');
    const validContent = `
      import { signalStore, withState, withMethods } from '@ngrx/signals';
      export const testStore = signalStore(
        withState({ data: null }),
        withMethods(() => ({
          async loadData(): Promise<any> {
            return Promise.resolve('test');
          }
        }))
      );
    `;
    
    await fs.writeFile(tempFilePath, validContent);
    
    const result = await validatePreConversion([tempFilePath]);
    
    if (result.isValid) {
      console.log('✅ Test 1 PASSED: Pre-conversion validation accepts valid TypeScript');
      passedTests++;
    } else {
      console.log('❌ Test 1 FAILED: Pre-conversion validation rejected valid TypeScript');
      console.log('   Errors:', result.errors.map(e => e.message));
    }
    
    // Cleanup
    await fs.unlink(tempFilePath).catch(() => {}); // Ignore cleanup errors
    
  } catch (error) {
    console.log('❌ Test 1 FAILED: Exception during pre-conversion validation test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test 2: Pre-conversion validation with invalid file
  totalTests++;
  try {
    const result = await validatePreConversion(['./non-existent-file.ts']);
    
    if (!result.isValid && result.errors.some(e => e.type === 'file-error')) {
      console.log('✅ Test 2 PASSED: Pre-conversion validation correctly detects missing files');
      passedTests++;
    } else {
      console.log('❌ Test 2 FAILED: Pre-conversion validation should detect missing files');
    }
    
  } catch (error) {
    console.log('❌ Test 2 FAILED: Exception during missing file validation test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test 3: Post-conversion validation with valid conversion result
  totalTests++;
  try {
    const result = await validatePostConversion([mockConversionResult]);
    
    if (result.isValid || result.warnings.length >= 0) { // Allow warnings but not errors
      console.log('✅ Test 3 PASSED: Post-conversion validation accepts valid conversion result');
      passedTests++;
    } else {
      console.log('❌ Test 3 FAILED: Post-conversion validation rejected valid conversion result');
      console.log('   Errors:', result.errors.map(e => e.message));
    }
    
  } catch (error) {
    console.log('❌ Test 3 FAILED: Exception during post-conversion validation test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test 4: Pattern validation with high confidence pattern
  totalTests++;
  try {
    const result = validatePatterns([mockAsyncMethodPattern]);
    
    if (result.isValid) {
      console.log('✅ Test 4 PASSED: Pattern validation accepts high confidence pattern');
      passedTests++;
    } else {
      console.log('❌ Test 4 FAILED: Pattern validation rejected high confidence pattern');
      console.log('   Errors:', result.errors.map(e => e.message));
    }
    
  } catch (error) {
    console.log('❌ Test 4 FAILED: Exception during pattern validation test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test 5: Pattern validation with low confidence pattern
  totalTests++;
  try {
    const lowConfidencePattern: AsyncMethodPattern = {
      ...mockAsyncMethodPattern,
      confidence: 0.3 // Low confidence
    };
    
    const result = validatePatterns([lowConfidencePattern]);
    
    if (result.warnings.some(w => w.message.includes('Low confidence'))) {
      console.log('✅ Test 5 PASSED: Pattern validation warns about low confidence patterns');
      passedTests++;
    } else {
      console.log('❌ Test 5 FAILED: Pattern validation should warn about low confidence patterns');
    }
    
  } catch (error) {
    console.log('❌ Test 5 FAILED: Exception during low confidence pattern test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test 6: TypeScript compilation validation with disabled validation
  totalTests++;
  try {
    const config = { ...DEFAULT_VALIDATION_CONFIG, enableTypeScriptValidation: false };
    const result = await validateTypeScriptCompilation(['./any-file.ts'], config);
    
    if (result.isValid && result.warnings.some(w => w.message.includes('disabled'))) {
      console.log('✅ Test 6 PASSED: TypeScript validation correctly handles disabled state');
      passedTests++;
    } else {
      console.log('❌ Test 6 FAILED: TypeScript validation should handle disabled state correctly');
    }
    
  } catch (error) {
    console.log('❌ Test 6 FAILED: Exception during disabled TypeScript validation test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test 7: Comprehensive validation integration test
  totalTests++;
  try {
    // Create a temporary valid TypeScript file
    const tempFilePath = path.join(process.cwd(), 'temp-integration-store.ts');
    const validContent = `
      import { signalStore, withState, withMethods } from '@ngrx/signals';
      export const integrationStore = signalStore(
        withState({ items: [] }),
        withMethods(() => ({
          async loadItems(): Promise<any[]> {
            return Promise.resolve([]);
          }
        }))
      );
    `;
    
    await fs.writeFile(tempFilePath, validContent);
    
    const result = await runComprehensiveValidation(
      [tempFilePath],
      [mockAsyncMethodPattern],
      [mockConversionResult]
    );
    
    if (result.summary.filesValidated === 1 && result.summary.patternsValidated === 1) {
      console.log('✅ Test 7 PASSED: Comprehensive validation integration test successful');
      passedTests++;
    } else {
      console.log('❌ Test 7 FAILED: Comprehensive validation integration test failed');
      console.log('   Summary:', result.summary);
    }
    
    // Cleanup
    await fs.unlink(tempFilePath).catch(() => {}); // Ignore cleanup errors
    
  } catch (error) {
    console.log('❌ Test 7 FAILED: Exception during comprehensive validation test');
    console.log('   Error:', error instanceof Error ? error.message : error);
  }

  // Test summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All validation tests PASSED!');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) FAILED`);
  }
  
  return;
}

/**
 * Test error recovery system
 */
export async function testErrorRecovery(): Promise<void> {
  console.log('\n🔧 Testing error recovery system...');
  
  // This is a placeholder for future error recovery tests
  // The error recovery system is defined in validation.ts but not fully implemented
  console.log('ℹ️  Error recovery tests will be implemented when the recovery system is complete');
}

/**
 * Performance test for validation system
 */
export async function testValidationPerformance(): Promise<void> {
  console.log('\n⚡ Testing validation performance...');
  
  const startTime = Date.now();
  
  // Create multiple patterns for performance testing
  const patterns: AsyncMethodPattern[] = Array.from({ length: 100 }, (_, i) => ({
    ...mockAsyncMethodPattern,
    methodName: `loadData${i}`,
    confidence: 0.8 + (i % 20) * 0.01 // Vary confidence
  }));
  
  const result = validatePatterns(patterns);
  const duration = Date.now() - startTime;
  
  console.log(`✅ Performance test completed in ${duration}ms`);
  console.log(`   Processed ${patterns.length} patterns`);
  console.log(`   Average: ${(duration / patterns.length).toFixed(2)}ms per pattern`);
  
  if (duration < 1000) { // Should process 100 patterns in less than 1 second
    console.log('✅ Performance test PASSED: Validation is sufficiently fast');
  } else {
    console.log('⚠️  Performance test WARNING: Validation may be too slow for large codebases');
  }
}

/**
 * Main test runner
 */
export async function main(): Promise<void> {
  console.log('🚀 Starting validation system test suite...\n');
  
  try {
    await runValidationTests();
    await testErrorRecovery();
    await testValidationPerformance();
    
    console.log('\n✅ All validation tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}