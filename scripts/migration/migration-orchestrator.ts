/**
 * Migration Orchestrator - Main workflow coordinator for async/await to RxMethod migration
 * Coordinates all migration components to provide a complete migration workflow
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  AsyncMethodPattern, 
  ConversionResult, 
  MigrationConfig, 
  MigrationReport, 
  MigrationStats,
  PatternContext,
  RxMethodImplementation,
  ImportStatement
} from './types';
import { ValidationConfig } from './validation';
import { discoverStoreFiles, parseStoreFile } from './file-scanner';
import { recognizePattern } from './pattern-recognition';
import { generateConvertedCode } from './code-generator';
import { MigrationReporter, createMigrationReport, ReportOptions } from './migration-reporter';
import { validatePreConversion, validatePostConversion } from './validation';
import { readStoreFile, writeStoreFile, createBackup } from './file-utils';

/**
 * Configuration for migration orchestrator
 */
export interface OrchestratorConfig extends MigrationConfig {
  /** Path to the root directory to scan for store files */
  rootDirectory: string;
  /** Validation configuration */
  validation: ValidationConfig;
  /** Maximum number of files to process in parallel */
  maxParallelFiles: number;
  /** Whether to stop on first error */
  stopOnError: boolean;
  /** Logger function for progress updates */
  logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: Partial<OrchestratorConfig> = {
  dryRun: false,
  verbose: false,
  createBackups: true,
  targetFiles: [],
  excludePatterns: ['node_modules/**', 'dist/**', '**/*.spec.ts', '**/*.test.ts'],
  preserveCompatibility: true,
  maxParallelFiles: 5,
  stopOnError: false,
  validation: {
    enableTypeScriptValidation: true,
    enableSyntaxValidation: true,
    enableImportValidation: true,
    enablePatternValidation: true,
    enableDependencyValidation: true,
    maxErrors: 50,
    timeoutMs: 30000
  }
};

/**
 * Main Migration Orchestrator class
 */
export class MigrationOrchestrator {
  private config: OrchestratorConfig;
  private stats: MigrationStats;
  private results: ConversionResult[] = [];
  private backupPaths: Map<string, string> = new Map();

  constructor(config: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config } as OrchestratorConfig;
    this.stats = {
      totalFilesProcessed: 0,
      successfulConversions: 0,
      failedConversions: 0,
      methodsConverted: 0,
      wrappersGenerated: 0,
      warningsGenerated: 0,
      startTime: new Date()
    };
  }

  /**
   * Execute the complete migration workflow
   */
  async executeMigration(): Promise<MigrationReport> {
    this.log('Starting async/await to RxMethod migration', 'info');
    this.stats.startTime = new Date();

    try {
      // Phase 1: Discovery - Find all store files
      const storeFiles = await this.discoverTargetFiles();
      
      // Phase 2: Validation - Pre-conversion validation
      await this.performPreValidation(storeFiles);
      
      // Phase 3: Backup - Create backups if enabled
      if (this.config.createBackups) {
        await this.createFileBackups(storeFiles);
      }
      
      // Phase 4: Migration - Process each file
      const migrationResults = await this.processStoreFiles(storeFiles);
      
      // Phase 5: Validation - Post-conversion validation
      await this.performPostValidation(migrationResults);
      
      // Phase 6: Rollback handling if failures detected
      await this.handleFailures(migrationResults);
      
      // Phase 7: Generate final report
      const report = this.generateMigrationReport();
      
      // Phase 8: Generate and save detailed report (unless in dry-run mode for basic reporting)
      if (this.config.verbose || !this.config.dryRun) {
        try {
          await this.generateDetailedReport();
        } catch (reportError: any) {
          this.log(`Warning: Could not generate detailed report - ${reportError?.message || String(reportError)}`, 'warn');
        }
      }
      
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();
      
      this.log(`Migration completed in ${this.stats.duration}ms`, 'info');
      return report;
      
    } catch (error: any) {
      this.log(`Migration failed: ${error?.message || String(error)}`, 'error');
      
      // Attempt rollback on critical failure
      if (this.config.createBackups) {
        await this.performRollback();
      }
      
      throw error;
    }
  }

  /**
   * Phase 1: Discover all target store files
   */
  private async discoverTargetFiles(): Promise<string[]> {
    this.log('Phase 1: Discovering store files', 'info');
    
    let storeFiles: string[];
    
    if (this.config.targetFiles.length > 0) {
      // Use specified target files
      storeFiles = this.config.targetFiles;
      this.log(`Using ${storeFiles.length} specified target files`, 'info');
    } else {
      // Discover all store files in root directory
      storeFiles = await discoverStoreFiles(this.config.rootDirectory);
      this.log(`Discovered ${storeFiles.length} store files`, 'info');
    }
    
    // Filter out excluded patterns
    const filteredFiles = storeFiles.filter(file => 
      !this.config.excludePatterns.some(pattern => 
        this.matchesPattern(file, pattern)
      )
    );
    
    if (filteredFiles.length !== storeFiles.length) {
      this.log(`Filtered out ${storeFiles.length - filteredFiles.length} files based on exclude patterns`, 'info');
    }
    
    return filteredFiles;
  }

  /**
   * Phase 2: Perform pre-conversion validation
   */
  private async performPreValidation(storeFiles: string[]): Promise<void> {
    this.log('Phase 2: Performing pre-conversion validation', 'info');
    
    try {
      const result = await validatePreConversion(storeFiles, this.config.validation);
      if (!result.isValid) {
        this.log(`Pre-validation found issues: ${result.errors.map(e => e.message).join(', ')}`, 'warn');
      }
      
      if (result.errors.length > 0 && this.config.stopOnError) {
        throw new Error(`Pre-validation failed with ${result.errors.length} errors`);
      }
    } catch (error: any) {
      this.log(`Pre-validation error: ${error?.message || String(error)}`, 'error');
      if (this.config.stopOnError) {
        throw error;
      }
    }
  }

  /**
   * Phase 3: Create backup files
   */
  private async createFileBackups(storeFiles: string[]): Promise<void> {
    this.log('Phase 3: Creating backup files', 'info');
    
    const backupPromises = storeFiles.map(async (filePath) => {
      try {
        const backupPath = await createBackup(filePath);
        this.backupPaths.set(filePath, backupPath);
        this.log(`Created backup: ${backupPath}`, 'debug');
      } catch (error: any) {
        this.log(`Failed to create backup for ${filePath}: ${error?.message || String(error)}`, 'warn');
        if (this.config.stopOnError) {
          throw error;
        }
      }
    });
    
    await Promise.all(backupPromises);
    this.log(`Created ${this.backupPaths.size} backup files`, 'info');
  }

  /**
   * Phase 4: Process each store file for migration
   */
  private async processStoreFiles(storeFiles: string[]): Promise<ConversionResult[]> {
    this.log('Phase 4: Processing store files for migration', 'info');
    
    const results: ConversionResult[] = [];
    
    // Process files in batches to avoid overwhelming the system
    const batchSize = this.config.maxParallelFiles;
    for (let i = 0; i < storeFiles.length; i += batchSize) {
      const batch = storeFiles.slice(i, i + batchSize);
      const batchPromises = batch.map(filePath => this.processStoreFile(filePath));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as ConversionResult[]);
      
      this.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(storeFiles.length / batchSize)}`, 'info');
    }
    
    this.results = results;
    return results;
  }

  /**
   * Process a single store file
   */
  private async processStoreFile(filePath: string): Promise<ConversionResult | null> {
    this.stats.totalFilesProcessed++;
    
    try {
      this.log(`Processing: ${path.relative(this.config.rootDirectory, filePath)}`, 'debug');
      
      // Parse the store file to extract async methods
      const { asyncMethods, context } = await parseStoreFile(filePath);
      
      if (asyncMethods.length === 0) {
        this.log(`No async methods found in ${filePath}`, 'debug');
        return {
          filePath,
          originalMethods: [],
          convertedMethods: [],
          compatibilityWrappers: [],
          requiredImports: [],
          success: true,
          warnings: ['No async methods found to convert'],
          errors: []
        };
      }
      
      // Read the original source code
      const sourceCode = await readStoreFile(filePath);
      
      // Use the code generator to convert all methods at once
      const codeGenResult = await generateConvertedCode(
        sourceCode,
        filePath,
        asyncMethods,
        context,
        {
          preserveComments: true,
          addConversionComments: true,
          generateCompatibilityWrappers: true,
          updateImports: true,
          validateOutput: true,
          dryRun: this.config.dryRun,
          outputFormat: 'replace',
          backupOriginal: false
        }
      );
      
      // Extract converted methods from conversions
      const convertedMethods: RxMethodImplementation[] = codeGenResult.conversions.map(conv => ({
        name: conv.methodName,
        rxMethodCode: conv.template,
        compatibilityWrapperCode: conv.wrapper || '',
        utilityPattern: conv.pattern,
        requiresManualReview: conv.confidence < 0.8,
        generatedImports: codeGenResult.importChanges.added,
        comments: [],
        methodName: conv.methodName,
        pattern: conv.pattern as any,
        code: conv.template
      }));
      
      const conversionResult: ConversionResult = {
        filePath,
        originalMethods: asyncMethods,
        convertedMethods,
        compatibilityWrappers: convertedMethods.map(m => ({
          originalMethodName: m.methodName,
          wrapperMethodName: `${m.methodName}Async`,
          code: m.compatibilityWrapperCode,
          preservedSignature: `async ${m.methodName}Async`
        })),
        requiredImports: codeGenResult.importChanges.added,
        success: codeGenResult.success,
        warnings: codeGenResult.warnings.map(w => `${w.method}: ${w.warning}`),
        errors: codeGenResult.errors.map(e => `${e.method}: ${e.error}`)
      };
      
      // Update stats
      this.stats.methodsConverted += conversionResult.convertedMethods.length;
      this.stats.wrappersGenerated += conversionResult.compatibilityWrappers.length;
      this.stats.warningsGenerated += conversionResult.warnings.length;
      
      if (conversionResult.success) {
        this.stats.successfulConversions++;
        
        // Apply the changes if not in dry run mode
        if (!this.config.dryRun && codeGenResult.convertedCode) {
          await writeStoreFile(filePath, codeGenResult.convertedCode);
        }
      } else {
        this.stats.failedConversions++;
      }
      
      return conversionResult;
      
    } catch (error: any) {
      this.stats.failedConversions++;
      const errorMsg = `Failed to process ${filePath}: ${error?.message || String(error)}`;
      this.log(errorMsg, 'error');
      
      return {
        filePath,
        originalMethods: [],
        convertedMethods: [],
        compatibilityWrappers: [],
        requiredImports: [],
        success: false,
        warnings: [],
        errors: [errorMsg]
      };
    }
  }

  /**
   * Phase 5: Perform post-conversion validation
   */
  private async performPostValidation(results: ConversionResult[]): Promise<void> {
    this.log('Phase 5: Performing post-conversion validation', 'info');
    
    try {
      const validationResult = await validatePostConversion(results, this.config.validation);
      if (!validationResult.isValid) {
        this.log(`Post-validation found issues: ${validationResult.errors.map(e => e.message).join(', ')}`, 'warn');
        
        // Mark results with validation errors as failed
        for (const error of validationResult.errors) {
          const result = results.find(r => r.filePath === error.filePath);
          if (result) {
            result.success = false;
            result.errors.push(`Post-validation: ${error.message}`);
            this.stats.successfulConversions--;
            this.stats.failedConversions++;
          }
        }
      }
    } catch (error: any) {
      this.log(`Post-validation error: ${error?.message || String(error)}`, 'error');
    }
  }

  /**
   * Phase 6: Handle failures and rollback if necessary
   */
  private async handleFailures(results: ConversionResult[]): Promise<void> {
    const failedResults = results.filter(r => !r.success);
    
    if (failedResults.length > 0) {
      this.log(`${failedResults.length} files failed conversion`, 'warn');
      
      // If too many failures, consider rolling back
      const failureRate = failedResults.length / results.length;
      if (failureRate > 0.5 && this.config.createBackups) {
        this.log('High failure rate detected, consider rollback', 'warn');
      }
      
      // Rollback individual failed files
      for (const failed of failedResults) {
        const backupPath = this.backupPaths.get(failed.filePath);
        if (backupPath && !this.config.dryRun) {
          try {
            await this.rollbackFile(failed.filePath, backupPath);
            this.log(`Rolled back ${failed.filePath}`, 'info');
          } catch (error: any) {
            this.log(`Failed to rollback ${failed.filePath}: ${error?.message || String(error)}`, 'error');
          }
        }
      }
    }
  }

  /**
   * Rollback a single file from backup
   */
  private async rollbackFile(filePath: string, backupPath: string): Promise<void> {
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    await fs.writeFile(filePath, backupContent, 'utf-8');
  }

  /**
   * Perform complete rollback of all changes
   */
  private async performRollback(): Promise<void> {
    this.log('Performing complete rollback', 'warn');
    
    const rollbackPromises = Array.from(this.backupPaths.entries()).map(
      ([filePath, backupPath]) => this.rollbackFile(filePath, backupPath)
    );
    
    await Promise.all(rollbackPromises);
    this.log('Rollback completed', 'info');
  }

  /**
   * Generate the final migration report
   */
  private generateMigrationReport(): MigrationReport {
    const failedFiles = this.results.filter(r => !r.success).map(r => r.filePath);
    const filesWithWarnings = this.results.filter(r => r.warnings.length > 0).map(r => r.filePath);
    const methodsRequiringReview = this.results.flatMap(r => 
      r.convertedMethods
        .filter(m => m.requiresManualReview)
        .map(m => ({
          file: r.filePath,
          method: m.methodName,
          reason: 'Complex pattern requires manual review'
        }))
    );

    return {
      config: this.config,
      stats: this.stats,
      results: this.results,
      summary: {
        overallSuccess: this.stats.failedConversions === 0,
        filesWithErrors: failedFiles,
        filesWithWarnings,
        methodsRequiringManualReview: methodsRequiringReview
      }
    };
  }

  /**
   * Generate and save detailed migration report
   */
  async generateDetailedReport(outputPath?: string): Promise<string> {
    this.log('Generating detailed migration report', 'info');
    
    const basicReport = this.generateMigrationReport();
    const reportOptions: ReportOptions = {
      format: 'markdown',
      includeComparisons: true,
      includeCodeSamples: !this.config.dryRun, // Include code samples only for actual runs
      includeStatistics: true,
      includeWarnings: true,
      outputPath
    };

    try {
      const reporter = new MigrationReporter(this.config);
      const savedPath = await reporter.generateAndSaveReport(basicReport, reportOptions);
      
      this.log(`Detailed report saved to: ${savedPath}`, 'info');
      return savedPath;
    } catch (error: any) {
      this.log(`Failed to generate detailed report: ${error?.message || String(error)}`, 'error');
      throw error;
    }
  }

  /**
   * Generate detailed comparison report for specific method
   */
  generateMethodComparisonReport(filePath: string, methodName: string): string | null {
    const result = this.results.find(r => r.filePath === filePath);
    if (!result) {
      this.log(`No results found for file: ${filePath}`, 'warn');
      return null;
    }

    const original = result.originalMethods.find(m => m.methodName === methodName);
    const converted = result.convertedMethods.find(m => m.methodName === methodName);

    if (!original || !converted) {
      this.log(`Method ${methodName} not found in conversion results`, 'warn');
      return null;
    }

    const { generateMethodComparisonReport } = require('./migration-reporter');
    return generateMethodComparisonReport(original, converted);
  }

  /**
   * Check if a file path matches a pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching - could be enhanced with proper glob matching
    return filePath.includes(pattern.replace('**/', '').replace('*', ''));
  }

  /**
   * Log a message with appropriate level
   */
  private log(message: string, level: 'info' | 'warn' | 'error' | 'debug'): void {
    if (this.config.logger) {
      this.config.logger(message, level);
    } else if (this.config.verbose || level !== 'debug') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Convenience function to run migration with default configuration
 */
export async function runMigration(
  rootDirectory: string, 
  config: Partial<OrchestratorConfig> = {}
): Promise<MigrationReport> {
  const orchestrator = new MigrationOrchestrator({
    rootDirectory,
    ...config
  });
  
  return await orchestrator.executeMigration();
}

/**
 * Convenience function for dry run migration
 */
export async function dryRunMigration(
  rootDirectory: string,
  config: Partial<OrchestratorConfig> = {}
): Promise<MigrationReport> {
  return await runMigration(rootDirectory, {
    ...config,
    dryRun: true
  });
}

export default MigrationOrchestrator;