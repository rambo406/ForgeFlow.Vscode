import * as vscode from 'vscode';
import { LanguageModelService } from './LanguageModelService';
import { ConfigurationManager } from './ConfigurationManager';
import { FileDiff, ReviewComment } from '../models/AzureDevOpsModels';

/**
 * Configuration options for the analysis engine
 */
export interface AnalysisConfig {
    batchSize: number;
    maxConcurrentRequests: number;
    skipBinaryFiles: boolean;
    skipLargeFiles: boolean;
    maxFileSize: number; // in bytes
    customInstructions?: string;
    modelPreference?: string;
}

/**
 * Progress information for analysis operations
 */
export interface AnalysisProgress {
    completed: number;
    total: number;
    currentFileName: string;
    stage: 'initializing' | 'analyzing' | 'processing' | 'completed' | 'cancelled' | 'error';
    message?: string;
    errors?: string[];
}

/**
 * Result of the analysis operation
 */
export interface AnalysisResult {
    comments: ReviewComment[];
    errors: AnalysisError[];
    summary: AnalysisSummary;
}

/**
 * Error information for failed file analysis
 */
export interface AnalysisError {
    fileName: string;
    error: string;
    severity: 'warning' | 'error';
    canRetry: boolean;
}

/**
 * Summary statistics for the analysis
 */
export interface AnalysisSummary {
    totalFiles: number;
    analyzedFiles: number;
    skippedFiles: number;
    errorFiles: number;
    totalComments: number;
    commentsBySeverity: {
        error: number;
        warning: number;
        info: number;
    };
    processingTimeMs: number;
}

/**
 * Engine for analyzing code changes and generating review comments
 */
export class CommentAnalysisEngine {
    private static readonly DEFAULT_CONFIG: AnalysisConfig = {
        batchSize: 5,
        maxConcurrentRequests: 3,
        skipBinaryFiles: true,
        skipLargeFiles: true,
        maxFileSize: 1024 * 1024, // 1MB
    };

    private languageModelService: LanguageModelService;
    private configManager: ConfigurationManager;
    private cancellationToken?: vscode.CancellationToken;

    constructor(
        languageModelService: LanguageModelService,
        configManager: ConfigurationManager
    ) {
        this.languageModelService = languageModelService;
        this.configManager = configManager;
    }

    /**
     * Analyze file changes and generate review comments with progress tracking
     */
    async analyzeChanges(
        fileDiffs: FileDiff[],
        progressCallback?: (progress: AnalysisProgress) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<AnalysisResult> {
        this.cancellationToken = cancellationToken;
        const startTime = Date.now();

        try {
            // Initialize analysis
            const config = await this.getAnalysisConfig();
            const filteredDiffs = this.filterAnalyzableFiles(fileDiffs, config);

            const result: AnalysisResult = {
                comments: [],
                errors: [],
                summary: {
                    totalFiles: fileDiffs.length,
                    analyzedFiles: 0,
                    skippedFiles: fileDiffs.length - filteredDiffs.length,
                    errorFiles: 0,
                    totalComments: 0,
                    commentsBySeverity: { error: 0, warning: 0, info: 0 },
                    processingTimeMs: 0
                }
            };

            this.reportProgress(progressCallback, {
                completed: 0,
                total: filteredDiffs.length,
                currentFileName: '',
                stage: 'initializing',
                message: `Initialized analysis for ${filteredDiffs.length} files (${result.summary.skippedFiles} skipped)`
            });

            // Check if cancellation was requested
            if (this.isCancellationRequested()) {
                result.summary.processingTimeMs = Date.now() - startTime;
                this.reportProgress(progressCallback, {
                    completed: 0,
                    total: filteredDiffs.length,
                    currentFileName: '',
                    stage: 'cancelled',
                    message: 'Analysis cancelled by user'
                });
                return result;
            }

            // Process files in batches
            const batches = this.createBatches(filteredDiffs, config.batchSize);
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                if (this.isCancellationRequested()) {
                    break;
                }

                const batch = batches[batchIndex];
                const batchStartIndex = batchIndex * config.batchSize;

                this.reportProgress(progressCallback, {
                    completed: batchStartIndex,
                    total: filteredDiffs.length,
                    currentFileName: `Processing batch ${batchIndex + 1}/${batches.length}`,
                    stage: 'analyzing',
                    message: `Analyzing batch ${batchIndex + 1} of ${batches.length} (${batch.length} files)`
                });

                // Process batch with limited concurrency
                const batchResults = await this.processBatch(
                    batch,
                    config,
                    (fileIndex, fileName) => {
                        this.reportProgress(progressCallback, {
                            completed: batchStartIndex + fileIndex,
                            total: filteredDiffs.length,
                            currentFileName: fileName,
                            stage: 'analyzing',
                            message: `Analyzing ${fileName}`
                        });
                    }
                );

                // Merge batch results
                result.comments.push(...batchResults.comments);
                result.errors.push(...batchResults.errors);
                result.summary.analyzedFiles += batchResults.analyzedFiles;
                result.summary.errorFiles += batchResults.errorFiles;

                // Update comment counts
                batchResults.comments.forEach(comment => {
                    result.summary.commentsBySeverity[comment.severity]++;
                });
            }

            // Finalize results
            result.summary.totalComments = result.comments.length;
            result.summary.processingTimeMs = Date.now() - startTime;

            const finalStage = this.isCancellationRequested() ? 'cancelled' : 'completed';
            this.reportProgress(progressCallback, {
                completed: result.summary.analyzedFiles,
                total: filteredDiffs.length,
                currentFileName: '',
                stage: finalStage,
                message: this.createSummaryMessage(result.summary),
                errors: result.errors.map(e => e.error)
            });

            return result;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            this.reportProgress(progressCallback, {
                completed: 0,
                total: fileDiffs.length,
                currentFileName: '',
                stage: 'error',
                message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            });

            throw new Error(`Comment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process a single batch of files
     */
    private async processBatch(
        batch: FileDiff[],
        config: AnalysisConfig,
        progressCallback: (fileIndex: number, fileName: string) => void
    ): Promise<{ comments: ReviewComment[]; errors: AnalysisError[]; analyzedFiles: number; errorFiles: number }> {
        const batchComments: ReviewComment[] = [];
        const batchErrors: AnalysisError[] = [];
        let analyzedFiles = 0;
        let errorFiles = 0;

        // Process files with limited concurrency
        const semaphore = new Semaphore(config.maxConcurrentRequests);
        const promises = batch.map(async (fileDiff, index) => {
            await semaphore.acquire();
            
            try {
                if (this.isCancellationRequested()) {
                    return;
                }

                progressCallback(index, fileDiff.filePath);

                const comments = await this.languageModelService.analyzeFileDiff(
                    fileDiff,
                    config.customInstructions,
                    config.modelPreference,
                    this.cancellationToken
                );

                batchComments.push(...comments);
                analyzedFiles++;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const canRetry = this.isRetryableError(error);
                
                batchErrors.push({
                    fileName: fileDiff.filePath,
                    error: errorMessage,
                    severity: canRetry ? 'warning' : 'error',
                    canRetry
                });

                errorFiles++;
                console.error(`Failed to analyze ${fileDiff.filePath}:`, error);
            } finally {
                semaphore.release();
            }
        });

        await Promise.allSettled(promises);

        return { 
            comments: batchComments, 
            errors: batchErrors, 
            analyzedFiles, 
            errorFiles 
        };
    }

    /**
     * Filter files that can be analyzed
     */
    private filterAnalyzableFiles(fileDiffs: FileDiff[], config: AnalysisConfig): FileDiff[] {
        return fileDiffs.filter(diff => {
            // Skip binary files if configured
            if (config.skipBinaryFiles && diff.isBinary) {
                return false;
            }

            // Skip large files if configured
            if (config.skipLargeFiles && diff.isLargeFile) {
                return false;
            }

            // Skip deleted files (no content to review)
            if (diff.changeType === 'delete') {
                return false;
            }

            // Skip files with no meaningful changes
            if (diff.addedLines === 0 && diff.deletedLines === 0) {
                return false;
            }

            // Skip files that are too large based on content
            if (diff.lines && diff.lines.length > 1000) { // Arbitrarily large file
                return false;
            }

            return true;
        });
    }

    /**
     * Create batches for processing
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Get analysis configuration from extension settings
     */
    private async getAnalysisConfig(): Promise<AnalysisConfig> {
        return {
            ...CommentAnalysisEngine.DEFAULT_CONFIG,
            batchSize: this.configManager.getBatchSize(),
            customInstructions: this.configManager.getCustomInstructions(),
            modelPreference: this.configManager.getSelectedModel()
        };
    }

    /**
     * Check if the operation was cancelled
     */
    private isCancellationRequested(): boolean {
        return this.cancellationToken?.isCancellationRequested ?? false;
    }

    /**
     * Determine if an error is retryable
     */
    private isRetryableError(error: any): boolean {
        if (error instanceof vscode.LanguageModelError) {
            // Rate limit or temporary service errors are retryable
            const errorMsg = error.message.toLowerCase();
            return errorMsg.includes('rate limit') ||
                   errorMsg.includes('quota') ||
                   errorMsg.includes('timeout') ||
                   errorMsg.includes('temporarily unavailable') ||
                   errorMsg.includes('service unavailable');
        }

        // Network errors, timeouts, etc. are typically retryable
        return error instanceof Error && (
            error.message.toLowerCase().includes('timeout') ||
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('connection')
        );
    }

    /**
     * Create a human-readable summary message
     */
    private createSummaryMessage(summary: AnalysisSummary): string {
        const { totalFiles, analyzedFiles, skippedFiles, errorFiles, totalComments, commentsBySeverity } = summary;
        
        let message = `Analysis completed: ${analyzedFiles}/${totalFiles} files analyzed`;
        
        if (skippedFiles > 0) {
            message += `, ${skippedFiles} skipped`;
        }
        
        if (errorFiles > 0) {
            message += `, ${errorFiles} errors`;
        }

        message += `. Generated ${totalComments} comments`;
        
        if (totalComments > 0) {
            const severityCounts = [];
            if (commentsBySeverity.error > 0) severityCounts.push(`${commentsBySeverity.error} errors`);
            if (commentsBySeverity.warning > 0) severityCounts.push(`${commentsBySeverity.warning} warnings`);
            if (commentsBySeverity.info > 0) severityCounts.push(`${commentsBySeverity.info} suggestions`);
            
            if (severityCounts.length > 0) {
                message += ` (${severityCounts.join(', ')})`;
            }
        }

        const durationSeconds = Math.round(summary.processingTimeMs / 1000);
        message += ` in ${durationSeconds}s`;

        return message;
    }

    /**
     * Report progress to the callback
     */
    private reportProgress(
        progressCallback: ((progress: AnalysisProgress) => void) | undefined,
        progress: AnalysisProgress
    ): void {
        progressCallback?.(progress);
    }

    /**
     * Analyze a single file change (useful for testing or individual analysis)
     */
    async analyzeSingleFile(
        fileDiff: FileDiff,
        customInstructions?: string,
        modelPreference?: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ReviewComment[]> {
        const config = await this.getAnalysisConfig();
        
        return this.languageModelService.analyzeFileDiff(
            fileDiff,
            customInstructions || config.customInstructions,
            modelPreference || config.modelPreference,
            cancellationToken
        );
    }

    /**
     * Retry analysis for failed files
     */
    async retryFailedAnalysis(
        errors: AnalysisError[],
        fileDiffs: FileDiff[],
        progressCallback?: (progress: AnalysisProgress) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<AnalysisResult> {
        const retryableErrors = errors.filter(e => e.canRetry);
        const retryFiles = fileDiffs.filter(diff => 
            retryableErrors.some(e => e.fileName === diff.filePath)
        );

        if (retryFiles.length === 0) {
            throw new Error('No retryable files found');
        }

        return this.analyzeChanges(retryFiles, progressCallback, cancellationToken);
    }
}

/**
 * Simple semaphore implementation for controlling concurrency
 */
class Semaphore {
    private permits: number;
    private waitQueue: (() => void)[] = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve();
            } else {
                this.waitQueue.push(resolve);
            }
        });
    }

    release(): void {
        this.permits++;
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            if (next) {
                this.permits--;
                next();
            }
        }
    }
}