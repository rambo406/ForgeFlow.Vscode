import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavigationService } from './core/services/navigation.service';
import { AppToastContainerComponent } from './shared/components/feedback/app-toast-container.component';
import { PerformanceMonitorService } from './core/services/performance-monitor.service';
import { PerformanceOptimizationService } from './core/services/performance-optimization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppToastContainerComponent],
  template: `
    <div class="h-screen w-full">
      <router-outlet />
      <!-- Toast container for global notifications -->
      <app-toast-container />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'ForgeFlow Azure DevOps PR Reviewer';

  private performanceMonitor = inject(PerformanceMonitorService);
  private performanceOptimization = inject(PerformanceOptimizationService);
  // Ensure NavigationService is instantiated to attach message listeners
  private _nav = inject(NavigationService);

  ngOnInit(): void {
    // Initialize performance monitoring and optimizations
    this.performanceMonitor.startTiming('app-initialization');
    this.performanceOptimization.initializeOptimizations();
    
    // Setup performance monitoring for the main app
    this.performanceMonitor.monitorVirtualScrolling('main-scroll-container');
    
    // Log initial performance metrics
    setTimeout(() => {
      this.performanceMonitor.endTiming('app-initialization');
      this.performanceMonitor.logPerformanceSummary();
    }, 100);
  }
}
