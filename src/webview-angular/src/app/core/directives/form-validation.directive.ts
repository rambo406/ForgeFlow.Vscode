import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormValidationService } from '../services/form-validation.service';

/**
 * Directive for automatic form validation with visual feedback
 */
@Directive({
  selector: '[appFormValidation]',
  standalone: true
})
export class FormValidationDirective implements OnInit, OnDestroy {
  @Input() fieldName?: string;
  @Input() showSuggestions: boolean = true;
  @Input() debounceTime: number = 300;

  private destroy$ = new Subject<void>();
  private validationService = inject(FormValidationService);
  private elementRef = inject(ElementRef);
  private ngControl = inject(NgControl, { optional: true });

  private errorElement?: HTMLElement;
  private suggestionsElement?: HTMLElement;

  ngOnInit(): void {
    if (!this.ngControl) {
      console.warn('FormValidationDirective requires NgControl (like formControl or ngModel)');
      return;
    }

    this.setupValidation();
    this.createValidationElements();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.removeValidationElements();
  }

  /**
   * Set up form validation listeners
   */
  private setupValidation(): void {
    if (!this.ngControl?.control) return;

    const control = this.ngControl.control;
    const fieldName = this.fieldName || this.getFieldName();

    // Listen to value changes with debounce
    control.valueChanges.pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.validateAndUpdateUI(fieldName);
    });

    // Listen to status changes
    control.statusChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((status: string) => {
      this.updateValidationState(fieldName, status);
    });

    // Initial validation
    if (control.value) {
      this.validateAndUpdateUI(fieldName);
    }
  }

  /**
   * Validate field and update UI
   */
  private validateAndUpdateUI(fieldName: string): void {
    if (!this.ngControl?.control) return;

    const control = this.ngControl.control;
    
    // Mark field as touched when user interacts
    this.validationService.markFieldAsTouched(fieldName);

    // Update visual state
    this.updateFieldAppearance();
    this.updateErrorDisplay(fieldName);
    this.updateSuggestionsDisplay(fieldName);
  }

  /**
   * Update validation state in service
   */
  private updateValidationState(fieldName: string, status: string): void {
    this.validationService.updateFieldState(fieldName, {
      isValid: status === 'VALID',
      isValidating: status === 'PENDING',
      errors: this.ngControl?.control?.errors || null
    });
  }

  /**
   * Update field appearance based on validation state
   */
  private updateFieldAppearance(): void {
    const element = this.elementRef.nativeElement;
    if (!element || !this.ngControl?.control) return;

    const control = this.ngControl.control;
    
    // Remove existing validation classes
    element.classList.remove('validation-valid', 'validation-invalid', 'validation-pending');

    // Add appropriate class based on status
    if (control.pending) {
      element.classList.add('validation-pending');
    } else if (control.invalid && (control.dirty || control.touched)) {
      element.classList.add('validation-invalid');
    } else if (control.valid && (control.dirty || control.touched)) {
      element.classList.add('validation-valid');
    }

    // Add ARIA attributes for accessibility
    if (control.invalid && (control.dirty || control.touched)) {
      element.setAttribute('aria-invalid', 'true');
      element.setAttribute('aria-describedby', `${this.getFieldName()}-error ${this.getFieldName()}-suggestions`);
    } else {
      element.setAttribute('aria-invalid', 'false');
      element.removeAttribute('aria-describedby');
    }
  }

  /**
   * Create validation UI elements
   */
  private createValidationElements(): void {
    const container = this.getOrCreateContainer();
    
    // Create error element
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'validation-error';
    this.errorElement.id = `${this.getFieldName()}-error`;
    this.errorElement.setAttribute('role', 'alert');
    this.errorElement.style.cssText = `
      color: var(--vscode-errorForeground, #f14c4c);
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: none;
    `;
    container.appendChild(this.errorElement);

    // Create suggestions element if enabled
    if (this.showSuggestions) {
      this.suggestionsElement = document.createElement('div');
      this.suggestionsElement.className = 'validation-suggestions';
      this.suggestionsElement.id = `${this.getFieldName()}-suggestions`;
      this.suggestionsElement.style.cssText = `
        color: var(--vscode-foreground, #cccccc);
        font-size: 0.75rem;
        margin-top: 0.25rem;
        opacity: 0.8;
        display: none;
      `;
      container.appendChild(this.suggestionsElement);
    }
  }

  /**
   * Update error display
   */
  private updateErrorDisplay(fieldName: string): void {
    if (!this.errorElement || !this.ngControl?.control) return;

    const control = this.ngControl.control;
    const errorMessage = this.validationService.getFieldErrorMessage(fieldName);

    if (errorMessage && control.invalid && (control.dirty || control.touched)) {
      this.errorElement.textContent = errorMessage;
      this.errorElement.style.display = 'block';
    } else {
      this.errorElement.style.display = 'none';
    }
  }

  /**
   * Update suggestions display
   */
  private updateSuggestionsDisplay(fieldName: string): void {
    if (!this.suggestionsElement || !this.showSuggestions || !this.ngControl?.control) return;

    const control = this.ngControl.control;
    const suggestions = this.validationService.getFieldSuggestions(fieldName);

    if (suggestions.length > 0 && control.invalid && (control.dirty || control.touched)) {
      this.suggestionsElement.innerHTML = suggestions
        .map(suggestion => `<div class="suggestion-item">💡 ${suggestion}</div>`)
        .join('');
      this.suggestionsElement.style.display = 'block';
    } else {
      this.suggestionsElement.style.display = 'none';
    }
  }

  /**
   * Get or create container for validation elements
   */
  private getOrCreateContainer(): HTMLElement {
    const element = this.elementRef.nativeElement;
    let container = element.parentElement?.querySelector('.validation-container');
    
    if (!container) {
      container = document.createElement('div');
      container.className = 'validation-container';
      element.parentElement?.appendChild(container);
    }
    
    return container as HTMLElement;
  }

  /**
   * Remove validation UI elements
   */
  private removeValidationElements(): void {
    this.errorElement?.remove();
    this.suggestionsElement?.remove();
    
    // Remove container if it's empty
    const container = this.elementRef.nativeElement.parentElement?.querySelector('.validation-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }

  /**
   * Get field name from various sources
   */
  private getFieldName(): string {
    if (this.fieldName) return this.fieldName;
    
    // Try to get from form control name
    if (this.ngControl?.name) return this.ngControl.name.toString();
    
    // Try to get from element attributes
    const element = this.elementRef.nativeElement;
    return element.name || element.id || 'field';
  }
}