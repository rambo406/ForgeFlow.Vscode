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
      @apply fixed right-4 top-4 z-50 w-full max-w-sm bg-background border border-border rounded-lg shadow-lg;
      @apply transform transition-all duration-300 ease-in-out;
    }

    .toast-content {
      @apply flex items-start gap-3 p-4;
    }

    .toast-icon {
      @apply flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded-full font-bold text-sm;
    }

    .icon-success {
      @apply bg-green-500 text-white;
    }

    .icon-error {
      @apply bg-red-500 text-white;
    }

    .icon-warning {
      @apply bg-yellow-500 text-white;
    }

    .icon-info {
      @apply bg-blue-500 text-white;
    }

    .icon-default {
      @apply bg-gray-500 text-white;
    }

    .toast-text {
      @apply flex-1 min-w-0;
    }

    .toast-title {
      @apply font-semibold text-sm text-foreground;
    }

    .toast-message {
      @apply text-sm text-muted-foreground mt-1;
    }

    .toast-details {
      @apply text-xs text-muted-foreground mt-2 overflow-hidden;
      max-height: 60px;
      transition: max-height 0.3s ease;
    }

    .toast-details.expanded {
      max-height: 200px;
      overflow-y: auto;
    }

    .toast-details-toggle {
      @apply text-xs text-primary hover:text-primary/80 mt-1 font-medium cursor-pointer bg-transparent border-none;
    }

    .toast-actions {
      @apply flex gap-2 mt-3 flex-wrap;
    }

    .toast-close {
      @apply flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none text-lg leading-none;
      @apply transition-colors duration-200 w-6 h-6 flex items-center justify-center;
    }

    .toast-progress {
      @apply absolute bottom-0 left-0 h-1 bg-primary rounded-b-lg;
      width: 0%;
    }

    /* Variants */
    .toast-container.success {
      @apply border-green-200 bg-green-50/50;
    }

    .toast-container.error {
      @apply border-red-200 bg-red-50/50;
    }

    .toast-container.warning {
      @apply border-yellow-200 bg-yellow-50/50;
    }

    .toast-container.info {
      @apply border-blue-200 bg-blue-50/50;
    }

    /* Dark mode adjustments */
    .dark .toast-container.success {
      @apply border-green-800 bg-green-950/50;
    }

    .dark .toast-container.error {
      @apply border-red-800 bg-red-950/50;
    }

    .dark .toast-container.warning {
      @apply border-yellow-800 bg-yellow-950/50;
    }

    .dark .toast-container.info {
      @apply border-blue-800 bg-blue-950/50;
    }

    /* Action buttons */
    .action-button {
      @apply px-3 py-1.5 text-xs font-medium rounded transition-colors duration-200 cursor-pointer;
    }

    .action-button.primary {
      @apply bg-primary text-primary-foreground hover:bg-primary/90;
    }

    .action-button.secondary {
      @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
    }
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