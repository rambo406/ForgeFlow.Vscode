import * as vscode from 'vscode';
import { CommentAnalysisEngine, AnalysisResult, AnalysisProgress } from './CommentAnalysisEngine';
import { CommentPreviewProvider, CommentReviewResult } from './CommentPreviewProvider';
import { AzureDevOpsClient } from './AzureDevOpsClient';
import { LanguageModelService } from './LanguageModelService';
import { ConfigurationManager } from './ConfigurationManager';
import { FileDiff, ReviewComment, CommentThread } from '../models/AzureDevOpsModels';

/**
 * Result of the complete comment management workflow
 */
export interface CommentManagerResult {
    success: boolean;
    postedComments: number;
    errors: string[];
    summary: string;
    postedThreads?: PostedThreadInfo[];
}

/**
 * Information about successfully posted comment threads
 */
export interface PostedThreadInfo {
    threadId: number;
    fileName: string;
    lineNumber: number;
    azureDevOpsUrl: string;
    commentsCount: number;
}

/**
 * Options for comment generation and posting
 */
export interface CommentManagerOptions {
    pullRequestId: number;
    organizationUrl: string;
    projectName: string;
    customInstructions?: string;
    modelPreference?: string;
    skipPreview?: boolean;
    batchSize?: number;
}

/**
 * Manages the complete workflow of comment analysis, preview, and posting
 */
export class CommentManager {
    private analysisEngine: CommentAnalysisEngine;
    private previewProvider: CommentPreviewProvider;
    private azureDevOpsClient: AzureDevOpsClient;
    private configManager: ConfigurationManager;

    constructor(
        private context: vscode.ExtensionContext,
        languageModelService: LanguageModelService,
        azureDevOpsClient: AzureDevOpsClient,
        configManager: ConfigurationManager
    ) {
        this.analysisEngine = new CommentAnalysisEngine(languageModelService, configManager);
        this.previewProvider = new CommentPreviewProvider(context);
        this.azureDevOpsClient = azureDevOpsClient;
        this.configManager = configManager;
    }

    /**
     * Execute the complete comment analysis and posting workflow
     */
    async executeCommentWorkflow(
        fileDiffs: FileDiff[],
        options: CommentManagerOptions,
        cancellationToken?: vscode.CancellationToken
    ): Promise<CommentManagerResult> {
        const startTime = Date.now();
        let currentStep = 'initialization';

        try {
            // Step 1: Validate configuration and inputs
            currentStep = 'validation';
            await this.validateWorkflowInputs(options);

            if (fileDiffs.length === 0) {
                return {
                    success: true,
                    postedComments: 0,
                    errors: [],
                    summary: 'No file changes to analyze'
                };
            }

            // Step 2: Analyze file changes
            currentStep = 'analysis';
            const analysisResult = await this.executeAnalysis(
                fileDiffs,
                options,
                cancellationToken
            );

            if (analysisResult.comments.length === 0) {
                return {
                    success: true,
                    postedComments: 0,
                    errors: analysisResult.errors.map(e => e.error),
                    summary: `Analysis completed with no comments generated. ${analysisResult.summary.analyzedFiles} files analyzed.`
                };
            }

            // Step 3: Preview and user review (unless skipped)
            currentStep = 'preview';
            const reviewResult = await this.executePreview(
                analysisResult.comments,
                options.skipPreview
            );

            if (reviewResult.action === 'cancel') {
                return {
                    success: false,
                    postedComments: 0,
                    errors: [],
                    summary: 'Review cancelled by user'
                };
            }

            const approvedComments = reviewResult.comments.filter(c => c.isApproved);
            if (approvedComments.length === 0) {
                return {
                    success: true,
                    postedComments: 0,
                    errors: [],
                    summary: 'No comments were approved for posting'
                };
            }

            // Step 4: Post comments to Azure DevOps
            currentStep = 'posting';
            const postingResult = await this.executePosting(
                approvedComments,
                options,
                cancellationToken
            );

            const duration = Math.round((Date.now() - startTime) / 1000);
            const summary = this.createWorkflowSummary(
                analysisResult,
                reviewResult,
                postingResult,
                duration
            );

            // Show success notification with links to posted comments
            if (postingResult.successCount > 0 && postingResult.postedThreads) {
                await this.showPostingSuccessNotification(postingResult.postedThreads, options);
            }

            return {
                success: true,
                postedComments: postingResult.successCount,
                errors: postingResult.errors,
                summary,
                postedThreads: postingResult.postedThreads
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const duration = Math.round((Date.now() - startTime) / 1000);

            return {
                success: false,
                postedComments: 0,
                errors: [errorMessage],
                summary: `Workflow failed during ${currentStep} after ${duration}s: ${errorMessage}`
            };
        }
    }

    /**
     * Execute the analysis phase with progress tracking
     */
    private async executeAnalysis(
        fileDiffs: FileDiff[],
        options: CommentManagerOptions,
        cancellationToken?: vscode.CancellationToken
    ): Promise<AnalysisResult> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Code Changes',
                cancellable: true
            },
            async (progress, token) => {
                // Combine external and internal cancellation tokens
                const combinedToken = this.createCombinedCancellationToken(
                    cancellationToken,
                    token
                );

                return this.analysisEngine.analyzeChanges(
                    fileDiffs,
                    (analysisProgress: AnalysisProgress) => {
                        const percentage = Math.round(
                            (analysisProgress.completed / analysisProgress.total) * 100
                        );
                        
                        progress.report({
                            increment: percentage,
                            message: `${analysisProgress.currentFileName} (${analysisProgress.completed}/${analysisProgress.total})`
                        });
                    },
                    combinedToken
                );
            }
        );
    }

    /**
     * Execute the preview phase
     */
    private async executePreview(
        comments: ReviewComment[],
        skipPreview?: boolean
    ): Promise<CommentReviewResult> {
        if (skipPreview) {
            // Auto-approve all comments if preview is skipped
            comments.forEach(comment => {
                comment.isApproved = true;
            });

            return {
                action: 'post',
                comments: comments,
                approvedCount: comments.length
            };
        }

        return this.previewProvider.showCommentPreview(comments);
    }

    /**
     * Execute the comment posting phase
     */
    private async executePosting(
        comments: ReviewComment[],
        options: CommentManagerOptions,
        cancellationToken?: vscode.CancellationToken
    ): Promise<{ successCount: number; errors: string[]; postedThreads: PostedThreadInfo[] }> {
        const errors: string[] = [];
        const postedThreads: PostedThreadInfo[] = [];
        let successCount = 0;

        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Posting Comments to Azure DevOps',
                cancellable: true
            },
            async (progress, token) => {
                const combinedToken = this.createCombinedCancellationToken(
                    cancellationToken,
                    token
                );

                const commentThreads = this.groupCommentsIntoThreads(comments);
                
                for (let i = 0; i < commentThreads.length; i++) {
                    if (combinedToken.isCancellationRequested) {
                        break;
                    }

                    const thread = commentThreads[i];
                    const percentage = Math.round((i / commentThreads.length) * 100);

                    progress.report({
                        increment: percentage,
                        message: `Posting comment thread ${i + 1}/${commentThreads.length}`
                    });

                    try {
                        // Get repository information for the pull request
                        const repositories = await this.azureDevOpsClient.getRepositories(options.projectName);
                        if (repositories.length === 0) {
                            throw new Error('No repositories found in project');
                        }
                        
                        // Use the first repository or find specific one if needed
                        const repositoryId = repositories[0].id;
                        
                        const postedThread = await this.azureDevOpsClient.createCommentThread(
                            options.projectName,
                            repositoryId,
                            options.pullRequestId,
                            thread
                        );
                        
                        // Track the posted thread for success notification
                        if (postedThread.id && thread.threadContext) {
                            const azureDevOpsUrl = this.generateCommentThreadUrl(
                                options.organizationUrl,
                                options.projectName,
                                repositoryId,
                                options.pullRequestId,
                                postedThread.id
                            );
                            
                            postedThreads.push({
                                threadId: postedThread.id,
                                fileName: thread.threadContext.filePath,
                                lineNumber: thread.threadContext.rightFileStart?.line || 0,
                                azureDevOpsUrl,
                                commentsCount: thread.comments.length
                            });
                        }
                        
                        successCount++;
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        errors.push(`Failed to post comment for ${thread.threadContext?.filePath}: ${errorMsg}`);
                    }
                }

                return { successCount, errors, postedThreads };
            }
        );
    }

    /**
     * Validate workflow inputs and configuration
     */
    private async validateWorkflowInputs(options: CommentManagerOptions): Promise<void> {
        // Check if configuration is valid
        const configValidation = await this.configManager.validateConfiguration();
        if (!configValidation.isValid) {
            throw new Error(`Configuration validation failed: ${configValidation.error}`);
        }

        // Check if language model is available
        const modelAvailable = await new LanguageModelService().isLanguageModelAvailable();
        if (!modelAvailable) {
            throw new Error('No language models are available. Please ensure you have appropriate VS Code extensions installed.');
        }

        // Validate required options
        if (!options.pullRequestId || options.pullRequestId <= 0) {
            throw new Error('Valid pull request ID is required');
        }

        if (!options.organizationUrl) {
            throw new Error('Organization URL is required');
        }

        if (!options.projectName) {
            throw new Error('Project name is required');
        }
    }

    /**
     * Group review comments into comment threads for Azure DevOps
     */
    private groupCommentsIntoThreads(comments: ReviewComment[]): CommentThread[] {
        const threads: CommentThread[] = [];

        // Group comments by file and line number
        const commentGroups = new Map<string, ReviewComment[]>();
        
        for (const comment of comments) {
            const key = `${comment.fileName}:${comment.lineNumber}`;
            if (!commentGroups.has(key)) {
                commentGroups.set(key, []);
            }
            commentGroups.get(key)!.push(comment);
        }

        // Create comment threads
        for (const [key, groupComments] of commentGroups) {
            const [fileName, lineNumber] = key.split(':');
            const lineNum = parseInt(lineNumber, 10);

            // Combine multiple comments into a single thread
            const combinedContent = groupComments
                .map(c => {
                    let content = c.content;
                    if (c.suggestion) {
                        content += `\n\n**Suggestion:**\n${c.suggestion}`;
                    }
                    return content;
                })
                .join('\n\n---\n\n');

            const thread: CommentThread = {
                comments: [{
                    content: combinedContent,
                    commentType: 'text'
                }],
                status: 'active',
                threadContext: {
                    filePath: fileName,
                    rightFileStart: { line: lineNum, offset: 1 },
                    rightFileEnd: { line: lineNum, offset: 1 }
                }
            };

            threads.push(thread);
        }

        return threads;
    }

    /**
     * Create a combined cancellation token from multiple sources
     */
    private createCombinedCancellationToken(
        ...tokens: (vscode.CancellationToken | undefined)[]
    ): vscode.CancellationToken {
        const validTokens = tokens.filter(t => t !== undefined) as vscode.CancellationToken[];
        
        if (validTokens.length === 0) {
            // Return a dummy token that's never cancelled
            return { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
        }

        if (validTokens.length === 1) {
            return validTokens[0];
        }

        // Create a combined token
        const source = new vscode.CancellationTokenSource();
        
        validTokens.forEach(token => {
            if (token.isCancellationRequested) {
                source.cancel();
            } else {
                token.onCancellationRequested(() => source.cancel());
            }
        });

        return source.token;
    }

    /**
     * Create a summary of the workflow execution
     */
    private createWorkflowSummary(
        analysisResult: AnalysisResult,
        reviewResult: CommentReviewResult,
        postingResult: { successCount: number; errors: string[]; postedThreads: PostedThreadInfo[] },
        durationSeconds: number
    ): string {
        const { summary: analysisSummary } = analysisResult;
        const { approvedCount } = reviewResult;
        const { successCount } = postingResult;

        let summary = `Workflow completed in ${durationSeconds}s:\n`;
        summary += `• Analyzed ${analysisSummary.analyzedFiles}/${analysisSummary.totalFiles} files\n`;
        summary += `• Generated ${analysisSummary.totalComments} comments (${analysisSummary.commentsBySeverity.error} errors, ${analysisSummary.commentsBySeverity.warning} warnings, ${analysisSummary.commentsBySeverity.info} suggestions)\n`;
        summary += `• User approved ${approvedCount} comments\n`;
        summary += `• Successfully posted ${successCount}/${approvedCount} comment threads`;

        if (postingResult.errors.length > 0) {
            summary += `\n• ${postingResult.errors.length} posting errors occurred`;
        }

        if (analysisSummary.skippedFiles > 0) {
            summary += `\n• ${analysisSummary.skippedFiles} files were skipped`;
        }

        if (analysisResult.errors.length > 0) {
            summary += `\n• ${analysisResult.errors.length} analysis errors occurred`;
        }

        return summary;
    }

    /**
     * Retry failed comment posting
     */
    async retryFailedComments(
        failedComments: ReviewComment[],
        options: CommentManagerOptions,
        cancellationToken?: vscode.CancellationToken
    ): Promise<CommentManagerResult> {
        if (failedComments.length === 0) {
            return {
                success: true,
                postedComments: 0,
                errors: [],
                summary: 'No failed comments to retry'
            };
        }

        try {
            const postingResult = await this.executePosting(
                failedComments,
                options,
                cancellationToken
            );

            return {
                success: postingResult.errors.length === 0,
                postedComments: postingResult.successCount,
                errors: postingResult.errors,
                summary: `Retry completed: ${postingResult.successCount}/${failedComments.length} comments posted successfully`,
                postedThreads: postingResult.postedThreads
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                postedComments: 0,
                errors: [errorMessage],
                summary: `Retry failed: ${errorMessage}`
            };
        }
    }

    /**
     * Generate Azure DevOps URL for a comment thread
     */
    private generateCommentThreadUrl(
        organizationUrl: string,
        projectName: string,
        repositoryId: string,
        pullRequestId: number,
        threadId: number
    ): string {
        const baseUrl = organizationUrl.replace(/\/+$/, '');
        return `${baseUrl}/${encodeURIComponent(projectName)}/_git/${repositoryId}/pullrequest/${pullRequestId}?_a=overview&_t=${threadId}`;
    }

    /**
     * Show success notification with links to posted comments
     */
    private async showPostingSuccessNotification(
        postedThreads: PostedThreadInfo[],
        options: CommentManagerOptions
    ): Promise<void> {
        const message = `Successfully posted ${postedThreads.length} comment thread(s) to Azure DevOps`;
        
        if (postedThreads.length === 1) {
            const thread = postedThreads[0];
            const result = await vscode.window.showInformationMessage(
                `${message} (${thread.fileName}:${thread.lineNumber})`,
                'View in Azure DevOps',
                'Copy Link'
            );
            
            if (result === 'View in Azure DevOps') {
                vscode.env.openExternal(vscode.Uri.parse(thread.azureDevOpsUrl));
            } else if (result === 'Copy Link') {
                await vscode.env.clipboard.writeText(thread.azureDevOpsUrl);
                vscode.window.showInformationMessage('Link copied to clipboard');
            }
        } else {
            // Multiple threads posted
            const result = await vscode.window.showInformationMessage(
                message,
                'View All in Azure DevOps',
                'Show Details'
            );
            
            if (result === 'View All in Azure DevOps') {
                // Open the main PR page
                const prUrl = `${options.organizationUrl}/${encodeURIComponent(options.projectName)}/_git/pullrequest/${options.pullRequestId}`;
                vscode.env.openExternal(vscode.Uri.parse(prUrl));
            } else if (result === 'Show Details') {
                await this.showPostedThreadsDetails(postedThreads);
            }
        }
    }

    /**
     * Show details of all posted comment threads
     */
    private async showPostedThreadsDetails(postedThreads: PostedThreadInfo[]): Promise<void> {
        const items = postedThreads.map(thread => ({
            label: `${thread.fileName}:${thread.lineNumber}`,
            description: `Thread ${thread.threadId} (${thread.commentsCount} comment${thread.commentsCount > 1 ? 's' : ''})`,
            detail: thread.azureDevOpsUrl,
            thread
        }));

        const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a comment thread to view or copy link',
            canPickMany: false,
            ignoreFocusOut: true,
            title: 'Posted Comment Threads'
        });

        if (selectedItem) {
            const action = await vscode.window.showQuickPick(
                [
                    { label: 'View in Azure DevOps', action: 'view' },
                    { label: 'Copy Link', action: 'copy' }
                ],
                {
                    placeHolder: 'Choose an action',
                    canPickMany: false,
                    ignoreFocusOut: true
                }
            );

            if (action?.action === 'view') {
                vscode.env.openExternal(vscode.Uri.parse(selectedItem.thread.azureDevOpsUrl));
            } else if (action?.action === 'copy') {
                await vscode.env.clipboard.writeText(selectedItem.thread.azureDevOpsUrl);
                vscode.window.showInformationMessage('Link copied to clipboard');
            }
        }
    }

    /**
     * Create batch comment posting with enhanced error handling and retry logic
     */
    async postCommentsBatch(
        comments: ReviewComment[],
        options: CommentManagerOptions,
        batchSize: number = 5,
        cancellationToken?: vscode.CancellationToken
    ): Promise<CommentManagerResult> {
        const errors: string[] = [];
        const postedThreads: PostedThreadInfo[] = [];
        let totalPosted = 0;

        if (comments.length === 0) {
            return {
                success: true,
                postedComments: 0,
                errors: [],
                summary: 'No comments to post'
            };
        }

        try {
            const commentThreads = this.groupCommentsIntoThreads(comments);
            
            // Process in batches with retry logic
            for (let i = 0; i < commentThreads.length; i += batchSize) {
                if (cancellationToken?.isCancellationRequested) {
                    break;
                }

                const batch = commentThreads.slice(i, i + batchSize);
                const batchResults = await this.processBatch(batch, options, i / batchSize + 1, Math.ceil(commentThreads.length / batchSize));

                totalPosted += batchResults.successCount;
                errors.push(...batchResults.errors);
                postedThreads.push(...batchResults.postedThreads);

                // Add delay between batches to respect API rate limits
                if (i + batchSize < commentThreads.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const summary = `Batch posting completed: ${totalPosted}/${commentThreads.length} comment threads posted successfully`;
            
            if (totalPosted > 0) {
                await this.showPostingSuccessNotification(postedThreads, options);
            }

            return {
                success: errors.length === 0,
                postedComments: totalPosted,
                errors,
                summary,
                postedThreads
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                postedComments: totalPosted,
                errors: [errorMessage],
                summary: `Batch posting failed: ${errorMessage}`,
                postedThreads
            };
        }
    }

    /**
     * Process a batch of comment threads with retry logic
     */
    private async processBatch(
        threads: CommentThread[],
        options: CommentManagerOptions,
        batchNumber: number,
        totalBatches: number
    ): Promise<{ successCount: number; errors: string[]; postedThreads: PostedThreadInfo[] }> {
        const errors: string[] = [];
        const postedThreads: PostedThreadInfo[] = [];
        let successCount = 0;

        console.log(`Processing batch ${batchNumber}/${totalBatches} with ${threads.length} threads`);

        for (const thread of threads) {
            try {
                const repositories = await this.azureDevOpsClient.getRepositories(options.projectName);
                if (repositories.length === 0) {
                    throw new Error('No repositories found in project');
                }
                
                const repositoryId = repositories[0].id;
                
                // Retry logic for individual thread posting
                const postedThread = await this.postThreadWithRetry(
                    options.projectName,
                    repositoryId,
                    options.pullRequestId,
                    thread,
                    3 // max retries
                );
                
                if (postedThread.id && thread.threadContext) {
                    const azureDevOpsUrl = this.generateCommentThreadUrl(
                        options.organizationUrl,
                        options.projectName,
                        repositoryId,
                        options.pullRequestId,
                        postedThread.id
                    );
                    
                    postedThreads.push({
                        threadId: postedThread.id,
                        fileName: thread.threadContext.filePath,
                        lineNumber: thread.threadContext.rightFileStart?.line || 0,
                        azureDevOpsUrl,
                        commentsCount: thread.comments.length
                    });
                }
                
                successCount++;
                
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Failed to post comment for ${thread.threadContext?.filePath}: ${errorMsg}`);
            }
        }

        return { successCount, errors, postedThreads };
    }

    /**
     * Post a comment thread with retry logic
     */
    private async postThreadWithRetry(
        projectName: string,
        repositoryId: string,
        pullRequestId: number,
        thread: CommentThread,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<CommentThread> {
        let lastError: Error = new Error('Unknown error');

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.azureDevOpsClient.createCommentThread(
                    projectName,
                    repositoryId,
                    pullRequestId,
                    thread
                );
            } catch (error) {
                lastError = error as Error;
                
                // Don't retry on client errors (4xx except 429)
                if (error instanceof Error && (
                    error.message.includes('401') || 
                    error.message.includes('403') || 
                    error.message.includes('404')
                )) {
                    throw error;
                }

                // Don't retry on last attempt
                if (attempt === maxRetries - 1) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                console.log(`Retrying comment thread post attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.previewProvider.dispose();
    }
}