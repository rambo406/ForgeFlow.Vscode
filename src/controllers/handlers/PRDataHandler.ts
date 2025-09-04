import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage } from '../Messages';

export class PRDataHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.LOAD_PULL_REQUESTS,
        MessageType.LOAD_REPOSITORIES,
        MessageType.LOAD_PROJECTS,
        MessageType.SELECT_PULL_REQUEST,
        MessageType.LOAD_FILE_DIFF,
        MessageType.SEARCH_PULL_REQUESTS,
        MessageType.FILTER_PULL_REQUESTS,
        MessageType.REFRESH_PULL_REQUESTS
    ]);

    canHandle(type: MessageType): boolean {
        return this.types.has(type);
    }

    async handle(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        switch (message.type) {
            case MessageType.LOAD_PULL_REQUESTS:
                return this.handleLoadPullRequests(message, ctx);
            case MessageType.LOAD_REPOSITORIES:
                return this.handleLoadRepositories(message, ctx);
            case MessageType.LOAD_PROJECTS:
                return this.handleLoadProjects(message, ctx);
            case MessageType.SELECT_PULL_REQUEST:
                return this.handleSelectPullRequest(message, ctx);
            case MessageType.LOAD_FILE_DIFF:
                return this.handleLoadFileDiff(message, ctx);
            case MessageType.SEARCH_PULL_REQUESTS:
                return this.handleSearchPullRequests(message, ctx);
            case MessageType.FILTER_PULL_REQUESTS:
                return this.handleFilterPullRequests(message, ctx);
            case MessageType.REFRESH_PULL_REQUESTS:
                return this.handleRefreshPullRequests(message, ctx);
            default:
                return; // unreachable
        }
    }

    private async handleLoadFileDiff(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const prId = message.payload?.prId;
            const filePath = message.payload?.filePath as string | undefined;
            const oldFilePath = message.payload?.oldFilePath as string | undefined;
            if (!prId || !filePath) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'PR id and file path are required' }, requestId: message.requestId });
                return;
            }
            const projectName = ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }

            const pr = await client.getPullRequest(projectName, prId);
            const repoId = pr.repository.id;
            const diff = await client.getFileDiffContents(projectName, repoId, prId, filePath, oldFilePath);

            // Load Azure DevOps comment threads and map to UI-friendly payload for this file
            let commentsForFile: Array<{
                threadId: number;
                side: 'left' | 'right';
                line: number;
                status: string;
                messages: Array<{ id: number; author: string; content: string; publishedDate?: string; isSystem?: boolean }>
            }> = [];
            try {
                const threads = await client.getCommentThreads(projectName, repoId, prId);
                const normPath = (p: string | undefined) => (p || '').replace(/\\/g, '/');
                const rightPath = normPath(diff.modifiedPath || filePath);
                const leftPath = normPath(diff.originalPath || oldFilePath || filePath);

                commentsForFile = (threads || [])
                    .filter(t => {
                        const ctx = t.threadContext;
                        if (!ctx || !ctx.filePath) return false;
                        const ctxPath = normPath(ctx.filePath);
                        // Match either current (right) or original (left) path
                        return ctxPath === rightPath || ctxPath === leftPath;
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
                                .filter(c => !!c && typeof c.content === 'string')
                                .map(c => ({
                                    id: Number(c.id || 0),
                                    author: String(c.author?.displayName || 'Unknown'),
                                    content: String(c.content || ''),
                                    publishedDate: c.publishedDate ? new Date(c.publishedDate).toISOString() : undefined,
                                    isSystem: c.commentType === 'system'
                                }))
                        };
                    })
                    // Remove empty threads
                    .filter(t => t.messages && t.messages.length > 0);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('Failed to load PR comment threads for file', filePath, e);
                commentsForFile = [];
            }

            ctx.sendMessage({
                type: MessageType.LOAD_FILE_DIFF,
                payload: {
                    filePath,
                    leftPath: diff.originalPath || oldFilePath || filePath,
                    rightPath: diff.modifiedPath || filePath,
                    leftContent: diff.originalContent ?? '',
                    rightContent: diff.modifiedContent ?? '',
                    comments: commentsForFile
                },
                requestId: message.requestId
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load file diff content:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to load file diff content' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleLoadPullRequests(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();

            const filters = message.payload?.filters || {};
            const projectName = filters.project || ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required. Please set a default project or select one.' }, requestId: message.requestId });
                return;
            }

            const pullRequests = await client.getOpenPullRequests(projectName, filters.repository, filters.maxResults || 50);
            const transformedPRs = pullRequests.map(pr => ({
                id: pr.pullRequestId,
                title: pr.title,
                author: pr.createdBy.displayName,
                createdDate: pr.creationDate.toISOString(),
                status: pr.status,
                sourceRefName: pr.sourceRefName,
                targetRefName: pr.targetRefName,
                description: pr.description,
                repository: pr.repository?.name || 'Unknown',
                isDraft: pr.isDraft,
                url: pr._links?.web?.href || ''
            }));

            ctx.sendMessage({ type: MessageType.LOAD_PULL_REQUESTS, payload: { pullRequests: transformedPRs, projectName, totalCount: transformedPRs.length }, requestId: message.requestId });
            // eslint-disable-next-line no-console
            console.log('[Dashboard] Loaded pull requests', { count: transformedPRs.length, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load pull requests:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to load pull requests' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleLoadRepositories(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const projectName = message.payload?.project || ctx.configurationManager.getDefaultProject();
            if (!projectName) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            const repositories = await client.getRepositories(projectName);
            ctx.sendMessage({ type: MessageType.LOAD_REPOSITORIES, payload: { repositories, projectName }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load repositories:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to load repositories' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleLoadProjects(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const defaultProject = ctx.configurationManager.getDefaultProject();
            const projects = defaultProject ? [{ name: defaultProject, id: defaultProject }] : [];
            ctx.sendMessage({ type: MessageType.LOAD_PROJECTS, payload: { projects }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load projects:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to load projects' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleSelectPullRequest(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
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
            const pullRequest = await client.getPullRequest(projectName, prId);
            const repoId = pullRequest.repository.id;
            const fileChanges = await client.getDetailedFileChanges(projectName, repoId, prId);
            // Fetch comment threads once to compute per-file counts
            let threads: any[] = [];
            try {
                threads = await client.getCommentThreads(projectName, repoId, prId);
            } catch { threads = []; }

            const transformedPR = {
                id: pullRequest.pullRequestId,
                title: pullRequest.title,
                description: pullRequest.description,
                author: pullRequest.createdBy.displayName,
                createdDate: pullRequest.creationDate.toISOString(),
                status: pullRequest.status,
                sourceRefName: pullRequest.sourceRefName,
                targetRefName: pullRequest.targetRefName,
                repository: pullRequest.repository.name,
                isDraft: pullRequest.isDraft,
                url: pullRequest._links?.web?.href || ''
            };
            const transformedFileChanges = fileChanges.map(fc => ({
                filePath: fc.filePath,
                changeType: fc.changeType,
                oldFilePath: fc.oldFilePath,
                addedLines: fc.addedLines,
                deletedLines: fc.deletedLines,
                isBinary: fc.isBinary,
                isLargeFile: fc.isLargeFile,
                lines: fc.lines.map(l => ({ lineNumber: l.lineNumber, type: l.type, content: l.content, originalLineNumber: l.originalLineNumber })),
                commentCount: (() => {
                    const norm = (p?: string) => (p || '').replace(/\\/g, '/');
                    const right = norm(fc.filePath);
                    const left = norm(fc.oldFilePath || fc.filePath);
                    const related = (threads || []).filter((t: any) => {
                        const fp = norm(t?.threadContext?.filePath);
                        return fp === right || fp === left;
                    });
                    let count = 0;
                    for (const t of related) {
                        const cmts = Array.isArray(t.comments) ? t.comments : [];
                        count += cmts.filter((c: any) => c?.commentType !== 'system').length;
                    }
                    return count;
                })()
            }));

            ctx.currentView = 'pullRequestDetail' as any; // keep legacy string value for Angular routes

            ctx.sendMessage({
                type: MessageType.SELECT_PULL_REQUEST,
                payload: {
                    pullRequest: transformedPR,
                    fileChanges: transformedFileChanges,
                    stats: {
                        totalFiles: fileChanges.length,
                        totalAdditions: fileChanges.reduce((s, x) => s + x.addedLines, 0),
                        totalDeletions: fileChanges.reduce((s, x) => s + x.deletedLines, 0)
                    }
                },
                requestId: message.requestId
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load pull request details:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to load pull request details' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleSearchPullRequests(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const { query, projectName } = message.payload || {};
            const targetProject = projectName || ctx.configurationManager.getDefaultProject();
            if (!targetProject) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            const pullRequests = await client.getOpenPullRequests(targetProject);
            const q = String(query || '').toLowerCase();
            const filtered = q
                ? pullRequests.filter(pr =>
                    (pr.title || '').toLowerCase().includes(q) ||
                    (pr.description || '').toLowerCase().includes(q) ||
                    (pr.createdBy?.displayName || '').toLowerCase().includes(q))
                : pullRequests;

            ctx.sendMessage({ type: MessageType.SEARCH_PULL_REQUESTS, payload: { pullRequests: filtered, query, total: filtered.length }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to search pull requests:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to search pull requests' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleFilterPullRequests(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const { filters, projectName } = message.payload || {};
            const targetProject = projectName || ctx.configurationManager.getDefaultProject();
            if (!targetProject) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            let pullRequests = await client.getOpenPullRequests(targetProject);
            if (filters) {
                if (filters.repositoryId) {
                    pullRequests = pullRequests.filter(pr => pr.repository.id === filters.repositoryId);
                }
                if (filters.author) {
                    pullRequests = pullRequests.filter(pr => (pr.createdBy?.displayName || '').toLowerCase().includes(String(filters.author).toLowerCase()));
                }
                if (filters.status) {
                    pullRequests = pullRequests.filter(pr => pr.status === filters.status);
                }
                if (filters.dateRange) {
                    const { startDate, endDate } = filters.dateRange;
                    if (startDate) {
                        const start = new Date(startDate);
                        pullRequests = pullRequests.filter(pr => new Date(pr.creationDate) >= start);
                    }
                    if (endDate) {
                        const end = new Date(endDate);
                        pullRequests = pullRequests.filter(pr => new Date(pr.creationDate) <= end);
                    }
                }
            }
            ctx.sendMessage({ type: MessageType.FILTER_PULL_REQUESTS, payload: { pullRequests, filters, total: pullRequests.length }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to filter pull requests:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to filter pull requests' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleRefreshPullRequests(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const client = await ctx.ensureAzureClient();
            const { projectName } = message.payload || {};
            const targetProject = projectName || ctx.configurationManager.getDefaultProject();
            if (!targetProject) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Project name is required' }, requestId: message.requestId });
                return;
            }
            const pullRequests = await client.getOpenPullRequests(targetProject);
            ctx.sendMessage({ type: MessageType.REFRESH_PULL_REQUESTS, payload: { pullRequests, timestamp: new Date().toISOString() }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to refresh pull requests:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to refresh pull requests' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }
}
