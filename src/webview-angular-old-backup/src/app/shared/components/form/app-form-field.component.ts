import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-vscode-sm" [class]="additionalClasses">
      @if (label) {
        <label 
          class="text-vscode-sm font-medium text-vscode-foreground"
          [for]="fieldId"
        >
          {{ label }}
          @if (required) {
            <span class="text-vscode-error ml-1">*</span>
          }
        </label>
      }
      
      <div class="form-field-content">
        <ng-content></ng-content>
      </div>
      
      @if (error) {
        <div class="text-vscode-xs text-vscode-error">{{ error }}</div>
      }
      
      @if (helpText && !error) {
        <div class="text-vscode-xs text-vscode-muted">{{ helpText }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppFormFieldComponent {
  @Input() label = '';
  @Input() error = '';
  @Input() helpText = '';
  @Input() required = false;
  @Input() fieldId = '';
  @Input() additionalClasses = '';
}