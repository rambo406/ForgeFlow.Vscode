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
                    vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')
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
        // Path to the Angular build output (copied by webpack to dist/webview)
        const webviewPath = path.join(this.context.extensionPath, 'dist', 'webview');
        
        // Get URIs for Angular build files
        const mainJsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(webviewPath, 'main.js'))
        );
        const polyfillsJsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(webviewPath, 'polyfills.js'))
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(webviewPath, 'styles.css'))
        );
        
        // Generate CSP nonce for security
        const nonce = this.generateNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
    <title>Review Comments</title>
    <base href="${webview.asWebviewUri(vscode.Uri.file(webviewPath))}/">
    <link rel="stylesheet" href="${stylesUri}">
    <style nonce="${nonce}">
        /* VS Code theme integration */
        :root {
            --vscode-foreground: var(--vscode-foreground);
            --vscode-editor-background: var(--vscode-editor-background);
            --vscode-button-background: var(--vscode-button-background);
            --vscode-button-foreground: var(--vscode-button-foreground);
            --vscode-font-family: var(--vscode-font-family);
            --vscode-font-size: var(--vscode-font-size);
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            overflow: hidden;
        }
        
        /* Loading state while Angular initializes */
        .angular-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            flex-direction: column;
            gap: 16px;
        }
        
        .angular-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-panel-border);
            border-top: 3px solid var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .angular-loading-text {
            color: var(--vscode-foreground);
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <app-comment-preview>
        <!-- Loading fallback while Angular bootstraps -->
        <div class="angular-loading">
            <div class="angular-loading-spinner"></div>
            <div class="angular-loading-text">Loading Comment Preview...</div>
        </div>
    </app-comment-preview>
    
    <!-- Angular runtime scripts -->
    <script nonce="${nonce}" src="${polyfillsJsUri}"></script>
    <script nonce="${nonce}" src="${mainJsUri}"></script>
    
    <!-- Initialize webview API for Angular -->
    <script nonce="${nonce}">
        // Make VS Code API available to Angular
        window.vscode = acquireVsCodeApi();
        
        // Pass initial comments data to Angular
        window.initialComments = ${JSON.stringify(this.comments)};
        
        // Restore webview state if available
        const previousState = window.vscode.getState();
        if (previousState) {
            window.vsCodeState = previousState;
        }
        
        // Set up error handling for Angular initialization
        window.addEventListener('error', function(e) {
            console.error('Angular application error:', e.error);
            window.vscode.postMessage({
                type: 'showError',
                data: { 
                    message: 'Angular application failed to initialize: ' + e.error?.message 
                }
            });
        });
    </script>
</body>
</html>`;
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
     * Generate a secure nonce for CSP
     */
    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
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
     * Dispose the provider
     */
    dispose(): void {
        this.cleanup();
    }
}