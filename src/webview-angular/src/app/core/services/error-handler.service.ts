import { Injectable, signal, ErrorHandler, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import { ErrorMessageService } from './error-message.service';

/**
 * Error log interface
 */
export interface ErrorLog {
  id: string;
  error: Error;
  context: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
  retryCount: number;
}

/**
 * Enhanced error handler with recovery strategies
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private _errors = signal<ErrorLog[]>([]);
  private _isOffline = signal(false);
  private errorMessageService = inject(ErrorMessageService);
  
  readonly errors = this._errors.asReadonly();
  readonly isOffline = this._isOffline.asReadonly();

  constructor(private notificationService: NotificationService) {
    this.setupGlobalErrorHandling();
    this.setupNetworkDetection();
  }

  /**
   * Set up global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(event.reason),
        'Unhandled Promise Rejection',
        'high'
      );
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        'Global Error',
        'high'
      );
    });
  }

  /**
   * Set up network connection detection
   */
  private setupNetworkDetection(): void {
    this._isOffline.set(!navigator.onLine);

    window.addEventListener('online', () => {
      this._isOffline.set(false);
      this.notificationService.showSuccess('Connection restored');
    });

    window.addEventListener('offline', () => {
      this._isOffline.set(true);
      this.notificationService.showWarning(
        'Connection lost',
        'Working in offline mode. Some features may be limited.'
      );
    });
  }

  /**
   * Handle error with context and recovery options
   */
  handleError(
    error: Error,
    context: string = 'Unknown',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recoveryActions?: Array<{ label: string; action: () => void }>
  ): string {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error,
      context,
      timestamp: new Date(),
      severity,
      handled: false,
      retryCount: 0
    };

    // Add to error log
    const current = this._errors();
    this._errors.set([...current, errorLog]);

    // Determine user notification based on severity
    switch (severity) {
      case 'critical':
        return this.handleCriticalError(errorLog, recoveryActions);
      case 'high':
        return this.handleHighError(errorLog, recoveryActions);
      case 'medium':
        return this.handleMediumError(errorLog, recoveryActions);
      case 'low':
        return this.handleLowError(errorLog);
    }
  }

  /**
   * Handle critical errors that might break the application
   */
  private handleCriticalError(
    errorLog: ErrorLog,
    recoveryActions?: Array<{ label: string; action: () => void }>
  ): string {
    console.error('CRITICAL ERROR:', errorLog.error, errorLog.context);

    // Create user-friendly error message
    const userFriendlyError = this.errorMessageService.createUserFriendlyError(
      errorLog.error,
      errorLog.context
    );

    const actions = [
      ...(userFriendlyError.recoveryActions?.map(action => ({
        label: action.label,
        action: action.action
      })) || []),
      ...(recoveryActions || []),
      {
        label: 'Reload Application',
        action: () => window.location.reload()
      }
    ];

    return this.notificationService.showPersistent(
      'error',
      userFriendlyError.title,
      userFriendlyError.message,
      actions
    );
  }

  /**
   * Handle high severity errors that affect major functionality
   */
  private handleHighError(
    errorLog: ErrorLog,
    recoveryActions?: Array<{ label: string; action: () => void }>
  ): string {
    console.error('HIGH ERROR:', errorLog.error, errorLog.context);

    // Create user-friendly error message
    const userFriendlyError = this.errorMessageService.createUserFriendlyError(
      errorLog.error,
      errorLog.context
    );

    const actions = [
      ...(userFriendlyError.recoveryActions?.map(action => ({
        label: action.label,
        action: action.action
      })) || []),
      ...(recoveryActions || []),
      {
        label: 'Report Issue',
        action: () => this.reportError(errorLog)
      }
    ];

    return this.notificationService.showError(
      userFriendlyError.title,
      userFriendlyError.message,
      {
        persistent: true,
        actions,
        details: userFriendlyError.details
      }
    );
  }

  /**
   * Handle medium severity errors with automatic retry
   */
  private handleMediumError(
    errorLog: ErrorLog,
    recoveryActions?: Array<{ label: string; action: () => void }>
  ): string {
    console.warn('MEDIUM ERROR:', errorLog.error, errorLog.context);

    // Create user-friendly error message
    const userFriendlyError = this.errorMessageService.createUserFriendlyError(
      errorLog.error,
      errorLog.context
    );

    const actions = [
      ...(userFriendlyError.recoveryActions?.map(action => ({
        label: action.label,
        action: action.action
      })) || []),
      ...(recoveryActions || [])
    ];

    return this.notificationService.showWarning(
      userFriendlyError.title,
      userFriendlyError.message,
      {
        actions,
        details: userFriendlyError.details
      }
    );
  }

  /**
   * Handle low severity errors (logged but not shown to user)
   */
  private handleLowError(errorLog: ErrorLog): string {
    console.info('LOW ERROR:', errorLog.error, errorLog.context);
    
    // Don't show notification for low severity errors
    return '';
  }

  /**
   * Handle API errors with specific recovery strategies
   */
  handleApiError(
    error: Error,
    operation: string,
    retryAction?: () => Promise<any>
  ): string {
    // Determine error type and severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let recoveryActions: Array<{ label: string; action: () => void }> = [];

    if (this._isOffline()) {
      severity = 'high';
      recoveryActions.push({
        label: 'Try Again When Online',
        action: () => {
          // Set up listener for when connection is restored
          const checkOnline = () => {
            if (navigator.onLine && retryAction) {
              retryAction().catch(err => 
                this.handleApiError(err, operation, retryAction)
              );
              window.removeEventListener('online', checkOnline);
            }
          };
          window.addEventListener('online', checkOnline);
        }
      });
    } else if (retryAction) {
      recoveryActions.push({
        label: 'Retry',
        action: () => retryAction().catch(err => 
          this.handleApiError(err, operation, retryAction)
        )
      });
    }

    // Check for specific error types
    if (error.message.includes('timeout')) {
      severity = 'medium';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      severity = 'high';
      recoveryActions.push({
        label: 'Check Configuration',
        action: () => {
          // Navigate to configuration view
          window.dispatchEvent(new CustomEvent('navigate-to-config'));
        }
      });
    } else if (error.message.includes('500')) {
      severity = 'high';
    }

    return this.handleError(error, `API ${operation}`, severity, recoveryActions);
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    field: string,
    message: string,
    value?: unknown
  ): string {
    const error = new Error(`Validation failed for ${field}: ${message}`);
    return this.handleError(error, 'Form Validation', 'low');
  }

  /**
   * Retry an operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          this.handleError(
            error instanceof Error ? error : new Error(String(error)),
            context,
            'high'
          );
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} for ${context}`);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Report error to extension host
   */
  private reportError(errorLog: ErrorLog): void {
    try {
      // Check if we're in VS Code webview environment
      if (typeof (window as any).acquireVsCodeApi !== 'undefined') {
        const vscode = (window as any).acquireVsCodeApi();
        vscode.postMessage({
          type: 'error-report',
          payload: {
            id: errorLog.id,
            error: {
              message: errorLog.error.message,
              stack: errorLog.error.stack,
              name: errorLog.error.name
            },
            context: errorLog.context,
            timestamp: errorLog.timestamp.toISOString(),
            severity: errorLog.severity,
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        });
        
        this.notificationService.showSuccess('Error reported successfully');
      }
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  /**
   * Clear error log
   */
  clearErrors(): void {
    this._errors.set([]);
  }

  /**
   * Get error by ID
   */
  getError(id: string): ErrorLog | undefined {
    return this._errors().find((e: ErrorLog) => e.id === id);
  }

  /**
   * Mark error as handled
   */
  markErrorAsHandled(id: string): void {
    const current = this._errors();
    const updated = current.map((error: ErrorLog) => 
      error.id === id ? { ...error, handled: true } : error
    );
    this._errors.set(updated);
  }

  /**
   * Get unhandled errors count
   */
  getUnhandledErrorsCount(): number {
    return this._errors().filter((e: ErrorLog) => !e.handled).length;
  }

  /**
   * Safe function execution wrapper
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        'medium'
      );
      return fallbackValue;
    }
  }
}
