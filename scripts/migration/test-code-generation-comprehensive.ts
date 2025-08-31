/**
 * Comprehensive unit tests for code generation components
 * Task 12: Create unit tests for code generation
 * Requirements:
 * - Write tests for RxMethod signature generation
 * - Write tests for loading state management conversion  
 * - Write tests for error handling preservation
 * - Write tests for import statement generation
 */

import { 
  generateConvertedCode, 
  generateConversionReport,
  DEFAULT_CODE_GEN_CONFIG
} from './code-generator';
import { 
  createSimpleLoadingTemplate,
  createOptimisticUpdateTemplate,
  createBulkOperationTemplate,
  generateConversionTemplate,
  generateCompatibilityWrapper,
  validateTemplate
} from './conversion-templates';
import { 
  analyzeImports,
  generateImportStatements,
  mergeImports,
  resolveImportConflicts,
  DEFAULT_IMPORT_CONFIG
} from './import-manager';
import { AsyncMethodPattern, PatternContext, ImportStatement } from './types';

/**
 * Helper function to create test async method patterns
 */
function createTestAsyncMethod(
  methodName: string, 
  pattern: AsyncMethodPattern['pattern'] = 'simple-load',
  hasParams: boolean = true
): AsyncMethodPattern {
  return {
    methodName,
    pattern,
    confidence: 0.85,
    filePath: '/test/test.store.ts',
    type: 'async-method',
    startLine: 1,
    endLine: 10,
    parameters: hasParams ? [
      { name: 'id', type: 'number', isOptional: false },
      { name: 'options', type: 'LoadOptions', isOptional: true }
    ] : [],
    returnType: 'Promise<TestData[]>',
    dependencies: ['messageService.loadTestData'],
    usesLoading: true,
    usesError: true,
    hasErrorHandling: true,
    bodyContent: 'const result = await messageService.loadTestData(id, options);'
  };
}

/**
 * Helper function to create test pattern context
 */
function createTestContext(): PatternContext {
  return {
    hasMessageService: true,
    hasLoadingState: true,
    hasErrorState: true,
    servicePatterns: ['loadTestData'],
    stateProperties: ['isLoading', 'error', 'testData'],
    imports: ['@ngrx/signals', 'rxjs'],
    complexity: 'medium'
  };
}

/**
 * Test runner function
 */
async function runCodeGenerationTests(): Promise<void> {
  console.log('🧪 Running Code Generation Unit Tests...\n');
  
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function test(name: string, testFn: () => void | Promise<void>): void {
    try {
      const result = testFn();
      if (result instanceof Promise) {
        result.then(() => {
          console.log(`✅ ${name}`);
          passed++;
        }).catch((error) => {
          console.log(`❌ ${name}: ${error.message}`);
          failed++;
          failures.push(`${name}: ${error.message}`);
        });
      } else {
        console.log(`✅ ${name}`);
        passed++;
      }
    } catch (error: any) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
      failures.push(`${name}: ${error.message}`);
    }
  }

  function expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected: string) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toHaveLength: (expected: number) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual.length}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      }
    };
  }

  // Test 1: RxMethod Signature Generation
  console.log('📋 Test Group 1: RxMethod Signature Generation');
  
  test('should generate basic rxMethod signature for simple method', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('loadData: rxMethod<');
    expect(template.template).toContain('{ id: number, options?: LoadOptions }');
    expect(template.pattern).toBe('simple-load');
  });

  test('should generate rxMethod signature for method without parameters', () => {
    const method = createTestAsyncMethod('refreshData', 'simple-load', false);
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('refreshData: rxMethod<void>');
    expect(template.template).toContain('(_ : void)');
  });

  test('should generate rxMethod signature for single parameter method', () => {
    const method: AsyncMethodPattern = {
      ...createTestAsyncMethod('loadById'),
      parameters: [{ name: 'id', type: 'number', isOptional: false }]
    };
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('loadById: rxMethod<number>');
    expect(template.template).toContain('(id: number)');
  });

  test('should generate optimistic update rxMethod signature', () => {
    const method = createTestAsyncMethod('updateData', 'optimistic-update');
    const template = createOptimisticUpdateTemplate(method);
    
    expect(template.template).toContain('updateData: rxMethod<');
    expect(template.pattern).toBe('optimistic-update');
    expect(template.template).toContain('optimistic');
  });

  test('should generate bulk operation rxMethod signature', () => {
    const method = createTestAsyncMethod('processBatch', 'bulk-operation');
    const template = createBulkOperationTemplate(method);
    
    expect(template.template).toContain('processBatch: rxMethod<');
    expect(template.pattern).toBe('bulk-operation');
    expect(template.template).toContain('bulk');
  });

  // Test 2: Loading State Management Conversion
  console.log('\n📋 Test Group 2: Loading State Management Conversion');
  
  test('should include loading state initialization', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('patchState(store, { isLoading: true');
    expect(template.template).toContain('patchState(store, { isLoading: false');
  });

  test('should handle loading state in finalize operator', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('finalize(() => patchState(store, { isLoading: false }))');
  });

  test('should preserve existing loading state patterns', () => {
    const method = createTestAsyncMethod('loadData');
    method.usesLoading = true;
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('isLoading');
    expect(template.template).toContain('patchState');
  });

  test('should handle loading state in optimistic updates', () => {
    const method = createTestAsyncMethod('updateData', 'optimistic-update');
    const template = createOptimisticUpdateTemplate(method);
    
    expect(template.template).toContain('isLoading');
    expect(template.template).toContain('optimistic');
  });

  test('should manage loading state for bulk operations', () => {
    const method = createTestAsyncMethod('processBatch', 'bulk-operation');
    const template = createBulkOperationTemplate(method);
    
    expect(template.template).toContain('isLoading');
    expect(template.template).toContain('bulk');
  });

  // Test 3: Error Handling Preservation
  console.log('\n📋 Test Group 3: Error Handling Preservation');
  
  test('should preserve error handling in tap operator', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('error: (error: any)');
    expect(template.template).toContain('patchState(store, { isLoading: false, error: errorMessage');
  });

  test('should include catchError operator', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('catchError((error: any)');
    expect(template.template).toContain('return EMPTY');
  });

  test('should handle custom error messages', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    expect(template.template).toContain('error instanceof Error ? error.message : \'Operation failed\'');
  });

  test('should preserve error state in optimistic updates', () => {
    const method = createTestAsyncMethod('updateData', 'optimistic-update');
    method.hasErrorHandling = true;
    const template = createOptimisticUpdateTemplate(method);
    
    expect(template.template).toContain('error');
    expect(template.template).toContain('rollback');
  });

  test('should handle errors in bulk operations', () => {
    const method = createTestAsyncMethod('processBatch', 'bulk-operation');
    method.hasErrorHandling = true;
    const template = createBulkOperationTemplate(method);
    
    expect(template.template).toContain('error');
    expect(template.template).toContain('batch');
  });

  // Test 4: Import Statement Generation
  console.log('\n📋 Test Group 4: Import Statement Generation');
  
  test('should generate required rxMethod imports', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    const rxMethodImport = template.requiredImports.find(imp => 
      imp.modulePath === '@ngrx/signals/rxjs-interop'
    );
    expect(rxMethodImport).toBeTruthy();
    expect(rxMethodImport!.namedImports).toContain('rxMethod');
  });

  test('should generate RxJS operator imports', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    
    const rxjsImport = template.requiredImports.find(imp => 
      imp.modulePath === 'rxjs'
    );
    expect(rxjsImport).toBeTruthy();
    expect(rxjsImport!.namedImports).toContain('pipe');
    expect(rxjsImport!.namedImports).toContain('switchMap');
    expect(rxjsImport!.namedImports).toContain('tap');
    expect(rxjsImport!.namedImports).toContain('catchError');
  });

  test('should generate import statements from template requirements', () => {
    const imports: ImportStatement[] = [
      {
        modulePath: '@ngrx/signals/rxjs-interop',
        namedImports: ['rxMethod'],
        defaultImport: undefined,
        namespaceImport: undefined
      },
      {
        modulePath: 'rxjs',
        namedImports: ['pipe', 'switchMap'],
        defaultImport: undefined,
        namespaceImport: undefined
      }
    ];
    
    const generated = generateImportStatements(imports, DEFAULT_IMPORT_CONFIG);
    
    expect(generated).toContain('import { rxMethod } from \'@ngrx/signals/rxjs-interop\';');
    expect(generated).toContain('import { pipe, switchMap } from \'rxjs\';');
  });

  test('should merge conflicting imports correctly', () => {
    const imports: ImportStatement[] = [
      {
        modulePath: 'rxjs',
        namedImports: ['pipe'],
        defaultImport: undefined,
        namespaceImport: undefined
      },
      {
        modulePath: 'rxjs',
        namedImports: ['switchMap'],
        defaultImport: undefined,
        namespaceImport: undefined
      }
    ];
    
    const merged = mergeImports(imports);
    expect(merged).toHaveLength(1);
    expect(merged[0].namedImports).toContain('pipe');
    expect(merged[0].namedImports).toContain('switchMap');
  });

  test('should resolve import conflicts', () => {
    const imports: ImportStatement[] = [
      {
        modulePath: '@angular/core',
        namedImports: ['Component'],
        defaultImport: undefined,
        namespaceImport: undefined
      },
      {
        modulePath: '@ngrx/signals',
        namedImports: ['Component'],
        defaultImport: undefined,
        namespaceImport: undefined
      }
    ];
    
    const resolved = resolveImportConflicts(imports);
    // Should detect the conflict
    expect(resolved.conflicts).toHaveLength(1);
    expect(resolved.conflicts[0].importName).toBe('Component');
  });

  // Test 5: Integration Tests
  console.log('\n📋 Test Group 5: Integration Tests');
  
  test('should generate complete conversion with all components', async () => {
    const sourceCode = `
import { Injectable } from '@angular/core';

export class TestStore {
  async loadData(id: number): Promise<TestData[]> {
    try {
      const result = await messageService.loadTestData(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}`;
    
    const method = createTestAsyncMethod('loadData');
    const context = createTestContext();
    
    const result = await generateConvertedCode(
      sourceCode,
      '/test/test.store.ts',
      [method],
      context,
      DEFAULT_CODE_GEN_CONFIG
    );
    
    expect(result.success).toBeTruthy();
    expect(result.methodsConverted).toBe(1);
    expect(result.conversions).toHaveLength(1);
    expect(result.importChanges.added).toHaveLength.toBeGreaterThan(0);
  });

  test('should validate generated templates', () => {
    const method = createTestAsyncMethod('loadData');
    const template = createSimpleLoadingTemplate(method);
    const validation = validateTemplate(template, method);
    
    expect(validation.isValid).toBeTruthy();
    expect(validation.errors).toHaveLength(0);
  });

  test('should generate compatibility wrappers', () => {
    const method = createTestAsyncMethod('loadData');
    const wrapper = generateCompatibilityWrapper(method);
    
    expect(wrapper.wrapperName).toBe('loadDataAsync');
    expect(wrapper.wrapperCode).toContain('async loadDataAsync');
    expect(wrapper.wrapperCode).toContain('lastValueFrom');
    expect(wrapper.preservedSignature).toContain('loadData(');
  });

  test('should handle different pattern types in template generation', () => {
    const simpleMethod = createTestAsyncMethod('loadData', 'simple-load');
    const optimisticMethod = createTestAsyncMethod('updateData', 'optimistic-update');
    const bulkMethod = createTestAsyncMethod('processBatch', 'bulk-operation');
    
    const simpleTemplate = generateConversionTemplate(simpleMethod);
    const optimisticTemplate = generateConversionTemplate(optimisticMethod);
    const bulkTemplate = generateConversionTemplate(bulkMethod);
    
    expect(simpleTemplate.pattern).toBe('simple-load');
    expect(optimisticTemplate.pattern).toBe('optimistic-update');
    expect(bulkTemplate.pattern).toBe('bulk-operation');
  });

  test('should generate conversion report', () => {
    const conversions = [
      {
        methodName: 'loadData',
        pattern: 'simple-load' as const,
        confidence: 0.85,
        template: 'loadData: rxMethod<...>',
        wrapper: undefined
      }
    ];
    
    const errors: any[] = [];
    const warnings: any[] = [];
    
    const report = generateConversionReport(conversions, errors, warnings);
    
    expect(report).toContain('loadData');
    expect(report).toContain('simple-load');
    expect(report).toContain('85%');
  });

  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`\n📊 Code Generation Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failures.length > 0) {
    console.log(`\n❌ Failures:`);
    failures.forEach(failure => console.log(`   • ${failure}`));
  }
  
  console.log(`\n🏁 Code Generation Unit Tests Complete!`);
}

// Export for running as module
export { runCodeGenerationTests };

// Run if called directly
if (require.main === module) {
  runCodeGenerationTests().catch(console.error);
}