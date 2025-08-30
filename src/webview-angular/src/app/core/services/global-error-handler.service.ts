import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Global Angular error handler that integrates with our custom error handling service
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorHandlerService = inject(ErrorHandlerService);

  handleError(error: any): void {
    // Extract the actual error
    let actualError: Error;
    
    if (error?.rejection) {
      // Promise rejection
      actualError = error.rejection instanceof Error ? error.rejection : new Error(error.rejection);
    } else if (error?.error) {
      // HTTP error response
      actualError = error.error instanceof Error ? error.error : new Error(error.error);
    } else if (error instanceof Error) {
      actualError = error;
    } else {
      actualError = new Error(String(error));
    }

    // Determine context based on error properties
    let context = 'Angular Application';
    if (error?.source) {
      context = `Angular: ${error.source}`;
    } else if (error?.rejection) {
      context = 'Promise Rejection';
    } else if (error?.error) {
      context = 'HTTP Error';
    }

    // Determine severity based on error type
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (actualError.message.includes('ChunkLoadError') || 
        actualError.message.includes('Loading chunk')) {
      severity = 'high';
      context = 'Code Splitting Error';
    } else if (actualError.message.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
      severity = 'medium';
      context = 'Angular Change Detection';
    } else if (actualError.message.includes('Http failure') || 
               actualError.message.includes('NetworkError')) {
      severity = 'high';
      context = 'Network Error';
    } else if (actualError.stack?.includes('node_modules')) {
      severity = 'medium';
      context = 'Third-party Library';
    }

    // Handle with our custom service
    this.errorHandlerService.handleError(actualError, context, severity);

    // Also log to console for development
    console.error('Global Error Handler:', error);
  }
}