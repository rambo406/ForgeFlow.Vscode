import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-container vscode-font">
      <header class="app-header vscode-bg-surface vscode-border">
        <div class="header-content">
          <h1 class="app-title">
            <span class="codicon codicon-git-pull-request"></span>
            Azure DevOps PR Code Reviewer
          </h1>
          <div class="header-actions">
            <button class="btn-vscode-secondary">
              <span class="codicon codicon-gear"></span>
              Settings
            </button>
          </div>
        </div>
      </header>
      
      <main class="app-main">
        <div class="main-content">
          <!-- Router outlet will go here when we add routing -->
          <div class="welcome-message">
            <h2>Welcome to Angular 20 Webview</h2>
            <p>This is the new Angular-based interface for the Azure DevOps PR Code Reviewer.</p>
            <p>Framework setup is complete!</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--color-background);
      color: var(--color-foreground);
    }
    
    .app-header {
      border-bottom: 1px solid;
      padding: 12px 16px;
      background-color: var(--color-surface);
    }
    
    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 100%;
    }
    
    .app-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
    }
    
    .app-main {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }
    
    .main-content {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .welcome-message {
      text-align: center;
      padding: 40px 20px;
    }
    
    .welcome-message h2 {
      color: var(--color-primary);
      margin-bottom: 16px;
    }
    
    .welcome-message p {
      color: var(--color-muted);
      margin-bottom: 8px;
    }
  `]
})
export class AppComponent {
  title = 'azdo-pr-reviewer-webview';
}