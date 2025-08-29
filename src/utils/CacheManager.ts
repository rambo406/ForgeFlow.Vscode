import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
    size: number;
}

/**
 * Cache key interface for pull request data
 */
export interface PullRequestCacheKey {
    organizationUrl: string;
    project: string;
    pullRequestId: number;
    iterationId?: number;
    filePath?: string;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
    totalEntries: number;
    totalSize: number;
    hitCount: number;
    missCount: number;
    evictionCount: number;
    hitRate: number;
}

/**
 * Multi-level cache implementation for pull request data
 */
export class PullRequestCache {
    private memoryCache = new Map<string, CacheEntry<any>>();
    private readonly maxMemorySize: number;
    private readonly defaultTtl: number;
    private readonly persistenceEnabled: boolean;
    private readonly persistencePath: string;
    private currentMemorySize = 0;
    
    // Statistics
    private stats = {
        hitCount: 0,
        missCount: 0,
        evictionCount: 0
    };

    constructor(
        maxMemorySizeMB: number = 50,
        defaultTtlMinutes: number = 60,
        persistenceEnabled: boolean = false,
        extensionContext?: vscode.ExtensionContext
    ) {
        this.maxMemorySize = maxMemorySizeMB * 1024 * 1024; // Convert to bytes
        this.defaultTtl = defaultTtlMinutes * 60 * 1000; // Convert to milliseconds
        this.persistenceEnabled = persistenceEnabled;
        
        if (persistenceEnabled && extensionContext) {
            this.persistencePath = path.join(extensionContext.globalStorageUri.fsPath, 'cache');
            this.ensureCacheDirectory();
            this.loadFromDisk();
        } else {
            this.persistencePath = '';
        }
    }

    /**
     * Generate cache key from pull request information
     */
    private generateKey(key: PullRequestCacheKey, suffix?: string): string {
        const baseKey = `${key.organizationUrl}:${key.project}:${key.pullRequestId}`;
        const parts = [baseKey];
        
        if (key.iterationId !== undefined) {
            parts.push(`iter:${key.iterationId}`);
        }
        
        if (key.filePath) {
            parts.push(`file:${key.filePath}`);
        }
        
        if (suffix) {
            parts.push(suffix);
        }
        
        return parts.join('|');
    }

    /**
     * Get data from cache
     */
    get<T>(key: PullRequestCacheKey, suffix?: string): T | undefined {
        const cacheKey = this.generateKey(key, suffix);
        const entry = this.memoryCache.get(cacheKey);
        
        if (!entry) {
            this.stats.missCount++;
            return undefined;
        }
        
        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.memoryCache.delete(cacheKey);
            this.currentMemorySize -= entry.size;
            this.stats.missCount++;
            return undefined;
        }
        
        // Update hit count
        entry.hits++;
        this.stats.hitCount++;
        
        return entry.data;
    }

    /**
     * Store data in cache
     */
    set<T>(key: PullRequestCacheKey, data: T, ttl?: number, suffix?: string): void {
        const cacheKey = this.generateKey(key, suffix);
        const entryTtl = ttl || this.defaultTtl;
        const dataSize = this.estimateDataSize(data);
        
        // Check if we need to evict entries to make room
        this.ensureCapacity(dataSize);
        
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: entryTtl,
            hits: 0,
            size: dataSize
        };
        
        // Remove existing entry if it exists
        const existingEntry = this.memoryCache.get(cacheKey);
        if (existingEntry) {
            this.currentMemorySize -= existingEntry.size;
        }
        
        this.memoryCache.set(cacheKey, entry);
        this.currentMemorySize += dataSize;
        
        // Persist to disk if enabled
        if (this.persistenceEnabled) {
            this.persistToDisk(cacheKey, entry);
        }
    }

    /**
     * Cache pull request metadata
     */
    cachePullRequest(key: PullRequestCacheKey, pullRequest: any, ttl?: number): void {
        this.set(key, pullRequest, ttl, 'pr');
    }

    /**
     * Get cached pull request metadata
     */
    getCachedPullRequest(key: PullRequestCacheKey): any | undefined {
        return this.get(key, 'pr');
    }

    /**
     * Cache file changes for a pull request
     */
    cacheFileChanges(key: PullRequestCacheKey, fileChanges: any[], ttl?: number): void {
        this.set(key, fileChanges, ttl, 'changes');
    }

    /**
     * Get cached file changes
     */
    getCachedFileChanges(key: PullRequestCacheKey): any[] | undefined {
        return this.get(key, 'changes');
    }

    /**
     * Cache analysis results for a file
     */
    cacheFileAnalysis(key: PullRequestCacheKey, analysis: any, ttl?: number): void {
        if (!key.filePath) {
            throw new Error('File path is required for file analysis caching');
        }
        this.set(key, analysis, ttl, 'analysis');
    }

    /**
     * Get cached file analysis
     */
    getCachedFileAnalysis(key: PullRequestCacheKey): any | undefined {
        if (!key.filePath) {
            return undefined;
        }
        return this.get(key, 'analysis');
    }

    /**
     * Cache diff data for a file
     */
    cacheFileDiff(key: PullRequestCacheKey, diff: any, ttl?: number): void {
        if (!key.filePath) {
            throw new Error('File path is required for file diff caching');
        }
        this.set(key, diff, ttl, 'diff');
    }

    /**
     * Get cached file diff
     */
    getCachedFileDiff(key: PullRequestCacheKey): any | undefined {
        if (!key.filePath) {
            return undefined;
        }
        return this.get(key, 'diff');
    }

    /**
     * Check if a cache entry exists and is valid
     */
    has(key: PullRequestCacheKey, suffix?: string): boolean {
        const cacheKey = this.generateKey(key, suffix);
        const entry = this.memoryCache.get(cacheKey);
        
        if (!entry) {
            return false;
        }
        
        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.memoryCache.delete(cacheKey);
            this.currentMemorySize -= entry.size;
            return false;
        }
        
        return true;
    }

    /**
     * Remove cache entry
     */
    delete(key: PullRequestCacheKey, suffix?: string): boolean {
        const cacheKey = this.generateKey(key, suffix);
        const entry = this.memoryCache.get(cacheKey);
        
        if (entry) {
            this.currentMemorySize -= entry.size;
            this.memoryCache.delete(cacheKey);
            
            // Remove from disk if persistence is enabled
            if (this.persistenceEnabled) {
                this.removeFromDisk(cacheKey);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.memoryCache.clear();
        this.currentMemorySize = 0;
        this.stats.hitCount = 0;
        this.stats.missCount = 0;
        this.stats.evictionCount = 0;
        
        if (this.persistenceEnabled) {
            this.clearDiskCache();
        }
    }

    /**
     * Clear expired entries
     */
    clearExpired(): number {
        let clearedCount = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.memoryCache.delete(key);
                this.currentMemorySize -= entry.size;
                clearedCount++;
                
                if (this.persistenceEnabled) {
                    this.removeFromDisk(key);
                }
            }
        }
        
        return clearedCount;
    }

    /**
     * Get cache statistics
     */
    getStatistics(): CacheStatistics {
        return {
            totalEntries: this.memoryCache.size,
            totalSize: this.currentMemorySize,
            hitCount: this.stats.hitCount,
            missCount: this.stats.missCount,
            evictionCount: this.stats.evictionCount,
            hitRate: this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) || 0
        };
    }

    /**
     * Ensure cache directory exists
     */
    private ensureCacheDirectory(): void {
        if (this.persistencePath && !fs.existsSync(this.persistencePath)) {
            fs.mkdirSync(this.persistencePath, { recursive: true });
        }
    }

    /**
     * Ensure sufficient capacity by evicting entries if needed
     */
    private ensureCapacity(requiredSize: number): void {
        // If the required size alone exceeds max size, don't cache
        if (requiredSize > this.maxMemorySize) {
            return;
        }
        
        // Evict entries until we have enough space
        while (this.currentMemorySize + requiredSize > this.maxMemorySize) {
            const evicted = this.evictLeastUsed();
            if (!evicted) {
                break; // No more entries to evict
            }
        }
    }

    /**
     * Evict the least recently used entry
     */
    private evictLeastUsed(): boolean {
        let oldestEntry: { key: string; entry: CacheEntry<any> } | null = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.memoryCache.entries()) {
            // Prioritize by least hits, then by oldest timestamp
            const score = entry.hits * 1000 + (Date.now() - entry.timestamp);
            if (score < oldestTime) {
                oldestTime = score;
                oldestEntry = { key, entry };
            }
        }
        
        if (oldestEntry) {
            this.memoryCache.delete(oldestEntry.key);
            this.currentMemorySize -= oldestEntry.entry.size;
            this.stats.evictionCount++;
            
            if (this.persistenceEnabled) {
                this.removeFromDisk(oldestEntry.key);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Estimate the size of data in bytes
     */
    private estimateDataSize(data: any): number {
        try {
            return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
        } catch (error) {
            return 1024; // Default fallback size
        }
    }

    /**
     * Load cache from disk
     */
    private loadFromDisk(): void {
        if (!this.persistencePath || !fs.existsSync(this.persistencePath)) {
            return;
        }
        
        try {
            const files = fs.readdirSync(this.persistencePath);
            
            for (const file of files) {
                if (file.endsWith('.cache')) {
                    const filePath = path.join(this.persistencePath, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const entry = JSON.parse(content) as CacheEntry<any>;
                    const key = file.replace('.cache', '');
                    
                    // Check if entry is still valid
                    if (Date.now() - entry.timestamp <= entry.ttl) {
                        this.memoryCache.set(key, entry);
                        this.currentMemorySize += entry.size;
                    } else {
                        // Remove expired entry from disk
                        fs.unlinkSync(filePath);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load cache from disk:', error);
        }
    }

    /**
     * Persist cache entry to disk
     */
    private persistToDisk(key: string, entry: CacheEntry<any>): void {
        if (!this.persistencePath) {
            return;
        }
        
        try {
            const fileName = key.replace(/[^a-zA-Z0-9]/g, '_') + '.cache';
            const filePath = path.join(this.persistencePath, fileName);
            fs.writeFileSync(filePath, JSON.stringify(entry));
        } catch (error) {
            console.error('Failed to persist cache entry to disk:', error);
        }
    }

    /**
     * Remove cache entry from disk
     */
    private removeFromDisk(key: string): void {
        if (!this.persistencePath) {
            return;
        }
        
        try {
            const fileName = key.replace(/[^a-zA-Z0-9]/g, '_') + '.cache';
            const filePath = path.join(this.persistencePath, fileName);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Failed to remove cache entry from disk:', error);
        }
    }

    /**
     * Clear all cache files from disk
     */
    private clearDiskCache(): void {
        if (!this.persistencePath || !fs.existsSync(this.persistencePath)) {
            return;
        }
        
        try {
            const files = fs.readdirSync(this.persistencePath);
            
            for (const file of files) {
                if (file.endsWith('.cache')) {
                    fs.unlinkSync(path.join(this.persistencePath, file));
                }
            }
        } catch (error) {
            console.error('Failed to clear disk cache:', error);
        }
    }

    /**
     * Optimize cache by removing expired and least used entries
     */
    optimize(): { cleared: number; evicted: number } {
        const clearedExpired = this.clearExpired();
        let evictedCount = 0;
        
        // If still over 80% capacity, evict least used entries
        while (this.currentMemorySize > this.maxMemorySize * 0.8) {
            if (!this.evictLeastUsed()) {
                break;
            }
            evictedCount++;
        }
        
        return { cleared: clearedExpired, evicted: evictedCount };
    }

    /**
     * Export cache statistics and top entries
     */
    exportCacheReport(): {
        statistics: CacheStatistics;
        topEntries: Array<{ key: string; hits: number; size: number; age: number }>;
    } {
        const statistics = this.getStatistics();
        const topEntries: Array<{ key: string; hits: number; size: number; age: number }> = [];
        
        for (const [key, entry] of this.memoryCache.entries()) {
            topEntries.push({
                key,
                hits: entry.hits,
                size: entry.size,
                age: Date.now() - entry.timestamp
            });
        }
        
        // Sort by hits descending
        topEntries.sort((a, b) => b.hits - a.hits);
        
        return {
            statistics,
            topEntries: topEntries.slice(0, 20) // Top 20 entries
        };
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        if (this.persistenceEnabled) {
            // Save all current entries to disk before disposing
            for (const [key, entry] of this.memoryCache.entries()) {
                this.persistToDisk(key, entry);
            }
        }
        
        this.clear();
    }
}