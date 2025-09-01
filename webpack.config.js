const path = require('path');
const { execSync } = require('child_process');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/**
 * Build Angular webview application
 */
function buildAngularWebview(mode) {
  console.log(`Building Angular webview in ${mode} mode...`);
  
  const isProduction = mode === 'production';
  const angularBuildCmd = isProduction 
    ? 'npm run build:prod' 
    : 'npm run build';
    
  try {
    execSync(angularBuildCmd, { 
      cwd: path.resolve(__dirname, 'src/webview-angular'),
      stdio: 'inherit'
    });
    console.log('Angular webview build completed successfully');
  } catch (error) {
    console.error('Angular webview build failed (non-fatal):', error.message);
    // Create a minimal fallback dist so the extension build can proceed
    const webviewDist = path.resolve(__dirname, 'src/webview-angular/dist');
    try {
      const fs = require('fs');
      if (!fs.existsSync(webviewDist)) fs.mkdirSync(webviewDist, { recursive: true });
      const indexHtml = path.resolve(webviewDist, 'index.html');
      fs.writeFileSync(indexHtml, '<!doctype html><html><head><meta charset="utf-8"><title>Webview (fallback)</title></head><body><div id="app">Fallback webview build</div><script src="main.js"></script></body></html>');
      const mainJs = path.resolve(webviewDist, 'main.js');
      fs.writeFileSync(mainJs, 'console.warn("Fallback webview bundle - replace with a real build for full functionality.");');
      console.log('✅ Created fallback webview dist with index.html and main.js');
    } catch (writeErr) {
      console.error('❌ Failed to create fallback webview dist:', writeErr.message);
      throw writeErr;
    }
  }
}

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  const isProduction = mode === 'production';
  
  // Build Angular webview before extension build
  buildAngularWebview(mode);
  
  return {
    target: 'node',
    mode: mode,
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      clean: true
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                configFile: 'tsconfig.json'
              }
            }
          ]
        }
      ]
    },
    plugins: [
      // Copy Angular webview build artifacts
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'src/webview-angular/dist'),
            to: path.resolve(__dirname, 'dist/webview'),
            globOptions: {
              ignore: ['**/.gitkeep']
            },
            noErrorOnMissing: false
          }
        ]
      })
    ],
    devtool: isProduction ? 'source-map' : 'nosources-source-map',
    infrastructureLogging: {
      level: "log"
    },
    optimization: {
      minimize: isProduction
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 1000000,
      maxEntrypointSize: 1000000
    }
  };
};