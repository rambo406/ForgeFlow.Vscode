/**
 * Bundle analysis utilities for monitoring and optimizing build size
 */

const fs = require('fs');
const path = require('path');

/**
 * Analyze bundle sizes and provide optimization recommendations
 */
function analyzeBundles() {
  const distPath = path.join(__dirname, 'dist');
  const statsPath = path.join(distPath, 'stats.json');

  if (!fs.existsSync(statsPath)) {
    console.log('❌ stats.json not found. Run: ng build --stats-json');
    return;
  }

  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  
  console.log('📊 Bundle Analysis Report');
  console.log('==========================');
  
  // Analyze chunks
  const chunks = stats.chunks || [];
  let totalSize = 0;
  
  chunks.forEach(chunk => {
    const size = chunk.size || 0;
    totalSize += size;
    
    console.log(`📦 ${chunk.names?.[0] || chunk.id}: ${formatBytes(size)}`);
    
    if (size > 100000) { // > 100KB
      console.log(`   ⚠️  Large chunk detected - consider code splitting`);
    }
  });

  console.log(`\n📈 Total Bundle Size: ${formatBytes(totalSize)}`);
  
  // Budget analysis
  const budgets = {
    initial: { warning: 300000, error: 600000 }, // 300KB warning, 600KB error
    anyComponentStyle: { warning: 2000, error: 4000 } // 2KB warning, 4KB error
  };

  if (totalSize > budgets.initial.error) {
    console.log('🚨 Bundle exceeds error budget!');
  } else if (totalSize > budgets.initial.warning) {
    console.log('⚠️  Bundle exceeds warning budget');
  } else {
    console.log('✅ Bundle within budget limits');
  }

  // Optimization recommendations
  console.log('\n💡 Optimization Recommendations:');
  
  if (totalSize > 200000) {
    console.log('• Consider implementing more aggressive tree shaking');
    console.log('• Review dependencies for unused exports');
    console.log('• Implement dynamic imports for feature modules');
  }
  
  // Analyze modules for large dependencies
  const modules = stats.modules || [];
  const largeModules = modules
    .filter(m => m.size > 10000) // > 10KB
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  if (largeModules.length > 0) {
    console.log('\n🔍 Largest Modules:');
    largeModules.forEach(module => {
      console.log(`   ${formatBytes(module.size)} - ${module.name}`);
    });
  }
}

/**
 * Monitor bundle size over time
 */
function trackBundleSize() {
  const historyFile = path.join(__dirname, 'bundle-history.json');
  let history = [];
  
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  }

  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ Dist folder not found. Run: ng build');
    return;
  }

  const totalSize = calculateTotalSize(distPath);
  const entry = {
    timestamp: new Date().toISOString(),
    size: totalSize,
    sizeFormatted: formatBytes(totalSize)
  };

  history.push(entry);
  
  // Keep only last 20 entries
  if (history.length > 20) {
    history = history.slice(-20);
  }

  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  
  console.log(`📊 Bundle size tracked: ${formatBytes(totalSize)}`);
  
  // Show trend
  if (history.length > 1) {
    const previous = history[history.length - 2];
    const change = totalSize - previous.size;
    const changePercent = ((change / previous.size) * 100).toFixed(1);
    
    if (change > 0) {
      console.log(`📈 Size increased by ${formatBytes(change)} (${changePercent}%)`);
    } else if (change < 0) {
      console.log(`📉 Size decreased by ${formatBytes(Math.abs(change))} (${Math.abs(parseFloat(changePercent))}%)`);
    } else {
      console.log('➡️  No size change');
    }
  }
}

/**
 * Calculate total size of dist folder
 */
function calculateTotalSize(dirPath) {
  let totalSize = 0;
  
  function getSize(itemPath) {
    const stats = fs.statSync(itemPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        getSize(path.join(itemPath, item));
      });
    }
  }
  
  getSize(dirPath);
  return totalSize;
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main execution
 */
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      analyzeBundles();
      break;
    case 'track':
      trackBundleSize();
      break;
    default:
      console.log('Usage:');
      console.log('  node bundle-analysis.js analyze  - Analyze current bundle');
      console.log('  node bundle-analysis.js track    - Track bundle size over time');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundles,
  trackBundleSize,
  formatBytes
};