/**
 * Performance configuration for Angular webview application
 * 
 * This file contains all performance-related configurations and thresholds
 * for the Azure DevOps PR Code Reviewer webview.
 */

export interface PerformanceThresholds {
  componentLoad: number;      // Maximum component loading time (ms)
  renderTime: number;         // Maximum render time (ms)
  interactionTime: number;    // Maximum interaction response time (ms)
  memoryUsage: number;        // Maximum memory usage (MB)
  bundleSize: number;         // Maximum bundle size (bytes)
  virtualScrollFps: number;   // Minimum virtual scroll FPS
  lazyLoadTime: number;       // Maximum lazy load time (ms)
  firstContentfulPaint: number; // Maximum FCP time (ms)
  timeToInteractive: number;  // Maximum TTI time (ms)
}

export interface BundleOptimizationConfig {
  enableTreeShaking: boolean;
  enableCodeSplitting: boolean;
  enableLazyLoading: boolean;
  enableMinification: boolean;
  enableGzipCompression: boolean;
  maxChunkSize: number;       // bytes
  maxAssetSize: number;       // bytes
}

export interface MemoryOptimizationConfig {
  maxCacheSize: number;       // Maximum number of cached items
  memoryCheckInterval: number; // Memory check interval (ms)
  memoryThreshold: number;    // Memory threshold for cleanup (%)
  enableWeakReferences: boolean;
  enableAutomaticCleanup: boolean;
}

export interface VirtualScrollConfig {
  itemHeight: number;         // Virtual scroll item height (px)
  bufferSize: number;         // Number of items to buffer
  enableRecycling: boolean;   // Enable item recycling
  scrollDebounceTime: number; // Scroll event debounce (ms)
  renderBatchSize: number;    // Number of items to render per batch
}

export interface LazyLoadingConfig {
  preloadingStrategy: 'none' | 'preload-all' | 'selective';
  routePreloadDelay: number;  // Delay before preloading routes (ms)
  componentPreloadThreshold: number; // Distance to preload components (px)
  enableModulePrefetch: boolean;
  enableResourceHints: boolean;
}

export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  componentLoad: 100,        // 100ms
  renderTime: 50,           // 50ms
  interactionTime: 16,      // 16ms (60fps)
  memoryUsage: 50,          // 50MB
  bundleSize: 500000,       // 500KB
  virtualScrollFps: 55,     // 55fps (allows some buffer below 60fps)
  lazyLoadTime: 200,        // 200ms
  firstContentfulPaint: 1500, // 1.5s
  timeToInteractive: 3000   // 3s
};

export const BUNDLE_OPTIMIZATION: BundleOptimizationConfig = {
  enableTreeShaking: true,
  enableCodeSplitting: true,
  enableLazyLoading: true,
  enableMinification: true,
  enableGzipCompression: true,
  maxChunkSize: 244000,     // 244KB (webpack default)
  maxAssetSize: 500000      // 500KB
};

export const MEMORY_OPTIMIZATION: MemoryOptimizationConfig = {
  maxCacheSize: 50,
  memoryCheckInterval: 30000, // 30 seconds
  memoryThreshold: 80,        // 80%
  enableWeakReferences: true,
  enableAutomaticCleanup: true
};

export const VIRTUAL_SCROLL_CONFIG: VirtualScrollConfig = {
  itemHeight: 60,           // 60px per item
  bufferSize: 10,           // 10 items buffer
  enableRecycling: true,
  scrollDebounceTime: 16,   // 16ms (60fps)
  renderBatchSize: 20       // 20 items per batch
};

export const LAZY_LOADING_CONFIG: LazyLoadingConfig = {
  preloadingStrategy: 'selective',
  routePreloadDelay: 2000,  // 2 seconds
  componentPreloadThreshold: 300, // 300px
  enableModulePrefetch: true,
  enableResourceHints: true
};

/**
 * Performance optimization features to enable
 */
export const OPTIMIZATION_FEATURES = {
  enableOnPushChangeDetection: true,
  enableSignalBasedState: true,
  enableVirtualScrolling: true,
  enableImageLazyLoading: true,
  enableComponentLazyLoading: true,
  enableRoutePreloading: true,
  enableServiceWorkerCaching: true,
  enablePerformanceMonitoring: true,
  enableMemoryManagement: true,
  enableDebouncing: true,
  enableThrottling: true,
  enableResourceHints: true
};

/**
 * Development vs Production performance configurations
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    enableDetailedLogging: true,
    enablePerformanceDevtools: true,
    enableDebugMetrics: true,
    bundleSizeThresholds: {
      warning: 600000,  // 600KB
      error: 1000000    // 1MB
    }
  },
  production: {
    enableDetailedLogging: false,
    enablePerformanceDevtools: false,
    enableDebugMetrics: false,
    bundleSizeThresholds: {
      warning: 400000,  // 400KB
      error: 500000     // 500KB
    }
  }
};

/**
 * Performance monitoring configuration
 */
export const MONITORING_CONFIG = {
  enableAutomaticReporting: true,
  reportingInterval: 60000,     // 1 minute
  enableUserTimings: true,
  enableResourceTimings: true,
  enableNavigationTimings: true,
  enablePaintTimings: true,
  enableLayoutShiftTracking: true,
  enableLongTaskTracking: true,
  thresholds: PERFORMANCE_THRESHOLDS
};

/**
 * Web Vitals thresholds for Google Core Web Vitals
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: 2500,    // Largest Contentful Paint (ms)
  FID: 100,     // First Input Delay (ms)
  CLS: 0.1,     // Cumulative Layout Shift
  FCP: 1800,    // First Contentful Paint (ms)
  TTFB: 600     // Time to First Byte (ms)
};

/**
 * Get configuration based on environment
 */
export function getPerformanceConfig(environment: 'development' | 'production') {
  return {
    thresholds: PERFORMANCE_THRESHOLDS,
    bundleOptimization: BUNDLE_OPTIMIZATION,
    memoryOptimization: MEMORY_OPTIMIZATION,
    virtualScroll: VIRTUAL_SCROLL_CONFIG,
    lazyLoading: LAZY_LOADING_CONFIG,
    features: OPTIMIZATION_FEATURES,
    environment: ENVIRONMENT_CONFIG[environment],
    monitoring: MONITORING_CONFIG,
    webVitals: WEB_VITALS_THRESHOLDS
  };
}

/**
 * Validate performance against thresholds
 */
export function validatePerformance(metrics: Record<string, unknown>): {
  passed: boolean;
  failures: string[];
  score: number;
} {
  const failures: string[] = [];
  let passedCount = 0;
  let totalCount = 0;

  // Check each threshold
  Object.entries(PERFORMANCE_THRESHOLDS).forEach(([key, threshold]) => {
    totalCount++;
    const metricValue = metrics[key] as number | undefined;
    
    if (metricValue !== undefined) {
      const passed = key === 'virtualScrollFps' ? 
        metricValue >= threshold : 
        metricValue <= threshold;
      
      if (passed) {
        passedCount++;
      } else {
        failures.push(`${key}: ${metricValue} (threshold: ${threshold})`);
      }
    }
  });

  return {
    passed: failures.length === 0,
    failures,
    score: Math.round((passedCount / totalCount) * 100)
  };
}

/**
 * Get performance recommendations based on current metrics
 */
export function getPerformanceRecommendations(metrics: Record<string, number>): string[] {
  const recommendations: string[] = [];

  if (metrics['componentLoad'] > PERFORMANCE_THRESHOLDS.componentLoad) {
    recommendations.push('Consider implementing more aggressive lazy loading for components');
    recommendations.push('Use OnPush change detection strategy consistently');
  }

  if (metrics['renderTime'] > PERFORMANCE_THRESHOLDS.renderTime) {
    recommendations.push('Optimize change detection cycles with signals');
    recommendations.push('Implement virtual scrolling for large lists');
  }

  if (metrics['memoryUsage'] > PERFORMANCE_THRESHOLDS.memoryUsage) {
    recommendations.push('Implement proper subscription cleanup with takeUntilDestroyed');
    recommendations.push('Use memory-efficient data structures and caching');
  }

  if (metrics['bundleSize'] > PERFORMANCE_THRESHOLDS.bundleSize) {
    recommendations.push('Enable more aggressive tree shaking');
    recommendations.push('Analyze and remove unused dependencies');
    recommendations.push('Implement route-based code splitting');
  }

  if (metrics['virtualScrollFps'] < PERFORMANCE_THRESHOLDS.virtualScrollFps) {
    recommendations.push('Optimize virtual scrolling item rendering');
    recommendations.push('Implement item recycling for better performance');
  }

  return recommendations;
}
