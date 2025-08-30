import { Injectable, signal } from '@angular/core';

/**
 * Subscription tracking interface
 */
export interface SubscriptionTracker {
  id: string;
  componentName: string;
  subscriptionType: string;
  createdAt: Date;
  isActive: boolean;
  cleanup?: () => void;
}

/**
 * Memory leak detection and prevention service
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryManagementService {
  private _subscriptionTrackers = signal<Map<string, SubscriptionTracker>>(new Map());
  private _memoryUsage = signal<number>(0);
  private _leakDetectionEnabled = signal(true);
  
  readonly subscriptionTrackers = this._subscriptionTrackers.asReadonly();
  readonly memoryUsage = this._memoryUsage.asReadonly();
  readonly leakDetectionEnabled = this._leakDetectionEnabled.asReadonly();

  private memoryCheckInterval?: number;
  private subscriptionCounter = 0;

  constructor() {
    this.startMemoryMonitoring();
    this.setupLeakDetection();
  }

  /**
   * Register a subscription for tracking
   */
  trackSubscription(
    componentName: string,
    subscriptionType: string,
    cleanup?: () => void
  ): string {
    const id = `sub_${++this.subscriptionCounter}`;
    
    const tracker: SubscriptionTracker = {
      id,
      componentName,
      subscriptionType,
      createdAt: new Date(),
      isActive: true,
      cleanup
    };

    const current = this._subscriptionTrackers();
    const updated = new Map(current);
    updated.set(id, tracker);
    this._subscriptionTrackers.set(updated);

    return id;
  }

  /**
   * Unregister a subscription
   */
  untrackSubscription(id: string): void {
    const current = this._subscriptionTrackers();
    const tracker = current.get(id);
    
    if (tracker) {
      // Call cleanup function if provided
      if (tracker.cleanup) {
        try {
          tracker.cleanup();
        } catch (error) {
          console.warn(`Cleanup failed for subscription ${id}:`, error);
        }
      }
      
      // Remove from tracking
      const updated = new Map(current);
      updated.delete(id);
      this._subscriptionTrackers.set(updated);
    }
  }

  /**
   * Clean up all subscriptions for a component
   */
  cleanupComponent(componentName: string): void {
    const current = this._subscriptionTrackers();
    const updated = new Map();
    
    current.forEach((tracker, id) => {
      if (tracker.componentName === componentName) {
        // Call cleanup function
        if (tracker.cleanup) {
          try {
            tracker.cleanup();
          } catch (error) {
            console.warn(`Cleanup failed for ${componentName} subscription ${id}:`, error);
          }
        }
      } else {
        updated.set(id, tracker);
      }
    });
    
    this._subscriptionTrackers.set(updated);
  }

  /**
   * Get active subscriptions for a component
   */
  getComponentSubscriptions(componentName: string): SubscriptionTracker[] {
    const trackers = Array.from(this._subscriptionTrackers().values());
    return trackers.filter(tracker => 
      tracker.componentName === componentName && tracker.isActive
    );
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    total: number;
    active: number;
    byComponent: Map<string, number>;
    byType: Map<string, number>;
    oldestSubscription?: SubscriptionTracker;
  } {
    const trackers = Array.from(this._subscriptionTrackers().values());
    const activeTrackers = trackers.filter(t => t.isActive);
    
    const byComponent = new Map<string, number>();
    const byType = new Map<string, number>();
    
    activeTrackers.forEach(tracker => {
      // Count by component
      const componentCount = byComponent.get(tracker.componentName) || 0;
      byComponent.set(tracker.componentName, componentCount + 1);
      
      // Count by type
      const typeCount = byType.get(tracker.subscriptionType) || 0;
      byType.set(tracker.subscriptionType, typeCount + 1);
    });
    
    // Find oldest subscription
    const oldestSubscription = activeTrackers.reduce((oldest, current) => {
      if (!oldest || current.createdAt < oldest.createdAt) {
        return current;
      }
      return oldest;
    }, undefined as SubscriptionTracker | undefined);

    return {
      total: trackers.length,
      active: activeTrackers.length,
      byComponent,
      byType,
      oldestSubscription
    };
  }

  /**
   * Detect potential memory leaks
   */
  detectLeaks(): {
    hasLeaks: boolean;
    longRunningSubscriptions: SubscriptionTracker[];
    componentsWithManySubscriptions: string[];
    recommendations: string[];
  } {
    const stats = this.getSubscriptionStats();
    const now = new Date().getTime();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);
    
    // Find long-running subscriptions (over 5 minutes)
    const longRunningSubscriptions = Array.from(this._subscriptionTrackers().values())
      .filter(tracker => 
        tracker.isActive && tracker.createdAt.getTime() < fiveMinutesAgo
      );
    
    // Find components with many subscriptions (over 10)
    const componentsWithManySubscriptions: string[] = [];
    stats.byComponent.forEach((count, componentName) => {
      if (count > 10) {
        componentsWithManySubscriptions.push(componentName);
      }
    });
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (longRunningSubscriptions.length > 0) {
      recommendations.push(`${longRunningSubscriptions.length} subscriptions have been running for over 5 minutes. Consider implementing proper cleanup.`);
    }
    
    if (componentsWithManySubscriptions.length > 0) {
      recommendations.push(`Components with many subscriptions: ${componentsWithManySubscriptions.join(', ')}. Consider consolidating or optimizing subscription usage.`);
    }
    
    if (stats.active > 50) {
      recommendations.push(`High number of active subscriptions (${stats.active}). Monitor for potential memory leaks.`);
    }

    return {
      hasLeaks: longRunningSubscriptions.length > 0 || componentsWithManySubscriptions.length > 0,
      longRunningSubscriptions,
      componentsWithManySubscriptions,
      recommendations
    };
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      this.memoryCheckInterval = window.setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this._memoryUsage.set(memory.usedJSHeapSize);
        }
      }, 5000); // Check every 5 seconds
    }
  }

  /**
   * Set up leak detection
   */
  private setupLeakDetection(): void {
    // Check for leaks every minute
    setInterval(() => {
      if (this._leakDetectionEnabled()) {
        const leakAnalysis = this.detectLeaks();
        
        if (leakAnalysis.hasLeaks) {
          console.warn('Potential memory leaks detected:', leakAnalysis);
          
          // Dispatch custom event for leak detection
          window.dispatchEvent(new CustomEvent('memoryLeakDetected', {
            detail: leakAnalysis
          }));
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('Forced garbage collection');
      } catch (error) {
        console.warn('Garbage collection not available:', error);
      }
    }
  }

  /**
   * Get memory information
   */
  getMemoryInfo(): {
    used: number;
    total?: number;
    limit?: number;
    percentage?: number;
  } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: memory.totalJSHeapSize ? 
          (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : undefined
      };
    }
    
    return { used: 0 };
  }

  /**
   * Enable or disable leak detection
   */
  setLeakDetectionEnabled(enabled: boolean): void {
    this._leakDetectionEnabled.set(enabled);
  }

  /**
   * Clear all subscription tracking
   */
  clearAllTracking(): void {
    // Cleanup all tracked subscriptions
    const current = this._subscriptionTrackers();
    current.forEach((tracker) => {
      if (tracker.cleanup) {
        try {
          tracker.cleanup();
        } catch (error) {
          console.warn(`Cleanup failed for subscription ${tracker.id}:`, error);
        }
      }
    });
    
    this._subscriptionTrackers.set(new Map());
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    this.clearAllTracking();
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }
}