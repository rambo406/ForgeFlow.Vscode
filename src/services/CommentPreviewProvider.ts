import * as vscode from 'vscode';
import { ReviewComment } from '../models/AzureDevOpsModels';
import * as path from 'path';

/**
 * Message types for communication between webview and extension
 */
export interface WebviewMessage {
    type: string;
    data?: any;
}

export interface CommentUpdateMessage extends WebviewMessage {
    type: 'updateComment';
    data: {
        commentId: string;
        content: string;
        severity: 'error' | 'warning' | 'info';
        suggestion?: string;
    };
}

export interface CommentApprovalMessage extends WebviewMessage {
    type: 'toggleApproval';
    data: {
        commentId: string;
        isApproved: boolean;
    };
}

export interface CommentDeleteMessage extends WebviewMessage {
    type: 'deleteComment';
    data: {
        commentId: string;
    };
}

export interface PostCommentsMessage extends WebviewMessage {
    type: 'postComments';
    data: {
        approvedComments: ReviewComment[];
    };
}

export interface FilterUpdateMessage extends WebviewMessage {
    type: 'updateFilter';
    data: {
        severity?: string;
        fileName?: string;
        showApproved?: boolean;
    };
}

/**
 * Response from webview when user completes review
 */
export interface CommentReviewResult {
    action: 'post' | 'cancel' | 'save';
    comments: ReviewComment[];
    approvedCount: number;
}

/**
 * Webview-based comment preview and editing interface
 */
export class CommentPreviewProvider {
    private static readonly VIEW_TYPE = 'azdo-pr-reviewer.commentPreview';
    private panel: vscode.WebviewPanel | undefined;
    private comments: ReviewComment[] = [];
    private resolvePromise: ((result: CommentReviewResult) => void) | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Show comment preview interface and wait for user interaction
     */
    async showCommentPreview(comments: ReviewComment[]): Promise<CommentReviewResult> {
        this.comments = [...comments]; // Create a copy to avoid mutations

        // Create or reveal the webview panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
        } else {
            this.createWebviewPanel();
        }

        // Update the webview content with comments
        this.updateWebviewContent();

        // Return a promise that resolves when user completes the review
        return new Promise<CommentReviewResult>((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    /**
     * Create the webview panel
     */
    private createWebviewPanel(): void {
        this.panel = vscode.window.createWebviewPanel(
            CommentPreviewProvider.VIEW_TYPE,
            'Review Comments',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                    vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview')
                ]
            }
        );

        // Set up message handling
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleWebviewMessage(message),
            undefined,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => {
                this.cleanup();
                // If user closes panel without action, treat as cancel
                if (this.resolvePromise) {
                    this.resolvePromise({
                        action: 'cancel',
                        comments: this.comments,
                        approvedCount: this.comments.filter(c => c.isApproved).length
                    });
                }
            },
            undefined,
            this.disposables
        );
    }

    /**
     * Update the webview content with current comments
     */
    private updateWebviewContent(): void {
        if (!this.panel) return;

        const webview = this.panel.webview;
        const htmlContent = this.generateHtmlContent(webview);
        webview.html = htmlContent;
    }

    /**
     * Generate HTML content for the webview
     */
    private generateHtmlContent(webview: vscode.Webview): string {
        // Get URIs for CSS and JS files
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview', 'comment-preview.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview', 'comment-preview.js')
        );

        // Group comments by file for better organization
        const commentsByFile = this.groupCommentsByFile(this.comments);
        const summaryStats = this.calculateSummaryStats(this.comments);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Review Comments</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Pull Request Review Comments</h1>
            <div class="summary">
                <span class="stat">Total: ${summaryStats.total}</span>
                <span class="stat error">Errors: ${summaryStats.errors}</span>
                <span class="stat warning">Warnings: ${summaryStats.warnings}</span>
                <span class="stat info">Suggestions: ${summaryStats.info}</span>
                <span class="stat approved">Approved: ${summaryStats.approved}</span>
            </div>
        </header>

        <div class="controls">
            <div class="filters">
                <label for="severityFilter">Filter by severity:</label>
                <select id="severityFilter">
                    <option value="all">All</option>
                    <option value="error">Errors</option>
                    <option value="warning">Warnings</option>
                    <option value="info">Suggestions</option>
                </select>

                <label for="fileFilter">Filter by file:</label>
                <select id="fileFilter">
                    <option value="all">All Files</option>
                    ${Object.keys(commentsByFile).map(file => 
                        `<option value="${this.escapeHtml(file)}">${this.getFileName(file)}</option>`
                    ).join('')}
                </select>

                <label class="checkbox-label">
                    <input type="checkbox" id="showApproved" checked>
                    Show approved comments
                </label>
            </div>

            <div class="actions">
                <button id="selectAllBtn" class="btn btn-secondary">Select All</button>
                <button id="selectNoneBtn" class="btn btn-secondary">Select None</button>
                <button id="postCommentsBtn" class="btn btn-primary">Post Selected Comments</button>
                <button id="cancelBtn" class="btn btn-secondary">Cancel</button>
            </div>
        </div>

        <div class="content">
            ${this.generateFileCommentSections(commentsByFile)}
        </div>
    </div>

    <script>
        // Pass initial data to JavaScript
        window.initialComments = ${JSON.stringify(this.comments)};
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Group comments by file path
     */
    private groupCommentsByFile(comments: ReviewComment[]): { [fileName: string]: ReviewComment[] } {
        const grouped: { [fileName: string]: ReviewComment[] } = {};
        
        for (const comment of comments) {
            if (!grouped[comment.fileName]) {
                grouped[comment.fileName] = [];
            }
            grouped[comment.fileName].push(comment);
        }

        // Sort comments within each file by line number
        for (const fileName in grouped) {
            grouped[fileName].sort((a, b) => a.lineNumber - b.lineNumber);
        }

        return grouped;
    }

    /**
     * Calculate summary statistics
     */
    private calculateSummaryStats(comments: ReviewComment[]) {
        return {
            total: comments.length,
            errors: comments.filter(c => c.severity === 'error').length,
            warnings: comments.filter(c => c.severity === 'warning').length,
            info: comments.filter(c => c.severity === 'info').length,
            approved: comments.filter(c => c.isApproved).length
        };
    }

    /**
     * Generate HTML sections for file comments
     */
    private generateFileCommentSections(commentsByFile: { [fileName: string]: ReviewComment[] }): string {
        return Object.entries(commentsByFile)
            .map(([fileName, comments]) => this.generateFileSection(fileName, comments))
            .join('');
    }

    /**
     * Generate HTML for a single file section
     */
    private generateFileSection(fileName: string, comments: ReviewComment[]): string {
        const displayName = this.getFileName(fileName);
        const fileStats = this.calculateSummaryStats(comments);

        return `
        <div class="file-section" data-file="${this.escapeHtml(fileName)}">
            <div class="file-header">
                <h2 class="file-name">${this.escapeHtml(displayName)}</h2>
                <div class="file-stats">
                    <span class="file-path">${this.escapeHtml(fileName)}</span>
                    <span class="stat-badge">${fileStats.total} comments</span>
                </div>
            </div>
            <div class="comments-list">
                ${comments.map(comment => this.generateCommentCard(comment)).join('')}
            </div>
        </div>`;
    }

    /**
     * Generate HTML for a single comment card
     */
    private generateCommentCard(comment: ReviewComment): string {
        const escapedContent = this.escapeHtml(comment.content);
        const escapedSuggestion = comment.suggestion ? this.escapeHtml(comment.suggestion) : '';

        return `
        <div class="comment-card" data-comment-id="${comment.id}" data-severity="${comment.severity}" ${comment.isApproved ? 'data-approved="true"' : ''}>
            <div class="comment-header">
                <div class="comment-meta">
                    <span class="severity-badge ${comment.severity}">${comment.severity.toUpperCase()}</span>
                    <span class="line-number">Line ${comment.lineNumber}</span>
                </div>
                <div class="comment-actions">
                    <label class="approval-checkbox">
                        <input type="checkbox" ${comment.isApproved ? 'checked' : ''} data-action="toggle-approval">
                        <span class="checkmark"></span>
                        Approve
                    </label>
                    <button class="btn-icon" data-action="edit" title="Edit comment">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-.37.21L2.72 13.5a.75.75 0 0 1-.92-.92l.66-3.44a.75.75 0 0 1 .21-.37l7.25-7.25a.75.75 0 0 1 1.06 0l2.8 2.8z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-danger" data-action="delete" title="Delete comment">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 1.152l.557 10.05A1.5 1.5 0 0 0 4.551 15h6.898a1.5 1.5 0 0 0 1.498-1.298l.557-10.05a.58.58 0 0 0-.01-1.152H11Z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="comment-content">
                <div class="comment-text" data-field="content">${escapedContent}</div>
                ${comment.suggestion ? `
                <div class="suggestion-section">
                    <div class="suggestion-label">Suggested improvement:</div>
                    <div class="suggestion-text" data-field="suggestion">${escapedSuggestion}</div>
                </div>` : ''}
            </div>
        </div>`;
    }

    /**
     * Handle messages from the webview
     */
    private handleWebviewMessage(message: WebviewMessage): void {
        switch (message.type) {
            case 'updateComment':
                this.handleCommentUpdate(message as CommentUpdateMessage);
                break;
            case 'toggleApproval':
                this.handleApprovalToggle(message as CommentApprovalMessage);
                break;
            case 'deleteComment':
                this.handleCommentDelete(message as CommentDeleteMessage);
                break;
            case 'postComments':
                this.handlePostComments(message as PostCommentsMessage);
                break;
            case 'cancel':
                this.handleCancel();
                break;
            case 'selectAll':
                this.handleSelectAll();
                break;
            case 'selectNone':
                this.handleSelectNone();
                break;
        }
    }

    /**
     * Handle comment content updates
     */
    private handleCommentUpdate(message: CommentUpdateMessage): void {
        const { commentId, content, severity, suggestion } = message.data;
        const comment = this.comments.find(c => c.id === commentId);
        
        if (comment) {
            comment.content = content;
            comment.severity = severity;
            if (suggestion !== undefined) {
                comment.suggestion = suggestion || undefined;
            }
        }
    }

    /**
     * Handle approval toggle
     */
    private handleApprovalToggle(message: CommentApprovalMessage): void {
        const { commentId, isApproved } = message.data;
        const comment = this.comments.find(c => c.id === commentId);
        
        if (comment) {
            comment.isApproved = isApproved;
        }
    }

    /**
     * Handle comment deletion
     */
    private handleCommentDelete(message: CommentDeleteMessage): void {
        const { commentId } = message.data;
        const index = this.comments.findIndex(c => c.id === commentId);
        
        if (index !== -1) {
            this.comments.splice(index, 1);
            this.updateWebviewContent(); // Refresh the UI
        }
    }

    /**
     * Handle posting approved comments
     */
    private handlePostComments(message: PostCommentsMessage): void {
        const approvedComments = this.comments.filter(c => c.isApproved);
        
        if (this.resolvePromise) {
            this.resolvePromise({
                action: 'post',
                comments: approvedComments,
                approvedCount: approvedComments.length
            });
            this.cleanup();
        }
    }

    /**
     * Handle cancel action
     */
    private handleCancel(): void {
        if (this.resolvePromise) {
            this.resolvePromise({
                action: 'cancel',
                comments: this.comments,
                approvedCount: this.comments.filter(c => c.isApproved).length
            });
            this.cleanup();
        }
    }

    /**
     * Handle select all comments
     */
    private handleSelectAll(): void {
        this.comments.forEach(comment => {
            comment.isApproved = true;
        });
        this.updateWebviewContent();
    }

    /**
     * Handle deselect all comments
     */
    private handleSelectNone(): void {
        this.comments.forEach(comment => {
            comment.isApproved = false;
        });
        this.updateWebviewContent();
    }

    /**
     * Clean up resources
     */
    private cleanup(): void {
        this.panel?.dispose();
        this.panel = undefined;
        this.resolvePromise = undefined;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    /**
     * Utility function to escape HTML
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Get the file name from a full path
     */
    private getFileName(filePath: string): string {
        return path.basename(filePath);
    }

    /**
     * Dispose the provider
     */
    dispose(): void {
        this.cleanup();
    }
}