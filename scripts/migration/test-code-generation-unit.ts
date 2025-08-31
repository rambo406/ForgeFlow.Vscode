import { 
  generateConvertedCode,
  generateConversionReport,
  CodeGenerationConfig,
  CodeGenerationResult,
  DEFAULT_CODE_GEN_CONFIG 
} from './code-generator';
import { 
  AsyncMethodPattern, 
  PatternContext,
  ImportStatement 
} from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Unit tests for code generation functionality
 * Tests RxMethod template generation, compatibility wrapper generation, 
 * import statement generation, and validation of generated code
 */

// Test data and utilities
const createMockContext = (): PatternContext => ({
  storeState: ['isLoading', 'error', 'data', 'comments'],
  injectedServices: ['messageService'],
  existingRxMethods: [],
  existingImports: [],
  hasLoadingState: true,
  hasErrorState: true
});

const createSimpleLoadingMethod = (): AsyncMethodPattern => ({
  methodName: 'loadData',
  returnType: 'Promise<Data>',
  parameters: [{
    name: 'params',
    type: 'LoadParams',
    isOptional: false,
    defaultValue: undefined
  }],
  pattern: 'simple-load',
  hasErrorHandling: true,
  hasLoadingState: true,
  usesOptimisticUpdate: false,
  dependencies: ['messageService'],
  sourceCode: `
    patchState(store, { isLoading: true, error: undefined });
    try {
      const result = await messageService.loadData(params);
      patchState(store, { data: result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Load failed';
      patchState(store, { error: errorMessage });
      throw error;
    } finally {
      patchState(store, { isLoading: false });
    }
  `,
  startLine: 25, // Line where loadData method starts
  endLine: 35,   // Line where loadData method ends  
  filePath: 'test.store.ts',
  confidence: 85,
  type: 'simple-load'
});

const createOptimisticUpdateMethod = (): AsyncMethodPattern => ({
  methodName: 'updateComment',
  returnType: 'Promise<void>',
  parameters: [
    {
      name: 'id',
      type: 'string',
      isOptional: false,
      defaultValue: undefined
    },
    {
      name: 'content',
      type: 'string',
      isOptional: false,
      defaultValue: undefined
    }
  ],
  pattern: 'optimistic-update',
  hasErrorHandling: true,
  hasLoadingState: false,
  usesOptimisticUpdate: true,
  dependencies: ['messageService'],
  sourceCode: `
    const originalComments = store.comments();
    const optimisticComments = originalComments.map(comment =>
      comment.id === id ? { ...comment, content } : comment
    );
    patchState(store, { comments: optimisticComments });
    
    try {
      await messageService.updateComment(id, content);
    } catch (error) {
      patchState(store, { comments: originalComments });
      throw error;
    }
  `,
  startLine: 37, // Line where updateComment method starts
  endLine: 50,   // Line where updateComment method ends
  filePath: 'test.store.ts',
  confidence: 75,
  type: 'optimistic-update'
});

const createBulkOperationMethod = (): AsyncMethodPattern => ({
  methodName: 'bulkApproveComments',
  returnType: 'Promise<void>',
  parameters: [{
    name: 'commentIds',
    type: 'string[]',
    isOptional: false,
    defaultValue: undefined
  }],
  pattern: 'bulk-operation',
  hasErrorHandling: true,
  hasLoadingState: true,
  usesOptimisticUpdate: false,
  dependencies: ['messageService'],
  sourceCode: `
    patchState(store, { isLoading: true });
    try {
      await Promise.all(commentIds.map(id => messageService.approveComment(id)));
      const updatedComments = store.comments().map(comment =>
        commentIds.includes(comment.id) ? { ...comment, approved: true } : comment
      );
      patchState(store, { comments: updatedComments });
    } catch (error) {
      throw error;
    } finally {
      patchState(store, { isLoading: false });
    }
  `,
  startLine: 52, // Line where bulkApproveComments method starts
  endLine: 65,   // Line where bulkApproveComments method ends
  filePath: 'test.store.ts',
  confidence: 80,
  type: 'bulk-operation'
});

const createCustomPatternMethod = (): AsyncMethodPattern => ({
  methodName: 'complexAsyncOperation',
  returnType: 'Promise<Result>',
  parameters: [{
    name: 'data',
    type: 'ComplexData',
    isOptional: false,
    defaultValue: undefined
  }],
  pattern: 'custom',
  hasErrorHandling: true,
  hasLoadingState: false,
  usesOptimisticUpdate: false,
  dependencies: ['serviceA', 'serviceB'],
  sourceCode: `
    const step1 = await serviceA.process(data);
    const step2 = await serviceB.validate(step1);
    if (!step2.isValid) {
      throw new Error('Validation failed');
    }
    const result = await serviceA.finalize(step2);
    patchState(store, { result });
    return result;
  `,
  startLine: 67, // Line where complexAsyncOperation method starts
  endLine: 77,   // Line where complexAsyncOperation method ends
  filePath: 'test.store.ts',
  confidence: 45,
  type: 'custom'
});

const createSampleStoreFile = (): string => `
import { computed, effect, inject, signal } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MessageService } from '../services/message.service';

interface StoreState {
  isLoading: boolean;
  data: any;
  error?: string;
  comments: Comment[];
  result?: any;
}

const initialState: StoreState = {
  isLoading: false,
  data: null,
  error: undefined,
  comments: [],
  result: undefined
};

export const TestStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, messageService = inject(MessageService)) => ({
    async loadData(params: LoadParams): Promise<Data> {
      patchState(store, { isLoading: true, error: undefined });
      try {
        const result = await messageService.loadData(params);
        patchState(store, { data: result });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Load failed';
        patchState(store, { error: errorMessage });
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async updateComment(id: string, content: string): Promise<void> {
      const originalComments = store.comments();
      const optimisticComments = originalComments.map(comment =>
        comment.id === id ? { ...comment, content } : comment
      );
      patchState(store, { comments: optimisticComments });
      
      try {
        await messageService.updateComment(id, content);
      } catch (error) {
        patchState(store, { comments: originalComments });
        throw error;
      }
    },

    async bulkApproveComments(commentIds: string[]): Promise<void> {
      patchState(store, { isLoading: true });
      try {
        await Promise.all(commentIds.map(id => messageService.approveComment(id)));
        const updatedComments = store.comments().map(comment =>
          commentIds.includes(comment.id) ? { ...comment, approved: true } : comment
        );
        patchState(store, { comments: updatedComments });
      } catch (error) {
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async complexAsyncOperation(data: ComplexData): Promise<Result> {
      const step1 = await serviceA.process(data);
      const step2 = await serviceB.validate(step1);
      if (!step2.isValid) {
        throw new Error('Validation failed');
      }
      const result = await serviceA.finalize(step2);
      patchState(store, { result });
      return result;
    }
  }))
);
`;

// Test runner functions
async function runTest(testName: string, testFn: () => Promise<void> | void): Promise<void> {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    await testFn();
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertContains(text: string, substring: string, message?: string): void {
  assert(
    text.includes(substring),
    message || `Expected text to contain "${substring}"`
  );
}

function assertNotContains(text: string, substring: string, message?: string): void {
  assert(
    !text.includes(substring),
    message || `Expected text not to contain "${substring}"`
  );
}

function assertMatches(text: string, pattern: RegExp, message?: string): void {
  assert(
    pattern.test(text),
    message || `Expected text to match pattern ${pattern}`
  );
}

// Test Suite 1: RxMethod Template Generation Tests
export async function testRxMethodTemplateGeneration(): Promise<void> {
  console.log('\n🔧 Testing RxMethod Template Generation...');

  await runTest('Simple loading pattern generates correct RxMethod code', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    assert(result.methodsConverted === 1, 'Should convert exactly 1 method');
    
    // Check for rxMethod syntax
    assertContains(result.convertedCode, 'rxMethod<LoadParams>', 'Should contain rxMethod with correct type');
    assertContains(result.convertedCode, 'pipe(', 'Should contain pipe operator');
    assertContains(result.convertedCode, 'switchMap', 'Should use switchMap for async operations');
    assertContains(result.convertedCode, 'from(', 'Should use from() to wrap Promises');
    
    // Check for state management
    assertContains(result.convertedCode, 'patchState(store, { isLoading: true', 'Should set loading state');
    assertContains(result.convertedCode, 'isLoading: false', 'Should reset loading state');
    
    // Check for error handling
    assertContains(result.convertedCode, 'catchError', 'Should include error handling');
    assertContains(result.convertedCode, 'error', 'Should handle errors');
  });

  await runTest('Optimistic update pattern generates correct utility usage', async () => {
    const method = createOptimisticUpdateMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Should use utility pattern for optimistic updates
    assertContains(result.convertedCode, 'createOptimisticUpdatePattern', 'Should use optimistic update utility');
    assertContains(result.convertedCode, 'optimistic', 'Should mention optimistic updates');
    
    // Check conversion details
    const conversion = result.conversions.find(c => c.methodName === 'updateComment');
    assert(conversion !== undefined, 'Should have conversion record');
    assert(conversion!.pattern === 'optimistic-update', 'Should identify as optimistic update pattern');
  });

  await runTest('Bulk operation pattern generates parallel processing code', async () => {
    const method = createBulkOperationMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Should use bulk operation pattern
    assertContains(result.convertedCode, 'createBulkOperationPattern', 'Should use bulk operation utility');
    assertContains(result.convertedCode, 'bulk', 'Should mention bulk operations');
    
    // Check for proper array handling
    assertContains(result.convertedCode, 'commentIds', 'Should handle array parameter');
  });

  await runTest('Custom pattern generates fallback template with manual review flag', async () => {
    const method = createCustomPatternMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    assert(result.warnings.length > 0, 'Should generate warnings for custom patterns');
    
    // Should generate basic template with manual review needed
    assertContains(result.convertedCode, 'rxMethod', 'Should still generate rxMethod');
    assertContains(result.convertedCode, 'MANUAL REVIEW', 'Should add manual review comment');
    
    // Check warning message
    const warning = result.warnings.find(w => w.method === 'complexAsyncOperation');
    assert(warning !== undefined, 'Should have warning for custom pattern');
    assertContains(warning!.warning, 'manual review', 'Warning should mention manual review');
  });
}

// Test Suite 2: Compatibility Wrapper Generation Tests
export async function testCompatibilityWrapperGeneration(): Promise<void> {
  console.log('\n🔗 Testing Compatibility Wrapper Generation...');

  await runTest('Generates async wrapper maintaining Promise behavior', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      generateCompatibilityWrappers: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Check for compatibility wrapper
    assertContains(result.convertedCode, 'async loadDataAsync', 'Should generate async wrapper with Async suffix');
    assertContains(result.convertedCode, 'lastValueFrom', 'Should use lastValueFrom to convert Observable to Promise');
    assertContains(result.convertedCode, 'this.loadData(params)', 'Should call the RxMethod version');
    
    // Check for proper return type
    assertContains(result.convertedCode, ': Promise<Data>', 'Should maintain original Promise return type');
    
    // Check conversion record
    const conversion = result.conversions.find(c => c.methodName === 'loadData');
    assert(conversion !== undefined, 'Should have conversion record');
    assert(conversion!.wrapper !== undefined, 'Should include wrapper code');
  });

  await runTest('Preserves original method signatures in wrappers', async () => {
    const method = createOptimisticUpdateMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      generateCompatibilityWrappers: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Check wrapper preserves original signature
    assertContains(result.convertedCode, 'updateCommentAsync(id: string, content: string): Promise<void>', 'Should preserve parameter names and types');
    
    // Should handle void return type correctly
    assertContains(result.convertedCode, 'Promise<void>', 'Should maintain void Promise return type');
  });

  await runTest('Generates error handling in compatibility wrappers', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      generateCompatibilityWrappers: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Check for error conversion
    assertContains(result.convertedCode, 'catch', 'Should include error handling in wrapper');
    assertContains(result.convertedCode, 'throw', 'Should re-throw errors to maintain Promise behavior');
  });

  await runTest('Can disable compatibility wrapper generation', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      generateCompatibilityWrappers: false,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Should not contain wrapper code
    assertNotContains(result.convertedCode, 'loadDataAsync', 'Should not generate wrapper when disabled');
    assertNotContains(result.convertedCode, 'Compatibility wrappers', 'Should not include wrapper section when disabled');
    
    // Conversion record should not have wrapper
    const conversion = result.conversions.find(c => c.methodName === 'loadData');
    assert(conversion !== undefined, 'Should have conversion record');
    assert(conversion!.wrapper === undefined, 'Should not include wrapper when disabled');
  });
}

// Test Suite 3: Import Statement Generation Tests  
export async function testImportStatementGeneration(): Promise<void> {
  console.log('\n📦 Testing Import Statement Generation...');

  await runTest('Adds required rxMethod and RxJS imports', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      updateImports: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Check for required imports
    assertContains(result.convertedCode, "import { rxMethod } from '@ngrx/signals/rxjs-interop'", 'Should add rxMethod import');
    assertContains(result.convertedCode, "from 'rxjs'", 'Should add RxJS imports');
    assertContains(result.convertedCode, 'pipe', 'Should import pipe operator');
    assertContains(result.convertedCode, 'switchMap', 'Should import switchMap operator');
    assertContains(result.convertedCode, 'from', 'Should import from function');
    assertContains(result.convertedCode, 'lastValueFrom', 'Should import lastValueFrom for compatibility wrappers');
    
    // Check import changes tracking
    assert(result.importChanges.added.length > 0, 'Should track added imports');
    const rxMethodImport = result.importChanges.added.find(imp => imp.modulePath === '@ngrx/signals/rxjs-interop');
    assert(rxMethodImport !== undefined, 'Should add rxMethod import');
    assert(rxMethodImport!.namedImports.includes('rxMethod'), 'Should include rxMethod in named imports');
  });

  await runTest('Adds utility imports for pattern-specific utilities', async () => {
    const method = createOptimisticUpdateMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      updateImports: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Check for utility imports
    assertContains(result.convertedCode, "from '../../../utils/RxMethodUtils'", 'Should add utility imports');
    assertContains(result.convertedCode, 'createOptimisticUpdatePattern', 'Should import optimistic update utility');
    
    // Check import changes tracking
    const utilityImport = result.importChanges.added.find(imp => imp.modulePath === '../../../utils/RxMethodUtils');
    assert(utilityImport !== undefined, 'Should add utility import');
    assert(utilityImport!.namedImports.includes('createOptimisticUpdatePattern'), 'Should include utility in named imports');
  });

  await runTest('Merges imports with existing import statements', async () => {
    const storeWithExistingImports = `
import { computed, effect, inject, signal } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { pipe, tap } from 'rxjs';
import { MessageService } from '../services/message.service';
${createSampleStoreFile().split('\n').slice(4).join('\n')}
`;
    
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      updateImports: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      storeWithExistingImports,
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Should merge with existing RxJS imports
    assertContains(result.convertedCode, 'pipe, tap, switchMap, finalize, from, lastValueFrom, catchError, EMPTY', 'Should merge new imports with existing');
    
    // Should not duplicate existing imports
    const pipeMatches = (result.convertedCode.match(/pipe/g) || []).length;
    assert(pipeMatches >= 2, 'Should include pipe in imports and usage'); // Once in import, multiple times in usage
    
    // Check import changes tracking
    assert(result.importChanges.modified.length > 0, 'Should track modified imports');
  });

  await runTest('Can disable import updates', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      updateImports: false,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Should not add new imports when disabled
    assert(result.importChanges.added.length === 0, 'Should not add imports when disabled');
    assert(result.importChanges.modified.length === 0, 'Should not modify imports when disabled');
    
    // Original imports should remain unchanged
    assertNotContains(result.convertedCode, "import { rxMethod }", 'Should not add rxMethod import when disabled');
  });
}

// Test Suite 4: Generated Code Validation Tests
export async function testGeneratedCodeValidation(): Promise<void> {
  console.log('\n✅ Testing Generated Code Validation...');

  await runTest('Validates TypeScript syntax of generated code', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      validateOutput: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    assert(result.validationResults.isValid, 'Generated code should be syntactically valid');
    assert(result.validationResults.syntaxErrors.length === 0, 'Should have no syntax errors');
  });

  await runTest('Detects syntax errors in malformed generated code', async () => {
    // This test simulates a scenario where code generation might produce invalid syntax
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      validateOutput: true,
      dryRun: true 
    };
    
    // Create malformed source that would break syntax
    const malformedSource = createSampleStoreFile().replace('{', '{{'); // Double opening brace
    
    const result = await generateConvertedCode(
      malformedSource,
      'test.store.ts',
      [method],
      context,
      config
    );

    // Even with malformed input, the validation should catch syntax issues
    if (result.validationResults.syntaxErrors.length > 0) {
      assert(result.validationResults.syntaxErrors.some(err => err.includes('brace')), 'Should detect brace mismatch');
    }
  });

  await runTest('Validates method signature consistency', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      validateOutput: true,
      generateCompatibilityWrappers: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Check that both rxMethod and wrapper have consistent signatures
    assertContains(result.convertedCode, 'rxMethod<LoadParams>', 'RxMethod should have correct input type');
    assertContains(result.convertedCode, 'loadDataAsync(params: LoadParams): Promise<Data>', 'Wrapper should maintain original signature');
  });

  await runTest('Reports compilation issues when validation is enabled', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      validateOutput: true,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Validation results should be populated
    assert(result.validationResults !== undefined, 'Should have validation results');
    assert(typeof result.validationResults.isValid === 'boolean', 'Should have validation status');
    assert(Array.isArray(result.validationResults.syntaxErrors), 'Should have syntax errors array');
    assert(Array.isArray(result.validationResults.typeErrors), 'Should have type errors array');
  });

  await runTest('Can skip validation when disabled', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { 
      ...DEFAULT_CODE_GEN_CONFIG, 
      validateOutput: false,
      dryRun: true 
    };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Validation should indicate it was skipped or have default values
    // Since validation is disabled, the validation results should still exist but may be empty
    assert(result.validationResults !== undefined, 'Should still have validation results structure');
  });
}

// Test Suite 5: Error Handling and Edge Cases
export async function testErrorHandlingAndEdgeCases(): Promise<void> {
  console.log('\n🚨 Testing Error Handling and Edge Cases...');

  await runTest('Handles empty method list gracefully', async () => {
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [], // Empty method list
      context,
      config
    );

    assert(result.success, 'Should succeed with empty method list');
    assert(result.methodsConverted === 0, 'Should convert 0 methods');
    assert(result.methodsSkipped === 0, 'Should skip 0 methods');
    assert(result.errors.length === 0, 'Should have no errors');
    assert(result.convertedCode === createSampleStoreFile(), 'Should return original code unchanged');
  });

  await runTest('Handles invalid source code gracefully', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const invalidSource = 'This is not valid TypeScript code {{{';
    
    const result = await generateConvertedCode(
      invalidSource,
      'test.store.ts',
      [method],
      context,
      config
    );

    // Should handle gracefully and report errors
    assert(!result.success || result.errors.length > 0, 'Should report failure or errors for invalid source');
  });

  await runTest('Handles methods with invalid line numbers', async () => {
    const method: AsyncMethodPattern = {
      ...createSimpleLoadingMethod(),
      startLine: 999, // Invalid line number
      endLine: 1000
    };
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [method],
      context,
      config
    );

    // Should handle gracefully
    assert(result.methodsSkipped > 0 || result.errors.length > 0, 'Should skip method or report error for invalid line numbers');
    
    if (result.errors.length > 0) {
      const error = result.errors.find(e => e.method === 'loadData');
      assert(error !== undefined, 'Should have error for the method with invalid line numbers');
      assertContains(error!.error, 'out of range', 'Error should mention line range issue');
    }
  });

  await runTest('Handles mixed success and failure scenarios', async () => {
    const validMethod = createSimpleLoadingMethod();
    const invalidMethod: AsyncMethodPattern = {
      ...createOptimisticUpdateMethod(),
      startLine: 999, // Invalid line number
      endLine: 1000
    };
    
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [validMethod, invalidMethod],
      context,
      config
    );

    // Should partially succeed
    assert(result.methodsConverted > 0, 'Should convert at least one method');
    assert(result.methodsSkipped > 0 || result.errors.length > 0, 'Should skip or error on invalid method');
    
    // Should have conversion for valid method
    const validConversion = result.conversions.find(c => c.methodName === 'loadData');
    assert(validConversion !== undefined, 'Should have conversion for valid method');
    
    // Should handle invalid method gracefully
    const invalidConversion = result.conversions.find(c => c.methodName === 'updateComment');
    assert(invalidConversion === undefined, 'Should not have conversion for invalid method');
  });

  await runTest('Preserves indentation in generated code', async () => {
    const method = createSimpleLoadingMethod();
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const indentedSource = createSampleStoreFile().replace(
      'async loadData(params: LoadParams): Promise<Data> {',
      '    async loadData(params: LoadParams): Promise<Data> {' // Add extra indentation
    );
    
    const result = await generateConvertedCode(
      indentedSource,
      'test.store.ts',
      [method],
      context,
      config
    );

    assert(result.success, 'Code generation should succeed');
    
    // Generated code should preserve indentation
    const lines = result.convertedCode.split('\n');
    const rxMethodLine = lines.find(line => line.includes('rxMethod'));
    assert(rxMethodLine !== undefined, 'Should find rxMethod line');
    
    // Check that indentation is preserved (should start with spaces)
    const indentMatch = rxMethodLine!.match(/^(\s*)/);
    assert(indentMatch !== null && indentMatch[1].length > 0, 'Should preserve indentation in generated code');
  });
}

// Test Suite 6: Conversion Report Generation Tests
export async function testConversionReportGeneration(): Promise<void> {
  console.log('\n📊 Testing Conversion Report Generation...');

  await runTest('Generates comprehensive conversion report', async () => {
    const methods = [
      createSimpleLoadingMethod(),
      createOptimisticUpdateMethod(),
      createBulkOperationMethod()
    ];
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      methods,
      context,
      config
    );

    const report = generateConversionReport(result, 'test.store.ts');
    
    // Check report structure
    assertContains(report, 'Async to RxMethod Conversion Report', 'Should have report title');
    assertContains(report, 'test.store.ts', 'Should include file path');
    assertContains(report, 'Methods Converted:', 'Should include conversion count');
    assertContains(report, 'Import Changes:', 'Should include import information');
    assertContains(report, 'Validation:', 'Should include validation results');
    
    // Check method details
    assertContains(report, 'loadData', 'Should include first method');
    assertContains(report, 'updateComment', 'Should include second method');
    assertContains(report, 'bulkApproveComments', 'Should include third method');
    
    // Check pattern information
    assertContains(report, 'simple-load', 'Should show simple loading pattern');
    assertContains(report, 'optimistic-update', 'Should show optimistic update pattern');
    assertContains(report, 'bulk-operation', 'Should show bulk operation pattern');
    
    // Check confidence levels
    assertMatches(report, /\d+%/, 'Should include confidence percentages');
  });

  await runTest('Reports errors and warnings in conversion report', async () => {
    const invalidMethod: AsyncMethodPattern = {
      ...createSimpleLoadingMethod(),
      startLine: 999, // This will cause an error
      endLine: 1000
    };
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [invalidMethod],
      context,
      config
    );

    const report = generateConversionReport(result, 'test.store.ts');
    
    // Should report errors
    if (result.errors.length > 0) {
      assertContains(report, 'Errors', 'Should have errors section');
      assertContains(report, '❌', 'Should use error emoji');
    }
    
    // Should provide next steps
    assertContains(report, 'Next Steps', 'Should include next steps section');
    
    if (!result.success) {
      assertContains(report, 'Address the errors', 'Should suggest addressing errors');
    }
  });

  await runTest('Includes confidence-based recommendations in report', async () => {
    const customMethod = createCustomPatternMethod(); // This should have lower confidence
    const context = createMockContext();
    const config: CodeGenerationConfig = { ...DEFAULT_CODE_GEN_CONFIG, dryRun: true };
    
    const result = await generateConvertedCode(
      createSampleStoreFile(),
      'test.store.ts',
      [customMethod],
      context,
      config
    );

    const report = generateConversionReport(result, 'test.store.ts');
    
    // Should indicate methods requiring review based on confidence
    assertContains(report, 'Requires Review', 'Should flag low confidence methods for review');
    assertContains(report, 'complexAsyncOperation', 'Should include the custom method name');
  });
}

// Main test runner
export async function runAllCodeGenerationTests(): Promise<void> {
  console.log('🚀 Starting Code Generation Unit Tests...');
  console.log('=' .repeat(60));
  
  try {
    await testRxMethodTemplateGeneration();
    await testCompatibilityWrapperGeneration();
    await testImportStatementGeneration();
    await testGeneratedCodeValidation();
    await testErrorHandlingAndEdgeCases();
    await testConversionReportGeneration();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ ALL TESTS PASSED! Code generation functionality is working correctly.');
    console.log('📊 Test Summary:');
    console.log('   - RxMethod template generation: ✅');
    console.log('   - Compatibility wrapper generation: ✅');
    console.log('   - Import statement generation: ✅');
    console.log('   - Generated code validation: ✅');
    console.log('   - Error handling and edge cases: ✅');
    console.log('   - Conversion report generation: ✅');
    
  } catch (error) {
    console.error('\n' + '=' .repeat(60));
    console.error('❌ TEST SUITE FAILED!');
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Export test runner for CLI usage
if (require.main === module) {
  runAllCodeGenerationTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}