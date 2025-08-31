import { Injectable } from '@angular/core';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  summary: {
    componentLoadTime: number;
    renderTime: number;
    interactionTime: number;
    memoryUsage: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private reports: PerformanceReport[] = [];
  private observer?: PerformanceObserver;

  constructor() {
    this.initializePerformanceObserver();
  }

  /**
   * Initialize Performance Observer API
   */
  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // Observe all performance entry types
      try {
        this.observer.observe({ entryTypes: ['measure', 'navigation', 'paint', 'resource'] });
      } catch (error) {
        console.warn('Performance monitoring not fully supported:', error);
      }
    }
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      name: entry.name,
      startTime: entry.startTime,
      endTime: entry.startTime + entry.duration,
      duration: entry.duration,
      metadata: {
        entryType: entry.entryType,
        timestamp: performance.now()
      }
    };

    // Store relevant metrics
    if (entry.entryType === 'measure' || entry.name.includes('component') || entry.name.includes('angular')) {
      this.metrics.set(entry.name, metric);
    }
  }

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    
    this.metrics.set(name, metric);
    
    // Use Performance API marking if available
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End timing a performance metric
   */
  endTiming(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Use Performance API measuring if available
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Ignore marking errors
      }
    }

    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure component loading time
   */
  measureComponentLoad(componentName: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        const metricName = `component-load-${componentName}`;
        performance.mark(`${metricName}-start`);
        
        const result = originalMethod.apply(this, args);
        
        // Handle both sync and async methods
        if (result && typeof result.then === 'function') {
          return result.then((value: any) => {
            performance.mark(`${metricName}-end`);
            performance.measure(metricName, `${metricName}-start`, `${metricName}-end`);
            return value;
          });
        } else {
          performance.mark(`${metricName}-end`);
          performance.measure(metricName, `${metricName}-start`, `${metricName}-end`);
          return result;
        }
      };

      return descriptor;
    };
  }

  /**
   * Measure function execution time
   */
  measureExecution(name: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        const startTime = performance.now();
        const result = originalMethod.apply(this, args);
        const endTime = performance.now();
        
        console.log(`🔧 ${name}: ${(endTime - startTime).toFixed(2)}ms`);
        return result;
      };

      return descriptor;
    };
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): any {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Monitor virtual scrolling performance
   */
  monitorVirtualScrolling(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    let lastScrollTime = 0;
    let frameCount = 0;
    let fpsSum = 0;

    const measureScrollPerformance = () => {
      const currentTime = performance.now();
      if (lastScrollTime > 0) {
        const fps = 1000 / (currentTime - lastScrollTime);
        fpsSum += fps;
        frameCount++;
        
        // Log average FPS every 60 frames
        if (frameCount % 60 === 0) {
          const avgFps = fpsSum / frameCount;
          console.log(`📜 Virtual Scroll FPS: ${avgFps.toFixed(1)}`);
        }
      }
      lastScrollTime = currentTime;
    };

    container.addEventListener('scroll', measureScrollPerformance, { passive: true });
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const entries = performance.getEntriesByType('measure');
    const componentMetrics = entries.filter(entry => entry.name.includes('component'));
    
    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics: Array.from(this.metrics.values()),
      summary: {
        componentLoadTime: this.calculateAverageLoadTime(componentMetrics),
        renderTime: this.getMetricDuration('render'),
        interactionTime: this.getMetricDuration('interaction'),
        memoryUsage: this.getCurrentMemoryUsage()
      }
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Calculate average component load time
   */
  private calculateAverageLoadTime(metrics: PerformanceEntry[]): number {
    if (metrics.length === 0) return 0;
    const totalTime = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / metrics.length;
  }

  /**
   * Get metric duration by name
   */
  private getMetricDuration(name: string): number {
    const metric = this.metrics.get(name);
    return metric?.duration || 0;
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    const memory = this.getMemoryUsage();
    return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const report = this.generateReport();
    
    console.group('🚀 Performance Summary');
    console.log(`📊 Component Load Time: ${report.summary.componentLoadTime.toFixed(2)}ms`);
    console.log(`🎨 Render Time: ${report.summary.renderTime.toFixed(2)}ms`);
    console.log(`🖱️ Interaction Time: ${report.summary.interactionTime.toFixed(2)}ms`);
    console.log(`💾 Memory Usage: ${report.summary.memoryUsage.toFixed(2)}MB`);
    
    if (this.metrics.size > 0) {
      console.log('\n📈 Detailed Metrics:');
      this.metrics.forEach((metric, name) => {
        if (metric.duration) {
          console.log(`  ${name}: ${metric.duration.toFixed(2)}ms`);
        }
      });
    }
    console.groupEnd();
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    if ('performance' in window && 'clearMarks' in performance) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Get all reports
   */
  getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.clearMetrics();
  }
}