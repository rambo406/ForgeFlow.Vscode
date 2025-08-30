import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

/**
 * Global error handler for the application
 */
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Global error:', error);
    
    // In a webview, we might want to send errors to the extension host
    const vscodeApi = (globalThis as any).acquireVsCodeApi;
    if (typeof vscodeApi !== 'undefined') {
      try {
        const vscode = (globalThis as any).acquireVsCodeApi();
        vscode.postMessage({
          type: 'error',
          payload: {
            message: error?.message || 'Unknown error',
            stack: error?.stack || '',
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        // Fallback if VS Code API is not available
        console.error('Failed to send error to VS Code:', e);
      }
    }
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserAnimationsModule),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};