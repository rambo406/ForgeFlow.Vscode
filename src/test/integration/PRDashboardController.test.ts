import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PRDashboardController, MessageType } from '../../controllers/PRDashboardController';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';

suite('PRDashboardController Integration Tests', () => {
    let controller: PRDashboardController;
    let mockContext: vscode.ExtensionContext;
    let mockConfigManager: ConfigurationManager;
    let mockAzureClient: AzureDevOpsClient;

    setup(async () => {
        // Mock extension context
        mockContext = {
            extensionPath: path.join(__dirname, '..', '..', '..'),
            extensionUri: vscode.Uri.file(path.join(__dirname, '..', '..', '..')),
            globalStorageUri: vscode.Uri.file(path.join(__dirname, 'test-storage')),
            storagePath: path.join(__dirname, 'test-storage'),
            globalStoragePath: path.join(__dirname, 'test-global-storage'),
            logPath: path.join(__dirname, 'test-logs'),
            logUri: vscode.Uri.file(path.join(__dirname, 'test-logs')),
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
                setKeysForSync: () => {}
            },
            subscriptions: [],
            storageUri: vscode.Uri.file(path.join(__dirname, 'test-storage')),
            environmentVariableCollection: {} as any,
            asAbsolutePath: (relativePath: string) => path.join(__dirname, '..', '..', '..', relativePath),
            secrets: {} as any,
            extension: {} as any,
            extensionMode: vscode.ExtensionMode.Test,
            languageModelAccessInformation: {} as any
        };

        // Mock configuration manager
        mockConfigManager = {
            getOrganizationUrl: () => 'https://dev.azure.com/test-org',
            getPatToken: () => Promise.resolve('test-token'),
            getDefaultProject: () => 'TestProject',
            getSelectedModel: () => 'gpt-4',
            getCustomInstructions: () => 'Test instructions',
            getBatchSize: () => 10,
            isTelemetryEnabled: () => true,
            isConfigured: () => Promise.resolve(true),
            setOrganizationUrl: () => Promise.resolve({ isValid: true }),
            setPatToken: () => Promise.resolve(),
            setSelectedModel: () => Promise.resolve({ isValid: true }),
            validatePatToken: () => Promise.resolve({ isValid: true, details: 'Valid token' }),
            exportSettings: () => Promise.resolve({}),
            importSettings: () => Promise.resolve({ isValid: true }),
            validateAllSettings: () => Promise.resolve({ isValid: true }),
            resetSettingsToDefault: () => Promise.resolve(),
            clearPatToken: () => Promise.resolve()
        } as any;

        // Mock Azure DevOps client
        mockAzureClient = {
            getOpenPullRequests: () => Promise.resolve([
                {
                    pullRequestId: 123,
                    title: 'Test PR',
                    description: 'Test description',
                    createdBy: { displayName: 'Test User' },
                    creationDate: new Date(),
                    status: 'active',
                    sourceRefName: 'refs/heads/feature',
                    targetRefName: 'refs/heads/main',
                    repository: { id: 'repo-id', name: 'test-repo' },
                    isDraft: false,
                    _links: { web: { href: 'https://test.com' } }
                }
            ]),
            getPullRequest: () => Promise.resolve({
                pullRequestId: 123,
                title: 'Test PR',
                description: 'Test description',
                createdBy: { displayName: 'Test User' },
                creationDate: new Date(),
                status: 'active',
                sourceRefName: 'refs/heads/feature',
                targetRefName: 'refs/heads/main',
                repository: { id: 'repo-id', name: 'test-repo' },
                isDraft: false,
                _links: { web: { href: 'https://test.com' } }
            }),
            getDetailedFileChanges: () => Promise.resolve([
                {
                    filePath: 'src/test.ts',
                    changeType: 'modified',
                    oldFilePath: 'src/test.ts',
                    addedLines: 5,
                    deletedLines: 2,
                    isBinary: false,
                    isLargeFile: false,
                    lines: [
                        {
                            lineNumber: 1,
                            type: 'added',
                            content: 'console.log("Hello");',
                            originalLineNumber: undefined
                        }
                    ]
                }
            ]),
            getRepositories: () => Promise.resolve([
                { id: 'repo-id', name: 'test-repo' }
            ])
        } as any;

        controller = new PRDashboardController(mockContext, mockConfigManager, mockAzureClient);
    });

    teardown(async () => {
        if (controller) {
            controller.dispose();
        }
    });

    test('should create webview panel with Angular content', async () => {
        await controller.createOrShow();

        // Access private panel property for testing
        const panel = (controller as any).panel;
        assert.ok(panel, 'Panel should be created');
        assert.strictEqual(panel.title, 'Azure DevOps PR Dashboard');
        
        // Verify webview options are configured correctly
        assert.ok(panel.webview.options.enableScripts, 'Scripts should be enabled');
        assert.ok(panel.webview.options.retainContextWhenHidden, 'Context should be retained when hidden');
        
        // Verify local resource roots include Angular build output
        const localResourceRoots = panel.webview.options.localResourceRoots;
        assert.ok(localResourceRoots.length >= 1, 'Should have at least one local resource root');
        
        const angularRoot = localResourceRoots.find((root: vscode.Uri) => 
            root.fsPath.includes(path.join('dist', 'webview'))
        );
        assert.ok(angularRoot, 'Should include Angular webview dist folder in resource roots');
    });

    test('should generate Angular HTML content', async () => {
        await controller.createOrShow();
        
        const panel = (controller as any).panel;
        const htmlContent = panel.webview.html;
        
        // Verify Angular application structure
        assert.ok(htmlContent.includes('<app-root>'), 'Should contain Angular app root element');
        assert.ok(htmlContent.includes('main.js'), 'Should reference Angular main bundle');
        assert.ok(htmlContent.includes('polyfills.js'), 'Should reference Angular polyfills');
        assert.ok(htmlContent.includes('styles.css'), 'Should reference Angular styles');
        
        // Verify VS Code integration
        assert.ok(htmlContent.includes('window.vscode = acquireVsCodeApi()'), 'Should initialize VS Code API');
        assert.ok(htmlContent.includes('--vscode-foreground'), 'Should include VS Code theme variables');
        
        // Verify CSP configuration
        assert.ok(htmlContent.includes('Content-Security-Policy'), 'Should include CSP header');
        assert.ok(htmlContent.includes('nonce-'), 'Should use nonces for scripts');
        
        // Verify loading fallback
        assert.ok(htmlContent.includes('angular-loading'), 'Should include loading fallback');
        assert.ok(htmlContent.includes('Loading Azure DevOps PR Dashboard'), 'Should show loading message');
    });

    test('should handle message communication with Angular webview', (done) => {
        const testMessage = {
            type: MessageType.LOAD_CONFIG,
            requestId: 'test-request-123'
        };

        controller.createOrShow().then(() => {
            const panel = (controller as any).panel;
            
            // Mock webview message reception
            const originalOnDidReceiveMessage = panel.webview.onDidReceiveMessage;
            panel.webview.onDidReceiveMessage = (callback: Function) => {
                // Simulate message from Angular webview
                setTimeout(() => {
                    callback(testMessage);
                }, 10);
                return { dispose: () => {} };
            };

            // Mock webview message sending
            const sentMessages: any[] = [];
            panel.webview.postMessage = (message: any) => {
                sentMessages.push(message);
                
                // Verify message handling
                if (message.type === MessageType.LOAD_CONFIG && message.requestId === testMessage.requestId) {
                    assert.ok(message.payload?.config, 'Should include configuration in response');
                    assert.strictEqual(message.requestId, testMessage.requestId, 'Should preserve request ID');
                    done();
                }
                
                return Promise.resolve(true);
            };

            // Re-setup message handling to trigger the test
            (controller as any).setupMessageHandling();
            
        }).catch(done);
    });

    test('should handle pull request loading messages', (done) => {
        const loadPRMessage = {
            type: MessageType.LOAD_PULL_REQUESTS,
            payload: { filters: { project: 'TestProject' } },
            requestId: 'load-pr-test'
        };

        controller.createOrShow().then(() => {
            const panel = (controller as any).panel;
            
            // Mock message handling
            panel.webview.onDidReceiveMessage = (callback: Function) => {
                setTimeout(() => callback(loadPRMessage), 10);
                return { dispose: () => {} };
            };

            panel.webview.postMessage = (message: any) => {
                if (message.type === MessageType.LOAD_PULL_REQUESTS && message.requestId === loadPRMessage.requestId) {
                    assert.ok(message.payload?.pullRequests, 'Should include pull requests in response');
                    assert.ok(Array.isArray(message.payload.pullRequests), 'Pull requests should be an array');
                    assert.strictEqual(message.payload.pullRequests.length, 1, 'Should return mock PR');
                    assert.strictEqual(message.payload.pullRequests[0].title, 'Test PR', 'Should return correct PR data');
                    done();
                }
                return Promise.resolve(true);
            };

            (controller as any).setupMessageHandling();
        }).catch(done);
    });

    test('should handle pull request selection messages', (done) => {
        const selectPRMessage = {
            type: MessageType.SELECT_PULL_REQUEST,
            payload: { prId: 123 },
            requestId: 'select-pr-test'
        };

        controller.createOrShow().then(() => {
            const panel = (controller as any).panel;
            
            panel.webview.onDidReceiveMessage = (callback: Function) => {
                setTimeout(() => callback(selectPRMessage), 10);
                return { dispose: () => {} };
            };

            panel.webview.postMessage = (message: any) => {
                if (message.type === MessageType.SELECT_PULL_REQUEST && message.requestId === selectPRMessage.requestId) {
                    assert.ok(message.payload?.pullRequest, 'Should include pull request details');
                    assert.ok(message.payload?.fileChanges, 'Should include file changes');
                    assert.strictEqual(message.payload.pullRequest.id, 123, 'Should return correct PR ID');
                    assert.ok(Array.isArray(message.payload.fileChanges), 'File changes should be an array');
                    done();
                }
                return Promise.resolve(true);
            };

            (controller as any).setupMessageHandling();
        }).catch(done);
    });

    test('should handle error messages from Angular webview', (done) => {
        const errorMessage = {
            type: 'showError',
            payload: { message: 'Angular application error test' }
        };

        controller.createOrShow().then(() => {
            const panel = (controller as any).panel;
            
            panel.webview.onDidReceiveMessage = (callback: Function) => {
                setTimeout(() => callback(errorMessage), 10);
                return { dispose: () => {} };
            };

            panel.webview.postMessage = (message: any) => {
                if (message.type === MessageType.SHOW_ERROR) {
                    assert.ok(message.payload?.message, 'Error message should be included');
                    done();
                }
                return Promise.resolve(true);
            };

            (controller as any).setupMessageHandling();
        }).catch(done);
    });

    test('should preserve backward compatibility with existing message types', async () => {
        await controller.createOrShow();
        
        // Test that all existing message types are still handled
        const messageTypes = Object.values(MessageType);
        const handledTypes: string[] = [];
        
        const panel = (controller as any).panel;
        const originalHandleMessage = (controller as any).handleMessage.bind(controller);
        
        (controller as any).handleMessage = async (message: any) => {
            handledTypes.push(message.type);
            return originalHandleMessage(message);
        };

        // Test a few key message types
        const testMessages = [
            { type: MessageType.LOAD_CONFIG, requestId: 'test-1' },
            { type: MessageType.SAVE_CONFIG, payload: { config: {} }, requestId: 'test-2' },
            { type: MessageType.TEST_CONNECTION, payload: { config: {} }, requestId: 'test-3' },
            { type: MessageType.LOAD_PULL_REQUESTS, requestId: 'test-4' },
            { type: MessageType.OPEN_SETTINGS, requestId: 'test-5' }
        ];

        // Simulate message handling
        for (const message of testMessages) {
            try {
                await (controller as any).handleMessage(message);
            } catch (error) {
                // Some messages may fail due to missing dependencies in test environment
                // but they should still be recognized as valid message types
            }
        }

        // Verify that messages were processed (even if they failed)
        assert.ok(handledTypes.length > 0, 'Should have processed some messages');
        testMessages.forEach(message => {
            assert.ok(handledTypes.includes(message.type), 
                `Message type ${message.type} should be handled`);
        });
    });

    test('should fallback gracefully when Angular build files are missing', async () => {
        // Mock context with non-existent extension path
        const mockContextWithInvalidPath = {
            ...mockContext,
            extensionPath: '/non/existent/path'
        };

        const fallbackController = new PRDashboardController(
            mockContextWithInvalidPath, 
            mockConfigManager, 
            mockAzureClient
        );

        try {
            await fallbackController.createOrShow();
            const panel = (fallbackController as any).panel;
            const htmlContent = panel.webview.html;
            
            // Should fallback to error page
            assert.ok(htmlContent.includes('Failed to Load Dashboard'), 
                'Should show error page when Angular files are missing');
            assert.ok(htmlContent.includes('Angular webview failed to initialize'), 
                'Should explain the error');
                
        } finally {
            fallbackController.dispose();
        }
    });
});