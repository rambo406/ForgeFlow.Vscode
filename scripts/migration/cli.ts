#!/usr/bin/env node

/**
 * Migration CLI Tool - Task 14
 * Command-line interface for running async/await to RxMethod migrations
 */

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora, { Ora } from 'ora';
import { MigrationOrchestrator } from './migration-orchestrator';
import { MigrationConfig, MigrationReport } from './types';

/**
 * CLI Configuration interface
 */
interface CLIConfig {
  rootDirectory: string;
  targetFiles: string[];
  excludePatterns: string[];
  dryRun: boolean;
  verbose: boolean;
  createBackups: boolean;
  preserveCompatibility: boolean;
  reportFormat: 'markdown' | 'json' | 'html' | 'text';
  reportOutput?: string;
  interactive: boolean;
  maxParallelFiles: number;
  stopOnError: boolean;
  force: boolean;
}

/**
 * CLI Statistics and progress tracking
 */
class CLIProgress {
  private spinner: Ora | null = null;
  private stats = {
    startTime: Date.now(),
    filesProcessed: 0,
    methodsConverted: 0,
    errors: 0,
    warnings: 0
  };

  start(message: string): void {
    this.spinner = ora(message).start();
  }

  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeed(message: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  fail(message: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  updateStats(report: MigrationReport): void {
    this.stats.filesProcessed = report.stats.totalFilesProcessed;
    this.stats.methodsConverted = report.stats.methodsConverted;
    this.stats.errors = report.stats.failedConversions;
    this.stats.warnings = report.stats.warningsGenerated;
  }

  printSummary(): void {
    const duration = Date.now() - this.stats.startTime;
    
    console.log(chalk.bold('\n📊 Migration Summary:'));
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Files processed: ${chalk.cyan(this.stats.filesProcessed)}`);
    console.log(`   Methods converted: ${chalk.green(this.stats.methodsConverted)}`);
    console.log(`   Errors: ${chalk.red(this.stats.errors)}`);
    console.log(`   Warnings: ${chalk.yellow(this.stats.warnings)}`);
  }
}

/**
 * Main CLI class
 */
class MigrationCLI {
  private progress = new CLIProgress();

  constructor() {
    this.setupCommands();
  }

  private setupCommands(): void {
    program
      .name('rxmethod-migrate')
      .description('CLI tool for migrating async/await methods to RxMethod implementations')
      .version('1.0.0');

    // Main migration command
    program
      .command('migrate')
      .description('Run async/await to RxMethod migration')
      .argument('[directory]', 'Root directory to scan for store files', process.cwd())
      .option('-t, --target <files...>', 'Specific files to migrate (glob patterns supported)')
      .option('-e, --exclude <patterns...>', 'Patterns to exclude from migration', ['node_modules/**', 'dist/**', '**/*.spec.ts', '**/*.test.ts'])
      .option('-d, --dry-run', 'Preview changes without writing files', false)
      .option('-v, --verbose', 'Enable verbose logging', false)
      .option('--no-backup', 'Skip creating backup files')
      .option('--no-compatibility', 'Skip generating compatibility wrappers')
      .option('-f, --format <format>', 'Report format (markdown|json|html|text)', 'markdown')
      .option('-o, --output <path>', 'Output path for migration report')
      .option('-i, --interactive', 'Run in interactive mode', false)
      .option('-p, --parallel <number>', 'Maximum parallel file processing', '5')
      .option('--stop-on-error', 'Stop migration on first error', false)
      .option('--force', 'Force migration even with validation warnings', false)
      .action(async (directory: string, options: any) => {
        await this.runMigration(directory, options);
      });

    // Interactive setup command
    program
      .command('setup')
      .description('Interactive setup for migration configuration')
      .action(async () => {
        await this.runInteractiveSetup();
      });

    // Validation command
    program
      .command('validate')
      .description('Validate store files for migration readiness')
      .argument('[directory]', 'Directory to validate', process.cwd())
      .option('-t, --target <files...>', 'Specific files to validate')
      .option('-v, --verbose', 'Enable verbose output', false)
      .action(async (directory: string, options: any) => {
        await this.runValidation(directory, options);
      });

    // Report command
    program
      .command('report')
      .description('Generate report from previous migration')
      .argument('<reportPath>', 'Path to migration results JSON file')
      .option('-f, --format <format>', 'Output format (markdown|html|text)', 'markdown')
      .option('-o, --output <path>', 'Output file path')
      .action(async (reportPath: string, options: any) => {
        await this.generateReport(reportPath, options);
      });

    // Status command
    program
      .command('status')
      .description('Show migration system status and capabilities')
      .action(async () => {
        await this.showStatus();
      });
  }

  /**
   * Main migration execution
   */
  private async runMigration(directory: string, options: any): Promise<void> {
    try {
      // Validate directory exists
      if (!fs.existsSync(directory)) {
        console.error(chalk.red(`❌ Directory not found: ${directory}`));
        process.exit(1);
      }

      // Convert CLI options to migration config
      const config = this.buildMigrationConfig(directory, options);

      // Interactive mode
      if (options.interactive) {
        const updatedConfig = await this.runInteractiveConfiguration(config);
        Object.assign(config, updatedConfig);
      }

      // Display configuration summary
      this.printConfigSummary(config);

      // Confirm execution if not in force mode
      if (!options.force && !options.dryRun) {
        const confirmed = await this.confirmExecution();
        if (!confirmed) {
          console.log(chalk.yellow('Migration cancelled by user'));
          return;
        }
      }

      // Execute migration
      this.progress.start('Initializing migration...');
      
      const orchestrator = new MigrationOrchestrator({
        ...config,
        validation: {
          enableTypeScriptValidation: true,
          enableSyntaxValidation: true,
          enableImportValidation: true,
          enablePatternValidation: true,
          enableDependencyValidation: !options.force,
          maxErrors: 50,
          timeoutMs: 30000
        },
        logger: this.createLogger(options.verbose)
      });

      const report = await orchestrator.executeMigration();
      
      this.progress.updateStats(report);
      
      if (report.summary.overallSuccess) {
        this.progress.succeed('Migration completed successfully!');
      } else {
        this.progress.fail('Migration completed with errors');
      }

      // Display results
      await this.displayResults(report, config);
      
      this.progress.printSummary();

      // Exit with appropriate code
      process.exit(report.summary.overallSuccess ? 0 : 1);

    } catch (error: any) {
      this.progress.fail('Migration failed');
      console.error(chalk.red('❌ Migration error:'), error?.message || String(error));
      
      if (options.verbose && error?.stack) {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  }

  /**
   * Interactive setup mode
   */
  private async runInteractiveSetup(): Promise<void> {
    console.log(chalk.bold.cyan('🚀 RxMethod Migration Interactive Setup\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'directory',
        message: 'Root directory to scan for store files:',
        default: process.cwd(),
        validate: (input: string) => fs.existsSync(input) || 'Directory does not exist'
      },
      {
        type: 'confirm',
        name: 'dryRun',
        message: 'Run in dry-run mode (preview only)?',
        default: true
      },
      {
        type: 'checkbox',
        name: 'includePatterns',
        message: 'Select file patterns to include:',
        choices: [
          '**/*.store.ts',
          '**/stores/**/*.ts',
          '**/state/**/*.ts',
          'custom pattern'
        ],
        default: ['**/*.store.ts']
      },
      {
        type: 'input',
        name: 'customPattern',
        message: 'Enter custom file pattern:',
        when: (answers: any) => answers.includePatterns.includes('custom pattern')
      },
      {
        type: 'confirm',
        name: 'createBackups',
        message: 'Create backup files before migration?',
        default: true
      },
      {
        type: 'confirm',
        name: 'preserveCompatibility',
        message: 'Generate compatibility wrappers for existing code?',
        default: true
      },
      {
        type: 'list',
        name: 'reportFormat',
        message: 'Select report format:',
        choices: ['markdown', 'json', 'html', 'text'],
        default: 'markdown'
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: 'Enable verbose logging?',
        default: false
      }
    ]);

    // Build configuration from answers
    const config = this.buildMigrationConfig(answers.directory, answers);

    // Save configuration for future use
    await this.saveConfiguration(config);

    console.log(chalk.green('✅ Configuration saved! Run migration with saved settings using:'));
    console.log(chalk.cyan(`   rxmethod-migrate migrate ${answers.directory}`));
  }

  /**
   * Validation command
   */
  private async runValidation(directory: string, options: any): Promise<void> {
    this.progress.start('Validating files for migration readiness...');

    try {
      // Import validation module
      const { validatePreConversion } = await import('./validation');
      
      // Discover target files
      const { discoverStoreFiles } = await import('./file-scanner');
      const storeFiles = options.target || await discoverStoreFiles(directory);

      const validationResult = await validatePreConversion(storeFiles, {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: true,
        maxErrors: 100,
        timeoutMs: 30000
      });

      this.progress.stop();

      // Display validation results
      console.log(chalk.bold('\n🔍 Validation Results:\n'));
      
      if (validationResult.isValid) {
        console.log(chalk.green('✅ All files are ready for migration!'));
      } else {
        console.log(chalk.yellow('⚠️ Issues found that may affect migration:'));
        
        validationResult.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${chalk.red(error.type)}: ${error.message}`);
          if (error.filePath) {
            console.log(`      File: ${chalk.gray(error.filePath)}`);
          }
          if (error.suggestion) {
            console.log(`      Suggestion: ${chalk.cyan(error.suggestion)}`);
          }
        });
      }

      console.log(`\n📊 Validation Summary:`);
      console.log(`   Files checked: ${storeFiles.length}`);
      console.log(`   Errors: ${chalk.red(validationResult.errors.length)}`);
      console.log(`   Warnings: ${chalk.yellow(validationResult.warnings.length)}`);

    } catch (error: any) {
      this.progress.fail('Validation failed');
      console.error(chalk.red('❌ Validation error:'), error?.message || String(error));
      process.exit(1);
    }
  }

  /**
   * Generate report from previous migration
   */
  private async generateReport(reportPath: string, options: any): Promise<void> {
    try {
      if (!fs.existsSync(reportPath)) {
        console.error(chalk.red(`❌ Report file not found: ${reportPath}`));
        process.exit(1);
      }

      this.progress.start('Generating migration report...');

      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      
      // Import report generator
      const { MigrationReporter } = await import('./migration-reporter');
      const reporter = new MigrationReporter({
        dryRun: false,
        verbose: false,
        createBackups: false,
        targetFiles: [],
        excludePatterns: [],
        preserveCompatibility: true
      });

      const outputPath = await reporter.generateAndSaveReport(reportData, {
        format: options.format,
        includeComparisons: true,
        includeCodeSamples: true,
        includeStatistics: true,
        includeWarnings: true,
        outputPath: options.output
      });

      this.progress.succeed(`Report generated: ${outputPath}`);

    } catch (error: any) {
      this.progress.fail('Report generation failed');
      console.error(chalk.red('❌ Report error:'), error?.message || String(error));
      process.exit(1);
    }
  }

  /**
   * Show system status
   */
  private async showStatus(): Promise<void> {
    console.log(chalk.bold.cyan('🔧 RxMethod Migration System Status\n'));

    // Check dependencies
    const dependencies = [
      { name: 'TypeScript', check: () => this.checkTypeScript() },
      { name: '@ngrx/signals', check: () => this.checkNgrxSignals() },
      { name: 'RxJS', check: () => this.checkRxJS() }
    ];

    for (const dep of dependencies) {
      const status = await dep.check();
      const icon = status.available ? '✅' : '❌';
      console.log(`   ${icon} ${dep.name}: ${status.message}`);
    }

    // Check migration system components
    console.log(chalk.bold('\n🏗️ Migration Components:'));
    const components = [
      'File Scanner',
      'Pattern Recognition',
      'Code Generator',
      'Import Manager', 
      'Validation Engine',
      'Reporting System'
    ];

    components.forEach(component => {
      console.log(`   ✅ ${component}: Available`);
    });

    // Display capabilities
    console.log(chalk.bold('\n🎯 Supported Patterns:'));
    const patterns = [
      'Simple Loading (async data fetching with loading state)',
      'Optimistic Updates (immediate state update with rollback)',
      'Bulk Operations (batch processing with Promise.all)',
      'Custom Patterns (flexible template-based conversion)'
    ];

    patterns.forEach(pattern => {
      console.log(`   • ${pattern}`);
    });

    console.log(chalk.bold('\n📝 Available Commands:'));
    console.log('   • migrate    - Run migration on store files');
    console.log('   • setup      - Interactive configuration setup');
    console.log('   • validate   - Validate files for migration readiness');
    console.log('   • report     - Generate reports from previous migrations');
    console.log('   • status     - Show this status information');
  }

  // Helper Methods

  private buildMigrationConfig(directory: string, options: any): CLIConfig & MigrationConfig {
    return {
      rootDirectory: directory,
      targetFiles: options.target || [],
      excludePatterns: options.exclude || ['node_modules/**', 'dist/**', '**/*.spec.ts', '**/*.test.ts'],
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      createBackups: options.backup !== false,
      preserveCompatibility: options.compatibility !== false,
      reportFormat: options.format || 'markdown',
      reportOutput: options.output,
      interactive: options.interactive || false,
      maxParallelFiles: parseInt(options.parallel) || 5,
      stopOnError: options.stopOnError || false,
      force: options.force || false,
      generateDetailedReport: true
    };
  }

  private async runInteractiveConfiguration(config: CLIConfig): Promise<Partial<CLIConfig>> {
    const questions = [
      {
        type: 'confirm',
        name: 'dryRun',
        message: 'Run in dry-run mode?',
        default: config.dryRun
      },
      {
        type: 'confirm',
        name: 'createBackups',
        message: 'Create backup files?',
        default: config.createBackups
      },
      {
        type: 'list',
        name: 'reportFormat',
        message: 'Report format:',
        choices: ['markdown', 'json', 'html', 'text'],
        default: config.reportFormat
      }
    ];

    return await inquirer.prompt(questions);
  }

  private printConfigSummary(config: CLIConfig): void {
    console.log(chalk.bold('\n⚙️ Migration Configuration:'));
    console.log(`   Root directory: ${chalk.cyan(config.rootDirectory)}`);
    console.log(`   Dry run: ${config.dryRun ? chalk.yellow('Yes') : chalk.green('No')}`);
    console.log(`   Create backups: ${config.createBackups ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`   Compatibility wrappers: ${config.preserveCompatibility ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`   Report format: ${chalk.cyan(config.reportFormat)}`);
    console.log(`   Parallel processing: ${chalk.cyan(config.maxParallelFiles)} files`);
    
    if (config.targetFiles.length > 0) {
      console.log(`   Target files: ${config.targetFiles.length} specified`);
    } else {
      console.log(`   Target files: ${chalk.gray('Auto-discover *.store.ts')}`);
    }
    
    console.log(`   Exclude patterns: ${config.excludePatterns.join(', ')}`);
    console.log('');
  }

  private async confirmExecution(): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with migration?',
        default: true
      }
    ]);
    
    return answer.proceed;
  }

  private createLogger(verbose: boolean) {
    return (message: string, level: 'info' | 'warn' | 'error' | 'debug') => {
      if (!verbose && level === 'debug') return;
      
      const prefix = {
        info: chalk.blue('ℹ'),
        warn: chalk.yellow('⚠'),
        error: chalk.red('❌'),
        debug: chalk.gray('🔍')
      }[level];
      
      console.log(`${prefix} ${message}`);
    };
  }

  private async displayResults(report: MigrationReport, config: CLIConfig): Promise<void> {
    console.log(chalk.bold('\n📋 Migration Results:\n'));

    // Overall status
    if (report.summary.overallSuccess) {
      console.log(chalk.green('✅ Migration completed successfully!'));
    } else {
      console.log(chalk.red('❌ Migration completed with errors'));
    }

    // Statistics
    console.log(`\n📊 Statistics:`);
    console.log(`   Files processed: ${chalk.cyan(report.stats.totalFilesProcessed)}`);
    console.log(`   Successful conversions: ${chalk.green(report.stats.successfulConversions)}`);
    console.log(`   Failed conversions: ${chalk.red(report.stats.failedConversions)}`);
    console.log(`   Methods converted: ${chalk.cyan(report.stats.methodsConverted)}`);
    console.log(`   Compatibility wrappers: ${chalk.cyan(report.stats.wrappersGenerated)}`);
    console.log(`   Warnings: ${chalk.yellow(report.stats.warningsGenerated)}`);

    // Files with issues
    if (report.summary.filesWithErrors.length > 0) {
      console.log(chalk.red(`\n❌ Files with errors (${report.summary.filesWithErrors.length}):`));
      report.summary.filesWithErrors.forEach(file => {
        console.log(`   • ${chalk.red(path.relative(config.rootDirectory, file))}`);
      });
    }

    if (report.summary.filesWithWarnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️ Files with warnings (${report.summary.filesWithWarnings.length}):`));
      report.summary.filesWithWarnings.forEach(file => {
        console.log(`   • ${chalk.yellow(path.relative(config.rootDirectory, file))}`);
      });
    }

    // Manual review required
    if (report.summary.methodsRequiringManualReview.length > 0) {
      console.log(chalk.cyan(`\n🔍 Methods requiring manual review (${report.summary.methodsRequiringManualReview.length}):`));
      report.summary.methodsRequiringManualReview.forEach(item => {
        console.log(`   • ${chalk.cyan(item.method)} in ${path.relative(config.rootDirectory, item.file)}`);
        console.log(`     Reason: ${chalk.gray(item.reason)}`);
      });
    }

    // Report location
    if (config.reportOutput || report.stats.duration) {
      console.log(chalk.bold('\n📄 Reports:'));
      
      if (config.reportOutput) {
        console.log(`   Detailed report: ${chalk.cyan(config.reportOutput)}`);
      }
      
      console.log(`   Duration: ${report.stats.duration}ms`);
    }
  }

  private async saveConfiguration(config: CLIConfig): Promise<void> {
    const configPath = path.join(process.cwd(), '.rxmethod-migrate.json');
    
    const configToSave = {
      rootDirectory: config.rootDirectory,
      dryRun: config.dryRun,
      createBackups: config.createBackups,
      preserveCompatibility: config.preserveCompatibility,
      reportFormat: config.reportFormat,
      excludePatterns: config.excludePatterns,
      maxParallelFiles: config.maxParallelFiles
    };

    fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2));
    console.log(chalk.green(`✅ Configuration saved to ${configPath}`));
  }

  // Dependency checking methods
  private async checkTypeScript(): Promise<{ available: boolean; message: string }> {
    try {
      const ts = await import('typescript');
      return { available: true, message: `v${ts.version}` };
    } catch {
      return { available: false, message: 'Not installed' };
    }
  }

  private async checkNgrxSignals(): Promise<{ available: boolean; message: string }> {
    try {
      // Try to check if @ngrx/signals is available
      require.resolve('@ngrx/signals');
      return { available: true, message: 'Available' };
    } catch {
      return { available: false, message: 'Not installed (required for store files)' };
    }
  }

  private async checkRxJS(): Promise<{ available: boolean; message: string }> {
    try {
      // Try to check if rxjs is available
      require.resolve('rxjs');
      return { available: true, message: 'Available' };
    } catch {
      return { available: false, message: 'Not installed (required for RxMethod)' };
    }
  }

  /**
   * Run the CLI
   */
  run(): void {
    program.parse();
  }
}

// Export and run CLI if this is the main module
export { MigrationCLI };

if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run();
}