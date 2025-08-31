import { AsyncMethodPattern, AsyncWrapper, ImportStatement } from './types';

/**
 * Enhanced compatibility wrapper generator for maintaining Promise-based APIs
 * while transitioning to RxMethod implementations
 */

/**
 * Configuration options for compatibility wrapper generation
 */
export interface CompatibilityWrapperConfig {
  useAsyncSuffix: boolean;
  preserveOriginalName: boolean;
  includeDeprecationWarnings: boolean;
  addTodoComments: boolean;
  generateJSDoc: boolean;
  errorHandlingStrategy: 'preserve' | 'enhanced' | 'minimal';
  conversionNotes: boolean;
}

/**
 * Default configuration for compatibility wrappers
 */
export const DEFAULT_WRAPPER_CONFIG: CompatibilityWrapperConfig = {
  useAsyncSuffix: true,
  preserveOriginalName: false,
  includeDeprecationWarnings: true,
  addTodoComments: true,
  generateJSDoc: true,
  errorHandlingStrategy: 'enhanced',
  conversionNotes: true
};

/**
 * Enhanced compatibility wrapper generator
 */
export function generateEnhancedCompatibilityWrapper(
  method: AsyncMethodPattern,
  config: CompatibilityWrapperConfig = DEFAULT_WRAPPER_CONFIG
): AsyncWrapper {
  const wrapperName = determineWrapperName(method, config);
  const preservedSignature = generatePreservedSignature(method);
  const wrapperCode = generateWrapperImplementation(method, config);
  
  return {
    originalMethodName: method.methodName,
    wrapperMethodName: wrapperName,
    code: wrapperCode,
    preservedSignature
  };
}

/**
 * Determines the appropriate wrapper method name based on configuration
 */
function determineWrapperName(
  method: AsyncMethodPattern,
  config: CompatibilityWrapperConfig
): string {
  if (config.preserveOriginalName) {
    return method.methodName;
  }
  
  if (config.useAsyncSuffix) {
    // Avoid double 'Async' suffix
    if (method.methodName.endsWith('Async')) {
      return `${method.methodName}Promise`;
    }
    return `${method.methodName}Async`;
  }
  
  return `${method.methodName}Promise`;
}

/**
 * Generates the preserved method signature for type compatibility
 */
function generatePreservedSignature(method: AsyncMethodPattern): string {
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  return `${method.methodName}(${paramString}): ${method.returnType}`;
}

/**
 * Generates the complete wrapper implementation
 */
function generateWrapperImplementation(
  method: AsyncMethodPattern,
  config: CompatibilityWrapperConfig
): string {
  const wrapperName = determineWrapperName(method, config);
  const paramString = method.parameters
    .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
    .join(', ');
  const paramNames = method.parameters.map(p => p.name).join(', ');
  const hasParams = method.parameters.length > 0;
  
  // Generate JSDoc if requested
  const jsDoc = config.generateJSDoc ? generateJSDoc(method, config) : '';
  
  // Generate deprecation warning if requested
  const deprecationWarning = config.includeDeprecationWarnings ? 
    generateDeprecationWarning(method, config) : '';
  
  // Generate method call based on parameter structure
  const methodCall = generateMethodCall(method, paramNames, hasParams);
  
  // Generate error handling based on strategy
  const errorHandling = generateErrorHandling(method, config);
  
  // Generate TODO comments if requested
  const todoComments = config.addTodoComments ? generateTodoComments(method) : '';
  
  const implementation = `
${jsDoc}${deprecationWarning}async ${wrapperName}(${paramString}): ${method.returnType} {${todoComments}
  try {
    ${methodCall}
  } catch (error) {
    ${errorHandling}
  }
}`.trim();

  return implementation;
}

/**
 * Generates JSDoc documentation for the wrapper
 */
function generateJSDoc(
  method: AsyncMethodPattern,
  config: CompatibilityWrapperConfig
): string {
  const wrapperName = determineWrapperName(method, config);
  
  let jsDoc = `/**
 * Compatibility wrapper for ${method.methodName}
 * Maintains Promise-based API for existing callers while the underlying implementation uses rxMethod
 * 
 * @deprecated This wrapper will be removed in a future version. 
 *             Migrate to use the rxMethod directly: this.${method.methodName}()
 * 
`;

  // Add parameter documentation
  method.parameters.forEach(param => {
    jsDoc += ` * @param {${param.type}} ${param.name}${param.isOptional ? ' - Optional parameter' : ''}\n`;
  });

  // Add return type documentation
  const returnTypeClean = method.returnType.replace('Promise<', '').replace('>', '');
  jsDoc += ` * @returns {${method.returnType}} Promise resolving to ${returnTypeClean}\n`;

  if (config.conversionNotes) {
    jsDoc += ` * 
 * @migration-notes
 * - Original pattern: ${method.pattern}
 * - Error handling: ${method.hasErrorHandling ? 'preserved' : 'enhanced'}
 * - Loading state: ${method.hasLoadingState ? 'managed by rxMethod' : 'none'}
`;
  }

  jsDoc += ` */\n`;
  return jsDoc;
}

/**
 * Generates deprecation warning console output
 */
function generateDeprecationWarning(
  method: AsyncMethodPattern,
  config: CompatibilityWrapperConfig
): string {
  const wrapperName = determineWrapperName(method, config);
  
  return `
  // Deprecation warning for development
  if (console && console.warn) {
    console.warn(
      \`DEPRECATION WARNING: \${${wrapperName.replace(/([A-Z])/g, '_$1').toLowerCase()}_wrapper_used} \\n\` +
      \`The ${wrapperName} compatibility wrapper is deprecated. \\n\` +
      \`Please migrate to use the rxMethod directly: this.${method.methodName}() \\n\` +
      \`This wrapper will be removed in a future version.\`
    );
  }
`;
}

/**
 * Generates the method call based on parameter structure
 */
function generateMethodCall(
  method: AsyncMethodPattern,
  paramNames: string,
  hasParams: boolean
): string {
  if (!hasParams) {
    return `return await lastValueFrom(this.${method.methodName}());`;
  }
  
  if (method.parameters.length === 1) {
    return `return await lastValueFrom(this.${method.methodName}(${paramNames}));`;
  }
  
  // Multiple parameters - pass as object
  return `return await lastValueFrom(this.${method.methodName}({ ${paramNames} }));`;
}

/**
 * Generates error handling based on configuration strategy
 */
function generateErrorHandling(
  method: AsyncMethodPattern,
  config: CompatibilityWrapperConfig
): string {
  switch (config.errorHandlingStrategy) {
    case 'minimal':
      return `throw error;`;
    
    case 'preserve':
      return `
console.error('${method.methodName} compatibility wrapper error:', error);
throw error;`;
    
    case 'enhanced':
    default:
      return `
// Enhanced error handling for compatibility wrapper
const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
console.error(\`\${method.methodName} compatibility wrapper error:\`, {
  originalError: error,
  method: '${method.methodName}',
  parameters: { ${method.parameters.map(p => `${p.name}`).join(', ')} },
  timestamp: new Date().toISOString()
});

// Preserve original error type and message
if (error instanceof Error) {
  throw error;
} else {
  throw new Error(\`\${method.methodName} failed: \${errorMessage}\`);
}`;
  }
}

/**
 * Generates TODO comments for migration guidance
 */
function generateTodoComments(method: AsyncMethodPattern): string {
  return `
  // TODO: Migrate callers to use the rxMethod directly
  // TODO: Remove this compatibility wrapper after migration is complete
  // TODO: Update tests to use the new rxMethod implementation`;
}

/**
 * Generates import statements required for compatibility wrappers
 */
export function generateWrapperImports(): ImportStatement[] {
  return [
    {
      modulePath: 'rxjs',
      namedImports: ['lastValueFrom'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];
}

/**
 * Batch generates compatibility wrappers for multiple methods
 */
export function generateCompatibilityWrappers(
  methods: AsyncMethodPattern[],
  config: CompatibilityWrapperConfig = DEFAULT_WRAPPER_CONFIG
): {
  wrappers: AsyncWrapper[];
  requiredImports: ImportStatement[];
  summary: {
    totalWrappers: number;
    wrappersWithDeprecation: number;
    wrappersWithEnhancedErrorHandling: number;
    estimatedMigrationEffort: 'low' | 'medium' | 'high';
  };
} {
  const wrappers = methods.map(method => 
    generateEnhancedCompatibilityWrapper(method, config)
  );
  
  const requiredImports = generateWrapperImports();
  
  const summary = {
    totalWrappers: wrappers.length,
    wrappersWithDeprecation: config.includeDeprecationWarnings ? wrappers.length : 0,
    wrappersWithEnhancedErrorHandling: config.errorHandlingStrategy === 'enhanced' ? wrappers.length : 0,
    estimatedMigrationEffort: estimateMigrationEffort(methods)
  };
  
  return {
    wrappers,
    requiredImports,
    summary
  };
}

/**
 * Estimates migration effort based on method complexity
 */
function estimateMigrationEffort(methods: AsyncMethodPattern[]): 'low' | 'medium' | 'high' {
  const complexMethods = methods.filter(m => 
    m.pattern === 'custom' || 
    m.sourceCode.length > 1000 ||
    m.dependencies.length > 3
  ).length;
  
  const complexityRatio = complexMethods / methods.length;
  
  if (complexityRatio < 0.3) return 'low';
  if (complexityRatio < 0.6) return 'medium';
  return 'high';
}

/**
 * Generates a migration plan for removing compatibility wrappers
 */
export function generateMigrationPlan(
  wrappers: AsyncWrapper[],
  methods: AsyncMethodPattern[]
): {
  phases: Array<{
    phase: number;
    description: string;
    wrappers: string[];
    estimatedEffort: string;
    dependencies: string[];
  }>;
  totalPhases: number;
  recommendations: string[];
} {
  // Phase 1: Simple loading patterns (easiest to migrate)
  const phase1 = methods
    .filter(m => m.pattern === 'simple-load' && !m.usesOptimisticUpdate)
    .map(m => wrappers.find(w => w.originalMethodName === m.methodName)?.wrapperMethodName)
    .filter(Boolean) as string[];
  
  // Phase 2: Optimistic updates and bulk operations
  const phase2 = methods
    .filter(m => m.pattern === 'optimistic-update' || m.pattern === 'bulk-operation')
    .map(m => wrappers.find(w => w.originalMethodName === m.methodName)?.wrapperMethodName)
    .filter(Boolean) as string[];
  
  // Phase 3: Custom patterns (require most attention)
  const phase3 = methods
    .filter(m => m.pattern === 'custom')
    .map(m => wrappers.find(w => w.originalMethodName === m.methodName)?.wrapperMethodName)
    .filter(Boolean) as string[];
  
  const phases = [
    {
      phase: 1,
      description: 'Migrate simple loading patterns',
      wrappers: phase1,
      estimatedEffort: 'Low - straightforward rxMethod usage',
      dependencies: ['Update unit tests', 'Verify error handling']
    },
    {
      phase: 2,
      description: 'Migrate optimistic updates and bulk operations',
      wrappers: phase2,
      estimatedEffort: 'Medium - requires understanding of utility patterns',
      dependencies: ['Review state management', 'Test rollback scenarios', 'Verify performance improvements']
    },
    {
      phase: 3,
      description: 'Migrate custom patterns',
      wrappers: phase3,
      estimatedEffort: 'High - requires manual review and custom implementation',
      dependencies: ['Code review', 'Comprehensive testing', 'Performance validation']
    }
  ].filter(phase => phase.wrappers.length > 0);
  
  const recommendations = [
    'Start with Phase 1 methods to gain familiarity with rxMethod patterns',
    'Update TypeScript definitions to prefer rxMethod signatures',
    'Use deprecation warnings to identify remaining wrapper usage',
    'Run comprehensive tests after each phase',
    'Monitor application performance during migration',
    'Document any behavior changes for the team'
  ];
  
  return {
    phases,
    totalPhases: phases.length,
    recommendations
  };
}

/**
 * Validates compatibility wrapper generation
 */
export function validateWrapperGeneration(
  wrapper: AsyncWrapper,
  originalMethod: AsyncMethodPattern
): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check if wrapper preserves return type
  if (!wrapper.code.includes(originalMethod.returnType.replace('Promise<', '').replace('>', ''))) {
    warnings.push('Wrapper may not preserve exact return type');
  }
  
  // Check if wrapper includes error handling
  if (!wrapper.code.includes('catch')) {
    errors.push('Wrapper must include error handling');
  }
  
  // Check if wrapper uses lastValueFrom
  if (!wrapper.code.includes('lastValueFrom')) {
    errors.push('Wrapper must use lastValueFrom for Observable to Promise conversion');
  }
  
  // Check parameter handling
  if (originalMethod.parameters.length > 0 && !wrapper.code.includes('this.' + originalMethod.methodName)) {
    errors.push('Wrapper must call the underlying rxMethod');
  }
  
  // Check for deprecation notice (if configured)
  if (wrapper.code.includes('@deprecated') && !wrapper.code.includes('console.warn')) {
    warnings.push('Consider adding runtime deprecation warning');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}