import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmBadge } from '@spartan-ng/helm/badge';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule, HlmBadge],
  template: `
    <span 
      hlmBadge 
      [variant]="variant"
      [class]="additionalClasses"
    >
      <ng-content></ng-content>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppBadgeComponent {
  @Input() variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  @Input() additionalClasses = '';
}