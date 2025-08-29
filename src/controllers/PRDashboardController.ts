import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';
import { CommentAnalysisEngine, AnalysisProgress, AnalysisResult } from '../services/CommentAnalysisEngine';
import { LanguageModelService } from '../services/LanguageModelService';

/**
 * Message types for webview communication
 */
export enum MessageType {
    // Configuration
    LOAD_CONFIG = 'loadConfig',
    SAVE_CONFIG = 'saveConfig',
    TEST_CONNECTION = 'testConnection',
    
    // Search and Filtering
    SEARCH_PULL_REQUESTS = 'searchPullRequests',
    FILTER_PULL_REQUESTS = 'filterPullRequests',
    REFRESH_PULL_REQUESTS = 'refreshPullRequests',
    LOAD_PULL_REQUESTS = 'loadPullRequests',
    LOAD_REPOSITORIES = 'loadRepositories',
    LOAD_PROJECTS = 'loadProjects',
    SELECT_PULL_REQUEST = 'selectPullRequest',
    LOAD_PR_DETAILS = 'loadPRDetails',
    
    // AI Analysis
    START_AI_ANALYSIS = 'startAIAnalysis',
    AI_ANALYSIS_PROGRESS = 'aiAnalysisProgress',
    AI_ANALYSIS_COMPLETE = 'aiAnalysisComplete',
    AI_ANALYSIS_CANCEL = 'aiAnalysisCancel',
    
    // AI Comments
    APPROVE_COMMENT = 'approveComment',
    DISMISS_COMMENT = 'dismissComment',
    MODIFY_COMMENT = 'modifyComment',
    EXPORT_COMMENTS = 'exportComments',
    
    // UI Updates
    UPDATE_VIEW = 'updateView',
    SHOW_ERROR = 'showError',
    SHOW_SUCCESS = 'showSuccess'
}

/**
 * Message interface for webview communication
 */
export interface WebviewMessage {
    type: MessageType;
    payload?: any;
    requestId?: string;
}

/**
 * Dashboard view states
 */
export enum DashboardView {
    CONFIGURATION = 'configuration',
    PULL_REQUEST_LIST = 'pullRequestList',
    PULL_REQUEST_DETAIL = 'pullRequestDetail'
}

/**
 * Dashboard controller managing the webview panel and communication
 */
export class PRDashboardController {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private currentView: DashboardView = DashboardView.PULL_REQUEST_LIST;
    private currentAnalysis: {
        cancellationTokenSource: vscode.CancellationTokenSource;
        prId: number;
    } | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private configurationManager: ConfigurationManager,
        private azureDevOpsClient: AzureDevOpsClient | undefined
    ) {}

    /**
     * Create or show the dashboard panel
     */
    public async createOrShow(): Promise<void> {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this.panel) {
            this.panel.reveal(column);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'prDashboard',
            'Azure DevOps PR Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview'))
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.setupMessageHandling();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * Setup message handling between extension and webview
     */
    private setupMessageHandling(): void {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                try {
                    await this.handleMessage(message);
                } catch (error) {
                    console.error('Error handling webview message:', error);
                    this.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: 'An error occurred processing your request' },
                        requestId: message.requestId
                    });
                }
            },
            null,
            this.disposables
        );
    }

    /**
     * Handle messages from webview
     */
    private async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.type) {
            case MessageType.LOAD_CONFIG:
                await this.handleLoadConfig(message);
                break;
            case MessageType.SAVE_CONFIG:
                await this.handleSaveConfig(message);
                break;
            case MessageType.TEST_CONNECTION:
                await this.handleTestConnection(message);
                break;
            case MessageType.LOAD_PULL_REQUESTS:
                await this.handleLoadPullRequests(message);
                break;
            case MessageType.SEARCH_PULL_REQUESTS:
                await this.handleSearchPullRequests(message);
                break;
            case MessageType.FILTER_PULL_REQUESTS:
                await this.handleFilterPullRequests(message);
                break;
            case MessageType.REFRESH_PULL_REQUESTS:
                await this.handleRefreshPullRequests(message);
                break;
            case MessageType.LOAD_REPOSITORIES:
                await this.handleLoadRepositories(message);
                break;
            case MessageType.LOAD_PROJECTS:
                await this.handleLoadProjects(message);
                break;
            case MessageType.SELECT_PULL_REQUEST:
                await this.handleSelectPullRequest(message);
                break;
            case MessageType.UPDATE_VIEW:
                await this.handleUpdateView(message);
                break;
            case MessageType.START_AI_ANALYSIS:
                await this.handleStartAIAnalysis(message);
                break;
            case MessageType.AI_ANALYSIS_CANCEL:
                await this.handleCancelAIAnalysis(message);
                break;
            case MessageType.APPROVE_COMMENT:
                await this.handleApproveComment(message);
                break;
            case MessageType.DISMISS_COMMENT:
                await this.handleDismissComment(message);
                break;
            case MessageType.MODIFY_COMMENT:
                await this.handleModifyComment(message);
                break;
            case MessageType.EXPORT_COMMENTS:
                await this.handleExportComments(message);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    /**
     * Send message to webview
     */
    private sendMessage(message: WebviewMessage): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    /**
     * Handle configuration loading
     */
    private async handleLoadConfig(message: WebviewMessage): Promise<void> {
        try {
            const config = {
                organizationUrl: this.configurationManager.getOrganizationUrl() || '',
                personalAccessToken: await this.configurationManager.getPatToken() || '',
                defaultProject: this.configurationManager.getDefaultProject() || '',
                selectedModel: this.configurationManager.getSelectedModel(),
                customInstructions: this.configurationManager.getCustomInstructions(),
                batchSize: this.configurationManager.getBatchSize(),
                enableTelemetry: this.configurationManager.isTelemetryEnabled()
            };

            this.sendMessage({
                type: MessageType.LOAD_CONFIG,
                payload: { config },
                requestId: message.requestId
            });
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load configuration' },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle configuration saving
     */
    private async handleSaveConfig(message: WebviewMessage): Promise<void> {
        try {
            const config = message.payload?.config;
            if (!config) {
                throw new Error('Configuration data is required');
            }

            // Validate and save organization URL
            if (config.organizationUrl) {
                const urlResult = await this.configurationManager.setOrganizationUrl(config.organizationUrl);
                if (!urlResult.isValid) {
                    this.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: urlResult.error || 'Invalid organization URL' },
                        requestId: message.requestId
                    });
                    return;
                }
            }

            // Save PAT token
            if (config.personalAccessToken) {
                await this.configurationManager.setPatToken(config.personalAccessToken);
            }

            // Save other configuration settings
            const vscodeConfig = vscode.workspace.getConfiguration('azdo-pr-reviewer');
            
            if (config.defaultProject !== undefined) {
                await vscodeConfig.update('defaultProject', config.defaultProject || undefined, vscode.ConfigurationTarget.Global);
            }
            
            if (config.selectedModel) {
                const modelResult = await this.configurationManager.setSelectedModel(config.selectedModel);
                if (!modelResult.isValid) {
                    this.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: modelResult.error || 'Invalid model selection' },
                        requestId: message.requestId
                    });
                    return;
                }
            }
            
            if (config.customInstructions !== undefined) {
                await vscodeConfig.update('customInstructions', config.customInstructions, vscode.ConfigurationTarget.Global);
            }
            
            if (config.batchSize !== undefined) {
                await vscodeConfig.update('batchSize', config.batchSize, vscode.ConfigurationTarget.Global);
            }
            
            if (config.enableTelemetry !== undefined) {
                await vscodeConfig.update('enableTelemetry', config.enableTelemetry, vscode.ConfigurationTarget.Global);
            }

            this.sendMessage({
                type: MessageType.SAVE_CONFIG,
                payload: { success: true },
                requestId: message.requestId
            });

            this.sendMessage({
                type: MessageType.SHOW_SUCCESS,
                payload: { message: 'Configuration saved successfully' },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to save configuration: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle connection testing
     */
    private async handleTestConnection(message: WebviewMessage): Promise<void> {
        try {
            const config = message.payload?.config;
            if (!config || !config.organizationUrl || !config.personalAccessToken) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Organization URL and Personal Access Token are required for testing' },
                    requestId: message.requestId
                });
                return;
            }

            // Test the connection using the configuration manager
            const validationResult = await this.configurationManager.validatePatToken(
                config.personalAccessToken,
                config.organizationUrl
            );

            if (validationResult.isValid) {
                this.sendMessage({
                    type: MessageType.TEST_CONNECTION,
                    payload: { success: true, message: validationResult.details },
                    requestId: message.requestId
                });

                this.sendMessage({
                    type: MessageType.SHOW_SUCCESS,
                    payload: { message: 'Connection test successful: ' + validationResult.details },
                    requestId: message.requestId
                });
            } else {
                this.sendMessage({
                    type: MessageType.TEST_CONNECTION,
                    payload: { success: false, error: validationResult.error },
                    requestId: message.requestId
                });

                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Connection test failed: ' + validationResult.error },
                    requestId: message.requestId
                });
            }

        } catch (error) {
            console.error('Connection test failed:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle pull requests loading
     */
    private async handleLoadPullRequests(message: WebviewMessage): Promise<void> {
        try {
            // Check if we have an Azure DevOps client
            if (!this.azureDevOpsClient) {
                // Try to initialize it
                const isConfigured = await this.configurationManager.isConfigured();
                if (!isConfigured) {
                    this.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: 'Extension is not configured. Please configure it first.' },
                        requestId: message.requestId
                    });
                    return;
                }

                const organizationUrl = this.configurationManager.getOrganizationUrl();
                const patToken = await this.configurationManager.getPatToken();
                
                if (!organizationUrl || !patToken) {
                    this.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: 'Missing configuration. Please check your settings.' },
                        requestId: message.requestId
                    });
                    return;
                }

                // Import dynamically to avoid circular dependencies
                const { AzureDevOpsClient } = await import('../services/AzureDevOpsClient');
                this.azureDevOpsClient = new AzureDevOpsClient(organizationUrl, patToken);
            }

            // Get filter parameters from the request
            const filters = message.payload?.filters || {};
            const projectName = filters.project || this.configurationManager.getDefaultProject();
            
            if (!projectName) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required. Please set a default project or select one.' },
                    requestId: message.requestId
                });
                return;
            }

            // Fetch pull requests
            const pullRequests = await this.azureDevOpsClient.getOpenPullRequests(
                projectName,
                filters.repository,
                filters.maxResults || 50
            );

            // Transform the data for the webview
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

            this.sendMessage({
                type: MessageType.LOAD_PULL_REQUESTS,
                payload: { 
                    pullRequests: transformedPRs,
                    projectName: projectName,
                    totalCount: transformedPRs.length
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to load pull requests:', error);
            
            let errorMessage = 'Failed to load pull requests';
            if (error instanceof Error) {
                errorMessage += ': ' + error.message;
            }
            
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: errorMessage },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle repositories loading
     */
    private async handleLoadRepositories(message: WebviewMessage): Promise<void> {
        try {
            if (!this.azureDevOpsClient) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Azure DevOps client not initialized' },
                    requestId: message.requestId
                });
                return;
            }

            const projectName = message.payload?.project || this.configurationManager.getDefaultProject();
            if (!projectName) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required' },
                    requestId: message.requestId
                });
                return;
            }

            const repositories = await this.azureDevOpsClient.getRepositories(projectName);

            this.sendMessage({
                type: MessageType.LOAD_REPOSITORIES,
                payload: { repositories, projectName },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to load repositories:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load repositories: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle projects loading (placeholder - Azure DevOps REST API doesn't provide easy project enumeration)
     */
    private async handleLoadProjects(message: WebviewMessage): Promise<void> {
        try {
            // For now, return the default project or empty list
            // In a real implementation, you'd need to call the Core API to get projects
            const defaultProject = this.configurationManager.getDefaultProject();
            const projects = defaultProject ? [{ name: defaultProject, id: defaultProject }] : [];

            this.sendMessage({
                type: MessageType.LOAD_PROJECTS,
                payload: { projects },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to load projects:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load projects: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle pull request selection
     */
    private async handleSelectPullRequest(message: WebviewMessage): Promise<void> {
        try {
            if (!this.azureDevOpsClient) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Azure DevOps client not initialized' },
                    requestId: message.requestId
                });
                return;
            }

            const prId = message.payload?.prId;
            if (!prId) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Pull request ID is required' },
                    requestId: message.requestId
                });
                return;
            }

            const projectName = this.configurationManager.getDefaultProject();
            if (!projectName) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Get the pull request details
            const pullRequest = await this.azureDevOpsClient.getPullRequest(projectName, prId);
            
            // Get file changes for this PR
            const fileChanges = await this.azureDevOpsClient.getDetailedFileChanges(
                projectName,
                pullRequest.repository.id,
                prId
            );

            // Transform the PR data for the webview
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

            // Transform file changes for the webview
            const transformedFileChanges = fileChanges.map(fileChange => ({
                filePath: fileChange.filePath,
                changeType: fileChange.changeType,
                oldFilePath: fileChange.oldFilePath,
                addedLines: fileChange.addedLines,
                deletedLines: fileChange.deletedLines,
                isBinary: fileChange.isBinary,
                isLargeFile: fileChange.isLargeFile,
                lines: fileChange.lines.map(line => ({
                    lineNumber: line.lineNumber,
                    type: line.type,
                    content: line.content,
                    originalLineNumber: line.originalLineNumber
                }))
            }));

            this.currentView = DashboardView.PULL_REQUEST_DETAIL;
            
            this.sendMessage({
                type: MessageType.SELECT_PULL_REQUEST,
                payload: { 
                    pullRequest: transformedPR,
                    fileChanges: transformedFileChanges,
                    stats: {
                        totalFiles: fileChanges.length,
                        totalAdditions: fileChanges.reduce((sum, fc) => sum + fc.addedLines, 0),
                        totalDeletions: fileChanges.reduce((sum, fc) => sum + fc.deletedLines, 0)
                    }
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to load pull request details:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load pull request details: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle view updates
     */
    private async handleUpdateView(message: WebviewMessage): Promise<void> {
        this.currentView = message.payload?.view || DashboardView.PULL_REQUEST_LIST;
        this.sendMessage({
            type: MessageType.UPDATE_VIEW,
            payload: { view: this.currentView },
            requestId: message.requestId
        });
    }

    /**
     * Handle AI analysis start
     */
    private async handleStartAIAnalysis(message: WebviewMessage): Promise<void> {
        try {
            if (!this.azureDevOpsClient) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Azure DevOps client not initialized' },
                    requestId: message.requestId
                });
                return;
            }

            const prId = message.payload?.prId;
            if (!prId) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Pull request ID is required' },
                    requestId: message.requestId
                });
                return;
            }

            const projectName = this.configurationManager.getDefaultProject();
            if (!projectName) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Cancel any existing analysis
            if (this.currentAnalysis) {
                this.currentAnalysis.cancellationTokenSource.cancel();
            }

            // Create cancellation token for this analysis
            const cancellationTokenSource = new vscode.CancellationTokenSource();
            this.currentAnalysis = {
                cancellationTokenSource,
                prId
            };

            // Get the pull request details
            const pullRequest = await this.azureDevOpsClient.getPullRequest(projectName, prId);
            
            // Get file changes for this PR
            const fileChanges = await this.azureDevOpsClient.getDetailedFileChanges(
                projectName,
                pullRequest.repository.id,
                prId
            );

            if (fileChanges.length === 0) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'No file changes found to analyze' },
                    requestId: message.requestId
                });
                return;
            }

            // Initialize analysis services
            const languageModelService = new LanguageModelService();
            const analysisEngine = new CommentAnalysisEngine(languageModelService, this.configurationManager);

            // Start analysis with progress tracking
            const progressCallback = (progress: AnalysisProgress) => {
                this.sendMessage({
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

            // Send initial progress
            progressCallback({
                completed: 0,
                total: fileChanges.length,
                currentFileName: 'Initializing...',
                stage: 'initializing'
            });

            // Run the analysis
            const analysisResult = await analysisEngine.analyzeChanges(
                fileChanges,
                progressCallback,
                cancellationTokenSource.token
            );

            // Clear current analysis
            this.currentAnalysis = undefined;

            // Send completion message
            this.sendMessage({
                type: MessageType.AI_ANALYSIS_COMPLETE,
                payload: {
                    prId,
                    result: {
                        comments: analysisResult.comments,
                        summary: analysisResult.summary,
                        errors: analysisResult.errors
                    }
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('AI analysis failed:', error);
            
            // Clear current analysis
            this.currentAnalysis = undefined;

            if (error instanceof vscode.CancellationError) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Analysis was cancelled' },
                    requestId: message.requestId
                });
            } else {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'AI analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
                    requestId: message.requestId
                });
            }
        }
    }

    /**
     * Handle AI analysis cancellation
     */
    private async handleCancelAIAnalysis(message: WebviewMessage): Promise<void> {
        if (this.currentAnalysis) {
            this.currentAnalysis.cancellationTokenSource.cancel();
            this.currentAnalysis = undefined;
            
            this.sendMessage({
                type: MessageType.SHOW_SUCCESS,
                payload: { message: 'Analysis cancelled' },
                requestId: message.requestId
            });
        } else {
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'No analysis is currently running' },
                requestId: message.requestId
            });
        }
    }

    /**
     * Get webview HTML content
     */
    private getWebviewContent(): string {
        const scriptUri = this.panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview', 'dashboard.js'))
        );
        const styleUri = this.panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'webview', 'dashboard.css'))
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure DevOps PR Dashboard</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div id="app">
        <header class="dashboard-header">
            <h1>Azure DevOps PR Dashboard</h1>
            <div class="header-actions">
                <button id="configBtn" class="config-btn" title="Configuration">
                    <span class="codicon codicon-gear"></span>
                </button>
            </div>
        </header>
        
        <nav class="dashboard-nav">
            <button id="prListBtn" class="nav-btn active" data-view="pullRequestList">
                Pull Requests
            </button>
            <button id="prDetailBtn" class="nav-btn" data-view="pullRequestDetail" style="display: none;">
                PR Details
            </button>
        </nav>
        
        <main class="dashboard-main">
            <!-- Configuration View -->
            <div id="configurationView" class="view-container" style="display: none;">
                <div class="config-section">
                    <h2>Configuration</h2>
                    <div id="configContent">
                        <!-- Configuration form will be loaded here -->
                    </div>
                </div>
            </div>
            
            <!-- Pull Request List View -->
            <div id="pullRequestListView" class="view-container">
                <div class="pr-list-section">
                    <div class="pr-list-header">
                        <h2>Open Pull Requests</h2>
                        <button id="refreshBtn" class="refresh-btn">
                            <span class="codicon codicon-refresh"></span>
                            Refresh
                        </button>
                    </div>
                    <div id="prListContent">
                        <!-- PR list will be loaded here -->
                    </div>
                </div>
            </div>
            
            <!-- Pull Request Detail View -->
            <div id="pullRequestDetailView" class="view-container" style="display: none;">
                <div class="pr-detail-section">
                    <div class="pr-detail-header">
                        <button id="backBtn" class="back-btn">
                            <span class="codicon codicon-arrow-left"></span>
                            Back to List
                        </button>
                        <h2 id="prTitle">PR Details</h2>
                    </div>
                    <div id="prDetailContent">
                        <!-- PR details will be loaded here -->
                    </div>
                </div>
            </div>
        </main>
        
        <div id="loadingOverlay" class="loading-overlay" style="display: none;">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading...</div>
        </div>
        
        <div id="errorToast" class="toast error-toast" style="display: none;">
            <span class="toast-message"></span>
            <button class="toast-close">×</button>
        </div>
        
        <div id="successToast" class="toast success-toast" style="display: none;">
            <span class="toast-message"></span>
            <button class="toast-close">×</button>
        </div>
    </div>
    
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Dispose any current analysis
        if (this.currentAnalysis) {
            this.currentAnalysis.cancellationTokenSource.cancel();
            this.currentAnalysis = undefined;
        }

        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Handle comment approval
     */
    private async handleApproveComment(message: WebviewMessage): Promise<void> {
        try {
            const { commentId, filePath } = message.payload;
            
            if (!commentId) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Comment ID is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Here you would typically save the approved comment to Azure DevOps
            // For now, we'll just mark it as approved in our local state
            
            this.sendMessage({
                type: MessageType.APPROVE_COMMENT,
                payload: { commentId, status: 'approved' },
                requestId: message.requestId
            });

            this.sendMessage({
                type: MessageType.SHOW_SUCCESS,
                payload: { message: 'Comment approved successfully' },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to approve comment:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to approve comment: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle comment dismissal
     */
    private async handleDismissComment(message: WebviewMessage): Promise<void> {
        try {
            const { commentId, reason } = message.payload;
            
            if (!commentId) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Comment ID is required' },
                    requestId: message.requestId
                });
                return;
            }

            this.sendMessage({
                type: MessageType.DISMISS_COMMENT,
                payload: { commentId, status: 'dismissed', reason },
                requestId: message.requestId
            });

            this.sendMessage({
                type: MessageType.SHOW_SUCCESS,
                payload: { message: 'Comment dismissed successfully' },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to dismiss comment:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to dismiss comment: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle comment modification
     */
    private async handleModifyComment(message: WebviewMessage): Promise<void> {
        try {
            const { commentId, newText } = message.payload;
            
            if (!commentId || !newText) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Comment ID and new text are required' },
                    requestId: message.requestId
                });
                return;
            }

            this.sendMessage({
                type: MessageType.MODIFY_COMMENT,
                payload: { commentId, newText, status: 'modified' },
                requestId: message.requestId
            });

            this.sendMessage({
                type: MessageType.SHOW_SUCCESS,
                payload: { message: 'Comment modified successfully' },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to modify comment:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to modify comment: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle comment export
     */
    private async handleExportComments(message: WebviewMessage): Promise<void> {
        try {
            const { comments, format = 'json' } = message.payload;
            
            if (!comments || !Array.isArray(comments)) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Comments array is required' },
                    requestId: message.requestId
                });
                return;
            }

            const approved = comments.filter(c => c.status === 'approved');
            
            let exportData = '';
            let filename = '';
            
            if (format === 'csv') {
                const csvHeader = 'File,Line,Severity,Comment,Status\n';
                const csvRows = approved.map(c => 
                    `"${c.filePath}","${c.lineNumber}","${c.severity}","${c.content.replace(/"/g, '""')}","${c.status}"`
                ).join('\n');
                exportData = csvHeader + csvRows;
                filename = `pr-review-comments-${Date.now()}.csv`;
            } else {
                exportData = JSON.stringify(approved, null, 2);
                filename = `pr-review-comments-${Date.now()}.json`;
            }

            // Use VS Code API to save file
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(filename),
                filters: {
                    'JSON Files': ['json'],
                    'CSV Files': ['csv'],
                    'All Files': ['*']
                }
            });

            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
                
                this.sendMessage({
                    type: MessageType.EXPORT_COMMENTS,
                    payload: { success: true, filename: saveUri.fsPath },
                    requestId: message.requestId
                });

                this.sendMessage({
                    type: MessageType.SHOW_SUCCESS,
                    payload: { message: `Comments exported to ${saveUri.fsPath}` },
                    requestId: message.requestId
                });
            }

        } catch (error) {
            console.error('Failed to export comments:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to export comments: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle search pull requests
     */
    private async handleSearchPullRequests(message: WebviewMessage): Promise<void> {
        try {
            if (!this.azureDevOpsClient) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Azure DevOps client not initialized' },
                    requestId: message.requestId
                });
                return;
            }

            const { query, projectName, repositoryId } = message.payload;
            const targetProject = projectName || this.configurationManager.getDefaultProject();
            
            if (!targetProject) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Get all pull requests first
            let pullRequests = await this.azureDevOpsClient.getOpenPullRequests(targetProject);
            
            // Apply repository filter if specified
            if (repositoryId) {
                pullRequests = pullRequests.filter(pr => pr.repository.id === repositoryId);
            }
            
            // Apply search query if provided
            if (query && query.trim()) {
                const searchTerm = query.trim().toLowerCase();
                pullRequests = pullRequests.filter(pr => 
                    pr.title.toLowerCase().includes(searchTerm) ||
                    pr.description?.toLowerCase().includes(searchTerm) ||
                    pr.createdBy?.displayName?.toLowerCase().includes(searchTerm) ||
                    pr.repository.name.toLowerCase().includes(searchTerm)
                );
            }

            this.sendMessage({
                type: MessageType.SEARCH_PULL_REQUESTS,
                payload: { 
                    pullRequests,
                    query,
                    total: pullRequests.length
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to search pull requests:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to search pull requests: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle filter pull requests
     */
    private async handleFilterPullRequests(message: WebviewMessage): Promise<void> {
        try {
            if (!this.azureDevOpsClient) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Azure DevOps client not initialized' },
                    requestId: message.requestId
                });
                return;
            }

            const { filters, projectName } = message.payload;
            const targetProject = projectName || this.configurationManager.getDefaultProject();
            
            if (!targetProject) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Get all pull requests
            let pullRequests = await this.azureDevOpsClient.getOpenPullRequests(targetProject);
            
            // Apply filters
            if (filters) {
                if (filters.repositoryId) {
                    pullRequests = pullRequests.filter(pr => pr.repository.id === filters.repositoryId);
                }
                
                if (filters.author) {
                    pullRequests = pullRequests.filter(pr => 
                        pr.createdBy?.displayName?.toLowerCase().includes(filters.author.toLowerCase())
                    );
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

            this.sendMessage({
                type: MessageType.FILTER_PULL_REQUESTS,
                payload: { 
                    pullRequests,
                    filters,
                    total: pullRequests.length
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to filter pull requests:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to filter pull requests: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle refresh pull requests
     */
    private async handleRefreshPullRequests(message: WebviewMessage): Promise<void> {
        try {
            if (!this.azureDevOpsClient) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Azure DevOps client not initialized' },
                    requestId: message.requestId
                });
                return;
            }

            const { projectName } = message.payload || {};
            const targetProject = projectName || this.configurationManager.getDefaultProject();
            
            if (!targetProject) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Project name is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Force refresh by getting latest data
            const pullRequests = await this.azureDevOpsClient.getOpenPullRequests(targetProject);

            this.sendMessage({
                type: MessageType.REFRESH_PULL_REQUESTS,
                payload: { 
                    pullRequests,
                    timestamp: new Date().toISOString()
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to refresh pull requests:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to refresh pull requests: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }
}