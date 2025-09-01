import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, debounceTime, fromEvent } from 'rxjs';

export interface OptimizationConfig {
  enableVirtualScrolling: boolean;
  debounceTime: number;
  lazyLoadThreshold: number;
  cacheSize: number;
  enablePrerenderingStrategy: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceOptimizationService {
  private destroyRef = inject(DestroyRef);
  
  private readonly defaultConfig: OptimizationConfig = {
    enableVirtualScrolling: true,
    debounceTime: 300,
    lazyLoadThreshold: 100,
    cacheSize: 50,
    enablePrerenderingStrategy: true
  };

  private config$ = new BehaviorSubject<OptimizationConfig>(this.defaultConfig);
  private imageCache = new Map<string, HTMLImageElement>();
  private componentCache = new Map<string, LoadedComponent>();

  /**
   * Initialize performance optimizations
   */
  initializeOptimizations(): void {
    this.setupIntersectionObserver();
    this.setupResourcePreloading();
    this.setupScrollOptimization();
    this.setupMemoryManagement();
  }

  /**
   * Setup intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.lazyLoadElement(entry.target as HTMLElement);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: 0.1
        }
      );

      // Observe all elements with lazy-load attribute
      setTimeout(() => {
        document.querySelectorAll('[data-lazy-load]').forEach(el => {
          observer.observe(el);
        });
      }, 100);
    }
  }

  /**
   * Lazy load element content
   */
  private lazyLoadElement(element: HTMLElement): void {
    const src = element.dataset['lazySrc'];
    const component = element.dataset['lazyComponent'];

    if (src && element instanceof HTMLImageElement) {
      this.loadImage(src).then(img => {
        element.src = img.src;
        element.classList.add('loaded');
      });
    }

    if (component) {
      this.loadComponent(component).then(comp => {
        // Component loading logic would go here
        element.classList.add('component-loaded');
      });
    }
  }

  /**
   * Load and cache images
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(src)) {
      return Promise.resolve(this.imageCache.get(src)!);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Load and cache components
   */
  private loadComponent(componentName: string): Promise<LoadedComponent> {
    if (this.componentCache.has(componentName)) {
      return Promise.resolve(this.componentCache.get(componentName)!);
    }

    // Simulate component loading
    return new Promise(resolve => {
      setTimeout(() => {
        const component: LoadedComponent = { name: componentName, loaded: true };
        this.componentCache.set(componentName, component);
        resolve(component);
      }, 100);
    });
  }

  /**
   * Setup resource preloading
   */
  private setupResourcePreloading(): void {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Setup service worker for caching if available
    // In VS Code webviews service workers are not supported (blob:vscode-webview protocol)
    // or may fail due to CSP. Also, acquireVsCodeApi presence indicates webview environment.
    const isVsCodeWebview = typeof (window as any).acquireVsCodeApi !== 'undefined' || location.protocol.startsWith('blob:');
    if ('serviceWorker' in navigator && !isVsCodeWebview) {
      this.setupServiceWorker();
    }
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    const criticalResources = [
      'assets/icons/icon-sprite.svg',
      'assets/fonts/inter-var.woff2'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.includes('font') ? 'font' : 'image';
      if (link.as === 'font') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }

  /**
   * Setup service worker for caching
   */
  private setupServiceWorker(): void {
    // Basic service worker setup for caching
    const swScript = `
      self.addEventListener('fetch', event => {
        if (event.request.destination === 'image' || 
            event.request.destination === 'font' ||
            event.request.destination === 'style') {
          event.respondWith(
            caches.open('azdo-assets-v1').then(cache => {
              return cache.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchResponse => {
                  cache.put(event.request, fetchResponse.clone());
                  return fetchResponse;
                });
              });
            })
          );
        }
      });
    `;

    const blob = new Blob([swScript], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    navigator.serviceWorker.register(swUrl).catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  }

  /**
   * Setup scroll optimization
   */
  private setupScrollOptimization(): void {
    const scrollElements = document.querySelectorAll('[data-scroll-optimize]');
    
    scrollElements.forEach(element => {
      fromEvent(element, 'scroll')
        .pipe(
          debounceTime(this.defaultConfig.debounceTime),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.optimizeScrollPerformance(element as HTMLElement);
        });
    });
  }

  /**
   * Optimize scroll performance
   */
  private optimizeScrollPerformance(element: HTMLElement): void {
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
      // Update visible items only
      const visibleItems = this.getVisibleItems(element);
      this.updateVisibleItems(visibleItems);
    });
  }

  /**
   * Get visible items in scroll container
   */
  private getVisibleItems(container: HTMLElement): HTMLElement[] {
    const rect = container.getBoundingClientRect();
    const items = container.querySelectorAll('[data-scroll-item]');
    
    return Array.from(items).filter(item => {
      const itemRect = item.getBoundingClientRect();
      return itemRect.top < rect.bottom && itemRect.bottom > rect.top;
    }) as HTMLElement[];
  }

  /**
   * Update only visible items
   */
  private updateVisibleItems(items: HTMLElement[]): void {
    items.forEach(item => {
      if (!item.classList.contains('updated')) {
        // Perform updates on visible items
        item.classList.add('updated');
      }
    });
  }

  /**
   * Setup memory management
   */
  private setupMemoryManagement(): void {
    // Clear caches when memory usage is high
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds

    // Listen for memory pressure events
    if ('memory' in performance) {
      this.monitorMemoryPressure();
    }
  }

  /**
   * Check memory usage and cleanup if needed
   */
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 80) {
        console.warn('High memory usage detected, cleaning up caches');
        this.cleanupCaches();
      }
    }
  }

  /**
   * Monitor memory pressure
   */
  private monitorMemoryPressure(): void {
    // Simulate memory pressure monitoring
    const checkMemoryPressure = () => {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        this.handleMemoryPressure();
      }
    };

    setInterval(checkMemoryPressure, 10000); // Check every 10 seconds
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, performing aggressive cleanup');
    this.cleanupCaches();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Notify components to reduce memory usage
    this.notifyMemoryPressure();
  }

  /**
   * Cleanup caches
   */
  private cleanupCaches(): void {
    // Keep only recent items in cache
    const maxCacheSize = this.defaultConfig.cacheSize;
    
    if (this.imageCache.size > maxCacheSize) {
      const entries = Array.from(this.imageCache.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      toDelete.forEach(([key]) => this.imageCache.delete(key));
    }

    if (this.componentCache.size > maxCacheSize) {
      const entries = Array.from(this.componentCache.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      toDelete.forEach(([key]) => this.componentCache.delete(key));
    }
  }

  /**
   * Notify components about memory pressure
   */
  private notifyMemoryPressure(): void {
    const event = new CustomEvent('memory-pressure', {
      detail: { timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Optimize bundle loading with code splitting
   */
  async loadModuleOptimized<T>(moduleLoader: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const module = await moduleLoader();
      const loadTime = performance.now() - startTime;
      
      console.log(`📦 Module loaded in ${loadTime.toFixed(2)}ms`);
      return module;
    } catch (error) {
      console.error('Module loading failed:', error);
      throw error;
    }
  }

  /**
   * Debounce function calls for performance
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number = this.defaultConfig.debounceTime
  ): (...args: Parameters<T>) => void {
    let timeoutId: number;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Throttle function calls for performance
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number = this.defaultConfig.debounceTime
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  /**
   * Update optimization configuration
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    const newConfig = { ...this.config$.value, ...config };
    this.config$.next(newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return this.config$.value;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      cacheSize: {
        images: this.imageCache.size,
        components: this.componentCache.size
      },
      memoryUsage: 'memory' in performance ? (performance as unknown as { memory: PerformanceMemory }).memory : null,
      config: this.config$.value
    };
  }
}

export interface LoadedComponent {
  name: string;
  loaded: boolean;
}

export interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface PerformanceMetrics {
  cacheSize: { images: number; components: number };
  memoryUsage: PerformanceMemory | null;
  config: OptimizationConfig;
}
