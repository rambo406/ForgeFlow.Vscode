import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppTextareaComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-y-vscode-sm">
      @if (label) {
        <label 
          class="text-vscode-sm font-medium text-vscode-foreground"
          [for]="textareaId"
        >
          {{ label }}
        </label>
      }
      <textarea
        class="input-vscode w-full resize-y"
        [class.input-vscode-error]="!!error"
        [class]="additionalClasses"
        [id]="textareaId"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [rows]="rows"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus.emit($event)"
      ></textarea>
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
export class AppTextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() error = '';
  @Input() helpText = '';
  @Input() rows = 3;
  @Input() additionalClasses = '';
  @Output() onFocus = new EventEmitter<Event>();

  textareaId = `textarea-${Math.random().toString(36).substring(2, 9)}`;
  value = '';

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
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