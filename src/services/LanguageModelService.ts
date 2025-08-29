import * as vscode from 'vscode';
import { FileDiff, ReviewComment } from '../models/AzureDevOpsModels';
import { 
    ExtensionErrorHandler, 
    LanguageModelError, 
    ConfigurationError,
    ErrorUtils 
} from '../utils/ErrorHandler';
import { ProgressManager, BatchProcessor, ProgressTracker } from '../utils/ProgressManager';

/**
 * Available language model families for code review
 */
export interface LanguageModelInfo {
    id: string;
    vendor: string;
    family: string;
    name: string;
    maxTokens?: number;
    version?: string;
}

/**
 * Configuration for language model requests
 */
export interface LanguageModelRequestConfig {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
    justification?: string;
}

/**
 * Service for interacting with VS Code's Language Model API for code analysis
 */
export class LanguageModelService {
    private static readonly DEFAULT_MAX_TOKENS = 4000;
    private static readonly DEFAULT_TEMPERATURE = 0.1; // Low temperature for consistent code reviews
    private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
    private readonly errorHandler: ExtensionErrorHandler;

    constructor() {
        this.errorHandler = ExtensionErrorHandler.getInstance();
    }

    /**
     * Get all available language models for code review
     */
    async getAvailableModels(): Promise<LanguageModelInfo[]> {
        try {
            const models = await vscode.lm.selectChatModels();
            
            return models.map(model => ({
                id: model.id,
                vendor: model.vendor,
                family: model.family,
                name: model.name,
                maxTokens: model.maxInputTokens,
                version: model.version
            }));
        } catch (error) {
            throw new LanguageModelError(
                'Failed to fetch available language models',
                false,
                error as Error
            );
        }
    }

    /**
     * Get the selected language model or a default one
     */
    async getSelectedModel(modelPreference?: string): Promise<vscode.LanguageModelChat> {
        try {
            let models: vscode.LanguageModelChat[];

            if (modelPreference) {
                // Try to get the specific preferred model
                models = await vscode.lm.selectChatModels({
                    id: modelPreference
                });

                if (models.length > 0) {
                    return models[0];
                }

                console.warn(`Preferred model ${modelPreference} not available, falling back to default`);
            }

            // Fallback to Copilot models if available
            models = await vscode.lm.selectChatModels({
                vendor: 'copilot'
            });

            if (models.length > 0) {
                // Prefer GPT-4 models for better code analysis
                const gpt4Model = models.find(m => m.family.toLowerCase().includes('gpt-4'));
                return gpt4Model || models[0];
            }

            // Final fallback to any available model
            models = await vscode.lm.selectChatModels();
            
            if (models.length === 0) {
                throw new LanguageModelError('No language models available');
            }

            return models[0];
        } catch (error) {
            if (error instanceof LanguageModelError) {
                throw error;
            }
            throw new LanguageModelError(
                'Unable to access any language model',
                false,
                error as Error
            );
        }
    }

    /**
     * Analyze a file diff and generate review comments
     */
    async analyzeFileDiff(
        fileDiff: FileDiff,
        customInstructions: string = '',
        modelPreference?: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ReviewComment[]> {
        try {
            const model = await this.getSelectedModel(modelPreference);
            const prompt = this.buildCodeReviewPrompt(fileDiff, customInstructions);

            const requestConfig: LanguageModelRequestConfig = {
                maxTokens: LanguageModelService.DEFAULT_MAX_TOKENS,
                temperature: LanguageModelService.DEFAULT_TEMPERATURE,
                justification: 'Code review analysis for pull request'
            };

            const response = await this.makeModelRequest(model, prompt, requestConfig, cancellationToken);
            return this.parseReviewResponse(response, fileDiff.filePath);
        } catch (error) {
            console.error(`Failed to analyze file diff for ${fileDiff.filePath}:`, error);
            
            if (error instanceof vscode.LanguageModelError) {
                throw new Error(`Language model error: ${error.message} (Code: ${error.code})`);
            }
            
            throw error;
        }
    }

    /**
     * Analyze multiple file diffs in batch with progress tracking
     */
    async analyzeMultipleFiles(
        fileDiffs: FileDiff[],
        customInstructions: string = '',
        modelPreference?: string,
        progressCallback?: (completed: number, total: number, fileName: string) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ReviewComment[]> {
        if (fileDiffs.length === 0) {
            return [];
        }

        // Use batch processor for efficient processing with progress
        const batchProcessor = new BatchProcessor<FileDiff, ReviewComment[]>(5, 100); // 5 files per batch, 100ms delay
        
        const processor = async (fileDiff: FileDiff): Promise<ReviewComment[]> => {
            try {
                const comments = await this.analyzeFileDiff(
                    fileDiff,
                    customInstructions,
                    modelPreference,
                    cancellationToken
                );
                progressCallback?.(0, fileDiffs.length, fileDiff.filePath); // Progress will be handled by BatchProcessor
                return comments;
            } catch (error) {
                console.error(`Failed to analyze ${fileDiff.filePath}:`, error);
                return []; // Return empty array to continue with other files
            }
        };

        const results = await batchProcessor.processWithSettled(
            fileDiffs,
            processor,
            {
                title: 'Analyzing Code Changes',
                location: vscode.ProgressLocation.Notification,
                cancellable: true,
                totalSteps: fileDiffs.length
            },
            (result, item, index) => {
                progressCallback?.(index + 1, fileDiffs.length, item.filePath);
            }
        );

        // Flatten results and filter out errors
        const allComments: ReviewComment[] = [];
        for (const result of results) {
            if (!(result instanceof Error) && Array.isArray(result)) {
                allComments.push(...result);
            }
        }

        return allComments;
    }

    /**
     * Build a comprehensive code review prompt
     */
    private buildCodeReviewPrompt(fileDiff: FileDiff, customInstructions: string): vscode.LanguageModelChatMessage[] {
        const systemPrompt = this.buildSystemPrompt(customInstructions);
        const fileAnalysisPrompt = this.buildFileAnalysisPrompt(fileDiff);

        return [
            vscode.LanguageModelChatMessage.User(systemPrompt),
            vscode.LanguageModelChatMessage.User(fileAnalysisPrompt)
        ];
    }

    /**
     * Build the system prompt with custom instructions
     */
    private buildSystemPrompt(customInstructions: string): string {
        const baseInstructions = `You are an expert code reviewer performing a thorough analysis of code changes in a pull request. Your role is to:

1. **Identify Issues**: Find bugs, potential errors, security vulnerabilities, and performance problems
2. **Ensure Quality**: Check for code style, maintainability, readability, and best practices
3. **Suggest Improvements**: Provide constructive feedback and specific suggestions for enhancement
4. **Focus on Impact**: Prioritize comments that add real value to the code quality

**Review Guidelines:**
- Be constructive and specific in your feedback
- Explain the reasoning behind your suggestions
- Suggest concrete improvements when possible
- Consider the context and purpose of the code
- Focus on substantial issues rather than minor style preferences
- Use appropriate severity levels: 'error' for bugs/security issues, 'warning' for potential problems, 'info' for suggestions

**Response Format:**
Provide your review as a JSON array of comment objects. Each comment should have:
{
  "lineNumber": <number>, // Line number where the comment applies
  "severity": "<error|warning|info>", // Severity level
  "content": "<comment text>", // The review comment
  "suggestion": "<optional specific code suggestion>"
}

Only include comments where you have specific, actionable feedback. If the code looks good, return an empty array.`;

        if (customInstructions.trim()) {
            return `${baseInstructions}\n\n**Additional Instructions:**\n${customInstructions}`;
        }

        return baseInstructions;
    }

    /**
     * Build the file analysis prompt with diff content
     */
    private buildFileAnalysisPrompt(fileDiff: FileDiff): string {
        const { filePath, changeType, lines, addedLines, deletedLines } = fileDiff;
        
        let prompt = `**File Analysis Request**

File: \`${filePath}\`
Change Type: ${changeType}
Added Lines: ${addedLines}
Deleted Lines: ${deletedLines}

**Code Changes:**
\`\`\`diff`;

        // Include relevant diff lines for context
        const relevantLines = this.getRelevantDiffLines(lines);
        
        for (const line of relevantLines) {
            const prefix = line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' ';
            prompt += `\n${prefix}${line.content}`;
        }

        prompt += '\n```\n\nPlease review the above code changes and provide feedback as specified in the system instructions.';

        return prompt;
    }

    /**
     * Get relevant diff lines for analysis (focus on added/modified lines with context)
     */
    private getRelevantDiffLines(lines: any[]): any[] {
        const relevantLines: any[] = [];
        const maxLines = 100; // Limit to prevent token overflow

        // Include all added and deleted lines, plus some context
        for (let i = 0; i < lines.length && relevantLines.length < maxLines; i++) {
            const line = lines[i];
            
            if (line.type === 'added' || line.type === 'deleted') {
                // Include some context lines before and after
                const contextBefore = lines.slice(Math.max(0, i - 2), i);
                const contextAfter = lines.slice(i + 1, Math.min(lines.length, i + 3));
                
                // Add context lines that aren't already included
                contextBefore.forEach(contextLine => {
                    if (!relevantLines.some(rl => rl.lineNumber === contextLine.lineNumber)) {
                        relevantLines.push(contextLine);
                    }
                });
                
                // Add the actual line
                relevantLines.push(line);
                
                // Add context after
                contextAfter.forEach(contextLine => {
                    if (!relevantLines.some(rl => rl.lineNumber === contextLine.lineNumber)) {
                        relevantLines.push(contextLine);
                    }
                });
            }
        }

        // Sort by line number and remove duplicates
        return relevantLines
            .filter((line, index, arr) => 
                arr.findIndex(l => l.lineNumber === line.lineNumber) === index
            )
            .sort((a, b) => a.lineNumber - b.lineNumber)
            .slice(0, maxLines);
    }

    /**
     * Make a request to the language model with proper error handling
     */
    private async makeModelRequest(
        model: vscode.LanguageModelChat,
        messages: vscode.LanguageModelChatMessage[],
        config: LanguageModelRequestConfig,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const requestOptions: vscode.LanguageModelChatRequestOptions = {
            justification: config.justification || 'Code review analysis'
        };

        try {
            const response = await model.sendRequest(messages, requestOptions, cancellationToken);
            
            let result = '';
            for await (const chunk of response.text) {
                result += chunk;
                
                if (cancellationToken?.isCancellationRequested) {
                    throw new vscode.CancellationError();
                }
            }
            
            return result;
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                throw error;
            }
            
            if (error instanceof vscode.LanguageModelError) {
                console.error(`Language model error: ${error.message} (${error.code})`);
                throw error;
            }
            
            console.error('Unexpected error during model request:', error);
            throw new Error('Failed to get response from language model');
        }
    }

    /**
     * Parse the language model response into structured review comments
     */
    private parseReviewResponse(response: string, fileName: string): ReviewComment[] {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn('No JSON array found in response, attempting to parse entire response');
                // Try parsing the entire response as JSON
                const parsed = JSON.parse(response.trim());
                if (Array.isArray(parsed)) {
                    return this.validateAndTransformComments(parsed, fileName);
                }
                return [];
            }

            const jsonString = jsonMatch[0];
            const parsedComments = JSON.parse(jsonString);
            
            if (!Array.isArray(parsedComments)) {
                console.warn('Parsed response is not an array');
                return [];
            }

            return this.validateAndTransformComments(parsedComments, fileName);
        } catch (error) {
            console.error('Failed to parse language model response:', error);
            console.error('Response content:', response);
            
            // Fallback: try to extract comments from text format
            return this.parseTextResponse(response, fileName);
        }
    }

    /**
     * Validate and transform parsed comments into ReviewComment objects
     */
    private validateAndTransformComments(comments: any[], fileName: string): ReviewComment[] {
        return comments
            .filter(comment => {
                return comment && 
                       typeof comment.lineNumber === 'number' &&
                       typeof comment.content === 'string' &&
                       ['error', 'warning', 'info'].includes(comment.severity);
            })
            .map((comment, index) => ({
                id: `${fileName}-${comment.lineNumber}-${index}`,
                fileName: fileName,
                lineNumber: comment.lineNumber,
                content: comment.content,
                severity: comment.severity as 'error' | 'warning' | 'info',
                suggestion: comment.suggestion || undefined,
                isApproved: false
            }));
    }

    /**
     * Fallback parser for text-based responses
     */
    private parseTextResponse(response: string, fileName: string): ReviewComment[] {
        const comments: ReviewComment[] = [];
        const lines = response.split('\n');
        
        // Look for patterns like "Line X:" or similar
        let currentComment: Partial<ReviewComment> | null = null;
        
        for (const line of lines) {
            const lineMatch = line.match(/(?:line|Line)\s*(\d+)[\s:]/i);
            if (lineMatch) {
                // Save previous comment if exists
                if (currentComment && currentComment.content) {
                    comments.push({
                        id: `${fileName}-${currentComment.lineNumber}-${comments.length}`,
                        fileName: fileName,
                        lineNumber: currentComment.lineNumber!,
                        content: currentComment.content,
                        severity: currentComment.severity || 'info',
                        isApproved: false
                    });
                }
                
                // Start new comment
                currentComment = {
                    lineNumber: parseInt(lineMatch[1], 10),
                    content: line.replace(lineMatch[0], '').trim(),
                    severity: 'info'
                };
            } else if (currentComment && line.trim()) {
                // Continue building current comment
                currentComment.content = (currentComment.content || '') + ' ' + line.trim();
            }
        }
        
        // Add final comment
        if (currentComment && currentComment.content) {
            comments.push({
                id: `${fileName}-${currentComment.lineNumber}-${comments.length}`,
                fileName: fileName,
                lineNumber: currentComment.lineNumber!,
                content: currentComment.content,
                severity: currentComment.severity || 'info',
                isApproved: false
            });
        }
        
        return comments;
    }

    /**
     * Check if language model access is available
     */
    async isLanguageModelAvailable(): Promise<boolean> {
        try {
            const models = await vscode.lm.selectChatModels();
            return models.length > 0;
        } catch (error) {
            console.error('Error checking language model availability:', error);
            return false;
        }
    }

    /**
     * Check if a specific language model is available
     */
    async isModelAvailable(modelId: string): Promise<boolean> {
        try {
            const models = await vscode.lm.selectChatModels({
                id: modelId
            });
            return models.length > 0;
        } catch (error) {
            console.error(`Error checking availability of model ${modelId}:`, error);
            return false;
        }
    }

    /**
     * Get information about language model usage and limitations
     */
    async getModelUsageInfo(modelId?: string): Promise<string> {
        try {
            const models = await this.getAvailableModels();
            
            if (models.length === 0) {
                return 'No language models are currently available. Please install a language model extension (such as GitHub Copilot) and ensure you have appropriate access.';
            }

            let info = `Available language models (${models.length}):\n`;
            
            for (const model of models.slice(0, 5)) { // Show first 5 models
                info += `- ${model.name} (${model.vendor}/${model.family})`;
                if (model.maxTokens) {
                    info += ` - Max tokens: ${model.maxTokens}`;
                }
                info += '\n';
            }

            if (models.length > 5) {
                info += `... and ${models.length - 5} more models`;
            }

            return info;
        } catch (error) {
            return `Error retrieving model information: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
}