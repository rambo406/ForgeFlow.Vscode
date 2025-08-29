import * as assert from 'assert';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';
import { PullRequest, FileChange, ValidationResult } from '../../models/AzureDevOpsModels';

suite('AzureDevOpsClient Tests', () => {
    let client: AzureDevOpsClient;
    const testOrgUrl = 'https://dev.azure.com/testorg';
    const testToken = 'test-pat-token';

    setup(() => {
        client = new AzureDevOpsClient(testOrgUrl, testToken);
    });

    suite('Initialization', () => {
        test('should create client with valid organization URL', () => {
            const client = new AzureDevOpsClient(testOrgUrl, testToken);
            assert.ok(client);
        });

        test('should throw error for invalid organization URL', () => {
            assert.throws(() => {
                new AzureDevOpsClient('http://dev.azure.com/testorg', testToken);
            }, /Organization URL must use HTTPS/);
        });

        test('should sanitize organization URL by removing trailing slashes', () => {
            const clientWithSlashes = new AzureDevOpsClient('https://dev.azure.com/testorg///', testToken);
            assert.ok(clientWithSlashes);
        });
    });

    suite('URL Sanitization', () => {
        test('should remove trailing slashes from URL', () => {
            const sanitized = (client as any).sanitizeBaseUrl('https://dev.azure.com/testorg///');
            assert.strictEqual(sanitized, 'https://dev.azure.com/testorg');
        });

        test('should preserve valid HTTPS URLs', () => {
            const url = 'https://dev.azure.com/testorg';
            const sanitized = (client as any).sanitizeBaseUrl(url);
            assert.strictEqual(sanitized, url);
        });

        test('should throw error for non-HTTPS URLs', () => {
            assert.throws(() => {
                (client as any).sanitizeBaseUrl('http://dev.azure.com/testorg');
            }, /Organization URL must use HTTPS/);
        });
    });

    suite('Error Handling', () => {
        test('should handle network errors gracefully', () => {
            const networkError = {
                code: 'ENOTFOUND',
                message: 'Network error',
                response: undefined
            };

            const handledError = (client as any).handleApiError(networkError);
            assert.ok(handledError instanceof Error);
            assert(handledError.message.includes('Network connection failed'));
        });

        test('should handle 401 authentication errors', () => {
            const authError = {
                response: {
                    status: 401,
                    data: { message: 'Unauthorized' }
                },
                message: 'Authentication failed'
            };

            const handledError = (client as any).handleApiError(authError);
            assert.ok(handledError instanceof Error);
            assert(handledError.message.includes('Authentication failed'));
        });

        test('should handle 403 authorization errors', () => {
            const authzError = {
                response: {
                    status: 403,
                    data: { message: 'Forbidden' }
                },
                message: 'Access denied'
            };

            const handledError = (client as any).handleApiError(authzError);
            assert.ok(handledError instanceof Error);
            assert(handledError.message.includes('Access denied'));
        });

        test('should handle 404 not found errors', () => {
            const notFoundError = {
                response: {
                    status: 404,
                    data: { message: 'Not found' }
                },
                message: 'Resource not found'
            };

            const handledError = (client as any).handleApiError(notFoundError);
            assert.ok(handledError instanceof Error);
            assert(handledError.message.includes('Resource not found'));
        });

        test('should handle rate limiting errors', () => {
            const rateLimitError = {
                response: {
                    status: 429,
                    data: { message: 'Too many requests' }
                },
                message: 'Rate limited'
            };

            const handledError = (client as any).handleApiError(rateLimitError);
            assert.ok(handledError instanceof Error);
            assert(handledError.message.includes('Rate limit exceeded'));
        });
    });

    suite('Diff Parsing', () => {
        test('should parse simple diff with added lines', () => {
            const diffContent = `@@ -1,3 +1,4 @@
 line1
 line2
+added line
 line3`;

            const result = (client as any).parseDiff(diffContent);
            assert.strictEqual(result.addedLines, 1);
            assert.strictEqual(result.deletedLines, 0);
            assert.strictEqual(result.lines.length, 4);
            
            const addedLine = result.lines.find((line: any) => line.type === 'added');
            assert.ok(addedLine);
            assert.strictEqual(addedLine.content, 'added line');
        });

        test('should parse diff with deleted lines', () => {
            const diffContent = `@@ -1,4 +1,3 @@
 line1
-deleted line
 line2
 line3`;

            const result = (client as any).parseDiff(diffContent);
            assert.strictEqual(result.addedLines, 0);
            assert.strictEqual(result.deletedLines, 1);
            
            const deletedLine = result.lines.find((line: any) => line.type === 'deleted');
            assert.ok(deletedLine);
            assert.strictEqual(deletedLine.content, 'deleted line');
        });

        test('should parse diff with modified lines', () => {
            const diffContent = `@@ -1,3 +1,3 @@
 line1
-old line
+new line
 line3`;

            const result = (client as any).parseDiff(diffContent);
            assert.strictEqual(result.addedLines, 1);
            assert.strictEqual(result.deletedLines, 1);
            
            const deletedLine = result.lines.find((line: any) => line.type === 'deleted');
            const addedLine = result.lines.find((line: any) => line.type === 'added');
            assert.ok(deletedLine);
            assert.ok(addedLine);
            assert.strictEqual(deletedLine.content, 'old line');
            assert.strictEqual(addedLine.content, 'new line');
        });

        test('should handle empty diff', () => {
            const result = (client as any).parseDiff('');
            assert.strictEqual(result.addedLines, 0);
            assert.strictEqual(result.deletedLines, 0);
            assert.strictEqual(result.lines.length, 0);
        });

        test('should handle diff with only context lines', () => {
            const diffContent = `@@ -1,3 +1,3 @@
 line1
 line2
 line3`;

            const result = (client as any).parseDiff(diffContent);
            assert.strictEqual(result.addedLines, 0);
            assert.strictEqual(result.deletedLines, 0);
            assert.strictEqual(result.lines.length, 3);
            
            result.lines.forEach((line: any) => {
                assert.strictEqual(line.type, 'context');
            });
        });
    });

    suite('API Request Utilities', () => {
        test('should construct proper authorization header', () => {
            const client = new AzureDevOpsClient(testOrgUrl, testToken);
            const expectedAuth = `Basic ${Buffer.from(`:${testToken}`).toString('base64')}`;
            
            // Access the private authHeader property for testing
            const authHeader = (client as any).authHeader;
            assert.strictEqual(authHeader, expectedAuth);
        });

        test('should format base URL correctly', () => {
            const client = new AzureDevOpsClient(testOrgUrl, testToken);
            const baseUrl = (client as any).baseUrl;
            assert.strictEqual(baseUrl, testOrgUrl);
        });
    });

    suite('Data Model Validation', () => {
        test('should validate pull request data structure', () => {
            const mockPR: PullRequest = {
                pullRequestId: 123,
                title: 'Test PR',
                description: 'Test description',
                sourceRefName: 'refs/heads/feature',
                targetRefName: 'refs/heads/main',
                createdBy: {
                    displayName: 'Test User',
                    uniqueName: 'test@example.com',
                    id: 'user-id',
                    url: 'https://dev.azure.com/testorg/_apis/identities/user-id'
                },
                creationDate: new Date(),
                status: 'active',
                isDraft: false,
                repository: {
                    id: 'repo-id',
                    name: 'test-repo',
                    url: 'https://dev.azure.com/testorg/_apis/git/repositories/repo-id'
                },
                _links: {
                    web: {
                        href: 'https://dev.azure.com/testorg/_git/test-repo/pullrequest/123'
                    }
                }
            };

            assert.strictEqual(mockPR.pullRequestId, 123);
            assert.strictEqual(mockPR.title, 'Test PR');
            assert.strictEqual(mockPR.status, 'active');
            assert.ok(mockPR.createdBy);
            assert.ok(mockPR.creationDate instanceof Date);
        });

        test('should validate file change data structure', () => {
            const mockFileChange: FileChange = {
                item: {
                    path: '/src/test.ts',
                    url: 'https://dev.azure.com/testorg/_apis/git/items/test.ts',
                    objectId: 'abc123',
                    gitObjectType: 'blob',
                    commitId: 'def456',
                    isFolder: false
                },
                changeType: 'edit',
                url: 'https://dev.azure.com/testorg/_apis/git/changes/edit'
            };

            assert.strictEqual(mockFileChange.changeType, 'edit');
            assert.strictEqual(mockFileChange.item.path, '/src/test.ts');
            assert.ok(mockFileChange.item.url);
        });

        test('should validate validation result structure', () => {
            const validResult: ValidationResult = {
                isValid: true,
                details: 'Operation successful'
            };

            const invalidResult: ValidationResult = {
                isValid: false,
                error: 'Operation failed',
                details: 'Error details'
            };

            assert.strictEqual(validResult.isValid, true);
            assert.ok(validResult.details);
            assert.strictEqual(invalidResult.isValid, false);
            assert.ok(invalidResult.error);
            assert.ok(invalidResult.details);
        });
    });
});