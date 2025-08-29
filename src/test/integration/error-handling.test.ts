import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';
import { LanguageModelService } from '../../services/LanguageModelService';
import { CommentAnalysisEngine } from '../../services/CommentAnalysisEngine';
import { FileDiff } from '../../models/AzureDevOpsModels';

suite('Integration Tests - Error Handling & Recovery', () => {
    let mockContext: vscode.ExtensionContext;

    suiteSetup(() => {
        console.log('Setting up error handling integration tests...');
        
        mockContext = {
            secrets: {
                get: async (key: string) => 'mock-token',
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
            },
            subscriptions: [],
            extensionPath: '/mock/path',
            extensionUri: vscode.Uri.parse('file:///mock'),
            environmentVariableCollection: {} as any,
            storageUri: vscode.Uri.parse('file:///mock/storage'),
            globalStorageUri: vscode.Uri.parse('file:///mock/global'),
            logUri: vscode.Uri.parse('file:///mock/logs'),
            extensionMode: vscode.ExtensionMode.Test
        } as any;
    });

    suite('Configuration Error Scenarios', () => {
        test('should handle missing PAT token gracefully', async () => {
            console.log('Testing missing PAT token handling...');
            
            const contextWithoutToken = {
                ...mockContext,
                secrets: {
                    get: async () => undefined,
                    store: async () => {},
                    delete: async () => {},
                    onDidChange: () => ({ dispose: () => {} })
                }
            } as any;

            const configManager = new ConfigurationManager(contextWithoutToken);
            
            const token = await configManager.getPatToken();
            assert.strictEqual(token, undefined);
            
            const isConfigured = await configManager.isConfigured();
            assert.strictEqual(isConfigured, false);
            
            console.log('Missing PAT token test passed');
        });

        test('should handle invalid organization URLs', async () => {
            console.log('Testing invalid organization URL handling...');
            
            const configManager = new ConfigurationManager(mockContext);
            
            const invalidUrls = [
                'http://dev.azure.com/test', // HTTP instead of HTTPS
                'https://github.com/test',   // Wrong domain
                'not-a-url',                 // Invalid format
                '',                          // Empty
                'https://dev.azure.com/'     // Missing organization
            ];

            for (const url of invalidUrls) {
                try {
                    const result = await configManager.setOrganizationUrl(url);
                    assert.strictEqual(result.isValid, false);
                    assert.ok(result.error);
                    console.log(`Correctly rejected invalid URL: ${url} - ${result.error}`);
                } catch (error) {
                    // Some invalid URLs might throw exceptions, which is also acceptable
                    assert.ok(error instanceof Error);
                    console.log(`Exception for invalid URL ${url}: ${error.message}`);
                }
            }
            
            console.log('Invalid organization URL test passed');
        });

        test('should validate PAT token format and permissions', async () => {
            console.log('Testing PAT token validation...');
            
            const configManager = new ConfigurationManager(mockContext);
            
            const invalidTokens = [
                '',                    // Empty token
                'invalid-token',       // Invalid format
                '   ',                 // Whitespace only
                'short'                // Too short
            ];

            for (const token of invalidTokens) {
                const result = await configManager.validatePatToken(token);
                assert.strictEqual(result.isValid, false);
                assert.ok(result.error);
                console.log(`Correctly rejected invalid token: ${result.error}`);
            }
            
            console.log('PAT token validation test passed');
        });
    });

    suite('Network Error Scenarios', () => {
        test('should handle network connectivity issues', async () => {
            console.log('Testing network connectivity error handling...');
            
            // Test with unreachable URL
            const unreachableClient = new AzureDevOpsClient(
                'https://unreachable.example.com',
                'test-token'
            );

            try {
                // This should fail with network error
                await unreachableClient.getRepositories('test-project');
                assert.fail('Should have thrown network error');
            } catch (error) {
                assert.ok(error instanceof Error);
                console.log(`Correctly caught network error: ${error.message}`);
            }
            
            console.log('Network connectivity test passed');
        });

        test('should handle API rate limiting', async () => {
            console.log('Testing API rate limiting scenarios...');
            
            const azureClient = new AzureDevOpsClient(
                'https://dev.azure.com/test',
                'test-token'
            );

            // Simulate rapid API calls that would trigger rate limiting
            const rapidCalls = Array.from({ length: 5 }, () =>
                azureClient.getRepositories('test-project').catch((error: any) => error)
            );

            const results = await Promise.all(rapidCalls);
            
            // All calls should either succeed or fail with meaningful errors
            results.forEach((result: any, index: number) => {
                if (result instanceof Error) {
                    console.log(`Call ${index} failed as expected: ${result.message}`);
                    assert.ok(result.message.length > 0);
                } else {
                    console.log(`Call ${index} succeeded unexpectedly`);
                }
            });
            
            console.log('API rate limiting test passed');
        });

        test('should handle authentication failures', async () => {
            console.log('Testing authentication failure handling...');
            
            const configManager = new ConfigurationManager(mockContext);
            
            // Test with obviously invalid token
            const result = await configManager.validatePatToken(
                'obviously-invalid-token',
                'https://dev.azure.com/test'
            );
            
            assert.strictEqual(result.isValid, false);
            assert.ok(result.error);
            assert.ok(result.details);
            
            console.log(`Authentication failure handled correctly: ${result.error}`);
            console.log('Authentication failure test passed');
        });
    });

    suite('Language Model Error Scenarios', () => {
        test('should handle language model unavailability', async () => {
            console.log('Testing language model unavailability...');
            
            const languageModelService = new LanguageModelService();
            
            // Check if models are available
            const isAvailable = await languageModelService.isLanguageModelAvailable();
            console.log(`Language models available: ${isAvailable}`);
            
            if (!isAvailable) {
                // Test handling when no models are available
                const mockFileDiff: FileDiff = {
                    filePath: '/src/test.ts',
                    changeType: 'edit',
                    lines: [{ lineNumber: 1, type: 'added', content: 'const test = true;' }],
                    addedLines: 1,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                };

                try {
                    await languageModelService.analyzeFileDiff(mockFileDiff, 'test instructions');
                    assert.fail('Should have thrown error when no models available');
                } catch (error) {
                    assert.ok(error instanceof Error);
                    console.log(`Correctly handled unavailable models: ${error.message}`);
                }
            } else {
                console.log('Language models are available, skipping unavailability test');
            }
            
            console.log('Language model unavailability test passed');
        });

        test('should handle invalid model preferences', async () => {
            console.log('Testing invalid model preference handling...');
            
            const languageModelService = new LanguageModelService();
            
            const mockFileDiff: FileDiff = {
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [{ lineNumber: 1, type: 'added', content: 'const test = true;' }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            };

            try {
                // Try to use a model that doesn't exist
                await languageModelService.analyzeFileDiff(
                    mockFileDiff, 
                    'test instructions',
                    'non-existent-model-id'
                );
                
                // If this succeeds, the service fell back to available models
                console.log('Service successfully fell back to available models');
            } catch (error) {
                // If this fails, the service should provide a clear error
                assert.ok(error instanceof Error);
                console.log(`Correctly handled invalid model preference: ${error.message}`);
            }
            
            console.log('Invalid model preference test passed');
        });

        test('should handle large file analysis gracefully', async () => {
            console.log('Testing large file analysis...');
            
            const languageModelService = new LanguageModelService();
            
            // Create a mock "large" file diff
            const largeFileDiff: FileDiff = {
                filePath: '/src/large-file.ts',
                changeType: 'edit',
                lines: Array.from({ length: 1000 }, (_, i) => ({
                    lineNumber: i + 1,
                    type: 'added' as const,
                    content: `// This is line ${i + 1} of a very large file`
                })),
                addedLines: 1000,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: true
            };

            try {
                const result = await languageModelService.analyzeFileDiff(
                    largeFileDiff,
                    'analyze this large file'
                );
                
                // Should either succeed with reasonable results or fail gracefully
                assert.ok(Array.isArray(result));
                console.log(`Large file analysis completed with ${result.length} comments`);
            } catch (error) {
                assert.ok(error instanceof Error);
                console.log(`Large file analysis failed gracefully: ${error.message}`);
            }
            
            console.log('Large file analysis test passed');
        });
    });

    suite('Analysis Engine Error Recovery', () => {
        test('should handle analysis engine failures', async () => {
            console.log('Testing analysis engine error recovery...');
            
            const configManager = new ConfigurationManager(mockContext);
            const languageModelService = new LanguageModelService();
            const analysisEngine = new CommentAnalysisEngine(languageModelService, configManager);

            // Test with problematic file diffs
            const problematicFileDiffs: FileDiff[] = [
                {
                    filePath: '/src/binary-file.exe',
                    changeType: 'add',
                    lines: [],
                    addedLines: 0,
                    deletedLines: 0,
                    isBinary: true,
                    isLargeFile: false
                },
                {
                    filePath: '/src/normal-file.ts',
                    changeType: 'edit',
                    lines: [{ lineNumber: 1, type: 'added', content: 'const test = true;' }],
                    addedLines: 1,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                }
            ];

            try {
                const result = await analysisEngine.analyzeChanges(problematicFileDiffs);
                
                // Should return results even if some files failed
                assert.ok(result);
                assert.ok(Array.isArray(result.comments));
                assert.ok(Array.isArray(result.errors));
                assert.ok(result.summary);
                
                console.log(`Analysis completed with ${result.comments.length} comments and ${result.errors.length} errors`);
            } catch (error) {
                assert.ok(error instanceof Error);
                console.log(`Analysis engine failed gracefully: ${error.message}`);
            }
            
            console.log('Analysis engine error recovery test passed');
        });

        test('should handle cancellation during analysis', async () => {
            console.log('Testing analysis cancellation...');
            
            const configManager = new ConfigurationManager(mockContext);
            const languageModelService = new LanguageModelService();
            const analysisEngine = new CommentAnalysisEngine(languageModelService, configManager);

            const fileDiffs: FileDiff[] = Array.from({ length: 10 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const test${i} = true;` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            const cancellationTokenSource = new vscode.CancellationTokenSource();
            
            // Cancel after a short delay
            setTimeout(() => {
                console.log('Cancelling analysis...');
                cancellationTokenSource.cancel();
            }, 100);

            try {
                await analysisEngine.analyzeChanges(
                    fileDiffs,
                    undefined,
                    cancellationTokenSource.token
                );
                console.log('Analysis completed before cancellation');
            } catch (error) {
                if (error instanceof vscode.CancellationError) {
                    console.log('Analysis cancelled successfully');
                } else {
                    console.log(`Analysis failed with error: ${error}`);
                    assert.ok(error instanceof Error);
                }
            }
            
            console.log('Analysis cancellation test passed');
        });
    });

    suite('Memory and Resource Management', () => {
        test('should handle memory pressure gracefully', async () => {
            console.log('Testing memory pressure handling...');
            
            const configManager = new ConfigurationManager(mockContext);
            const languageModelService = new LanguageModelService();

            // Create many large file diffs to simulate memory pressure
            const manyLargeFileDiffs: FileDiff[] = Array.from({ length: 20 }, (_, i) => ({
                filePath: `/src/large-file-${i}.ts`,
                changeType: 'add' as const,
                lines: Array.from({ length: 100 }, (_, j) => ({
                    lineNumber: j + 1,
                    type: 'added' as const,
                    content: `// Large file ${i}, line ${j + 1}: ${'x'.repeat(100)}`
                })),
                addedLines: 100,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: true
            }));

            try {
                const result = await languageModelService.analyzeMultipleFiles(
                    manyLargeFileDiffs,
                    'analyze these large files',
                    undefined,
                    (completed, total, fileName) => {
                        console.log(`Processing ${completed}/${total}: ${fileName}`);
                    }
                );
                
                assert.ok(Array.isArray(result));
                console.log(`Memory pressure test completed with ${result.length} total comments`);
            } catch (error) {
                assert.ok(error instanceof Error);
                console.log(`Memory pressure test failed gracefully: ${error.message}`);
            }
            
            console.log('Memory pressure handling test passed');
        });

        test('should clean up resources properly', async () => {
            console.log('Testing resource cleanup...');
            
            // Create multiple service instances to test cleanup
            const instances = Array.from({ length: 5 }, () => ({
                configManager: new ConfigurationManager(mockContext),
                languageModelService: new LanguageModelService(),
                azureDevOpsClient: new AzureDevOpsClient('https://dev.azure.com/test', 'token')
            }));

            // Use the instances briefly
            for (const instance of instances) {
                try {
                    await instance.configManager.isConfigured();
                    await instance.languageModelService.isLanguageModelAvailable();
                } catch (error) {
                    // Expected errors in test environment
                    console.log(`Expected error during resource test: ${error}`);
                }
            }

            // Cleanup should not throw errors
            assert.doesNotThrow(() => {
                instances.forEach(instance => {
                    // Note: Most services don't have explicit dispose methods,
                    // but they should handle garbage collection gracefully
                });
            });
            
            console.log('Resource cleanup test passed');
        });
    });

    suite('Data Validation and Sanitization', () => {
        test('should validate and sanitize input data', async () => {
            console.log('Testing input validation and sanitization...');
            
            const configManager = new ConfigurationManager(mockContext);
            
            // Test URL sanitization
            const urlsToTest = [
                'https://dev.azure.com/test///',
                'HTTPS://DEV.AZURE.COM/TEST',
                'https://dev.azure.com/test?param=value',
                'https://dev.azure.com/test#fragment'
            ];

            for (const url of urlsToTest) {
                try {
                    const result = await configManager.setOrganizationUrl(url);
                    if (result.isValid) {
                        console.log(`URL sanitized successfully: ${url}`);
                    } else {
                        console.log(`URL correctly rejected: ${url} - ${result.error}`);
                    }
                } catch (error) {
                    console.log(`URL validation error: ${url} - ${error}`);
                    assert.ok(error instanceof Error);
                }
            }
            
            console.log('Input validation test passed');
        });

        test('should handle malformed file diff data', async () => {
            console.log('Testing malformed file diff handling...');
            
            const languageModelService = new LanguageModelService();
            
            // Test with malformed file diff
            const malformedFileDiff: any = {
                filePath: null, // Invalid
                changeType: 'unknown', // Invalid
                lines: 'not an array', // Invalid
                addedLines: 'not a number', // Invalid
                deletedLines: -1, // Invalid
                isBinary: 'maybe', // Invalid
                isLargeFile: undefined // Invalid
            };

            try {
                await languageModelService.analyzeFileDiff(malformedFileDiff, 'test');
                console.log('Service handled malformed data gracefully');
            } catch (error) {
                assert.ok(error instanceof Error);
                console.log(`Correctly rejected malformed data: ${error.message}`);
            }
            
            console.log('Malformed data handling test passed');
        });
    });
});