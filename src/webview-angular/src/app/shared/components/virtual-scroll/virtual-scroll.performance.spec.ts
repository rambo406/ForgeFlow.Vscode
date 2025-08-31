import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { VirtualScrollComponent, VirtualScrollConfig } from './virtual-scroll.component';

interface PerformanceTestItem {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  metadata: Record<string, any>;
}

@Component({
  template: `
    <app-virtual-scroll
      [items]="items"
      [itemTemplate]="itemTemplate"
      [containerHeight]="containerHeight"
      [config]="config"
    ></app-virtual-scroll>
    
    <ng-template #itemTemplate let-item let-index="index">
      <div class="performance-test-item">
        <div class="item-header">
          <h4>{{ item.name }}</h4>
          <span class="category">{{ item.category }}</span>
        </div>
        <p class="description">{{ item.description }}</p>
        <div class="tags">
          <span class="tag" *ngFor="let tag of item.tags">{{ tag }}</span>
        </div>
        <div class="metadata">
          <div *ngFor="let entry of getMetadataEntries(item.metadata)" class="metadata-item">
            <strong>{{ entry.key }}:</strong> {{ entry.value }}
          </div>
        </div>
        <div class="index">Index: {{ index }}</div>
      </div>
    </ng-template>
  `,
  styles: [`
    .performance-test-item {
      padding: 16px;
      border: 1px solid #ddd;
      margin-bottom: 8px;
      background: white;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .category {
      background: #e0e0e0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .tags {
      display: flex;
      gap: 4px;
      margin: 8px 0;
    }
    
    .tag {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }
    
    .metadata {
      margin: 8px 0;
      font-size: 12px;
    }
    
    .metadata-item {
      margin: 2px 0;
    }
    
    .index {
      color: #666;
      font-size: 11px;
    }
  `]
})
class PerformanceTestHostComponent {
  @ViewChild('itemTemplate', { static: true }) itemTemplate!: TemplateRef<any>;
  
  items: PerformanceTestItem[] = [];
  containerHeight = 500;
  config: VirtualScrollConfig = {
    itemHeight: 120,
    bufferSize: 5,
    threshold: 0.8,
    enableDynamicHeight: false
  };

  getMetadataEntries(metadata: Record<string, any>): Array<{key: string, value: any}> {
    return Object.entries(metadata).map(([key, value]) => ({ key, value }));
  }
}

describe('VirtualScrollComponent Performance Tests', () => {
  let component: VirtualScrollComponent;
  let hostComponent: PerformanceTestHostComponent;
  let fixture: ComponentFixture<PerformanceTestHostComponent>;

  const generateComplexTestItems = (count: number): PerformanceTestItem[] => {
    const categories = ['Development', 'Testing', 'Documentation', 'Bug Fix', 'Feature'];
    const tagPool = ['urgent', 'frontend', 'backend', 'api', 'ui', 'performance', 'security', 'refactor'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Complex Item ${i + 1}`,
      description: `This is a detailed description for item ${i + 1}. It contains multiple sentences and detailed information about the item's purpose, functionality, and implementation details.`,
      category: categories[i % categories.length],
      tags: tagPool.slice(0, (i % 4) + 1),
      metadata: {
        createdAt: new Date(2024, 0, (i % 28) + 1).toISOString(),
        priority: i % 5 + 1,
        assignee: `User ${(i % 10) + 1}`,
        status: ['open', 'in-progress', 'review', 'closed'][i % 4],
        estimation: `${(i % 8) + 1}h`,
        complexity: ['low', 'medium', 'high'][i % 3]
      }
    }));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollComponent],
      declarations: [PerformanceTestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PerformanceTestHostComponent);
    hostComponent = fixture.componentInstance;
    component = fixture.debugElement.query(
      By.directive(VirtualScrollComponent)
    ).componentInstance;
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1,000 items efficiently', (done) => {
      const startTime = performance.now();
      
      hostComponent.items = generateComplexTestItems(1000);
      fixture.detectChanges();
      
      setTimeout(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`Render time for 1,000 items: ${renderTime.toFixed(2)}ms`);
        
        // Should render quickly (under 100ms on modern hardware)
        expect(renderTime).toBeLessThan(200);
        
        // Should only render visible items
        const renderedItems = fixture.debugElement.queryAll(By.css('.performance-test-item'));
        expect(renderedItems.length).toBeLessThan(50); // Much less than 1,000
        expect(renderedItems.length).toBeGreaterThan(0);
        
        done();
      }, 50);
    });

    it('should handle 10,000 items efficiently', (done) => {
      const startTime = performance.now();
      
      hostComponent.items = generateComplexTestItems(10000);
      fixture.detectChanges();
      
      setTimeout(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`Render time for 10,000 items: ${renderTime.toFixed(2)}ms`);
        
        // Should still render quickly even with large dataset
        expect(renderTime).toBeLessThan(300);
        
        // Should only render visible items
        const renderedItems = fixture.debugElement.queryAll(By.css('.performance-test-item'));
        expect(renderedItems.length).toBeLessThan(100); // Much less than 10,000
        expect(renderedItems.length).toBeGreaterThan(0);
        
        done();
      }, 50);
    });

    it('should handle 100,000 items without performance degradation', (done) => {
      const startTime = performance.now();
      
      hostComponent.items = generateComplexTestItems(100000);
      fixture.detectChanges();
      
      setTimeout(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`Render time for 100,000 items: ${renderTime.toFixed(2)}ms`);
        
        // Should scale well with large datasets
        expect(renderTime).toBeLessThan(500);
        
        // Should only render visible items regardless of total count
        const renderedItems = fixture.debugElement.queryAll(By.css('.performance-test-item'));
        expect(renderedItems.length).toBeLessThan(100);
        expect(renderedItems.length).toBeGreaterThan(0);
        
        done();
      }, 100);
    });
  });

  describe('Scroll Performance', () => {
    beforeEach(() => {
      hostComponent.items = generateComplexTestItems(5000);
      fixture.detectChanges();
    });

    it('should handle rapid scrolling efficiently', (done) => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const element = scrollContainer.nativeElement;
      
      const startTime = performance.now();
      let scrollCount = 0;
      const targetScrolls = 100;
      
      const rapidScroll = () => {
        if (scrollCount < targetScrolls) {
          element.scrollTop = scrollCount * 10;
          scrollContainer.triggerEventHandler('scroll', { target: element });
          scrollCount++;
          requestAnimationFrame(rapidScroll);
        } else {
          const endTime = performance.now();
          const scrollTime = endTime - startTime;
          
          console.log(`Time for ${targetScrolls} scroll events: ${scrollTime.toFixed(2)}ms`);
          
          // Should handle rapid scrolling without blocking
          expect(scrollTime).toBeLessThan(1000);
          
          done();
        }
      };
      
      rapidScroll();
    });

    it('should maintain smooth scrolling with complex items', (done) => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const element = scrollContainer.nativeElement;
      
      const scrollPositions = [0, 1000, 2000, 3000, 4000, 5000];
      let currentIndex = 0;
      
      const measureScrollTime = () => {
        if (currentIndex >= scrollPositions.length) {
          done();
          return;
        }
        
        const startTime = performance.now();
        element.scrollTop = scrollPositions[currentIndex];
        scrollContainer.triggerEventHandler('scroll', { target: element });
        
        setTimeout(() => {
          const endTime = performance.now();
          const scrollTime = endTime - startTime;
          
          console.log(`Scroll to position ${scrollPositions[currentIndex]}: ${scrollTime.toFixed(2)}ms`);
          
          // Each scroll should be quick
          expect(scrollTime).toBeLessThan(50);
          
          currentIndex++;
          measureScrollTime();
        }, 10);
      };
      
      measureScrollTime();
    });
  });

  describe('Memory Usage', () => {
    it('should maintain constant DOM size regardless of data size', () => {
      // Test with small dataset
      hostComponent.items = generateComplexTestItems(100);
      fixture.detectChanges();
      
      const smallDatasetElements = fixture.debugElement.queryAll(By.css('.performance-test-item'));
      const smallDatasetCount = smallDatasetElements.length;
      
      // Test with large dataset
      hostComponent.items = generateComplexTestItems(50000);
      fixture.detectChanges();
      
      const largeDatasetElements = fixture.debugElement.queryAll(By.css('.performance-test-item'));
      const largeDatasetCount = largeDatasetElements.length;
      
      // DOM size should be similar regardless of data size
      expect(Math.abs(largeDatasetCount - smallDatasetCount)).toBeLessThan(20);
      
      console.log(`DOM elements with 100 items: ${smallDatasetCount}`);
      console.log(`DOM elements with 50,000 items: ${largeDatasetCount}`);
    });

    it('should properly clean up when items are removed', () => {
      // Start with large dataset
      hostComponent.items = generateComplexTestItems(10000);
      fixture.detectChanges();
      
      const initialElements = fixture.debugElement.queryAll(By.css('.performance-test-item'));
      const initialCount = initialElements.length;
      
      // Reduce to small dataset
      hostComponent.items = generateComplexTestItems(10);
      fixture.detectChanges();
      
      const reducedElements = fixture.debugElement.queryAll(By.css('.performance-test-item'));
      const reducedCount = reducedElements.length;
      
      // Should have fewer DOM elements after reduction
      expect(reducedCount).toBeLessThanOrEqual(initialCount);
      expect(reducedCount).toBeLessThanOrEqual(15); // Should be close to 10 items + buffer
      
      console.log(`DOM elements before reduction: ${initialCount}`);
      console.log(`DOM elements after reduction: ${reducedCount}`);
    });
  });

  describe('Dynamic Height Performance', () => {
    beforeEach(() => {
      hostComponent.config = {
        ...hostComponent.config,
        enableDynamicHeight: true
      };
    });

    it('should handle dynamic height calculations efficiently', (done) => {
      const startTime = performance.now();
      
      hostComponent.items = generateComplexTestItems(1000);
      fixture.detectChanges();
      
      setTimeout(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`Dynamic height render time for 1,000 items: ${renderTime.toFixed(2)}ms`);
        
        // Dynamic height should still be reasonably fast
        expect(renderTime).toBeLessThan(400);
        
        // Should render items without fixed height
        const itemElements = fixture.debugElement.queryAll(By.css('.virtual-scroll-item'));
        itemElements.forEach(item => {
          expect(item.nativeElement.style.height).toBeFalsy();
        });
        
        done();
      }, 100);
    });
  });

  describe('Configuration Impact on Performance', () => {
    it('should scale buffer size impact linearly', () => {
      const measurements: Array<{bufferSize: number, renderTime: number, elementCount: number}> = [];
      const bufferSizes = [1, 5, 10, 20];
      
      bufferSizes.forEach(bufferSize => {
        hostComponent.config = { ...hostComponent.config, bufferSize };
        
        const startTime = performance.now();
        hostComponent.items = generateComplexTestItems(1000);
        fixture.detectChanges();
        const endTime = performance.now();
        
        const renderTime = endTime - startTime;
        const elementCount = fixture.debugElement.queryAll(By.css('.performance-test-item')).length;
        
        measurements.push({ bufferSize, renderTime, elementCount });
        
        console.log(`Buffer ${bufferSize}: ${renderTime.toFixed(2)}ms, ${elementCount} elements`);
      });
      
      // Larger buffer should result in more elements but reasonable render times
      const firstMeasurement = measurements[0];
      const lastMeasurement = measurements[measurements.length - 1];
      
      expect(lastMeasurement.elementCount).toBeGreaterThan(firstMeasurement.elementCount);
      expect(lastMeasurement.renderTime).toBeLessThan(firstMeasurement.renderTime * 3); // Should scale reasonably
    });

    it('should handle different item heights efficiently', () => {
      const itemHeights = [50, 100, 200, 400];
      
      itemHeights.forEach(itemHeight => {
        hostComponent.config = { ...hostComponent.config, itemHeight };
        
        const startTime = performance.now();
        hostComponent.items = generateComplexTestItems(1000);
        fixture.detectChanges();
        const endTime = performance.now();
        
        const renderTime = endTime - startTime;
        
        console.log(`Item height ${itemHeight}px: ${renderTime.toFixed(2)}ms`);
        
        // Render time should be consistent regardless of item height
        expect(renderTime).toBeLessThan(200);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle extremely rapid data updates', (done) => {
      let updateCount = 0;
      const maxUpdates = 50;
      const startTime = performance.now();
      
      const rapidUpdate = () => {
        if (updateCount < maxUpdates) {
          hostComponent.items = generateComplexTestItems(1000 + updateCount * 100);
          fixture.detectChanges();
          updateCount++;
          setTimeout(rapidUpdate, 10);
        } else {
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          
          console.log(`${maxUpdates} rapid updates completed in: ${totalTime.toFixed(2)}ms`);
          
          // Should handle rapid updates without excessive delays
          expect(totalTime).toBeLessThan(5000);
          
          done();
        }
      };
      
      rapidUpdate();
    });

    it('should handle concurrent scrolling and data updates', (done) => {
      hostComponent.items = generateComplexTestItems(5000);
      fixture.detectChanges();
      
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const element = scrollContainer.nativeElement;
      
      let operationCount = 0;
      const maxOperations = 100;
      const startTime = performance.now();
      
      const concurrentOperation = () => {
        if (operationCount < maxOperations) {
          // Alternate between scrolling and data updates
          if (operationCount % 2 === 0) {
            element.scrollTop = operationCount * 20;
            scrollContainer.triggerEventHandler('scroll', { target: element });
          } else {
            // Update a portion of the data
            const newItems = [...hostComponent.items];
            newItems[operationCount] = generateComplexTestItems(1)[0];
            hostComponent.items = newItems;
            fixture.detectChanges();
          }
          
          operationCount++;
          requestAnimationFrame(concurrentOperation);
        } else {
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          
          console.log(`${maxOperations} concurrent operations completed in: ${totalTime.toFixed(2)}ms`);
          
          // Should handle concurrent operations efficiently
          expect(totalTime).toBeLessThan(3000);
          
          done();
        }
      };
      
      concurrentOperation();
    });
  });
});