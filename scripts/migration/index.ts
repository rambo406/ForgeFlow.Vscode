/**
 * Entry point for the async/await to RxMethod migration system
 * This file exports the main types and utilities for the migration process
 */

// Core types
export * from './types';

// File utilities
export * from './file-utils';

// File scanner and discovery
export * from './file-scanner';

// Pattern recognition engine
export * from './pattern-recognition';

// Conversion templates
export * from './conversion-templates';

// Compatibility wrapper generator
export * from './compatibility-wrapper';

// Import statement manager
export * from './import-manager';

// Code generation engine
export * from './code-generator';

// Migration orchestrator
export * from './migration-orchestrator';

// Migration reporting system
export * from './migration-reporter';

// Version information
export const MIGRATION_VERSION = '1.0.0';

/**
 * Default configuration for migration
 */
export const DEFAULT_MIGRATION_CONFIG = {
  dryRun: false,
  verbose: false,
  createBackups: true,
  targetFiles: [],
  excludePatterns: ['node_modules/**', 'dist/**', '**/*.spec.ts', '**/*.test.ts'],
  preserveCompatibility: true,
  outputDirectory: undefined,
  generateDetailedReport: true,
  reportFormat: 'markdown' as const,
  reportOutputPath: undefined
};

/**
 * Supported conversion patterns
 */
export const SUPPORTED_PATTERNS = [
  'simple-load',
  'optimistic-update', 
  'bulk-operation',
  'custom'
] as const;

/**
 * Default import statements required for RxMethod conversions
 */
export const DEFAULT_RXMETHOD_IMPORTS = {
  modulePath: '@ngrx/signals/rxjs-interop',
  namedImports: ['rxMethod'],
  defaultImport: undefined,
  namespaceImport: undefined
};

export const DEFAULT_RXJS_IMPORTS = {
  modulePath: 'rxjs',
  namedImports: ['pipe', 'switchMap', 'tap', 'finalize', 'from', 'lastValueFrom', 'catchError', 'EMPTY'],
  defaultImport: undefined,
  namespaceImport: undefined
};

/**
 * Utility patterns and their corresponding imports
 */
export const UTILITY_PATTERNS = {
  'simple-load': {
    utilityFunction: 'createLoadingStatePattern',
    modulePath: '../../../utils/RxMethodUtils',
    namedImports: ['createLoadingStatePattern']
  },
  'optimistic-update': {
    utilityFunction: 'createOptimisticUpdatePattern',
    modulePath: '../../../utils/RxMethodUtils', 
    namedImports: ['createOptimisticUpdatePattern']
  },
  'bulk-operation': {
    utilityFunction: 'createBulkOperationPattern',
    modulePath: '../../../utils/RxMethodUtils',
    namedImports: ['createBulkOperationPattern']
  }
} as const;

/**
 * File extensions to consider for migration
 */
export const STORE_FILE_PATTERNS = [
  '**/*.store.ts'
];

/**
 * Patterns to exclude from migration
 */
export const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.d.ts'
];

/**
 * Regular expressions for pattern detection
 */
export const PATTERN_REGEX = {
  asyncMethod: /async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise<[^>]*>/g,
  asyncArrowFunction: /(\w+)\s*:\s*async\s*\([^)]*\)\s*=>/g,
  patchState: /patchState\s*\(\s*store\s*,\s*{[^}]*}/g,
  messageService: /messageService\.(\w+)\s*\(/g,
  errorHandling: /catch\s*\([^)]*\)\s*{[^}]*}/g,
  loadingState: /isLoading\s*:\s*true/g
};

/**
 * TypeScript compilation check command
 */
export const TYPESCRIPT_CHECK_COMMAND = 'npx tsc --noEmit';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  writeToFile: boolean;
  filePath?: string;
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  writeToFile: true,
  filePath: undefined // Will be set based on output directory
};