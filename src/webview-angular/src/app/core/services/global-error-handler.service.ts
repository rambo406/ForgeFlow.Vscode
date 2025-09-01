import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';
import { NotificationService } from './notification.service';

// VS Code webview API interface
declare global {
  interface Window {
    vscode?: {
      postMessage(message: unknown): void;
    };
  }
}

/**
 * Global Angular error handler that integrates with our custom error handling service
 * Provides comprehensive error recovery and user feedback
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorHandlerService = inject(ErrorHandlerService);
  private notificationService = inject(NotificationService);

  handleError(error: unknown): void {
    // Extract the actual error
    let actualError: Error;
    
    if ((error as { rejection?: unknown })?.rejection) {
      // Promise rejection
      const rej = (error as { rejection: unknown }).rejection;
      actualError = rej instanceof Error ? rej : new Error(String(rej));
    } else if ((error as { error?: unknown })?.error) {
      // HTTP error response
      const inner = (error as { error: unknown }).error;
      actualError = inner instanceof Error ? inner : new Error(String(inner));
    } else if (error instanceof Error) {
      actualError = error;
    } else {
      actualError = new Error(String(error));
    }

    // Determine context and recovery actions based on error properties
    const errorInfo = this.categorizeError(error, actualError);

    // Handle with our custom service
    this.errorHandlerService.handleError(actualError, errorInfo.context, errorInfo.severity);

    // Show user-friendly error notification with recovery options
    this.showUserErrorNotification(errorInfo);

    // Also log to console for development
    console.error('Global Error Handler:', error);
  }

  /**
   * Categorize error and determine appropriate recovery actions
   */
  private categorizeError(originalError: unknown, actualError: Error): ErrorInfo {
    let context = 'Angular Application';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let recoveryActions: RecoveryAction[] = [];
    let userMessage = 'An unexpected error occurred';

    // Chunk loading errors (code splitting failures)
    if (actualError.message.includes('ChunkLoadError') || 
        actualError.message.includes('Loading chunk')) {
      severity = 'high';
      context = 'Code Loading Error';
      userMessage = 'Failed to load application code. This may be due to a network issue or app update.';
      recoveryActions = [
        {
          label: 'Refresh Application',
          action: () => window.location.reload(),
          primary: true,
          description: 'Reload the application to get the latest code'
        },
        {
          label: 'Clear Cache',
          action: () => this.clearCacheAndReload(),
          primary: false,
          description: 'Clear browser cache and reload'
        }
      ];
    }
    // Angular change detection errors
    else if (actualError.message.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
      severity = 'medium';
      context = 'Angular Change Detection';
      userMessage = 'Application state inconsistency detected. This is usually a temporary issue.';
      recoveryActions = [
        {
          label: 'Refresh View',
          action: () => this.triggerChangeDetection(),
          primary: true,
          description: 'Refresh the current view'
        }
      ];
    }
    // Network/HTTP errors
    else if (actualError.message.includes('Http failure') || 
             actualError.message.includes('NetworkError') ||
             (originalError as { status?: number } | undefined)?.status) {
      severity = 'high';
      context = 'Network Error';
      const status = (originalError as { status?: number } | undefined)?.status;
      
      if (status === 401 || status === 403) {
        userMessage = 'Authentication failed. Please check your credentials.';
        recoveryActions = [
          {
            label: 'Open Settings',
            action: () => this.openConfigurationView(),
            primary: true,
            description: 'Update your authentication settings'
          }
        ];
      } else if (status >= 500) {
        userMessage = 'Server error occurred. The service may be temporarily unavailable.';
        recoveryActions = [
          {
            label: 'Retry',
            action: () => this.triggerRetry(),
            primary: true,
            description: 'Retry the last operation'
          }
        ];
      } else {
        userMessage = 'Network connection failed. Please check your internet connection.';
        recoveryActions = [
          {
            label: 'Retry Connection',
            action: () => this.testConnection(),
            primary: true,
            description: 'Test the network connection'
          }
        ];
      }
    }
    // Configuration errors
    else if (actualError.message.toLowerCase().includes('configuration') || 
             actualError.message.toLowerCase().includes('config')) {
      severity = 'high';
      context = 'Configuration Error';
      userMessage = 'Application configuration error. Please check your settings.';
      recoveryActions = [
        {
          label: 'Open Configuration',
          action: () => this.openConfigurationView(),
          primary: true,
          description: 'Review and update configuration settings'
        },
        {
          label: 'Reset Settings',
          action: () => this.resetToDefaults(),
          primary: false,
          description: 'Reset to default configuration'
        }
      ];
    }
    // Memory/Performance errors
    else if (actualError.message.includes('memory') || 
             actualError.name === 'QuotaExceededError') {
      severity = 'medium';
      context = 'Performance Error';
      userMessage = 'Memory limit reached. Try reducing the data load or closing other browser tabs.';
      recoveryActions = [
        {
          label: 'Clear Data',
          action: () => this.clearCachedData(),
          primary: true,
          description: 'Clear cached data to free memory'
        },
        {
          label: 'Refresh',
          action: () => window.location.reload(),
          primary: false,
          description: 'Refresh the application'
        }
      ];
    }
    // Third-party library errors
    else if (actualError.stack?.includes('node_modules')) {
      severity = 'medium';
      context = 'Third-party Library';
      userMessage = 'A component library error occurred. This may be a temporary issue.';
      recoveryActions = [
        {
          label: 'Refresh',
          action: () => window.location.reload(),
          primary: true,
          description: 'Refresh the application'
        }
      ];
    }
    // Unknown errors
    else {
      severity = 'high';
      context = 'Unknown Error';
      userMessage = 'An unexpected error occurred. Please try refreshing the application.';
      recoveryActions = [
        {
          label: 'Refresh',
          action: () => window.location.reload(),
          primary: true,
          description: 'Refresh the application'
        },
        {
          label: 'Copy Error Details',
          action: () => this.copyErrorToClipboard(actualError),
          primary: false,
          description: 'Copy error details to clipboard for support'
        }
      ];
    }

    return {
      context,
      severity,
      userMessage,
      recoveryActions
    };
  }

  /**
   * Show user-friendly error notification with recovery options
   */
  private showUserErrorNotification(errorInfo: ErrorInfo): void {
    const actions = errorInfo.recoveryActions.map(action => ({
      label: action.label,
      action: action.action,
      primary: action.primary
    }));

    switch (errorInfo.severity) {
      case 'critical':
        this.notificationService.showError(
          'Critical Error',
          errorInfo.userMessage,
          { persistent: true, actions }
        );
        break;
        
      case 'high':
        this.notificationService.showError(
          'Error',
          errorInfo.userMessage,
          { duration: 10000, actions }
        );
        break;
        
      case 'medium':
        this.notificationService.showWarning(
          'Warning',
          errorInfo.userMessage,
          { duration: 7000, actions }
        );
        break;
        
      case 'low':
        // Only log low severity errors, don't show to user
        console.warn('Low severity error:', errorInfo.userMessage);
        break;
    }
  }

  // Recovery action implementations
  private clearCacheAndReload(): void {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      }).finally(() => {
        (window as any).location.reload();
      });
    } else {
      (window as any).location.reload();
    }
  }

  private triggerChangeDetection(): void {
    // This would need to be implemented based on the application structure
    this.notificationService.showInfo('Refreshing View', 'Triggering view refresh...');
    setTimeout(() => (window as any).location.reload(), 1000);
  }

  private openConfigurationView(): void {
    // Send message to switch to configuration view
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'updateView',
        payload: { view: 'configuration' }
      });
    }
  }

  private triggerRetry(): void {
    this.notificationService.showInfo('Retrying', 'Retrying last operation...');
    // This would need to be implemented based on what operation failed
  }

  private testConnection(): void {
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'testConnection',
        payload: {}
      });
    }
  }

  private resetToDefaults(): void {
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'resetSettings',
        payload: { includeSecrets: false }
      });
    }
  }

  private clearCachedData(): void {
    // Clear any cached data
    localStorage.clear();
    sessionStorage.clear();
    
    this.notificationService.showSuccess('Cache Cleared', 'Cached data has been cleared');
  }

  private copyErrorToClipboard(error: Error): void {
    const errorText = `Error: ${error.message}\nStack: ${error.stack || 'No stack trace'}\nTimestamp: ${new Date().toISOString()}\nURL: ${window.location.href}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorText).then(() => {
        this.notificationService.showSuccess('Copied', 'Error details copied to clipboard');
      }).catch(() => {
        console.error('Failed to copy error to clipboard');
        this.notificationService.showError('Copy Failed', 'Failed to copy to clipboard');
      });
    } else {
      console.error('Clipboard API not available');
      this.notificationService.showError('Copy Failed', 'Clipboard not available');
    }
  }
}

interface ErrorInfo {
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  recoveryActions: RecoveryAction[];
}

interface RecoveryAction {
  label: string;
  action: () => void;
  primary: boolean;
  description: string;
}
