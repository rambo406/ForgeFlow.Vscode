import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { 
    PullRequest, 
    FileChange, 
    CommentThread,
    Comment,
    AzureDevOpsApiResponse, 
    AzureDevOpsError,
    ValidationResult,
    FileDiff,
    DiffLine,
    PullRequestIteration
} from '../models/AzureDevOpsModels';
import { 
    ExtensionErrorHandler, 
    AuthenticationError, 
    AuthorizationError, 
    NetworkError, 
    RateLimitError, 
    ResourceError,
    ErrorUtils 
} from '../utils/ErrorHandler';

/**
 * Client for interacting with Azure DevOps REST APIs
 */
export class AzureDevOpsClient {
    private readonly httpClient: AxiosInstance;
    private readonly baseUrl: string;
    private readonly authHeader: string;
    private readonly errorHandler: ExtensionErrorHandler;

    constructor(organizationUrl: string, patToken: string) {
        this.baseUrl = this.sanitizeBaseUrl(organizationUrl);
        this.authHeader = `Basic ${Buffer.from(`:${patToken}`).toString('base64')}`;
        this.errorHandler = ExtensionErrorHandler.getInstance();
        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000, // 30 second timeout
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'VSCode-AzdoPrReviewer/1.0.0'
            }
        });

        // Add request interceptor for logging
        this.httpClient.interceptors.request.use(
            (config) => {
                console.log(`[AzureDevOpsClient] ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('[AzureDevOpsClient] Request error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for error handling
        this.httpClient.interceptors.response.use(
            (response) => {
                console.log(`[AzureDevOpsClient] Response: ${response.status} ${response.statusText}`);
                return response;
            },
            (error) => {
                return Promise.reject(this.handleApiError(error));
            }
        );
    }

    /**
     * Get raw file content at a specific commit
     */
    private async getItemContentAtCommit(
        project: string,
        repositoryId: string,
        filePath: string,
        commitId: string
    ): Promise<string> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/items`;
            const response = await this.makeRequestWithRetry<string>({
                method: 'GET',
                url,
                params: {
                    'api-version': '7.1',
                    'path': filePath,
                    'includeContent': true,
                    'versionDescriptor.versionType': 'commit',
                    'versionDescriptor.version': commitId
                },
                headers: { 'Accept': 'text/plain' },
                responseType: 'text'
            });
            return response.data || '';
        } catch (error: any) {
            // If file not found in this commit (e.g., added/deleted), return empty content
            const status = error?.response?.status;
            if (status === 404) { return ''; }
            console.error(`Failed to fetch item content for ${filePath} at ${commitId}:`, error);
            throw error;
        }
    }

    /**
     * Get left/right file contents for Monaco diff for a PR file
     */
    async getFileDiffContents(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        filePath: string,
        originalPath?: string,
        iterationId?: number
    ): Promise<{ originalContent: string; modifiedContent: string; originalPath?: string; modifiedPath?: string; }>
    {
        const iteration = iterationId || await this.getLatestIterationId(project, repositoryId, pullRequestId);
        const iterations = await this.getPullRequestIterations(project, repositoryId, pullRequestId);
        const targetIteration = iterations.find(i => i.id === iteration);
        if (!targetIteration) {
            throw new Error(`Iteration ${iteration} not found`);
        }
        const baseCommit = targetIteration.commonRefCommit.commitId;
        const targetCommit = targetIteration.sourceRefCommit.commitId;

        // Use originalPath if provided (for renames); otherwise filePath
        const leftPath = originalPath || filePath;
        const rightPath = filePath;

        const [left, right] = await Promise.all([
            this.getItemContentAtCommit(project, repositoryId, leftPath, baseCommit).catch(() => ''),
            this.getItemContentAtCommit(project, repositoryId, rightPath, targetCommit).catch(() => '')
        ]);

        return {
            originalContent: left || '',
            modifiedContent: right || '',
            originalPath: leftPath,
            modifiedPath: rightPath
        };
    }

    /**
     * Sanitize and format the base URL
     */
    private sanitizeBaseUrl(url: string): string {
        const cleaned = url.trim().replace(/\/+$/, '');
        if (!cleaned.startsWith('https://')) {
            throw new Error('Organization URL must use HTTPS');
        }
        return cleaned;
    }

    /**
     * Handle and transform API errors into user-friendly messages
     */
    private handleApiError(error: AxiosError): Error {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new NetworkError(
                `Network connection failed: ${error.message}`,
                true,
                error
            );
        }

        if (error.code === 'ECONNABORTED') {
            return new NetworkError(
                `Request timeout: ${error.message}`,
                true,
                error
            );
        }

        if (error.response) {
            const status = error.response.status;
            const azError = error.response.data as AzureDevOpsError;
            
            switch (status) {
                case 401: {
                    return new AuthenticationError(
                        `Authentication failed (${status}): ${azError?.message || error.message}`,
                        error
                    );
                }
                case 403: {
                    return new AuthorizationError(
                        `Access denied (${status}): ${azError?.message || error.message}`,
                        error
                    );
                }
                case 404: {
                    return new ResourceError(
                        `Resource not found (${status}): ${azError?.message || error.message}`,
                        false,
                        error
                    );
                }
                case 429: {
                    const retryAfter = error.response.headers['retry-after'];
                    return new RateLimitError(
                        `Rate limit exceeded (${status}): ${azError?.message || error.message}`,
                        retryAfter ? parseInt(retryAfter, 10) : undefined,
                        error
                    );
                }
                case 500:
                case 502:
                case 503:
                case 504: {
                    return new NetworkError(
                        `Azure DevOps service error (${status}): ${azError?.message || error.message}`,
                        true,
                        error
                    );
                }
                default: {
                    return new NetworkError(
                        `Azure DevOps API error (${status}): ${azError?.message || error.message}`,
                        false,
                        error
                    );
                }
            }
        }

        return new NetworkError(
            `Request failed: ${error.message || 'Unknown error'}`,
            true,
            error
        );
    }

    /**
     * Make a request with retry logic and exponential backoff
     */
    private async makeRequestWithRetry<T>(
        requestConfig: AxiosRequestConfig,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<AxiosResponse<T>> {
        const requestFn = async (): Promise<AxiosResponse<T>> => {
            return await this.httpClient.request<T>(requestConfig);
        };

        return await ErrorUtils.withRetry(
            requestFn,
            maxRetries,
            baseDelay,
            `Azure DevOps API request to ${requestConfig.url}`
        )();
    }

    /**
     * Test the connection and authentication
     */
    async testConnection(): Promise<ValidationResult> {
        try {
            const response = await this.makeRequestWithRetry<{ displayName: string }>({
                method: 'GET',
                url: '/_apis/profile/profiles/me?api-version=7.1-preview.3'
            });

            if (response.status === 200 && response.data) {
                return {
                    isValid: true,
                    details: `Connected successfully as: ${response.data.displayName}`
                };
            }

            return {
                isValid: false,
                error: 'Invalid response from Azure DevOps',
                details: 'Received unexpected response format'
            };
        } catch (error) {
            return {
                isValid: false,
                error: 'Connection test failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get all open pull requests for a project with pagination support
     */
    async getOpenPullRequests(
        project: string,
        repository?: string,
        maxResults: number = 100
    ): Promise<PullRequest[]> {
        try {
            const baseUrl = repository 
                ? `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repository)}/pullrequests`
                : `/${encodeURIComponent(project)}/_apis/git/pullrequests`;

            const response = await this.makeRequestWithRetry<AzureDevOpsApiResponse<PullRequest>>({
                method: 'GET',
                url: baseUrl,
                params: {
                    'api-version': '7.1',
                    'searchCriteria.status': 'active',
                    '$top': Math.min(maxResults, 100) // Azure DevOps limits to 100 per request
                }
            });

            return response.data.value.map(pr => ({
                ...pr,
                creationDate: new Date(pr.creationDate)
            }));
        } catch (error) {
            console.error('Failed to fetch pull requests:', error);
            throw error;
        }
    }

    /**
     * Get a specific pull request by ID
     */
    async getPullRequest(project: string, pullRequestId: number, repository?: string): Promise<PullRequest> {
        try {
            const baseUrl = repository
                ? `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repository)}/pullrequests/${pullRequestId}`
                : `/${encodeURIComponent(project)}/_apis/git/pullrequests/${pullRequestId}`;

            const response = await this.makeRequestWithRetry<PullRequest>({
                method: 'GET',
                url: baseUrl,
                params: {
                    'api-version': '7.1'
                }
            });

            return {
                ...response.data,
                creationDate: new Date(response.data.creationDate)
            };
        } catch (error) {
            console.error(`Failed to fetch pull request ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Get all iterations for a pull request
     */
    async getPullRequestIterations(
        project: string,
        repositoryId: string,
        pullRequestId: number
    ): Promise<PullRequestIteration[]> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/iterations`;
            
            const response = await this.makeRequestWithRetry<AzureDevOpsApiResponse<PullRequestIteration>>({
                method: 'GET',
                url: url,
                params: {
                    'api-version': '7.1'
                }
            });

            return response.data.value.map(iteration => ({
                ...iteration,
                createdDate: new Date(iteration.createdDate),
                updatedDate: new Date(iteration.updatedDate)
            }));
        } catch (error) {
            console.error(`Failed to fetch iterations for PR ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Get file changes for a pull request with enhanced filtering and processing
     */
    async getPullRequestChanges(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        iterationId?: number,
        includeContent: boolean = false
    ): Promise<FileChange[]> {
        try {
            const iteration = iterationId || await this.getLatestIterationId(project, repositoryId, pullRequestId);
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/iterations/${iteration}/changes`;
            
            // The Azure DevOps API may return either { changes: [...] } or { changeEntries: [...] }
            const response = await this.makeRequestWithRetry<any>({
                method: 'GET',
                url: url,
                params: {
                    'api-version': '7.1',
                    '$top': 1000,
                    'includeContent': includeContent
                }
            });
            // Normalize response: the Azure DevOps API may return several shapes
            //  - AxiosResponse with .data: { changes: [...] } | { changeEntries: [...] } | { value: [...] }
            //  - Direct payload: an array of changes
            //  - AxiosResponse where .data is already an array
            let payload: any = null;

            // If this is an Axios response, prefer .data
            if (response && typeof response === 'object' && 'data' in response) {
                payload = (response as any).data;
            } else {
                // Could be a direct payload
                payload = response;
            }

            let changes: FileChange[] = [];

            if (Array.isArray(payload)) {
                changes = payload;
            } else if (payload && typeof payload === 'object') {
                if (Array.isArray(payload.changes)) {
                    changes = payload.changes;
                } else if (Array.isArray(payload.changeEntries)) {
                    changes = payload.changeEntries;
                } else if (Array.isArray(payload.value)) {
                    changes = payload.value;
                } else {
                    // Try to find the first array property that looks like changes
                    const arrayProp = Object.keys(payload).find(k => Array.isArray((payload as any)[k]));
                    if (arrayProp) {
                        changes = (payload as any)[arrayProp];
                    } else {
                        console.warn('[AzureDevOpsClient] Unexpected changes response shape', Object.keys(payload));
                    }
                }
            } else {
                console.warn('[AzureDevOpsClient] Empty changes payload for PR changes');
            }

            return this.filterAndEnhanceFileChanges(changes || []);
        } catch (error) {
            console.error(`Failed to fetch changes for PR ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Get detailed file changes with diff analysis
     */
    async getDetailedFileChanges(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        batchSize: number = 10
    ): Promise<FileDiff[]> {
        try {
            const fileChanges = await this.getPullRequestChanges(project, repositoryId, pullRequestId);
            const reviewableChanges = this.getReviewableFileChanges(fileChanges);
            
            const results: FileDiff[] = [];
            
            // Process in batches to avoid overwhelming the API
            for (let i = 0; i < reviewableChanges.length; i += batchSize) {
                const batch = reviewableChanges.slice(i, i + batchSize);
                const batchPromises = batch.map(change => 
                    this.getFileDiffDetail(project, repositoryId, pullRequestId, change)
                );
                
                const batchResults = await Promise.allSettled(batchPromises);
                
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        results.push(result.value);
                    } else {
                        console.warn(`Failed to get diff for file: ${batch[index].item.path}`, result.status === 'rejected' ? result.reason : 'Unknown error');
                    }
                });

                // Add small delay between batches to be respectful to the API
                if (i + batchSize < reviewableChanges.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            return results;
        } catch (error) {
            console.error(`Failed to fetch detailed file changes for PR ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Get latest iteration ID for a pull request
     */
    private async getLatestIterationId(
        project: string,
        repositoryId: string,
        pullRequestId: number
    ): Promise<number> {
        const iterations = await this.getPullRequestIterations(project, repositoryId, pullRequestId);
        return iterations.length > 0 ? Math.max(...iterations.map(i => i.id)) : 1;
    }

    /**
     * Filter and enhance file changes with metadata
     */
    private filterAndEnhanceFileChanges(changes: FileChange[]): FileChange[] {
        return changes
            .filter(change => {
                // Skip non-reviewable files
                if (!change.item || change.item.isFolder) {
                    return false;
                }

                const path = change.item.path.toLowerCase();
                
                // Skip binary files and generated files
                const binaryExtensions = [
                    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
                    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
                    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                    '.zip', '.tar', '.gz', '.rar', '.7z',
                    '.mp3', '.mp4', '.avi', '.mov', '.wav',
                    '.ttf', '.otf', '.woff', '.woff2'
                ];

                const isBinary = binaryExtensions.some(ext => path.endsWith(ext));
                if (isBinary) {
                    return false;
                }

                // Skip common generated/dependency files
                const skipPatterns = [
                    'package-lock.json',
                    'yarn.lock',
                    'pnpm-lock.yaml',
                    '.min.js',
                    '.min.css',
                    'node_modules/',
                    'bin/',
                    'obj/',
                    'dist/',
                    'build/',
                    '.git/',
                    '__pycache__/',
                    '.pyc'
                ];

                const shouldSkip = skipPatterns.some(pattern => 
                    path.includes(pattern.toLowerCase())
                );

                return !shouldSkip;
            })
            .map(change => ({
                ...change,
                isBinary: false,
                isLargeFile: false // Will be determined when fetching content
            }));
    }

    /**
     * Get reviewable file changes (non-binary, non-generated)
     */
    private getReviewableFileChanges(changes: FileChange[]): FileChange[] {
        return changes.filter(change => !change.isBinary && !change.isLargeFile);
    }

    /**
     * Get detailed diff information for a specific file
     */
    private async getFileDiffDetail(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        fileChange: FileChange
    ): Promise<FileDiff | null> {
        try {
            const diff = await this.getFileDiff(project, repositoryId, pullRequestId, fileChange.item.path);
            
            if (!diff) {
                return null;
            }

            const parsedDiff = this.parseDiff(diff);
            const isLargeFile = parsedDiff.lines.length > 500; // Consider files with >500 changed lines as large

            return {
                filePath: fileChange.item.path,
                changeType: fileChange.changeType,
                oldFilePath: fileChange.originalPath,
                lines: parsedDiff.lines,
                addedLines: parsedDiff.addedLines,
                deletedLines: parsedDiff.deletedLines,
                isBinary: false,
                isLargeFile: isLargeFile,
                encoding: 'utf-8'
            };
        } catch (error) {
            console.error(`Failed to get diff detail for file ${fileChange.item.path}:`, error);
            return null;
        }
    }

    /**
     * Parse unified diff format into structured diff lines
     */
    private parseDiff(diffContent: any): { lines: DiffLine[], addedLines: number, deletedLines: number } {
        const lines: DiffLine[] = [];
        let addedLines = 0;
        let deletedLines = 0;
        let currentLineNumber = 0;
        let currentOriginalLineNumber = 0;

        // Normalize diffContent to string safely
        let contentStr = '';
        try {
            if (diffContent == null) {
                contentStr = '';
            } else if (typeof diffContent === 'string') {
                contentStr = diffContent;
            } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(diffContent)) {
                contentStr = diffContent.toString('utf8');
            } else if (diffContent instanceof ArrayBuffer || ArrayBuffer.isView(diffContent)) {
                const view = diffContent instanceof ArrayBuffer ? new Uint8Array(diffContent) : new Uint8Array((diffContent as any).buffer || diffContent);
                contentStr = new TextDecoder('utf-8').decode(view);
            } else if (typeof diffContent === 'object') {
                // Try to extract common text properties
                if (typeof (diffContent as any).content === 'string') {
                    contentStr = (diffContent as any).content;
                } else if (typeof (diffContent as any).diff === 'string') {
                    contentStr = (diffContent as any).diff;
                } else if (typeof (diffContent as any).value === 'string') {
                    contentStr = (diffContent as any).value;
                } else {
                    // Fallback to JSON representation which will at least be parseable
                    contentStr = JSON.stringify(diffContent);
                }
            } else {
                contentStr = String(diffContent);
            }
        } catch (err) {
            console.warn('[AzureDevOpsClient] parseDiff normalization failed:', err);
            contentStr = '';
        }

        const diffLines = contentStr.split(/\r?\n/);

        for (const line of diffLines) {
            if (!line) continue;

            if (line.startsWith('@@')) {
                // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
                const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
                if (match) {
                    currentOriginalLineNumber = parseInt(match[1], 10);
                    currentLineNumber = parseInt(match[2], 10);
                }
                continue;
            }

            if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ')) {
                continue;
            }

            const firstChar = line.charAt(0);
            const content = line.substring(1);

            switch (firstChar) {
                case '+':
                    lines.push({
                        lineNumber: currentLineNumber,
                        type: 'added',
                        content: content
                    });
                    addedLines++;
                    currentLineNumber++;
                    break;
                case '-':
                    lines.push({
                        lineNumber: currentOriginalLineNumber,
                        type: 'deleted',
                        content: content,
                        originalLineNumber: currentOriginalLineNumber
                    });
                    deletedLines++;
                    currentOriginalLineNumber++;
                    break;
                case ' ':
                default:
                    lines.push({
                        lineNumber: currentLineNumber,
                        type: 'context',
                        content: content,
                        originalLineNumber: currentOriginalLineNumber
                    });
                    currentLineNumber++;
                    currentOriginalLineNumber++;
                    break;
            }
        }

        return { lines, addedLines, deletedLines };
    }

    /**
     * Get the diff for a specific file in a pull request
     */
    async getFileDiff(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        filePath: string,
        iterationId?: number
    ): Promise<string> {
        try {
            const iteration = iterationId || await this.getLatestIterationId(project, repositoryId, pullRequestId);
            
            // Use the diffs API to get unified diff format
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/diffs/commits`;
            
            // Get the iteration details to find the commit IDs
            const iterations = await this.getPullRequestIterations(project, repositoryId, pullRequestId);
            const targetIteration = iterations.find(i => i.id === iteration);
            
            if (!targetIteration) {
                throw new Error(`Iteration ${iteration} not found`);
            }

            const response = await this.makeRequestWithRetry<string>({
                method: 'GET',
                url: url,
                params: {
                    'api-version': '7.1',
                    'baseVersionCommit': targetIteration.commonRefCommit.commitId,
                    'targetVersionCommit': targetIteration.sourceRefCommit.commitId,
                    'diffCommonCommit': true,
                    'path': filePath
                },
                headers: {
                    'Accept': 'text/plain'
                },
                // Request raw text so axios will return a string in response.data
                responseType: 'text'
            });

            return response.data;
        } catch (error) {
            console.error(`Failed to fetch diff for file ${filePath}:`, error);
            
            // Fallback: try to get file content comparison
            try {
                return await this.getFileContentDiff(project, repositoryId, pullRequestId, filePath);
            } catch (fallbackError) {
                console.error(`Fallback diff method also failed for ${filePath}:`, fallbackError);
                throw error;
            }
        }
    }

    /**
     * Fallback method to get file diff by comparing content
     */
    private async getFileContentDiff(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        filePath: string
    ): Promise<string> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/iterations/1/changes`;
            
            const response = await this.makeRequestWithRetry<{ changes: Array<{ item: { path: string, url: string }, content?: { content: string } }> }>({
                method: 'GET',
                url: url,
                params: {
                    'api-version': '7.1',
                    'path': filePath,
                    'includeContent': true
                }
            });

            const change = response.data.changes?.find(c => c.item.path === filePath);
            if (!change?.content?.content) {
                return '';
            }

            // This is a simplified diff - in a real implementation you might want to
            // get the base version and compare line by line
            const content = change.content.content;
            const lines = content.split('\n');
            
            // Generate a simple diff format (all lines as added for new files)
            return lines.map((line, index) => `+${line}`).join('\n');
        } catch (error) {
            console.error(`Failed to get content diff for file ${filePath}:`, error);
            return '';
        }
    }

    /**
     * Create a comment thread on a pull request
     */
    async createCommentThread(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        thread: CommentThread
    ): Promise<CommentThread> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads`;
            
            const response = await this.makeRequestWithRetry<CommentThread>({
                method: 'POST',
                url: url,
                params: {
                    'api-version': '7.1'
                },
                data: thread
            });

            return response.data;
        } catch (error) {
            console.error(`Failed to create comment thread for PR ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing comment thread
     */
    async updateCommentThread(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        threadId: number,
        thread: Partial<CommentThread>
    ): Promise<CommentThread> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads/${threadId}`;
            
            const response = await this.makeRequestWithRetry<CommentThread>({
                method: 'PATCH',
                url: url,
                params: {
                    'api-version': '7.1'
                },
                data: thread
            });

            return response.data;
        } catch (error) {
            console.error(`Failed to update comment thread ${threadId}:`, error);
            throw error;
        }
    }

    /**
     * Get all comment threads for a pull request
     */
    async getCommentThreads(
        project: string,
        repositoryId: string,
        pullRequestId: number
    ): Promise<CommentThread[]> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads`;
            
            const response = await this.makeRequestWithRetry<AzureDevOpsApiResponse<CommentThread>>({
                method: 'GET',
                url: url,
                params: {
                    'api-version': '7.1'
                }
            });

            return response.data.value;
        } catch (error) {
            console.error(`Failed to fetch comment threads for PR ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new comment in an existing thread
     */
    async createComment(
        project: string,
        repositoryId: string,
        pullRequestId: number,
        threadId: number,
        comment: Comment
    ): Promise<Comment> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads/${threadId}/comments`;
            const response = await this.makeRequestWithRetry<Comment>({
                method: 'POST',
                url,
                params: { 'api-version': '7.1' },
                data: comment
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to create comment in thread ${threadId} for PR ${pullRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Get repositories for a project
     */
    async getRepositories(project: string): Promise<Array<{ id: string; name: string; url: string }>> {
        try {
            const url = `/${encodeURIComponent(project)}/_apis/git/repositories`;
            
            const response = await this.makeRequestWithRetry<AzureDevOpsApiResponse<{ id: string; name: string; url: string }>>({
                method: 'GET',
                url: url,
                params: {
                    'api-version': '7.1'
                }
            });

            return response.data.value;
        } catch (error) {
            console.error(`Failed to fetch repositories for project ${project}:`, error);
            throw error;
        }
    }

    /**
     * Cancel all pending requests (useful for cleanup)
     */
    cancelPendingRequests(): void {
        // Note: Axios doesn't have a direct way to cancel all requests
        // This would require implementing a custom cancellation token system
        console.log('[AzureDevOpsClient] Request cancellation requested');
    }
}
