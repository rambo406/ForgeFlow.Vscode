import * as vscode from 'vscode';
import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage } from '../Messages';
import { CommentAnalysisEngine, AnalysisProgress } from '../../services/CommentAnalysisEngine';
import { LanguageModelService } from '../../services/LanguageModelService';

export class AIAnalysisHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.START_AI_ANALYSIS,
        MessageType.AI_ANALYSIS_CANCEL
    ]);

    canHandle(type: MessageType): boolean {
        return this.types.has(type);
    }

    async handle(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        switch (message.type) {
            case MessageType.START_AI_ANALYSIS:
                return this.handleStartAIAnalysis(message, ctx);
            case MessageType.AI_ANALYSIS_CANCEL:
                return this.handleCancelAIAnalysis(message, ctx);
            default:
                return;
        }
    }

    private async handleStartAIAnalysis(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const prId = message.payload?.prId;
            if (!prId) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Pull request ID is required' }, requestId: message.requestId });
                return;
            }
            const projectName = ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }

            if (ctx.currentAnalysis) {
                ctx.currentAnalysis.cancellationTokenSource.cancel();
            }

            const cancellationTokenSource = new vscode.CancellationTokenSource();
            ctx.currentAnalysis = { cancellationTokenSource, prId };

            const pullRequest = await client.getPullRequest(projectName, prId);
            const fileChanges = await client.getDetailedFileChanges(projectName, pullRequest.repository.id, prId);
            if (fileChanges.length === 0) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'No file changes found to analyze' }, requestId: message.requestId });
                return;
            }

            const languageModelService = new LanguageModelService();
            const analysisEngine = new CommentAnalysisEngine(languageModelService, ctx.configurationManager);

            const progressCallback = (progress: AnalysisProgress) => {
                ctx.sendMessage({
                    type: MessageType.AI_ANALYSIS_PROGRESS,
                    payload: {
                        progress: {
                            completed: progress.completed,
                            total: progress.total,
                            currentFileName: progress.currentFileName,
                            stage: progress.stage,
                            message: progress.message,
                            percentage: Math.round((progress.completed / progress.total) * 100)
                        }
                    }
                });
            };

            progressCallback({ completed: 0, total: fileChanges.length, currentFileName: 'Initializing...', stage: 'initializing' });

            const analysisResult = await analysisEngine.analyzeChanges(fileChanges, progressCallback, cancellationTokenSource.token);

            ctx.currentAnalysis = undefined;

            ctx.sendMessage({
                type: MessageType.AI_ANALYSIS_COMPLETE,
                payload: {
                    prId,
                    result: { comments: analysisResult.comments, summary: analysisResult.summary, errors: analysisResult.errors }
                },
                requestId: message.requestId
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('AI analysis failed:', error);
            ctx.currentAnalysis = undefined;
            if (error instanceof vscode.CancellationError) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Analysis was cancelled' }, requestId: message.requestId });
            } else {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'AI analysis failed' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
            }
        }
    }

    private async handleCancelAIAnalysis(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        if (ctx.currentAnalysis) {
            ctx.currentAnalysis.cancellationTokenSource.cancel();
            ctx.currentAnalysis = undefined;
            ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: 'Analysis cancelled' }, requestId: message.requestId });
        } else {
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'No analysis is currently running' }, requestId: message.requestId });
        }
    }
}

