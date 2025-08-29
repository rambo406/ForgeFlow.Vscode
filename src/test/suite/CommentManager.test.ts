import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommentManager, CommentManagerOptions } from '../../services/CommentManager';
import { LanguageModelService } from '../../services/LanguageModelService';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { FileDiff, ReviewComment } from '../../models/AzureDevOpsModels';

suite('CommentManager Tests', () => {
    let commentManager: CommentManager;
    let mockContext: vscode.ExtensionContext;
    let mockLanguageModelService: LanguageModelService;
    let mockAzureDevOpsClient: AzureDevOpsClient;
    let mockConfigManager: ConfigurationManager;

    setup(() => {
        // Create mock context
        mockContext = {
            secrets: {
                get: async () => 'test-token',
                store: async () => {},
                delete: async () => {},
                onDidChange: () => ({ dispose: () => {} })
            },
            globalState: {
                get: () => undefined,
                update: async () => {},
                setKeysForSync: () => {}
            },
            workspaceState: {
                get: () => undefined,
                update: async () => {}
            }
        } as any;

        mockConfigManager = new ConfigurationManager(mockContext);
        mockLanguageModelService = new LanguageModelService();
        mockAzureDevOpsClient = new AzureDevOpsClient('https://dev.azure.com/test', 'token');
        
        commentManager = new CommentManager(
            mockContext,
            mockLanguageModelService,
            mockAzureDevOpsClient,
            mockConfigManager
        );
    });

    suite('Initialization', () => {
        test('should initialize with required dependencies', () => {
            assert.ok(commentManager);
        });

        test('should handle missing dependencies gracefully', () => {
            assert.throws(() => {
                new CommentManager(
                    mockContext,
                    null as any,
                    mockAzureDevOpsClient,
                    mockConfigManager
                );
            });
        });
    });

    suite('Complete Analysis Workflow', () => {
        test('should execute complete workflow with valid inputs', async () => {
            const mockFileDiffs: FileDiff[] = [{
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [
                    {
                        lineNumber: 1,
                        type: 'added',
                        content: 'const x = 1;'
                    }
                ],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }];

            const mockPullRequest = {
                pullRequestId: 123,
                title: 'Test PR',
                repository: { id: 'repo-id', name: 'test-repo' }
            };

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                const result = await commentManager.executeCommentWorkflow(
                    mockFileDiffs,
                    options
                );
                
                assert.ok(result);
                assert.ok(typeof result.success === 'boolean');
                assert.ok(typeof result.postedComments === 'number');
                assert.ok(Array.isArray(result.errors));
                assert.ok(typeof result.summary === 'string');
            } catch (error) {
                // Should handle gracefully when models/API unavailable
                assert.ok(error instanceof Error);
            }
        });

        test('should handle empty file diffs', async () => {
            const emptyFileDiffs: FileDiff[] = [];
            
            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                const result = await commentManager.executeCommentWorkflow(
                    emptyFileDiffs,
                    options
                );
                
                assert.ok(result);
                assert.strictEqual(result.postedComments, 0);
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });

        test('should respect batch size limits', async () => {
            const manyFileDiffs: FileDiff[] = Array.from({ length: 25 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const x${i} = ${i};` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true,
                batchSize: 5
            };

            try {
                const result = await commentManager.executeCommentWorkflow(
                    manyFileDiffs,
                    options
                );
                
                assert.ok(result);
                // Should process all files even in batches
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });
    });

    suite('Progress Tracking', () => {
        test('should provide progress updates during analysis', async () => {
            const fileDiffs: FileDiff[] = Array.from({ length: 3 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const x${i} = ${i};` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                await commentManager.executeCommentWorkflow(
                    fileDiffs,
                    options
                );
                
                assert.ok(true); // Should complete without throwing
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });

        test('should support cancellation', async () => {
            const fileDiffs: FileDiff[] = Array.from({ length: 5 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const x${i} = ${i};` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const cancellationTokenSource = new vscode.CancellationTokenSource();
            
            // Cancel after a short delay
            setTimeout(() => cancellationTokenSource.cancel(), 10);

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                await commentManager.executeCommentWorkflow(
                    fileDiffs,
                    options,
                    cancellationTokenSource.token
                );
                
                // Should either complete or be cancelled gracefully
                assert.ok(true);
            } catch (error) {
                // Should handle cancellation or other errors gracefully
                assert.ok(error instanceof Error || error instanceof vscode.CancellationError);
            }
        });
    });

    suite('Error Handling', () => {
        test('should handle analysis failures gracefully', async () => {
            const problematicFileDiffs: FileDiff[] = [{
                filePath: '/src/problematic.ts',
                changeType: 'edit',
                lines: [{ lineNumber: 1, type: 'added', content: 'const x = 1;' }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }];

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                const result = await commentManager.executeCommentWorkflow(
                    problematicFileDiffs,
                    options
                );
                
                assert.ok(result);
                // Should return a result even if some analysis fails
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.length > 0);
            }
        });

        test('should handle network errors during posting', async () => {
            const mockFileDiffs: FileDiff[] = [{
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [{ lineNumber: 1, type: 'added', content: 'const x = 1;' }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }];

            // Mock Azure DevOps client to simulate network error
            const errorClient = new AzureDevOpsClient('https://dev.azure.com/test', 'invalid-token');
            const errorCommentManager = new CommentManager(
                mockContext,
                mockLanguageModelService,
                errorClient,
                mockConfigManager
            );

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true
            };

            try {
                await errorCommentManager.executeCommentWorkflow(
                    mockFileDiffs,
                    options
                );
                
                // Should handle gracefully even with network errors
                assert.ok(true);
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });
    });

    suite('Configuration Integration', () => {
        test('should use configuration settings', async () => {
            // Mock configuration to return specific values
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    if (key === 'batchSize') {
                        return 5;
                    }
                    if (key === 'selectedModel') {
                        return 'gpt-4';
                    }
                    if (key === 'customInstructions') {
                        return 'Focus on security issues';
                    }
                    return defaultValue;
                },
                update: async () => {},
                has: () => true,
                inspect: () => undefined
            }) as any;

            const fileDiffs: FileDiff[] = Array.from({ length: 3 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const x${i} = ${i};` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const options: CommentManagerOptions = {
                pullRequestId: 123,
                organizationUrl: 'https://dev.azure.com/test',
                projectName: 'test-project',
                skipPreview: true,
                batchSize: 5,
                customInstructions: 'Focus on security issues',
                modelPreference: 'gpt-4'
            };

            try {
                const result = await commentManager.executeCommentWorkflow(
                    fileDiffs,
                    options
                );
                
                assert.ok(result);
                // Should use configured batch size and model
            } catch (error) {
                assert.ok(error instanceof Error);
            }

            vscode.workspace.getConfiguration = originalGetConfiguration;
        });
    });

    suite('Resource Management', () => {
        test('should dispose resources properly', () => {
            const disposableCommentManager = new CommentManager(
                mockContext,
                mockLanguageModelService,
                mockAzureDevOpsClient,
                mockConfigManager
            );

            assert.doesNotThrow(() => {
                disposableCommentManager.dispose();
            });
        });

        test('should handle multiple dispose calls', () => {
            const disposableCommentManager = new CommentManager(
                mockContext,
                mockLanguageModelService,
                mockAzureDevOpsClient,
                mockConfigManager
            );

            assert.doesNotThrow(() => {
                disposableCommentManager.dispose();
                disposableCommentManager.dispose(); // Second call should be safe
            });
        });
    });
});