/**
 * Core TypeScript interfaces for the async/await to RxMethod migration system
 */

/**
 * Represents a parameter in an async method signature
 */
export interface MethodParameter {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

/**
 * Represents an import statement in a TypeScript file
 */
export interface ImportStatement {
  modulePath: string;
  namedImports: string[];
  defaultImport?: string;
  namespaceImport?: string;
}

/**
 * Represents an identified async method pattern in a store file
 */
export interface AsyncMethodPattern {
  methodName: string;
  returnType: string;
  parameters: MethodParameter[];
  pattern: 'simple-load' | 'optimistic-update' | 'bulk-operation' | 'custom';
  hasErrorHandling: boolean;
  hasLoadingState: boolean;
  usesOptimisticUpdate: boolean;
  dependencies: string[];
  sourceCode: string;
  startLine: number;
  endLine: number;
  filePath: string;
  confidence: number;
  type: 'simple-load' | 'optimistic-update' | 'bulk-operation' | 'custom';
}

/**
 * Represents a generated RxMethod implementation
 */
export interface RxMethodImplementation {
  name: string;
  rxMethodCode: string;
  compatibilityWrapperCode: string;
  utilityPattern: string;
  requiresManualReview: boolean;
  generatedImports: ImportStatement[];
  comments: string[];
  methodName: string;
  pattern: 'simple-load' | 'optimistic-update' | 'bulk-operation' | 'custom';
  code: string;
}

/**
 * Represents an async compatibility wrapper for an RxMethod
 */
export interface AsyncWrapper {
  originalMethodName: string;
  wrapperMethodName: string;
  code: string;
  preservedSignature: string;
}

/**
 * Result of analyzing and converting a store file
 */
export interface ConversionResult {
  filePath: string;
  originalMethods: AsyncMethodPattern[];
  convertedMethods: RxMethodImplementation[];
  compatibilityWrappers: AsyncWrapper[];
  requiredImports: ImportStatement[];
  success: boolean;
  warnings: string[];
  errors: string[];
  backupFilePath?: string;
  convertedCode?: string;
  updatedImports?: ImportStatement[];
  rxMethodImplementations?: RxMethodImplementation[];
}

/**
 * Configuration options for the migration process
 */
export interface MigrationConfig {
  dryRun: boolean;
  verbose: boolean;
  createBackups: boolean;
  targetFiles: string[];
  excludePatterns: string[];
  preserveCompatibility: boolean;
  outputDirectory?: string;
  generateDetailedReport?: boolean;
  reportFormat?: 'markdown' | 'html' | 'json' | 'text';
  reportOutputPath?: string;
  logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;
}

/**
 * Statistics about the migration process
 */
export interface MigrationStats {
  totalFilesProcessed: number;
  successfulConversions: number;
  failedConversions: number;
  methodsConverted: number;
  wrappersGenerated: number;
  warningsGenerated: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Detailed migration report
 */
export interface MigrationReport {
  config: MigrationConfig;
  stats: MigrationStats;
  results: ConversionResult[];
  summary: {
    overallSuccess: boolean;
    filesWithErrors: string[];
    filesWithWarnings: string[];
    methodsRequiringManualReview: Array<{
      file: string;
      method: string;
      reason: string;
    }>;
  };
}

/**
 * Context information for pattern recognition
 */
export interface PatternContext {
  storeState: string[];
  injectedServices: string[];
  existingRxMethods: string[];
  existingImports: ImportStatement[];
  hasLoadingState: boolean;
  hasErrorState: boolean;
}

/**
 * Template for generating RxMethod code
 */
export interface ConversionTemplate {
  pattern: AsyncMethodPattern['pattern'];
  template: string;
  requiredImports: ImportStatement[];
  utilityFunctions: string[];
  description: string;
}

/**
 * Error details for failed conversions
 */
export interface ConversionError {
  type: 'parsing' | 'pattern-recognition' | 'code-generation' | 'validation';
  message: string;
  methodName?: string;
  lineNumber?: number;
  suggestion?: string;
}

/**
 * Warning details for conversions requiring attention
 */
export interface ConversionWarning {
  type: 'manual-review' | 'complexity' | 'compatibility' | 'performance';
  message: string;
  methodName?: string;
  lineNumber?: number;
  recommendation?: string;
}

/**
 * Validation result interface for individual validation checks
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  validatedAt: Date;
  duration: number;
}

/**
 * Validation error details
 */
export interface ValidationError {
  type: 'typescript-error' | 'syntax-error' | 'import-error' | 'pattern-error' | 'dependency-error' | 'file-error' | 'configuration-error';
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  code?: string;
  suggestion?: string;
}

/**
 * Error report for migration failures
 */
export interface ErrorReport {
  filePath: string;
  timestamp: string;
  conversionAttempted: boolean;
  conversionSuccessful: boolean;
  errors: string[];
  warnings: string[];
  methodsProcessed: number;
  methodsConverted: number;
  compatibilityWrappersGenerated: number;
  requiresManualReview: boolean;
  recommendedActions: string[];
}