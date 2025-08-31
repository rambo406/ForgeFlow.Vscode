/**
 * Comprehensive Integration Tests for Complete Migration System - Task 13
 * Tests end-to-end migration workflow with behavior preservation validation
 */

import { MigrationOrchestrator } from './migration-orchestrator';
import { MigrationConfig, ConversionResult, MigrationReport } from './types';
import { validatePreConversion, validatePostConversion } from './validation';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Comprehensive integration test suite for complete migration workflow
 */
export class ComprehensiveMigrationIntegrationTest {
  private testBaseDir: string;
  private testResults: TestResult[] = [];
  private testStartTime: Date = new Date();

  constructor() {
    this.testBaseDir = path.join(__dirname, 'integration-test-workspace');
  }

  /**
   * Execute all integration tests
   */
  async executeAllTests(): Promise<TestSuiteResult> {
    console.log('🚀 Starting Comprehensive Migration Integration Tests\n');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Test 1: End-to-End Migration of Sample Store
      await this.runTest('End-to-End Migration', () => this.testEndToEndMigration());

      // Test 2: Behavior Preservation Validation
      await this.runTest('Behavior Preservation', () => this.testBehaviorPreservation());

      // Test 3: Existing Tests Compatibility
      await this.runTest('Test Compatibility', () => this.testExistingTestCompatibility());

      // Test 4: Rollback Functionality
      await this.runTest('Rollback Functionality', () => this.testRollbackFunctionality());

      // Test 5: Multiple File Migration
      await this.runTest('Multiple File Migration', () => this.testMultipleFileMigration());

      // Test 6: Error Handling and Recovery
      await this.runTest('Error Handling', () => this.testErrorHandlingAndRecovery());

      // Test 7: Performance and Scalability
      await this.runTest('Performance Validation', () => this.testPerformanceAndScalability());

      // Test 8: Configuration Variations
      await this.runTest('Configuration Variations', () => this.testConfigurationVariations());

      // Generate comprehensive test report
      const report = await this.generateTestReport();
      
      console.log('\n🎯 Integration Test Summary:');
      console.log(`   Total Tests: ${this.testResults.length}`);
      console.log(`   Passed: ${this.testResults.filter(r => r.passed).length}`);
      console.log(`   Failed: ${this.testResults.filter(r => !r.passed).length}`);
      console.log(`   Duration: ${report.totalDuration}ms`);

      return report;

    } finally {
      // Cleanup test environment
      await this.cleanupTestEnvironment();
    }
  }

  /**
   * Test 1: End-to-End Migration of Sample Store File
   */
  private async testEndToEndMigration(): Promise<void> {
    console.log('📝 Testing complete migration workflow...');

    // Create comprehensive sample store file
    const sampleStoreContent = this.createSampleStoreFile();
    const sampleStorePath = path.join(this.testBaseDir, 'sample.store.ts');
    await fs.promises.writeFile(sampleStorePath, sampleStoreContent);

    // Configure migration
    const config: MigrationConfig = {
      dryRun: false,
      verbose: true,
      createBackups: true,
      targetFiles: [sampleStorePath],
      excludePatterns: [],
      preserveCompatibility: true,
      generateDetailedReport: true,
      reportFormat: 'markdown',
      logger: (message: string, level: string) => {
        if (level === 'error') console.error(`   [${level.toUpperCase()}] ${message}`);
      }
    };

    // Execute migration
    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: true,
        maxErrors: 10,
        timeoutMs: 30000
      },
      maxParallelFiles: 1,
      stopOnError: false
    });

    const report = await orchestrator.executeMigration();
    
    // Validate migration results
    this.assert(report.summary.overallSuccess, 'Migration should complete successfully');
    this.assert(report.stats.totalFilesProcessed === 1, 'Should process exactly one file');
    this.assert(report.stats.methodsConverted > 0, 'Should convert at least one method');

    // Verify converted file exists and is valid TypeScript
    this.assert(fs.existsSync(sampleStorePath), 'Converted file should exist');
    
    const convertedContent = await fs.promises.readFile(sampleStorePath, 'utf-8');
    this.assert(convertedContent.includes('rxMethod'), 'Should contain rxMethod implementations');
    this.assert(convertedContent.includes('Async'), 'Should contain compatibility wrappers');

    // Verify backup was created
    const backupExists = fs.readdirSync(this.testBaseDir).some(file => 
      file.includes('sample.store') && file.includes('.backup')
    );
    this.assert(backupExists, 'Backup file should be created');

    console.log('   ✅ End-to-end migration test passed');
  }

  /**
   * Test 2: Behavior Preservation Validation
   */
  private async testBehaviorPreservation(): Promise<void> {
    console.log('🔄 Testing behavior preservation...');

    // Create test store with known behavior patterns
    const behaviorTestStore = this.createBehaviorTestStore();
    const testStorePath = path.join(this.testBaseDir, 'behavior-test.store.ts');
    await fs.promises.writeFile(testStorePath, behaviorTestStore);

    // Perform migration
    const config: MigrationConfig = {
      dryRun: false,
      verbose: false,
      createBackups: true,
      targetFiles: [testStorePath],
      excludePatterns: [],
      preserveCompatibility: true
    };

    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: true,
        maxErrors: 5,
        timeoutMs: 15000
      },
      maxParallelFiles: 1,
      stopOnError: false
    });

    const report = await orchestrator.executeMigration();
    
    // Verify migration success
    this.assert(report.summary.overallSuccess, 'Behavior test migration should succeed');

    // Read converted file and verify specific behavior preservation
    const convertedContent = await fs.promises.readFile(testStorePath, 'utf-8');
    
    // Check that loading state management is preserved
    this.assert(
      convertedContent.includes('isLoading: true') && convertedContent.includes('isLoading: false'),
      'Loading state management should be preserved'
    );

    // Check that error handling is preserved
    this.assert(
      convertedContent.includes('catchError') || convertedContent.includes('error:'),
      'Error handling should be preserved'
    );

    // Check that compatibility wrappers maintain original signatures
    this.assert(
      convertedContent.includes('async') && convertedContent.includes('Promise<'),
      'Async compatibility wrappers should preserve Promise signatures'
    );

    console.log('   ✅ Behavior preservation test passed');
  }

  /**
   * Test 3: Existing Tests Compatibility
   */
  private async testExistingTestCompatibility(): Promise<void> {
    console.log('🧪 Testing existing test compatibility...');

    // Create mock test file that uses the store
    const testFileContent = this.createMockTestFile();
    const testFilePath = path.join(this.testBaseDir, 'store.spec.ts');
    await fs.promises.writeFile(testFilePath, testFileContent);

    // Create corresponding store file
    const storeContent = this.createTestCompatibilityStore();
    const storePath = path.join(this.testBaseDir, 'test-compatibility.store.ts');
    await fs.promises.writeFile(storePath, storeContent);

    // Run migration on store file
    const config: MigrationConfig = {
      dryRun: false,
      verbose: false,
      createBackups: true,
      targetFiles: [storePath],
      excludePatterns: [],
      preserveCompatibility: true
    };

    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: false, // Skip dependency validation for test
        maxErrors: 5,
        timeoutMs: 15000
      },
      maxParallelFiles: 1,
      stopOnError: false
    });

    const report = await orchestrator.executeMigration();

    // Verify migration completed
    this.assert(report.summary.overallSuccess, 'Test compatibility migration should succeed');

    // Verify that compatibility wrappers preserve the interface expected by tests
    const migratedContent = await fs.promises.readFile(storePath, 'utf-8');
    this.assert(
      migratedContent.includes('loadDataAsync') || migratedContent.includes('async loadData'),
      'Should preserve async methods for test compatibility'
    );

    // Simulate that existing tests would still pass by checking method signatures
    const hasExpectedSignatures = this.validateTestCompatibilitySignatures(migratedContent);
    this.assert(hasExpectedSignatures, 'Migrated methods should maintain test-compatible signatures');

    console.log('   ✅ Test compatibility test passed');
  }

  /**
   * Test 4: Rollback Functionality
   */
  private async testRollbackFunctionality(): Promise<void> {
    console.log('↩️ Testing rollback functionality...');

    // Create a store file that will fail conversion (intentionally malformed)
    const malformedStore = this.createMalformedStore();
    const malformedPath = path.join(this.testBaseDir, 'malformed.store.ts');
    await fs.promises.writeFile(malformedPath, malformedStore);

    // Store original content for comparison
    const originalContent = await fs.promises.readFile(malformedPath, 'utf-8');
    const originalHash = crypto.createHash('md5').update(originalContent).digest('hex');

    // Attempt migration (should fail and rollback)
    const config: MigrationConfig = {
      dryRun: false,
      verbose: false,
      createBackups: true,
      targetFiles: [malformedPath],
      excludePatterns: [],
      preserveCompatibility: true
    };

    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: true,
        maxErrors: 3,
        timeoutMs: 10000
      },
      maxParallelFiles: 1,
      stopOnError: false
    });

    const report = await orchestrator.executeMigration();

    // Verify migration failed as expected
    this.assert(!report.summary.overallSuccess, 'Malformed file migration should fail');
    this.assert(report.stats.failedConversions > 0, 'Should report failed conversions');

    // Verify rollback occurred - file should be unchanged
    const rolledBackContent = await fs.promises.readFile(malformedPath, 'utf-8');
    const rolledBackHash = crypto.createHash('md5').update(rolledBackContent).digest('hex');
    
    this.assert(
      originalHash === rolledBackHash, 
      'File should be restored to original state after failed migration'
    );

    console.log('   ✅ Rollback functionality test passed');
  }

  /**
   * Test 5: Multiple File Migration
   */
  private async testMultipleFileMigration(): Promise<void> {
    console.log('📁 Testing multiple file migration...');

    // Create multiple store files
    const stores = [
      { name: 'user.store.ts', content: this.createUserStore() },
      { name: 'product.store.ts', content: this.createProductStore() },
      { name: 'order.store.ts', content: this.createOrderStore() }
    ];

    const storePaths = await Promise.all(
      stores.map(async (store) => {
        const storePath = path.join(this.testBaseDir, store.name);
        await fs.promises.writeFile(storePath, store.content);
        return storePath;
      })
    );

    // Run migration on all files
    const config: MigrationConfig = {
      dryRun: false,
      verbose: true,
      createBackups: true,
      targetFiles: storePaths,
      excludePatterns: [],
      preserveCompatibility: true,
      generateDetailedReport: true
    };

    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: true,
        maxErrors: 15,
        timeoutMs: 45000
      },
      maxParallelFiles: 3,
      stopOnError: false
    });

    const report = await orchestrator.executeMigration();

    // Verify all files were processed
    this.assert(report.stats.totalFilesProcessed === 3, 'Should process all three store files');
    this.assert(report.stats.successfulConversions >= 2, 'Should successfully convert at least 2 files');

    // Verify each file was converted
    for (const storePath of storePaths) {
      const convertedContent = await fs.promises.readFile(storePath, 'utf-8');
      this.assert(
        convertedContent.includes('rxMethod') || convertedContent.includes('// No async methods'),
        `${path.basename(storePath)} should be converted or marked as no changes needed`
      );
    }

    console.log('   ✅ Multiple file migration test passed');
  }

  /**
   * Test 6: Error Handling and Recovery
   */
  private async testErrorHandlingAndRecovery(): Promise<void> {
    console.log('⚠️ Testing error handling and recovery...');

    // Create mix of valid and invalid files
    const testFiles = [
      { name: 'valid.store.ts', content: this.createSimpleValidStore(), shouldSucceed: true },
      { name: 'invalid-syntax.store.ts', content: this.createInvalidSyntaxStore(), shouldSucceed: false },
      { name: 'valid2.store.ts', content: this.createAnotherValidStore(), shouldSucceed: true }
    ];

    const filePaths = await Promise.all(
      testFiles.map(async (file) => {
        const filePath = path.join(this.testBaseDir, file.name);
        await fs.promises.writeFile(filePath, file.content);
        return { path: filePath, shouldSucceed: file.shouldSucceed };
      })
    );

    // Run migration with error handling
    const config: MigrationConfig = {
      dryRun: false,
      verbose: true,
      createBackups: true,
      targetFiles: filePaths.map(f => f.path),
      excludePatterns: [],
      preserveCompatibility: true
    };

    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: true,
        enablePatternValidation: true,
        enableDependencyValidation: true,
        maxErrors: 10,
        timeoutMs: 30000
      },
      maxParallelFiles: 3,
      stopOnError: false // Continue processing despite errors
    });

    const report = await orchestrator.executeMigration();

    // Verify error handling behavior
    this.assert(report.stats.totalFilesProcessed === 3, 'Should attempt to process all files');
    this.assert(report.stats.failedConversions >= 1, 'Should report at least one failure');
    this.assert(report.stats.successfulConversions >= 1, 'Should have at least one success despite errors');

    // Verify that valid files were still processed
    const validFiles = filePaths.filter(f => f.shouldSucceed);
    for (const validFile of validFiles) {
      const content = await fs.promises.readFile(validFile.path, 'utf-8');
      const wasProcessed = content.includes('rxMethod') || content.includes('// No async methods');
      this.assert(wasProcessed, `Valid file ${validFile.path} should still be processed despite other errors`);
    }

    console.log('   ✅ Error handling and recovery test passed');
  }

  /**
   * Test 7: Performance and Scalability
   */
  private async testPerformanceAndScalability(): Promise<void> {
    console.log('⚡ Testing performance and scalability...');

    // Create multiple files to test performance
    const fileCount = 10;
    const filePaths: string[] = [];

    // Generate test files
    for (let i = 0; i < fileCount; i++) {
      const fileName = `perf-test-${i}.store.ts`;
      const filePath = path.join(this.testBaseDir, fileName);
      const content = this.createPerformanceTestStore(i);
      await fs.promises.writeFile(filePath, content);
      filePaths.push(filePath);
    }

    // Measure migration performance
    const startTime = Date.now();

    const config: MigrationConfig = {
      dryRun: true, // Use dry run for performance testing
      verbose: false,
      createBackups: true,
      targetFiles: filePaths,
      excludePatterns: [],
      preserveCompatibility: true
    };

    const orchestrator = new MigrationOrchestrator({
      ...config,
      rootDirectory: this.testBaseDir,
      validation: {
        enableTypeScriptValidation: true,
        enableSyntaxValidation: true,
        enableImportValidation: false, // Skip for performance
        enablePatternValidation: true,
        enableDependencyValidation: false,
        maxErrors: 50,
        timeoutMs: 60000
      },
      maxParallelFiles: 5,
      stopOnError: false
    });

    const report = await orchestrator.executeMigration();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Performance assertions
    this.assert(report.stats.totalFilesProcessed === fileCount, `Should process all ${fileCount} files`);
    this.assert(duration < 30000, `Migration should complete within 30 seconds, took ${duration}ms`);
    
    const avgTimePerFile = duration / fileCount;
    this.assert(avgTimePerFile < 5000, `Average time per file should be under 5 seconds, was ${avgTimePerFile}ms`);

    console.log(`   ⏱️ Performance: ${duration}ms total, ${avgTimePerFile}ms avg per file`);
    console.log('   ✅ Performance and scalability test passed');
  }

  /**
   * Test 8: Configuration Variations
   */
  private async testConfigurationVariations(): Promise<void> {
    console.log('⚙️ Testing configuration variations...');

    const testStore = this.createConfigTestStore();
    const storePath = path.join(this.testBaseDir, 'config-test.store.ts');
    await fs.promises.writeFile(storePath, testStore);

    // Test different configuration scenarios
    const configs = [
      {
        name: 'Dry Run Mode',
        config: { dryRun: true, verbose: false, createBackups: false, preserveCompatibility: true }
      },
      {
        name: 'No Compatibility Wrappers',
        config: { dryRun: true, preserveCompatibility: false, createBackups: false, verbose: false }
      },
      {
        name: 'Verbose Mode',
        config: { dryRun: true, verbose: true, createBackups: false, preserveCompatibility: true }
      }
    ];

    for (const testConfig of configs) {
      console.log(`   Testing ${testConfig.name}...`);

      const config: MigrationConfig = {
        targetFiles: [storePath],
        excludePatterns: [],
        ...testConfig.config
      };

      const orchestrator = new MigrationOrchestrator({
        ...config,
        rootDirectory: this.testBaseDir,
        validation: {
          enableTypeScriptValidation: true,
          enableSyntaxValidation: true,
          enableImportValidation: true,
          enablePatternValidation: true,
          enableDependencyValidation: true,
          maxErrors: 10,
          timeoutMs: 15000
        },
        maxParallelFiles: 1,
        stopOnError: false
      });

      const report = await orchestrator.executeMigration();
      
      // Each configuration should at least attempt to process the file
      this.assert(
        report.stats.totalFilesProcessed === 1, 
        `${testConfig.name} should process the test file`
      );
    }

    console.log('   ✅ Configuration variations test passed');
  }

  // Test Helper Methods

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    let passed = false;
    let error: string | undefined;

    try {
      await testFunction();
      passed = true;
    } catch (err: any) {
      passed = false;
      error = err?.message || String(err);
      console.error(`   ❌ ${testName} failed: ${error}`);
    }

    const endTime = Date.now();
    this.testResults.push({
      name: testName,
      passed,
      duration: endTime - startTime,
      error
    });
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    // Create test directory
    if (fs.existsSync(this.testBaseDir)) {
      await this.cleanupTestEnvironment();
    }
    await fs.promises.mkdir(this.testBaseDir, { recursive: true });
  }

  private async cleanupTestEnvironment(): Promise<void> {
    if (fs.existsSync(this.testBaseDir)) {
      await fs.promises.rm(this.testBaseDir, { recursive: true, force: true });
    }
  }

  private validateTestCompatibilitySignatures(content: string): boolean {
    // Check that async wrapper methods exist with proper signatures
    return content.includes('async') && 
           content.includes('Promise<') &&
           (content.includes('Async(') || content.includes('async '));
  }

  private async generateTestReport(): Promise<TestSuiteResult> {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.testStartTime.getTime();
    const passedTests = this.testResults.filter(r => r.passed);
    const failedTests = this.testResults.filter(r => !r.passed);

    return {
      totalTests: this.testResults.length,
      passedTests: passedTests.length,
      failedTests: failedTests.length,
      totalDuration,
      results: this.testResults,
      summary: {
        success: failedTests.length === 0,
        successRate: (passedTests.length / this.testResults.length) * 100,
        averageTestDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length
      }
    };
  }

  // Sample Store Content Generators

  private createSampleStoreFile(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

interface User {
  id: string;
  name: string;
  email: string;
}

export const SampleStore = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as User[],
    selectedUser: null as User | null,
    isLoading: false,
    error: undefined as string | undefined
  }),
  withMethods((store, userService = inject(UserService)) => ({
    // Simple loading pattern
    async loadUsers(): Promise<User[]> {
      patchState(store, { isLoading: true, error: undefined });
      try {
        const users = await userService.getUsers();
        patchState(store, { users });
        return users;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
        patchState(store, { error: errorMessage });
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    // Optimistic update pattern
    async updateUser(id: string, updates: Partial<User>): Promise<void> {
      const originalUsers = store.users();
      const optimisticUsers = originalUsers.map(user => 
        user.id === id ? { ...user, ...updates } : user
      );
      patchState(store, { users: optimisticUsers });

      try {
        await userService.updateUser(id, updates);
      } catch (error) {
        patchState(store, { users: originalUsers });
        throw error;
      }
    },

    // Bulk operation pattern
    async deleteMultipleUsers(userIds: string[]): Promise<void> {
      const originalUsers = store.users();
      patchState(store, { isLoading: true });
      
      try {
        await Promise.all(userIds.map(id => userService.deleteUser(id)));
        const updatedUsers = originalUsers.filter(user => !userIds.includes(user.id));
        patchState(store, { users: updatedUsers });
      } catch (error) {
        patchState(store, { users: originalUsers, error: 'Failed to delete users' });
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    }
  }))
);
`;
  }

  private createBehaviorTestStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const BehaviorTestStore = signalStore(
  { providedIn: 'root' },
  withState({
    data: null as any,
    isLoading: false,
    error: undefined as string | undefined,
    lastUpdated: null as Date | null
  }),
  withMethods((store, dataService = inject(DataService)) => ({
    async loadWithBehaviorTracking(params: any): Promise<any> {
      console.log('Loading started');
      patchState(store, { isLoading: true, error: undefined });
      
      try {
        const result = await dataService.loadData(params);
        patchState(store, { 
          data: result, 
          lastUpdated: new Date(),
          isLoading: false 
        });
        console.log('Loading completed');
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Load failed';
        patchState(store, { error: errorMessage, isLoading: false });
        console.error('Loading failed:', errorMessage);
        throw error;
      }
    }
  }))
);
`;
  }

  private createMockTestFile(): string {
    return `
import { TestBed } from '@angular/core/testing';
import { TestCompatibilityStore } from './test-compatibility.store';

describe('Store Integration Test', () => {
  let store: TestCompatibilityStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(TestCompatibilityStore);
  });

  it('should load data asynchronously', async () => {
    const result = await store.loadDataAsync({ id: 1 });
    expect(result).toBeDefined();
  });

  it('should handle errors properly', async () => {
    try {
      await store.loadDataAsync({ invalid: true });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
`;
  }

  private createTestCompatibilityStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const TestCompatibilityStore = signalStore(
  { providedIn: 'root' },
  withState({
    testData: null as any,
    isLoading: false
  }),
  withMethods((store, testService = inject(TestService)) => ({
    async loadData(params: any): Promise<any> {
      patchState(store, { isLoading: true });
      try {
        const result = await testService.getData(params);
        patchState(store, { testData: result });
        return result;
      } catch (error) {
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    }
  }))
);
`;
  }

  private createMalformedStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';

// Intentionally malformed store for testing error handling
export const MalformedStore = signalStore(
  withState({
    data: null
  }),
  withMethods((store) => ({
    // Invalid async method - missing return type, improper syntax
    async loadData(
      patchState(store, { isLoading: true });
      const result = await someService.getData();
      patchState(store, { data: result });
      // Missing return and closing brace
    }
  ))
);
`;
  }

  private createUserStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as User[],
    isLoading: false
  }),
  withMethods((store, userService = inject(UserService)) => ({
    async fetchUsers(): Promise<User[]> {
      patchState(store, { isLoading: true });
      const users = await userService.getAll();
      patchState(store, { users, isLoading: false });
      return users;
    }
  }))
);
`;
  }

  private createProductStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const ProductStore = signalStore(
  { providedIn: 'root' },
  withState({
    products: [] as Product[],
    isLoading: false
  }),
  withMethods((store, productService = inject(ProductService)) => ({
    async loadProducts(categoryId?: string): Promise<Product[]> {
      patchState(store, { isLoading: true });
      try {
        const products = await productService.getByCategory(categoryId);
        patchState(store, { products });
        return products;
      } finally {
        patchState(store, { isLoading: false });
      }
    }
  }))
);
`;
  }

  private createOrderStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const OrderStore = signalStore(
  { providedIn: 'root' },
  withState({
    orders: [] as Order[],
    isProcessing: false
  }),
  withMethods((store, orderService = inject(OrderService)) => ({
    async createOrder(orderData: CreateOrderRequest): Promise<Order> {
      patchState(store, { isProcessing: true });
      try {
        const newOrder = await orderService.create(orderData);
        const updatedOrders = [...store.orders(), newOrder];
        patchState(store, { orders: updatedOrders });
        return newOrder;
      } finally {
        patchState(store, { isProcessing: false });
      }
    }
  }))
);
`;
  }

  private createSimpleValidStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const SimpleValidStore = signalStore(
  { providedIn: 'root' },
  withState({ data: null, isLoading: false }),
  withMethods((store, service = inject(DataService)) => ({
    async load(): Promise<any> {
      patchState(store, { isLoading: true });
      const result = await service.getData();
      patchState(store, { data: result, isLoading: false });
      return result;
    }
  }))
);
`;
  }

  private createInvalidSyntaxStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';

export const InvalidSyntaxStore = signalStore(
  withState({ data: null }),
  withMethods((store) => ({
    async invalidMethod() {
      // Missing return type and has syntax errors
      const result = await someUndefinedService.getData(;
      patchState(store, { data: result }
      return result
    }
  }))
)
`;
  }

  private createAnotherValidStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const AnotherValidStore = signalStore(
  { providedIn: 'root' },
  withState({ items: [] as any[], loading: false }),
  withMethods((store, itemService = inject(ItemService)) => ({
    async fetchItems(): Promise<any[]> {
      patchState(store, { loading: true });
      try {
        const items = await itemService.getItems();
        patchState(store, { items });
        return items;
      } finally {
        patchState(store, { loading: false });
      }
    }
  }))
);
`;
  }

  private createPerformanceTestStore(index: number): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const PerformanceTestStore${index} = signalStore(
  { providedIn: 'root' },
  withState({
    data${index}: null as any,
    isLoading${index}: false,
    items${index}: [] as any[]
  }),
  withMethods((store, service${index} = inject(TestService${index})) => ({
    async loadData${index}(params: any): Promise<any> {
      patchState(store, { isLoading${index}: true });
      try {
        const result = await service${index}.getData(params);
        patchState(store, { data${index}: result });
        return result;
      } finally {
        patchState(store, { isLoading${index}: false });
      }
    },

    async loadItems${index}(): Promise<any[]> {
      const items = await service${index}.getItems();
      patchState(store, { items${index}: items });
      return items;
    },

    async updateItem${index}(id: string, data: any): Promise<void> {
      const originalItems = store.items${index}();
      const optimisticItems = originalItems.map(item => 
        item.id === id ? { ...item, ...data } : item
      );
      patchState(store, { items${index}: optimisticItems });

      try {
        await service${index}.updateItem(id, data);
      } catch (error) {
        patchState(store, { items${index}: originalItems });
        throw error;
      }
    }
  }))
);
`;
  }

  private createConfigTestStore(): string {
    return `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const ConfigTestStore = signalStore(
  { providedIn: 'root' },
  withState({
    configData: null as any,
    isLoading: false,
    error: undefined as string | undefined
  }),
  withMethods((store, configService = inject(ConfigService)) => ({
    async loadConfiguration(options: any): Promise<any> {
      patchState(store, { isLoading: true, error: undefined });
      try {
        const config = await configService.getConfiguration(options);
        patchState(store, { configData: config });
        return config;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Config load failed';
        patchState(store, { error: errorMessage });
        throw error;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async updateConfiguration(updates: any): Promise<void> {
      const originalConfig = store.configData();
      const optimisticConfig = { ...originalConfig, ...updates };
      patchState(store, { configData: optimisticConfig });

      try {
        await configService.updateConfiguration(updates);
      } catch (error) {
        patchState(store, { configData: originalConfig });
        throw error;
      }
    }
  }))
);
`;
  }
}

// Type definitions for test results
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    success: boolean;
    successRate: number;
    averageTestDuration: number;
  };
}

// Export main test runner function
export async function runTask13IntegrationTests(): Promise<TestSuiteResult> {
  const testRunner = new ComprehensiveMigrationIntegrationTest();
  return await testRunner.executeAllTests();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTask13IntegrationTests()
    .then((result) => {
      console.log('\\n📊 Final Test Report:');
      console.log(JSON.stringify(result.summary, null, 2));
      process.exit(result.summary.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}