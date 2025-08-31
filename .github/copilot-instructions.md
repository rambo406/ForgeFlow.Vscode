# Copilot Instructions

Guidelines for AI coding agents working on the Azure DevOps PR Code Reviewer VS Code extension.

## Architecture Overview

This is a dual-architecture VS Code extension:
- **Extension Host**: TypeScript services (`src/`) handle VS Code APIs, Azure DevOps integration, and AI analysis
- **Webview**: Angular application (`src/webview-angular/`) provides the dashboard UI with SpartanNG + Tailwind components

### Service Boundaries
- `ConfigurationManager`: Secure credential storage via VS Code Secret Storage API
- `AzureDevOpsClient`: REST API integration with proper error handling and rate limiting
- `CommentAnalysisEngine`: AI-powered code analysis using VS Code Language Model API
- `PRDashboardController`: Webview-extension communication via message passing

## Critical Workflows

### Build Process
```bash
# Development build (includes Angular webview)
npm run build

# Production build with optimizations
npm run compile

# Watch mode for active development
npm run watch
```

The build chain: `scripts/build.js` → Angular build → Webpack → copies webview assets to `dist/webview/`

### Testing
- Unit tests: `npm test` (runs Mocha in `src/test/suite/`)
- Integration tests: `src/test/integration/` for end-to-end workflows
- Angular tests: `cd src/webview-angular && npm test` (Jest)

## Project-Specific Patterns

### Message Passing Architecture
Webview-extension communication uses typed message contracts defined in `PRDashboardController.ts`:
```typescript
// Use MessageType enum for all webview messages
postMessage({ type: MessageType.LOAD_CONFIG, payload: data });
```

### VS Code Theming Integration
All UI components use CSS custom properties for automatic theme adaptation:
```typescript
// In Tailwind: use semantic color tokens
'bg-primary text-primary-foreground'  // Maps to VS Code button colors
'text-vscode-error'                   // Maps to VS Code error colors
```

### Secure Configuration
- Personal Access Tokens: Always use `ConfigurationManager.getPatToken()`/`setPatToken()`
- Settings: Follow `CONFIG_KEYS` constants in `ConfigurationUtils.ts`
- Never hardcode credentials or expose tokens in logs

### Error Handling Strategy
- Services throw typed errors from `AzureDevOpsModels.ts`
- UI shows user-friendly messages via `TelemetryService.trackError()`
- Network calls include retry logic and rate limiting

## Development Guidelines

### Adding New Commands
1. Register in `package.json` `contributes.commands`
2. Implement in `ExtensionCommands.ts`
3. Add keyboard shortcuts to `contributes.keybindings`
4. Update command palette visibility in `contributes.menus`

### Angular Component Development
- Use SpartanNG base components (`@spartan-ng/brain`)
- Follow Tailwind utility-first with VS Code component classes
- Test across VS Code themes (light/dark/high-contrast)
- See `docs/tailwind/` for comprehensive UI guidelines

### Service Integration
- Services are dependency-injected via constructor parameters
- Use `ConfigurationManager` for all settings access
- Implement proper disposal in `deactivate()` function
- Follow progress reporting patterns for long-running operations

### Webview Development
- Angular assets built to `dist/webview/` by webpack
- Use `libs/ui/` component library for consistent styling
- Follow message-passing patterns in `PRDashboardController.ts`
- Responsive design uses VS Code-specific breakpoints (`vscode-sm`, `vscode-md`, etc.)

## Performance Considerations

- **Bundle Analysis**: Use `npm run build:analyze` in webview directory
- **Memory Management**: Implement dispose patterns for long-lived objects
- **Caching**: Use `CacheManager.ts` for Azure DevOps API responses
- **Rate Limiting**: Respect Azure DevOps API limits via `RateLimiter.ts`

## Integration Points

- **VS Code Language Model API**: Access via `LanguageModelService.ts`
- **Azure DevOps REST API**: Authenticated requests through `AzureDevOpsClient.ts`
- **VS Code Webview API**: Message passing via `PRDashboardController.ts`
- **Secret Storage**: Secure token management via `ConfigurationManager.ts`

When modifying cross-service functionality, ensure message contracts remain backward compatible and update both extension and webview sides simultaneously.