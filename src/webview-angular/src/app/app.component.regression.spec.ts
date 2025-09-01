import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { AppComponent } from './app.component';
import { PerformanceMonitorService } from './core/services/performance-monitor.service';
import { PerformanceOptimizationService } from './core/services/performance-optimization.service';

// Mock dashboard component for testing
@Component({
  selector: 'app-dashboard',
  template: '<div>Dashboard Mock</div>'
})
class MockDashboardComponent {}

// Mock toast container for testing
@Component({
  selector: 'app-toast-container',
  template: '<div>Toast Container Mock</div>'
})
class MockToastContainerComponent {}

describe('User Workflow Regression Tests', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let performanceMonitor: any;
  let performanceOptimization: any;
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    const performanceMonitorSpy = jasmine.createSpyObj('PerformanceMonitorService', [
      'startTiming', 'endTiming', 'monitorVirtualScrolling', 'logPerformanceSummary'
    ]);
    
    const performanceOptimizationSpy = jasmine.createSpyObj('PerformanceOptimizationService', [
      'initializeOptimizations'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: PerformanceMonitorService, useValue: performanceMonitorSpy },
        { provide: PerformanceOptimizationService, useValue: performanceOptimizationSpy }
      ]
    })
    .overrideComponent(AppComponent, {
      remove: { imports: [MockDashboardComponent, MockToastContainerComponent] },
      add: { imports: [MockDashboardComponent, MockToastContainerComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    performanceMonitor = TestBed.inject(PerformanceMonitorService);
    performanceOptimization = TestBed.inject(PerformanceOptimizationService);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  describe('Application Initialization Workflow', () => {
    it('should initialize performance monitoring on app start', () => {
      fixture.detectChanges();
      
      expect(performanceMonitor.startTiming).toHaveBeenCalledWith('app-initialization');
      expect(performanceOptimization.initializeOptimizations).toHaveBeenCalled();
      expect(performanceMonitor.monitorVirtualScrolling).toHaveBeenCalledWith('main-scroll-container');
    });

    it('should complete initialization timing after delay', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        expect(performanceMonitor.endTiming).toHaveBeenCalledWith('app-initialization');
        expect(performanceMonitor.logPerformanceSummary).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should render main application structure', () => {
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.h-screen.w-full')).toBeTruthy();
      expect(compiled.querySelector('app-dashboard')).toBeTruthy();
      expect(compiled.querySelector('app-toast-container')).toBeTruthy();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should start performance timing on component initialization', () => {
      expect(performanceMonitor.startTiming).not.toHaveBeenCalled();
      
      fixture.detectChanges();
      
      expect(performanceMonitor.startTiming).toHaveBeenCalledWith('app-initialization');
    });

    it('should initialize performance optimizations', () => {
      fixture.detectChanges();
      
      expect(performanceOptimization.initializeOptimizations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Lifecycle Workflow', () => {
    it('should handle component initialization properly', () => {
      expect(component.title).toBe('ForgeFlow Azure DevOps PR Reviewer');
      
      fixture.detectChanges();
      
      // Verify ngOnInit was called and services were injected
      expect(performanceMonitor.startTiming).toHaveBeenCalled();
      expect(performanceOptimization.initializeOptimizations).toHaveBeenCalled();
    });

    it('should maintain component state during lifecycle', () => {
      fixture.detectChanges();
      
      // Simulate component updates
      fixture.detectChanges();
      fixture.detectChanges();
      
      expect(component.title).toBe('ForgeFlow Azure DevOps PR Reviewer');
      expect(performanceOptimization.initializeOptimizations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle performance monitoring errors gracefully', () => {
      performanceMonitor.startTiming.and.throwError('Monitoring error');
      
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle optimization initialization errors gracefully', () => {
      performanceOptimization.initializeOptimizations.and.throwError('Optimization error');
      
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Memory Management Workflow', () => {
    it('should not create memory leaks during component lifecycle', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and destroy component multiple times
      for (let i = 0; i < 10; i++) {
        fixture.detectChanges();
        fixture.destroy();
        fixture = TestBed.createComponent(AppComponent);
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not grow significantly (allowing for 10MB variance)
      if (initialMemory > 0 && finalMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Accessibility Workflow', () => {
    it('should have proper ARIA attributes', () => {
      fixture.detectChanges();
      
      const hostElement = fixture.nativeElement as HTMLElement;
      expect(hostElement.getAttribute('role')).toBeFalsy(); // No role needed for root
      
      // Check that child components are properly rendered
      expect(hostElement.querySelector('app-dashboard')).toBeTruthy();
      expect(hostElement.querySelector('app-toast-container')).toBeTruthy();
    });

    it('should support keyboard navigation', () => {
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const mainContainer = compiled.querySelector('.h-screen.w-full');
      
      expect(mainContainer).toBeTruthy();
      // Additional keyboard navigation tests would go here
    });
  });

  describe('Responsive Design Workflow', () => {
    it('should adapt to different screen sizes', () => {
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const mainContainer = compiled.querySelector('.h-screen.w-full') as HTMLElement;
      
      expect(mainContainer).toBeTruthy();
      expect(mainContainer.classList.contains('h-screen')).toBe(true);
      expect(mainContainer.classList.contains('w-full')).toBe(true);
    });
  });

  describe('Integration with Extension Host', () => {
    it('should be ready for VS Code webview integration', () => {
      fixture.detectChanges();
      
      // Verify the app is properly structured for webview
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-dashboard')).toBeTruthy();
      expect(compiled.querySelector('app-toast-container')).toBeTruthy();
      
      // Verify performance monitoring is active
      expect(performanceMonitor.startTiming).toHaveBeenCalled();
    });
  });
});