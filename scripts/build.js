#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const mode = process.argv[2] || 'development';
const isProduction = mode === 'production';

console.log(`🚀 Building ForgeFlow VS Code Extension (${mode} mode)`);

// Helper function to run commands
function runCommand(command, cwd = process.cwd(), description) {
  console.log(`\n📦 ${description}`);
  console.log(`   Command: ${command}`);
  console.log(`   Directory: ${cwd}`);
  
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: mode }
    });
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

// Helper function to check if directory exists
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper function to remove a directory reliably without external binaries
function removeDirectory(dirPath, description) {
  try {
    if (fs.existsSync(dirPath)) {
      console.log(`\n🧹 Removing: ${dirPath}`);
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ ${description} removed`);
    } else {
      console.log(`ℹ️ ${description} not present, skipping`);
    }
  } catch (err) {
    console.error(`❌ Failed to remove ${dirPath}:`, err.message);
    process.exit(1);
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const webviewDir = path.resolve(rootDir, 'src/webview-angular');
  const distDir = path.resolve(rootDir, 'dist');
  
  console.log(`\n📁 Project structure:`);
  console.log(`   Root: ${rootDir}`);
  console.log(`   Webview: ${webviewDir}`);
  console.log(`   Output: ${distDir}`);
  
  // 1. Clean previous builds if production
  if (isProduction) {
    console.log('\n🧹 Cleaning previous builds...');
    if (fs.existsSync(distDir)) {
      removeDirectory(distDir, 'Cleaning extension dist folder');
    }
    if (fs.existsSync(path.resolve(webviewDir, 'dist'))) {
      removeDirectory(path.resolve(webviewDir, 'dist'), 'Cleaning webview dist folder');
    }
  }
  
  // 2. Ensure webview dependencies are installed
  console.log('\n📋 Checking webview dependencies...');
  const webviewNodeModules = path.resolve(webviewDir, 'node_modules');
  if (!fs.existsSync(webviewNodeModules)) {
    runCommand('npm install', webviewDir, 'Installing webview dependencies');
  } else {
    console.log('✅ Webview dependencies already installed');
  }

  // Ensure root dependencies are installed (needed for webpack etc.)
  const rootNodeModules = path.resolve(rootDir, 'node_modules');
  if (!fs.existsSync(rootNodeModules)) {
    // Install devDependencies as well because build tooling (webpack) is in devDependencies
    runCommand('npm install --include=dev', rootDir, 'Installing root dependencies (including dev)');
  } else {
    console.log('✅ Root dependencies already installed');
  }
  
  // 3. Build Angular webview
  const angularBuildCmd = isProduction ? 'npm run build:prod' : 'npm run build';
  runCommand(angularBuildCmd, webviewDir, `Building Angular webview (${mode})`);
  
  // 4. Verify webview build output
  const webviewDistDir = path.resolve(webviewDir, 'dist');
  if (!fs.existsSync(webviewDistDir)) {
    console.error('❌ Angular webview build failed - no dist folder found');
    process.exit(1);
  }
  
  const indexHtml = path.resolve(webviewDistDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error('❌ Angular webview build failed - no index.html found');
    process.exit(1);
  }
  
  console.log('✅ Angular webview build verification passed');
  
  // 5. Ensure extension dist directory exists
  ensureDirectory(distDir);
  
  // 6. Build extension (webpack will copy webview assets)
  const localWebpack = path.resolve(rootDir, 'node_modules', '.bin', 'webpack');
  const extensionBuildCmd = isProduction ? `${localWebpack} --mode production` : `${localWebpack} --mode development`;
  runCommand(extensionBuildCmd, rootDir, `Building VS Code extension (${mode})`);
  
  // 7. Verify final build output
  const extensionJs = path.resolve(distDir, 'extension.js');
  const webviewAssets = path.resolve(distDir, 'webview');
  
  if (!fs.existsSync(extensionJs)) {
    console.error('❌ Extension build failed - no extension.js found');
    process.exit(1);
  }
  
  if (!fs.existsSync(webviewAssets)) {
    console.error('❌ Extension build failed - webview assets not copied');
    process.exit(1);
  }
  
  // 8. Display build summary
  console.log('\n🎉 Build completed successfully!');
  console.log('\n📊 Build Summary:');
  
  // Get file sizes
  const extensionSize = (fs.statSync(extensionJs).size / 1024).toFixed(2);
  
  console.log(`   📄 Extension bundle: ${extensionSize} KB`);
  
  // List webview assets
  const webviewFiles = fs.readdirSync(webviewAssets);
  console.log(`   🌐 Webview assets: ${webviewFiles.length} files`);
  webviewFiles.forEach(file => {
    const filePath = path.resolve(webviewAssets, file);
    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
    console.log(`      - ${file}: ${fileSize} KB`);
  });
  
  // Performance recommendations
  if (isProduction) {
    console.log('\n💡 Production Build Notes:');
    console.log('   - Source maps disabled for smaller bundle size');
    console.log('   - Angular optimizations enabled');
    console.log('   - Extension ready for packaging with `npm run package`');
  } else {
    console.log('\n💡 Development Build Notes:');
    console.log('   - Source maps enabled for debugging');
    console.log('   - Use `npm run watch` for development with auto-rebuild');
  }
  
  console.log('\n🚀 Build process completed successfully!');
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Unexpected error during build:', error.message);
  process.exit(1);
});

// Run the build
main().catch((error) => {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
});