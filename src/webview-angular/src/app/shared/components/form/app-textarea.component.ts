import { Component, ChangeDetectionStrategy, forwardRef, input, output, signal } from '@angular/core';
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
      @if (label()) {
        <label 
          class="text-vscode-sm font-medium text-vscode-foreground"
          [for]="textareaId"
        >
          {{ label() }}
        </label>
      }
      <textarea
        class="input-vscode w-full resize-y"
        [class.input-vscode-error]="!!error()"
        [class]="additionalClasses()"
        [id]="textareaId"
        [placeholder]="placeholder()"
        [disabled]="disabled() || isDisabled()"
        [rows]="rows()"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus.emit($event)"
      ></textarea>
      @if (error()) {
        <div class="text-vscode-xs text-vscode-error">{{ error() }}</div>
      }
      @if (helpText()) {
        <div class="text-vscode-xs text-vscode-muted">{{ helpText() }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTextareaComponent implements ControlValueAccessor {
  label = input('');
  placeholder = input('');
  disabled = input(false);
  error = input('');
  helpText = input('');
  rows = input(3);
  additionalClasses = input('');
  onFocus = output<Event>();

  textareaId = `textarea-${Math.random().toString(36).substring(2, 9)}`;
  value = signal('');
  protected isDisabled = signal(false);

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    this.onChange(this.value());
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}