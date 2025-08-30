import { Injectable } from '@angular/core';

/**
 * User-friendly error message interface
 */
export interface ErrorMessage {
  title: string;
  message: string;
  details?: string;
  actionable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestions: string[];
  recoveryActions?: Array<{
    label: string;
    description: string;
    action: () => void;
  }>;
}

/**
 * Service for converting technical errors into user-friendly messages
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorMessageService {

  /**
   * Error patterns and their user-friendly equivalents
   */
  private readonly ERROR_PATTERNS = [
    // Network and connectivity errors
    {
      pattern: /network|connection|timeout|unreachable/i,
      category: 'network',
      title: 'Connection Problem',
      message: 'Unable to connect to Azure DevOps. Please check your network connection.',
      severity: 'high' as const,
      suggestions: [
        'Check your internet connection',
        'Verify Azure DevOps is accessible from your network',
        'Check if you\'re behind a firewall or proxy',
        'Try refreshing the page'
      ]
    },
    
    // Authentication errors
    {
      pattern: /401|unauthorized|authentication|token|expired/i,
      category: 'auth',
      title: 'Authentication Failed',
      message: 'Your credentials are invalid or have expired.',
      severity: 'high' as const,
      suggestions: [
        'Check your Personal Access Token',
        'Verify the token has the required permissions',
        'Generate a new token if the current one has expired',
        'Ensure you\'re connected to the correct Azure DevOps organization'
      ]
    },
    
    // Permission errors
    {
      pattern: /403|forbidden|permission|access denied/i,
      category: 'permission',
      title: 'Access Denied',
      message: 'You don\'t have permission to access this resource.',
      severity: 'high' as const,
      suggestions: [
        'Contact your Azure DevOps administrator',
        'Verify you have the required project permissions',
        'Check if your token has the necessary scopes',
        'Ensure you\'re a member of the project'
      ]
    },
    
    // Resource not found errors
    {
      pattern: /404|not found|does not exist/i,
      category: 'notfound',
      title: 'Resource Not Found',
      message: 'The requested resource could not be found.',
      severity: 'medium' as const,
      suggestions: [
        'Check if the project or repository still exists',
        'Verify you\'re using the correct project name',
        'Refresh the data to get the latest information',
        'Contact your team if the resource was recently moved'
      ]
    },
    
    // Server errors
    {
      pattern: /500|502|503|504|server error|internal error/i,
      category: 'server',
      title: 'Server Error',
      message: 'Azure DevOps is experiencing technical difficulties.',
      severity: 'high' as const,
      suggestions: [
        'Wait a few minutes and try again',
        'Check Azure DevOps status page',
        'Try a different operation to test connectivity',
        'Contact Azure DevOps support if the issue persists'
      ]
    },
    
    // Rate limiting errors
    {
      pattern: /429|too many requests|rate limit|throttled/i,
      category: 'ratelimit',
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please slow down.',
      severity: 'medium' as const,
      suggestions: [
        'Wait a few minutes before trying again',
        'Reduce the frequency of your requests',
        'Consider processing items in smaller batches',
        'Check if other tools are also using the API'
      ]
    },
    
    // API quota errors
    {
      pattern: /quota|limit exceeded|usage limit/i,
      category: 'quota',
      title: 'Usage Limit Exceeded',
      message: 'Your Azure DevOps API usage limit has been reached.',
      severity: 'medium' as const,
      suggestions: [
        'Wait until your quota resets',
        'Review your API usage patterns',
        'Consider upgrading your Azure DevOps plan',
        'Optimize requests to use fewer API calls'
      ]
    },
    
    // Configuration errors
    {
      pattern: /configuration|config|setting|invalid/i,
      category: 'config',
      title: 'Configuration Error',
      message: 'There\'s an issue with your extension configuration.',
      severity: 'medium' as const,
      suggestions: [
        'Check your Azure DevOps organization URL',
        'Verify your Personal Access Token',
        'Review project and repository settings',
        'Reset configuration to defaults and reconfigure'
      ]
    },
    
    // File system errors
    {
      pattern: /file|path|directory|ENOENT|EACCES/i,
      category: 'filesystem',
      title: 'File System Error',
      message: 'Unable to access files or directories.',
      severity: 'medium' as const,
      suggestions: [
        'Check file and directory permissions',
        'Ensure the path exists and is accessible',
        'Verify VS Code has necessary permissions',
        'Try restarting VS Code with elevated permissions'
      ]
    },
    
    // AI/Language model errors
    {
      pattern: /ai|language model|openai|anthropic|model|completion/i,
      category: 'ai',
      title: 'AI Service Error',
      message: 'The AI language model service is unavailable.',
      severity: 'medium' as const,
      suggestions: [
        'Check your AI service configuration',
        'Verify your API key is valid',
        'Ensure you have sufficient credits/quota',
        'Try selecting a different language model'
      ]
    },
    
    // Git/Repository errors
    {
      pattern: /git|repository|clone|push|pull|branch/i,
      category: 'git',
      title: 'Repository Error',
      message: 'Unable to access or process the Git repository.',
      severity: 'medium' as const,
      suggestions: [
        'Ensure the repository is accessible',
        'Check your Git credentials',
        'Verify the branch or commit exists',
        'Try refreshing the repository information'
      ]
    },
    
    // Parsing/Format errors
    {
      pattern: /parse|format|syntax|json|xml|invalid format/i,
      category: 'format',
      title: 'Data Format Error',
      message: 'Unable to process the data format.',
      severity: 'low' as const,
      suggestions: [
        'Check if the data format is correct',
        'Verify the source data is not corrupted',
        'Try refreshing to get fresh data',
        'Report this issue if it persists'
      ]
    }
  ];

  /**
   * Convert technical error to user-friendly message
   */
  createUserFriendlyError(
    error: Error,
    context: string = 'Unknown operation',
    originalOperation?: () => void
  ): ErrorMessage {
    const errorText = `${error.message} ${error.stack || ''}`.toLowerCase();
    
    // Find matching pattern
    const pattern = this.ERROR_PATTERNS.find(p => p.pattern.test(errorText));
    
    if (pattern) {
      return this.createErrorFromPattern(pattern, error, context, originalOperation);
    }
    
    // Default error message for unrecognized errors
    return this.createGenericError(error, context, originalOperation);
  }

  /**
   * Create error message from recognized pattern
   */
  private createErrorFromPattern(
    pattern: any,
    error: Error,
    context: string,
    originalOperation?: () => void
  ): ErrorMessage {
    const recoveryActions = this.getRecoveryActions(pattern.category, originalOperation);
    
    return {
      title: pattern.title,
      message: `${pattern.message} (During: ${context})`,
      details: error.stack,
      actionable: recoveryActions.length > 0,
      severity: pattern.severity,
      suggestions: pattern.suggestions,
      recoveryActions
    };
  }

  /**
   * Create generic error message for unrecognized errors
   */
  private createGenericError(
    error: Error,
    context: string,
    originalOperation?: () => void
  ): ErrorMessage {
    const recoveryActions: Array<{
      label: string;
      description: string;
      action: () => void;
    }> = [];

    if (originalOperation) {
      recoveryActions.push({
        label: 'Try Again',
        description: 'Retry the operation',
        action: originalOperation
      });
    }

    recoveryActions.push({
      label: 'Report Issue',
      description: 'Report this error for investigation',
      action: () => this.reportError(error, context)
    });

    return {
      title: 'Unexpected Error',
      message: `An unexpected error occurred during ${context}.`,
      details: `${error.message}\n\n${error.stack || ''}`,
      actionable: true,
      severity: 'medium',
      suggestions: [
        'Try the operation again',
        'Check your network connection',
        'Restart VS Code if the issue persists',
        'Report the issue if it continues to occur'
      ],
      recoveryActions
    };
  }

  /**
   * Get recovery actions based on error category
   */
  private getRecoveryActions(
    category: string,
    originalOperation?: () => void
  ): Array<{
    label: string;
    description: string;
    action: () => void;
  }> {
    const actions: Array<{
      label: string;
      description: string;
      action: () => void;
    }> = [];

    switch (category) {
      case 'network':
        actions.push({
          label: 'Check Connection',
          description: 'Test your network connectivity',
          action: () => this.testNetworkConnection()
        });
        if (originalOperation) {
          actions.push({
            label: 'Retry',
            description: 'Try the operation again',
            action: originalOperation
          });
        }
        break;

      case 'auth':
        actions.push({
          label: 'Check Configuration',
          description: 'Review your Azure DevOps settings',
          action: () => this.openConfiguration()
        });
        actions.push({
          label: 'Generate New Token',
          description: 'Create a new Personal Access Token',
          action: () => this.openTokenGeneration()
        });
        break;

      case 'config':
        actions.push({
          label: 'Open Settings',
          description: 'Review and update configuration',
          action: () => this.openConfiguration()
        });
        actions.push({
          label: 'Reset Configuration',
          description: 'Reset to default settings',
          action: () => this.resetConfiguration()
        });
        break;

      case 'ai':
        actions.push({
          label: 'Check AI Settings',
          description: 'Review language model configuration',
          action: () => this.openAIConfiguration()
        });
        break;

      default:
        if (originalOperation) {
          actions.push({
            label: 'Try Again',
            description: 'Retry the operation',
            action: originalOperation
          });
        }
        break;
    }

    // Always add report option for non-trivial errors
    actions.push({
      label: 'Report Issue',
      description: 'Send error report to help improve the extension',
      action: () => this.reportError(new Error('Generic error'), category)
    });

    return actions;
  }

  /**
   * Test network connection
   */
  private testNetworkConnection(): void {
    // This would typically test connectivity to Azure DevOps
    console.log('Testing network connection...');
    // Implementation would depend on available services
  }

  /**
   * Open configuration panel
   */
  private openConfiguration(): void {
    // Dispatch event to open configuration
    window.dispatchEvent(new CustomEvent('open-configuration'));
  }

  /**
   * Open token generation page
   */
  private openTokenGeneration(): void {
    // Open Azure DevOps token generation page
    window.open('https://dev.azure.com/_usersSettings/tokens', '_blank');
  }

  /**
   * Open AI configuration
   */
  private openAIConfiguration(): void {
    // Dispatch event to open AI settings
    window.dispatchEvent(new CustomEvent('open-ai-configuration'));
  }

  /**
   * Reset configuration to defaults
   */
  private resetConfiguration(): void {
    // Dispatch event to reset configuration
    window.dispatchEvent(new CustomEvent('reset-configuration'));
  }

  /**
   * Report error to extension host
   */
  private reportError(error: Error, context: string): void {
    // This would send error report via message service
    console.log('Reporting error:', error, context);
    // Implementation would use MessageService to send error report
  }

  /**
   * Get error severity color for UI
   */
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'var(--vscode-errorForeground)';
      case 'high': return 'var(--vscode-errorForeground)';
      case 'medium': return 'var(--vscode-warningForeground)';
      case 'low': return 'var(--vscode-infoForeground)';
      default: return 'var(--vscode-foreground)';
    }
  }

  /**
   * Get error icon for UI
   */
  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '❌';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  }
}