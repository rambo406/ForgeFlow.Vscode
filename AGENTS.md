# Repository Guidelines

## Project Structure & Module Organization
- Root extension code: `src/` (entry: `src/extension.ts`)
- Core modules: `src/commands/`, `src/services/`, `src/utils/`, `src/controllers/`
- Tests: `src/test/suite/` (unit) and `src/test/integration/`
- Webview (Angular 20): `src/webview-angular/` with its own `package.json`
- Build outputs: `dist/` (extension bundle), `src/webview-angular/dist/` (webview)

## Build, Test, and Development Commands
- Build (dev): `npm run build` — builds webview then bundles the extension via webpack.
- Build (prod): `npm run build:prod` or `npm run compile` — optimized bundles.
- Lint: `npm run lint` — ESLint over `src/` TypeScript files.
- Tests (extension): `npm test` — runs Mocha via `@vscode/test-electron`.
- Webview build: `npm run build:webview` (or `install:webview` then `build:webview:dev`).
- Package VSIX: `npm run package` — requires `vsce` (installed via devDependencies).

## Coding Style & Naming Conventions
- Language: TypeScript (target `ES2020`, strict mode). Indentation: 4 spaces; semicolons required.
- ESLint: root `.eslintrc.js` with `@typescript-eslint` (e.g., `eqeqeq`, `curly`, avoid `any`).
- Naming: PascalCase for classes/files in services/utils (e.g., `ConfigurationManager.ts`), camelCase for functions/variables, UPPER_SNAKE_CASE for constants. Entry file: `extension.ts`.

## Testing Guidelines
- Frameworks: Mocha for extension (`src/test/**/**.test.ts`), Jest for webview (`*.spec.ts` under `src/webview-angular/src/`).
- Run extension tests: `npm test`. Run webview tests: `cd src/webview-angular && npm test`.
- Add tests for new logic and error paths; prefer fast, deterministic tests. No strict coverage threshold enforced, but cover critical paths.

## Commit & Pull Request Guidelines
- Commits: Conventional format — `feat: ...`, `fix: ...`, `refactor: ...`, optional scope (e.g., `feat(dashboard): ...`).
- PRs: Include summary, rationale, linked issues (`Fixes #123`), screenshots/GIFs for UI changes, and notes on perf/telemetry when relevant. Ensure `npm run lint` and `npm test` pass and webview builds locally.

## Security & Configuration Tips
- PAT storage: use VS Code Secret Storage (handled by `ConfigurationManager`).
- Key settings (in VS Code Settings): `azdo-pr-reviewer.organizationUrl`, `defaultProject`, `selectedModel`, `customInstructions`, `batchSize`, `enableTelemetry`.
- Do not commit secrets; prefer local settings and environment isolation.
