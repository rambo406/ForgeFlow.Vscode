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
      @apply flex flex-col items-center justify-center gap-3;
    }

    .loading-container.inline {
      @apply flex-row gap-2;
    }

    .loading-container.overlay {
      @apply fixed inset-0 bg-background/80 backdrop-blur-sm z-50;
    }

    .loading-container.card {
      @apply bg-card border border-border rounded-lg p-6 shadow-sm;
    }

    /* Spinner Animation */
    .spinner {
      @apply relative;
    }

    .spinner-circle {
      @apply border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin;
    }

    .spinner.small .spinner-circle {
      @apply w-4 h-4;
    }

    .spinner.medium .spinner-circle {
      @apply w-6 h-6;
    }

    .spinner.large .spinner-circle {
      @apply w-8 h-8;
    }

    .spinner.extra-large .spinner-circle {
      @apply w-12 h-12 border-4;
    }

    /* Dots Animation */
    .dots-container {
      @apply flex gap-1;
    }

    .dot {
      @apply w-2 h-2 bg-primary rounded-full;
      animation: dotPulse 1.4s ease-in-out infinite both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    .dot:nth-child(3) { animation-delay: 0s; }

    @keyframes dotPulse {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Pulse Animation */
    .pulse-container {
      @apply relative;
    }

    .pulse-circle {
      @apply w-8 h-8 bg-primary rounded-full;
      animation: pulse 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(var(--primary), 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(var(--primary), 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(var(--primary), 0);
      }
    }

    /* Progress Bar */
    .progress-container {
      @apply w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden;
    }

    .progress-bar {
      @apply h-full bg-primary transition-all duration-300 ease-out;
      background: linear-gradient(90deg, var(--primary) 0%, var(--primary) 100%);
    }

    .progress-text {
      @apply text-sm font-medium text-muted-foreground;
    }

    /* Message Styles */
    .loading-message {
      @apply text-sm text-muted-foreground text-center;
    }

    .loading-message.small {
      @apply text-xs;
    }

    .loading-message.medium {
      @apply text-sm;
    }

    .loading-message.large {
      @apply text-base;
    }

    .loading-message.extra-large {
      @apply text-lg font-medium;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .loading-container.overlay {
        @apply p-4;
      }
      
      .loading-container.card {
        @apply p-4;
      }
      
      .progress-container {
        @apply max-w-full;
      }
    }

    /* Theme specific adjustments */
    .loading-container.primary .spinner-circle {
      @apply border-t-primary;
    }

    .loading-container.secondary .spinner-circle {
      @apply border-t-secondary-foreground;
    }

    .loading-container.success .spinner-circle {
      @apply border-t-green-500;
    }

    .loading-container.warning .spinner-circle {
      @apply border-t-yellow-500;
    }

    .loading-container.error .spinner-circle {
      @apply border-t-red-500;
    }
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