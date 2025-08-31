# Technology Stack

## Core Technologies
- **TypeScript**: Primary language (ES2020 target)
- **Node.js**: Runtime environment (v18+)
- **VS Code Extension API**: Core platform integration
- **Webpack**: Module bundling and build system
- **Angular**: Frontend framework for webview components

## Key Dependencies
- **axios**: HTTP client for Azure DevOps API calls
- **vscode**: VS Code extension API
- **copy-webpack-plugin**: Asset copying during build

## Development Tools
- **ESLint**: Code linting with TypeScript support
- **Mocha**: Testing framework
- **ts-loader**: TypeScript compilation in webpack
- **rimraf**: Cross-platform file/directory cleanup

## Build System
The project uses a custom build system with webpack and npm scripts:

### Common Commands
```bash
# Development build with watch mode
npm run watch
npm run dev

# Production build
npm run build:prod
npm run compile

# Testing
npm test
npm run pretest  # builds and lints before testing

# Linting
npm run lint

# Package for distribution
npm run package

# Clean builds
npm run clean
npm run clean:all
```

### Build Process
1. **Webview Build**: Angular application is built first (src/webview-angular)
2. **Extension Build**: TypeScript compiled via webpack
3. **Asset Copying**: Webview assets copied to dist/webview
4. **Bundle Creation**: Single extension.js bundle created

## Configuration Files
- **tsconfig.json**: TypeScript compiler configuration (ES2020, CommonJS)
- **webpack.config.js**: Build configuration with Angular integration
- **.eslintrc.js**: Linting rules for TypeScript
- **package.json**: Dependencies and npm scripts

## VS Code Integration
- **Language Model API**: For AI-powered code analysis
- **Secret Storage**: Secure token storage
- **Webview API**: Interactive UI components
- **Command Palette**: Extension commands and shortcuts

## Performance Considerations
- Source maps enabled in development, optimized in production
- Bundle size monitoring (max 1MB)
- Lazy loading for webview components
- Request throttling and caching for API calls