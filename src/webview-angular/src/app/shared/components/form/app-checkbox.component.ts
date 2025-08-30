import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabel } from '@spartan-ng/helm/label';
import { BrnCheckboxImports } from '@spartan-ng/brain/checkbox';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, HlmLabel, BrnCheckboxImports, HlmCheckboxImports],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCheckboxComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex items-center space-x-2">
      <brn-checkbox
        hlmCheckbox
        [id]="checkboxId"
        [disabled]="disabled"
        [checked]="checked"
        (checkedChange)="onCheckedChange($event)"
        [class]="additionalClasses"
      />
      @if (label) {
        <label hlmLabel [for]="checkboxId" class="cursor-pointer">{{ label }}</label>
      }
    </div>
    @if (error) {
      <div class="text-sm text-destructive mt-1">{{ error }}</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;
  @Input() error = '';
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