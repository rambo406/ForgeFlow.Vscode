import * as vscode from 'vscode';
import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage } from '../Messages';

export class CommentsHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.APPROVE_COMMENT,
        MessageType.DISMISS_COMMENT,
        MessageType.MODIFY_COMMENT,
        MessageType.EXPORT_COMMENTS,
<<<<<<< HEAD
        MessageType.CREATE_COMMENT_THREAD,
        MessageType.REPLY_TO_COMMENT_THREAD,
        MessageType.SUGGEST_COMMENT
=======
        MessageType.POST_COMMENTS
>>>>>>> 8a6ed91dc61cc80c455d4c05f74d458aee5842a1
    ]);

    canHandle(type: MessageType): boolean {
        return this.types.has(type);
    }

    async handle(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        switch (message.type) {
            case MessageType.APPROVE_COMMENT:
                return this.handleApproveComment(message, ctx);
            case MessageType.DISMISS_COMMENT:
                return this.handleDismissComment(message, ctx);
            case MessageType.MODIFY_COMMENT:
                return this.handleModifyComment(message, ctx);
            case MessageType.EXPORT_COMMENTS:
                return this.handleExportComments(message, ctx);
<<<<<<< HEAD
            case MessageType.CREATE_COMMENT_THREAD:
                return this.handleCreateCommentThread(message, ctx);
            case MessageType.REPLY_TO_COMMENT_THREAD:
                return this.handleReplyToCommentThread(message, ctx);
            case MessageType.SUGGEST_COMMENT:
                return this.handleSuggestComment(message, ctx);
=======
            case MessageType.POST_COMMENTS:
                return this.handlePostComments(message, ctx);
>>>>>>> 8a6ed91dc61cc80c455d4c05f74d458aee5842a1
            default:
                return;
        }
    }

    private async handleApproveComment(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { commentId } = message.payload || {};
            if (!commentId) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Comment ID is required' }, requestId: message.requestId });
                return;
            }
            ctx.sendMessage({ type: MessageType.APPROVE_COMMENT, payload: { commentId, status: 'approved' }, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: 'Comment approved successfully' }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to approve comment:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to approve comment' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleSuggestComment(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const { prId, filePath, oldFilePath, side, line } = message.payload || {};
            if (!prId || !filePath || !side || !line) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Missing fields for comment suggestion' }, requestId: message.requestId });
                return;
            }
            const projectName = ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            const pr = await client.getPullRequest(projectName, prId);
            const repoId = pr.repository.id;
            const contents = await client.getFileDiffContents(projectName, repoId, prId, filePath, oldFilePath);
            const targetText = side === 'right' ? (contents.modifiedContent || '') : (contents.originalContent || '');
            const snippet = this.buildSnippet(targetText, Number(line));

            try {
                const selectedModel = ctx.configurationManager.getSelectedModel();
                const customInstructions = ctx.configurationManager.getCustomInstructions();
                const systemPrompt = ctx.configurationManager.getInlineCommentSystemPrompt();
                const suggestion = await (ctx.languageModelService as any).suggestLineComment(
                    filePath,
                    side,
                    Number(line),
                    snippet,
                    customInstructions,
                    selectedModel,
                    undefined,
                    systemPrompt
                );
                ctx.sendMessage({ type: MessageType.SUGGEST_COMMENT_RESULT, payload: { prId, filePath, side, line, text: String(suggestion || '').trim() }, requestId: message.requestId });
            } catch (e) {
                // Fallback: simple heuristic message
                const fallback = `Consider reviewing this change around line ${line}. ${snippet.length > 0 ? 'Context included for reference.' : ''}`;
                ctx.sendMessage({ type: MessageType.SUGGEST_COMMENT_RESULT, payload: { prId, filePath, side, line, text: fallback }, requestId: message.requestId });
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to suggest comment:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to analyze suggestion' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private buildSnippet(text: string, line: number): string {
        try {
            const lines = String(text || '').split(/\r?\n/);
            const idx = Math.max(0, Math.min(lines.length - 1, Number(line) - 1));
            const start = Math.max(0, idx - 8);
            const end = Math.min(lines.length - 1, idx + 8);
            const numbered = [] as string[];
            for (let i = start; i <= end; i++) {
                const marker = (i === idx) ? '>' : ' ';
                const num = (i + 1).toString().padStart(4, ' ');
                numbered.push(`${marker} ${num}: ${lines[i]}`);
            }
            return numbered.join('\n');
        } catch {
            return text || '';
        }
    }

    private mapThreadsForFile(threads: any[], filePath: string, oldFilePath?: string): Array<{
        threadId: number;
        side: 'left' | 'right';
        line: number;
        status: string;
        messages: Array<{ id: number; author: string; content: string; publishedDate?: string; isSystem?: boolean }>
    }> {
        const norm = (p?: string) => (p || '').replace(/\\/g, '/');
        const rightPath = norm(filePath);
        const leftPath = norm(oldFilePath || filePath);
        return (threads || [])
            .filter(t => {
                const ctx = t?.threadContext;
                if (!ctx?.filePath) return false;
                const c = norm(ctx.filePath);
                return c === rightPath || c === leftPath;
            })
            .map(t => {
                const ctx = t.threadContext || {} as any;
                const hasRight = !!ctx.rightFileStart?.line;
                const side: 'left' | 'right' = hasRight ? 'right' : 'left';
                const line = hasRight ? Number(ctx.rightFileStart?.line || 1) : Number(ctx.leftFileStart?.line || 1);
                return {
                    threadId: Number(t.id || 0),
                    side,
                    line,
                    status: String(t.status || 'active'),
                    messages: (t.comments || [])
                        .filter((c: any) => !!c && typeof c.content === 'string')
                        .map((c: any) => ({
                            id: Number(c.id || 0),
                            author: String(c.author?.displayName || 'Unknown'),
                            content: String(c.content || ''),
                            publishedDate: c.publishedDate ? new Date(c.publishedDate).toISOString() : undefined,
                            isSystem: c.commentType === 'system'
                        }))
                };
            })
            .filter(t => t.messages && t.messages.length > 0);
    }

    private async handleCreateCommentThread(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const { prId, filePath, oldFilePath, side, line, content } = message.payload || {};
            if (!prId || !filePath || !side || !line || !content) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Missing required fields to create comment' }, requestId: message.requestId });
                return;
            }
            const projectName = ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            const pr = await client.getPullRequest(projectName, prId);
            const repoId = pr.repository.id;

            const threadContext: any = { filePath: side === 'right' ? filePath : (oldFilePath || filePath) };
            if (side === 'right') { threadContext.rightFileStart = { line: Number(line), offset: 1 }; }
            else { threadContext.leftFileStart = { line: Number(line), offset: 1 }; }

            await client.createCommentThread(projectName, repoId, prId, {
                status: 'active',
                threadContext,
                comments: [{ content: String(content), commentType: 'text' }]
            } as any);

            const threads = await client.getCommentThreads(projectName, repoId, prId);
            const payload = {
                filePath,
                comments: this.mapThreadsForFile(threads, filePath, oldFilePath)
            };
            ctx.sendMessage({ type: MessageType.UPDATE_FILE_COMMENTS, payload, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: 'Comment added' }, requestId: message.requestId });
        } catch (error) {
            console.error('Failed to create comment thread:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to add comment' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleReplyToCommentThread(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const { prId, threadId, content, filePath, oldFilePath } = message.payload || {};
            if (!prId || !threadId || !content || !filePath) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Missing required fields to reply to comment' }, requestId: message.requestId });
                return;
            }
            const projectName = ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            const pr = await client.getPullRequest(projectName, prId);
            const repoId = pr.repository.id;

            await client.createComment(projectName, repoId, prId, Number(threadId), { content: String(content), commentType: 'text' } as any);

            const threads = await client.getCommentThreads(projectName, repoId, prId);
            const payload = {
                filePath,
                comments: this.mapThreadsForFile(threads, filePath, oldFilePath)
            };
            ctx.sendMessage({ type: MessageType.UPDATE_FILE_COMMENTS, payload, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: 'Reply posted' }, requestId: message.requestId });
        } catch (error) {
            console.error('Failed to reply to comment thread:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to post reply' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleDismissComment(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { commentId, reason } = message.payload || {};
            if (!commentId) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Comment ID is required' }, requestId: message.requestId });
                return;
            }
            ctx.sendMessage({ type: MessageType.DISMISS_COMMENT, payload: { commentId, status: 'dismissed', reason }, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: 'Comment dismissed successfully' }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to dismiss comment:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to dismiss comment' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleModifyComment(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { commentId, newText } = message.payload || {};
            if (!commentId || !newText) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Comment ID and new text are required' }, requestId: message.requestId });
                return;
            }
            ctx.sendMessage({ type: MessageType.MODIFY_COMMENT, payload: { commentId, newText, status: 'modified' }, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: 'Comment modified successfully' }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to modify comment:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to modify comment' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleExportComments(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { comments, format = 'json' } = message.payload || {};
            if (!comments || !Array.isArray(comments)) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Comments array is required' }, requestId: message.requestId });
                return;
            }
            const approved = comments.filter((c: any) => c.status === 'approved'); // eslint-disable-line @typescript-eslint/no-explicit-any
            let exportData = '';
            let filename = '';
            if (format === 'csv') {
                const csvHeader = 'File,Line,Severity,Comment,Status\n';
                const csvRows = approved.map((c: any) => `"${c.filePath}","${c.lineNumber}","${c.severity}","${String(c.content).replace(/\"/g, '""')}","${c.status}"`).join('\n'); // eslint-disable-line @typescript-eslint/no-explicit-any
                exportData = csvHeader + csvRows;
                filename = `pr-review-comments-${Date.now()}.csv`;
            } else {
                exportData = JSON.stringify(approved, null, 2);
                filename = `pr-review-comments-${Date.now()}.json`;
            }
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(filename),
                filters: { 'JSON Files': ['json'], 'CSV Files': ['csv'], 'All Files': ['*'] }
            });
            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
                ctx.sendMessage({ type: MessageType.EXPORT_COMMENTS, payload: { success: true, filename: saveUri.fsPath }, requestId: message.requestId });
                ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: `Comments exported to ${saveUri.fsPath}` }, requestId: message.requestId });
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to export comments:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to export comments' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handlePostComments(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const projectName = ctx.configurationManager.getDefaultProject();
            const organizationUrl = ctx.configurationManager.getOrganizationUrl();
            const prId: number | undefined = message.payload?.prId;
            const comments: any[] | undefined = message.payload?.comments; // eslint-disable-line @typescript-eslint/no-explicit-any

            if (!projectName || !organizationUrl) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Missing configuration. Please set organization URL and default project.' }, requestId: message.requestId });
                return;
            }

            if (!prId || !Array.isArray(comments) || comments.length === 0) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'PR ID and at least one comment are required' }, requestId: message.requestId });
                return;
            }

            // Lazy import to avoid circular dependencies
            const { CommentManager } = await import('../../services/CommentManager');
            const { LanguageModelService } = await import('../../services/LanguageModelService');

            const manager = new CommentManager(
                ctx.extensionContext,
                new LanguageModelService(),
                client,
                ctx.configurationManager
            );

            const result = await manager.postCommentsBatch(
                comments as any, // already shaped as ReviewComment
                {
                    pullRequestId: prId,
                    organizationUrl,
                    projectName
                },
                5
            );

            if (result.postedComments > 0) {
                ctx.sendMessage({ type: MessageType.SHOW_SUCCESS, payload: { message: `Posted ${result.postedComments} comment(s)` }, requestId: message.requestId });
            }
            if (result.errors.length > 0) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: `Some comments failed to post: ${result.errors.join('; ')}` }, requestId: message.requestId });
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to post comments:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to post comments' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }
}
