import * as vscode from 'vscode';

/**
 * Memory usage tracking interface
 */
export interface MemoryUsage {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    rss: number;
}

/**
 * Configuration for memory management
 */
export interface MemoryConfig {
    maxHeapUsageMB: number;
    gcThresholdMB: number;
    warningThresholdMB: number;
    enableGarbageCollection: boolean;
    enableMemoryLogging: boolean;
}

/**
 * Memory pool for reusing objects and reducing garbage collection
 */
export class ObjectPool<T> {
    private readonly pool: T[] = [];
    private readonly factory: () => T;
    private readonly reset: (obj: T) => void;
    private readonly maxSize: number;

    constructor(factory: () => T, reset: (obj: T) => void, maxSize: number = 100) {
        this.factory = factory;
        this.reset = reset;
        this.maxSize = maxSize;
    }

    /**
     * Get an object from the pool or create a new one
     */
    acquire(): T {
        const obj = this.pool.pop();
        if (obj) {
            this.reset(obj);
            return obj;
        }
        return this.factory();
    }

    /**
     * Return an object to the pool
     */
    release(obj: T): void {
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }

    /**
     * Clear the pool
     */
    clear(): void {
        this.pool.length = 0;
    }

    /**
     * Get current pool size
     */
    get size(): number {
        return this.pool.length;
    }
}

/**
 * Memory manager for the extension
 */
export class MemoryManager {
    private static instance: MemoryManager;
    private readonly config: MemoryConfig;
    private readonly monitoringInterval: NodeJS.Timeout | null = null;
    private readonly outputChannel: vscode.OutputChannel;
    
    // Object pools for commonly used objects
    private readonly reviewCommentPool: ObjectPool<any>;
    private readonly fileDiffPool: ObjectPool<any>;
    
    // Memory tracking
    private peakHeapUsage: number = 0;
    private lastGcTime: number = 0;
    private gcCount: number = 0;

    private constructor(config: Partial<MemoryConfig> = {}) {
        this.config = {
            maxHeapUsageMB: config.maxHeapUsageMB || 500,
            gcThresholdMB: config.gcThresholdMB || 300,
            warningThresholdMB: config.warningThresholdMB || 400,
            enableGarbageCollection: config.enableGarbageCollection !== false,
            enableMemoryLogging: config.enableMemoryLogging || false
        };

        this.outputChannel = vscode.window.createOutputChannel('Azure DevOps PR Reviewer - Memory');

        // Initialize object pools
        this.reviewCommentPool = new ObjectPool(
            () => ({}),
            (obj: any) => {
                // Reset review comment object
                Object.keys(obj).forEach(key => delete (obj as any)[key]);
            },
            50
        );

        this.fileDiffPool = new ObjectPool(
            () => ({}),
            (obj: any) => {
                // Reset file diff object
                Object.keys(obj).forEach(key => delete (obj as any)[key]);
            },
            20
        );

        // Start memory monitoring if enabled
        if (this.config.enableMemoryLogging) {
            this.startMemoryMonitoring();
        }
    }

    public static getInstance(config?: Partial<MemoryConfig>): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager(config);
        }
        return MemoryManager.instance;
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage(): MemoryUsage {
        const usage = process.memoryUsage();
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
            external: Math.round(usage.external / 1024 / 1024), // MB
            arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
            rss: Math.round(usage.rss / 1024 / 1024) // MB
        };
    }

    /**
     * Check if memory usage is within acceptable limits
     */
    isMemoryUsageAcceptable(): boolean {
        const usage = this.getMemoryUsage();
        return usage.heapUsed < this.config.maxHeapUsageMB;
    }

    /**
     * Check if garbage collection should be triggered
     */
    shouldTriggerGC(): boolean {
        const usage = this.getMemoryUsage();
        const timeSinceLastGc = Date.now() - this.lastGcTime;
        
        return this.config.enableGarbageCollection && 
               usage.heapUsed > this.config.gcThresholdMB &&
               timeSinceLastGc > 30000; // At least 30 seconds since last GC
    }

    /**
     * Force garbage collection if available
     */
    forceGarbageCollection(): void {
        if (global.gc && this.config.enableGarbageCollection) {
            const beforeUsage = this.getMemoryUsage();
            
            global.gc();
            this.lastGcTime = Date.now();
            this.gcCount++;
            
            const afterUsage = this.getMemoryUsage();
            const freed = beforeUsage.heapUsed - afterUsage.heapUsed;
            
            this.logMemoryEvent(`Garbage collection freed ${freed}MB (${beforeUsage.heapUsed}MB -> ${afterUsage.heapUsed}MB)`);
        }
    }

    /**
     * Process large data with memory management
     */
    async processWithMemoryManagement<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        options: {
            batchSize?: number;
            memoryCheckInterval?: number;
            onMemoryWarning?: () => void;
            onGarbageCollect?: () => void;
        } = {}
    ): Promise<R[]> {
        const batchSize = options.batchSize || 10;
        const memoryCheckInterval = options.memoryCheckInterval || 5;
        const results: R[] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            // Process batch
            for (const item of batch) {
                const result = await processor(item);
                results.push(result);
            }

            // Check memory usage periodically
            if (i % memoryCheckInterval === 0) {
                const usage = this.getMemoryUsage();
                
                // Update peak usage
                if (usage.heapUsed > this.peakHeapUsage) {
                    this.peakHeapUsage = usage.heapUsed;
                }

                // Check for memory warnings
                if (usage.heapUsed > this.config.warningThresholdMB) {
                    this.logMemoryEvent(`Memory warning: ${usage.heapUsed}MB used (threshold: ${this.config.warningThresholdMB}MB)`);
                    options.onMemoryWarning?.();
                }

                // Trigger garbage collection if needed
                if (this.shouldTriggerGC()) {
                    this.forceGarbageCollection();
                    options.onGarbageCollect?.();
                }

                // Check if we should pause to let memory recover
                if (!this.isMemoryUsageAcceptable()) {
                    this.logMemoryEvent(`Memory usage too high (${usage.heapUsed}MB), pausing processing`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        return results;
    }

    /**
     * Create a memory-efficient stream processor
     */
    createStreamProcessor<T, R>(
        processor: (item: T) => Promise<R>,
        options: {
            highWaterMark?: number;
            concurrency?: number;
        } = {}
    ): {
        process: (items: AsyncIterable<T>) => AsyncGenerator<R>;
        getStats: () => { processed: number; errors: number; peakMemory: number };
    } {
        const concurrency = options.concurrency || 3;
        let processed = 0;
        let errors = 0;
        let peakMemory = 0;
        const memoryManager = this;

        async function* process(items: AsyncIterable<T>): AsyncGenerator<R> {
            const queue: Promise<R>[] = [];

            for await (const item of items) {
                // Limit concurrency
                if (queue.length >= concurrency) {
                    const result = await queue.shift()!;
                    yield result;
                    processed++;
                }

                // Add new item to queue
                queue.push(
                    processor(item).catch(error => {
                        errors++;
                        throw error;
                    })
                );

                // Check memory usage
                const usage = memoryManager.getMemoryUsage();
                peakMemory = Math.max(peakMemory, usage.heapUsed);
            }

            // Process remaining items
            while (queue.length > 0) {
                const result = await queue.shift()!;
                yield result;
                processed++;
            }
        }

        return {
            process,
            getStats: () => ({ processed, errors, peakMemory })
        };
    }

    /**
     * Get object pool for review comments
     */
    getReviewCommentPool(): ObjectPool<any> {
        return this.reviewCommentPool;
    }

    /**
     * Get object pool for file diffs
     */
    getFileDiffPool(): ObjectPool<any> {
        return this.fileDiffPool;
    }

    /**
     * Clear all object pools
     */
    clearPools(): void {
        this.reviewCommentPool.clear();
        this.fileDiffPool.clear();
        this.logMemoryEvent('Cleared all object pools');
    }

    /**
     * Start monitoring memory usage
     */
    private startMemoryMonitoring(): void {
        if (this.monitoringInterval) {
            return;
        }

        const interval = setInterval(() => {
            const usage = this.getMemoryUsage();
            
            if (usage.heapUsed > this.peakHeapUsage) {
                this.peakHeapUsage = usage.heapUsed;
            }

            this.logMemoryEvent(
                `Memory: ${usage.heapUsed}MB used, ${usage.heapTotal}MB total, ${usage.external}MB external, Peak: ${this.peakHeapUsage}MB, GC count: ${this.gcCount}`
            );
        }, 30000); // Log every 30 seconds

        (this as any).monitoringInterval = interval;
    }

    /**
     * Stop monitoring memory usage
     */
    private stopMemoryMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            (this as any).monitoringInterval = null;
        }
    }

    /**
     * Log memory events
     */
    private logMemoryEvent(message: string): void {
        if (this.config.enableMemoryLogging) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${message}`;
            this.outputChannel.appendLine(logMessage);
            console.log(`[MemoryManager] ${logMessage}`);
        }
    }

    /**
     * Get memory statistics
     */
    getMemoryStats(): {
        current: MemoryUsage;
        peak: number;
        gcCount: number;
        pools: {
            reviewComments: number;
            fileDiffs: number;
        };
    } {
        return {
            current: this.getMemoryUsage(),
            peak: this.peakHeapUsage,
            gcCount: this.gcCount,
            pools: {
                reviewComments: this.reviewCommentPool.size,
                fileDiffs: this.fileDiffPool.size
            }
        };
    }

    /**
     * Clean up large objects from memory
     */
    cleanupLargeObjects(...objects: any[]): void {
        for (const obj of objects) {
            if (obj && typeof obj === 'object') {
                // Clear arrays
                if (Array.isArray(obj)) {
                    obj.length = 0;
                } else {
                    // Clear object properties
                    Object.keys(obj).forEach(key => {
                        try {
                            delete obj[key];
                        } catch (error) {
                            // Ignore errors for non-deletable properties
                        }
                    });
                }
            }
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.stopMemoryMonitoring();
        this.clearPools();
        this.outputChannel.dispose();
    }
}

/**
 * Utility functions for memory management
 */
export class MemoryUtils {
    /**
     * Create a weak cache that allows garbage collection
     */
    static createWeakCache<K extends object, V>(): {
        set: (key: K, value: V) => void;
        get: (key: K) => V | undefined;
        has: (key: K) => boolean;
        delete: (key: K) => boolean;
        clear: () => void;
    } {
        const cache = new WeakMap<K, V>();

        return {
            set: (key: K, value: V) => cache.set(key, value),
            get: (key: K) => cache.get(key),
            has: (key: K) => cache.has(key),
            delete: (key: K) => cache.delete(key),
            clear: () => {
                // WeakMap doesn't have a clear method, but entries will be garbage collected
                // when keys are no longer referenced
            }
        };
    }

    /**
     * Process items in chunks to avoid memory buildup
     */
    static async processInChunks<T, R>(
        items: T[],
        processor: (chunk: T[]) => Promise<R[]>,
        chunkSize: number = 100
    ): Promise<R[]> {
        const results: R[] = [];
        
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const chunkResults = await processor(chunk);
            results.push(...chunkResults);
            
            // Allow garbage collection between chunks
            if (i + chunkSize < items.length) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        
        return results;
    }

    /**
     * Deep clone with memory optimization
     */
    static deepCloneOptimized<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime()) as unknown as T;
        }

        if (obj instanceof Array) {
            return obj.map(item => MemoryUtils.deepCloneOptimized(item)) as unknown as T;
        }

        if (typeof obj === 'object') {
            const cloned = {} as T;
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = MemoryUtils.deepCloneOptimized(obj[key]);
                }
            }
            return cloned;
        }

        return obj;
    }

    /**
     * Get object size estimation in bytes
     */
    static estimateObjectSize(obj: any): number {
        const seen = new WeakSet();
        
        function calculateSize(value: any): number {
            if (value === null || value === undefined) {
                return 0;
            }

            if (typeof value === 'boolean') {
                return 4;
            }

            if (typeof value === 'number') {
                return 8;
            }

            if (typeof value === 'string') {
                return value.length * 2; // 2 bytes per character in UTF-16
            }

            if (typeof value === 'object') {
                if (seen.has(value)) {
                    return 0; // Avoid circular references
                }
                seen.add(value);

                let size = 0;
                
                if (Array.isArray(value)) {
                    size += value.length * 8; // Array overhead
                    for (const item of value) {
                        size += calculateSize(item);
                    }
                } else {
                    size += Object.keys(value).length * 8; // Object overhead
                    for (const key in value) {
                        if (value.hasOwnProperty(key)) {
                            size += calculateSize(key);
                            size += calculateSize(value[key]);
                        }
                    }
                }
                
                return size;
            }

            return 0;
        }

        return calculateSize(obj);
    }
}