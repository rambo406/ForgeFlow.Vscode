import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmLabel } from '@spartan-ng/helm/label';
import { BrnSelectImports } from '@spartan-ng/brain/select';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [
    CommonModule, 
    HlmLabel,
    BrnSelectImports,
    HlmSelectImports
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-2">
      @if (label) {
        <label hlmLabel [for]="selectId">{{ label }}</label>
      }
      <brn-select 
        [id]="selectId"
        [disabled]="disabled"
        (valueChange)="onValueChange($event)"
        [value]="value"
      >
        <hlm-select-trigger [class]="additionalClasses">
          <hlm-select-value />
        </hlm-select-trigger>
        <hlm-select-content>
          @for (option of options; track option.value) {
            <hlm-option 
              [value]="option.value" 
              [disabled]="option.disabled || false"
            >
              {{ option.label }}
            </hlm-option>
          }
        </hlm-select-content>
      </brn-select>
      @if (error) {
        <div class="text-sm text-destructive">{{ error }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() options: SelectOption[] = [];
  @Input() disabled = false;
  @Input() error = '';
  @Input() additionalClasses = '';
  @Output() valueChange = new EventEmitter<string>();

  selectId = `select-${Math.random().toString(36).substring(2, 9)}`;
  value = '';

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onValueChange(value: string | string[] | undefined): void {
    const stringValue = Array.isArray(value) ? value[0] || '' : value || '';
    this.value = stringValue;
    this.onChange(this.value);
    this.onTouched();
    this.valueChange.emit(this.value);
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}