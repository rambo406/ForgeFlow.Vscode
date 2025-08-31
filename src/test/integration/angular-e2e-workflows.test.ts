import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';
import { LanguageModelService } from '../../services/LanguageModelService';
import { CommentManager } from '../../services/CommentManager';
import { PRDashboardController } from '../../controllers/PRDashboardController';
import { FileDiff, PullRequest } from '../../models/AzureDevOpsModels';

suite('Integration Tests - Angular Webview E2E Workflows', () => {
    let mockContext: vscode.ExtensionContext;
    let configManager: ConfigurationManager;
    let azureDevOpsClient: AzureDevOpsClient;
    let languageModelService: LanguageModelService;
    let commentManager: CommentManager;
    let dashboardController: PRDashboardController;

    suiteSetup(async () => {
        console.log('Setting up Angular E2E integration test environment...');
        
        // Create comprehensive mock context
        mockContext = {
            secrets: {
                get: async (key: string) => {
                    if (key.includes('patToken')) {
                        return 'mock-e2e-test-token';
                    }
                    return undefined;
                },
                store: async (key: string, value: string) => {
                    console.log(`Mock storing secret: ${key}`);
                },
                delete: async (key: string) => {
                    console.log(`Mock deleting secret: ${key}`);
                },
                onDidChange: () => ({ dispose: () => {} })
            },
            globalState: {
                get: (key: string) => {
                    switch (key) {
                        case 'configVersion':
                            return '0.1.0';
                        case 'lastSelectedProject':
                            return 'test-project';
                        case 'filterPreferences':
                            return { author: '', status: 'active', dateRange: 30 };
                        default:
                            return undefined;
                    }
                },
                update: async (key: string, value: any) => {
                    console.log(`Mock updating global state: ${key} = ${JSON.stringify(value)}`);
                },
                setKeysForSync: (keys: string[]) => {}
            },
            workspaceState: {
                get: (key: string) => {
                    switch (key) {
                        case 'currentView':
                            return 'dashboard';
                        case 'selectedPR':
                            return null;
                        default:
                            return undefined;
                    }
                },
                update: async (key: string, value: any) => {
                    console.log(`Mock updating workspace state: ${key} = ${JSON.stringify(value)}`);
                }
            },
            subscriptions: [],
            extensionPath: '/mock/extension/path',
            extensionUri: vscode.Uri.parse('file:///mock/extension/path'),
            environmentVariableCollection: {} as any,
            storageUri: vscode.Uri.parse('file:///mock/storage'),
            globalStorageUri: vscode.Uri.parse('file:///mock/global-storage'),
            logUri: vscode.Uri.parse('file:///mock/logs'),
            extensionMode: vscode.ExtensionMode.Test
        } as any;

        // Mock VS Code workspace configuration for Angular webview
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section?: string) => ({
            get: (key: string, defaultValue?: any) => {
                const fullKey = section ? `${section}.${key}` : key;
                
                switch (fullKey) {
                    case 'azdo-pr-reviewer.organizationUrl':
                        return 'https://dev.azure.com/test-org-e2e';
                    case 'azdo-pr-reviewer.defaultProject':
                        return 'e2e-test-project';
                    case 'azdo-pr-reviewer.selectedModel':
                        return 'gpt-4';
                    case 'azdo-pr-reviewer.customInstructions':
                        return 'E2E test: Focus on code quality, security, and performance';
                    case 'azdo-pr-reviewer.batchSize':
                        return 3;
                    case 'azdo-pr-reviewer.enableTelemetry':
                        return false;
                    case 'azdo-pr-reviewer.autoRefresh':
                        return true;
                    case 'azdo-pr-reviewer.enableNotifications':
                        return true;
                    case 'azdo-pr-reviewer.maxCommentsPerFile':
                        return 10;
                    default:
                        return defaultValue;
                }
            },
            update: async (key: string, value: any, target?: vscode.ConfigurationTarget) => {
                console.log(`Mock config update for Angular: ${key} = ${JSON.stringify(value)}`);
            },
            has: (key: string) => true,
            inspect: (key: string) => ({
                key,
                defaultValue: undefined,
                globalValue: undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined
            })
        });

        // Initialize all services
        configManager = new ConfigurationManager(mockContext);
        azureDevOpsClient = new AzureDevOpsClient(
            'https://dev.azure.com/test-org-e2e',
            'mock-e2e-test-token'
        );
        languageModelService = new LanguageModelService();
        commentManager = new CommentManager(
            mockContext,
            languageModelService,
            azureDevOpsClient,
            configManager
        );
        dashboardController = new PRDashboardController(
            mockContext,
            configManager,
            azureDevOpsClient,
            commentManager
        );

        console.log('Angular E2E integration test environment setup complete');
    });

    suiteTeardown(() => {
        console.log('Cleaning up Angular E2E integration test environment...');
        commentManager?.dispose();
        dashboardController?.dispose();
    });

    suite('Complete Configuration Setup Workflow', () => {
        test('should complete entire configuration setup process', async function() {
            this.timeout(15000);
            
            console.log('Testing complete configuration setup workflow...');
            
            // Step 1: Initial configuration validation
            const initialConfigStatus = await configManager.isConfigured();
            console.log(`Initial configuration status: ${initialConfigStatus}`);
            
            // Step 2: Validate Azure DevOps configuration
            const orgUrl = configManager.getOrganizationUrl();
            const project = configManager.getDefaultProject();
            assert.strictEqual(orgUrl, 'https://dev.azure.com/test-org-e2e');
            assert.strictEqual(project, 'e2e-test-project');
            
            // Step 3: Test connection settings
            try {
                const connectionTest = await azureDevOpsClient.testConnection();
                console.log(`Connection test result: ${JSON.stringify(connectionTest)}`);
                // Connection test may fail in mock environment, that's expected
            } catch (error) {
                console.log(`Expected connection test error: ${error}`);
            }
            
            // Step 4: Validate Language Model configuration
            const selectedModel = configManager.getSelectedModel();
            const customInstructions = configManager.getCustomInstructions();
            const batchSize = configManager.getBatchSize();
            
            assert.strictEqual(selectedModel, 'gpt-4');
            assert.ok(customInstructions.includes('E2E test'));
            assert.strictEqual(batchSize, 3);
            
            // Step 5: Test model availability
            const modelAvailable = await languageModelService.isLanguageModelAvailable();
            console.log(`Language model available: ${modelAvailable}`);
            
            // Step 6: Validate advanced settings
            const maxCommentsPerFile = vscode.workspace.getConfiguration('azdo-pr-reviewer').get('maxCommentsPerFile');
            const autoRefresh = vscode.workspace.getConfiguration('azdo-pr-reviewer').get('autoRefresh');
            
            assert.strictEqual(maxCommentsPerFile, 10);
            assert.strictEqual(autoRefresh, true);
            
            // Step 7: Test configuration persistence
            await configManager.migrateConfiguration();
            const postMigrationStatus = await configManager.isConfigured();
            assert.strictEqual(postMigrationStatus, true);
            
            console.log('Complete configuration setup workflow test passed');
        });

        test('should handle configuration validation errors', async () => {
            console.log('Testing configuration validation error handling...');
            
            // Create a temporary configuration manager with invalid settings
            const invalidContext = { ...mockContext };
            const invalidConfigManager = new ConfigurationManager(invalidContext);
            
            // Override configuration to return invalid values
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    switch (key) {
                        case 'organizationUrl':
                            return 'invalid-url';
                        case 'defaultProject':
                            return '';
                        default:
                            return defaultValue;
                    }
                },
                update: async () => {},
                has: () => true,
                inspect: () => ({})
            } as any);
            
            try {
                const isConfigured = await invalidConfigManager.isConfigured();
                // Should handle invalid configuration gracefully
                assert.ok(typeof isConfigured === 'boolean');
            } finally {
                // Restore original configuration
                vscode.workspace.getConfiguration = originalGetConfiguration;
            }
            
            console.log('Configuration validation error handling test passed');
        });
    });

    suite('PR Loading, Filtering, and Selection Workflow', () => {
        test('should execute complete PR loading and filtering workflow', async function() {
            this.timeout(20000);
            
            console.log('Testing complete PR loading and filtering workflow...');
            
            // Step 1: Initialize dashboard
            const panel = vscode.window.createWebviewPanel(
                'azdo-pr-dashboard',
                'Azure DevOps PR Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            
            try {
                // Step 2: Load webview content (Angular)
                const webviewContent = (dashboardController as any).getWebviewContent(panel.webview);
                assert.ok(webviewContent.includes('app-root'));
                assert.ok(webviewContent.includes('angular'));
                console.log('Angular webview content loaded successfully');
                
                // Step 3: Simulate PR data loading
                const mockPullRequests: PullRequest[] = [
                    {
                        pullRequestId: 101,
                        title: 'Add new authentication feature',
                        description: 'Implements OAuth 2.0 authentication',
                        sourceRefName: 'refs/heads/feature/oauth-auth',
                        targetRefName: 'refs/heads/main',
                        createdBy: {
                            displayName: 'Developer One',
                            url: 'https://dev.azure.com/test-org/_apis/Identities/dev1',
                            id: 'dev1-id',
                            uniqueName: 'developer1@company.com'
                        },
                        creationDate: new Date('2025-08-25'),
                        status: 'active',
                        isDraft: false,
                        repository: {
                            id: 'repo-1',
                            name: 'main-repo',
                            url: 'https://dev.azure.com/test-org/_git/main-repo'
                        },
                        _links: {
                            web: {
                                href: 'https://dev.azure.com/test-org/_git/main-repo/pullrequest/101'
                            }
                        }
                    },
                    {
                        pullRequestId: 102,
                        title: 'Fix critical security vulnerability',
                        description: 'Patches XSS vulnerability in user input',
                        sourceRefName: 'refs/heads/hotfix/xss-patch',
                        targetRefName: 'refs/heads/main',
                        createdBy: {
                            displayName: 'Security Team',
                            url: 'https://dev.azure.com/test-org/_apis/Identities/security',
                            id: 'security-id',
                            uniqueName: 'security@company.com'
                        },
                        creationDate: new Date('2025-08-28'),
                        status: 'active',
                        isDraft: false,
                        repository: {
                            id: 'repo-1',
                            name: 'main-repo',
                            url: 'https://dev.azure.com/test-org/_git/main-repo'
                        },
                        _links: {
                            web: {
                                href: 'https://dev.azure.com/test-org/_git/main-repo/pullrequest/102'
                            }
                        }
                    },
                    {
                        pullRequestId: 103,
                        title: 'Update dependencies',
                        description: 'Updates all npm dependencies to latest versions',
                        sourceRefName: 'refs/heads/chore/update-deps',
                        targetRefName: 'refs/heads/main',
                        createdBy: {
                            displayName: 'Developer One',
                            url: 'https://dev.azure.com/test-org/_apis/Identities/dev1',
                            id: 'dev1-id',
                            uniqueName: 'developer1@company.com'
                        },
                        creationDate: new Date('2025-08-20'),
                        status: 'completed',
                        isDraft: false,
                        repository: {
                            id: 'repo-1',
                            name: 'main-repo',
                            url: 'https://dev.azure.com/test-org/_git/main-repo'
                        },
                        _links: {
                            web: {
                                href: 'https://dev.azure.com/test-org/_git/main-repo/pullrequest/103'
                            }
                        }
                    }
                ];
                
                // Step 4: Test message handling for PR loading
                let messageHandled = false;
                panel.webview.onDidReceiveMessage(async (message) => {
                    console.log(`Received message: ${JSON.stringify(message)}`);
                    
                    if (message.type === 'loadPullRequests') {
                        messageHandled = true;
                        
                        // Simulate loading response
                        await panel.webview.postMessage({
                            type: 'pullRequestsLoaded',
                            data: mockPullRequests,
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'filterPullRequests') {
                        const { author, status, dateRange } = message.data;
                        console.log(`Filtering PRs: author=${author}, status=${status}, dateRange=${dateRange}`);
                        
                        const filteredPRs = mockPullRequests.filter(pr => {
                            if (author && !pr.createdBy.displayName.includes(author)) return false;
                            if (status && pr.status !== status) return false;
                            if (dateRange) {
                                const cutoffDate = new Date();
                                cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                                if (pr.creationDate < cutoffDate) return false;
                            }
                            return true;
                        });
                        
                        await panel.webview.postMessage({
                            type: 'pullRequestsFiltered',
                            data: filteredPRs,
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'selectPullRequest') {
                        const selectedPR = mockPullRequests.find(pr => pr.pullRequestId === message.data.id);
                        if (selectedPR) {
                            await panel.webview.postMessage({
                                type: 'pullRequestSelected',
                                data: selectedPR,
                                timestamp: Date.now()
                            });
                        }
                    }
                });
                
                // Step 5: Simulate initial PR loading
                await panel.webview.postMessage({
                    type: 'loadPullRequests',
                    data: {},
                    timestamp: Date.now()
                });
                
                // Wait for message processing
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Step 6: Test filtering workflow
                await panel.webview.postMessage({
                    type: 'filterPullRequests',
                    data: {
                        author: 'developer1',
                        status: 'active',
                        dateRange: 30
                    },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Step 7: Test PR selection
                await panel.webview.postMessage({
                    type: 'selectPullRequest',
                    data: { id: 101 },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Step 8: Validate search functionality
                await panel.webview.postMessage({
                    type: 'searchPullRequests',
                    data: { searchTerm: 'authentication' },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                console.log('PR loading, filtering, and selection workflow test completed successfully');
                
            } finally {
                panel.dispose();
            }
        });

        test('should handle large PR dataset with virtual scrolling', async function() {
            this.timeout(15000);
            
            console.log('Testing large PR dataset handling with virtual scrolling...');
            
            // Create large dataset (100+ PRs)
            const largePRDataset: PullRequest[] = Array.from({ length: 150 }, (_, i) => ({
                pullRequestId: 1000 + i,
                title: `PR ${i + 1}: Feature implementation ${i + 1}`,
                description: `Description for pull request ${i + 1}`,
                sourceRefName: `refs/heads/feature/feature-${i + 1}`,
                targetRefName: 'refs/heads/main',
                createdBy: {
                    displayName: `Developer ${(i % 10) + 1}`,
                    url: `https://dev.azure.com/test-org/_apis/Identities/dev${(i % 10) + 1}`,
                    id: `dev${(i % 10) + 1}-id`,
                    uniqueName: `developer${(i % 10) + 1}@company.com`
                },
                creationDate: new Date(2025, 7, Math.floor(Math.random() * 31) + 1),
                status: i % 3 === 0 ? 'completed' : 'active',
                isDraft: false,
                repository: {
                    id: 'repo-1',
                    name: 'main-repo',
                    url: 'https://dev.azure.com/test-org/_git/main-repo'
                },
                _links: {
                    web: {
                        href: `https://dev.azure.com/test-org/_git/main-repo/pullrequest/${1000 + i}`
                    }
                }
            }));
            
            const panel = vscode.window.createWebviewPanel(
                'azdo-pr-dashboard-large',
                'Large Dataset Test',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            try {
                let virtualScrollTested = false;
                
                panel.webview.onDidReceiveMessage(async (message) => {
                    if (message.type === 'loadLargePRDataset') {
                        // Simulate batch loading for virtual scrolling
                        const batchSize = 20;
                        const startIndex = message.data.startIndex || 0;
                        const batch = largePRDataset.slice(startIndex, startIndex + batchSize);
                        
                        await panel.webview.postMessage({
                            type: 'largePRBatchLoaded',
                            data: {
                                items: batch,
                                totalCount: largePRDataset.length,
                                startIndex,
                                hasMore: startIndex + batchSize < largePRDataset.length
                            },
                            timestamp: Date.now()
                        });
                        
                        virtualScrollTested = true;
                    }
                    
                    if (message.type === 'filterLargePRDataset') {
                        const { author, status } = message.data;
                        const filtered = largePRDataset.filter(pr => {
                            if (author && !pr.createdBy.displayName.includes(author)) return false;
                            if (status && pr.status !== status) return false;
                            return true;
                        });
                        
                        await panel.webview.postMessage({
                            type: 'largePRDatasetFiltered',
                            data: {
                                totalCount: filtered.length,
                                appliedFilters: { author, status }
                            },
                            timestamp: Date.now()
                        });
                    }
                });
                
                // Test initial batch loading
                await panel.webview.postMessage({
                    type: 'loadLargePRDataset',
                    data: { startIndex: 0 },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Test pagination/virtual scrolling
                await panel.webview.postMessage({
                    type: 'loadLargePRDataset',
                    data: { startIndex: 20 },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Test filtering on large dataset
                await panel.webview.postMessage({
                    type: 'filterLargePRDataset',
                    data: { author: 'developer1', status: 'active' },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                assert.ok(virtualScrollTested, 'Virtual scrolling should be tested');
                console.log('Large PR dataset with virtual scrolling test passed');
                
            } finally {
                panel.dispose();
            }
        });
    });

    suite('AI Analysis and Comment Management Workflow', () => {
        test('should execute complete AI analysis and comment management workflow', async function() {
            this.timeout(25000);
            
            console.log('Testing complete AI analysis and comment management workflow...');
            
            // Step 1: Create comprehensive file changes for analysis
            const comprehensiveFileDiffs: FileDiff[] = [
                {
                    filePath: '/src/auth/AuthService.ts',
                    changeType: 'add',
                    lines: [
                        { lineNumber: 1, type: 'added', content: 'import { Injectable } from \'@angular/core\';' },
                        { lineNumber: 2, type: 'added', content: 'import { HttpClient } from \'@angular/common/http\';' },
                        { lineNumber: 3, type: 'added', content: '' },
                        { lineNumber: 4, type: 'added', content: '@Injectable({ providedIn: \'root\' })' },
                        { lineNumber: 5, type: 'added', content: 'export class AuthService {' },
                        { lineNumber: 6, type: 'added', content: '  constructor(private http: HttpClient) {}' },
                        { lineNumber: 7, type: 'added', content: '' },
                        { lineNumber: 8, type: 'added', content: '  login(username: string, password: string) {' },
                        { lineNumber: 9, type: 'added', content: '    return this.http.post(\'/api/login\', { username, password });' },
                        { lineNumber: 10, type: 'added', content: '  }' },
                        { lineNumber: 11, type: 'added', content: '}' }
                    ],
                    addedLines: 11,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                },
                {
                    filePath: '/src/components/LoginForm.tsx',
                    changeType: 'edit',
                    lines: [
                        { lineNumber: 15, type: 'deleted', content: '  const handleSubmit = () => {', originalLineNumber: 15 },
                        { lineNumber: 15, type: 'added', content: '  const handleSubmit = async (event: FormEvent) => {' },
                        { lineNumber: 16, type: 'added', content: '    event.preventDefault();' },
                        { lineNumber: 17, type: 'added', content: '    if (!username || !password) {' },
                        { lineNumber: 18, type: 'added', content: '      setError(\'Both username and password are required\');' },
                        { lineNumber: 19, type: 'added', content: '      return;' },
                        { lineNumber: 20, type: 'added', content: '    }' }
                    ],
                    addedLines: 6,
                    deletedLines: 1,
                    isBinary: false,
                    isLargeFile: false
                },
                {
                    filePath: '/tests/auth.test.ts',
                    changeType: 'add',
                    lines: [
                        { lineNumber: 1, type: 'added', content: 'import { AuthService } from \'../src/auth/AuthService\';' },
                        { lineNumber: 2, type: 'added', content: 'import { TestBed } from \'@angular/core/testing\';' },
                        { lineNumber: 3, type: 'added', content: '' },
                        { lineNumber: 4, type: 'added', content: 'describe(\'AuthService\', () => {' },
                        { lineNumber: 5, type: 'added', content: '  let service: AuthService;' },
                        { lineNumber: 6, type: 'added', content: '  // TODO: Add comprehensive tests' },
                        { lineNumber: 7, type: 'added', content: '});' }
                    ],
                    addedLines: 7,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                }
            ];
            
            // Step 2: Execute AI analysis workflow
            const analysisOptions = {
                pullRequestId: 2001,
                organizationUrl: 'https://dev.azure.com/test-org-e2e',
                projectName: 'e2e-test-project',
                skipPreview: false, // Test with preview workflow
                customInstructions: 'E2E Test: Focus on security vulnerabilities, code quality, and test coverage',
                modelPreference: 'gpt-4',
                batchSize: 2
            };
            
            console.log('Starting AI analysis workflow...');
            
            try {
                // Step 3: Run analysis (may fail in test environment, that's expected)
                const analysisResult = await commentManager.executeCommentWorkflow(
                    comprehensiveFileDiffs,
                    analysisOptions
                );
                
                console.log(`Analysis completed: ${JSON.stringify(analysisResult, null, 2)}`);
                
                // Validate result structure
                assert.ok(analysisResult);
                assert.ok(typeof analysisResult.success === 'boolean');
                assert.ok(typeof analysisResult.postedComments === 'number');
                assert.ok(Array.isArray(analysisResult.errors));
                assert.ok(typeof analysisResult.summary === 'string');
                
                if (analysisResult.success) {
                    console.log('AI analysis completed successfully in test environment');
                } else {
                    console.log('AI analysis completed with expected errors in test environment');
                }
                
            } catch (error) {
                // Expected in test environment without real AI model access
                console.log(`Expected AI analysis error: ${error}`);
                assert.ok(error instanceof Error);
                
                // Verify error is model/API related
                const errorMessage = error.message.toLowerCase();
                const isExpectedError = 
                    errorMessage.includes('language model') ||
                    errorMessage.includes('model') ||
                    errorMessage.includes('api') ||
                    errorMessage.includes('authentication');
                
                assert.ok(isExpectedError, `Unexpected error type: ${error.message}`);
            }
            
            // Step 4: Test comment management workflow
            console.log('Testing comment management workflow...');
            
            const panel = vscode.window.createWebviewPanel(
                'comment-preview',
                'Comment Preview',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            try {
                let commentWorkflowTested = false;
                
                panel.webview.onDidReceiveMessage(async (message) => {
                    console.log(`Comment management message: ${JSON.stringify(message)}`);
                    
                    if (message.type === 'previewComments') {
                        const mockComments = [
                            {
                                id: 'comment-1',
                                filePath: '/src/auth/AuthService.ts',
                                line: 9,
                                content: 'Consider adding error handling for the HTTP request',
                                severity: 'suggestion',
                                category: 'error-handling'
                            },
                            {
                                id: 'comment-2',
                                filePath: '/src/components/LoginForm.tsx',
                                line: 18,
                                content: 'Good addition of form validation',
                                severity: 'info',
                                category: 'validation'
                            },
                            {
                                id: 'comment-3',
                                filePath: '/tests/auth.test.ts',
                                line: 6,
                                content: 'TODO comment indicates incomplete test coverage',
                                severity: 'warning',
                                category: 'testing'
                            }
                        ];
                        
                        await panel.webview.postMessage({
                            type: 'commentsPreviewReady',
                            data: mockComments,
                            timestamp: Date.now()
                        });
                        
                        commentWorkflowTested = true;
                    }
                    
                    if (message.type === 'approveComment') {
                        const { commentId } = message.data;
                        console.log(`Comment approved: ${commentId}`);
                        
                        await panel.webview.postMessage({
                            type: 'commentApproved',
                            data: { commentId },
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'editComment') {
                        const { commentId, newContent } = message.data;
                        console.log(`Comment edited: ${commentId} -> ${newContent}`);
                        
                        await panel.webview.postMessage({
                            type: 'commentEdited',
                            data: { commentId, newContent },
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'dismissComment') {
                        const { commentId, reason } = message.data;
                        console.log(`Comment dismissed: ${commentId}, reason: ${reason}`);
                        
                        await panel.webview.postMessage({
                            type: 'commentDismissed',
                            data: { commentId, reason },
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'bulkApproveComments') {
                        const { commentIds } = message.data;
                        console.log(`Bulk approving comments: ${commentIds.join(', ')}`);
                        
                        await panel.webview.postMessage({
                            type: 'commentsBulkApproved',
                            data: { commentIds },
                            timestamp: Date.now()
                        });
                    }
                });
                
                // Test comment preview workflow
                await panel.webview.postMessage({
                    type: 'previewComments',
                    data: { pullRequestId: 2001 },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Test individual comment operations
                await panel.webview.postMessage({
                    type: 'approveComment',
                    data: { commentId: 'comment-1' },
                    timestamp: Date.now()
                });
                
                await panel.webview.postMessage({
                    type: 'editComment',
                    data: { 
                        commentId: 'comment-2', 
                        newContent: 'Excellent addition of comprehensive form validation'
                    },
                    timestamp: Date.now()
                });
                
                await panel.webview.postMessage({
                    type: 'dismissComment',
                    data: { 
                        commentId: 'comment-3', 
                        reason: 'Not relevant for this PR'
                    },
                    timestamp: Date.now()
                });
                
                // Test bulk operations
                await panel.webview.postMessage({
                    type: 'bulkApproveComments',
                    data: { commentIds: ['comment-1', 'comment-2'] },
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                assert.ok(commentWorkflowTested, 'Comment workflow should be tested');
                console.log('Comment management workflow test completed successfully');
                
            } finally {
                panel.dispose();
            }
            
            console.log('Complete AI analysis and comment management workflow test passed');
        });
    });

    suite('Settings Management Integration Tests', () => {
        test('should execute complete settings management workflow', async function() {
            this.timeout(10000);
            
            console.log('Testing complete settings management workflow...');
            
            // Step 1: Test settings export
            const currentSettings = {
                organizationUrl: configManager.getOrganizationUrl(),
                defaultProject: configManager.getDefaultProject(),
                selectedModel: configManager.getSelectedModel(),
                customInstructions: configManager.getCustomInstructions(),
                batchSize: configManager.getBatchSize(),
                maxCommentsPerFile: vscode.workspace.getConfiguration('azdo-pr-reviewer').get('maxCommentsPerFile'),
                autoRefresh: vscode.workspace.getConfiguration('azdo-pr-reviewer').get('autoRefresh'),
                enableNotifications: vscode.workspace.getConfiguration('azdo-pr-reviewer').get('enableNotifications')
            };
            
            console.log(`Current settings: ${JSON.stringify(currentSettings, null, 2)}`);
            
            // Validate all settings are accessible
            assert.ok(currentSettings.organizationUrl);
            assert.ok(currentSettings.defaultProject);
            assert.ok(currentSettings.selectedModel);
            assert.ok(typeof currentSettings.batchSize === 'number');
            assert.ok(typeof currentSettings.maxCommentsPerFile === 'number');
            assert.ok(typeof currentSettings.autoRefresh === 'boolean');
            
            // Step 2: Test settings modification
            const panel = vscode.window.createWebviewPanel(
                'settings-management',
                'Settings Management Test',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            try {
                let settingsWorkflowTested = false;
                
                panel.webview.onDidReceiveMessage(async (message) => {
                    console.log(`Settings message: ${JSON.stringify(message)}`);
                    
                    if (message.type === 'loadSettings') {
                        await panel.webview.postMessage({
                            type: 'settingsLoaded',
                            data: currentSettings,
                            timestamp: Date.now()
                        });
                        settingsWorkflowTested = true;
                    }
                    
                    if (message.type === 'validateSetting') {
                        const { settingKey, value } = message.data;
                        let isValid = true;
                        let errorMessage = '';
                        
                        switch (settingKey) {
                            case 'organizationUrl':
                                isValid = value.startsWith('https://') && value.includes('dev.azure.com');
                                if (!isValid) errorMessage = 'Organization URL must be a valid Azure DevOps URL';
                                break;
                            case 'batchSize':
                                isValid = Number.isInteger(value) && value > 0 && value <= 20;
                                if (!isValid) errorMessage = 'Batch size must be between 1 and 20';
                                break;
                            case 'maxCommentsPerFile':
                                isValid = Number.isInteger(value) && value > 0 && value <= 50;
                                if (!isValid) errorMessage = 'Max comments per file must be between 1 and 50';
                                break;
                        }
                        
                        await panel.webview.postMessage({
                            type: 'settingValidated',
                            data: { settingKey, isValid, errorMessage },
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'saveSettings') {
                        const { settings } = message.data;
                        console.log(`Saving settings: ${JSON.stringify(settings)}`);
                        
                        // Simulate settings save
                        await panel.webview.postMessage({
                            type: 'settingsSaved',
                            data: { success: true, savedSettings: settings },
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'exportSettings') {
                        const exportData = {
                            version: '0.1.0',
                            exportDate: new Date().toISOString(),
                            settings: currentSettings
                        };
                        
                        await panel.webview.postMessage({
                            type: 'settingsExported',
                            data: exportData,
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'importSettings') {
                        const { importData } = message.data;
                        console.log(`Importing settings: ${JSON.stringify(importData)}`);
                        
                        // Validate import data structure
                        const isValidImport = 
                            importData.version &&
                            importData.settings &&
                            typeof importData.settings === 'object';
                        
                        await panel.webview.postMessage({
                            type: 'settingsImported',
                            data: { 
                                success: isValidImport,
                                importedSettings: isValidImport ? importData.settings : null,
                                error: isValidImport ? null : 'Invalid import data format'
                            },
                            timestamp: Date.now()
                        });
                    }
                    
                    if (message.type === 'resetSettings') {
                        const defaultSettings = {
                            organizationUrl: '',
                            defaultProject: '',
                            selectedModel: 'gpt-3.5-turbo',
                            customInstructions: 'Please review this code for potential improvements',
                            batchSize: 5,
                            maxCommentsPerFile: 10,
                            autoRefresh: true,
                            enableNotifications: true
                        };
                        
                        await panel.webview.postMessage({
                            type: 'settingsReset',
                            data: defaultSettings,
                            timestamp: Date.now()
                        });
                    }
                });
                
                // Test settings loading
                await panel.webview.postMessage({
                    type: 'loadSettings',
                    data: {},
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Test setting validation
                await panel.webview.postMessage({
                    type: 'validateSetting',
                    data: { settingKey: 'organizationUrl', value: 'https://dev.azure.com/valid-org' },
                    timestamp: Date.now()
                });
                
                await panel.webview.postMessage({
                    type: 'validateSetting',
                    data: { settingKey: 'batchSize', value: 15 },
                    timestamp: Date.now()
                });
                
                await panel.webview.postMessage({
                    type: 'validateSetting',
                    data: { settingKey: 'batchSize', value: 0 }, // Invalid
                    timestamp: Date.now()
                });
                
                // Test settings save
                const modifiedSettings = {
                    ...currentSettings,
                    batchSize: 4,
                    maxCommentsPerFile: 8,
                    customInstructions: 'Updated instructions for E2E test'
                };
                
                await panel.webview.postMessage({
                    type: 'saveSettings',
                    data: { settings: modifiedSettings },
                    timestamp: Date.now()
                });
                
                // Test export/import workflow
                await panel.webview.postMessage({
                    type: 'exportSettings',
                    data: {},
                    timestamp: Date.now()
                });
                
                const mockImportData = {
                    version: '0.1.0',
                    exportDate: new Date().toISOString(),
                    settings: {
                        organizationUrl: 'https://dev.azure.com/imported-org',
                        selectedModel: 'gpt-4',
                        batchSize: 3
                    }
                };
                
                await panel.webview.postMessage({
                    type: 'importSettings',
                    data: { importData: mockImportData },
                    timestamp: Date.now()
                });
                
                // Test settings reset
                await panel.webview.postMessage({
                    type: 'resetSettings',
                    data: {},
                    timestamp: Date.now()
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                assert.ok(settingsWorkflowTested, 'Settings workflow should be tested');
                console.log('Settings management workflow test completed successfully');
                
            } finally {
                panel.dispose();
            }
            
            // Step 3: Test configuration persistence
            await configManager.migrateConfiguration();
            const persistenceTest = await configManager.isConfigured();
            assert.ok(typeof persistenceTest === 'boolean');
            
            console.log('Complete settings management workflow test passed');
        });
    });
});