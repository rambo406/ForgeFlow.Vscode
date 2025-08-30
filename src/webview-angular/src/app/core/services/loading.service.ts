import { Injectable, signal, computed } from '@angular/core';

/**
 * Loading operation interface
 */
export interface LoadingOperation {
  id: string;
  name: string;
  description?: string;
  progress?: number; // 0-100
  isIndeterminate: boolean;
  startTime: Date;
  estimatedDuration?: number; // in milliseconds
  status: 'starting' | 'running' | 'completing' | 'completed' | 'failed';
  category: 'api' | 'ui' | 'background' | 'critical';
  cancellable?: boolean;
  onCancel?: () => void;
}

/**
 * Loading state summary
 */
export interface LoadingSummary {
  isLoading: boolean;
  totalOperations: number;
  criticalOperations: number;
  longestRunningOperation?: LoadingOperation;
  overallProgress: number;
  hasBlockingOperations: boolean;
}

/**
 * Service for managing loading states and progress indicators
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _operations = signal<Map<string, LoadingOperation>>(new Map());
  private operationCounter = 0;

  readonly operations = this._operations.asReadonly();

  /**
   * Computed loading summary
   */
  readonly loadingSummary = computed<LoadingSummary>(() => {
    const ops = Array.from(this._operations().values());
    const activeOps = ops.filter(op => ['starting', 'running', 'completing'].includes(op.status));
    const criticalOps = activeOps.filter(op => op.category === 'critical');
    
    // Calculate overall progress
    let totalProgress = 0;
    let progressCount = 0;
    
    activeOps.forEach(op => {
      if (!op.isIndeterminate && op.progress !== undefined) {
        totalProgress += op.progress;
        progressCount++;
      }
    });
    
    const overallProgress = progressCount > 0 ? totalProgress / progressCount : 0;
    
    // Find longest running operation
    const longestRunning = activeOps.reduce((longest, current) => {
      if (!longest) return current;
      return current.startTime < longest.startTime ? current : longest;
    }, undefined as LoadingOperation | undefined);

    return {
      isLoading: activeOps.length > 0,
      totalOperations: activeOps.length,
      criticalOperations: criticalOps.length,
      longestRunningOperation: longestRunning,
      overallProgress,
      hasBlockingOperations: criticalOps.length > 0
    };
  });

  /**
   * Computed loading states for specific categories
   */
  readonly apiLoading = computed(() => {
    const ops = Array.from(this._operations().values());
    return ops.some(op => op.category === 'api' && ['starting', 'running', 'completing'].includes(op.status));
  });

  readonly uiLoading = computed(() => {
    const ops = Array.from(this._operations().values());
    return ops.some(op => op.category === 'ui' && ['starting', 'running', 'completing'].includes(op.status));
  });

  readonly backgroundLoading = computed(() => {
    const ops = Array.from(this._operations().values());
    return ops.some(op => op.category === 'background' && ['starting', 'running', 'completing'].includes(op.status));
  });

  readonly criticalLoading = computed(() => {
    const ops = Array.from(this._operations().values());
    return ops.some(op => op.category === 'critical' && ['starting', 'running', 'completing'].includes(op.status));
  });

  constructor() {
    // Clean up completed operations periodically
    setInterval(() => {
      this.cleanupCompletedOperations();
    }, 30000); // Every 30 seconds
  }

  /**
   * Start a new loading operation
   */
  startLoading(
    name: string,
    options: {
      description?: string;
      category?: LoadingOperation['category'];
      isIndeterminate?: boolean;
      estimatedDuration?: number;
      cancellable?: boolean;
      onCancel?: () => void;
    } = {}
  ): string {
    const id = `loading_${++this.operationCounter}`;
    
    const operation: LoadingOperation = {
      id,
      name,
      description: options.description,
      progress: options.isIndeterminate ? undefined : 0,
      isIndeterminate: options.isIndeterminate ?? true,
      startTime: new Date(),
      estimatedDuration: options.estimatedDuration,
      status: 'starting',
      category: options.category ?? 'ui',
      cancellable: options.cancellable,
      onCancel: options.onCancel
    };

    const current = this._operations();
    const updated = new Map(current);
    updated.set(id, operation);
    this._operations.set(updated);

    // Auto-transition from starting to running
    setTimeout(() => {
      this.updateOperationStatus(id, 'running');
    }, 100);

    return id;
  }

  /**
   * Update operation progress
   */
  updateProgress(id: string, progress: number, status?: LoadingOperation['status']): void {
    const current = this._operations();
    const operation = current.get(id);
    
    if (operation) {
      const updated = new Map(current);
      updated.set(id, {
        ...operation,
        progress: Math.max(0, Math.min(100, progress)),
        status: status || operation.status
      });
      this._operations.set(updated);
    }
  }

  /**
   * Update operation status
   */
  updateOperationStatus(id: string, status: LoadingOperation['status']): void {
    const current = this._operations();
    const operation = current.get(id);
    
    if (operation) {
      const updated = new Map(current);
      updated.set(id, { ...operation, status });
      this._operations.set(updated);
      
      // Auto-complete if status is completing
      if (status === 'completing') {
        setTimeout(() => {
          this.completeLoading(id);
        }, 500); // Brief delay to show completion state
      }
    }
  }

  /**
   * Update operation description
   */
  updateDescription(id: string, description: string): void {
    const current = this._operations();
    const operation = current.get(id);
    
    if (operation) {
      const updated = new Map(current);
      updated.set(id, { ...operation, description });
      this._operations.set(updated);
    }
  }

  /**
   * Complete a loading operation
   */
  completeLoading(id: string): void {
    const current = this._operations();
    const operation = current.get(id);
    
    if (operation) {
      const updated = new Map(current);
      updated.set(id, {
        ...operation,
        status: 'completed',
        progress: operation.isIndeterminate ? undefined : 100
      });
      this._operations.set(updated);
      
      // Remove completed operation after a delay
      setTimeout(() => {
        this.removeOperation(id);
      }, 2000);
    }
  }

  /**
   * Fail a loading operation
   */
  failLoading(id: string, error?: string): void {
    const current = this._operations();
    const operation = current.get(id);
    
    if (operation) {
      const updated = new Map(current);
      updated.set(id, {
        ...operation,
        status: 'failed',
        description: error || operation.description
      });
      this._operations.set(updated);
      
      // Remove failed operation after a longer delay
      setTimeout(() => {
        this.removeOperation(id);
      }, 5000);
    }
  }

  /**
   * Cancel a loading operation
   */
  cancelLoading(id: string): void {
    const current = this._operations();
    const operation = current.get(id);
    
    if (operation && operation.cancellable && operation.onCancel) {
      operation.onCancel();
      this.removeOperation(id);
    }
  }

  /**
   * Remove an operation
   */
  private removeOperation(id: string): void {
    const current = this._operations();
    const updated = new Map(current);
    updated.delete(id);
    this._operations.set(updated);
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string): LoadingOperation | undefined {
    return this._operations().get(id);
  }

  /**
   * Get operations by category
   */
  getOperationsByCategory(category: LoadingOperation['category']): LoadingOperation[] {
    const ops = Array.from(this._operations().values());
    return ops.filter(op => op.category === category);
  }

  /**
   * Clear all operations
   */
  clearAllOperations(): void {
    this._operations.set(new Map());
  }

  /**
   * Clear operations by category
   */
  clearOperationsByCategory(category: LoadingOperation['category']): void {
    const current = this._operations();
    const updated = new Map();
    
    current.forEach((operation, id) => {
      if (operation.category !== category) {
        updated.set(id, operation);
      }
    });
    
    this._operations.set(updated);
  }

  /**
   * Check if a specific operation is running
   */
  isOperationRunning(id: string): boolean {
    const operation = this.getOperation(id);
    return operation ? ['starting', 'running', 'completing'].includes(operation.status) : false;
  }

  /**
   * Get estimated completion time for an operation
   */
  getEstimatedCompletion(id: string): Date | null {
    const operation = this.getOperation(id);
    
    if (!operation || !operation.estimatedDuration) {
      return null;
    }
    
    const elapsed = new Date().getTime() - operation.startTime.getTime();
    const remaining = Math.max(0, operation.estimatedDuration - elapsed);
    
    return new Date(Date.now() + remaining);
  }

  /**
   * Get operations that have been running longer than expected
   */
  getOverdueOperations(): LoadingOperation[] {
    const now = new Date().getTime();
    const ops = Array.from(this._operations().values());
    
    return ops.filter(op => {
      if (!op.estimatedDuration || op.status !== 'running') {
        return false;
      }
      
      const elapsed = now - op.startTime.getTime();
      return elapsed > op.estimatedDuration * 1.5; // 50% over estimated time
    });
  }

  /**
   * Clean up completed operations
   */
  private cleanupCompletedOperations(): void {
    const current = this._operations();
    const updated = new Map();
    const cutoffTime = new Date().getTime() - 300000; // 5 minutes ago
    
    current.forEach((operation, id) => {
      // Keep operations that are active or recently completed
      if (
        ['starting', 'running', 'completing'].includes(operation.status) ||
        operation.startTime.getTime() > cutoffTime
      ) {
        updated.set(id, operation);
      }
    });
    
    if (updated.size !== current.size) {
      this._operations.set(updated);
    }
  }

  /**
   * Helper method to wrap an async operation with loading state
   */
  async withLoading<T>(
    operation: () => Promise<T>,
    name: string,
    options: {
      description?: string;
      category?: LoadingOperation['category'];
      estimatedDuration?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<T> {
    const loadingId = this.startLoading(name, {
      description: options.description,
      category: options.category,
      isIndeterminate: !options.onProgress,
      estimatedDuration: options.estimatedDuration
    });

    try {
      const result = await operation();
      this.completeLoading(loadingId);
      return result;
    } catch (error) {
      this.failLoading(loadingId, error instanceof Error ? error.message : 'Operation failed');
      throw error;
    }
  }
}