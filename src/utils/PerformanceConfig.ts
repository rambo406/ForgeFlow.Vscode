import * as vscode from 'vscode';

/**
 * Performance configuration interface
 */
export interface PerformanceConfig {
    // Batch processing settings
    maxFilesPerBatch: number;
    maxLinesPerFile: number;
    batchProcessingDelay: number;
    
    // API rate limiting
    azureDevOpsRateLimit: {
        requestsPerSecond: number;
        burstLimit: number;
        cooldownPeriod: number;
    };
    
    languageModelRateLimit: {
        requestsPerMinute: number;
        concurrentRequests: number;
        retryDelay: number;
    };
    
    // Memory management
    memoryLimits: {
        maxHeapUsageMB: number;
        gcThresholdMB: number;
        warningThresholdMB: number;
    };
    
    // Caching settings
    caching: {
        enabled: boolean;
        maxCacheSize: number;
        ttlMinutes: number;
        enablePersistence: boolean;
    };
    
    // Processing limits
    processingLimits: {
        maxFileSize: number; // in bytes
        maxPullRequestFiles: number;
        timeoutSeconds: number;
    };
}

/**
 * Default performance configuration
 */
const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
    maxFilesPerBatch: 5,
    maxLinesPerFile: 1000,
    batchProcessingDelay: 100,
    
    azureDevOpsRateLimit: {
        requestsPerSecond: 10,
        burstLimit: 20,
        cooldownPeriod: 1000
    },
    
    languageModelRateLimit: {
        requestsPerMinute: 50,
        concurrentRequests: 3,
        retryDelay: 2000
    },
    
    memoryLimits: {
        maxHeapUsageMB: 500,
        gcThresholdMB: 300,
        warningThresholdMB: 400
    },
    
    caching: {
        enabled: true,
        maxCacheSize: 100,
        ttlMinutes: 60,
        enablePersistence: false
    },
    
    processingLimits: {
        maxFileSize: 1024 * 1024, // 1MB
        maxPullRequestFiles: 100,
        timeoutSeconds: 300 // 5 minutes
    }
};

/**
 * Performance configuration manager
 */
export class PerformanceConfigManager {
    private static instance: PerformanceConfigManager;
    private config: PerformanceConfig;
    private readonly extensionContext: vscode.ExtensionContext;

    private constructor(extensionContext: vscode.ExtensionContext) {
        this.extensionContext = extensionContext;
        this.config = this.loadConfiguration();
    }

    public static getInstance(extensionContext?: vscode.ExtensionContext): PerformanceConfigManager {
        if (!PerformanceConfigManager.instance) {
            if (!extensionContext) {
                throw new Error('Extension context is required for first initialization');
            }
            PerformanceConfigManager.instance = new PerformanceConfigManager(extensionContext);
        }
        return PerformanceConfigManager.instance;
    }

    /**
     * Load configuration from VS Code settings
     */
    private loadConfiguration(): PerformanceConfig {
        const config = vscode.workspace.getConfiguration('azdoPrReviewer.performance');
        
        return {
            maxFilesPerBatch: config.get('maxFilesPerBatch', DEFAULT_PERFORMANCE_CONFIG.maxFilesPerBatch),
            maxLinesPerFile: config.get('maxLinesPerFile', DEFAULT_PERFORMANCE_CONFIG.maxLinesPerFile),
            batchProcessingDelay: config.get('batchProcessingDelay', DEFAULT_PERFORMANCE_CONFIG.batchProcessingDelay),
            
            azureDevOpsRateLimit: {
                requestsPerSecond: config.get('azureDevOps.requestsPerSecond', DEFAULT_PERFORMANCE_CONFIG.azureDevOpsRateLimit.requestsPerSecond),
                burstLimit: config.get('azureDevOps.burstLimit', DEFAULT_PERFORMANCE_CONFIG.azureDevOpsRateLimit.burstLimit),
                cooldownPeriod: config.get('azureDevOps.cooldownPeriod', DEFAULT_PERFORMANCE_CONFIG.azureDevOpsRateLimit.cooldownPeriod)
            },
            
            languageModelRateLimit: {
                requestsPerMinute: config.get('languageModel.requestsPerMinute', DEFAULT_PERFORMANCE_CONFIG.languageModelRateLimit.requestsPerMinute),
                concurrentRequests: config.get('languageModel.concurrentRequests', DEFAULT_PERFORMANCE_CONFIG.languageModelRateLimit.concurrentRequests),
                retryDelay: config.get('languageModel.retryDelay', DEFAULT_PERFORMANCE_CONFIG.languageModelRateLimit.retryDelay)
            },
            
            memoryLimits: {
                maxHeapUsageMB: config.get('memory.maxHeapUsageMB', DEFAULT_PERFORMANCE_CONFIG.memoryLimits.maxHeapUsageMB),
                gcThresholdMB: config.get('memory.gcThresholdMB', DEFAULT_PERFORMANCE_CONFIG.memoryLimits.gcThresholdMB),
                warningThresholdMB: config.get('memory.warningThresholdMB', DEFAULT_PERFORMANCE_CONFIG.memoryLimits.warningThresholdMB)
            },
            
            caching: {
                enabled: config.get('caching.enabled', DEFAULT_PERFORMANCE_CONFIG.caching.enabled),
                maxCacheSize: config.get('caching.maxCacheSize', DEFAULT_PERFORMANCE_CONFIG.caching.maxCacheSize),
                ttlMinutes: config.get('caching.ttlMinutes', DEFAULT_PERFORMANCE_CONFIG.caching.ttlMinutes),
                enablePersistence: config.get('caching.enablePersistence', DEFAULT_PERFORMANCE_CONFIG.caching.enablePersistence)
            },
            
            processingLimits: {
                maxFileSize: config.get('limits.maxFileSize', DEFAULT_PERFORMANCE_CONFIG.processingLimits.maxFileSize),
                maxPullRequestFiles: config.get('limits.maxPullRequestFiles', DEFAULT_PERFORMANCE_CONFIG.processingLimits.maxPullRequestFiles),
                timeoutSeconds: config.get('limits.timeoutSeconds', DEFAULT_PERFORMANCE_CONFIG.processingLimits.timeoutSeconds)
            }
        };
    }

    /**
     * Get current performance configuration
     */
    getConfig(): PerformanceConfig {
        return { ...this.config };
    }

    /**
     * Update configuration and persist to VS Code settings
     */
    async updateConfig(updates: Partial<PerformanceConfig>): Promise<void> {
        this.config = { ...this.config, ...updates };
        
        const config = vscode.workspace.getConfiguration('azdoPrReviewer.performance');
        
        // Update individual settings
        if (updates.maxFilesPerBatch !== undefined) {
            await config.update('maxFilesPerBatch', updates.maxFilesPerBatch, vscode.ConfigurationTarget.Global);
        }
        
        if (updates.maxLinesPerFile !== undefined) {
            await config.update('maxLinesPerFile', updates.maxLinesPerFile, vscode.ConfigurationTarget.Global);
        }
        
        if (updates.batchProcessingDelay !== undefined) {
            await config.update('batchProcessingDelay', updates.batchProcessingDelay, vscode.ConfigurationTarget.Global);
        }
        
        // Update nested configurations
        if (updates.azureDevOpsRateLimit) {
            const azureConfig = updates.azureDevOpsRateLimit;
            if (azureConfig.requestsPerSecond !== undefined) {
                await config.update('azureDevOps.requestsPerSecond', azureConfig.requestsPerSecond, vscode.ConfigurationTarget.Global);
            }
            if (azureConfig.burstLimit !== undefined) {
                await config.update('azureDevOps.burstLimit', azureConfig.burstLimit, vscode.ConfigurationTarget.Global);
            }
            if (azureConfig.cooldownPeriod !== undefined) {
                await config.update('azureDevOps.cooldownPeriod', azureConfig.cooldownPeriod, vscode.ConfigurationTarget.Global);
            }
        }
        
        // Similar updates for other nested configurations...
    }

    /**
     * Reset to default configuration
     */
    async resetToDefaults(): Promise<void> {
        this.config = { ...DEFAULT_PERFORMANCE_CONFIG };
        await this.updateConfig(this.config);
    }

    /**
     * Get batch size based on current configuration and memory usage
     */
    getDynamicBatchSize(memoryUsageMB: number, totalFiles: number): number {
        const baseSize = this.config.maxFilesPerBatch;
        
        // Reduce batch size if memory usage is high
        if (memoryUsageMB > this.config.memoryLimits.warningThresholdMB) {
            return Math.max(1, Math.floor(baseSize * 0.5));
        }
        
        if (memoryUsageMB > this.config.memoryLimits.gcThresholdMB) {
            return Math.max(1, Math.floor(baseSize * 0.7));
        }
        
        // Adjust based on total file count
        if (totalFiles > this.config.processingLimits.maxPullRequestFiles) {
            return Math.max(1, Math.floor(baseSize * 0.6));
        }
        
        return baseSize;
    }

    /**
     * Check if file should be processed based on size limits
     */
    shouldProcessFile(fileSizeBytes: number, lineCount: number): boolean {
        return fileSizeBytes <= this.config.processingLimits.maxFileSize &&
               lineCount <= this.config.maxLinesPerFile;
    }

    /**
     * Get processing delay based on current load
     */
    getProcessingDelay(queueLength: number): number {
        const baseDelay = this.config.batchProcessingDelay;
        
        // Increase delay if queue is long
        if (queueLength > 50) {
            return baseDelay * 3;
        }
        
        if (queueLength > 20) {
            return baseDelay * 2;
        }
        
        if (queueLength > 10) {
            return Math.floor(baseDelay * 1.5);
        }
        
        return baseDelay;
    }

    /**
     * Listen for configuration changes
     */
    onConfigurationChanged(callback: (newConfig: PerformanceConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('azdoPrReviewer.performance')) {
                this.config = this.loadConfiguration();
                callback(this.config);
            }
        });
    }

    /**
     * Get performance recommendations based on usage patterns
     */
    getPerformanceRecommendations(stats: {
        averageProcessingTime: number;
        memoryPeakUsage: number;
        errorRate: number;
        fileCount: number;
    }): string[] {
        const recommendations: string[] = [];
        
        // Memory recommendations
        if (stats.memoryPeakUsage > this.config.memoryLimits.warningThresholdMB) {
            recommendations.push('Consider reducing batch size to manage memory usage');
            recommendations.push('Enable garbage collection in memory settings');
        }
        
        // Performance recommendations
        if (stats.averageProcessingTime > 30000) { // 30 seconds
            recommendations.push('Consider increasing batch processing delay to reduce API pressure');
            recommendations.push('Try reducing concurrent language model requests');
        }
        
        // Error rate recommendations
        if (stats.errorRate > 0.1) { // 10% error rate
            recommendations.push('Consider increasing retry delays to handle rate limiting');
            recommendations.push('Check network connectivity and API quotas');
        }
        
        // File count recommendations
        if (stats.fileCount > this.config.processingLimits.maxPullRequestFiles) {
            recommendations.push('Consider processing files in smaller chunks for large PRs');
            recommendations.push('Enable caching to avoid reprocessing unchanged files');
        }
        
        return recommendations;
    }

    /**
     * Get optimal settings for current environment
     */
    getOptimalSettings(environment: {
        availableMemoryMB: number;
        networkLatency: number;
        apiQuotaRemaining: number;
    }): Partial<PerformanceConfig> {
        const optimal: Partial<PerformanceConfig> = {};
        
        // Adjust batch size based on available memory
        if (environment.availableMemoryMB < 200) {
            optimal.maxFilesPerBatch = 2;
            optimal.memoryLimits = {
                maxHeapUsageMB: 150,
                gcThresholdMB: 100,
                warningThresholdMB: 120
            };
        } else if (environment.availableMemoryMB > 1000) {
            optimal.maxFilesPerBatch = 10;
        }
        
        // Adjust delays based on network latency
        if (environment.networkLatency > 500) { // High latency
            optimal.batchProcessingDelay = 500;
            optimal.azureDevOpsRateLimit = {
                requestsPerSecond: 5,
                burstLimit: 10,
                cooldownPeriod: 2000
            };
        } else if (environment.networkLatency < 100) { // Low latency
            optimal.batchProcessingDelay = 50;
            optimal.azureDevOpsRateLimit = {
                requestsPerSecond: 15,
                burstLimit: 30,
                cooldownPeriod: 500
            };
        }
        
        // Adjust rate limits based on API quota
        if (environment.apiQuotaRemaining < 1000) {
            optimal.languageModelRateLimit = {
                requestsPerMinute: 20,
                concurrentRequests: 1,
                retryDelay: 5000
            };
        }
        
        return optimal;
    }

    /**
     * Export configuration to JSON
     */
    exportConfig(): string {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    async importConfig(configJson: string): Promise<void> {
        try {
            const importedConfig = JSON.parse(configJson) as PerformanceConfig;
            await this.updateConfig(importedConfig);
        } catch (error) {
            throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}