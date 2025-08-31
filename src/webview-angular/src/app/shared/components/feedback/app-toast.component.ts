import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="toast-container"
      [class]="containerClasses()"
      [@slideInOut]="animationState()"
      (@slideInOut.done)="onAnimationDone($event)"
    >
      <div class="toast-content">
        <!-- Icon -->
        <div class="toast-icon">
          @switch (type) {
            @case ('success') {
              <span class="icon-success">✓</span>
            }
            @case ('error') {
              <span class="icon-error">✕</span>
            }
            @case ('warning') {
              <span class="icon-warning">⚠</span>
            }
            @case ('info') {
              <span class="icon-info">ℹ</span>
            }
            @default {
              <span class="icon-default">•</span>
            }
          }
        </div>

        <!-- Content -->
        <div class="toast-text">
          @if (title) {
            <div class="toast-title">{{ title }}</div>
          }
          @if (message) {
            <div class="toast-message">{{ message }}</div>
          }
          @if (details) {
            <div class="toast-details" [class.expanded]="detailsExpanded()">
              {{ details }}
            </div>
            @if (details.length > 100) {
              <button 
                type="button" 
                class="toast-details-toggle"
                (click)="toggleDetails()"
              >
                {{ detailsExpanded() ? 'Show Less' : 'Show More' }}
              </button>
            }
          }
        </div>

        <!-- Actions -->
        @if (actions && actions.length > 0) {
          <div class="toast-actions">
            @for (action of actions; track action.label) {
              <button
                type="button"
                [class]="actionButtonClasses(action.primary || false)"
                (click)="executeAction(action)"
              >
                {{ action.label }}
              </button>
            }
          </div>
        }

        <!-- Close button -->
        @if (dismissible) {
          <button
            type="button"
            class="toast-close"
            (click)="closeToast()"
            aria-label="Close notification"
          >
            ×
          </button>
        }
      </div>

      <!-- Progress bar for auto-dismiss -->
      @if (duration && duration > 0 && !persistent) {
        <div 
          class="toast-progress"
          [style.animation-duration.ms]="duration"
          [@progressBar]="animationState()"
        ></div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      right: 1rem;
      top: 1rem;
      z-index: 50;
      width: 100%;
      max-width: 20rem;
      background: var(--vscode-editor-background, #fff);
      border: 1px solid var(--vscode-panel-border, rgba(0,0,0,0.08));
      border-radius: 0.5rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      transform: translateY(0);
      transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
    }

    .toast-content { display:flex; align-items:flex-start; gap:0.75rem; padding:1rem; }

    .toast-icon { flex-shrink:0; margin-top:0.125rem; width:1.25rem; height:1.25rem; display:flex; align-items:center; justify-content:center; border-radius:9999px; font-weight:700; font-size:0.875rem; }

    .icon-success { background:#10b981; color:#fff; }
    .icon-error { background:#ef4444; color:#fff; }
    .icon-warning { background:#f59e0b; color:#fff; }
    .icon-info { background:#3b82f6; color:#fff; }
    .icon-default { background:#6b7280; color:#fff; }

    .toast-text { flex:1; min-width:0; }
    .toast-title { font-weight:600; font-size:0.875rem; color:var(--vscode-foreground, #111827); }
    .toast-message { font-size:0.875rem; color:var(--vscode-descriptionForeground, #6b7280); margin-top:0.25rem; }

    .toast-details { font-size:0.75rem; color:var(--vscode-descriptionForeground, #6b7280); margin-top:0.5rem; overflow:hidden; max-height:60px; transition:max-height 0.3s ease; }
    .toast-details.expanded { max-height:200px; overflow-y:auto; }

    .toast-details-toggle { font-size:0.75rem; color:var(--vscode-button-foreground, #0ea5e9); margin-top:0.25rem; font-weight:500; cursor:pointer; background:transparent; border:none; }

    .toast-actions { display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap; }

    .toast-close { flex-shrink:0; color:var(--vscode-descriptionForeground, #6b7280); cursor:pointer; background:transparent; border:none; font-size:1rem; line-height:1; transition:color 200ms ease; width:1.5rem; height:1.5rem; display:flex; align-items:center; justify-content:center; }

    .toast-progress { position:absolute; bottom:0; left:0; height:0.25rem; background:var(--vscode-terminal-ansiBlue, #3b82f6); border-bottom-left-radius:0.5rem; border-bottom-right-radius:0.5rem; width:0%; }

    /* Variants */
    .toast-container.success { border-color:#bbf7d0; background:rgba(220,252,231,0.5); }
    .toast-container.error { border-color:#fecaca; background:rgba(254,226,226,0.5); }
    .toast-container.warning { border-color:#fde68a; background:rgba(254,243,199,0.5); }
    .toast-container.info { border-color:#bfdbfe; background:rgba(219,234,254,0.5); }

    /* Dark mode adjustments */
    .dark .toast-container.success { border-color:#065f46; background:rgba(6,95,70,0.08); }
    .dark .toast-container.error { border-color:#7f1d1d; background:rgba(127,29,29,0.08); }
    .dark .toast-container.warning { border-color:#92400e; background:rgba(146,64,14,0.08); }
    .dark .toast-container.info { border-color:#1e3a8a; background:rgba(30,58,138,0.08); }

    /* Action buttons */
    .action-button { padding:0.375rem 0.75rem; font-size:0.75rem; font-weight:500; border-radius:0.375rem; transition:color 200ms ease; cursor:pointer; }
    .action-button.primary { background:var(--vscode-terminal-ansiBlue, #3b82f6); color:var(--vscode-button-foreground, #fff); }
    .action-button.primary:hover { filter:brightness(0.9); }
    .action-button.secondary { background:var(--vscode-sideBar-background, #f3f4f6); color:var(--vscode-foreground, #111827); }
    .action-button.secondary:hover { filter:brightness(0.95); }
  `],
  animations: [
    trigger('slideInOut', [
      state('in', style({ transform: 'translateX(0)', opacity: 1 })),
      state('out', style({ transform: 'translateX(100%)', opacity: 0 })),
      transition('void => in', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in-out')
      ]),
      transition('in => out', [
        animate('300ms ease-in-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),
    trigger('progressBar', [
      state('in', style({ width: '0%' })),
      transition('void => in', [
        style({ width: '100%' }),
        animate('{{ duration }}ms linear', style({ width: '0%' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppToastComponent implements OnInit, OnDestroy {
  @Input() type: 'success' | 'error' | 'warning' | 'info' = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() details = '';
  @Input() duration = 0; // 0 means no auto-dismiss
  @Input() persistent = false;
  @Input() dismissible = true;
  @Input() actions: ToastAction[] = [];
  @Input() position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';

  @Output() dismiss = new EventEmitter<void>();
  @Output() actionExecuted = new EventEmitter<ToastAction>();

  detailsExpanded = signal(false);
  animationState = signal<'in' | 'out'>('in');
  private autoCloseTimer?: number;

  containerClasses = computed(() => {
    return [
      'toast-container',
      this.type,
      this.getPositionClasses()
    ].join(' ');
  });

  ngOnInit(): void {
    // Start auto-dismiss timer if duration is set and not persistent
    if (this.duration > 0 && !this.persistent) {
      this.autoCloseTimer = window.setTimeout(() => {
        this.close();
      }, this.duration);
    }
  }

  ngOnDestroy(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  toggleDetails(): void {
    this.detailsExpanded.set(!this.detailsExpanded());
  }

  executeAction(action: ToastAction): void {
    action.action();
    this.actionExecuted.emit(action);
    
    // Close toast after action unless it's persistent
    if (!this.persistent) {
      this.close();
    }
  }

  closeToast(): void {
    this.close();
  }

  close(): void {
    this.animationState.set('out');
  }

  onAnimationDone(event: any): void {
    if (event.toState === 'out') {
      this.dismiss.emit();
    }
  }

  actionButtonClasses(primary: boolean): string {
    return primary ? 'action-button primary' : 'action-button secondary';
  }

  private getPositionClasses(): string {
    switch (this.position) {
      case 'top-left':
        return 'left-4 top-4';
      case 'bottom-right':
        return 'right-4 bottom-4';
      case 'bottom-left':
        return 'left-4 bottom-4';
      case 'top-right':
      default:
        return 'right-4 top-4';
    }
  }
}

export interface ToastAction {
  label: string;
  action: () => void;
  primary?: boolean;
}