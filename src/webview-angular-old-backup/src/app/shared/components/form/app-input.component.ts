import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-vscode-sm">
      @if (label) {
        <label 
          class="text-vscode-sm font-medium text-vscode-foreground"
          [for]="inputId"
        >
          {{ label }}
        </label>
      }
      <input
        class="input-vscode w-full"
        [class.input-vscode-error]="!!error"
        [class]="additionalClasses"
        [id]="inputId"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus.emit($event)"
      />
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
export class AppInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() error = '';
  @Input() helpText = '';
  @Input() additionalClasses = '';
  @Output() onFocus = new EventEmitter<Event>();

  inputId = `input-${Math.random().toString(36).substring(2, 9)}`;
  value = '';

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
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