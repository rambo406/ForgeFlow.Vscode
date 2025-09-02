import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';
import { LanguageModelService } from '../services/LanguageModelService';
import { SettingsValidationService } from '../services/SettingsValidationService';
import { DashboardView, MessageType, WebviewMessage } from './Messages';
import { HandlerContext, MessageHandler } from './handlers/MessageHandler';
import { ConfigHandler } from './handlers/ConfigHandler';
import { PRDataHandler } from './handlers/PRDataHandler';
import { AIAnalysisHandler } from './handlers/AIAnalysisHandler';
import { CommentsHandler } from './handlers/CommentsHandler';
import { SettingsHandler } from './handlers/SettingsHandler';
import { NavigationHandler } from './handlers/NavigationHandler';

export class DashboardController {
    private panel: vscode.WebviewPanel | undefined;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly languageModelService: LanguageModelService;
    private readonly settingsValidationService: SettingsValidationService;
    private readonly handlers: MessageHandler[];
    private readonly ctx: HandlerContext;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configurationManager: ConfigurationManager,
        private azureDevOpsClient: AzureDevOpsClient | undefined
    ) {
        this.languageModelService = new LanguageModelService();
        this.settingsValidationService = new SettingsValidationService(this.languageModelService);

        this.ctx = new HandlerContext(
            this.context,
            this.configurationManager,
            this.azureDevOpsClient,
            this.languageModelService,
            this.settingsValidationService,
            (msg: WebviewMessage) => this.sendMessage(msg)
        );

        this.handlers = [
            new ConfigHandler(),
            new PRDataHandler(),
            new AIAnalysisHandler(),
            new CommentsHandler(),
            new SettingsHandler(),
            new NavigationHandler()
        ];
    }

    public async createOrShow(initialRoute?: string): Promise<void> {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (this.panel) {
            this.panel.reveal(column);
            return;
        }
        this.panel = vscode.window.createWebviewPanel(
            'prDashboard',
            'Azure DevOps PR Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview'))]
            }
        );
        this.ctx.panel = this.panel;

        this.panel.webview.html = this.getWebviewContent();
        this.setupMessageHandling();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        if (initialRoute) {
            try {
                setTimeout(() => {
                    this.sendMessage({ type: MessageType.NAVIGATE, payload: { path: `/${initialRoute}` } });
                }, 50);
            } catch { /* noop */ }
        }
    }

    public dispose(): void {
        if (this.ctx.currentAnalysis) {
            this.ctx.currentAnalysis.cancellationTokenSource.cancel();
            this.ctx.currentAnalysis = undefined;
        }
        this.settingsValidationService.dispose();
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) { x.dispose(); }
        }
    }

    private setupMessageHandling(): void {
        if (!this.panel) { return; }
        this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            try {
                // eslint-disable-next-line no-console
                console.log('[Dashboard] Received message', { type: message?.type, requestId: message?.requestId });
                await this.handleMessage(message);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error handling webview message:', error);
                this.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'An error occurred processing your request' }, requestId: message.requestId });
            }
        }, null, this.disposables);
    }

    private async handleMessage(message: WebviewMessage): Promise<void> {
        const handler = this.handlers.find(h => h.canHandle(message.type));
        if (handler) {
            await handler.handle(message, this.ctx);
        } else {
            // eslint-disable-next-line no-console
            console.warn('Unknown message type:', message.type);
        }
    }

    private sendMessage(message: WebviewMessage): void {
        if (this.panel) {
            try {
                // eslint-disable-next-line no-console
                console.log('[Dashboard] Sending message to webview', { type: message?.type, requestId: message?.requestId });
            } catch { /* noop */ }
            this.panel.webview.postMessage(message);
        }
    }

    // Copied and adapted from legacy controller: serves Angular v3 from dist/webview
    private getWebviewContent(): string {
        if (!this.panel) {
            throw new Error('Webview panel not initialized');
        }
        const webviewPath = path.join(this.context.extensionPath, 'dist', 'webview');
        const resolveIfExists = (fileName: string): vscode.Uri | undefined => {
            const fullPath = path.join(webviewPath, fileName);
            try {
                if (fs.existsSync(fullPath)) {
                    return this.panel!.webview.asWebviewUri(vscode.Uri.file(fullPath));
                }
            } catch { /* ignore */ }
            return undefined;
        };
        const runtimeJsUri = resolveIfExists('runtime.js');
        const polyfillsJsUri = resolveIfExists('polyfills.js');
        const mainJsUri = resolveIfExists('main.js');
        const vendorJsUri = resolveIfExists('vendor.js');
        const stylesUri = resolveIfExists('styles.css');
        const nonce = this.generateNonce();

        let isFallback = false;
        try {
            isFallback = !runtimeJsUri && !!mainJsUri && fs.readFileSync(path.join(webviewPath, 'main.js'), 'utf8').includes('Fallback webview bundle');
        } catch {
            isFallback = !runtimeJsUri && !!mainJsUri;
        }
        if (isFallback) {
            // eslint-disable-next-line no-console
            console.warn('[Dashboard] Angular webview build failed; using fallback bundle.');
            const missingFiles: string[] = [];
            if (!runtimeJsUri) { missingFiles.push('runtime.js'); }
            if (!vendorJsUri) { missingFiles.push('vendor.js'); }
            if (!stylesUri) { missingFiles.push('styles.css'); }
            const missingListHtml = missingFiles.length ? `<ul>${missingFiles.map(f => `<li>${f}</li>`).join('')}</ul>` : '<p>Build produced an incomplete bundle.</p>';
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure DevOps PR Dashboard - Build Missing</title>
    <style>body { font-family: var(--vscode-font-family, 'Segoe UI'); margin: 24px; color: var(--vscode-foreground); } code { background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px; }</style>
    </head>
<body>
    <h1>Failed to load dashboard</h1>
    <p>The Angular webview bundle appears to be a fallback placeholder instead of a real build. The extension could not find the full set of webview build artifacts required to boot the Angular application.</p>
    <p>Missing or placeholder build files:</p>
    ${missingListHtml}
    <p>Please rebuild the webview and make sure the compiled files are copied to the extension <code>dist/webview</code> folder. For development, run the webview build (see the repo README or the webview-angular-v3 package).</p>
</body>
</html>`;
        }

        // Normal webview HTML (Angular app). Keep a small bootstrap with CSP.
        const cspSource = this.panel.webview.cspSource;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; script-src 'nonce-${nonce}'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; connect-src ${cspSource} https: http:; frame-src ${cspSource} https:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure DevOps PR Dashboard</title>
  ${stylesUri ? `<link rel="stylesheet" href="${stylesUri}">` : ''}
</head>
<body>
  <app-root>Loading PR Dashboard...</app-root>
  <script nonce="${nonce}">
    // Predefine Angular dev flags to avoid ReferenceError in dev builds
    (function(g){
      try {
        if (typeof g.ngDevMode === 'undefined') { g.ngDevMode = false; }
        if (typeof g.ngJitMode === 'undefined') { g.ngJitMode = false; }
        if (typeof g.ngI18nClosureMode === 'undefined') { g.ngI18nClosureMode = false; }
      } catch (e) { /* noop */ }
    })(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}));
  </script>
  ${runtimeJsUri ? `<script nonce="${nonce}" src="${runtimeJsUri}"></script>` : ''}
  ${polyfillsJsUri ? `<script nonce="${nonce}" src="${polyfillsJsUri}"></script>` : ''}
  ${vendorJsUri ? `<script nonce="${nonce}" src="${vendorJsUri}"></script>` : ''}
  ${mainJsUri ? `<script nonce="${nonce}" src="${mainJsUri}"></script>` : ''}
  <script nonce="${nonce}">
    try { window.vscode = acquireVsCodeApi && acquireVsCodeApi(); } catch (e) { console.warn('acquireVsCodeApi unavailable', e); }
  </script>
</body>
</html>`;
    }

    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
