import * as vscode from 'vscode';

/**
 * Progress tracking interface for long-running operations
 */
export interface ProgressTracker {
    report(value: { message?: string; increment?: number }): void;
    isCancelled(): boolean;
    onCancelled(callback: () => void): void;
}

/**
 * Configuration for progress operations
 */
export interface ProgressConfig {
    title: string;
    location: vscode.ProgressLocation;
    cancellable?: boolean;
    totalSteps?: number;
}

/**
 * Utility class for managing progress indicators and cancellation
 */
export class ProgressManager {
    /**
     * Execute a long-running operation with progress tracking
     */
    static async withProgress<T>(
        config: ProgressConfig,
        operation: (progress: ProgressTracker, token: vscode.CancellationToken) => Promise<T>
    ): Promise<T> {
        return await vscode.window.withProgress(
            {
                location: config.location,
                title: config.title,
                cancellable: config.cancellable || false
            },
            async (progress, token) => {
                const tracker = new VSCodeProgressTracker(progress, config.totalSteps);
                
                // Set up cancellation handling
                token.onCancellationRequested(() => {
                    tracker.markCancelled();
                });

                try {
                    return await operation(tracker, token);
                } catch (error) {
                    if (token.isCancellationRequested) {
                        throw new vscode.CancellationError();
                    }
                    throw error;
                }
            }
        );
    }

    /**
     * Create a simple progress dialog
     */
    static async showProgress<T>(
        title: string,
        operation: (progress: ProgressTracker) => Promise<T>,
        cancellable: boolean = true
    ): Promise<T> {
        return await this.withProgress(
            {
                title,
                location: vscode.ProgressLocation.Notification,
                cancellable
            },
            async (progress, token) => {
                return await operation(progress);
            }
        );
    }

    /**
     * Create a status bar progress indicator
     */
    static async showStatusBarProgress<T>(
        title: string,
        operation: (progress: ProgressTracker) => Promise<T>
    ): Promise<T> {
        return await this.withProgress(
            {
                title,
                location: vscode.ProgressLocation.Window,
                cancellable: false
            },
            async (progress, token) => {
                return await operation(progress);
            }
        );
    }
}

/**
 * VS Code specific progress tracker implementation
 */
class VSCodeProgressTracker implements ProgressTracker {
    private readonly progress: vscode.Progress<{ message?: string; increment?: number }>;
    private readonly totalSteps?: number;
    private currentStep: number = 0;
    private cancelled: boolean = false;
    private readonly cancellationCallbacks: (() => void)[] = [];

    constructor(progress: vscode.Progress<{ message?: string; increment?: number }>, totalSteps?: number) {
        this.progress = progress;
        this.totalSteps = totalSteps;
    }

    report(value: { message?: string; increment?: number }): void {
        if (this.cancelled) {
            return;
        }

        let reportValue = { ...value };

        // Calculate increment based on total steps if not provided
        if (this.totalSteps && !value.increment) {
            this.currentStep++;
            reportValue.increment = (1 / this.totalSteps) * 100;
        }

        this.progress.report(reportValue);
    }

    isCancelled(): boolean {
        return this.cancelled;
    }

    onCancelled(callback: () => void): void {
        this.cancellationCallbacks.push(callback);
    }

    markCancelled(): void {
        this.cancelled = true;
        this.cancellationCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in cancellation callback:', error);
            }
        });
    }
}

/**
 * Batch processor with progress tracking and cancellation support
 */
export class BatchProcessor<T, R> {
    private readonly batchSize: number;
    private readonly delayBetweenBatches: number;

    constructor(batchSize: number = 10, delayBetweenBatches: number = 100) {
        this.batchSize = batchSize;
        this.delayBetweenBatches = delayBetweenBatches;
    }

    /**
     * Process items in batches with progress tracking
     */
    async processBatch(
        items: T[],
        processor: (item: T) => Promise<R>,
        progressConfig: ProgressConfig,
        onBatchComplete?: (results: R[], batchIndex: number) => void
    ): Promise<R[]> {
        if (items.length === 0) {
            return [];
        }

        return await ProgressManager.withProgress(
            {
                ...progressConfig,
                totalSteps: Math.ceil(items.length / this.batchSize)
            },
            async (progress, token) => {
                const results: R[] = [];
                const totalBatches = Math.ceil(items.length / this.batchSize);

                for (let i = 0; i < items.length; i += this.batchSize) {
                    if (token.isCancellationRequested) {
                        throw new vscode.CancellationError();
                    }

                    const batchIndex = Math.floor(i / this.batchSize);
                    const batch = items.slice(i, i + this.batchSize);
                    
                    progress.report({
                        message: `Processing batch ${batchIndex + 1} of ${totalBatches} (${batch.length} items)`,
                        increment: undefined // Let the progress tracker calculate
                    });

                    // Process batch items in parallel
                    const batchPromises = batch.map(async (item, index) => {
                        try {
                            return await processor(item);
                        } catch (error) {
                            console.error(`Failed to process item ${i + index}:`, error);
                            throw error;
                        }
                    });

                    try {
                        const batchResults = await Promise.all(batchPromises);
                        results.push(...batchResults);
                        
                        onBatchComplete?.(batchResults, batchIndex);
                    } catch (error) {
                        console.error(`Batch ${batchIndex} failed:`, error);
                        throw error;
                    }

                    // Add delay between batches (except for the last one)
                    if (i + this.batchSize < items.length && this.delayBetweenBatches > 0) {
                        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
                    }
                }

                progress.report({
                    message: `Completed processing ${items.length} items`
                });

                return results;
            }
        );
    }

    /**
     * Process items with settled promises (won't fail if individual items fail)
     */
    async processWithSettled(
        items: T[],
        processor: (item: T) => Promise<R>,
        progressConfig: ProgressConfig,
        onItemComplete?: (result: R | Error, item: T, index: number) => void
    ): Promise<(R | Error)[]> {
        if (items.length === 0) {
            return [];
        }

        return await ProgressManager.withProgress(
            {
                ...progressConfig,
                totalSteps: Math.ceil(items.length / this.batchSize)
            },
            async (progress, token) => {
                const results: (R | Error)[] = [];
                const totalBatches = Math.ceil(items.length / this.batchSize);

                for (let i = 0; i < items.length; i += this.batchSize) {
                    if (token.isCancellationRequested) {
                        throw new vscode.CancellationError();
                    }

                    const batchIndex = Math.floor(i / this.batchSize);
                    const batch = items.slice(i, i + this.batchSize);
                    
                    progress.report({
                        message: `Processing batch ${batchIndex + 1} of ${totalBatches} (${batch.length} items)`,
                        increment: undefined
                    });

                    // Process batch items with settled promises
                    const batchPromises = batch.map(async (item, index) => {
                        try {
                            const result = await processor(item);
                            onItemComplete?.(result, item, i + index);
                            return result;
                        } catch (error) {
                            const processedError = error as Error;
                            onItemComplete?.(processedError, item, i + index);
                            return processedError;
                        }
                    });

                    const batchResults = await Promise.allSettled(batchPromises);
                    
                    // Extract results or errors
                    const processedResults = batchResults.map(result => 
                        result.status === 'fulfilled' ? result.value : new Error('Processing failed')
                    );
                    
                    results.push(...processedResults);

                    // Add delay between batches
                    if (i + this.batchSize < items.length && this.delayBetweenBatches > 0) {
                        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
                    }
                }

                const successCount = results.filter(r => !(r instanceof Error)).length;
                const errorCount = results.length - successCount;
                
                progress.report({
                    message: `Completed: ${successCount} successful, ${errorCount} failed`
                });

                return results;
            }
        );
    }

    /**
     * Set the batch size for processing
     */
    setBatchSize(size: number): void {
        if (size <= 0) {
            throw new Error('Batch size must be greater than 0');
        }
        // Update batch size - would need to make batchSize mutable
        (this as any).batchSize = size;
    }

    /**
     * Set the delay between batches
     */
    setDelayBetweenBatches(delay: number): void {
        if (delay < 0) {
            throw new Error('Delay must be non-negative');
        }
        // Update delay - would need to make delayBetweenBatches mutable
        (this as any).delayBetweenBatches = delay;
    }
}

/**
 * Utility for creating cancellable operations
 */
export class CancellationManager {
    private readonly cancellationTokenSource: vscode.CancellationTokenSource;
    private readonly cleanupCallbacks: (() => void)[] = [];

    constructor() {
        this.cancellationTokenSource = new vscode.CancellationTokenSource();
    }

    /**
     * Get the cancellation token
     */
    get token(): vscode.CancellationToken {
        return this.cancellationTokenSource.token;
    }

    /**
     * Check if cancellation has been requested
     */
    get isCancelled(): boolean {
        return this.cancellationTokenSource.token.isCancellationRequested;
    }

    /**
     * Cancel the operation
     */
    cancel(): void {
        this.cancellationTokenSource.cancel();
        this.executeCleanup();
    }

    /**
     * Add a cleanup callback to be executed on cancellation
     */
    onCancellation(callback: () => void): void {
        this.cleanupCallbacks.push(callback);
    }

    /**
     * Execute all cleanup callbacks
     */
    private executeCleanup(): void {
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in cleanup callback:', error);
            }
        });
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.cancellationTokenSource.dispose();
        this.cleanupCallbacks.length = 0;
    }

    /**
     * Create a timeout-based cancellation token
     */
    static withTimeout(timeoutMs: number): CancellationManager {
        const manager = new CancellationManager();
        
        const timeout = setTimeout(() => {
            manager.cancel();
        }, timeoutMs);

        manager.onCancellation(() => {
            clearTimeout(timeout);
        });

        return manager;
    }

    /**
     * Combine multiple cancellation tokens
     */
    static combine(...tokens: vscode.CancellationToken[]): CancellationManager {
        const manager = new CancellationManager();
        
        // Cancel if any of the input tokens is cancelled
        for (const token of tokens) {
            if (token.isCancellationRequested) {
                manager.cancel();
                break;
            }
            
            token.onCancellationRequested(() => {
                manager.cancel();
            });
        }

        return manager;
    }
}

/**
 * Status bar manager for showing operation status
 */
export class StatusBarManager {
    private readonly statusBarItem: vscode.StatusBarItem;
    private hideTimeout?: NodeJS.Timeout;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
    }

    /**
     * Show a status message
     */
    show(text: string, tooltip?: string, autoHide?: number): void {
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.show();

        // Clear any existing timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        // Auto-hide after specified time
        if (autoHide && autoHide > 0) {
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, autoHide);
        }
    }

    /**
     * Show progress with a spinner
     */
    showProgress(text: string, tooltip?: string): void {
        this.show(`$(sync~spin) ${text}`, tooltip);
    }

    /**
     * Show success status
     */
    showSuccess(text: string, tooltip?: string, autoHide: number = 5000): void {
        this.show(`$(check) ${text}`, tooltip, autoHide);
    }

    /**
     * Show error status
     */
    showError(text: string, tooltip?: string, autoHide: number = 10000): void {
        this.show(`$(error) ${text}`, tooltip, autoHide);
    }

    /**
     * Show warning status
     */
    showWarning(text: string, tooltip?: string, autoHide: number = 7000): void {
        this.show(`$(warning) ${text}`, tooltip, autoHide);
    }

    /**
     * Hide the status bar item
     */
    hide(): void {
        this.statusBarItem.hide();
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }
    }

    /**
     * Update the status bar item command
     */
    setCommand(command: string): void {
        this.statusBarItem.command = command;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
    }
}