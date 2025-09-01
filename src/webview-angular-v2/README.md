# Webview Angular (Main)

This is the main Angular 20 webview for the Azure DevOps PR Dashboard extension.

## Quick Start

- Install deps: `cd src/webview-angular-v2 && npm install`
- Dev server: `npm start` (serves at `http://localhost:4200`)
- Build (dev): `npm run build`
- Build (prod): `npm run build:prod` (outputs to `src/webview-angular-v2/dist`)

## Notes

- Uses standalone Angular components with `bootstrapApplication`.
- Includes a minimal `VsCodeApiService` for postMessage wiring once integrated into the extension webview.
- Integrated with the extension build system; the build process copies `src/webview-angular-v2/dist/` into `dist/webview` for the extension to serve.

