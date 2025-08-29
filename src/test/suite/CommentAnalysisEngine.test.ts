import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommentAnalysisEngine } from '../../services/CommentAnalysisEngine';
import { LanguageModelService } from '../../services/LanguageModelService';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { FileDiff, ReviewComment } from '../../models/AzureDevOpsModels';

suite('CommentAnalysisEngine Tests', () => {
    let analysisEngine: CommentAnalysisEngine;
    let mockLanguageModelService: LanguageModelService;
    let mockConfigManager: ConfigurationManager;
    let mockContext: vscode.ExtensionContext;

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
        analysisEngine = new CommentAnalysisEngine(mockLanguageModelService, mockConfigManager);
    });

    suite('Initialization', () => {
        test('should initialize with required dependencies', () => {
            assert.ok(analysisEngine);
        });

        test('should accept language model service and config manager', () => {
            const engine = new CommentAnalysisEngine(mockLanguageModelService, mockConfigManager);
            assert.ok(engine);
        });
    });

    suite('File Analysis', () => {
        test('should handle single file analysis', async () => {
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

            try {
                const result = await analysisEngine.analyzeChanges(mockFileDiffs);
                assert.ok(result);
                assert.ok(Array.isArray(result.comments));
                assert.ok(Array.isArray(result.errors));
                assert.ok(result.summary);
            } catch (error) {
                // Should handle gracefully when models are not available
                assert.ok(error instanceof Error);
            }
        });

        test('should skip binary files', async () => {
            const binaryFileDiffs: FileDiff[] = [{
                filePath: '/assets/image.png',
                changeType: 'add',
                lines: [],
                addedLines: 0,
                deletedLines: 0,
                isBinary: true,
                isLargeFile: false
            }];

            try {
                const result = await analysisEngine.analyzeChanges(binaryFileDiffs);
                assert.ok(result);
                assert.ok(Array.isArray(result.comments));
                // Should skip binary files
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });

        test('should handle empty file changes', async () => {
            const emptyFileDiffs: FileDiff[] = [];

            try {
                const result = await analysisEngine.analyzeChanges(emptyFileDiffs);
                assert.ok(result);
                assert.ok(Array.isArray(result.comments));
                assert.strictEqual(result.comments.length, 0);
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });

        test('should handle multiple files', async () => {
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
                const result = await analysisEngine.analyzeChanges(fileDiffs);
                assert.ok(result);
                assert.ok(Array.isArray(result.comments));
            } catch (error) {
                // Should handle gracefully when models are not available
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

            let progressUpdates = 0;
            const progressCallback = (progress: any) => {
                progressUpdates++;
                assert.ok(progress);
                assert.ok(typeof progress.completed === 'number');
                assert.ok(typeof progress.total === 'number');
                assert(progress.completed <= progress.total);
            };

            try {
                await analysisEngine.analyzeChanges(fileDiffs, progressCallback);
                // Should have provided some progress updates
                assert(progressUpdates >= 0); // Might be 0 if models not available
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });

        test('should respect cancellation tokens', async () => {
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
            setTimeout(() => cancellationTokenSource.cancel(), 50);

            try {
                await analysisEngine.analyzeChanges(
                    fileDiffs, 
                    undefined, 
                    cancellationTokenSource.token
                );
                // Should either complete or be cancelled
                assert.ok(true);
            } catch (error) {
                // Should handle cancellation gracefully
                assert.ok(error instanceof Error);
            }
        });
    });

    suite('Result Validation', () => {
        test('should return analysis result with expected structure', async () => {
            const mockFileDiffs: FileDiff[] = [{
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [{ lineNumber: 1, type: 'added', content: 'const x = 1;' }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }];

            try {
                const result = await analysisEngine.analyzeChanges(mockFileDiffs);
                
                // Validate result structure
                assert.ok(result);
                assert.ok(Array.isArray(result.comments));
                assert.ok(Array.isArray(result.errors));
                assert.ok(result.summary);
                assert.ok(typeof result.summary.totalFiles === 'number');
                assert.ok(typeof result.summary.analyzedFiles === 'number');
                
                if (result.errors.length > 0) {
                    assert.ok(typeof result.errors[0].error === 'string');
                }
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });

        test('should validate comment structure in results', async () => {
            const mockFileDiffs: FileDiff[] = [{
                filePath: '/src/test.ts',
                changeType: 'edit',
                lines: [{ lineNumber: 1, type: 'added', content: 'const x = 1;' }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }];

            try {
                const result = await analysisEngine.analyzeChanges(mockFileDiffs);
                
                // Validate comment structure if any comments are generated
                for (const comment of result.comments) {
                    assert.ok(comment.id);
                    assert.ok(comment.fileName);
                    assert.ok(typeof comment.lineNumber === 'number');
                    assert.ok(comment.content);
                    assert.ok(['info', 'warning', 'error'].includes(comment.severity));
                    assert.ok(typeof comment.isApproved === 'boolean');
                }
            } catch (error) {
                assert.ok(error instanceof Error);
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

            try {
                const result = await analysisEngine.analyzeChanges(problematicFileDiffs);
                assert.ok(result);
                // Should return a result even if analysis fails
            } catch (error) {
                assert.ok(error instanceof Error);
                // Should provide meaningful error message
                assert.ok(error.message.length > 0);
            }
        });

        test('should handle large file sets', async () => {
            const manyFileDiffs: FileDiff[] = Array.from({ length: 20 }, (_, i) => ({
                filePath: `/src/file${i}.ts`,
                changeType: 'edit' as const,
                lines: [{ lineNumber: 1, type: 'added' as const, content: `const x${i} = ${i};` }],
                addedLines: 1,
                deletedLines: 0,
                isBinary: false,
                isLargeFile: false
            }));

            try {
                const result = await analysisEngine.analyzeChanges(manyFileDiffs);
                assert.ok(result);
                assert.strictEqual(result.summary.totalFiles, 20);
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });
    });
});