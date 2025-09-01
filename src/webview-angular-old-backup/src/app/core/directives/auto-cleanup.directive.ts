import { Directive, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { MemoryManagementService } from '../services/memory-management.service';

/**
 * Base directive for automatic subscription cleanup
 * Components can extend this or use the directive
 */
@Directive({
  selector: '[appAutoCleanup]',
  standalone: true
})
export class AutoCleanupDirective implements OnDestroy {
  protected destroy$ = new Subject<void>();
  private memoryManager = inject(MemoryManagementService);
  private componentName: string;
  private subscriptionIds: string[] = [];

  constructor() {
    // Get component name from constructor
    this.componentName = this.constructor.name;
  }

  /**
   * Register a subscription for automatic cleanup
   */
  protected trackSubscription(subscriptionType: string, cleanup?: () => void): string {
    const id = this.memoryManager.trackSubscription(
      this.componentName,
      subscriptionType,
      cleanup
    );
    
    this.subscriptionIds.push(id);
    return id;
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    // Emit destroy signal
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cleanup tracked subscriptions
    this.subscriptionIds.forEach(id => {
      this.memoryManager.untrackSubscription(id);
    });
    
    // Cleanup all component subscriptions
    this.memoryManager.cleanupComponent(this.componentName);
  }
}