import * as vscode from 'vscode';
import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage } from '../Messages';

export class CommentsHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.APPROVE_COMMENT,
        MessageType.DISMISS_COMMENT,
        MessageType.MODIFY_COMMENT,
        MessageType.EXPORT_COMMENTS,
        MessageType.POST_COMMENTS
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
            case MessageType.POST_COMMENTS:
                return this.handlePostComments(message, ctx);
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

