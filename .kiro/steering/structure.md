# Project Structure

## Root Directory
```
├── src/                    # Source code
├── dist/                   # Build output (webpack bundle + webview assets)
├── out/                    # TypeScript compilation output
├── scripts/                # Build and development scripts
├── images/                 # Extension assets and documentation images
├── .kiro/                  # Kiro AI assistant configuration
├── .github/                # GitHub workflows and templates
├── node_modules/           # Dependencies
└── *.json, *.js, *.md     # Configuration and documentation files
```

## Source Code Organization (`src/`)

### Core Architecture
- **extension.ts**: Main entry point, handles activation/deactivation
- **commands/**: Command implementations and registration
- **services/**: Core business logic and external integrations
- **models/**: Data models and TypeScript interfaces
- **controllers/**: UI controllers and orchestration logic
- **utils/**: Shared utilities and helper functions
- **webview/**: Legacy webview components (HTML/CSS/JS)
- **webview-angular/**: Modern Angular-based webview components
- **test/**: Test suites (unit and integration)

### Service Layer (`src/services/`)
- **ConfigurationManager.ts**: Extension settings and configuration
- **AzureDevOpsClient.ts**: Azure DevOps API integration
- **LanguageModelService.ts**: VS Code Language Model API wrapper
- **CommentAnalysisEngine.ts**: AI-powered code analysis logic
- **CommentManager.ts**: Comment lifecycle management
- **CommentPreviewProvider.ts**: Webview provider for comment preview
- **SettingsValidationService.ts**: Configuration validation

### Utility Layer (`src/utils/`)
- **TelemetryService.ts**: Usage analytics and error tracking
- **CacheManager.ts**: Request caching and performance optimization
- **RateLimiter.ts**: API request throttling
- **ProgressManager.ts**: Long-running operation progress tracking
- **ErrorHandler.ts**: Centralized error handling and logging
- **MemoryManager.ts**: Memory usage optimization
- **PerformanceConfig.ts**: Performance tuning configuration

## Build Artifacts
- **dist/extension.js**: Main extension bundle (webpack output)
- **dist/webview/**: Angular webview application assets
- **dist/webview-legacy/**: Legacy webview assets (if present)

## Configuration Files
- **package.json**: Extension manifest, dependencies, VS Code contributions
- **tsconfig.json**: TypeScript compiler configuration
- **webpack.config.js**: Build system configuration
- **.eslintrc.js**: Code linting rules
- **CHANGELOG.md**: Version history and release notes
- **README.md**: User documentation and setup guide
- **CONTRIBUTING.md**: Development guidelines
- **SECURITY.md**: Security policies and reporting

## Naming Conventions
- **Files**: PascalCase for classes (e.g., `ConfigurationManager.ts`)
- **Directories**: lowercase with hyphens (e.g., `webview-angular/`)
- **Commands**: kebab-case with extension prefix (e.g., `azdo-pr-reviewer.configure`)
- **Configuration**: camelCase (e.g., `organizationUrl`)

## Development Workflow
1. **Source changes**: Edit files in `src/`
2. **Build**: Run `npm run watch` for development or `npm run build:prod` for production
3. **Test**: Use `npm test` to run test suites
4. **Debug**: Use VS Code's extension development host (F5)
5. **Package**: Use `npm run package` to create .vsix file

## Key Architectural Patterns
- **Service-oriented**: Core functionality separated into focused services
- **Command pattern**: VS Code commands handled through dedicated command classes
- **Provider pattern**: Webview providers for UI components
- **Dependency injection**: Services injected through constructors
- **Event-driven**: VS Code extension lifecycle and user interactions