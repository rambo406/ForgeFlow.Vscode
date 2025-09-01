/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  externals: {
    vscode: 'commonjs vscode'
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
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  devtool: 'source-map',
  plugins: [
    // Copy Angular webview build into dist
    new CopyWebpackPlugin({
      patterns: [
        // Copy webview-angular-v2 build to main webview location
        {
          from: path.resolve(__dirname, 'src/webview-angular-v2/dist'),
          to: path.resolve(__dirname, 'dist/webview'),
          noErrorOnMissing: true,
          globOptions: {
            dot: false,
            gitignore: false,
            ignore: ['**/.DS_Store']
          }
        }
      ]
    })
  ]
};
