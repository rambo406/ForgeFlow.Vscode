import * as vscode from 'vscode';
import { ConfigurationManager } from '../services/ConfigurationManager';

/**
 * Telemetry event data
 */
export interface TelemetryEvent {
    eventName: string;
    properties?: Record<string, string>;
    measurements?: Record<string, number>;
    timestamp?: Date;
}

/**
 * Usage statistics for telemetry
 */
export interface UsageStatistics {
    pullRequestsAnalyzed: number;
    commentsGenerated: number;
    commentsPosted: number;
    errorsEncountered: number;
    averageAnalysisTime: number;
    modelUsage: Record<string, number>;
    lastActiveDate: Date;
}

/**
 * Basic telemetry service for the extension
 * Collects anonymized usage data to improve the extension
 */
export class TelemetryService {
    private configManager: ConfigurationManager;
    private usageStats: UsageStatistics;
    private eventQueue: TelemetryEvent[] = [];
    private readonly MAX_QUEUE_SIZE = 100;

    constructor(
        private context: vscode.ExtensionContext,
        configManager: ConfigurationManager
    ) {
        this.configManager = configManager;
        this.usageStats = this.loadUsageStatistics();
        
        // Periodically flush events (every 5 minutes)
        setInterval(() => this.flushEvents(), 5 * 60 * 1000);
    }

    /**
     * Track a telemetry event
     */
    trackEvent(eventName: string, properties?: Record<string, string>, measurements?: Record<string, number>): void {
        if (!this.configManager.isTelemetryEnabled()) {
            return;
        }

        const event: TelemetryEvent = {
            eventName,
            properties: this.sanitizeProperties(properties),
            measurements,
            timestamp: new Date()
        };

        this.eventQueue.push(event);
        
        // Flush if queue is getting full
        if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
            this.flushEvents();
        }
    }

    /**
     * Track pull request analysis completion
     */
    trackPullRequestAnalysis(
        filesAnalyzed: number,
        commentsGenerated: number,
        analysisTimeMs: number,
        modelUsed?: string,
        success: boolean = true
    ): void {
        this.trackEvent('pr_analysis_completed', {
            model_used: modelUsed || 'unknown',
            success: success.toString(),
            files_count: filesAnalyzed.toString(),
            comments_count: commentsGenerated.toString()
        }, {
            analysis_time_ms: analysisTimeMs,
            files_analyzed: filesAnalyzed,
            comments_generated: commentsGenerated
        });

        // Update usage statistics
        this.usageStats.pullRequestsAnalyzed++;
        this.usageStats.commentsGenerated += commentsGenerated;
        this.usageStats.lastActiveDate = new Date();
        
        if (modelUsed) {
            this.usageStats.modelUsage[modelUsed] = (this.usageStats.modelUsage[modelUsed] || 0) + 1;
        }

        // Update average analysis time
        this.updateAverageAnalysisTime(analysisTimeMs);
        
        this.saveUsageStatistics();
    }

    /**
     * Track comment posting to Azure DevOps
     */
    trackCommentsPosted(commentsCount: number, postingTimeMs: number, success: boolean = true): void {
        this.trackEvent('comments_posted', {
            success: success.toString(),
            comments_count: commentsCount.toString()
        }, {
            posting_time_ms: postingTimeMs,
            comments_posted: commentsCount
        });

        if (success) {
            this.usageStats.commentsPosted += commentsCount;
            this.saveUsageStatistics();
        }
    }

    /**
     * Track configuration events
     */
    trackConfiguration(action: string, success: boolean = true): void {
        this.trackEvent('configuration_action', {
            action,
            success: success.toString()
        });
    }

    /**
     * Track errors for debugging and improvement
     */
    trackError(errorType: string, errorMessage?: string, context?: string): void {
        this.trackEvent('error_occurred', {
            error_type: errorType,
            error_message: this.sanitizeErrorMessage(errorMessage),
            context: context || 'unknown'
        });

        this.usageStats.errorsEncountered++;
        this.saveUsageStatistics();
    }

    /**
     * Track extension activation and deactivation
     */
    trackExtensionLifecycle(event: 'activated' | 'deactivated'): void {
        this.trackEvent('extension_lifecycle', {
            event,
            version: this.getExtensionVersion()
        });
    }

    /**
     * Track model availability and usage
     */
    trackModelUsage(modelId: string, available: boolean, used: boolean = false): void {
        this.trackEvent('model_usage', {
            model_id: modelId,
            available: available.toString(),
            used: used.toString()
        });
    }

    /**
     * Get usage statistics for debugging/support
     */
    getUsageStatistics(): UsageStatistics {
        return { ...this.usageStats };
    }

    /**
     * Reset usage statistics
     */
    resetUsageStatistics(): void {
        this.usageStats = {
            pullRequestsAnalyzed: 0,
            commentsGenerated: 0,
            commentsPosted: 0,
            errorsEncountered: 0,
            averageAnalysisTime: 0,
            modelUsage: {},
            lastActiveDate: new Date()
        };
        this.saveUsageStatistics();
    }

    /**
     * Flush queued events (in a real implementation, these would be sent to a telemetry service)
     */
    private flushEvents(): void {
        if (this.eventQueue.length === 0 || !this.configManager.isTelemetryEnabled()) {
            return;
        }

        // In a real implementation, events would be sent to a telemetry service
        // For now, we'll just log them for debugging purposes
        console.log(`[Telemetry] Flushing ${this.eventQueue.length} events`);
        
        // For privacy and performance, we only log event counts in production
        const eventCounts: Record<string, number> = {};
        this.eventQueue.forEach(event => {
            eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
        });
        
        console.log('[Telemetry] Event summary:', eventCounts);
        
        // Clear the queue
        this.eventQueue = [];
    }

    /**
     * Sanitize properties to remove sensitive information
     */
    private sanitizeProperties(properties?: Record<string, string>): Record<string, string> | undefined {
        if (!properties) {
            return undefined;
        }

        const sanitized: Record<string, string> = {};
        
        for (const [key, value] of Object.entries(properties)) {
            // Remove or hash sensitive values
            if (this.isSensitiveKey(key)) {
                sanitized[key] = this.hashValue(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize error messages to remove sensitive information
     */
    private sanitizeErrorMessage(errorMessage?: string): string {
        if (!errorMessage) {
            return 'unknown';
        }

        // Remove URLs, tokens, and other sensitive data
        let sanitized = errorMessage
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .replace(/token[s]?[:\s=]+[^\s]+/gi, 'token=[REDACTED]')
            .replace(/pat[:\s=]+[^\s]+/gi, 'pat=[REDACTED]')
            .replace(/password[:\s=]+[^\s]+/gi, 'password=[REDACTED]');

        // Limit length to prevent large stack traces
        if (sanitized.length > 200) {
            sanitized = sanitized.substring(0, 200) + '...';
        }

        return sanitized;
    }

    /**
     * Check if a property key contains sensitive information
     */
    private isSensitiveKey(key: string): boolean {
        const sensitiveKeys = [
            'token', 'pat', 'password', 'secret', 'key', 'auth',
            'organization_url', 'project_name', 'repository_name',
            'user_name', 'email', 'organization_id'
        ];
        
        return sensitiveKeys.some(sensitive => 
            key.toLowerCase().includes(sensitive)
        );
    }

    /**
     * Create a simple hash of sensitive values
     */
    private hashValue(value: string): string {
        // Simple hash for telemetry purposes (not cryptographically secure)
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            const char = value.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `hash_${Math.abs(hash).toString(16)}`;
    }

    /**
     * Update the average analysis time
     */
    private updateAverageAnalysisTime(newTime: number): void {
        const count = this.usageStats.pullRequestsAnalyzed;
        if (count === 0) {
            this.usageStats.averageAnalysisTime = newTime;
        } else {
            this.usageStats.averageAnalysisTime = 
                (this.usageStats.averageAnalysisTime * (count - 1) + newTime) / count;
        }
    }

    /**
     * Load usage statistics from storage
     */
    private loadUsageStatistics(): UsageStatistics {
        const stored = this.context.globalState.get<UsageStatistics>('usageStatistics');
        
        if (stored) {
            // Ensure all properties exist (for backward compatibility)
            return {
                pullRequestsAnalyzed: stored.pullRequestsAnalyzed || 0,
                commentsGenerated: stored.commentsGenerated || 0,
                commentsPosted: stored.commentsPosted || 0,
                errorsEncountered: stored.errorsEncountered || 0,
                averageAnalysisTime: stored.averageAnalysisTime || 0,
                modelUsage: stored.modelUsage || {},
                lastActiveDate: stored.lastActiveDate ? new Date(stored.lastActiveDate) : new Date()
            };
        }

        return {
            pullRequestsAnalyzed: 0,
            commentsGenerated: 0,
            commentsPosted: 0,
            errorsEncountered: 0,
            averageAnalysisTime: 0,
            modelUsage: {},
            lastActiveDate: new Date()
        };
    }

    /**
     * Save usage statistics to storage
     */
    private saveUsageStatistics(): void {
        this.context.globalState.update('usageStatistics', this.usageStats);
    }

    /**
     * Get the extension version
     */
    private getExtensionVersion(): string {
        return vscode.extensions.getExtension('forgeflow.azdo-pr-code-reviewer')?.packageJSON.version || 'unknown';
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.flushEvents();
    }
}