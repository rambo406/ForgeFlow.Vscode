import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../services/ConfigurationManager';

suite('ConfigurationManager Tests', () => {
    let configManager: ConfigurationManager;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create a mock context with basic functionality
        mockContext = {
            secrets: {
                get: async (key: string) => {
                    if (key === 'azdo-pat-token') {
                        return 'test-token';
                    }
                    return undefined;
                },
                store: async (key: string, value: string) => {
                    // Mock store operation
                },
                delete: async (key: string) => {
                    // Mock delete operation
                },
                onDidChange: () => ({ dispose: () => {} })
            },
            globalState: {
                get: (key: string) => undefined,
                update: async (key: string, value: any) => {},
                setKeysForSync: (keys: string[]) => {}
            },
            workspaceState: {
                get: (key: string) => undefined,
                update: async (key: string, value: any) => {}
            }
        } as any;

        configManager = new ConfigurationManager(mockContext);
    });

    suite('Configuration Settings', () => {
        test('should get selected model from configuration', () => {
            // Mock workspace configuration
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    if (key === 'selectedModel') {
                        return 'gpt-4';
                    }
                    return defaultValue;
                },
                update: async () => {},
                has: () => true,
                inspect: () => undefined
            }) as any;

            const result = configManager.getSelectedModel();
            assert.strictEqual(result, 'gpt-4');

            // Restore original function
            vscode.workspace.getConfiguration = originalGetConfiguration;
        });

        test('should get custom instructions from configuration', () => {
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    if (key === 'customInstructions') {
                        return 'Focus on security issues';
                    }
                    return defaultValue;
                },
                update: async () => {},
                has: () => true,
                inspect: () => undefined
            }) as any;

            const result = configManager.getCustomInstructions();
            assert.strictEqual(result, 'Focus on security issues');

            vscode.workspace.getConfiguration = originalGetConfiguration;
        });

        test('should get batch size from configuration', () => {
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    if (key === 'batchSize') {
                        return 10;
                    }
                    return defaultValue;
                },
                update: async () => {},
                has: () => true,
                inspect: () => undefined
            }) as any;

            const result = configManager.getBatchSize();
            assert.strictEqual(result, 10);

            vscode.workspace.getConfiguration = originalGetConfiguration;
        });

        test('should return default batch size for invalid values', () => {
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    if (key === 'batchSize') {
                        return 100; // Invalid - too large
                    }
                    return defaultValue;
                },
                update: async () => {},
                has: () => true,
                inspect: () => undefined
            }) as any;

            const result = configManager.getBatchSize();
            assert.strictEqual(result, 5); // Should return default

            vscode.workspace.getConfiguration = originalGetConfiguration;
        });
    });

    suite('PAT Token Management', () => {
        test('should retrieve PAT token from secure storage', async () => {
            const result = await configManager.getPatToken();
            assert.strictEqual(result, 'test-token');
        });

        test('should store PAT token securely', async () => {
            let storedToken = '';
            const testContext = {
                ...mockContext,
                secrets: {
                    ...mockContext.secrets,
                    store: async (key: string, value: string) => {
                        if (key === 'azdo-pat-token') {
                            storedToken = value;
                        }
                    }
                }
            } as any;

            const testConfigManager = new ConfigurationManager(testContext);
            await testConfigManager.setPatToken('new-token');
            
            assert.strictEqual(storedToken, 'new-token');
        });
    });

    suite('Organization URL Validation', () => {
        test('should validate correct organization URL format', () => {
            const validUrls = [
                'https://dev.azure.com/testorg',
                'https://dev.azure.com/test-org',
                'https://dev.azure.com/test_org'
            ];

            for (const url of validUrls) {
                const result = (configManager as any).validateOrganizationUrl(url);
                assert.strictEqual(result.isValid, true, `URL should be valid: ${url}`);
            }
        });

        test('should reject invalid organization URL formats', () => {
            const invalidUrls = [
                '',
                'http://dev.azure.com/testorg', // HTTP instead of HTTPS
                'https://github.com/testorg', // Wrong domain
                'https://dev.azure.com/', // Missing organization
                'not-a-url'
            ];

            for (const url of invalidUrls) {
                const result = (configManager as any).validateOrganizationUrl(url);
                assert.strictEqual(result.isValid, false, `URL should be invalid: ${url}`);
            }
        });
    });

    suite('Configuration Status', () => {
        test('should return true when PAT token exists', async () => {
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => ({
                get: (key: string, defaultValue?: any) => {
                    if (key === 'organizationUrl') {
                        return 'https://dev.azure.com/testorg';
                    }
                    return defaultValue;
                },
                update: async () => {},
                has: () => true,
                inspect: () => undefined
            }) as any;

            const result = await configManager.isConfigured();
            assert.strictEqual(result, true);

            vscode.workspace.getConfiguration = originalGetConfiguration;
        });

        test('should return false when PAT token is missing', async () => {
            const testContext = {
                ...mockContext,
                secrets: {
                    ...mockContext.secrets,
                    get: async (key: string) => undefined
                }
            } as any;

            const testConfigManager = new ConfigurationManager(testContext);
            const result = await testConfigManager.isConfigured();
            assert.strictEqual(result, false);
        });
    });
});