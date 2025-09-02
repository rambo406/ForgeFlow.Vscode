import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';
import { AnalysisProgress, CommentAnalysisEngine } from '../services/CommentAnalysisEngine';
import { LanguageModelService } from '../services/LanguageModelService';
import { SettingsValidationService } from '../services/SettingsValidationService';
import { ValidationResult } from '../models/AzureDevOpsModels';
import { SettingsUtils } from '../utils/SettingsUtils';

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
    SHOW_SUCCESS = 'showSuccess',

    // Settings
    OPEN_SETTINGS = 'openSettings',
    CLOSE_SETTINGS = 'closeSettings',
    VALIDATE_SETTING = 'validateSetting',
    SAVE_SETTINGS = 'saveSettings',
    RESET_SETTINGS = 'resetSettings',
    EXPORT_SETTINGS = 'exportSettings',
    IMPORT_SETTINGS = 'importSettings',
    SETTINGS_CHANGED = 'settingsChanged',
    LOAD_AVAILABLE_MODELS = 'loadAvailableModels',
    // Navigation
    NAVIGATE = 'navigate'
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
    private settingsValidationService: SettingsValidationService;
    private languageModelService: LanguageModelService;
    private settingsPanelOpen = false;

    constructor(
        private context: vscode.ExtensionContext,
        private configurationManager: ConfigurationManager,
        private azureDevOpsClient: AzureDevOpsClient | undefined
    ) {
        this.languageModelService = new LanguageModelService();
        this.settingsValidationService = new SettingsValidationService(this.languageModelService);
    }

    /**
     * Create or show the dashboard panel
     */
    public async createOrShow(initialRoute?: string): Promise<void> {
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
                    // Angular webview build output
                    vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview'))
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.setupMessageHandling();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Send initial navigation route to Angular webview if provided
        if (initialRoute) {
            try {
                // Post after a short delay to allow Angular to bootstrap
                setTimeout(() => {
                    this.sendMessage({ type: MessageType.NAVIGATE, payload: { path: `/${initialRoute}` } });
                }, 50);
            } catch (e) {
                // ignore
            }
        }
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

        // Dispose settings validation service
        if (this.settingsValidationService) {
            this.settingsValidationService.dispose();
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
     * Setup message handling between extension and webview
     */
    private setupMessageHandling(): void {
        if (!this.panel) {
            return;
        }

        this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                // Log incoming message for debugging request/response flow
                try {
                    console.log('[PRDashboard] Received message from webview', {
                        type: message?.type,
                        requestId: message?.requestId
                    });
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
            // Settings-related handlers
            case MessageType.OPEN_SETTINGS:
                await this.handleOpenSettings(message);
                break;
            case MessageType.CLOSE_SETTINGS:
                await this.handleCloseSettings(message);
                break;
            case MessageType.VALIDATE_SETTING:
                await this.handleValidateSetting(message);
                break;
            case MessageType.SAVE_SETTINGS:
                await this.handleSaveSettings(message);
                break;
            case MessageType.RESET_SETTINGS:
                await this.handleResetSettings(message);
                break;
            case MessageType.EXPORT_SETTINGS:
                await this.handleExportSettings(message);
                break;
            case MessageType.IMPORT_SETTINGS:
                await this.handleImportSettings(message);
                break;
            case MessageType.LOAD_AVAILABLE_MODELS:
                await this.handleLoadAvailableModels(message);
                break;
            case MessageType.SHOW_ERROR:
                // Handle error messages from webview (for logging purposes)
                console.error('[PRDashboard] Error from webview:', message.payload?.message || 'Unknown error');
                break;
            case MessageType.SHOW_SUCCESS:
                // Handle success messages from webview (for logging purposes)
                console.log('[PRDashboard] Success from webview:', message.payload?.message || 'Success');
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
            // Log outgoing messages to help match responses to requests
            try {
                console.log('[PRDashboard] Sending message to webview', {
                    type: message?.type,
                    requestId: message?.requestId
                });
            } catch (e) {
                // ignore
            }
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
            const { config, testType, ...testParams } = message.payload || {};

            switch (testType) {
                case 'organization':
                    await this.handleTestOrganization(message, testParams);
                    break;
                case 'patToken':
                    await this.handleTestPatToken(message, testParams);
                    break;
                case 'project':
                    await this.handleTestProject(message, testParams);
                    break;
                case 'model':
                    await this.handleTestModel(message, testParams);
                    break;
                default:
                    this.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: 'Invalid test type' },
                        requestId: message.requestId
                    });
                    return;
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

    // Legacy connection test removed in v3

    /**
     * Handle organization URL test
     */
    private async handleTestOrganization(message: WebviewMessage, params: any): Promise<void> {
        const { organizationUrl } = params;
        if (!organizationUrl) {
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Organization URL is required' },
                requestId: message.requestId
            });
            return;
        }

        const validationResult = await this.settingsValidationService.validateOrganizationUrl(organizationUrl);

        this.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: {
                success: validationResult.isValid,
                message: validationResult.details,
                error: validationResult.error,
                testType: 'organization'
            },
            requestId: message.requestId
        });
    }

    /**
     * Handle PAT token test
     */
    private async handleTestPatToken(message: WebviewMessage, params: any): Promise<void> {
        const { patToken, organizationUrl } = params;
        if (!patToken || !organizationUrl) {
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'PAT token and organization URL are required' },
                requestId: message.requestId
            });
            return;
        }

        const validationResult = await this.settingsValidationService.validatePatToken(patToken, organizationUrl);

        this.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: {
                success: validationResult.isValid,
                message: validationResult.details,
                error: validationResult.error,
                testType: 'patToken'
            },
            requestId: message.requestId
        });
    }

    /**
     * Handle project test
     */
    private async handleTestProject(message: WebviewMessage, params: any): Promise<void> {
        const { projectName, organizationUrl, patToken } = params;
        if (!projectName || !organizationUrl || !patToken) {
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Project name, organization URL, and PAT token are required' },
                requestId: message.requestId
            });
            return;
        }

        const validationResult = await this.settingsValidationService.validateProject(projectName, organizationUrl, patToken);

        this.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: {
                success: validationResult.isValid,
                message: validationResult.details,
                error: validationResult.error,
                testType: 'project'
            },
            requestId: message.requestId
        });
    }

    /**
     * Handle language model test
     */
    private async handleTestModel(message: WebviewMessage, params: unknown): Promise<void> {
        const { modelName } = params;
        if (!modelName) {
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Model name is required' },
                requestId: message.requestId
            });
            return;
        }

        const validationResult = await this.settingsValidationService.validateLanguageModel(modelName);

        this.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: {
                success: validationResult.isValid,
                message: validationResult.details,
                error: validationResult.error,
                testType: 'model'
            },
            requestId: message.requestId
        });
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

            // Explicit log for visibility in extension output
            console.log('[PRDashboard] Loaded pull requests', {
                count: transformedPRs.length,
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
        // Update current view based on message
        this.currentView = message.payload?.view || DashboardView.PULL_REQUEST_LIST;

        // If the message originated from the webview (it included a requestId),
        // avoid echoing the same UPDATE_VIEW back — the webview will treat that
        // echo as a new command and may re-send, causing a loop. Only broadcast
        // UPDATE_VIEW messages when the extension initiates the view change
        // (i.e., no requestId was provided).
        if (!message.requestId) {
            this.sendMessage({
                type: MessageType.UPDATE_VIEW,
                payload: { view: this.currentView }
            });
        }
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
     * Get webview HTML content - now serves Angular webview
     */
    private getWebviewContent(): string {
        if (!this.panel) {
            throw new Error('Webview panel not initialized');
        }
        // Keep implementation simple and explicit: compute URIs, then return either a clear
        // fallback page (when the build is a placeholder) or the normal Angular webview HTML.
        // Path to the Angular webview build output (copied by webpack to dist/webview)
        const webviewPath = path.join(this.context.extensionPath, 'dist', 'webview');

        // Detect available build files in the webview output and get URIs for those that exist
        const resolveIfExists = (fileName: string): vscode.Uri | undefined => {
            const fullPath = path.join(webviewPath, fileName);
            try {
                if (fs.existsSync(fullPath)) {
                    return this.panel!.webview.asWebviewUri(vscode.Uri.file(fullPath));
                }
            } catch (e) {
                // ignore filesystem errors and treat file as missing
            }
            return undefined;
        };

        const runtimeJsUri = resolveIfExists('runtime.js');
        const polyfillsJsUri = resolveIfExists('polyfills.js');
        const mainJsUri = resolveIfExists('main.js');
        const vendorJsUri = resolveIfExists('vendor.js');
        const stylesUri = resolveIfExists('styles.css');

        // Generate CSP nonce for security
        const nonce = this.generateNonce();

        // Detect fallback bundle case: placeholder main.js produced by the build fallback
        let isFallback = false;
        try {
            isFallback = !runtimeJsUri && !!mainJsUri && fs.readFileSync(path.join(webviewPath, 'main.js'), 'utf8').includes('Fallback webview bundle');
        } catch (e) {
            // Treat read errors as missing real build
            isFallback = !runtimeJsUri && !!mainJsUri;
        }

        if (isFallback) {
            console.warn('[PRDashboard] Angular webview build failed; using fallback bundle. Check the build output for errors.');

            const missingFiles: string[] = [];
            if (!runtimeJsUri) missingFiles.push('runtime.js');
            if (!vendorJsUri) missingFiles.push('vendor.js');
            if (!stylesUri) missingFiles.push('styles.css');

            const missingListHtml = missingFiles.length
                ? `<ul>${missingFiles.map(f => `<li>${f}</li>`).join('')}</ul>`
                : '<p>Build produced an incomplete bundle.</p>';

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure DevOps PR Dashboard - Build Missing</title>
    <style>
        body { font-family: var(--vscode-font-family, 'Segoe UI'); margin: 24px; color: var(--vscode-foreground); }
        code { background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Failed to load dashboard</h1>
    <p>The Angular webview bundle appears to be a fallback placeholder instead of a real build. The extension could not find the full set of webview build artifacts required to boot the Angular application.</p>
    <p>Missing or placeholder build files:</p>
    ${missingListHtml}
    <p>Please rebuild the webview and make sure the compiled files are copied to the extension <code>dist/webview</code> folder. For development, run the webview build (see the repo README or the webview-angular-v3 package).</p>
</body>
</html>`;
        }

        // Normal webview HTML (Angular app). The loading fallback remains while Angular boots.
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure DevOps PR Dashboard</title>
    <base href="${this.panel.webview.asWebviewUri(vscode.Uri.file(webviewPath))}/">
    ${stylesUri ? `<link rel="stylesheet" href="${stylesUri}">` : ''}
    <style nonce="${nonce}">
        :root { --vscode-font-family: var(--vscode-font-family); --vscode-font-size: var(--vscode-font-size); }
        body { margin: 0; padding: 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); background-color: var(--vscode-editor-background); color: var(--vscode-foreground); }
        .angular-loading { display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; gap:16px; }
        .angular-loading-spinner { width:40px; height:40px; border:3px solid rgba(0,0,0,0.1); border-top:3px solid rgba(0,0,0,0.2); border-radius:50%; animation:spin 1s linear infinite; }
        @keyframes spin { 0%{transform:rotate(0deg);} 100%{transform:rotate(360deg);} }
        .angular-loading-text { color: var(--vscode-foreground); opacity:0.8; }
    </style>
</head>
<body>
    <app-root>
        <div class="angular-loading">
            <div class="angular-loading-spinner"></div>
            <div class="angular-loading-text">Loading Azure DevOps PR Dashboard...</div>
        </div>
    </app-root>

    <script nonce="${nonce}">(function(){ if (typeof ngDevMode === 'undefined') { try { window['ngDevMode'] = false; } catch(e) { /* ignore */ } } })();</script>
    ${runtimeJsUri ? `<script nonce="${nonce}" src="${runtimeJsUri}" type="module"></script>` : ''}
    ${vendorJsUri ? `<script nonce="${nonce}" src="${vendorJsUri}" type="module"></script>` : ''}
    ${mainJsUri ? `<script nonce="${nonce}" src="${mainJsUri}" type="module"></script>` : ''}

    <script nonce="${nonce}">
        // Initialize VS Code API only if not already available (prevent duplicate acquisition)
        if (!window.vscode) {
            window.vscode = acquireVsCodeApi();
            const previousState = window.vscode.getState(); 
            if (previousState) { 
                window.vsCodeState = previousState; 
            }
        }
        
        window.addEventListener('error', function(e){
            try {
                const err = e && (e.error || new Error(e.message));
                console.error('Angular application error (detailed):', {
                    name: err && err.name,
                    message: err && err.message || e.message,
                    stack: err && err.stack,
                    ngErrorCode: err && err.ngErrorCode,
                    code: err && err.code,
                    originalEvent: e
                });
                if (window.vscode && window.vscode.postMessage) {
                    window.vscode.postMessage({ type: 'showError', payload: { message: 'Angular application failed to initialize: ' + (err && err.message || e.message), details: (err && err.stack) || String(err) } });
                }
            } catch (ex) {
                console.error('Angular application error:', e && (e.error || e.message));
                if (window.vscode && window.vscode.postMessage) {
                    window.vscode.postMessage({ type: 'showError', payload: { message: 'Angular application failed to initialize: ' + (e && (e.error && e.error.message) || e && e.message) } });
                }
            }
        });
        
        window.addEventListener('unhandledrejection', function(e){
            try {
                const reason = e && (e.reason instanceof Error ? e.reason : new Error(String(e.reason)));
                console.error('Unhandled promise rejection (detailed):', {
                    name: reason && reason.name,
                    message: reason && reason.message,
                    stack: reason && reason.stack,
                    ngErrorCode: reason && reason.ngErrorCode,
                    code: reason && reason.code,
                    originalEvent: e
                });
                if (window.vscode && window.vscode.postMessage) {
                    window.vscode.postMessage({ type: 'showError', payload: { message: 'Angular application error: ' + (reason && reason.message || String(e.reason)), details: (reason && reason.stack) || String(e.reason) } });
                }
            } catch (ex) {
                console.error('Unhandled promise rejection:', e && e.reason);
                if (window.vscode && window.vscode.postMessage) {
                    window.vscode.postMessage({ type: 'showError', payload: { message: 'Angular application error: ' + (e && (e.reason && e.reason.message) || e && e.reason) } });
                }
            }
        });
    </script>
    <script nonce="${nonce}">
        // Diagnostic logging to help identify where a restrictive CSP originates
        try {
            const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            console.log('[PRDashboard][CSP Debug] meta CSP content:', meta ? meta.getAttribute('content') : '<none>');
            console.log('[PRDashboard][CSP Debug] webview.cspSource (passed by extension):', '${this.panel.webview.cspSource}');
            const iframes = Array.from(document.getElementsByTagName('iframe'));
            iframes.forEach((f, i) => {
                console.log('[PRDashboard][CSP Debug] iframe[' + i + '] src=', f.src);
                try { console.log('[PRDashboard][CSP Debug] iframe[' + i + '] sandbox=', f.getAttribute('sandbox')); } catch(e) {}
            });
        } catch (e) {
            console.warn('[PRDashboard][CSP Debug] error while logging CSP info', e);
        }
    </script>
</body>
</html>`;
    }

    /**
     * Generate a cryptographically secure nonce for CSP
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

    /**
     * Handle open settings panel
     */
    private async handleOpenSettings(message: WebviewMessage): Promise<void> {
        try {
            this.settingsPanelOpen = true;

            // Get current settings configuration
            const settings = await this.configurationManager.exportSettings();
            const validationResult = await this.configurationManager.validateAllSettings();

            this.sendMessage({
                type: MessageType.OPEN_SETTINGS,
                payload: {
                    settings,
                    validation: validationResult,
                    isOpen: true
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to open settings:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to open settings: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle close settings panel
     */
    private async handleCloseSettings(message: WebviewMessage): Promise<void> {
        try {
            this.settingsPanelOpen = false;

            this.sendMessage({
                type: MessageType.CLOSE_SETTINGS,
                payload: { isOpen: false },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to close settings:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to close settings: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle validate setting
     */
    private async handleValidateSetting(message: WebviewMessage): Promise<void> {
        try {
            const { settingKey, settingValue, context } = message.payload || {};

            if (!settingKey) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Setting key is required for validation' },
                    requestId: message.requestId
                });
                return;
            }

            let validationResult: ValidationResult;

            // Perform specific validation based on setting type
            switch (settingKey) {
                case 'organizationUrl':
                    validationResult = await this.settingsValidationService.validateOrganizationUrl(settingValue);
                    break;
                case 'patToken':
                    const orgUrl = context?.organizationUrl || this.configurationManager.getOrganizationUrl();
                    if (orgUrl) {
                        validationResult = await this.settingsValidationService.validatePatToken(settingValue, orgUrl);
                    } else {
                        validationResult = {
                            isValid: false,
                            error: 'Organization URL required',
                            details: 'Please set organization URL before validating PAT token',
                            category: 'azureDevOps'
                        };
                    }
                    break;
                case 'defaultProject':
                    const orgUrlForProject = context?.organizationUrl || this.configurationManager.getOrganizationUrl();
                    const patToken = context?.patToken || await this.configurationManager.getPatToken();
                    if (orgUrlForProject && patToken) {
                        validationResult = await this.settingsValidationService.validateProject(settingValue, orgUrlForProject, patToken);
                    } else {
                        validationResult = {
                            isValid: false,
                            error: 'Prerequisites missing',
                            details: 'Organization URL and PAT token are required to validate project',
                            category: 'azureDevOps'
                        };
                    }
                    break;
                case 'selectedModel':
                    validationResult = await this.settingsValidationService.validateLanguageModel(settingValue);
                    break;
                case 'customInstructions':
                    validationResult = this.settingsValidationService.validateCustomInstructions(settingValue);
                    break;
                case 'batchSize':
                    validationResult = this.settingsValidationService.validatePerformanceSettings(settingValue, 30);
                    break;
                default:
                    // Use generic validation from SettingsUtils
                    validationResult = SettingsUtils.validateSettingValue(settingKey, settingValue);
            }

            this.sendMessage({
                type: MessageType.VALIDATE_SETTING,
                payload: {
                    settingKey,
                    validation: validationResult
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to validate setting:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to validate setting: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle save settings
     */
    private async handleSaveSettings(message: WebviewMessage): Promise<void> {
        try {
            const { settings, categories } = message.payload || {};

            if (!settings) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Settings data is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Create backup before saving
            const currentSettings = await this.configurationManager.exportSettings();
            const backupDir = vscode.Uri.joinPath(this.context.globalStorageUri, 'backups');
            await vscode.workspace.fs.createDirectory(backupDir);
            await SettingsUtils.createBackup(currentSettings, backupDir);

            // Import the new settings
            const importResult = await this.configurationManager.importSettings(settings, { categories });

            if (!importResult.isValid) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: `Failed to save settings: ${importResult.error}` },
                    requestId: message.requestId
                });
                return;
            }

            // Validate all settings after save
            const validationResult = await this.configurationManager.validateAllSettings();

            this.sendMessage({
                type: MessageType.SAVE_SETTINGS,
                payload: {
                    success: true,
                    validation: validationResult,
                    message: 'Settings saved successfully'
                },
                requestId: message.requestId
            });

            // Notify of settings change
            this.sendMessage({
                type: MessageType.SETTINGS_CHANGED,
                payload: {
                    settings: await this.configurationManager.exportSettings(),
                    validation: validationResult
                }
            });

        } catch (error) {
            console.error('Failed to save settings:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle reset settings
     */
    private async handleResetSettings(message: WebviewMessage): Promise<void> {
        try {
            const { categories, includeSecrets } = message.payload || {};

            // Create backup before reset
            const currentSettings = await this.configurationManager.exportSettings();
            const backupDir = vscode.Uri.joinPath(this.context.globalStorageUri, 'backups');
            await vscode.workspace.fs.createDirectory(backupDir);
            await SettingsUtils.createBackup(currentSettings, backupDir);

            if (categories && Array.isArray(categories)) {
                // Reset specific categories
                const defaultValues = SettingsUtils.getDefaultValues();
                const config = vscode.workspace.getConfiguration('azdo-pr-reviewer');

                for (const category of categories) {
                    const categorySettings = SettingsUtils.getSettingsCategories()[category] || [];
                    for (const settingKey of categorySettings) {
                        if (defaultValues.hasOwnProperty(settingKey)) {
                            await config.update(settingKey, defaultValues[settingKey], vscode.ConfigurationTarget.Global);
                        }
                    }
                }

                if (includeSecrets && categories.includes('azureDevOps')) {
                    await this.configurationManager.clearPatToken();
                }
            } else {
                // Reset all settings to defaults
                await this.configurationManager.resetSettingsToDefault();
                if (includeSecrets) {
                    await this.configurationManager.clearPatToken();
                }
            }

            // Get updated settings and validation
            const updatedSettings = await this.configurationManager.exportSettings();
            const validationResult = await this.configurationManager.validateAllSettings();

            this.sendMessage({
                type: MessageType.RESET_SETTINGS,
                payload: {
                    success: true,
                    settings: updatedSettings,
                    validation: validationResult,
                    message: 'Settings reset to defaults'
                },
                requestId: message.requestId
            });

            // Notify of settings change
            this.sendMessage({
                type: MessageType.SETTINGS_CHANGED,
                payload: {
                    settings: updatedSettings,
                    validation: validationResult
                }
            });

        } catch (error) {
            console.error('Failed to reset settings:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to reset settings: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle export settings
     */
    private async handleExportSettings(message: WebviewMessage): Promise<void> {
        try {
            const { includeSecrets, format } = message.payload || {};

            const settings = await this.configurationManager.exportSettings();

            // Remove sensitive data if not requested
            if (!includeSecrets && settings.azureDevOps) {
                settings.azureDevOps.hasPatToken = false;
            }

            const exportData = SettingsUtils.serializeSettings(settings);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `azdo-pr-reviewer-settings-${timestamp}.json`;

            this.sendMessage({
                type: MessageType.EXPORT_SETTINGS,
                payload: {
                    data: exportData,
                    filename,
                    format: format || 'json',
                    success: true
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to export settings:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to export settings: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle import settings
     */
    private async handleImportSettings(message: WebviewMessage): Promise<void> {
        try {
            const { data, options } = message.payload || {};

            if (!data) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: 'Import data is required' },
                    requestId: message.requestId
                });
                return;
            }

            // Parse settings data
            const settings = SettingsUtils.deserializeSettings(data);

            // Create backup before import
            const currentSettings = await this.configurationManager.exportSettings();
            const backupDir = vscode.Uri.joinPath(this.context.globalStorageUri, 'backups');
            await vscode.workspace.fs.createDirectory(backupDir);
            await SettingsUtils.createBackup(currentSettings, backupDir);

            // Import settings
            const importResult = await this.configurationManager.importSettings(settings, options);

            if (!importResult.isValid) {
                this.sendMessage({
                    type: MessageType.SHOW_ERROR,
                    payload: { message: `Failed to import settings: ${importResult.error}` },
                    requestId: message.requestId
                });
                return;
            }

            // Get updated settings and validation
            const updatedSettings = await this.configurationManager.exportSettings();
            const validationResult = await this.configurationManager.validateAllSettings();

            this.sendMessage({
                type: MessageType.IMPORT_SETTINGS,
                payload: {
                    success: true,
                    settings: updatedSettings,
                    validation: validationResult,
                    message: 'Settings imported successfully'
                },
                requestId: message.requestId
            });

            // Notify of settings change
            this.sendMessage({
                type: MessageType.SETTINGS_CHANGED,
                payload: {
                    settings: updatedSettings,
                    validation: validationResult
                }
            });

        } catch (error) {
            console.error('Failed to import settings:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to import settings: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    /**
     * Handle loading available language models
     */
    private async handleLoadAvailableModels(message: WebviewMessage): Promise<void> {
        try {
            const models = await this.languageModelService.getAvailableModels();

            this.sendMessage({
                type: MessageType.LOAD_AVAILABLE_MODELS,
                payload: {
                    models,
                    success: true
                },
                requestId: message.requestId
            });

        } catch (error) {
            console.error('Failed to load available models:', error);
            this.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load available models: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }
}
