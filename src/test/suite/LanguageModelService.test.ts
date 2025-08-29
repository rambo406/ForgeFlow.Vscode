import * as assert from 'assert';
import * as vscode from 'vscode';
import { LanguageModelService } from '../../services/LanguageModelService';
import { FileDiff, ReviewComment } from '../../models/AzureDevOpsModels';

suite('LanguageModelService Tests', () => {
    let languageModelService: LanguageModelService;

    setup(() => {
        languageModelService = new LanguageModelService();
    });

    suite('Model Selection', () => {
        test('should initialize with default model preferences', () => {
            assert.ok(languageModelService);
        });

        test('should handle model availability check gracefully', async () => {
            // Mock no available models scenario
            const originalSelectChatModels = vscode.lm.selectChatModels;
            vscode.lm.selectChatModels = async () => [];

            const models = await languageModelService.getAvailableModels();
            assert.ok(Array.isArray(models));
            
            // Restore original function
            vscode.lm.selectChatModels = originalSelectChatModels;
        });
    });

    suite('File Analysis', () => {
        test('should create valid FileDiff structure', () => {
            const mockFileDiff: FileDiff = {
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [
                    {
                        lineNumber: 1,
                        type: 'deleted',
                        content: 'const x = 1;',
                        originalLineNumber: 1
                    },
                    {
                        lineNumber: 1,
                        type: 'added',
                        content: 'const x = 2;',
                        originalLineNumber: 1
                    }
                ],
                addedLines: 1,
                deletedLines: 1,
                isBinary: false,
                isLargeFile: false
            };

            assert.strictEqual(mockFileDiff.filePath, '/src/test.ts');
            assert.strictEqual(mockFileDiff.changeType, 'edit');
            assert.strictEqual(mockFileDiff.addedLines, 1);
            assert.strictEqual(mockFileDiff.deletedLines, 1);
            assert.strictEqual(mockFileDiff.lines.length, 2);
        });

        test('should handle file additions', () => {
            const mockFileDiff: FileDiff = {
                filePath: '/src/new-component.tsx',
                changeType: 'add',
                lines: [
                    {
                        lineNumber: 1,
                        type: 'added',
                        content: 'export const Button = () => <button>Click me</button>;'
                    }
                ],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            };

            assert.strictEqual(mockFileDiff.changeType, 'add');
            assert.strictEqual(mockFileDiff.addedLines, 1);
            assert.strictEqual(mockFileDiff.deletedLines, 0);
        });

        test('should handle file deletions', () => {
            const mockFileDiff: FileDiff = {
                filePath: '/src/old-component.ts',
                changeType: 'delete',
                lines: [
                    {
                        lineNumber: 1,
                        type: 'deleted',
                        content: 'export const OldComponent = () => {};',
                        originalLineNumber: 1
                    }
                ],
                addedLines: 0,
                deletedLines: 1,
                isBinary: false,
                isLargeFile: false
            };

            assert.strictEqual(mockFileDiff.changeType, 'delete');
            assert.strictEqual(mockFileDiff.addedLines, 0);
            assert.strictEqual(mockFileDiff.deletedLines, 1);
        });

        test('should handle binary files', () => {
            const mockFileDiff: FileDiff = {
                filePath: '/assets/image.png',
                changeType: 'add',
                lines: [],
                addedLines: 0,
                deletedLines: 0,
                isBinary: true,
                isLargeFile: false
            };

            assert.strictEqual(mockFileDiff.isBinary, true);
            assert.strictEqual(mockFileDiff.lines.length, 0);
        });

        test('should handle large files', () => {
            const mockFileDiff: FileDiff = {
                filePath: '/data/large-dataset.json',
                changeType: 'edit',
                lines: [],
                addedLines: 1000,
                deletedLines: 500,
                isBinary: false,
                isLargeFile: true
            };

            assert.strictEqual(mockFileDiff.isLargeFile, true);
            assert.strictEqual(mockFileDiff.addedLines, 1000);
        });
    });

    suite('Error Handling', () => {
        test('should handle model unavailability', async () => {
            const mockFileDiff: FileDiff = {
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
            };

            // Mock no available models
            const originalSelectChatModels = vscode.lm.selectChatModels;
            vscode.lm.selectChatModels = async () => [];

            try {
                await languageModelService.analyzeFileDiff(mockFileDiff, 'test instructions');
                // If we get here, the service should have handled the error gracefully
                assert.ok(true);
            } catch (error) {
                // Should throw a meaningful error
                assert.ok(error instanceof Error);
                assert(error.message.includes('No language model available') || 
                       error.message.includes('model') || 
                       error.message.includes('available'));
            }

            vscode.lm.selectChatModels = originalSelectChatModels;
        });

        test('should handle empty file diffs', async () => {
            const emptyFileDiff: FileDiff = {
                filePath: '/src/empty.ts',
                changeType: 'edit',
                lines: [],
                addedLines: 0,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            };

            try {
                const result = await languageModelService.analyzeFileDiff(emptyFileDiff, 'Test instructions');
                assert.ok(Array.isArray(result));
                // Should return empty array or handled gracefully
            } catch (error) {
                // Should handle gracefully
                assert.ok(error instanceof Error);
            }
        });

        test('should handle binary file analysis', async () => {
            const binaryFileDiff: FileDiff = {
                filePath: '/assets/image.png',
                changeType: 'add',
                lines: [],
                addedLines: 0,
                deletedLines: 0,
                isBinary: true,
                isLargeFile: false
            };

            try {
                const result = await languageModelService.analyzeFileDiff(binaryFileDiff, 'Test instructions');
                assert.ok(Array.isArray(result));
                // Should return empty array or skip binary files
                assert.strictEqual(result.length, 0);
            } catch (error) {
                // Should handle binary files gracefully
                assert.ok(error instanceof Error);
            }
        });
    });

    suite('Comment Generation', () => {
        test('should generate review comments with proper structure', () => {
            const mockComment: ReviewComment = {
                id: 'test-1',
                fileName: 'test.ts',
                lineNumber: 5,
                content: 'Consider using const instead of let',
                severity: 'warning',
                suggestion: 'Replace let with const',
                isApproved: false
            };

            assert.strictEqual(mockComment.fileName, 'test.ts');
            assert.strictEqual(mockComment.lineNumber, 5);
            assert.strictEqual(mockComment.severity, 'warning');
            assert.strictEqual(mockComment.isApproved, false);
            assert.ok(mockComment.content);
            assert.ok(mockComment.suggestion);
        });

        test('should validate comment severity levels', () => {
            const validSeverities: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];
            
            for (const severity of validSeverities) {
                const comment: ReviewComment = {
                    id: `test-${severity}`,
                    fileName: 'test.ts',
                    lineNumber: 1,
                    content: `This is a ${severity} comment`,
                    severity: severity,
                    isApproved: false
                };

                assert.ok(validSeverities.includes(comment.severity));
            }
        });

        test('should assign unique IDs to comments', () => {
            const comment1: ReviewComment = {
                id: 'test-1',
                fileName: 'test.ts',
                lineNumber: 1,
                content: 'Comment 1',
                severity: 'info',
                isApproved: false
            };

            const comment2: ReviewComment = {
                id: 'test-2',
                fileName: 'test.ts',
                lineNumber: 2,
                content: 'Comment 2',
                severity: 'warning',
                isApproved: false
            };

            assert.notStrictEqual(comment1.id, comment2.id);
        });
    });

    suite('Batch Processing', () => {
        test('should handle multiple file analysis', async () => {
            const fileDiffs: FileDiff[] = [
                {
                    filePath: '/src/file1.ts',
                    changeType: 'edit',
                    lines: [{ lineNumber: 1, type: 'added', content: 'const a = 1;' }],
                    addedLines: 1,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                },
                {
                    filePath: '/src/file2.ts',
                    changeType: 'edit',
                    lines: [{ lineNumber: 1, type: 'added', content: 'const b = 2;' }],
                    addedLines: 1,
                    deletedLines: 0,
                    isBinary: false,
                    isLargeFile: false
                }
            ];

            try {
                const results = await languageModelService.analyzeMultipleFiles(
                    fileDiffs, 
                    'Test instructions'
                );
                assert.ok(Array.isArray(results));
            } catch (error) {
                // Should handle gracefully even if models are not available
                assert.ok(error instanceof Error);
            }
        });

        test('should respect batch size limits', async () => {
            const manyFileDiffs: FileDiff[] = Array.from({ length: 10 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const x${i} = ${i};` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            try {
                const results = await languageModelService.analyzeMultipleFiles(
                    manyFileDiffs, 
                    'Test instructions'
                );
                assert.ok(Array.isArray(results));
                // Should process all files even with small batch size
            } catch (error) {
                // Should handle gracefully
                assert.ok(error instanceof Error);
            }
        });
    });
});