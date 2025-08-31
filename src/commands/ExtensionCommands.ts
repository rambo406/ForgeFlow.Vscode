import * as vscode from 'vscode';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';
import { LanguageModelService } from '../services/LanguageModelService';
import { CommentManager, CommentManagerOptions } from '../services/CommentManager';
import { PullRequest } from '../models/AzureDevOpsModels';
import { PRDashboardController } from '../controllers/PRDashboardController';

/**
 * Information about pull request selection
 */
interface PullRequestQuickPickItem extends vscode.QuickPickItem {
    pullRequest: PullRequest;
}

/**
 * Information about repository selection
 */
interface RepositoryQuickPickItem extends vscode.QuickPickItem {
    repository: { id: string; name: string; url: string };
}

/**
 * Status bar manager for showing analysis progress
 */
class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private progressInterval?: NodeJS.Timeout;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'azdo-pr-reviewer.showStatus';
    }

    showAnalyzing(message: string = 'Analyzing PR...') {
        this.statusBarItem.text = `$(sync~spin) ${message}`;
        this.statusBarItem.show();
        
        // Add animated dots
        let dots = '';
        this.progressInterval = setInterval(() => {
            dots = dots.length >= 3 ? '' : dots + '.';
            this.statusBarItem.text = `$(sync~spin) ${message}${dots}`;
        }, 500);
    }

    showSuccess(message: string, timeout: number = 5000) {
        this.clearProgress();
        this.statusBarItem.text = `$(check) ${message}`;
        this.statusBarItem.show();
        
        setTimeout(() => this.hide(), timeout);
    }

    showError(message: string, timeout: number = 10000) {
        this.clearProgress();
        this.statusBarItem.text = `$(error) ${message}`;
        this.statusBarItem.show();
        
        setTimeout(() => this.hide(), timeout);
    }

    hide() {
        this.clearProgress();
        this.statusBarItem.hide();
    }

    private clearProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = undefined;
        }
    }

    dispose() {
        this.clearProgress();
        this.statusBarItem.dispose();
    }
}

/**
 * Handles all extension commands and their registration
 */
export class ExtensionCommands implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private azureDevOpsClient?: AzureDevOpsClient;
    private languageModelService?: LanguageModelService;
    private commentManager?: CommentManager;
    private statusBarManager: StatusBarManager;
    private dashboardController?: PRDashboardController;

    constructor(
        private context: vscode.ExtensionContext,
        private configurationManager: ConfigurationManager
    ) {
        this.statusBarManager = new StatusBarManager();
    }

    /**
     * Register all extension commands
     */
    async registerCommands(): Promise<void> {
        // Register configure command
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.configure', this.handleConfigureCommand.bind(this))
        );

        // Register analyze PR command
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.analyzePR', this.handleAnalyzePRCommand.bind(this))
        );

        // Register select model command
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.selectModel', this.handleSelectModelCommand.bind(this))
        );

        // Register status command
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.showStatus', this.handleShowStatusCommand.bind(this))
        );

        // Register quick analyze command (analyze specific PR by ID)
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.quickAnalyze', this.handleQuickAnalyzeCommand.bind(this))
        );

        // Register test connection command
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.testConnection', this.handleTestConnectionCommand.bind(this))
        );

        // Register dashboard command
        this.disposables.push(
            vscode.commands.registerCommand('azdo-pr-reviewer.openDashboard', this.handleOpenDashboardCommand.bind(this))
        );

        console.log('Extension commands registered successfully');
    }

    /**
     * Handle the configure command
     */
    private async handleConfigureCommand(): Promise<void> {
        try {
            await this.showConfigurationWizard();
        } catch (error) {
            console.error('Configuration command failed:', error);
            vscode.window.showErrorMessage('Failed to open configuration. Please try again.');
        }
    }

    /**
     * Handle the analyze PR command
     */
    private async handleAnalyzePRCommand(): Promise<void> {
        try {
            this.statusBarManager.showAnalyzing('Initializing PR analysis');

            // Check if extension is configured
            const isConfigured = await this.configurationManager.isConfigured();
            if (!isConfigured) {
                const result = await vscode.window.showWarningMessage(
                    'Azure DevOps PR Code Reviewer is not configured. Would you like to configure it now?',
                    'Configure',
                    'Cancel'
                );
                
                if (result === 'Configure') {
                    await this.handleConfigureCommand();
                    return;
                }
                this.statusBarManager.hide();
                return;
            }

            // Initialize services if not already done
            await this.initializeServices();

            if (!this.azureDevOpsClient) {
                throw new Error('Failed to initialize Azure DevOps client');
            }

            // Get project selection
            this.statusBarManager.showAnalyzing('Loading projects');
            const projectName = await this.selectProject();
            if (!projectName) {
                this.statusBarManager.hide();
                return;
            }

            // Get repository selection
            this.statusBarManager.showAnalyzing('Loading repositories');
            const repository = await this.selectRepository(projectName);
            if (!repository) {
                this.statusBarManager.hide();
                return;
            }

            // Get pull request selection
            this.statusBarManager.showAnalyzing('Loading pull requests');
            const pullRequest = await this.selectPullRequest(projectName, repository.name);
            if (!pullRequest) {
                this.statusBarManager.hide();
                return;
            }

            // Execute the analysis workflow
            await this.executePRAnalysisWorkflow(pullRequest, projectName, repository);

        } catch (error) {
            console.error('Analyze PR command failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.statusBarManager.showError(`Analysis failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to analyze PR: ${errorMessage}`);
        }
    }

    /**
     * Handle the select model command
     */
    private async handleSelectModelCommand(): Promise<void> {
        try {
            // Initialize language model service if needed
            if (!this.languageModelService) {
                this.languageModelService = new LanguageModelService();
            }

            // Get available models from VS Code Language Model API
            const availableModels = await this.languageModelService.getAvailableModels();
            
            if (availableModels.length === 0) {
                vscode.window.showWarningMessage(
                    'No language models are available. Please ensure you have the appropriate VS Code extensions installed (e.g., GitHub Copilot).'
                );
                return;
            }

            // Create quick pick items
            const modelItems = availableModels.map(model => ({
                label: model.name || model.id,
                description: `${model.vendor} - ${model.family || 'Unknown family'}`,
                detail: model.maxTokens ? `Max tokens: ${model.maxTokens}` : undefined,
                model: model
            }));

            const currentModel = this.configurationManager.getSelectedModel();
            
            const selectedItem = await vscode.window.showQuickPick(modelItems, {
                placeHolder: 'Select a language model for code analysis',
                canPickMany: false,
                ignoreFocusOut: true,
                title: 'Language Model Selection',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selectedItem && selectedItem.model.id !== currentModel) {
                const config = vscode.workspace.getConfiguration('azdo-pr-reviewer');
                await config.update('selectedModel', selectedItem.model.id, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage(`Language model updated to ${selectedItem.label}`);
                
                // Update status bar briefly
                this.statusBarManager.showSuccess(`Model: ${selectedItem.label}`, 3000);
            }
        } catch (error) {
            console.error('Select model command failed:', error);
            vscode.window.showErrorMessage('Failed to select model. Please try again.');
        }
    }

    /**
     * Show configuration wizard
     */
    private async showConfigurationWizard(): Promise<void> {
        // Organization URL configuration
        const organizationUrl = await vscode.window.showInputBox({
            prompt: 'Enter your Azure DevOps organization URL',
            placeHolder: 'https://dev.azure.com/myorganization',
            value: this.configurationManager.getOrganizationUrl() || '',
            validateInput: (value) => {
                if (!value) {
                    return 'Organization URL is required';
                }
                if (!/^https:\/\/dev\.azure\.com\/[^/]+\/?$/.test(value)) {
                    return 'Please enter a valid Azure DevOps organization URL (e.g., https://dev.azure.com/myorg)';
                }
                return null;
            }
        });

        if (!organizationUrl) {
            return;
        }

        // PAT Token configuration
        const patToken = await vscode.window.showInputBox({
            prompt: 'Enter your Azure DevOps Personal Access Token',
            placeHolder: 'Personal Access Token with Code (read) and Pull Request (read/write) permissions',
            password: true,
            validateInput: (value) => {
                if (!value) {
                    return 'Personal Access Token is required';
                }
                if (value.length < 20) {
                    return 'Personal Access Token seems too short';
                }
                return null;
            }
        });

        if (!patToken) {
            return;
        }

        // Default project configuration (optional)
        const defaultProject = await vscode.window.showInputBox({
            prompt: 'Enter default project name (optional)',
            placeHolder: 'Leave empty to select project each time',
            value: this.configurationManager.getDefaultProject() || ''
        });

        try {
            // Save configuration
            const config = vscode.workspace.getConfiguration('azdo-pr-reviewer');
            await config.update('organizationUrl', organizationUrl, vscode.ConfigurationTarget.Global);
            
            if (defaultProject) {
                await config.update('defaultProject', defaultProject, vscode.ConfigurationTarget.Global);
            }

            await this.configurationManager.setPatToken(patToken);

            vscode.window.showInformationMessage('Azure DevOps PR Code Reviewer configured successfully!');
        } catch (error) {
            console.error('Failed to save configuration:', error);
            vscode.window.showErrorMessage('Failed to save configuration. Please try again.');
        }
    }

    /**
     * Initialize services with current configuration
     */
    private async initializeServices(): Promise<void> {
        const organizationUrl = this.configurationManager.getOrganizationUrl();
        const patToken = await this.configurationManager.getPatToken();

        if (!organizationUrl || !patToken) {
            throw new Error('Extension is not properly configured');
        }

        this.azureDevOpsClient = new AzureDevOpsClient(organizationUrl, patToken);
        this.languageModelService = new LanguageModelService();
        this.commentManager = new CommentManager(
            this.context,
            this.languageModelService,
            this.azureDevOpsClient,
            this.configurationManager
        );
    }

    /**
     * Select a project from available projects
     */
    private async selectProject(): Promise<string | undefined> {
        const defaultProject = this.configurationManager.getDefaultProject();
        
        if (defaultProject) {
            const useDefault = await vscode.window.showQuickPick(
                [
                    { label: `Use default: ${defaultProject}`, isDefault: true },
                    { label: 'Choose different project', isDefault: false }
                ],
                {
                    placeHolder: 'Select project option',
                    ignoreFocusOut: true
                }
            );

            if (useDefault?.isDefault) {
                return defaultProject;
            }
        }

        // Manual project input
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter Azure DevOps project name',
            placeHolder: 'MyProject',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name is required';
                }
                return null;
            }
        });

        return projectName?.trim();
    }

    /**
     * Select a repository from available repositories
     */
    private async selectRepository(projectName: string): Promise<RepositoryQuickPickItem['repository'] | undefined> {
        if (!this.azureDevOpsClient) {
            throw new Error('Azure DevOps client not initialized');
        }

        try {
            const repositories = await this.azureDevOpsClient.getRepositories(projectName);
            
            if (repositories.length === 0) {
                vscode.window.showWarningMessage(`No repositories found in project '${projectName}'`);
                return undefined;
            }

            if (repositories.length === 1) {
                return repositories[0];
            }

            const items: RepositoryQuickPickItem[] = repositories.map(repo => ({
                label: repo.name,
                description: repo.id,
                detail: repo.url,
                repository: repo
            }));

            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a repository',
                ignoreFocusOut: true,
                matchOnDescription: true,
                title: `Repositories in ${projectName}`
            });

            return selectedItem?.repository;
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
            vscode.window.showErrorMessage(`Failed to fetch repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return undefined;
        }
    }

    /**
     * Select a pull request from available pull requests
     */
    private async selectPullRequest(projectName: string, repositoryName?: string): Promise<PullRequest | undefined> {
        if (!this.azureDevOpsClient) {
            throw new Error('Azure DevOps client not initialized');
        }

        try {
            const pullRequests = await this.azureDevOpsClient.getOpenPullRequests(projectName, repositoryName);
            
            if (pullRequests.length === 0) {
                vscode.window.showInformationMessage(
                    `No open pull requests found in ${repositoryName ? `repository '${repositoryName}'` : `project '${projectName}'`}`
                );
                return undefined;
            }

            const items: PullRequestQuickPickItem[] = pullRequests.map(pr => ({
                label: `#${pr.pullRequestId}: ${pr.title}`,
                description: `${pr.sourceRefName} → ${pr.targetRefName}`,
                detail: `Created by ${pr.createdBy.displayName} on ${pr.creationDate.toLocaleDateString()}`,
                pullRequest: pr
            }));

            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a pull request to analyze',
                ignoreFocusOut: true,
                matchOnDescription: true,
                matchOnDetail: true,
                title: 'Open Pull Requests'
            });

            return selectedItem?.pullRequest;
        } catch (error) {
            console.error('Failed to fetch pull requests:', error);
            vscode.window.showErrorMessage(`Failed to fetch pull requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return undefined;
        }
    }

    /**
     * Execute the complete PR analysis workflow
     */
    private async executePRAnalysisWorkflow(
        pullRequest: PullRequest,
        projectName: string,
        repository: { id: string; name: string; url: string }
    ): Promise<void> {
        if (!this.azureDevOpsClient || !this.commentManager) {
            throw new Error('Services not initialized');
        }

        try {
            this.statusBarManager.showAnalyzing(`Analyzing PR #${pullRequest.pullRequestId}`);

            // Get file changes for the pull request
            const fileDiffs = await this.azureDevOpsClient.getDetailedFileChanges(
                projectName,
                repository.id,
                pullRequest.pullRequestId
            );

            if (fileDiffs.length === 0) {
                this.statusBarManager.showSuccess('No file changes to analyze');
                vscode.window.showInformationMessage('No reviewable file changes found in this pull request.');
                return;
            }

            // Prepare comment manager options
            const options: CommentManagerOptions = {
                pullRequestId: pullRequest.pullRequestId,
                organizationUrl: this.configurationManager.getOrganizationUrl()!,
                projectName: projectName,
                customInstructions: this.configurationManager.getCustomInstructions(),
                modelPreference: this.configurationManager.getSelectedModel(),
                batchSize: 5
            };

            // Execute the comment workflow
            const result = await this.commentManager.executeCommentWorkflow(fileDiffs, options);

            if (result.success) {
                this.statusBarManager.showSuccess(`Analysis complete: ${result.postedComments} comments posted`);
                
                // Show detailed summary
                const summaryLines = result.summary.split('\n');
                const shortSummary = summaryLines[0] || 'Analysis completed';
                
                if (result.postedComments > 0) {
                    const viewAction = await vscode.window.showInformationMessage(
                        shortSummary,
                        { detail: result.summary },
                        'View in Azure DevOps',
                        'Show Details'
                    );

                    if (viewAction === 'View in Azure DevOps') {
                        const prUrl = `${options.organizationUrl}/${encodeURIComponent(projectName)}/_git/${repository.name}/pullrequest/${pullRequest.pullRequestId}`;
                        vscode.env.openExternal(vscode.Uri.parse(prUrl));
                    } else if (viewAction === 'Show Details') {
                        await this.showAnalysisDetails(result.summary);
                    }
                } else {
                    vscode.window.showInformationMessage(shortSummary, { detail: result.summary });
                }
            } else {
                this.statusBarManager.showError('Analysis failed');
                vscode.window.showErrorMessage(`Analysis failed: ${result.errors.join(', ')}`);
            }

        } catch (error) {
            console.error('PR analysis workflow failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.statusBarManager.showError(`Analysis failed: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Handle the show status command
     */
    private async handleShowStatusCommand(): Promise<void> {
        try {
            const isConfigured = await this.configurationManager.isConfigured();
            
            if (!isConfigured) {
                vscode.window.showInformationMessage('Azure DevOps PR Code Reviewer is not configured.');
                return;
            }

            const organizationUrl = this.configurationManager.getOrganizationUrl();
            const selectedModel = this.configurationManager.getSelectedModel();
            const defaultProject = this.configurationManager.getDefaultProject();

            const statusInfo = [
                `Organization: ${organizationUrl}`,
                `Selected Model: ${selectedModel}`,
                `Default Project: ${defaultProject || 'None'}`,
                '',
                'Available Commands:',
                '• Analyze PR: azdo-pr-reviewer.analyzePR',
                '• Configure: azdo-pr-reviewer.configure',
                '• Select Model: azdo-pr-reviewer.selectModel'
            ].join('\n');

            vscode.window.showInformationMessage('Extension Status', { 
                detail: statusInfo,
                modal: false 
            });

        } catch (error) {
            console.error('Show status command failed:', error);
            vscode.window.showErrorMessage('Failed to show status.');
        }
    }

    /**
     * Handle the quick analyze command (analyze specific PR by ID)
     */
    private async handleQuickAnalyzeCommand(): Promise<void> {
        try {
            const isConfigured = await this.configurationManager.isConfigured();
            if (!isConfigured) {
                vscode.window.showWarningMessage('Extension is not configured. Please configure it first.');
                return;
            }

            // Get PR ID input
            const prIdInput = await vscode.window.showInputBox({
                prompt: 'Enter Pull Request ID to analyze',
                placeHolder: '123',
                validateInput: (value) => {
                    const prId = parseInt(value, 10);
                    if (isNaN(prId) || prId <= 0) {
                        return 'Please enter a valid pull request ID (positive number)';
                    }
                    return null;
                }
            });

            if (!prIdInput) {
                return;
            }

            const pullRequestId = parseInt(prIdInput, 10);

            // Initialize services
            await this.initializeServices();

            if (!this.azureDevOpsClient) {
                throw new Error('Failed to initialize Azure DevOps client');
            }

            // Get project and repository
            const projectName = await this.selectProject();
            if (!projectName) {
                return;
            }

            const repository = await this.selectRepository(projectName);
            if (!repository) {
                return;
            }

            // Get the specific pull request
            this.statusBarManager.showAnalyzing(`Loading PR #${pullRequestId}`);
            const pullRequest = await this.azureDevOpsClient.getPullRequest(projectName, pullRequestId, repository.name);

            // Execute analysis
            await this.executePRAnalysisWorkflow(pullRequest, projectName, repository);

        } catch (error) {
            console.error('Quick analyze command failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.statusBarManager.showError(`Quick analysis failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to analyze PR: ${errorMessage}`);
        }
    }

    /**
     * Handle the test connection command
     */
    private async handleTestConnectionCommand(): Promise<void> {
        try {
            const isConfigured = await this.configurationManager.isConfigured();
            if (!isConfigured) {
                vscode.window.showWarningMessage('Extension is not configured. Please configure it first.');
                return;
            }

            this.statusBarManager.showAnalyzing('Testing connection');

            await this.initializeServices();

            if (!this.azureDevOpsClient) {
                throw new Error('Failed to initialize Azure DevOps client');
            }

            const testResult = await this.azureDevOpsClient.testConnection();

            if (testResult.isValid) {
                this.statusBarManager.showSuccess('Connection successful');
                vscode.window.showInformationMessage(`Connection test successful: ${testResult.details}`);
            } else {
                this.statusBarManager.showError('Connection failed');
                vscode.window.showErrorMessage(`Connection test failed: ${testResult.error}`);
            }

        } catch (error) {
            console.error('Test connection command failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.statusBarManager.showError(`Connection test failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Connection test failed: ${errorMessage}`);
        }
    }

    /**
     * Handle the open dashboard command
     */
    private async handleOpenDashboardCommand(): Promise<void> {
        try {
            // Ensure extension is configured before initializing services
            const isConfigured = await this.configurationManager.isConfigured();
            if (!isConfigured) {
                const result = await vscode.window.showWarningMessage(
                    'Azure DevOps PR Code Reviewer is not configured. Would you like to configure it now?',
                    'Configure',
                    'Cancel'
                );

                if (result === 'Configure') {
                    await this.handleConfigureCommand();
                }

                return;
            }

            // Initialize services if needed
            await this.initializeServices();

            // Initialize dashboard controller if not already done
            if (!this.dashboardController) {
                this.dashboardController = new PRDashboardController(
                    this.context,
                    this.configurationManager,
                    this.azureDevOpsClient
                );
            }

            // Create or show the dashboard
            await this.dashboardController.createOrShow();

        } catch (error) {
            console.error('Open dashboard command failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to open dashboard: ${errorMessage}`);
        }
    }

    /**
     * Show detailed analysis results
     */
    private async showAnalysisDetails(summary: string): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'azdoPrAnalysisResults',
            'PR Analysis Results',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getAnalysisResultsHtml(summary);
    }

    /**
     * Generate HTML for analysis results webview
     */
    private getAnalysisResultsHtml(summary: string): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PR Analysis Results</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .summary {
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textBlockQuote-border);
                    padding: 15px;
                    margin: 20px 0;
                    white-space: pre-line;
                }
                .icon {
                    color: var(--vscode-charts-green);
                    margin-right: 8px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1><span class="icon">✓</span>PR Analysis Results</h1>
            </div>
            
            <div class="summary">
${summary.replace(/\n/g, '<br>')}
            </div>
            
            <p>Analysis completed successfully. Comments have been posted to Azure DevOps.</p>
        </body>
        </html>
        `;
    }

    /**
     * Dispose of all registered commands
     */
    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
        
        // Dispose status bar manager
        this.statusBarManager.dispose();
        
        // Dispose comment manager if it exists
        if (this.commentManager) {
            this.commentManager.dispose();
        }

        // Dispose dashboard controller if it exists
        if (this.dashboardController) {
            this.dashboardController.dispose();
        }
    }
}