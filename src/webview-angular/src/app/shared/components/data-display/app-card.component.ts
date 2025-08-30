import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, HlmCardImports],
  template: `
    <div hlmCard [class]="additionalClasses">
      @if (title || subtitle) {
        <div hlmCardHeader>
          @if (title) {
            <h3 hlmCardTitle>{{ title }}</h3>
          }
          @if (subtitle) {
            <p hlmCardDescription>{{ subtitle }}</p>
          }
        </div>
      }
      <div hlmCardContent>
        <ng-content></ng-content>
      </div>
      @if (hasFooter) {
        <div hlmCardFooter>
          <ng-content select="[slot=footer]"></ng-content>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() hasFooter = false;
  @Input() additionalClasses = '';
}