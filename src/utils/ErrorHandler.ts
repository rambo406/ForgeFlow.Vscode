import * as vscode from 'vscode';

/**
 * Enumeration of error categories for classification and handling
 */
export enum ErrorCategory {
    Authentication = 'authentication',
    Authorization = 'authorization',
    Network = 'network',
    RateLimit = 'rateLimit',
    Validation = 'validation',
    LanguageModel = 'languageModel',
    Configuration = 'configuration',
    Resource = 'resource',
    Cancellation = 'cancellation',
    Unknown = 'unknown'
}

/**
 * Severity levels for errors
 */
export enum ErrorSeverity {
    Critical = 'critical',  // Application-breaking errors
    High = 'high',         // Feature-breaking errors
    Medium = 'medium',     // Degraded functionality
    Low = 'low'           // Minor issues
}

/**
 * Base error class for extension-specific errors
 */
export class ExtensionError extends Error {
    public readonly category: ErrorCategory;
    public readonly severity: ErrorSeverity;
    public readonly userMessage: string;
    public readonly actionableSteps: string[];
    public readonly isRetryable: boolean;
    public readonly originalError?: Error;
    public readonly timestamp: Date;

    constructor(
        message: string,
        category: ErrorCategory,
        severity: ErrorSeverity,
        userMessage: string,
        actionableSteps: string[] = [],
        isRetryable: boolean = false,
        originalError?: Error
    ) {
        super(message);
        this.name = 'ExtensionError';
        this.category = category;
        this.severity = severity;
        this.userMessage = userMessage;
        this.actionableSteps = actionableSteps;
        this.isRetryable = isRetryable;
        this.originalError = originalError;
        this.timestamp = new Date();
    }
}

/**
 * Specific error types for common scenarios
 */
export class AuthenticationError extends ExtensionError {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            ErrorCategory.Authentication,
            ErrorSeverity.High,
            'Authentication failed. Please check your Personal Access Token.',
            [
                'Verify your PAT token is correct and not expired',
                'Ensure the token has required permissions (Code read, Pull requests read/write)',
                'Check if your organization requires specific authentication methods',
                'Generate a new PAT token if needed'
            ],
            false,
            originalError
        );
    }
}

export class AuthorizationError extends ExtensionError {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            ErrorCategory.Authorization,
            ErrorSeverity.High,
            'Access denied. Your token may lack required permissions.',
            [
                'Verify your PAT token has the following scopes:',
                '  • Code (read)',
                '  • Pull request (read)',
                '  • Pull request thread (read/write)',
                'Contact your Azure DevOps administrator if needed'
            ],
            false,
            originalError
        );
    }
}

export class NetworkError extends ExtensionError {
    constructor(message: string, isRetryable: boolean = true, originalError?: Error) {
        super(
            message,
            ErrorCategory.Network,
            ErrorSeverity.Medium,
            'Network connection failed. Please check your connection and try again.',
            [
                'Check your internet connection',
                'Verify the Azure DevOps organization URL is correct',
                'Check if your network has firewall restrictions',
                'Try again in a few moments'
            ],
            isRetryable,
            originalError
        );
    }
}

export class RateLimitError extends ExtensionError {
    constructor(message: string, retryAfter?: number, originalError?: Error) {
        const steps = [
            'Wait before making more requests',
            'Consider reducing the batch size in settings',
            'Try analyzing smaller pull requests'
        ];

        if (retryAfter) {
            steps.unshift(`Wait at least ${retryAfter} seconds before retrying`);
        }

        super(
            message,
            ErrorCategory.RateLimit,
            ErrorSeverity.Medium,
            'API rate limit exceeded. Please wait before making more requests.',
            steps,
            true,
            originalError
        );
    }
}

export class LanguageModelError extends ExtensionError {
    constructor(message: string, isRetryable: boolean = false, originalError?: Error) {
        super(
            message,
            ErrorCategory.LanguageModel,
            ErrorSeverity.High,
            'Language model access failed. Please check your VS Code language model setup.',
            [
                'Ensure you have a language model extension installed (e.g., GitHub Copilot)',
                'Check if you\'re signed in to your language model provider',
                'Verify you have permissions to use the language model',
                'Try selecting a different model in the extension settings'
            ],
            isRetryable,
            originalError
        );
    }
}

export class ConfigurationError extends ExtensionError {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            ErrorCategory.Configuration,
            ErrorSeverity.Medium,
            'Configuration error. Please check your extension settings.',
            [
                'Open extension settings and verify all required fields',
                'Check your Azure DevOps organization URL format',
                'Ensure your PAT token is properly configured',
                'Try resetting settings to defaults if needed'
            ],
            false,
            originalError
        );
    }
}

export class ValidationError extends ExtensionError {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            ErrorCategory.Validation,
            ErrorSeverity.Low,
            'Invalid input or configuration detected.',
            [
                'Check the format of the provided input',
                'Verify all required fields are filled',
                'Ensure values are within acceptable ranges'
            ],
            false,
            originalError
        );
    }
}

export class ResourceError extends ExtensionError {
    constructor(message: string, isRetryable: boolean = false, originalError?: Error) {
        super(
            message,
            ErrorCategory.Resource,
            ErrorSeverity.Medium,
            'Resource not found or unavailable.',
            [
                'Verify the resource exists and you have access to it',
                'Check if the pull request, project, or repository is still available',
                'Ensure your permissions haven\'t changed'
            ],
            isRetryable,
            originalError
        );
    }
}

/**
 * Main error handler class for the extension
 */
export class ExtensionErrorHandler {
    private static instance: ExtensionErrorHandler;
    private outputChannel: vscode.OutputChannel;
    private readonly errorHistory: ExtensionError[] = [];
    private readonly maxHistorySize = 100;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Azure DevOps PR Reviewer');
    }

    public static getInstance(): ExtensionErrorHandler {
        if (!ExtensionErrorHandler.instance) {
            ExtensionErrorHandler.instance = new ExtensionErrorHandler();
        }
        return ExtensionErrorHandler.instance;
    }

    /**
     * Handle an error with appropriate user notification and logging
     */
    public async handleError(error: Error | ExtensionError, context?: string): Promise<void> {
        const extensionError = this.normalizeError(error, context);
        
        // Log the error
        this.logError(extensionError, context);
        
        // Add to history
        this.addToHistory(extensionError);
        
        // Show appropriate user notification
        await this.showUserNotification(extensionError);
    }

    /**
     * Convert any error to an ExtensionError
     */
    private normalizeError(error: Error | ExtensionError, context?: string): ExtensionError {
        if (error instanceof ExtensionError) {
            return error;
        }

        // Handle VS Code specific errors
        if (error instanceof vscode.CancellationError) {
            return new ExtensionError(
                'Operation was cancelled',
                ErrorCategory.Cancellation,
                ErrorSeverity.Low,
                'Operation was cancelled by user',
                [],
                false,
                error
            );
        }

        if (error instanceof vscode.LanguageModelError) {
            return new LanguageModelError(
                `Language model error: ${error.message}`,
                true, // Language model errors are generally retryable
                error
            );
        }

        // Handle common HTTP/Network errors
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            return new NetworkError(`Network error: ${error.message}`, true, error);
        }

        if (error.message.includes('401')) {
            return new AuthenticationError(`Authentication failed: ${error.message}`, error);
        }

        if (error.message.includes('403')) {
            return new AuthorizationError(`Authorization failed: ${error.message}`, error);
        }

        if (error.message.includes('404')) {
            return new ResourceError(`Resource not found: ${error.message}`, false, error);
        }

        if (error.message.includes('429')) {
            return new RateLimitError(`Rate limit exceeded: ${error.message}`, undefined, error);
        }

        // Default to unknown error
        return new ExtensionError(
            error.message || 'Unknown error occurred',
            ErrorCategory.Unknown,
            ErrorSeverity.Medium,
            `An unexpected error occurred${context ? ` during ${context}` : ''}.`,
            [
                'Try the operation again',
                'Check the output panel for more details',
                'Report this issue if the problem persists'
            ],
            true,
            error
        );
    }

    /**
     * Log error details to output channel and console
     */
    private logError(error: ExtensionError, context?: string): void {
        const timestamp = error.timestamp.toISOString();
        const logMessage = [
            `[${timestamp}] ERROR: ${error.category.toUpperCase()}`,
            `Context: ${context || 'N/A'}`,
            `Severity: ${error.severity}`,
            `Message: ${error.message}`,
            `User Message: ${error.userMessage}`,
            `Retryable: ${error.isRetryable}`,
            ''
        ];

        if (error.originalError) {
            logMessage.push(`Original Error: ${error.originalError.message}`);
            if (error.originalError.stack) {
                logMessage.push(`Stack: ${error.originalError.stack}`);
            }
        }

        if (error.stack) {
            logMessage.push(`Stack: ${error.stack}`);
        }

        logMessage.push(''); // Empty line for separation

        const fullLog = logMessage.join('\n');
        
        // Log to output channel
        this.outputChannel.appendLine(fullLog);
        
        // Log to console for development
        console.error(fullLog);
    }

    /**
     * Show appropriate user notification based on error severity
     */
    private async showUserNotification(error: ExtensionError): Promise<void> {
        const actions: vscode.MessageItem[] = [];

        // Add common actions
        if (error.isRetryable) {
            actions.push({ title: 'Retry' });
        }

        if (error.actionableSteps.length > 0) {
            actions.push({ title: 'Show Help' });
        }

        actions.push({ title: 'View Logs' });

        let response: vscode.MessageItem | undefined;

        // Show notification based on severity
        switch (error.severity) {
            case ErrorSeverity.Critical:
                response = await vscode.window.showErrorMessage(error.userMessage, ...actions);
                break;
            case ErrorSeverity.High:
                response = await vscode.window.showErrorMessage(error.userMessage, ...actions);
                break;
            case ErrorSeverity.Medium:
                response = await vscode.window.showWarningMessage(error.userMessage, ...actions);
                break;
            case ErrorSeverity.Low:
                response = await vscode.window.showInformationMessage(error.userMessage, ...actions);
                break;
        }

        // Handle user response
        if (response) {
            await this.handleUserResponse(response, error);
        }
    }

    /**
     * Handle user response to error notification
     */
    private async handleUserResponse(response: vscode.MessageItem, error: ExtensionError): Promise<void> {
        switch (response.title) {
            case 'Show Help':
                await this.showHelpDialog(error);
                break;
            case 'View Logs':
                this.outputChannel.show();
                break;
            case 'Retry':
                // The retry logic should be handled by the calling code
                // This just indicates the user wants to retry
                break;
        }
    }

    /**
     * Show detailed help dialog with actionable steps
     */
    private async showHelpDialog(error: ExtensionError): Promise<void> {
        const helpMessage = [
            `**${error.userMessage}**`,
            '',
            '**Steps to resolve:**',
            ...error.actionableSteps.map(step => `• ${step}`),
            '',
            `Error Category: ${error.category}`,
            `Occurred at: ${error.timestamp.toLocaleString()}`
        ].join('\n');

        const panel = vscode.window.createWebviewPanel(
            'errorHelp',
            'Error Help',
            vscode.ViewColumn.One,
            {
                enableScripts: false,
                retainContextWhenHidden: false
            }
        );

        panel.webview.html = this.generateHelpHtml(helpMessage);
    }

    /**
     * Generate HTML for help dialog
     */
    private generateHelpHtml(content: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error Help</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    line-height: 1.6;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    margin: 0;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1, h2, h3 {
                    color: var(--vscode-editor-foreground);
                }
                code {
                    background-color: var(--vscode-textCodeBlock-background);
                    color: var(--vscode-textBlockQuote-foreground);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                }
                .error-info {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    border-radius: 5px;
                    padding: 15px;
                    margin: 15px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Error Resolution Guide</h1>
                <div class="error-info">
                    ${content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
                </div>
            </div>
        </body>
        </html>`;
    }

    /**
     * Add error to history for debugging and analytics
     */
    private addToHistory(error: ExtensionError): void {
        this.errorHistory.push(error);
        
        // Keep history size manageable
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * Get error history for debugging
     */
    public getErrorHistory(): ExtensionError[] {
        return [...this.errorHistory];
    }

    /**
     * Clear error history
     */
    public clearHistory(): void {
        this.errorHistory.length = 0;
    }

    /**
     * Get error statistics
     */
    public getErrorStatistics(): { [category: string]: number } {
        const stats: { [category: string]: number } = {};
        
        for (const error of this.errorHistory) {
            stats[error.category] = (stats[error.category] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Check if a specific error category has occurred recently
     */
    public hasRecentErrors(category: ErrorCategory, withinMinutes: number = 5): boolean {
        const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
        return this.errorHistory.some(error => 
            error.category === category && error.timestamp > cutoff
        );
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.outputChannel.dispose();
        this.errorHistory.length = 0;
    }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
    /**
     * Wrap an async function with error handling
     */
    static withErrorHandling<T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        context?: string
    ): (...args: T) => Promise<R> {
        return async (...args: T): Promise<R> => {
            try {
                return await fn(...args);
            } catch (error) {
                const handler = ExtensionErrorHandler.getInstance();
                await handler.handleError(error as Error, context);
                throw error; // Re-throw to allow caller to handle if needed
            }
        };
    }

    /**
     * Create a retry wrapper with exponential backoff
     */
    static withRetry<T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        maxRetries: number = 3,
        baseDelay: number = 1000,
        context?: string
    ): (...args: T) => Promise<R> {
        return async (...args: T): Promise<R> => {
            let lastError: Error;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    return await fn(...args);
                } catch (error) {
                    lastError = error as Error;
                    
                    const extensionError = error instanceof ExtensionError ? error : 
                        ExtensionErrorHandler.getInstance()['normalizeError'](error as Error, context);
                    
                    // Don't retry non-retryable errors
                    if (!extensionError.isRetryable || attempt === maxRetries - 1) {
                        break;
                    }
                    
                    // Calculate delay with exponential backoff and jitter
                    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                    console.log(`[ErrorUtils] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms for ${context || 'operation'}`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            // Handle the final error
            const handler = ExtensionErrorHandler.getInstance();
            await handler.handleError(lastError!, context);
            throw lastError!;
        };
    }

    /**
     * Validate configuration and throw appropriate errors
     */
    static validateConfiguration(config: any, requiredFields: string[]): void {
        for (const field of requiredFields) {
            if (!config[field] || (typeof config[field] === 'string' && config[field].trim() === '')) {
                throw new ConfigurationError(`Required configuration field '${field}' is missing or empty`);
            }
        }
    }

    /**
     * Create a timeout wrapper for async operations
     */
    static withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        timeoutMessage: string = 'Operation timed out'
    ): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new NetworkError(timeoutMessage, true)), timeoutMs);
            })
        ]);
    }
}