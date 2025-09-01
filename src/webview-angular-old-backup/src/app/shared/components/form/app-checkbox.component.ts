import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { BrnCheckboxImports } from '@spartan-ng/brain/checkbox';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, BrnCheckboxImports, HlmCheckboxImports],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCheckboxComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-vscode-sm">
      <div class="flex items-center space-x-vscode-sm">
        <brn-checkbox
          hlmCheckbox
          [attr.id]="checkboxId"
          [disabled]="disabled"
          [checked]="checked"
          (checkedChange)="onCheckedChange($event)"
          [attr.class]="additionalClasses"
        />
        @if (label) {
          <label 
            class="text-vscode-sm font-medium text-vscode-foreground cursor-pointer"
            [for]="checkboxId"
          >
            {{ label }}
          </label>
        }
      </div>
      @if (error) {
        <div class="text-vscode-xs text-vscode-error">{{ error }}</div>
      }
      @if (helpText) {
        <div class="text-vscode-xs text-vscode-muted">{{ helpText }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;
  @Input() error = '';
  @Input() helpText = '';
  @Input() additionalClasses = '';
  @Output() checkedChange = new EventEmitter<boolean>();

  checkboxId = `checkbox-${Math.random().toString(36).substring(2, 9)}`;
  checked = false;

  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  onCheckedChange(checked: string | boolean): void {
    const boolValue = typeof checked === 'string' ? checked === 'true' : checked;
    this.checked = boolValue;
    this.onChange(this.checked);
    this.onTouched();
    this.checkedChange.emit(this.checked);
  }

  writeValue(value: boolean): void {
    this.checked = value || false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}