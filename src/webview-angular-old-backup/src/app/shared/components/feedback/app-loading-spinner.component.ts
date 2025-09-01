import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses()">
      @if (type === 'spinner') {
        <div class="spinner" [class]="spinnerClasses()">
          <div class="spinner-circle"></div>
        </div>
      } @else if (type === 'dots') {
        <div class="dots-container">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      } @else if (type === 'pulse') {
        <div class="pulse-container">
          <div class="pulse-circle"></div>
        </div>
      } @else if (type === 'progress') {
        <div class="progress-container">
          <div class="progress-bar" [style.width.%]="progress"></div>
        </div>
      }
      
      @if (message) {
        <div class="loading-message" [class]="messageClasses()">
          {{ message }}
        </div>
      }
      
      @if (showProgress && type === 'progress') {
        <div class="progress-text">{{ progress }}%</div>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .loading-container.inline {
      flex-direction: row;
      gap: 0.5rem;
    }

    .loading-container.overlay {
      position: fixed;
      inset: 0;
      background: var(--vscode-editor-background, rgba(0,0,0,0.6));
      z-index: 50;
      backdrop-filter: blur(6px);
    }

    .loading-container.card {
      background: var(--vscode-panel-background, #fff);
      border: 1px solid var(--vscode-panel-border, rgba(0,0,0,0.08));
      border-radius: 0.5rem;
      padding: 1.5rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    /* Spinner Animation */
    .spinner {
      position: relative;
    }

    .spinner-circle {
      border: 2px solid rgba(128,128,128,0.2);
      border-top-color: var(--vscode-terminal-ansiBlue, #3b82f6);
      border-radius: 9999px;
      animation: spin 1s linear infinite;
    }

    .spinner.small .spinner-circle { width: 1rem; height: 1rem; }
    .spinner.medium .spinner-circle { width: 1.5rem; height: 1.5rem; }
    .spinner.large .spinner-circle { width: 2rem; height: 2rem; }
    .spinner.extra-large .spinner-circle { width: 3rem; height: 3rem; border-width: 4px; }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Dots Animation */
    .dots-container { display: flex; gap: 0.25rem; }

    .dot {
      width: 0.5rem;
      height: 0.5rem;
      background: var(--vscode-button-background, #0ea5e9);
      border-radius: 9999px;
      animation: dotPulse 1.4s ease-in-out infinite both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    .dot:nth-child(3) { animation-delay: 0s; }

    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* Pulse Animation */
    .pulse-container { position: relative; }

    .pulse-circle {
      width: 2rem;
      height: 2rem;
      background: var(--vscode-button-background, #0ea5e9);
      border-radius: 9999px;
      animation: pulse 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14,165,233,0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(14,165,233,0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14,165,233,0); }
    }

    /* Progress Bar */
    .progress-container { width: 100%; max-width: 20rem; background: var(--vscode-editorGroupHeader-tabsBackground, #f3f4f6); border-radius: 9999px; height: 0.5rem; overflow: hidden; }

    .progress-bar { height: 100%; background: linear-gradient(90deg, var(--vscode-terminal-ansiBlue, #3b82f6) 0%, var(--vscode-terminal-ansiBlue, #3b82f6) 100%); transition: width 300ms ease-out; }

    .progress-text { font-size: 0.875rem; font-weight: 500; color: var(--vscode-descriptionForeground, #6b7280); }

    /* Message Styles */
    .loading-message { font-size: 0.875rem; color: var(--vscode-descriptionForeground, #6b7280); text-align: center; }
    .loading-message.small { font-size: 0.75rem; }
    .loading-message.medium { font-size: 0.875rem; }
    .loading-message.large { font-size: 1rem; }
    .loading-message.extra-large { font-size: 1.125rem; font-weight: 600; }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .loading-container.overlay { padding: 1rem; }
      .loading-container.card { padding: 1rem; }
      .progress-container { max-width: 100%; }
    }

    /* Theme specific adjustments (fallbacks) */
    .loading-container.primary .spinner-circle { border-top-color: var(--vscode-terminal-ansiBlue, #3b82f6); }
    .loading-container.secondary .spinner-circle { border-top-color: var(--vscode-terminal-ansiMagenta, #a78bfa); }
    .loading-container.success .spinner-circle { border-top-color: #10b981; }
    .loading-container.warning .spinner-circle { border-top-color: #f59e0b; }
    .loading-container.error .spinner-circle { border-top-color: #ef4444; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLoadingSpinnerComponent {
  @Input() type: 'spinner' | 'dots' | 'pulse' | 'progress' = 'spinner';
  @Input() size: 'small' | 'medium' | 'large' | 'extra-large' = 'medium';
  @Input() message = '';
  @Input() variant: 'inline' | 'overlay' | 'card' | 'default' = 'default';
  @Input() theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary';
  @Input() progress = 0; // For progress type (0-100)
  @Input() showProgress = true; // Show percentage for progress type

  containerClasses = computed(() => {
    const classes = ['loading-container'];
    
    if (this.variant !== 'default') {
      classes.push(this.variant);
    }
    
    if (this.theme !== 'primary') {
      classes.push(this.theme);
    }
    
    return classes.join(' ');
  });

  spinnerClasses = computed(() => {
    return ['spinner', this.size].join(' ');
  });

  messageClasses = computed(() => {
    return ['loading-message', this.size].join(' ');
  });
}