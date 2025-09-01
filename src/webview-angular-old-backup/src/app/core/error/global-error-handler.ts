import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { ErrorHandlerService } from '../services/error-handler.service';

/**
 * Global error handler that implements Angular's ErrorHandler interface
 * Integrates with our custom error handling service for comprehensive error management
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  private errorHandlerService = inject(ErrorHandlerService);
  private ngZone = inject(NgZone);

  /**
   * Handle global errors
   */
  handleError(error: unknown): void {
    // Run error handling outside Angular zone to prevent infinite loops
    this.ngZone.runOutsideAngular(() => {
      try {
        const asError = error instanceof Error ? error : new Error(String(error));
        console.error('Global error caught (detailed):', {
          name: asError.name,
          message: asError.message,
          stack: asError.stack,
          ngErrorCode: (asError as any)?.ngErrorCode,
          code: (asError as any)?.code,
          original: error
        });
      } catch (e) {
        console.error('Global error caught:', error);
      }

      let errorMessage = 'An unexpected error occurred';
      let errorContext = 'Angular Global Error Handler';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

      // Extract meaningful error information
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Determine context from stack trace
        if (error.stack) {
          if (error.stack.includes('ChunkLoadError')) {
            errorContext = 'Code Splitting / Lazy Loading';
            severity = 'critical';
          } else if (error.stack.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
            errorContext = 'Angular Change Detection';
            severity = 'medium';
          } else if (error.stack.includes('HttpErrorResponse')) {
            errorContext = 'HTTP Request';
            severity = 'high';
          } else if (error.stack.includes('TypeError: Cannot read')) {
            errorContext = 'Property Access';
            severity = 'medium';
          } else if (error.stack.includes('ReferenceError')) {
            errorContext = 'Variable Reference';
            severity = 'high';
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if ((error as { message?: unknown })?.message) {
        const msg = (error as { message?: unknown }).message;
        if (typeof msg === 'string') {
          errorMessage = msg;
        }
      }

      // Special handling for specific error types
      if (errorMessage.includes('Loading chunk')) {
        severity = 'critical';
        errorContext = 'Module Loading Failure';
      } else if (errorMessage.includes('Script error')) {
        severity = 'medium';
        errorContext = 'Cross-Origin Script Error';
      }

      // Handle the error through our service
      this.errorHandlerService.handleError(
        error instanceof Error ? error : new Error(errorMessage),
        errorContext,
        severity,
        this.getRecoveryActions(errorContext, severity)
      );
    });
  }

  /**
   * Get appropriate recovery actions based on error context and severity
   */
  private getRecoveryActions(
    context: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Array<{ label: string; action: () => void }> {
    const actions: Array<{ label: string; action: () => void }> = [];

    switch (context) {
      case 'Code Splitting / Lazy Loading':
      case 'Module Loading Failure':
        actions.push({
          label: 'Reload Application',
          action: () => window.location.reload()
        });
        break;

      case 'Angular Change Detection':
        if (severity === 'medium') {
          actions.push({
            label: 'Refresh View',
            action: () => {
              // Trigger a gentle refresh by dispatching a custom event
              window.dispatchEvent(new CustomEvent('refresh-view'));
            }
          });
        }
        break;

      case 'HTTP Request':
        actions.push({
          label: 'Retry Request',
          action: () => {
            // Dispatch event to retry last failed request
            window.dispatchEvent(new CustomEvent('retry-last-request'));
          }
        });
        actions.push({
          label: 'Check Connection',
          action: () => {
            // Open connection diagnostics
            window.dispatchEvent(new CustomEvent('check-connection'));
          }
        });
        break;

      case 'Property Access':
      case 'Variable Reference':
        if (severity >= 'medium') {
          actions.push({
            label: 'Reset View State',
            action: () => {
              // Reset component state
              window.dispatchEvent(new CustomEvent('reset-view-state'));
            }
          });
        }
        break;
    }

    // Always provide a fallback action for critical errors
    if (severity === 'critical') {
      actions.push({
        label: 'Emergency Reset',
        action: () => {
          // Clear all local storage and reload
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.warn('Could not clear storage:', e);
          }
          window.location.reload();
        }
      });
    }

    return actions;
  }
}
