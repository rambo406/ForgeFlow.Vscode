#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔄 Starting ForgeFlow development environment...');

const rootDir = path.resolve(__dirname, '..');
const webviewDir = path.resolve(rootDir, 'src/webview-angular');

// Helper function to spawn a process
function spawnProcess(command, args, cwd, name, color = '\x1b[36m') {
  const child = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: true
  });
  
  // Color code output
  const colorReset = '\x1b[0m';
  
  child.stdout.on('data', (data) => {
    process.stdout.write(`${color}[${name}]${colorReset} ${data}`);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(`${color}[${name}]${colorReset} ${data}`);
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`${color}[${name}]${colorReset} Process exited with code ${code}`);
    } else {
      console.log(`${color}[${name}]${colorReset} Process completed successfully`);
    }
  });
  
  child.on('error', (error) => {
    console.error(`${color}[${name}]${colorReset} Error:`, error.message);
  });
  
  return child;
}

// Initial build
console.log('📦 Running initial build...');
const { execSync } = require('child_process');

try {
  execSync('node scripts/build.js development', { 
    cwd: rootDir, 
    stdio: 'inherit' 
  });
  console.log('✅ Initial build completed');
} catch (error) {
  console.error('❌ Initial build failed:', error.message);
  process.exit(1);
}

console.log('\n🔄 Starting watch processes...');

// Start Angular watch process
const angularWatch = spawnProcess(
  'npm', 
  ['run', 'watch'], 
  webviewDir, 
  'Angular', 
  '\x1b[32m' // Green
);

// Start extension watch process
const extensionWatch = spawnProcess(
  'webpack', 
  ['--mode', 'development', '--watch'], 
  rootDir, 
  'Extension', 
  '\x1b[34m' // Blue
);

// Handle process termination
function cleanup() {
  console.log('\n🛑 Shutting down development environment...');
  angularWatch.kill();
  extensionWatch.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

console.log('\n💡 Development environment is running!');
console.log('   - Angular webview: Building and watching for changes');
console.log('   - VS Code extension: Building and watching for changes');
console.log('   - Press Ctrl+C to stop');
console.log('\n🔍 To debug:');
console.log('   1. Press F5 in VS Code to launch Extension Development Host');
console.log('   2. Open Command Palette (Ctrl+Shift+P)');
console.log('   3. Run "Azure DevOps PR Reviewer: Open Dashboard"');
console.log('   4. Changes to Angular code will auto-rebuild');
console.log('   5. Reload the Extension Development Host to see changes');

// Keep the main process alive
setInterval(() => {
  // Check if child processes are still running
  if (angularWatch.killed && extensionWatch.killed) {
    console.log('⚠️ All watch processes have stopped');
    process.exit(1);
  }
}, 5000);