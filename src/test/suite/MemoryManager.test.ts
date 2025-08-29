import * as assert from 'assert';
import { MemoryManager, MemoryUtils } from '../../utils/MemoryManager';

suite('MemoryManager Tests', () => {
    let memoryManager: MemoryManager;

    setup(() => {
        memoryManager = MemoryManager.getInstance({ enableMemoryLogging: false });
    });

    teardown(() => {
        // Reset singleton for each test
        (MemoryManager as any).instance = null;
    });

    suite('Singleton Pattern', () => {
        test('should return same instance', () => {
            const instance1 = MemoryManager.getInstance();
            const instance2 = MemoryManager.getInstance();
            assert.strictEqual(instance1, instance2);
        });

        test('should accept configuration on first call', () => {
            const config = { maxHeapUsageMB: 100 };
            const instance = MemoryManager.getInstance(config);
            assert.ok(instance);
        });
    });

    suite('Memory Usage Tracking', () => {
        test('should get current memory usage', () => {
            const usage = memoryManager.getMemoryUsage();
            assert.ok(typeof usage.heapUsed === 'number');
            assert.ok(typeof usage.heapTotal === 'number');
            assert.ok(typeof usage.external === 'number');
            assert.ok(typeof usage.rss === 'number');
            assert.ok(usage.heapUsed >= 0);
            assert.ok(usage.heapTotal >= usage.heapUsed);
        });

        test('should check if memory usage is acceptable', () => {
            const result = memoryManager.isMemoryUsageAcceptable();
            assert.ok(typeof result === 'boolean');
        });

        test('should determine if GC should be triggered', () => {
            const result = memoryManager.shouldTriggerGC();
            assert.ok(typeof result === 'boolean');
        });
    });

    suite('Memory Statistics', () => {
        test('should provide memory statistics', () => {
            const stats = memoryManager.getMemoryStats();
            assert.ok(stats.current);
            assert.ok(typeof stats.peak === 'number');
            assert.ok(typeof stats.gcCount === 'number');
            assert.ok(stats.pools);
            assert.ok(typeof stats.pools.reviewComments === 'number');
            assert.ok(typeof stats.pools.fileDiffs === 'number');
        });
    });

    suite('Object Pools', () => {
        test('should provide review comment pool', () => {
            const pool = memoryManager.getReviewCommentPool();
            assert.ok(pool);
            assert.ok(typeof pool.acquire === 'function');
            assert.ok(typeof pool.release === 'function');
            assert.ok(typeof pool.clear === 'function');
            assert.ok(typeof pool.size === 'number');
        });

        test('should provide file diff pool', () => {
            const pool = memoryManager.getFileDiffPool();
            assert.ok(pool);
            assert.ok(typeof pool.acquire === 'function');
            assert.ok(typeof pool.release === 'function');
            assert.ok(typeof pool.clear === 'function');
            assert.ok(typeof pool.size === 'number');
        });

        test('should clear all pools', () => {
            memoryManager.clearPools();
            const stats = memoryManager.getMemoryStats();
            assert.strictEqual(stats.pools.reviewComments, 0);
            assert.strictEqual(stats.pools.fileDiffs, 0);
        });
    });

    suite('Batch Processing', () => {
        test('should process with memory management', async () => {
            const items = Array.from({ length: 10 }, (_, i) => i);
            const processor = async (item: number) => item * 2;

            const results = await memoryManager.processWithMemoryManagement(
                items,
                processor,
                { batchSize: 3 }
            );

            assert.strictEqual(results.length, 10);
            assert.deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
        });

        test('should handle memory warnings during processing', async () => {
            const items = Array.from({ length: 5 }, (_, i) => i);
            const processor = async (item: number) => item;

            let warningCalled = false;
            let gcCalled = false;

            const results = await memoryManager.processWithMemoryManagement(
                items,
                processor,
                {
                    batchSize: 2,
                    onMemoryWarning: () => { warningCalled = true; },
                    onGarbageCollect: () => { gcCalled = true; }
                }
            );

            assert.strictEqual(results.length, 5);
            // Warning and GC callbacks might or might not be called depending on memory usage
        });
    });

    suite('Stream Processing', () => {
        test('should create stream processor', () => {
            const processor = memoryManager.createStreamProcessor(
                async (item: number) => item * 2,
                { concurrency: 2 }
            );

            assert.ok(processor.process);
            assert.ok(processor.getStats);
        });

        test('should track processing statistics', async () => {
            const processor = memoryManager.createStreamProcessor(
                async (item: number) => item * 2,
                { concurrency: 1 }
            );

            async function* generateItems() {
                for (let i = 0; i < 3; i++) {
                    yield i;
                }
            }

            const results: number[] = [];
            for await (const result of processor.process(generateItems())) {
                results.push(result);
            }

            const stats = processor.getStats();
            assert.strictEqual(results.length, 3);
            assert.strictEqual(stats.processed, 3);
            assert.strictEqual(stats.errors, 0);
            assert.ok(stats.peakMemory >= 0);
        });
    });

    suite('Resource Cleanup', () => {
        test('should clean up large objects', () => {
            const largeObj1 = { data: new Array(1000).fill(0) };
            const largeObj2 = { data: new Array(1000).fill(1) };

            assert.doesNotThrow(() => {
                memoryManager.cleanupLargeObjects(largeObj1, largeObj2);
            });
        });

        test('should dispose resources', () => {
            assert.doesNotThrow(() => {
                memoryManager.dispose();
            });
        });
    });
});

suite('MemoryUtils Tests', () => {
    suite('Weak Cache', () => {
        test('should create weak cache', () => {
            const cache = MemoryUtils.createWeakCache<object, string>();
            assert.ok(cache.set);
            assert.ok(cache.get);
            assert.ok(cache.has);
            assert.ok(cache.delete);
            assert.ok(cache.clear);
        });

        test('should store and retrieve values', () => {
            const cache = MemoryUtils.createWeakCache<object, string>();
            const key = {};
            const value = 'test value';

            cache.set(key, value);
            assert.strictEqual(cache.get(key), value);
            assert.strictEqual(cache.has(key), true);
        });

        test('should delete values', () => {
            const cache = MemoryUtils.createWeakCache<object, string>();
            const key = {};
            const value = 'test value';

            cache.set(key, value);
            assert.strictEqual(cache.delete(key), true);
            assert.strictEqual(cache.has(key), false);
            assert.strictEqual(cache.get(key), undefined);
        });
    });

    suite('Chunk Processing', () => {
        test('should process items in chunks', async () => {
            const items = Array.from({ length: 10 }, (_, i) => i);
            const processor = async (chunk: number[]) => chunk.map(x => x * 2);

            const results = await MemoryUtils.processInChunks(items, processor, 3);

            assert.strictEqual(results.length, 10);
            assert.deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
        });

        test('should handle empty arrays', async () => {
            const items: number[] = [];
            const processor = async (chunk: number[]) => chunk;

            const results = await MemoryUtils.processInChunks(items, processor, 3);
            assert.strictEqual(results.length, 0);
        });

        test('should handle single item', async () => {
            const items = [42];
            const processor = async (chunk: number[]) => chunk.map(x => x * 2);

            const results = await MemoryUtils.processInChunks(items, processor, 5);
            assert.deepStrictEqual(results, [84]);
        });
    });

    suite('Deep Clone', () => {
        test('should deep clone simple objects', () => {
            const original = { a: 1, b: { c: 2 } };
            const cloned = MemoryUtils.deepCloneOptimized(original);

            assert.deepStrictEqual(cloned, original);
            assert.notStrictEqual(cloned, original);
            assert.notStrictEqual(cloned.b, original.b);
        });

        test('should handle arrays', () => {
            const original = [1, [2, 3], { a: 4 }];
            const cloned = MemoryUtils.deepCloneOptimized(original);

            assert.deepStrictEqual(cloned, original);
            assert.notStrictEqual(cloned, original);
            assert.notStrictEqual(cloned[1], original[1]);
        });

        test('should handle null and undefined', () => {
            assert.strictEqual(MemoryUtils.deepCloneOptimized(null), null);
            assert.strictEqual(MemoryUtils.deepCloneOptimized(undefined), undefined);
        });
    });

    suite('Object Size Estimation', () => {
        test('should estimate object sizes', () => {
            const smallObj = { a: 1 };
            const largeObj = { data: new Array(1000).fill(0) };

            const smallSize = MemoryUtils.estimateObjectSize(smallObj);
            const largeSize = MemoryUtils.estimateObjectSize(largeObj);

            assert.ok(typeof smallSize === 'number');
            assert.ok(typeof largeSize === 'number');
            assert.ok(smallSize > 0);
            assert.ok(largeSize > smallSize);
        });

        test('should handle primitive values', () => {
            const stringSize = MemoryUtils.estimateObjectSize('hello');
            const numberSize = MemoryUtils.estimateObjectSize(42);
            const booleanSize = MemoryUtils.estimateObjectSize(true);

            assert.ok(stringSize > 0);
            assert.ok(numberSize > 0);
            assert.ok(booleanSize > 0);
        });
    });
});