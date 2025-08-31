/**
 * Test script for the Migration Reporting System
 */

import { 
  MigrationReporter, 
  createMigrationReport, 
  generateMethodComparisonReport,
  DetailedMigrationReport,
  ReportOptions
} from './migration-reporter';
import {
  MigrationReport,
  MigrationConfig,
  ConversionResult,
  AsyncMethodPattern,
  RxMethodImplementation,
  MigrationStats
} from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test the migration reporting system
 */
async function testMigrationReporter() {
  console.log('=== Testing Migration Reporting System ===\n');

  const mockConfig: MigrationConfig = {
    dryRun: false,
    verbose: true,
    createBackups: true,
    targetFiles: ['test.store.ts'],
    excludePatterns: [],
    preserveCompatibility: true
  };

  const mockBasicReport = createMockMigrationReport();
  const reporter = new MigrationReporter(mockConfig);

  // Test 1: Generate detailed report
  console.log('--- Test 1: Generating Detailed Report ---');
  try {
    const options: ReportOptions = {
      format: 'markdown',
      includeComparisons: true,
      includeCodeSamples: true,
      includeStatistics: true,
      includeWarnings: true
    };

    const detailedReport = reporter.generateDetailedReport(mockBasicReport, options);
    console.log('✅ Detailed report generated successfully');
    console.log(`   - Statistics: ${JSON.stringify(detailedReport.detailedStats.patterns)}`);
    console.log(`   - Comparisons: ${detailedReport.conversionComparisons.length} methods`);
    console.log(`   - Health Score: ${detailedReport.migrationHealth.overallScore.toFixed(1)}/100`);
    console.log(`   - Risk Level: ${detailedReport.migrationHealth.riskAssessment}`);
  } catch (error) {
    console.error('❌ Failed to generate detailed report:', error);
  }

  // Test 2: Generate and save markdown report
  console.log('\n--- Test 2: Generating Markdown Report File ---');
  try {
    const tempDir = path.join(__dirname, 'temp-reports');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const options: ReportOptions = {
      format: 'markdown',
      includeComparisons: true,
      includeCodeSamples: true,
      includeStatistics: true,
      includeWarnings: true,
      outputPath: path.join(tempDir, 'test-report.md')
    };

    const outputPath = await reporter.generateAndSaveReport(mockBasicReport, options);
    console.log('✅ Markdown report saved successfully');
    console.log(`   - File: ${outputPath}`);
    
    if (fs.existsSync(outputPath)) {
      const content = fs.readFileSync(outputPath, 'utf8');
      console.log(`   - Size: ${content.length} characters`);
      console.log(`   - Contains header: ${content.includes('# Async to RxMethod Migration Report')}`);
      console.log(`   - Contains statistics: ${content.includes('## Detailed Statistics')}`);
    }
  } catch (error) {
    console.error('❌ Failed to generate markdown report:', error);
  }

  // Test 3: Generate JSON report
  console.log('\n--- Test 3: Generating JSON Report ---');
  try {
    const tempDir = path.join(__dirname, 'temp-reports');
    const options: ReportOptions = {
      format: 'json',
      includeComparisons: false,
      includeCodeSamples: false,
      includeStatistics: true,
      includeWarnings: true,
      outputPath: path.join(tempDir, 'test-report.json')
    };

    const outputPath = await reporter.generateAndSaveReport(mockBasicReport, options);
    console.log('✅ JSON report saved successfully');
    
    if (fs.existsSync(outputPath)) {
      const content = fs.readFileSync(outputPath, 'utf8');
      const parsed = JSON.parse(content);
      console.log(`   - Valid JSON: ${!!parsed}`);
      console.log(`   - Has detailedStats: ${!!parsed.detailedStats}`);
      console.log(`   - Has migrationHealth: ${!!parsed.migrationHealth}`);
    }
  } catch (error) {
    console.error('❌ Failed to generate JSON report:', error);
  }

  // Test 4: Generate method comparison report
  console.log('\n--- Test 4: Generating Method Comparison Report ---');
  try {
    const mockOriginal = createMockAsyncMethodPattern();
    const mockConverted = createMockRxMethodImplementation();

    const comparisonReport = generateMethodComparisonReport(mockOriginal, mockConverted);
    console.log('✅ Method comparison report generated');
    console.log(`   - Contains method name: ${comparisonReport.includes(mockOriginal.methodName)}`);
    console.log(`   - Contains before section: ${comparisonReport.includes('## Before')}`);
    console.log(`   - Contains after section: ${comparisonReport.includes('## After')}`);
    console.log(`   - Contains RxMethod implementation: ${comparisonReport.includes('### RxMethod Implementation')}`);
  } catch (error) {
    console.error('❌ Failed to generate method comparison report:', error);
  }

  // Test 5: Test with empty results
  console.log('\n--- Test 5: Testing Edge Cases ---');
  try {
    const emptyReport: MigrationReport = {
      config: mockConfig,
      stats: {
        totalFilesProcessed: 0,
        successfulConversions: 0,
        failedConversions: 0,
        methodsConverted: 0,
        wrappersGenerated: 0,
        warningsGenerated: 0,
        startTime: new Date()
      },
      results: [],
      summary: {
        overallSuccess: true,
        filesWithErrors: [],
        filesWithWarnings: [],
        methodsRequiringManualReview: []
      }
    };

    const emptyDetailedReport = reporter.generateDetailedReport(emptyReport);
    console.log('✅ Empty report handled correctly');
    console.log(`   - File statistics: ${emptyDetailedReport.fileStatistics.length} files`);
    console.log(`   - Conversion comparisons: ${emptyDetailedReport.conversionComparisons.length} comparisons`);
  } catch (error) {
    console.error('❌ Failed to handle empty report:', error);
  }

  // Test 6: Test with failed conversions
  console.log('\n--- Test 6: Testing Failed Conversion Handling ---');
  try {
    const failedReport: MigrationReport = {
      config: mockConfig,
      stats: {
        totalFilesProcessed: 1,
        successfulConversions: 0,
        failedConversions: 1,
        methodsConverted: 0,
        wrappersGenerated: 0,
        warningsGenerated: 0,
        startTime: new Date()
      },
      results: [{
        filePath: 'failed.store.ts',
        originalMethods: [createMockAsyncMethodPattern()],
        convertedMethods: [],
        compatibilityWrappers: [],
        requiredImports: [],
        success: false,
        warnings: [],
        errors: ['Conversion failed']
      }],
      summary: {
        overallSuccess: false,
        filesWithErrors: ['failed.store.ts'],
        filesWithWarnings: [],
        methodsRequiringManualReview: []
      }
    };

    const failedDetailedReport = reporter.generateDetailedReport(failedReport);
    console.log('✅ Failed conversion report handled');
    console.log(`   - Overall success: ${failedDetailedReport.summary.overallSuccess}`);
    console.log(`   - Risk assessment: ${failedDetailedReport.migrationHealth.riskAssessment}`);
    console.log(`   - Health score: ${failedDetailedReport.migrationHealth.overallScore.toFixed(1)}/100`);
  } catch (error) {
    console.error('❌ Failed to handle failed conversion report:', error);
  }

  // Test 7: Test createMigrationReport utility
  console.log('\n--- Test 7: Testing Utility Functions ---');
  try {
    const outputPath = await createMigrationReport(mockBasicReport, mockConfig);
    console.log('✅ Utility function worked correctly');
    console.log(`   - Output path: ${outputPath}`);
    console.log(`   - File exists: ${fs.existsSync(outputPath)}`);
  } catch (error) {
    console.error('❌ Failed to create migration report via utility:', error);
  }

  // Cleanup
  console.log('\n--- Cleanup ---');
  try {
    const tempDir = path.join(__dirname, 'temp-reports');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
      console.log('✅ Temporary files cleaned up');
    }
  } catch (error) {
    console.error('⚠️ Cleanup warning:', error);
  }

  console.log('\n=== Migration Reporter Testing Complete ===');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMigrationReporter().catch(console.error);
}

// Helper functions to create mock data
function createMockMigrationReport(): MigrationReport {
  return {
    config: {
      dryRun: false,
      verbose: true,
      createBackups: true,
      targetFiles: ['test.store.ts'],
      excludePatterns: [],
      preserveCompatibility: true
    },
    stats: {
      totalFilesProcessed: 1,
      successfulConversions: 1,
      failedConversions: 0,
      methodsConverted: 2,
      wrappersGenerated: 2,
      warningsGenerated: 1,
      startTime: new Date(Date.now() - 60000), // 1 minute ago
      endTime: new Date(),
      duration: 60000
    },
    results: [
      {
        filePath: 'test.store.ts',
        originalMethods: [
          createMockAsyncMethodPattern('loadData', 'simple-load'),
          createMockAsyncMethodPattern('updateItem', 'optimistic-update')
        ],
        convertedMethods: [
          createMockRxMethodImplementation('loadData', 'simple-load'),
          createMockRxMethodImplementation('updateItem', 'optimistic-update')
        ],
        compatibilityWrappers: [
          {
            originalMethodName: 'loadData',
            wrapperMethodName: 'loadDataAsync',
            code: 'async loadDataAsync() { return lastValueFrom(this.loadData()); }',
            preservedSignature: 'async loadData(): Promise<Data>'
          }
        ],
        requiredImports: [
          {
            modulePath: '@ngrx/signals/rxjs-interop',
            namedImports: ['rxMethod'],
            defaultImport: undefined,
            namespaceImport: undefined
          },
          {
            modulePath: 'rxjs',
            namedImports: ['switchMap', 'from', 'lastValueFrom'],
            defaultImport: undefined,
            namespaceImport: undefined
          }
        ],
        success: true,
        warnings: ['Method loadData has high complexity'],
        errors: []
      }
    ],
    summary: {
      overallSuccess: true,
      filesWithErrors: [],
      filesWithWarnings: ['test.store.ts'],
      methodsRequiringManualReview: []
    }
  };
}

function createMockAsyncMethodPattern(
  methodName: string = 'loadData', 
  pattern: 'simple-load' | 'optimistic-update' | 'bulk-operation' | 'custom' = 'simple-load'
): AsyncMethodPattern {
  return {
    methodName,
    returnType: 'Promise<Data>',
    parameters: [
      { name: 'params', type: 'LoadParams', isOptional: false }
    ],
    pattern,
    hasErrorHandling: true,
    hasLoadingState: true,
    usesOptimisticUpdate: pattern === 'optimistic-update',
    dependencies: ['messageService'],
    sourceCode: `async ${methodName}(params: LoadParams): Promise<Data> {
  patchState(store, { isLoading: true, error: undefined });
  try {
    const result = await messageService.${methodName}(params);
    patchState(store, { data: result });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Load failed';
    patchState(store, { error: errorMessage });
    throw error;
  } finally {
    patchState(store, { isLoading: false });
  }
}`,
    startLine: 10,
    endLine: 23,
    filePath: 'test.store.ts',
    confidence: 85,
    type: pattern
  };
}

function createMockRxMethodImplementation(
  methodName: string = 'loadData',
  pattern: 'simple-load' | 'optimistic-update' | 'bulk-operation' | 'custom' = 'simple-load'
): RxMethodImplementation {
  return {
    name: methodName,
    rxMethodCode: `${methodName}: rxMethod<LoadParams>(pipe(
  tap(() => patchState(store, { isLoading: true, error: undefined })),
  switchMap((params: LoadParams) => 
    from(messageService.${methodName}(params)).pipe(
      tap({
        next: (result: Data) => patchState(store, { data: result }),
        error: (error: any) => patchState(store, { 
          error: error instanceof Error ? error.message : 'Load failed' 
        })
      }),
      catchError((error: any) => {
        patchState(store, { 
          error: error instanceof Error ? error.message : 'Load failed' 
        });
        return EMPTY;
      })
    )
  ),
  finalize(() => patchState(store, { isLoading: false }))
))`,
    compatibilityWrapperCode: `async ${methodName}Async(params: LoadParams): Promise<Data> {
  return lastValueFrom(this.${methodName}(params));
}`,
    utilityPattern: pattern === 'simple-load' ? 'createLoadingStatePattern' : 'custom',
    requiresManualReview: pattern === 'custom',
    generatedImports: [
      {
        modulePath: '@ngrx/signals/rxjs-interop',
        namedImports: ['rxMethod'],
        defaultImport: undefined,
        namespaceImport: undefined
      }
    ],
    comments: ['Generated by async-to-rxmethod migration'],
    methodName,
    pattern,
    code: 'generated code here'
  };
}