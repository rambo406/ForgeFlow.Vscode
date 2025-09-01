import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmButton, type ButtonVariants } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, HlmButton],
  template: `
    <button
      hlmBtn
      [variant]="variant"
      [size]="size"
      [disabled]="disabled"
      [class]="additionalClasses"
      (click)="onClick.emit($event)"
      type="button"
    >
      <ng-content></ng-content>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppButtonComponent {
  @Input() variant: ButtonVariants['variant'] = 'default';
  @Input() size: ButtonVariants['size'] = 'default';
  @Input() disabled = false;
  @Input() additionalClasses = '';
  @Output() onClick = new EventEmitter<Event>();
}