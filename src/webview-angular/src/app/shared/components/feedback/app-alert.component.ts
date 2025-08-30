import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, HlmAlert, HlmAlertDescription, HlmAlertTitle],
  template: `
    <div hlmAlert [variant]="variant" [class]="additionalClasses + ' relative'">
      @if (title) {
        <h5 hlmAlertTitle>{{ title }}</h5>
      }
      <div hlmAlertDescription>
        <ng-content></ng-content>
      </div>
      @if (dismissible) {
        <button
          type="button"
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          (click)="onDismiss()"
        >
          ×
          <span class="sr-only">Close</span>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppAlertComponent {
  @Input() variant: 'default' | 'destructive' = 'default';
  @Input() title = '';
  @Input() dismissible = false;
  @Input() additionalClasses = '';
  @Output() dismiss = new EventEmitter<void>();

  onDismiss(): void {
    this.dismiss.emit();
  }
}