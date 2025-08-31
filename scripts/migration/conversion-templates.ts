import { AsyncMethodPattern, ConversionTemplate, ImportStatement } from './types';

/**
 * RxMethod conversion templates for generating reactive implementations
 * Based on the established patterns in the existing codebase
 */

/**
 * Template for simple loading pattern using rxMethod
 */
export function createSimpleLoadingTemplate(method: AsyncMethodPattern): ConversionTemplate {
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const paramNames = method.parameters.map(p => p.name).join(', ');
  const hasParams = method.parameters.length > 0;
  
  // Extract the main service call from dependencies
  const serviceCall = method.dependencies.find(dep => dep.includes('messageService.')) || 'messageService.operation';
  const serviceName = serviceCall.split('.')[1] || 'operation';
  
  // Determine input type
  const inputType = hasParams ? 
    (method.parameters.length === 1 ? method.parameters[0].type : `{ ${paramString} }`) : 
    'void';
  
  // Determine return type
  const returnType = method.returnType.replace('Promise<', '').replace('>', '') || 'void';
  
  const template = `
/**
 * ${method.methodName} converted to rxMethod
 * Original: async ${method.methodName}(${paramString}): ${method.returnType}
 */
${method.methodName}: rxMethod<${inputType}>(pipe(
  tap(() => patchState(store, { isLoading: true, error: undefined })),
  switchMap((${hasParams ? (method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`) : '_'}: ${inputType}) => 
    from(messageService.${serviceName}(${paramNames})).pipe(
      tap({
        next: (response: any) => {
          // Update state with response data
          // TODO: Customize based on your state structure
          patchState(store, { 
            // Add appropriate state updates here
            isLoading: false 
          });
        },
        error: (error: any) => {
          const errorMessage = error instanceof Error ? error.message : 'Operation failed';
          patchState(store, { 
            isLoading: false,
            error: errorMessage 
          });
        }
      }),
      catchError((error: any) => {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        patchState(store, { 
          isLoading: false,
          error: errorMessage 
        });
        return EMPTY;
      })
    )
  ),
  finalize(() => patchState(store, { isLoading: false }))
)),`.trim();

  const requiredImports: ImportStatement[] = [
    {
      modulePath: '@ngrx/signals/rxjs-interop',
      namedImports: ['rxMethod'],
      defaultImport: undefined,
      namespaceImport: undefined
    },
    {
      modulePath: 'rxjs',
      namedImports: ['pipe', 'switchMap', 'tap', 'finalize', 'from', 'catchError', 'EMPTY'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];

  return {
    pattern: 'simple-load',
    template,
    requiredImports,
    utilityFunctions: [],
    description: `Converts ${method.methodName} to rxMethod with standard loading state management`
  };
}

/**
 * Template for optimistic update pattern using createOptimisticUpdatePattern utility
 */
export function createOptimisticUpdateTemplate(method: AsyncMethodPattern): ConversionTemplate {
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const paramNames = method.parameters.map(p => p.name).join(', ');
  const hasParams = method.parameters.length > 0;
  
  // Determine input type
  const inputType = hasParams ? 
    (method.parameters.length === 1 ? method.parameters[0].type : `{ ${paramString} }`) : 
    'void';
  
  // Extract the main service call from dependencies
  const serviceCall = method.dependencies.find(dep => dep.includes('messageService.')) || 'messageService.operation';
  const serviceName = serviceCall.split('.')[1] || 'operation';
  
  const template = `
/**
 * ${method.methodName} converted to rxMethod with optimistic updates
 * Original: async ${method.methodName}(${paramString}): ${method.returnType}
 */
${method.methodName}: createOptimisticUpdatePattern(
  store,
  // Optimistic update function
  (${hasParams ? (method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`) : '_'}: ${inputType}) => {
    // TODO: Implement optimistic state update
    // Example: Update local state immediately for better UX
    const updatedItems = store.items().map(item =>
      // Add your optimistic update logic here
      item
    );
    patchState(store, { items: updatedItems });
  },
  // Async operation function
  (${hasParams ? (method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`) : '_'}: ${inputType}) => 
    messageService.${serviceName}(${paramNames}),
  // Rollback function
  (${hasParams ? (method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`) : '_'}: ${inputType}) => {
    // TODO: Implement rollback logic
    // Example: Restore original state on error
    const originalItems = store.originalItems();
    patchState(store, { items: originalItems });
  }
),`.trim();

  const requiredImports: ImportStatement[] = [
    {
      modulePath: '@ngrx/signals/rxjs-interop',
      namedImports: ['rxMethod'],
      defaultImport: undefined,
      namespaceImport: undefined
    },
    {
      modulePath: '../../../utils/RxMethodUtils',
      namedImports: ['createOptimisticUpdatePattern'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];

  return {
    pattern: 'optimistic-update',
    template,
    requiredImports,
    utilityFunctions: ['createOptimisticUpdatePattern'],
    description: `Converts ${method.methodName} to rxMethod with optimistic updates and rollback`
  };
}

/**
 * Template for bulk operation pattern using createBulkOperationPattern utility
 */
export function createBulkOperationTemplate(method: AsyncMethodPattern): ConversionTemplate {
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const paramNames = method.parameters.map(p => p.name).join(', ');
  const hasParams = method.parameters.length > 0;
  
  // Find array parameter for bulk operations
  const arrayParam = method.parameters.find(p => 
    p.type.includes('[]') || p.type.includes('Array<')
  );
  
  const inputType = hasParams ? 
    (method.parameters.length === 1 ? method.parameters[0].type : `{ ${paramString} }`) : 
    'void';
  
  // Extract the main service call from dependencies
  const serviceCall = method.dependencies.find(dep => dep.includes('messageService.')) || 'messageService.operation';
  const serviceName = serviceCall.split('.')[1] || 'operation';
  
  const template = `
/**
 * ${method.methodName} converted to rxMethod for bulk operations
 * Original: async ${method.methodName}(${paramString}): ${method.returnType}
 */
${method.methodName}: createBulkOperationPattern(
  store,
  // Bulk operation function
  (${hasParams ? (method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`) : 'items'}: ${inputType}) => {
    ${arrayParam ? `
    // Parallel execution for better performance
    return Promise.all(
      ${arrayParam.name}.map(item => messageService.${serviceName}(item))
    );` : `
    // TODO: Implement bulk operation logic
    return messageService.${serviceName}(${paramNames});`}
  },
  // Optional progress callback
  (completed: number, total: number) => {
    console.log(\`Progress: \${completed}/\${total}\`);
    // TODO: Update progress state if needed
    // patchState(store, { progress: { completed, total } });
  }
),`.trim();

  const requiredImports: ImportStatement[] = [
    {
      modulePath: '@ngrx/signals/rxjs-interop',
      namedImports: ['rxMethod'],
      defaultImport: undefined,
      namespaceImport: undefined
    },
    {
      modulePath: '../../../utils/RxMethodUtils',
      namedImports: ['createBulkOperationPattern'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];

  return {
    pattern: 'bulk-operation',
    template,
    requiredImports,
    utilityFunctions: ['createBulkOperationPattern'],
    description: `Converts ${method.methodName} to rxMethod with parallel bulk operation processing`
  };
}

/**
 * Template for custom pattern - manual rxMethod implementation
 */
export function createCustomTemplate(method: AsyncMethodPattern): ConversionTemplate {
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const paramNames = method.parameters.map(p => p.name).join(', ');
  const hasParams = method.parameters.length > 0;
  
  const inputType = hasParams ? 
    (method.parameters.length === 1 ? method.parameters[0].type : `{ ${paramString} }`) : 
    'void';
  
  const template = `
/**
 * ${method.methodName} converted to rxMethod (custom pattern)
 * Original: async ${method.methodName}(${paramString}): ${method.returnType}
 * 
 * ⚠️  MANUAL REVIEW REQUIRED ⚠️
 * This method has complex logic that requires manual conversion.
 * Please review the original implementation and adapt accordingly.
 */
${method.methodName}: rxMethod<${inputType}>(pipe(
  tap(() => patchState(store, { isLoading: true, error: undefined })),
  switchMap((${hasParams ? (method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`) : '_'}: ${inputType}) => {
    
    // TODO: Convert the original async/await logic to RxJS operators
    // Original method body:
    /*
${method.sourceCode.split('\n').map(line => `     * ${line}`).join('\n')}
     */
    
    // Example conversion pattern:
    return from(
      // Replace this with your actual async operation
      Promise.resolve() as Promise<any>
    ).pipe(
      tap({
        next: (result: any) => {
          // TODO: Update state based on result
          patchState(store, { 
            // Add appropriate state updates here
            isLoading: false 
          });
        },
        error: (error: any) => {
          const errorMessage = error instanceof Error ? error.message : 'Operation failed';
          patchState(store, { 
            isLoading: false,
            error: errorMessage 
          });
        }
      }),
      catchError((error: any) => {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        patchState(store, { 
          isLoading: false,
          error: errorMessage 
        });
        return EMPTY;
      })
    );
  }),
  finalize(() => patchState(store, { isLoading: false }))
)),`.trim();

  const requiredImports: ImportStatement[] = [
    {
      modulePath: '@ngrx/signals/rxjs-interop',
      namedImports: ['rxMethod'],
      defaultImport: undefined,
      namespaceImport: undefined
    },
    {
      modulePath: 'rxjs',
      namedImports: ['pipe', 'switchMap', 'tap', 'finalize', 'from', 'catchError', 'EMPTY'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];

  return {
    pattern: 'custom',
    template,
    requiredImports,
    utilityFunctions: [],
    description: `Custom rxMethod template for ${method.methodName} - requires manual review and adaptation`
  };
}

/**
 * Main template generator - selects appropriate template based on pattern
 */
export function generateConversionTemplate(
  method: AsyncMethodPattern,
  recommendedPattern?: AsyncMethodPattern['pattern']
): ConversionTemplate {
  const pattern = recommendedPattern || method.pattern;
  
  switch (pattern) {
    case 'simple-load':
      return createSimpleLoadingTemplate(method);
    case 'optimistic-update':
      return createOptimisticUpdateTemplate(method);
    case 'bulk-operation':
      return createBulkOperationTemplate(method);
    case 'custom':
    default:
      return createCustomTemplate(method);
  }
}

/**
 * Generates compatibility wrapper for maintaining Promise-based API
 */
export function generateCompatibilityWrapper(method: AsyncMethodPattern): {
  wrapperName: string;
  wrapperCode: string;
  preservedSignature: string;
} {
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  const paramNames = method.parameters.map(p => p.name).join(', ');
  const hasParams = method.parameters.length > 0;
  
  const wrapperName = `${method.methodName}Async`;
  const preservedSignature = `${method.methodName}(${paramString}): ${method.returnType}`;
  
  const wrapperCode = `
/**
 * Compatibility wrapper for ${method.methodName}
 * Maintains Promise-based API for existing callers
 * TODO: Migrate callers to use the rxMethod directly, then remove this wrapper
 */
async ${wrapperName}(${paramString}): ${method.returnType} {
  try {
    ${hasParams ? `
    return await lastValueFrom(this.${method.methodName}(${method.parameters.length === 1 ? paramNames : `{ ${paramNames} }`}));
    ` : `
    return await lastValueFrom(this.${method.methodName}());
    `}
  } catch (error) {
    console.error('${method.methodName} compatibility wrapper error:', error);
    throw error;
  }
}`.trim();

  return {
    wrapperName,
    wrapperCode,
    preservedSignature
  };
}

/**
 * Template registry for easy access to all templates
 */
export const TEMPLATE_REGISTRY = {
  'simple-load': createSimpleLoadingTemplate,
  'optimistic-update': createOptimisticUpdateTemplate,
  'bulk-operation': createBulkOperationTemplate,
  'custom': createCustomTemplate
} as const;

/**
 * Validates template generation for common issues
 */
export function validateTemplate(template: ConversionTemplate, method: AsyncMethodPattern): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for required imports
  if (template.requiredImports.length === 0) {
    errors.push('Template must specify required imports');
  }
  
  // Check for rxMethod usage
  if (!template.template.includes('rxMethod')) {
    errors.push('Template must use rxMethod');
  }
  
  // Check for state management
  if (!template.template.includes('patchState')) {
    warnings.push('Template should include state management with patchState');
  }
  
  // Check for error handling
  if (!template.template.includes('catchError')) {
    warnings.push('Template should include error handling with catchError');
  }
  
  // Check for loading state management
  if (method.hasLoadingState && !template.template.includes('isLoading')) {
    warnings.push('Original method has loading state, but template does not manage loading state');
  }
  
  // Check for TODO comments in custom patterns
  if (template.pattern === 'custom' && !template.template.includes('TODO')) {
    warnings.push('Custom templates should include TODO comments for manual review');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Generates multiple template options for comparison
 */
export function generateTemplateOptions(method: AsyncMethodPattern): {
  primary: ConversionTemplate;
  alternatives: Array<{
    pattern: AsyncMethodPattern['pattern'];
    template: ConversionTemplate;
    reason: string;
  }>;
} {
  const primary = generateConversionTemplate(method);
  
  const alternatives: Array<{
    pattern: AsyncMethodPattern['pattern'];
    template: ConversionTemplate;
    reason: string;
  }> = [];
  
  // Generate alternative templates for comparison
  const patterns: AsyncMethodPattern['pattern'][] = ['simple-load', 'optimistic-update', 'bulk-operation', 'custom'];
  
  patterns.forEach(pattern => {
    if (pattern !== method.pattern) {
      const altTemplate = generateConversionTemplate(method, pattern);
      let reason = '';
      
      switch (pattern) {
        case 'simple-load':
          reason = 'If this is primarily a data loading operation';
          break;
        case 'optimistic-update':
          reason = 'If this method would benefit from optimistic UI updates';
          break;
        case 'bulk-operation':
          reason = 'If this processes multiple items in parallel';
          break;
        case 'custom':
          reason = 'For manual fine-tuning of the implementation';
          break;
      }
      
      alternatives.push({
        pattern,
        template: altTemplate,
        reason
      });
    }
  });
  
  return {
    primary,
    alternatives
  };
}