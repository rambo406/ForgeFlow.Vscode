import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      [class]="buttonClasses"
      [disabled]="disabled"
      [type]="type">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .btn {
      @apply inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50;
    }
    
    .btn-default {
      @apply bg-primary text-primary-foreground hover:bg-primary/90;
    }
    
    .btn-destructive {
      @apply bg-destructive text-destructive-foreground hover:bg-destructive/90;
    }
    
    .btn-outline {
      @apply border border-input bg-background hover:bg-accent hover:text-accent-foreground;
    }
    
    .btn-secondary {
      @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
    }
    
    .btn-ghost {
      @apply hover:bg-accent hover:text-accent-foreground;
    }
    
    .btn-link {
      @apply text-primary underline-offset-4 hover:underline;
    }
    
    .btn-sm {
      @apply h-9 rounded-md px-3;
    }
    
    .btn-lg {
      @apply h-11 rounded-md px-8;
    }
    
    .btn-icon {
      @apply h-10 w-10;
    }
  `]
})
export class ButtonComponent {
  @Input() variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' = 'default';
  @Input() size: 'default' | 'sm' | 'lg' | 'icon' = 'default';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get buttonClasses(): string {
    const baseClasses = 'btn';
    const variantClass = `btn-${this.variant}`;
    const sizeClass = this.size !== 'default' ? `btn-${this.size}` : 'h-10 px-4 py-2';
    
    return `${baseClasses} ${variantClass} ${sizeClass}`;
  }
}