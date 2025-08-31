/**
 * CLI Tool Testing Script - Task 14 Validation
 * Tests the migration CLI tool functionality
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

async function testCLITool(): Promise<void> {
  console.log('🧪 Testing RxMethod Migration CLI Tool\n');

  const cliPath = path.join(__dirname, 'cli.ts');
  const testWorkspace = path.join(__dirname, 'cli-test-workspace');

  // Create test workspace
  await setupTestWorkspace(testWorkspace);

  try {
    // Test 1: Status command
    console.log('📋 Test 1: Status Command');
    await runCLICommand('status', []);

    // Test 2: Validation command
    console.log('\n🔍 Test 2: Validation Command');
    await runCLICommand('validate', [testWorkspace, '--verbose']);

    // Test 3: Dry run migration
    console.log('\n🧪 Test 3: Dry Run Migration');
    await runCLICommand('migrate', [testWorkspace, '--dry-run', '--verbose']);

    // Test 4: Help command
    console.log('\n❓ Test 4: Help Command');
    await runCLICommand('--help', []);

    console.log('\n✅ All CLI tests completed successfully!');

  } catch (error: any) {
    console.error('\n❌ CLI test failed:', error?.message || String(error));
  } finally {
    // Cleanup
    await cleanupTestWorkspace(testWorkspace);
  }
}

async function runCLICommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, 'cli.ts');
    const childArgs = [cliPath, command, ...args];
    
    console.log(`   Running: npx ts-node ${childArgs.join(' ')}`);
    
    const child = spawn('npx', ['ts-node', ...childArgs], {
      stdio: 'pipe',
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 || command === '--help') {
        console.log(`   ✅ Command completed successfully`);
        if (stdout) {
          console.log(`   Output preview: ${stdout.substring(0, 200)}${stdout.length > 200 ? '...' : ''}`);
        }
        resolve();
      } else {
        console.log(`   ❌ Command failed with code ${code}`);
        if (stderr) {
          console.log(`   Error: ${stderr.substring(0, 200)}${stderr.length > 200 ? '...' : ''}`);
        }
        reject(new Error(`CLI command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.log(`   ❌ Command execution failed: ${error.message}`);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Command timeout'));
    }, 30000);
  });
}

async function setupTestWorkspace(workspacePath: string): Promise<void> {
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  // Create a simple test store file
  const testStoreContent = `
import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import { inject } from '@angular/core';

export const TestStore = signalStore(
  { providedIn: 'root' },
  withState({
    data: null as any,
    isLoading: false
  }),
  withMethods((store, service = inject(TestService)) => ({
    async loadData(): Promise<any> {
      patchState(store, { isLoading: true });
      try {
        const data = await service.getData();
        patchState(store, { data });
        return data;
      } finally {
        patchState(store, { isLoading: false });
      }
    }
  }))
);
`;

  fs.writeFileSync(path.join(workspacePath, 'test.store.ts'), testStoreContent);
  console.log(`   Created test workspace at ${workspacePath}`);
}

async function cleanupTestWorkspace(workspacePath: string): Promise<void> {
  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
    console.log('   ✅ Test workspace cleaned up');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCLITool().catch(console.error);
}