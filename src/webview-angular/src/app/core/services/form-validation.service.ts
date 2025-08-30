import { Injectable, signal } from '@angular/core';
import { AbstractControl, ValidatorFn, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer, map, catchError, switchMap } from 'rxjs';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors | null;
  suggestions?: string[];
  severity: 'error' | 'warning' | 'info';
}

/**
 * Field validation state
 */
export interface FieldValidationState {
  fieldName: string;
  isValid: boolean;
  isValidating: boolean;
  errors: ValidationErrors | null;
  suggestions: string[];
  touched: boolean;
  dirty: boolean;
}

/**
 * Service for real-time form validation with helpful feedback
 */
@Injectable({
  providedIn: 'root'
})
export class FormValidationService {
  private _validationStates = signal<Map<string, FieldValidationState>>(new Map());
  
  readonly validationStates = this._validationStates.asReadonly();

  /**
   * Common validators with user-friendly error messages
   */
  static Validators = {
    /**
     * Required field validator
     */
    required(fieldName: string = 'This field'): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value || (typeof control.value === 'string' && control.value.trim().length === 0)) {
          return {
            required: {
              message: `${fieldName} is required`,
              suggestions: [`Please enter a value for ${fieldName.toLowerCase()}`]
            }
          };
        }
        return null;
      };
    },

    /**
     * Email validator with suggestions
     */
    email(control: AbstractControl): ValidationErrors | null {
      if (!control.value) return null;
      
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      if (!emailPattern.test(control.value)) {
        const suggestions = [];
        
        if (!control.value.includes('@')) {
          suggestions.push('Email must contain an @ symbol');
        } else if (!control.value.includes('.')) {
          suggestions.push('Email must contain a domain (e.g., .com)');
        } else if (control.value.startsWith('@') || control.value.endsWith('@')) {
          suggestions.push('@ symbol cannot be at the beginning or end');
        }
        
        return {
          email: {
            message: 'Please enter a valid email address',
            suggestions: suggestions.length > 0 ? suggestions : ['Example: user@domain.com']
          }
        };
      }
      
      return null;
    },

    /**
     * URL validator for Azure DevOps organization URLs
     */
    azureDevOpsUrl(control: AbstractControl): ValidationErrors | null {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      const suggestions = [];
      
      // Check for https
      if (!value.startsWith('https://')) {
        suggestions.push('URL must start with https://');
      }
      
      // Check for Azure DevOps patterns
      const azurePatterns = [
        /^https:\/\/dev\.azure\.com\/[^\/]+\/?$/,  // Modern Azure DevOps
        /^https:\/\/[^\.]+\.visualstudio\.com\/?$/ // Legacy Visual Studio Online
      ];
      
      const isValidPattern = azurePatterns.some(pattern => pattern.test(value));
      
      if (!isValidPattern) {
        suggestions.push('Expected format: https://dev.azure.com/organization');
        suggestions.push('Or legacy format: https://organization.visualstudio.com');
      }
      
      if (suggestions.length > 0) {
        return {
          azureDevOpsUrl: {
            message: 'Please enter a valid Azure DevOps organization URL',
            suggestions
          }
        };
      }
      
      return null;
    },

    /**
     * Personal Access Token validator
     */
    personalAccessToken(control: AbstractControl): ValidationErrors | null {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      const suggestions = [];
      
      // Basic length check (Azure DevOps PATs are typically 52 characters)
      if (value.length < 20) {
        suggestions.push('Token appears too short');
      } else if (value.length > 100) {
        suggestions.push('Token appears too long');
      }
      
      // Check for common patterns
      if (value.includes(' ')) {
        suggestions.push('Token should not contain spaces');
      }
      
      // Check for Base64-like pattern (Azure DevOps PATs are Base64 encoded)
      const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
      if (!base64Pattern.test(value)) {
        suggestions.push('Token format appears invalid');
      }
      
      if (suggestions.length > 0) {
        return {
          personalAccessToken: {
            message: 'Personal Access Token format may be invalid',
            suggestions: [
              ...suggestions,
              'Generate a new token from Azure DevOps if needed'
            ]
          }
        };
      }
      
      return null;
    },

    /**
     * Project name validator
     */
    projectName(control: AbstractControl): ValidationErrors | null {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      const suggestions = [];
      
      // Azure DevOps project name constraints
      if (value.length < 1) {
        suggestions.push('Project name cannot be empty');
      } else if (value.length > 64) {
        suggestions.push('Project name cannot exceed 64 characters');
      }
      
      // Check for invalid characters
      const invalidChars = /[<>:"|?*\\\/]/;
      if (invalidChars.test(value)) {
        suggestions.push('Project name contains invalid characters');
        suggestions.push('Avoid: < > : " | ? * \\ /');
      }
      
      // Check for reserved names
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
      if (reservedNames.includes(value.toUpperCase())) {
        suggestions.push('This is a reserved name');
      }
      
      if (suggestions.length > 0) {
        return {
          projectName: {
            message: 'Project name is invalid',
            suggestions
          }
        };
      }
      
      return null;
    },

    /**
     * Minimum length validator with context
     */
    minLength(min: number, fieldName: string = 'This field'): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        
        const length = control.value.toString().length;
        if (length < min) {
          return {
            minlength: {
              message: `${fieldName} must be at least ${min} characters long`,
              suggestions: [`Current length: ${length}, required: ${min}`]
            }
          };
        }
        
        return null;
      };
    },

    /**
     * Maximum length validator with context
     */
    maxLength(max: number, fieldName: string = 'This field'): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        
        const length = control.value.toString().length;
        if (length > max) {
          return {
            maxlength: {
              message: `${fieldName} cannot exceed ${max} characters`,
              suggestions: [`Current length: ${length}, maximum: ${max}`]
            }
          };
        }
        
        return null;
      };
    },

    /**
     * Pattern validator with helpful messages
     */
    pattern(pattern: RegExp, message: string, suggestions: string[]): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) return null;
        
        if (!pattern.test(control.value)) {
          return {
            pattern: {
              message,
              suggestions
            }
          };
        }
        
        return null;
      };
    }
  };

  /**
   * Async validators
   */
  static AsyncValidators = {
    /**
     * Check if Azure DevOps organization exists
     */
    checkAzureDevOpsOrganization(): AsyncValidatorFn {
      return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!control.value) {
          return of(null);
        }

        // Add debounce to avoid too many requests
        return timer(500).pipe(
          switchMap(() => {
            // This would make an actual API call to check organization
            // For now, we'll simulate it
            return of(control.value).pipe(
              map(value => {
                // Simulate validation logic
                if (value.includes('invalid')) {
                  return {
                    organizationNotFound: {
                      message: 'Azure DevOps organization not found',
                      suggestions: [
                        'Check the organization name spelling',
                        'Verify the organization exists and is accessible',
                        'Ensure you have access to the organization'
                      ]
                    }
                  };
                }
                return null;
              }),
              catchError(() => of({
                validationError: {
                  message: 'Unable to verify organization',
                  suggestions: ['Check your network connection and try again']
                }
              }))
            );
          })
        );
      };
    },

    /**
     * Test Personal Access Token validity
     */
    testPersonalAccessToken(): AsyncValidatorFn {
      return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!control.value) {
          return of(null);
        }

        return timer(1000).pipe(
          switchMap(() => {
            // This would make an actual API call to test the token
            return of(control.value).pipe(
              map(value => {
                // Simulate token validation
                if (value === 'invalid-token') {
                  return {
                    invalidToken: {
                      message: 'Personal Access Token is invalid',
                      suggestions: [
                        'Check if the token has expired',
                        'Verify the token has the required permissions',
                        'Generate a new token if needed'
                      ]
                    }
                  };
                }
                return null;
              }),
              catchError(() => of({
                tokenTestError: {
                  message: 'Unable to verify token',
                  suggestions: ['Check your network connection and try again']
                }
              }))
            );
          })
        );
      };
    }
  };

  /**
   * Update field validation state
   */
  updateFieldState(fieldName: string, state: Partial<FieldValidationState>): void {
    const current = this._validationStates();
    const existingState = current.get(fieldName) || {
      fieldName,
      isValid: true,
      isValidating: false,
      errors: null,
      suggestions: [],
      touched: false,
      dirty: false
    };

    const updated = { ...existingState, ...state };
    const newMap = new Map(current);
    newMap.set(fieldName, updated);
    this._validationStates.set(newMap);
  }

  /**
   * Get field validation state
   */
  getFieldState(fieldName: string): FieldValidationState | undefined {
    return this._validationStates().get(fieldName);
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    const states = Array.from(this._validationStates().values());
    return states.every(state => state.isValid && !state.isValidating);
  }

  /**
   * Get all form errors
   */
  getFormErrors(): { [fieldName: string]: ValidationErrors } {
    const errors: { [fieldName: string]: ValidationErrors } = {};
    
    this._validationStates().forEach((state, fieldName) => {
      if (state.errors) {
        errors[fieldName] = state.errors;
      }
    });
    
    return errors;
  }

  /**
   * Clear field validation state
   */
  clearFieldState(fieldName: string): void {
    const current = this._validationStates();
    const newMap = new Map(current);
    newMap.delete(fieldName);
    this._validationStates.set(newMap);
  }

  /**
   * Clear all validation states
   */
  clearAllStates(): void {
    this._validationStates.set(new Map());
  }

  /**
   * Get validation summary for display
   */
  getValidationSummary(): {
    totalFields: number;
    validFields: number;
    invalidFields: number;
    validatingFields: number;
    isFormReady: boolean;
  } {
    const states = Array.from(this._validationStates().values());
    
    return {
      totalFields: states.length,
      validFields: states.filter(s => s.isValid && !s.isValidating).length,
      invalidFields: states.filter(s => !s.isValid).length,
      validatingFields: states.filter(s => s.isValidating).length,
      isFormReady: this.isFormValid()
    };
  }

  /**
   * Validate field and update state
   */
  validateField(
    fieldName: string,
    value: any,
    validators: ValidatorFn[],
    asyncValidators?: AsyncValidatorFn[]
  ): void {
    // Create a mock control for validation
    const control = {
      value,
      errors: null
    } as AbstractControl;

    let errors: ValidationErrors | null = null;
    const suggestions: string[] = [];

    // Run synchronous validators
    for (const validator of validators) {
      const result = validator(control);
      if (result) {
        errors = errors ? Object.assign({}, errors, result) : result;
        
        // Extract suggestions from error objects
        Object.values(result).forEach((error: any) => {
          if (error.suggestions) {
            suggestions.push(...error.suggestions);
          }
        });
      }
    }

    // Update field state
    this.updateFieldState(fieldName, {
      isValid: !errors,
      errors,
      suggestions,
      dirty: true,
      isValidating: !!(asyncValidators && asyncValidators.length > 0)
    });

    // Run async validators if present
    if (asyncValidators && asyncValidators.length > 0 && !errors) {
      asyncValidators.forEach(asyncValidator => {
        const result = asyncValidator(control);
        
        // Handle both Observable and Promise returns
        if (result && typeof result === 'object' && 'subscribe' in result) {
          (result as Observable<ValidationErrors | null>).subscribe({
            next: (asyncErrors: ValidationErrors | null) => {
              this.updateFieldState(fieldName, {
                isValid: !asyncErrors,
                errors: asyncErrors,
                suggestions: asyncErrors ? this.extractSuggestions(asyncErrors) : [],
                isValidating: false
              });
            },
            error: () => {
              this.updateFieldState(fieldName, {
                isValid: false,
                errors: { asyncValidationFailed: { message: 'Validation failed' } },
                suggestions: ['Validation failed. Please try again.'],
                isValidating: false
              });
            }
          });
        }
      });
    }
  }

  /**
   * Extract suggestions from validation errors
   */
  private extractSuggestions(errors: ValidationErrors): string[] {
    const suggestions: string[] = [];
    
    Object.values(errors).forEach((error: any) => {
      if (error.suggestions) {
        suggestions.push(...error.suggestions);
      }
    });
    
    return suggestions;
  }

  /**
   * Mark field as touched
   */
  markFieldAsTouched(fieldName: string): void {
    this.updateFieldState(fieldName, { touched: true });
  }

  /**
   * Get error message for field
   */
  getFieldErrorMessage(fieldName: string): string | null {
    const state = this.getFieldState(fieldName);
    if (!state || !state.errors) return null;
    
    const firstError = Object.values(state.errors)[0] as any;
    return firstError?.message || 'Validation error';
  }

  /**
   * Get suggestions for field
   */
  getFieldSuggestions(fieldName: string): string[] {
    const state = this.getFieldState(fieldName);
    return state?.suggestions || [];
  }
}