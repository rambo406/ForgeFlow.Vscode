# Webview Angular (Main) - Zoneless

This is the main Angular 20 webview for the Azure DevOps PR Dashboard extension, now running in **zoneless mode**.

## Angular 20 Zoneless Configuration

This project has been updated to use Angular 20 with zoneless change detection:

- **Zone.js removed**: No zone.js dependency or polyfills
- **Zoneless change detection**: Uses `provideZonelessChangeDetection()`
- **Signal-based reactivity**: Components use Angular signals for optimal performance
- **Modern Angular**: Latest Angular 20.2.x packages

## Quick Start

- Install deps: `cd src/webview-angular-v2 && npm install`
- Dev server: `npm start` (serves at `http://localhost:4200`)
- Build (dev): `npm run build`
- Build (prod): `npm run build:prod` (outputs to `src/webview-angular-v2/dist`)

## Key Changes Made

1. Updated all Angular packages to 20.2.x
2. Removed zone.js dependency completely
3. Added `provideZonelessChangeDetection()` to app configuration
4. Updated components to use signals for reactive state management
5. Cleaned up build configuration and removed deprecated settings

## Notes

- Uses standalone Angular components with `bootstrapApplication`
- Includes a minimal `VsCodeApiService` for postMessage wiring once integrated into the extension webview
- Integrated with the extension build system; the build process copies `src/webview-angular-v2/dist/` into `dist/webview` for the extension to serve
- **Zoneless**: No zone.js patching - uses Angular's new zoneless change detection system for better performance

