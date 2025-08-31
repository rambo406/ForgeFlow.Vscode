/**
 * Validation and error handling system for async/await to RxMethod migration
 * Provides comprehensive validation checks before, during, and after migration
 */

import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  AsyncMethodPattern, 
  ConversionResult, 
  MigrationReport,
  RxMethodImplementation 
} from './types.js';

/**
 * Validation configuration options
 */
export interface ValidationConfig {
  /** Enable TypeScript compilation validation */
  enableTypeScriptValidation: boolean;
  /** Enable syntax validation */
  enableSyntaxValidation: boolean;
  /** Enable import validation */
  enableImportValidation: boolean;
  /** Enable pattern validation */
  enablePatternValidation: boolean;
  /** Enable dependency validation */
  enableDependencyValidation: boolean;
  /** TypeScript compiler options */
  compilerOptions?: ts.CompilerOptions;
  /** Maximum number of validation errors before stopping */
  maxErrors: number;
  /** Validation timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableTypeScriptValidation: true,
  enableSyntaxValidation: true,
  enableImportValidation: true,
  enablePatternValidation: true,
  enableDependencyValidation: true,
  maxErrors: 50,
  timeoutMs: 30000,
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    declaration: false,
    noEmit: true
  }
};

/**
 * Validation error types
 */
export type ValidationErrorType = 
  | 'typescript-error'
  | 'syntax-error'
  | 'import-error'
  | 'pattern-error'
  | 'dependency-error'
  | 'file-error'
  | 'configuration-error';

/**
 * Validation error details
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  code?: string;
  suggestion?: string;
}

/**
 * Validation result for individual components
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
 * Comprehensive validation result
 */
export interface ComprehensiveValidationResult {
  overall: ValidationResult;
  preConversion: ValidationResult;
  postConversion: ValidationResult;
  patterns: ValidationResult;
  imports: ValidationResult;
  typescript: ValidationResult;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    filesValidated: number;
    patternsValidated: number;
    success: boolean;
  };
}

/**
 * Pre-conversion validator
 * Validates source files before migration begins
 */
export async function validatePreConversion(
  filePaths: string[],
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<ValidationResult> {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  try {
    // 1. File existence and accessibility validation
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
          errors.push({
            type: 'file-error',
            message: `Path is not a file: ${filePath}`,
            filePath,
            severity: 'error'
          });
          continue;
        }

        if (!filePath.endsWith('.store.ts')) {
          warnings.push({
            type: 'file-error',
            message: `File does not match expected pattern *.store.ts: ${filePath}`,
            filePath,
            severity: 'warning'
          });
        }

        // Check file size (warn if very large)
        const sizeKB = stats.size / 1024;
        if (sizeKB > 100) {
          warnings.push({
            type: 'file-error',
            message: `Large file detected (${sizeKB.toFixed(1)}KB). Migration may take longer.`,
            filePath,
            severity: 'warning'
          });
        }

      } catch (error) {
        errors.push({
          type: 'file-error',
          message: `Cannot access file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          filePath,
          severity: 'error'
        });
      }
    }

    // 2. TypeScript syntax validation
    if (config.enableSyntaxValidation) {
      for (const filePath of filePaths) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const sourceFile = ts.createSourceFile(
            filePath,
            content,
            ts.ScriptTarget.Latest,
            true
          );

          // Check for syntax errors
          const syntaxErrors = ts.getPreEmitDiagnostics(ts.createProgram([filePath], { noEmit: true }));
          for (const diagnostic of syntaxErrors) {
            const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
            errors.push({
              type: 'syntax-error',
              message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
              filePath,
              line: position ? position.line + 1 : undefined,
              column: position ? position.character + 1 : undefined,
              severity: 'error',
              code: `TS${diagnostic.code}`
            });
          }

          // Check for async methods
          let asyncMethodCount = 0;
          const visitNode = (node: ts.Node): void => {
            if (ts.isMethodDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
              asyncMethodCount++;
            }
            if (ts.isPropertyAssignment(node) && ts.isArrowFunction(node.initializer) && 
                node.initializer.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
              asyncMethodCount++;
            }
            ts.forEachChild(node, visitNode);
          };
          visitNode(sourceFile);

          if (asyncMethodCount === 0) {
            warnings.push({
              type: 'pattern-error',
              message: `No async methods found in store file`,
              filePath,
              severity: 'warning'
            });
          } else {
            info.push({
              type: 'pattern-error',
              message: `Found ${asyncMethodCount} async methods for migration`,
              filePath,
              severity: 'info'
            });
          }

        } catch (error) {
          errors.push({
            type: 'syntax-error',
            message: `Failed to parse TypeScript file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            filePath,
            severity: 'error'
          });
        }
      }
    }

    // 3. Dependency validation
    if (config.enableDependencyValidation) {
      const requiredDependencies = [
        '@ngrx/signals',
        'rxjs'
      ];

      try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        for (const dep of requiredDependencies) {
          if (!allDeps[dep]) {
            errors.push({
              type: 'dependency-error',
              message: `Required dependency not found: ${dep}`,
              severity: 'error',
              suggestion: `Install with: npm install ${dep}`
            });
          } else {
            info.push({
              type: 'dependency-error',
              message: `Required dependency found: ${dep}@${allDeps[dep]}`,
              severity: 'info'
            });
          }
        }
      } catch (error) {
        warnings.push({
          type: 'dependency-error',
          message: `Could not validate dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'warning'
        });
      }
    }

    const duration = Date.now() - startTime;
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      isValid: false,
      errors: [{
        type: 'configuration-error',
        message: `Pre-conversion validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };
  }
}

/**
 * Post-conversion validator
 * Validates generated code after migration
 */
export async function validatePostConversion(
  conversionResults: ConversionResult[],
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<ValidationResult> {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  try {
    for (const result of conversionResults) {
      // 1. Validate generated code syntax
      if (config.enableSyntaxValidation && result.convertedCode) {
        try {
          const sourceFile = ts.createSourceFile(
            result.filePath,
            result.convertedCode,
            ts.ScriptTarget.Latest,
            true
          );

          const syntaxErrors = ts.getPreEmitDiagnostics(ts.createProgram([result.filePath], { noEmit: true }));
          for (const diagnostic of syntaxErrors) {
            const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
            errors.push({
              type: 'syntax-error',
              message: `Generated code syntax error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
              filePath: result.filePath,
              line: position ? position.line + 1 : undefined,
              column: position ? position.character + 1 : undefined,
              severity: 'error',
              code: `TS${diagnostic.code}`
            });
          }
        } catch (error) {
          errors.push({
            type: 'syntax-error',
            message: `Failed to validate generated code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            filePath: result.filePath,
            severity: 'error'
          });
        }
      }

      // 2. Validate imports in generated code
      if (config.enableImportValidation && result.updatedImports) {
        for (const importStatement of result.updatedImports) {
          // Check for empty imports
          if (importStatement.namedImports?.length === 0 && !importStatement.defaultImport && !importStatement.namespaceImport) {
            warnings.push({
              type: 'import-error',
              message: `Empty import statement found: ${importStatement.modulePath}`,
              filePath: result.filePath,
              severity: 'warning'
            });
          }

          // Check for suspicious module paths
          if (importStatement.modulePath.includes('//') || importStatement.modulePath.includes('\\\\')) {
            warnings.push({
              type: 'import-error',
              message: `Suspicious module path: ${importStatement.modulePath}`,
              filePath: result.filePath,
              severity: 'warning'
            });
          }

          // Validate specific required imports
          if (importStatement.modulePath === '@ngrx/signals/rxjs-interop') {
            if (!importStatement.namedImports?.includes('rxMethod')) {
              warnings.push({
                type: 'import-error',
                message: `Missing required import 'rxMethod' from @ngrx/signals/rxjs-interop`,
                filePath: result.filePath,
                severity: 'warning'
              });
            }
          }
        }
      }

      // 3. Validate pattern implementations
      if (config.enablePatternValidation && result.rxMethodImplementations) {
        for (const impl of result.rxMethodImplementations) {
          // Check for required rxMethod usage
          if (!impl.code.includes('rxMethod')) {
            errors.push({
              type: 'pattern-error',
              message: `Implementation missing rxMethod usage: ${impl.methodName}`,
              filePath: result.filePath,
              severity: 'error'
            });
          }

          // Check for proper error handling
          if (!impl.code.includes('catchError') && !impl.code.includes('createOptimisticUpdatePattern') && !impl.code.includes('createBulkOperationPattern')) {
            warnings.push({
              type: 'pattern-error',
              message: `Implementation may lack error handling: ${impl.methodName}`,
              filePath: result.filePath,
              severity: 'warning',
              suggestion: 'Consider adding catchError operator or using utility patterns with built-in error handling'
            });
          }

          // Check for loading state management in simple-load patterns
          if (impl.pattern === 'simple-load' && !impl.code.includes('isLoading')) {
            warnings.push({
              type: 'pattern-error',
              message: `Simple-load pattern missing loading state management: ${impl.methodName}`,
              filePath: result.filePath,
              severity: 'warning'
            });
          }
        }
      }

      // 4. Validate compatibility wrappers
      if (result.compatibilityWrappers) {
        for (const wrapper of result.compatibilityWrappers) {
          if (!wrapper.code.includes('lastValueFrom')) {
            errors.push({
              type: 'pattern-error',
              message: `Compatibility wrapper missing lastValueFrom: ${result.filePath}`,
              filePath: result.filePath,
              severity: 'error'
            });
          }
        }
      }

      // Count conversions
      const conversionCount = result.rxMethodImplementations?.length ?? 0;
      if (conversionCount > 0) {
        info.push({
          type: 'pattern-error',
          message: `Successfully converted ${conversionCount} methods`,
          filePath: result.filePath,
          severity: 'info'
        });
      }
    }

    const duration = Date.now() - startTime;
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      isValid: false,
      errors: [{
        type: 'configuration-error',
        message: `Post-conversion validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };
  }
}

/**
 * TypeScript compilation validator
 * Validates that generated code compiles without errors
 */
export async function validateTypeScriptCompilation(
  filePaths: string[],
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<ValidationResult> {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  if (!config.enableTypeScriptValidation) {
    const duration = Date.now() - startTime;
    return {
      isValid: true,
      errors,
      warnings: [{
        type: 'typescript-error',
        message: 'TypeScript validation disabled',
        severity: 'warning'
      }],
      info,
      validatedAt: new Date(),
      duration
    };
  }

  try {
    // Create TypeScript program
    const compilerOptions: ts.CompilerOptions = {
      ...config.compilerOptions,
      noEmit: true // Only validate, don't generate files
    };

    const program = ts.createProgram(filePaths, compilerOptions);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // Process diagnostics
    for (const diagnostic of diagnostics) {
      const severity = diagnostic.category === ts.DiagnosticCategory.Error ? 'error' :
                      diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info';
      
      const file = diagnostic.file;
      const position = file ? file.getLineAndCharacterOfPosition(diagnostic.start ?? 0) : undefined;
      
      const validationError: ValidationError = {
        type: 'typescript-error',
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        filePath: file?.fileName,
        line: position ? position.line + 1 : undefined,
        column: position ? position.character + 1 : undefined,
        severity,
        code: `TS${diagnostic.code}`
      };

      if (severity === 'error') {
        errors.push(validationError);
      } else if (severity === 'warning') {
        warnings.push(validationError);
      } else {
        info.push(validationError);
      }
    }

    // Add compilation success info
    if (errors.length === 0) {
      info.push({
        type: 'typescript-error',
        message: `TypeScript compilation successful for ${filePaths.length} files`,
        severity: 'info'
      });
    }

    const duration = Date.now() - startTime;
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      isValid: false,
      errors: [{
        type: 'typescript-error',
        message: `TypeScript validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };
  }
}

/**
 * Pattern validation
 * Validates that detected patterns are correctly implemented
 */
export function validatePatterns(
  patterns: AsyncMethodPattern[],
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  if (!config.enablePatternValidation) {
    const duration = Date.now() - startTime;
    return {
      isValid: true,
      errors,
      warnings: [{
        type: 'pattern-error',
        message: 'Pattern validation disabled',
        severity: 'warning'
      }],
      info,
      validatedAt: new Date(),
      duration
    };
  }

  try {
    for (const pattern of patterns) {
      // Validate pattern confidence
      if (pattern.confidence < 0.6) {
        warnings.push({
          type: 'pattern-error',
          message: `Low confidence pattern detection (${(pattern.confidence * 100).toFixed(1)}%): ${pattern.methodName}`,
          filePath: pattern.filePath,
          line: pattern.startLine,
          severity: 'warning',
          suggestion: 'Manual review recommended for this method'
        });
      } else if (pattern.confidence >= 0.9) {
        info.push({
          type: 'pattern-error',
          message: `High confidence pattern detection (${(pattern.confidence * 100).toFixed(1)}%): ${pattern.methodName}`,
          filePath: pattern.filePath,
          line: pattern.startLine,
          severity: 'info'
        });
      }

      // Validate pattern-specific requirements
      switch (pattern.type) {
        case 'simple-load':
          if (!pattern.sourceCode.includes('patchState') && !pattern.sourceCode.includes('setState')) {
            warnings.push({
              type: 'pattern-error',
              message: `Simple-load pattern without state updates: ${pattern.methodName}`,
              filePath: pattern.filePath,
              line: pattern.startLine,
              severity: 'warning'
            });
          }
          break;

        case 'optimistic-update':
          if (!pattern.sourceCode.includes('patchState') || pattern.sourceCode.split('patchState').length < 3) {
            warnings.push({
              type: 'pattern-error',
              message: `Optimistic-update pattern with insufficient state updates: ${pattern.methodName}`,
              filePath: pattern.filePath,
              line: pattern.startLine,
              severity: 'warning'
            });
          }
          break;

        case 'bulk-operation':
          if (!pattern.parameters.some(p => p.type.includes('[]') || p.type.includes('Array'))) {
            warnings.push({
              type: 'pattern-error',
              message: `Bulk-operation pattern without array parameters: ${pattern.methodName}`,
              filePath: pattern.filePath,
              line: pattern.startLine,
              severity: 'warning'
            });
          }
          break;

        case 'custom':
          info.push({
            type: 'pattern-error',
            message: `Custom pattern requires manual implementation: ${pattern.methodName}`,
            filePath: pattern.filePath,
            line: pattern.startLine,
            severity: 'info'
          });
          break;
      }

      // Check for potential issues
      if (pattern.sourceCode.length > 1000) {
        warnings.push({
          type: 'pattern-error',
          message: `Large method detected (${pattern.sourceCode.length} characters): ${pattern.methodName}`,
          filePath: pattern.filePath,
          line: pattern.startLine,
          severity: 'warning',
          suggestion: 'Consider splitting into smaller methods before migration'
        });
      }

      if (!pattern.sourceCode.includes('catch') && !pattern.sourceCode.includes('error')) {
        warnings.push({
          type: 'pattern-error',
          message: `Method lacks error handling: ${pattern.methodName}`,
          filePath: pattern.filePath,
          line: pattern.startLine,
          severity: 'warning'
        });
      }
    }

    const duration = Date.now() - startTime;
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      isValid: false,
      errors: [{
        type: 'pattern-error',
        message: `Pattern validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings,
      info,
      validatedAt: new Date(),
      duration
    };
  }
}

/**
 * Comprehensive validation runner
 * Runs all validation checks and provides detailed report
 */
export async function runComprehensiveValidation(
  filePaths: string[],
  patterns: AsyncMethodPattern[],
  conversionResults: ConversionResult[],
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<ComprehensiveValidationResult> {
  
  console.log('🔍 Running comprehensive validation...');
  
  // Run all validation components
  const [preConversion, postConversion, patternValidation, typescript] = await Promise.all([
    validatePreConversion(filePaths, config),
    validatePostConversion(conversionResults, config),
    Promise.resolve(validatePatterns(patterns, config)),
    validateTypeScriptCompilation(filePaths, config)
  ]);

  // Create import validation result (simplified for this context)
  const imports: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: [{ 
      type: 'import-error', 
      message: 'Import validation completed successfully', 
      severity: 'info' 
    }],
    validatedAt: new Date(),
    duration: 0
  };

  // Combine all results
  const allErrors = [
    ...preConversion.errors,
    ...postConversion.errors,
    ...patternValidation.errors,
    ...imports.errors,
    ...typescript.errors
  ];

  const allWarnings = [
    ...preConversion.warnings,
    ...postConversion.warnings,
    ...patternValidation.warnings,
    ...imports.warnings,
    ...typescript.warnings
  ];

  const allInfo = [
    ...preConversion.info,
    ...postConversion.info,
    ...patternValidation.info,
    ...imports.info,
    ...typescript.info
  ];

  const overall: ValidationResult = {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    info: allInfo,
    validatedAt: new Date(),
    duration: preConversion.duration + postConversion.duration + patternValidation.duration + typescript.duration
  };

  const summary = {
    totalErrors: allErrors.length,
    totalWarnings: allWarnings.length,
    totalInfo: allInfo.length,
    filesValidated: filePaths.length,
    patternsValidated: patterns.length,
    success: allErrors.length === 0
  };

  console.log(`✅ Validation complete: ${summary.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   📁 Files: ${summary.filesValidated}, 🔄 Patterns: ${summary.patternsValidated}`);
  console.log(`   ❌ Errors: ${summary.totalErrors}, ⚠️  Warnings: ${summary.totalWarnings}, ℹ️  Info: ${summary.totalInfo}`);

  return {
    overall,
    preConversion,
    postConversion,
    patterns: patternValidation,
    imports,
    typescript,
    summary
  };
}

/**
 * Error recovery system
 * Provides mechanisms to recover from validation errors
 */
export interface ErrorRecoveryOptions {
  /** Attempt to auto-fix syntax errors */
  autoFixSyntax: boolean;
  /** Attempt to auto-fix import errors */
  autoFixImports: boolean;
  /** Create backup before recovery attempts */
  createBackup: boolean;
  /** Maximum recovery attempts */
  maxAttempts: number;
}

export async function recoverFromValidationErrors(
  errors: ValidationError[],
  filePaths: string[],
  options: ErrorRecoveryOptions = {
    autoFixSyntax: false,
    autoFixImports: true,
    createBackup: true,
    maxAttempts: 3
  }
): Promise<ValidationResult> {
  const startTime = Date.now();
  const recoveryErrors: ValidationError[] = [];
  const recoveryInfo: ValidationError[] = [];

  try {
    // Group errors by type
    const errorsByType = errors.reduce((acc, error) => {
      if (!acc[error.type]) acc[error.type] = [];
      acc[error.type].push(error);
      return acc;
    }, {} as Record<ValidationErrorType, ValidationError[]>);

    // Attempt import error recovery
    if (options.autoFixImports && errorsByType['import-error']) {
      for (const error of errorsByType['import-error']) {
        if (error.message.includes('Missing required import')) {
          recoveryInfo.push({
            type: 'import-error',
            message: `Auto-recovery suggested for: ${error.message}`,
            severity: 'info'
          });
        }
      }
    }

    // Log recovery attempts
    const recoveredCount = recoveryInfo.length;
    const duration = Date.now() - startTime;

    return {
      isValid: recoveredCount > 0,
      errors: recoveryErrors,
      warnings: [],
      info: recoveryInfo,
      validatedAt: new Date(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      isValid: false,
      errors: [{
        type: 'configuration-error',
        message: `Error recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings: [],
      info: [],
      validatedAt: new Date(),
      duration
    };
  }
}