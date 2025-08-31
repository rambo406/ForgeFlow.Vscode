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
    console.error('Angular webview build failed:', error.message);
    throw error;
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