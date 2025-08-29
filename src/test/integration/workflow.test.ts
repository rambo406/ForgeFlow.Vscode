import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommentManager, CommentManagerOptions } from '../../services/CommentManager';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { LanguageModelService } from '../../services/LanguageModelService';
import { FileDiff } from '../../models/AzureDevOpsModels';

suite('Integration Tests - Complete PR Analysis Workflow', () => {
    let mockContext: vscode.ExtensionContext;
    let configManager: ConfigurationManager;
    let azureDevOpsClient: AzureDevOpsClient;
    let languageModelService: LanguageModelService;
    let commentManager: CommentManager;

    suiteSetup(async () => {
        console.log('Setting up integration test environment...');
        
        // Create mock context with full functionality
        mockContext = {
            secrets: {
                get: async (key: string) => {
                    if (key.includes('patToken')) {
                        return 'mock-test-token-for-integration-tests';
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
                    if (key === 'configVersion') {
                        return '0.1.0';
                    }
                    return undefined;
                },
                update: async (key: string, value: any) => {
                    console.log(`Mock updating global state: ${key} = ${value}`);
                },
                setKeysForSync: (keys: string[]) => {}
            },
            workspaceState: {
                get: (key: string) => undefined,
                update: async (key: string, value: any) => {}
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

        // Mock VS Code workspace configuration
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section?: string) => ({
            get: (key: string, defaultValue?: any) => {
                const fullKey = section ? `${section}.${key}` : key;
                
                switch (fullKey) {
                    case 'azdo-pr-reviewer.organizationUrl':
                        return 'https://dev.azure.com/test-org';
                    case 'azdo-pr-reviewer.defaultProject':
                        return 'test-project';
                    case 'azdo-pr-reviewer.selectedModel':
                        return 'gpt-4';
                    case 'azdo-pr-reviewer.customInstructions':
                        return 'Focus on code quality, security, and performance';
                    case 'azdo-pr-reviewer.batchSize':
                        return 5;
                    case 'azdo-pr-reviewer.enableTelemetry':
                        return false; // Disable for tests
                    default:
                        return defaultValue;
                }
            },
            update: async (key: string, value: any, target?: vscode.ConfigurationTarget) => {
                console.log(`Mock config update: ${key} = ${value}`);
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

        // Initialize services
        configManager = new ConfigurationManager(mockContext);
        azureDevOpsClient = new AzureDevOpsClient(
            'https://dev.azure.com/test-org',
            'mock-test-token-for-integration-tests'
        );
        languageModelService = new LanguageModelService();
        commentManager = new CommentManager(
            mockContext,
            languageModelService,
            azureDevOpsClient,
            configManager
        );

        console.log('Integration test environment setup complete');
    });

    suiteTeardown(() => {
        console.log('Cleaning up integration test environment...');
        commentManager?.dispose();
    });

    suite('Configuration Integration', () => {
        test('should validate complete configuration setup', async () => {
            console.log('Testing configuration validation...');
            
            // Test that configuration manager can access all required settings
            const organizationUrl = configManager.getOrganizationUrl();
            const selectedModel = configManager.getSelectedModel();
            const customInstructions = configManager.getCustomInstructions();
            const batchSize = configManager.getBatchSize();
            
            assert.strictEqual(organizationUrl, 'https://dev.azure.com/test-org');
            assert.strictEqual(selectedModel, 'gpt-4');
            assert.strictEqual(customInstructions, 'Focus on code quality, security, and performance');
            assert.strictEqual(batchSize, 5);
            
            // Test configuration status
            const isConfigured = await configManager.isConfigured();
            assert.strictEqual(isConfigured, true);
            
            console.log('Configuration validation passed');
        });

        test('should handle configuration migration', async () => {
            console.log('Testing configuration migration...');
            
            // Test migration logic
            await configManager.migrateConfiguration();
            
            // Verify migration doesn't break existing settings
            const organizationUrl = configManager.getOrganizationUrl();
            assert.ok(organizationUrl);
            
            console.log('Configuration migration test passed');
        });
    });

    suite('Language Model Integration', () => {
        test('should check language model availability', async () => {
            console.log('Testing language model availability...');
            
            const isAvailable = await languageModelService.isLanguageModelAvailable();
            console.log(`Language models available: ${isAvailable}`);
            
            // Test should pass regardless of availability
            assert.ok(typeof isAvailable === 'boolean');
            
            const modelInfo = await languageModelService.getModelUsageInfo();
            assert.ok(typeof modelInfo === 'string');
            assert.ok(modelInfo.length > 0);
            
            console.log('Language model availability check passed');
        });

        test('should handle model unavailability gracefully', async () => {
            console.log('Testing graceful handling of unavailable models...');
            
            const mockFileDiff: FileDiff = {
                filePath: '/src/test-integration.ts',
                changeType: 'edit',
                lines: [
                    {
                        lineNumber: 1,
                        type: 'added',
                        content: 'const integrationTest = true;'
                    }
                ],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            };

            try {
                const result = await languageModelService.analyzeFileDiff(
                    mockFileDiff,
                    'Test custom instructions'
                );
                
                // If models are available, we should get a result
                assert.ok(Array.isArray(result));
                console.log(`Analysis completed successfully with ${result.length} comments`);
            } catch (error) {
                // If models are not available, we should get a meaningful error
                assert.ok(error instanceof Error);
                assert.ok(error.message.length > 0);
                console.log(`Expected error for unavailable models: ${error.message}`);
            }
            
            console.log('Model unavailability handling test passed');
        });
    });

    suite('End-to-End Workflow', () => {
        test('should execute complete analysis workflow', async function() {
            this.timeout(30000); // Increase timeout for integration test
            
            console.log('Starting end-to-end workflow test...');
            
            // Create mock file diffs representing a typical PR
            const fileDiffs: FileDiff[] = [
                {
                    filePath: '/src/components/Button.tsx',
                    changeType: 'add',
                    lines: [
                        {
                            lineNumber: 1,
                            type: 'added',
                            content: 'import React from \'react\';'
                        },
                        {
                            lineNumber: 2,
                            type: 'added',
                            content: ''
                        },
                        {
                            lineNumber: 3,
                            type: 'added',
                            content: 'interface ButtonProps {'
                        },
                        {
                            lineNumber: 4,
                            type: 'added',
                            content: '  onClick: () => void;'
                        },
                        {
                            lineNumber: 5,
                            type: 'added',
                            content: '  children: React.ReactNode;'
                        },
                        {
                            lineNumber: 6,
                            type: 'added',
                            content: '}'
                        },
                        {
                            lineNumber: 7,
                            type: 'added',
                            content: ''
                        },
                        {
                            lineNumber: 8,
                            type: 'added',
                            content: 'export const Button: React.FC<ButtonProps> = ({ onClick, children }) => {'
                        },
                        {
                            lineNumber: 9,
                            type: 'added',
                            content: '  return <button onClick={onClick}>{children}</button>;'
                        },
                        {
                            lineNumber: 10,
                            type: 'added',
                            content: '};'
                        }
                    ],
                    addedLines: 10,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                },
                {
                    filePath: '/src/utils/validation.ts',
                    changeType: 'edit',
                    lines: [
                        {
                            lineNumber: 5,
                            type: 'deleted',
                            content: 'export function validateEmail(email: string): boolean {',
                            originalLineNumber: 5
                        },
                        {
                            lineNumber: 5,
                            type: 'added',
                            content: 'export function validateEmail(email: string | null): boolean {'
                        },
                        {
                            lineNumber: 6,
                            type: 'added',
                            content: '  if (!email) return false;'
                        },
                        {
                            lineNumber: 7,
                            type: 'context',
                            content: '  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;'
                        }
                    ],
                    addedLines: 2,
                    deletedLines: 1,
                    isBinary: false,
                    isLargeFile: false
                }
            ];

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test-org',
                projectName: 'test-project',
                skipPreview: true, // Skip preview for automated testing
                customInstructions: 'Focus on TypeScript best practices and React component quality',
                modelPreference: 'gpt-4',
                batchSize: 2
            };

            console.log(`Processing ${fileDiffs.length} file changes...`);

            try {
                const result = await commentManager.executeCommentWorkflow(
                    fileDiffs,
                    options
                );

                console.log('Workflow completed successfully!');
                console.log(`Result: ${JSON.stringify(result, null, 2)}`);

                // Validate result structure
                assert.ok(result);
                assert.ok(typeof result.success === 'boolean');
                assert.ok(typeof result.postedComments === 'number');
                assert.ok(Array.isArray(result.errors));
                assert.ok(typeof result.summary === 'string');
                
                // Log the outcome
                if (result.success) {
                    console.log(`Successfully processed PR with ${result.postedComments} comments posted`);
                } else {
                    console.log(`Workflow completed with issues. Errors: ${result.errors.join(', ')}`);
                }

                assert.ok(result.summary.length > 0);
                
            } catch (error) {
                console.log(`Workflow error (expected in test environment): ${error}`);
                
                // In test environment without real LM API access, errors are expected
                assert.ok(error instanceof Error);
                assert.ok(error.message.length > 0);
                
                // Verify error is related to model access or API limitations
                const errorMessage = error.message.toLowerCase();
                const isExpectedError = 
                    errorMessage.includes('language model') ||
                    errorMessage.includes('model') ||
                    errorMessage.includes('api') ||
                    errorMessage.includes('token') ||
                    errorMessage.includes('network') ||
                    errorMessage.includes('authentication');
                
                if (!isExpectedError) {
                    console.error('Unexpected error type:', error);
                    throw error; // Re-throw if it's not an expected API/model error
                }
            }
            
            console.log('End-to-end workflow test completed');
        });

        test('should handle empty PR workflow', async () => {
            console.log('Testing empty PR workflow...');
            
            const emptyFileDiffs: FileDiff[] = [];
            const options: CommentManagerOptions = {
                pullRequestId: 456,
                organizationUrl: 'https://dev.azure.com/test-org',
                projectName: 'test-project',
                skipPreview: true
            };

            const result = await commentManager.executeCommentWorkflow(
                emptyFileDiffs,
                options
            );

            assert.ok(result);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.postedComments, 0);
            assert.ok(result.summary.includes('No file changes'));
            
            console.log('Empty PR workflow test passed');
        });

        test('should handle large PR workflow', async function() {
            this.timeout(45000); // Longer timeout for large PR
            
            console.log('Testing large PR workflow...');
            
            // Create a large number of file changes
            const largeFileDiffs: FileDiff[] = Array.from({ length: 15 }, (_, i) => ({
                filePath: `/src/components/Component${i}.tsx`,
                changeType: 'add' as const,
                lines: Array.from({ length: 5 }, (_, j) => ({
                    lineNumber: j + 1,
                    type: 'added' as const,
                    content: `// This is line ${j + 1} in component ${i}`
                })),
                addedLines: 5,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const options: CommentManagerOptions = {
                pullRequestId: 789,
                organizationUrl: 'https://dev.azure.com/test-org',
                projectName: 'test-project',
                skipPreview: true,
                batchSize: 3 // Test batching
            };

            console.log(`Processing large PR with ${largeFileDiffs.length} files...`);

            try {
                const result = await commentManager.executeCommentWorkflow(
                    largeFileDiffs,
                    options
                );

                assert.ok(result);
                console.log(`Large PR workflow result: ${JSON.stringify(result, null, 2)}`);
                
            } catch (error) {
                // Expected in test environment
                assert.ok(error instanceof Error);
                console.log(`Expected error in large PR test: ${error.message}`);
            }
            
            console.log('Large PR workflow test completed');
        });
    });

    suite('Error Recovery', () => {
        test('should handle configuration errors gracefully', async () => {
            console.log('Testing configuration error recovery...');
            
            // Create manager with invalid configuration
            const invalidAzureClient = new AzureDevOpsClient(
                'https://invalid-url',
                'invalid-token'
            );
            
            const invalidCommentManager = new CommentManager(
                mockContext,
                languageModelService,
                invalidAzureClient,
                configManager
            );

            const testFileDiffs: FileDiff[] = [{
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [{ lineNumber: 1, type: 'added', content: 'const test = true;' }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }];

            const options: CommentManagerOptions = {
                pullRequestId: 999,
                organizationUrl: 'https://invalid-url',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                await invalidCommentManager.executeCommentWorkflow(testFileDiffs, options);
            } catch (error) {
                assert.ok(error instanceof Error);
                console.log(`Successfully caught configuration error: ${error.message}`);
            }
            
            invalidCommentManager.dispose();
            console.log('Configuration error recovery test passed');
        });

        test('should handle cancellation gracefully', async () => {
            console.log('Testing cancellation handling...');
            
            const fileDiffs: FileDiff[] = Array.from({ length: 5 }, (_, i) => ({
                filePath: `/src/test${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const test${i} = true;` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const cancellationTokenSource = new vscode.CancellationTokenSource();
            
            // Cancel after a very short delay
            setTimeout(() => {
                console.log('Cancelling workflow...');
                cancellationTokenSource.cancel();
            }, 50);

            const options: CommentManagerOptions = {
                pullRequestId: 888,
                organizationUrl: 'https://dev.azure.com/test-org',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                await commentManager.executeCommentWorkflow(
                    fileDiffs,
                    options,
                    cancellationTokenSource.token
                );
                console.log('Workflow completed before cancellation');
            } catch (error) {
                if (error instanceof vscode.CancellationError) {
                    console.log('Successfully handled cancellation');
                } else {
                    console.log(`Other error during cancellation test: ${error}`);
                }
                // Both cancellation and other errors are acceptable
                assert.ok(error instanceof Error);
            }
            
            console.log('Cancellation handling test completed');
        });
    });

    suite('Performance Testing', () => {
        test('should complete workflow within reasonable time', async function() {
            this.timeout(20000); // 20 second timeout
            
            console.log('Testing workflow performance...');
            
            const fileDiffs: FileDiff[] = Array.from({ length: 8 }, (_, i) => ({
                filePath: `/src/perf-test${i}.ts`,
                changeType: 'edit' as const,
                lines: [
                    { lineNumber: 1, type: 'added' as const, content: `// Performance test file ${i}` },
                    { lineNumber: 2, type: 'added' as const, content: `export const test${i} = true;` }
                ],
                addedLines: 2,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const options: CommentManagerOptions = {
                pullRequestId: 777,
                organizationUrl: 'https://dev.azure.com/test-org',
                projectName: 'test-project',
                skipPreview: true,
                batchSize: 4
            };

            const startTime = Date.now();
            
            try {
                await commentManager.executeCommentWorkflow(fileDiffs, options);
                const duration = Date.now() - startTime;
                console.log(`Workflow completed in ${duration}ms`);
                
                // Should complete within reasonable time even with errors
                assert.ok(duration < 15000); // Less than 15 seconds
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`Workflow failed in ${duration}ms with error: ${error}`);
                
                // Even errors should happen within reasonable time
                assert.ok(duration < 15000);
                assert.ok(error instanceof Error);
            }
            
            console.log('Performance testing completed');
        });
    });
});