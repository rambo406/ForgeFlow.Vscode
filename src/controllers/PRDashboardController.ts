import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';
import { CommentAnalysisEngine, AnalysisProgress, AnalysisResult } from '../services/CommentAnalysisEngine';
import { LanguageModelService } from '../services/LanguageModelService';
import { SettingsValidationService } from '../services/SettingsValidationService';
import { SettingsConfiguration, ValidationResult } from '../models/AzureDevOpsModels';
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
    LOAD_AVAILABLE_MODELS = 'loadAvailableModels'
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
            case MessageType.TEST_CONNECTION:
                await this.handleTestConnection(message);
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
                    // Legacy connection test
                    await this.handleLegacyTestConnection(message);
                    break;
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
     * Handle legacy connection test (backward compatibility)
     */
    private async handleLegacyTestConnection(message: WebviewMessage): Promise<void> {
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
    }

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
    private async handleTestModel(message: WebviewMessage, params: any): Promise<void> {
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
                <button id="settingsBtn" class="settings-btn" title="Settings" aria-label="Open Settings">
                    <span class="codicon codicon-gear"></span>
                </button>
                <button id="configBtn" class="config-btn" title="Configuration">
                    <span class="codicon codicon-settings"></span>
                </button>
            </div>
        </header>
        
        <!-- Settings Modal -->
        <div id="settingsModal" class="settings-modal" style="display: none;" role="dialog" aria-labelledby="settingsTitle" aria-modal="true">
            <div class="settings-modal-content">
                <header class="settings-header">
                    <h2 id="settingsTitle">Extension Settings</h2>
                    <button id="closeSettingsBtn" class="close-btn" title="Close Settings" aria-label="Close Settings">
                        <span class="codicon codicon-close"></span>
                    </button>
                </header>
                
                <div class="settings-content">
                    <div class="settings-sidebar">
                        <nav class="settings-nav">
                            <button class="settings-nav-item active" data-section="azureDevOps">
                                <span class="codicon codicon-azure-devops"></span>
                                Azure DevOps
                            </button>
                            <button class="settings-nav-item" data-section="languageModel">
                                <span class="codicon codicon-copilot"></span>
                                Language Model
                            </button>
                            <button class="settings-nav-item" data-section="reviewInstructions">
                                <span class="codicon codicon-checklist"></span>
                                Review Instructions
                            </button>
                            <button class="settings-nav-item" data-section="performance">
                                <span class="codicon codicon-pulse"></span>
                                Performance
                            </button>
                            <button class="settings-nav-item" data-section="ui">
                                <span class="codicon codicon-color-mode"></span>
                                UI Preferences
                            </button>
                        </nav>
                    </div>
                    
                    <div class="settings-main">
                        <!-- Azure DevOps Section -->
                        <section id="azureDevOpsSection" class="settings-section active">
                            <h3>Azure DevOps Configuration</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label for="organizationUrl">Organization URL</label>
                                    <input type="url" id="organizationUrl" placeholder="https://dev.azure.com/your-org" />
                                    <div class="validation-message" id="organizationUrlValidation"></div>
                                    <button type="button" class="test-connection-btn" id="testOrgConnection">Test Connection</button>
                                </div>
                                
                                <div class="form-group">
                                    <label for="patToken">Personal Access Token</label>
                                    <input type="password" id="patToken" placeholder="Enter your PAT token" />
                                    <div class="validation-message" id="patTokenValidation"></div>
                                    <button type="button" class="test-connection-btn" id="testPatToken">Validate Token</button>
                                </div>
                                
                                <div class="form-group">
                                    <label for="defaultProject">Default Project</label>
                                    <input type="text" id="defaultProject" placeholder="Project name (optional)" />
                                    <div class="validation-message" id="defaultProjectValidation"></div>
                                    <button type="button" class="test-connection-btn" id="testProjectConnection">Test Project</button>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Language Model Section -->
                        <section id="languageModelSection" class="settings-section">
                            <h3>Language Model Configuration</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label for="selectedModel">Selected Model</label>
                                    <select id="selectedModel">
                                        <option value="">Loading available models...</option>
                                    </select>
                                    <div class="validation-message" id="selectedModelValidation"></div>
                                    <button type="button" class="test-connection-btn" id="testModelAvailability">Test Model</button>
                                </div>
                                
                                <div class="form-group">
                                    <label for="modelTemperature">Temperature</label>
                                    <input type="range" id="modelTemperature" min="0" max="2" step="0.1" value="0.1" />
                                    <span class="range-value">0.1</span>
                                    <div class="help-text">Controls randomness (0 = deterministic, 2 = very creative)</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="maxTokens">Max Tokens</label>
                                    <input type="number" id="maxTokens" min="100" max="8000" value="4000" />
                                    <div class="validation-message" id="maxTokensValidation"></div>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Review Instructions Section -->
                        <section id="reviewInstructionsSection" class="settings-section">
                            <h3>Review Instructions</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label for="customInstructions">Custom Instructions</label>
                                    <textarea id="customInstructions" rows="10" placeholder="Enter custom review instructions..."></textarea>
                                    <div class="validation-message" id="customInstructionsValidation"></div>
                                    <div class="character-count">0 / 10000 characters</div>
                                </div>
                                
                                <div class="form-group">
                                    <label>Instruction Templates</label>
                                    <div class="template-buttons">
                                        <button type="button" class="template-btn" data-template="basic">Basic Review</button>
                                        <button type="button" class="template-btn" data-template="security">Security-Focused</button>
                                        <button type="button" class="template-btn" data-template="performance">Performance-Focused</button>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Performance Section -->
                        <section id="performanceSection" class="settings-section">
                            <h3>Performance Settings</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label for="batchSize">Batch Size</label>
                                    <input type="range" id="batchSize" min="1" max="100" value="10" />
                                    <span class="range-value">10</span>
                                    <div class="help-text">Number of files to process simultaneously</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="requestTimeout">Request Timeout (seconds)</label>
                                    <input type="range" id="requestTimeout" min="5" max="300" value="30" />
                                    <span class="range-value">30</span>
                                </div>
                                
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="enableTelemetry" />
                                        Enable Telemetry
                                    </label>
                                    <div class="help-text">Help improve the extension by sharing anonymous usage data</div>
                                </div>
                            </div>
                        </section>
                        
                        <!-- UI Preferences Section -->
                        <section id="uiSection" class="settings-section">
                            <h3>UI Preferences</h3>
                            <div class="settings-form">
                                <div class="form-group">
                                    <label for="theme">Theme</label>
                                    <select id="theme">
                                        <option value="auto">Auto (Follow VS Code)</option>
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="high-contrast">High Contrast</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="fontSize">Font Size</label>
                                    <input type="range" id="fontSize" min="8" max="24" value="14" />
                                    <span class="range-value">14</span>
                                </div>
                                
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="compactMode" />
                                        Compact Mode
                                    </label>
                                    <div class="help-text">Use more compact layout to save space</div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
                
                <footer class="settings-footer">
                    <div class="settings-actions-left">
                        <button type="button" id="exportSettingsBtn" class="secondary-btn">Export</button>
                        <button type="button" id="importSettingsBtn" class="secondary-btn">Import</button>
                        <button type="button" id="resetSettingsBtn" class="danger-btn">Reset to Defaults</button>
                    </div>
                    <div class="settings-actions-right">
                        <button type="button" id="cancelSettingsBtn" class="secondary-btn">Cancel</button>
                        <button type="button" id="saveSettingsBtn" class="primary-btn">Save Settings</button>
                    </div>
                </footer>
            </div>
            <div class="settings-modal-backdrop"></div>
        </div>
        
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