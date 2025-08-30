import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WebviewLifecycleService } from './core/services/webview-lifecycle.service';
import { ThemeService } from './core/services/theme.service';
import { CommentPreviewComponent } from './features/comment-preview/components/comment-preview.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CommentPreviewComponent],
  template: `
    <div class="app-container vscode-font" [attr.data-webview-state]="webviewState">
      @if (webviewService.isReady()) {
        <div class="webview-content">
          <!-- Comment Preview as default view for now -->
          <app-comment-preview />
        </div>
      } @else if (webviewService.hasError()) {
        <!-- Error State -->
        <div class="error-state">
          <div class="error-content">
            <div class="error-icon">⚠️</div>
            <h2>Webview Integration Error</h2>
            <p>Failed to connect to VS Code extension host.</p>
            <button class="retry-button" (click)="retryConnection()">
              Retry Connection
            </button>
          </div>
        </div>
      } @else {
        <!-- Loading State -->
        <div class="loading-state">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <h2>Initializing Webview</h2>
            <p>Connecting to VS Code extension host...</p>
          </div>
        </div>
      }
      
      <!-- Theme indicator for development -->
      @if (isDevelopment) {
        <div class="theme-indicator">
          Theme: {{ themeService.currentTheme() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--color-background, #1e1e1e);
      color: var(--color-foreground, #cccccc);
      font-family: var(--vscode-font-family, 'Segoe UI', Arial, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      overflow: hidden;
    }
    
    .webview-content {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    
    .loading-state,
    .error-state {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-background, #1e1e1e);
    }
    
    .loading-content,
    .error-content {
      text-align: center;
      max-width: 400px;
      padding: 40px 20px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border, #3c3c3c);
      border-top: 3px solid var(--color-primary, #0e639c);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    
    .loading-content h2,
    .error-content h2 {
      color: var(--color-foreground, #cccccc);
      margin-bottom: 12px;
      font-size: 20px;
      font-weight: 600;
    }
    
    .loading-content p,
    .error-content p {
      color: var(--color-muted, #999999);
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .retry-button {
      padding: 8px 16px;
      background-color: var(--color-primary, #0e639c);
      color: var(--color-primary-foreground, #ffffff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }
    
    .retry-button:hover {
      background-color: var(--color-primary-hover, #1177bb);
    }
    
    .retry-button:active {
      transform: translateY(1px);
    }
    
    .theme-indicator {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background-color: var(--color-surface, #252526);
      border: 1px solid var(--color-border, #3c3c3c);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      color: var(--color-muted, #999999);
      z-index: 1000;
    }
    
    /* VS Code theme integration */
    [data-webview-state="ready"] {
      background-color: var(--vscode-editor-background, #1e1e1e);
    }
    
    [data-webview-state="loading"] {
      background-color: var(--vscode-panel-background, #252526);
    }
    
    [data-webview-state="error"] {
      background-color: var(--vscode-panel-background, #252526);
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  protected webviewService = inject(WebviewLifecycleService);
  protected themeService = inject(ThemeService);

  protected get webviewState(): string {
    if (this.webviewService.hasError()) return 'error';
    if (this.webviewService.isReady()) return 'ready';
    return 'loading';
  }

  protected get isDevelopment(): boolean {
    return !this.webviewService.isIntegrated();
  }

  ngOnInit(): void {
    console.log('AppComponent initialized');
  }

  ngOnDestroy(): void {
    // Cleanup handled by webview lifecycle service
  }

  protected retryConnection(): void {
    window.location.reload();
  }
}