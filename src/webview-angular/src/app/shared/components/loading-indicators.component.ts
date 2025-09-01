import { Component, Input, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService, LoadingOperation } from '../../core/services/loading.service';

/**
 * Simple loading spinner component
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-spinner" [class.with-text]="text()">
      <div class="spinner" [style.width.px]="size()" [style.height.px]="size()">
        <div class="spinner-circle"></div>
      </div>
      @if (text()) {
        <span class="spinner-text">{{ text() }}</span>
      }
    </div>
  `,
  styles: [`
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .loading-spinner.with-text {
      gap: 0.75rem;
    }

    .spinner {
      position: relative;
      display: inline-block;
    }

    .spinner-circle {
      width: 100%;
      height: 100%;
      border: 2px solid var(--vscode-progressBar-background);
      border-top: 2px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinner-text {
      font-size: 0.875rem;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }
  `]
})
export class LoadingSpinnerComponent {
  size = input(24);
  text = input<string | undefined>(undefined);
}

/**
 * Progress bar component
 */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-container">
      @if (label()) {
        <div class="progress-label">
          <span>{{ label() }}</span>
          @if (showPercentage() && !isIndeterminate()) {
            <span class="progress-percentage">{{ Math.round(progress()) }}%</span>
          }
        </div>
      }
      <div class="progress-bar" [style.height.px]="height()">
        <div 
          class="progress-fill" 
          [class.indeterminate]="isIndeterminate()"
          [style.width.%]="isIndeterminate() ? 100 : progress()"
          [style.transform]="isIndeterminate() ? 'translateX(-100%)' : 'none'"
        ></div>
      </div>
      @if (description()) {
        <div class="progress-description">{{ description() }}</div>
      }
    </div>
  `,
  styles: [`
    .progress-container {
      width: 100%;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      color: var(--vscode-foreground);
    }

    .progress-percentage {
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
    }

    .progress-bar {
      width: 100%;
      background-color: var(--vscode-progressBar-background);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background-color: var(--vscode-progressBar-foreground);
      transition: width 0.3s ease;
      border-radius: 2px;
    }

    .progress-fill.indeterminate {
      width: 30% !important;
      animation: indeterminate 2s ease-in-out infinite;
    }

    @keyframes indeterminate {
      0% {
        transform: translateX(-100%);
      }
      50% {
        transform: translateX(300%);
      }
      100% {
        transform: translateX(-100%);
      }
    }

    .progress-description {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--vscode-descriptionForeground);
    }
  `]
})
export class ProgressBarComponent {
  progress = input(0);
  isIndeterminate = input(false);
  label = input<string | undefined>(undefined);
  description = input<string | undefined>(undefined);
  showPercentage = input(true);
  height = input(4);

  protected readonly Math = Math;
}

/**
 * Loading overlay component
 */
@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, ProgressBarComponent],
  template: `
    <div class="loading-overlay" [class.visible]="visible()">
      <div class="loading-content">
        @if (operation(); as op) {
          @if (op.isIndeterminate) {
            <app-loading-spinner 
              [size]="spinnerSize()" 
              [text]="op.name"
            />
          } @else {
            <app-progress-bar
              [progress]="op.progress || 0"
              [label]="op.name"
              [description]="op.description"
              [showPercentage]="true"
              [height]="8"
            />
          }
          
          @if (op.cancellable) {
            <button 
              class="cancel-button"
              (click)="cancelOperation()"
              type="button"
            >
              Cancel
            </button>
          }
        } @else {
          <app-loading-spinner 
            [size]="spinnerSize()"
            [text]="text() || 'Loading...'"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .loading-overlay.visible {
      opacity: 1;
      visibility: visible;
    }

    .loading-content {
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
      padding: 2rem;
      min-width: 300px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .cancel-button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 2px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background-color 0.2s ease;
    }

    .cancel-button:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .cancel-button:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
  `]
})
export class LoadingOverlayComponent {
  visible = input(false);
  text = input<string | undefined>(undefined);
  operationId = input<string | undefined>(undefined);
  spinnerSize = input(32);

  private loadingService = inject(LoadingService);

  protected readonly operation = computed(() => {
    const id = this.operationId();
    if (!id) return null;
    return this.loadingService.getOperation(id);
  });

  protected cancelOperation(): void {
    const id = this.operationId();
    if (id) {
      this.loadingService.cancelLoading(id);
    }
  }
}

/**
 * Global loading indicator component that shows in the corner
 */
@Component({
  selector: 'app-global-loading-indicator',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    @if (loadingSummary().isLoading) {
      <div class="global-loading-indicator" [class.critical]="loadingSummary().hasBlockingOperations">
        <app-loading-spinner [size]="16" />
        <span class="loading-count">{{ loadingSummary().totalOperations }}</span>
        
        @if (loadingSummary().overallProgress > 0) {
          <div class="mini-progress">
            <div 
              class="mini-progress-fill"
              [style.width.%]="loadingSummary().overallProgress"
            ></div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .global-loading-indicator {
      position: fixed;
      top: 1rem;
      right: 1rem;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 12px;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      min-width: 60px;
    }

    .global-loading-indicator.critical {
      background-color: var(--vscode-errorBadge-background);
      color: var(--vscode-errorBadge-foreground);
    }

    .loading-count {
      font-weight: 500;
      min-width: 12px;
      text-align: center;
    }

    .mini-progress {
      width: 40px;
      height: 2px;
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 1px;
      overflow: hidden;
    }

    .mini-progress-fill {
      height: 100%;
      background-color: currentColor;
      transition: width 0.3s ease;
    }
  `]
})
export class GlobalLoadingIndicatorComponent {
  private loadingService = inject(LoadingService);
  
  protected readonly loadingSummary = this.loadingService.loadingSummary;
}