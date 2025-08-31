/**
 * Integration test for the complete migration system with enhanced reporting
 */

import { MigrationOrchestrator } from './migration-orchestrator';
import { MigrationConfig } from './types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Test the complete migration workflow with reporting
 */
async function testMigrationWithReporting() {
  console.log('=== Testing Complete Migration with Enhanced Reporting ===\n');

  const tempDir = path.join(__dirname, 'temp-integration-test');
  
  // Create test setup
  await setupTestEnvironment(tempDir);

  try {
    // Test Configuration
    const config: MigrationConfig = {
      dryRun: true, // Use dry run for testing
      verbose: true,
      createBackups: true,
      targetFiles: [path.join(tempDir, 'test.store.ts')], // Use exact file path instead of glob
      excludePatterns: [],
      preserveCompatibility: true,
      generateDetailedReport: true,
      reportFormat: 'markdown',
      reportOutputPath: path.join(tempDir, 'integration-test-report.md'),
      logger: (message: string, level: string) => {
        console.log(`[${level.toUpperCase()}] ${message}`);
      }
    };

    console.log('--- Test 1: Complete Migration Workflow ---');
    const orchestrator = new MigrationOrchestrator(config);
    
    try {
      const report = await orchestrator.executeMigration();
      console.log('✅ Migration workflow completed successfully');
      console.log(`   - Files processed: ${report.stats.totalFilesProcessed}`);
      console.log(`   - Methods converted: ${report.stats.methodsConverted}`);
      console.log(`   - Overall success: ${report.summary.overallSuccess}`);
      
      // Test detailed report generation
      console.log('\n--- Test 2: Detailed Report Generation ---');
      const reportPath = await orchestrator.generateDetailedReport();
      console.log(`✅ Detailed report generated at: ${reportPath}`);
      
      if (fs.existsSync(reportPath)) {
        const reportContent = fs.readFileSync(reportPath, 'utf8');
        console.log(`   - Report size: ${reportContent.length} characters`);
        console.log(`   - Contains executive summary: ${reportContent.includes('Executive Summary')}`);
        console.log(`   - Contains statistics: ${reportContent.includes('Detailed Statistics')}`);
        console.log(`   - Contains health assessment: ${reportContent.includes('Migration Health Assessment')}`);
      }

      // Test method-specific comparison report
      console.log('\n--- Test 3: Method Comparison Report ---');
      if (report.results.length > 0 && report.results[0].originalMethods.length > 0) {
        const firstResult = report.results[0];
        const firstMethod = firstResult.originalMethods[0];
        
        const comparisonReport = orchestrator.generateMethodComparisonReport(
          firstResult.filePath,
          firstMethod.methodName
        );
        
        if (comparisonReport) {
          console.log('✅ Method comparison report generated');
          console.log(`   - Method: ${firstMethod.methodName}`);
          console.log(`   - Report length: ${comparisonReport.length} characters`);
        } else {
          console.log('⚠️ No comparison report generated (expected for dry run)');
        }
      }

    } catch (error: any) {
      console.error('❌ Migration workflow failed:', error?.message || String(error));
    }

    console.log('\n--- Test 4: Configuration Validation ---');
    try {
      // Test with different configurations
      const configs = [
        { ...config, reportFormat: 'json' as const },
        { ...config, reportFormat: 'html' as const },
        { ...config, generateDetailedReport: false }
      ];

      for (const testConfig of configs) {
        const testOrchestrator = new MigrationOrchestrator(testConfig);
        console.log(`✅ Configuration valid for format: ${testConfig.reportFormat || 'default'}`);
      }
    } catch (error: any) {
      console.error('❌ Configuration validation failed:', error?.message || String(error));
    }

  } finally {
    // Cleanup
    await cleanupTestEnvironment(tempDir);
  }

  console.log('\n=== Integration Testing Complete ===');
}

/**
 * Set up test environment with mock store files
 */
async function setupTestEnvironment(tempDir: string): Promise<void> {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create mock store file
  const mockStoreContent = `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const TestStore = signalStore(
  { providedIn: 'root' },
  withState({
    data: null,
    isLoading: false,
    error: undefined
  }),
  withMethods((store, messageService = inject(MessageService)) => ({
    // Simple async method for testing
    async loadTestData(params: LoadParams): Promise<TestData> {
      patchState(store, { isLoading: true, error: undefined });
      try {
        const result = await messageService.loadTestData(params);
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
    
    // Optimistic update pattern for testing
    async updateTestItem(id: string, data: Partial<TestData>): Promise<void> {
      const originalData = store.data();
      const optimisticData = originalData ? { ...originalData, ...data } : null;
      patchState(store, { data: optimisticData });
      
      try {
        await messageService.updateTestItem(id, data);
      } catch (error) {
        patchState(store, { data: originalData });
        throw error;
      }
    }
  }))
);
`;

  fs.writeFileSync(path.join(tempDir, 'test.store.ts'), mockStoreContent);
}

/**
 * Clean up test environment
 */
async function cleanupTestEnvironment(tempDir: string): Promise<void> {
  try {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          await cleanupTestEnvironment(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(tempDir);
      console.log('✅ Test environment cleaned up');
    }
  } catch (error: any) {
    console.error('⚠️ Cleanup warning:', error?.message || String(error));
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMigrationWithReporting().catch(console.error);
}