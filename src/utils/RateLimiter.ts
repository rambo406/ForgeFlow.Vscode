import * as vscode from 'vscode';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
    requestsPerSecond: number;
    burstLimit: number;
    cooldownPeriod: number;
    maxQueueSize: number;
}

/**
 * Request metadata
 */
interface RequestInfo {
    timestamp: number;
    id: string;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    operation: () => Promise<any>;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
    requestsProcessed: number;
    requestsQueued: number;
    requestsRejected: number;
    averageWaitTime: number;
    currentQueueSize: number;
    isThrottling: boolean;
}

/**
 * Token bucket rate limiter implementation
 */
export class TokenBucketRateLimiter {
    protected readonly config: RateLimiterConfig;
    private tokens: number;
    private lastRefill: number;
    private readonly requestQueue: RequestInfo[] = [];
    private isProcessing = false;
    private nextRequestId = 0;
    
    // Statistics
    private stats = {
        requestsProcessed: 0,
        requestsQueued: 0,
        requestsRejected: 0,
        totalWaitTime: 0
    };

    constructor(config: RateLimiterConfig) {
        this.config = config;
        this.tokens = config.burstLimit;
        this.lastRefill = Date.now();
        
        // Start the token refill process
        this.startTokenRefill();
    }

    /**
     * Execute an operation with rate limiting
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const requestInfo: RequestInfo = {
                timestamp: Date.now(),
                id: (this.nextRequestId++).toString(),
                resolve,
                reject,
                operation
            };

            // Check if queue is full
            if (this.requestQueue.length >= this.config.maxQueueSize) {
                this.stats.requestsRejected++;
                reject(new Error('Rate limiter queue is full. Please try again later.'));
                return;
            }

            this.requestQueue.push(requestInfo);
            this.stats.requestsQueued++;
            
            // Start processing if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process the request queue
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            // Wait for available token
            await this.waitForToken();

            const request = this.requestQueue.shift();
            if (!request) {
                break;
            }

            try {
                // Consume a token
                this.tokens--;
                
                // Calculate wait time
                const waitTime = Date.now() - request.timestamp;
                this.stats.totalWaitTime += waitTime;
                
                // Execute the operation
                const result = await request.operation();
                this.stats.requestsProcessed++;
                
                request.resolve(result);
            } catch (error) {
                request.reject(error as Error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Wait for an available token
     */
    private async waitForToken(): Promise<void> {
        while (this.tokens <= 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.refillTokens();
        }
    }

    /**
     * Refill tokens based on time elapsed
     */
    private refillTokens(): void {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = Math.floor(timePassed / 1000 * this.config.requestsPerSecond);
        
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.config.burstLimit, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }

    /**
     * Start automatic token refill
     */
    private startTokenRefill(): void {
        setInterval(() => {
            this.refillTokens();
            
            // Process queue if there are pending requests
            if (this.requestQueue.length > 0 && !this.isProcessing) {
                this.processQueue();
            }
        }, 1000);
    }

    /**
     * Get current rate limiter statistics
     */
    getStats(): RateLimiterStats {
        return {
            requestsProcessed: this.stats.requestsProcessed,
            requestsQueued: this.stats.requestsQueued,
            requestsRejected: this.stats.requestsRejected,
            averageWaitTime: this.stats.requestsProcessed > 0 ? 
                this.stats.totalWaitTime / this.stats.requestsProcessed : 0,
            currentQueueSize: this.requestQueue.length,
            isThrottling: this.tokens <= 0 || this.requestQueue.length > 0
        };
    }

    /**
     * Clear all pending requests
     */
    clearQueue(): void {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                request.reject(new Error('Request cancelled due to queue clear'));
            }
        }
    }

    /**
     * Get remaining tokens
     */
    getRemainingTokens(): number {
        this.refillTokens();
        return this.tokens;
    }

    /**
     * Check if rate limiter is currently throttling
     */
    isThrottling(): boolean {
        return this.tokens <= 0 || this.requestQueue.length > 0;
    }
}

/**
 * Adaptive rate limiter that adjusts based on response patterns
 */
export class AdaptiveRateLimiter extends TokenBucketRateLimiter {
    private errorCount = 0;
    private successCount = 0;
    private lastAdjustment = Date.now();
    private readonly adjustmentInterval = 60000; // 1 minute
    private readonly originalConfig: RateLimiterConfig;

    constructor(config: RateLimiterConfig) {
        super(config);
        this.originalConfig = { ...config };
    }

    /**
     * Execute operation with adaptive rate limiting
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        try {
            const result = await super.execute(operation);
            this.successCount++;
            this.adjustRateIfNeeded();
            return result;
        } catch (error) {
            this.errorCount++;
            this.adjustRateIfNeeded();
            throw error;
        }
    }

    /**
     * Adjust rate based on success/error patterns
     */
    private adjustRateIfNeeded(): void {
        const now = Date.now();
        
        if (now - this.lastAdjustment < this.adjustmentInterval) {
            return;
        }

        const totalRequests = this.successCount + this.errorCount;
        if (totalRequests < 10) {
            return; // Not enough data
        }

        const errorRate = this.errorCount / totalRequests;
        
        // Adjust rate based on error rate
        if (errorRate > 0.2) { // High error rate, slow down
            this.config.requestsPerSecond = Math.max(1, this.config.requestsPerSecond * 0.8);
            this.config.burstLimit = Math.max(1, this.config.burstLimit * 0.8);
        } else if (errorRate < 0.05 && this.config.requestsPerSecond < this.originalConfig.requestsPerSecond) {
            // Low error rate, can speed up
            this.config.requestsPerSecond = Math.min(
                this.originalConfig.requestsPerSecond,
                this.config.requestsPerSecond * 1.1
            );
            this.config.burstLimit = Math.min(
                this.originalConfig.burstLimit,
                this.config.burstLimit * 1.1
            );
        }

        // Reset counters
        this.errorCount = 0;
        this.successCount = 0;
        this.lastAdjustment = now;
    }
}

/**
 * Multi-tier rate limiter for different API endpoints
 */
export class MultiTierRateLimiter {
    private readonly limiters = new Map<string, TokenBucketRateLimiter>();
    private readonly configs = new Map<string, RateLimiterConfig>();

    /**
     * Add a rate limiter for a specific tier/endpoint
     */
    addTier(tierName: string, config: RateLimiterConfig): void {
        this.configs.set(tierName, config);
        this.limiters.set(tierName, new TokenBucketRateLimiter(config));
    }

    /**
     * Execute operation with tier-specific rate limiting
     */
    async execute<T>(tierName: string, operation: () => Promise<T>): Promise<T> {
        const limiter = this.limiters.get(tierName);
        
        if (!limiter) {
            throw new Error(`Rate limiter tier '${tierName}' not found`);
        }

        return await limiter.execute(operation);
    }

    /**
     * Get statistics for all tiers
     */
    getAllStats(): Map<string, RateLimiterStats> {
        const stats = new Map<string, RateLimiterStats>();
        
        for (const [tierName, limiter] of this.limiters) {
            stats.set(tierName, limiter.getStats());
        }
        
        return stats;
    }

    /**
     * Get statistics for a specific tier
     */
    getTierStats(tierName: string): RateLimiterStats | undefined {
        const limiter = this.limiters.get(tierName);
        return limiter?.getStats();
    }

    /**
     * Clear queue for all tiers
     */
    clearAllQueues(): void {
        for (const limiter of this.limiters.values()) {
            limiter.clearQueue();
        }
    }

    /**
     * Check if any tier is currently throttling
     */
    isAnyTierThrottling(): boolean {
        for (const limiter of this.limiters.values()) {
            if (limiter.isThrottling()) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Global rate limiter manager for the extension
 */
export class RateLimiterManager {
    private static instance: RateLimiterManager;
    private azureDevOpsLimiter: AdaptiveRateLimiter;
    private languageModelLimiter: MultiTierRateLimiter;
    private readonly outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Azure DevOps PR Reviewer - Rate Limiter');
        
        // Initialize Azure DevOps rate limiter
        this.azureDevOpsLimiter = new AdaptiveRateLimiter({
            requestsPerSecond: 10,
            burstLimit: 20,
            cooldownPeriod: 1000,
            maxQueueSize: 50
        });

        // Initialize Language Model rate limiter with multiple tiers
        this.languageModelLimiter = new MultiTierRateLimiter();
        
        // Add different tiers for language model usage
        this.languageModelLimiter.addTier('analysis', {
            requestsPerSecond: 2,
            burstLimit: 5,
            cooldownPeriod: 2000,
            maxQueueSize: 20
        });
        
        this.languageModelLimiter.addTier('batch', {
            requestsPerSecond: 1,
            burstLimit: 3,
            cooldownPeriod: 3000,
            maxQueueSize: 10
        });
    }

    public static getInstance(): RateLimiterManager {
        if (!RateLimiterManager.instance) {
            RateLimiterManager.instance = new RateLimiterManager();
        }
        return RateLimiterManager.instance;
    }

    /**
     * Execute Azure DevOps API call with rate limiting
     */
    async executeAzureDevOpsRequest<T>(operation: () => Promise<T>): Promise<T> {
        return await this.azureDevOpsLimiter.execute(async () => {
            this.logRequest('Azure DevOps API');
            return await operation();
        });
    }

    /**
     * Execute Language Model request with rate limiting
     */
    async executeLanguageModelRequest<T>(operation: () => Promise<T>, tier: string = 'analysis'): Promise<T> {
        return await this.languageModelLimiter.execute(tier, async () => {
            this.logRequest(`Language Model (${tier})`);
            return await operation();
        });
    }

    /**
     * Update rate limiter configurations
     */
    updateConfigurations(configs: {
        azureDevOps?: Partial<RateLimiterConfig>;
        languageModel?: { [tier: string]: Partial<RateLimiterConfig> };
    }): void {
        if (configs.azureDevOps) {
            // Create new limiter with updated config
            const currentConfig = this.azureDevOpsLimiter['config'];
            const newConfig = { ...currentConfig, ...configs.azureDevOps };
            this.azureDevOpsLimiter = new AdaptiveRateLimiter(newConfig);
        }

        if (configs.languageModel) {
            for (const [tier, config] of Object.entries(configs.languageModel)) {
                const currentConfig = this.languageModelLimiter['configs'].get(tier);
                if (currentConfig) {
                    const newConfig = { ...currentConfig, ...config };
                    this.languageModelLimiter.addTier(tier, newConfig);
                }
            }
        }
    }

    /**
     * Get comprehensive rate limiter statistics
     */
    getComprehensiveStats(): {
        azureDevOps: RateLimiterStats;
        languageModel: Map<string, RateLimiterStats>;
        overall: {
            totalRequestsProcessed: number;
            totalRequestsQueued: number;
            totalRequestsRejected: number;
            isAnyLimiterThrottling: boolean;
        };
    } {
        const azureStats = this.azureDevOpsLimiter.getStats();
        const lmStats = this.languageModelLimiter.getAllStats();
        
        let totalProcessed = azureStats.requestsProcessed;
        let totalQueued = azureStats.requestsQueued;
        let totalRejected = azureStats.requestsRejected;
        
        for (const stats of lmStats.values()) {
            totalProcessed += stats.requestsProcessed;
            totalQueued += stats.requestsQueued;
            totalRejected += stats.requestsRejected;
        }
        
        return {
            azureDevOps: azureStats,
            languageModel: lmStats,
            overall: {
                totalRequestsProcessed: totalProcessed,
                totalRequestsQueued: totalQueued,
                totalRequestsRejected: totalRejected,
                isAnyLimiterThrottling: this.azureDevOpsLimiter.isThrottling() || 
                                       this.languageModelLimiter.isAnyTierThrottling()
            }
        };
    }

    /**
     * Log rate limiter activity
     */
    private logRequest(type: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] Rate limited request: ${type}`);
    }

    /**
     * Clear all rate limiter queues
     */
    clearAllQueues(): void {
        this.azureDevOpsLimiter.clearQueue();
        this.languageModelLimiter.clearAllQueues();
        this.outputChannel.appendLine('All rate limiter queues cleared');
    }

    /**
     * Check if the system is currently under heavy load
     */
    isUnderHeavyLoad(): boolean {
        const stats = this.getComprehensiveStats();
        
        // Consider under heavy load if:
        // - Any limiter is throttling
        // - High number of queued requests
        // - High rejection rate
        return stats.overall.isAnyLimiterThrottling ||
               stats.overall.totalRequestsQueued > 20 ||
               (stats.overall.totalRequestsRejected / 
                Math.max(1, stats.overall.totalRequestsProcessed + stats.overall.totalRequestsRejected)) > 0.1;
    }

    /**
     * Get performance recommendations based on current load
     */
    getPerformanceRecommendations(): string[] {
        const recommendations: string[] = [];
        const stats = this.getComprehensiveStats();
        
        if (this.isUnderHeavyLoad()) {
            recommendations.push('System is under heavy load. Consider:');
            
            if (stats.azureDevOps.isThrottling) {
                recommendations.push('- Reducing Azure DevOps API request frequency');
                recommendations.push('- Increasing batch processing delays');
            }
            
            for (const [tier, tierStats] of stats.languageModel) {
                if (tierStats.isThrottling) {
                    recommendations.push(`- Reducing Language Model requests for ${tier} tier`);
                }
            }
            
            if (stats.overall.totalRequestsQueued > 10) {
                recommendations.push('- Processing smaller batches of files');
                recommendations.push('- Enabling caching to reduce duplicate requests');
            }
        } else if (stats.overall.totalRequestsProcessed > 100) {
            recommendations.push('System is performing well. You may be able to:');
            recommendations.push('- Increase batch sizes for faster processing');
            recommendations.push('- Reduce delays between API calls');
        }
        
        return recommendations;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.clearAllQueues();
        this.outputChannel.dispose();
    }
}