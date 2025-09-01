import { Directive, Input, OnInit, OnDestroy, ElementRef, Renderer2, inject } from '@angular/core';
import { AbstractControl, NgControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil, startWith, distinctUntilChanged } from 'rxjs';
import { FormValidationService } from '../../core/services/form-validation.service';

/**
 * Directive for real-time form validation with visual feedback
 */
@Directive({
  selector: '[appValidationFeedback]',
  standalone: true
})
export class ValidationFeedbackDirective implements OnInit, OnDestroy {
  @Input() validationLabel?: string;
  @Input() showSuggestions = true;
  @Input() showInlineErrors = true;

  private destroy$ = new Subject<void>();
  private errorElement?: HTMLElement;
  private suggestionsElement?: HTMLElement;
  private validationService: FormValidationService;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private ngControl: NgControl
  ) {
    this.validationService = inject(FormValidationService);
  }

  ngOnInit(): void {
    if (!this.ngControl || !this.ngControl.control) {
      return;
    }

    const control = this.ngControl.control;
    const fieldName = this.ngControl.name?.toString() || this.validationLabel || 'field';

    // Set up visual feedback containers
    this.setupVisualFeedback();

    // Listen to control value and status changes
    control.valueChanges.pipe(
      startWith(control.value),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateValidationState(fieldName, control);
    });

    control.statusChanges.pipe(
      startWith(control.status),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.updateVisualState(fieldName, control);
    });

    // Mark as touched when field loses focus
    this.renderer.listen(this.el.nativeElement, 'blur', () => {
      this.validationService.markFieldAsTouched(fieldName);
      this.updateVisualState(fieldName, control);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupVisualFeedback();
  }

  /**
   * Set up visual feedback elements
   */
  private setupVisualFeedback(): void {
    const container = this.el.nativeElement.parentElement;
    
    if (this.showInlineErrors) {
      // Create error message container
      this.errorElement = this.renderer.createElement('div');
      this.renderer.addClass(this.errorElement, 'validation-error');
      this.renderer.setStyle(this.errorElement, 'display', 'none');
      this.renderer.setStyle(this.errorElement, 'color', 'var(--vscode-errorForeground)');
      this.renderer.setStyle(this.errorElement, 'font-size', '0.8em');
      this.renderer.setStyle(this.errorElement, 'margin-top', '0.25rem');
      this.renderer.insertBefore(container, this.errorElement, this.el.nativeElement.nextSibling);
    }

    if (this.showSuggestions) {
      // Create suggestions container
      this.suggestionsElement = this.renderer.createElement('div');
      this.renderer.addClass(this.suggestionsElement, 'validation-suggestions');
      this.renderer.setStyle(this.suggestionsElement, 'display', 'none');
      this.renderer.setStyle(this.suggestionsElement, 'color', 'var(--vscode-descriptionForeground)');
      this.renderer.setStyle(this.suggestionsElement, 'font-size', '0.75em');
      this.renderer.setStyle(this.suggestionsElement, 'margin-top', '0.125rem');
      
      const insertAfter = this.errorElement || this.el.nativeElement;
      this.renderer.insertBefore(container, this.suggestionsElement, insertAfter.nextSibling);
    }
  }

  /**
   * Clean up visual feedback elements
   */
  private cleanupVisualFeedback(): void {
    if (this.errorElement) {
      this.renderer.removeChild(this.errorElement.parentElement, this.errorElement);
    }
    if (this.suggestionsElement) {
      this.renderer.removeChild(this.suggestionsElement.parentElement, this.suggestionsElement);
    }
  }

  /**
   * Update validation state in service
   */
  private updateValidationState(fieldName: string, control: AbstractControl): void {
    this.validationService.updateFieldState(fieldName, {
      isValid: control.valid,
      errors: control.errors,
      suggestions: this.extractSuggestions(control.errors),
      dirty: control.dirty
    });
  }

  /**
   * Update visual state based on validation
   */
  private updateVisualState(fieldName: string, control: AbstractControl): void {
    const state = this.validationService.getFieldState(fieldName);
    const shouldShowErrors = state?.touched && !state.isValid;

    // Update input styling
    this.updateInputStyling(control.valid, control.pending);

    // Update error message
    if (this.errorElement) {
      if (shouldShowErrors && state?.errors) {
        const errorMessage = this.validationService.getFieldErrorMessage(fieldName);
        this.renderer.setProperty(this.errorElement, 'textContent', errorMessage);
        this.renderer.setStyle(this.errorElement, 'display', 'block');
      } else {
        this.renderer.setStyle(this.errorElement, 'display', 'none');
      }
    }

    // Update suggestions
    if (this.suggestionsElement && state) {
      const suggestions = state.suggestions;
      if (suggestions.length > 0 && (shouldShowErrors || !state.touched)) {
        const suggestionText = `💡 ${suggestions.join(', ')}`;
        this.renderer.setProperty(this.suggestionsElement, 'textContent', suggestionText);
        this.renderer.setStyle(this.suggestionsElement, 'display', 'block');
      } else {
        this.renderer.setStyle(this.suggestionsElement, 'display', 'none');
      }
    }
  }

  /**
   * Update input styling based on validation state
   */
  private updateInputStyling(isValid: boolean, isPending: boolean): void {
    // Remove all validation classes
    this.renderer.removeClass(this.el.nativeElement, 'validation-valid');
    this.renderer.removeClass(this.el.nativeElement, 'validation-invalid');
    this.renderer.removeClass(this.el.nativeElement, 'validation-pending');

    // Apply appropriate class
    if (isPending) {
      this.renderer.addClass(this.el.nativeElement, 'validation-pending');
      this.renderer.setStyle(this.el.nativeElement, 'border-color', 'var(--vscode-focusBorder)');
    } else if (!isValid) {
      this.renderer.addClass(this.el.nativeElement, 'validation-invalid');
      this.renderer.setStyle(this.el.nativeElement, 'border-color', 'var(--vscode-errorForeground)');
    } else {
      this.renderer.addClass(this.el.nativeElement, 'validation-valid');
      this.renderer.setStyle(this.el.nativeElement, 'border-color', 'var(--vscode-input-border)');
    }
  }

  /**
   * Extract suggestions from validation errors
   */
  private extractSuggestions(errors: ValidationErrors | null): string[] {
    if (!errors) return [];
    const suggestions: string[] = [];
    Object.values(errors).forEach((error: unknown) => {
      if (error && typeof error === 'object' && 'suggestions' in (error as object)) {
        const s = (error as { suggestions?: unknown }).suggestions;
        if (Array.isArray(s)) {
          suggestions.push(...(s.filter((x): x is string => typeof x === 'string')));
        }
      }
    });
    return suggestions;
  }
}
