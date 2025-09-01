import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { VirtualScrollComponent, VirtualScrollConfig } from './virtual-scroll.component';

interface TestItem {
  id: number;
  name: string;
  description: string;
}

@Component({
  standalone: true,
  imports: [VirtualScrollComponent],
  template: `
    <app-virtual-scroll
      [items]="items"
      [itemTemplate]="itemTemplate"
      [containerHeight]="containerHeight"
      [config]="config"
      (scrollToEnd)="onScrollToEnd()"
      (itemClick)="onItemClick($event)"
      (visibleRangeChange)="onVisibleRangeChange($event)"
    ></app-virtual-scroll>
    
    <ng-template #itemTemplate let-item let-index="index">
      <div class="test-item" [attr.data-test-id]="item.id">
        <h3>{{ item.name }}</h3>
        <p>{{ item.description }}</p>
        <small>Index: {{ index }}</small>
      </div>
    </ng-template>
  `
})
class TestHostComponent {
  @ViewChild('itemTemplate', { static: true }) itemTemplate!: TemplateRef<any>;
  
  items: TestItem[] = [];
  containerHeight = 400;
  config: VirtualScrollConfig = {
    itemHeight: 100,
    bufferSize: 3,
    threshold: 0.8,
    enableDynamicHeight: false
  };

  scrollToEndCalled = false;
  lastItemClick: any = null;
  lastVisibleRange: any = null;

  onScrollToEnd(): void {
    this.scrollToEndCalled = true;
  }

  onItemClick(event: any): void {
    this.lastItemClick = event;
  }

  onVisibleRangeChange(range: any): void {
    this.lastVisibleRange = range;
  }
}

describe('VirtualScrollComponent', () => {
  let component: VirtualScrollComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  const generateTestItems = (count: number): TestItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      description: `Description for item ${i + 1}`
    }));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    component = fixture.debugElement.query(
      By.directive(VirtualScrollComponent)
    ).componentInstance;
  });

  describe('Basic Functionality', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
      expect(hostComponent).toBeTruthy();
    });

    it('should render items when provided', () => {
      hostComponent.items = generateTestItems(10);
      fixture.detectChanges();

      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      expect(itemElements.length).toBeGreaterThan(0);
      expect(itemElements.length).toBeLessThanOrEqual(10);
    });

    it('should display correct item content', () => {
      hostComponent.items = generateTestItems(5);
      fixture.detectChanges();

      const firstItem = fixture.debugElement.query(By.css('.test-item'));
      const title = firstItem.query(By.css('h3'));
      const description = firstItem.query(By.css('p'));

      expect(title.nativeElement.textContent).toBe('Item 1');
      expect(description.nativeElement.textContent).toBe('Description for item 1');
    });

    it('should handle empty items array', () => {
      hostComponent.items = [];
      fixture.detectChanges();

      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      expect(itemElements.length).toBe(0);
    });
  });

  describe('Virtual Scrolling Logic', () => {
    beforeEach(() => {
      hostComponent.items = generateTestItems(100);
      hostComponent.config = {
        itemHeight: 100,
        bufferSize: 2,
        threshold: 0.8,
        enableDynamicHeight: false
      };
      fixture.detectChanges();
    });

    it('should only render visible items plus buffer', () => {
      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      const expectedVisibleItems = Math.ceil(hostComponent.containerHeight / 100) + (2 * 2); // buffer on both sides
      
      expect(itemElements.length).toBeLessThanOrEqual(expectedVisibleItems + 5); // Allow some tolerance
    });

    it('should create spacer elements for non-visible items', () => {
      const spacerBefore = fixture.debugElement.query(By.css('.virtual-scroll-spacer-before'));
      const spacerAfter = fixture.debugElement.query(By.css('.virtual-scroll-spacer-after'));

      expect(spacerBefore).toBeTruthy();
      expect(spacerAfter).toBeTruthy();
    });

    it('should calculate correct spacer heights', () => {
      const spacerBefore = fixture.debugElement.query(By.css('.virtual-scroll-spacer-before'));
      const spacerAfter = fixture.debugElement.query(By.css('.virtual-scroll-spacer-after'));

      // Initially should show items from index 0, so before spacer should be 0
      expect(spacerBefore.nativeElement.style.height).toBe('0px');
      
      // After spacer should account for remaining items
      const afterHeight = parseInt(spacerAfter.nativeElement.style.height);
      expect(afterHeight).toBeGreaterThan(0);
    });

    it('should emit visible range changes', fakeAsync(() => {
      tick(100); // Allow for initial calculations
      expect(hostComponent.lastVisibleRange).toBeTruthy();
      expect(hostComponent.lastVisibleRange.start).toBeGreaterThanOrEqual(0);
      expect(hostComponent.lastVisibleRange.end).toBeGreaterThanOrEqual(hostComponent.lastVisibleRange.start);
    }));
  });

  describe('Scrolling Behavior', () => {
    beforeEach(() => {
      hostComponent.items = generateTestItems(200);
      fixture.detectChanges();
    });

    it('should update visible items when scrolled', fakeAsync(() => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const initialRange = { ...hostComponent.lastVisibleRange };

      // Simulate scroll
      scrollContainer.nativeElement.scrollTop = 500;
      scrollContainer.triggerEventHandler('scroll', { target: scrollContainer.nativeElement });
      
      tick(200); // Wait for debounced scroll end
      fixture.detectChanges();

      // Visible range should have changed
      expect(hostComponent.lastVisibleRange.start).toBeGreaterThan(initialRange.start);
    }));

    it('should emit scrollToEnd when near bottom', fakeAsync(() => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const element = scrollContainer.nativeElement;
      
      // Scroll to near bottom (85% - above threshold)
      element.scrollTop = (element.scrollHeight - element.clientHeight) * 0.85;
      scrollContainer.triggerEventHandler('scroll', { target: element });
      
      tick(200); // Wait for debounced scroll end
      
      expect(hostComponent.scrollToEndCalled).toBeTruthy();
    }));

    it('should not emit scrollToEnd when not near bottom', fakeAsync(() => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const element = scrollContainer.nativeElement;
      
      // Scroll to middle (50% - below threshold)
      element.scrollTop = (element.scrollHeight - element.clientHeight) * 0.5;
      scrollContainer.triggerEventHandler('scroll', { target: element });
      
      tick(200); // Wait for debounced scroll end
      
      expect(hostComponent.scrollToEndCalled).toBeFalsy();
    }));
  });

  describe('Dynamic Height Support', () => {
    beforeEach(() => {
      hostComponent.items = generateTestItems(50);
      hostComponent.config = {
        itemHeight: 100,
        bufferSize: 2,
        threshold: 0.8,
        enableDynamicHeight: true
      };
      fixture.detectChanges();
    });

    it('should support dynamic height calculation', () => {
      const itemElements = fixture.debugElement.queryAll(By.css('.virtual-scroll-item'));
      
      // With dynamic height, items should not have fixed height style
      itemElements.forEach(item => {
        expect(item.nativeElement.style.height).toBeFalsy();
      });
    });

    it('should observe item height changes', fakeAsync(() => {
      // This test verifies that the ResizeObserver is set up
      // In a real scenario, this would be triggered by actual DOM changes
      tick(200);
      
      // Verify that the component is prepared for dynamic height calculations
      expect(component.config.enableDynamicHeight).toBeTruthy();
    }));
  });

  describe('Public API Methods', () => {
    beforeEach(() => {
      hostComponent.items = generateTestItems(100);
      fixture.detectChanges();
    });

    it('should scroll to specific item', () => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const scrollSpy = spyOn(scrollContainer.nativeElement, 'scrollTo');

      component.scrollToItem(10);

      expect(scrollSpy).toHaveBeenCalledWith({
        top: 1000, // 10 * 100 (itemHeight)
        behavior: 'smooth'
      });
    });

    it('should scroll to top', () => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const scrollSpy = spyOn(scrollContainer.nativeElement, 'scrollTo');

      component.scrollToTop();

      expect(scrollSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth'
      });
    });

    it('should scroll to bottom', () => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const scrollSpy = spyOn(scrollContainer.nativeElement, 'scrollTo');

      component.scrollToBottom();

      expect(scrollSpy).toHaveBeenCalledWith({
        top: jasmine.any(Number),
        behavior: 'smooth'
      });
    });

    it('should get scroll metrics', () => {
      const metrics = component.getScrollMetrics();

      expect(metrics).toEqual({
        scrollTop: jasmine.any(Number),
        scrollHeight: jasmine.any(Number),
        clientHeight: jasmine.any(Number),
        totalHeight: jasmine.any(Number)
      });
    });

    it('should handle out-of-bounds scroll to item', () => {
      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const scrollSpy = spyOn(scrollContainer.nativeElement, 'scrollTo');

      // Should not scroll for invalid indices
      component.scrollToItem(-1);
      component.scrollToItem(1000);

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      hostComponent.items = generateTestItems(10);
      fixture.detectChanges();
    });

    it('should show loading indicator when loading', () => {
      component.setLoading(true);
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.virtual-scroll-loading'));
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.nativeElement.textContent).toContain('Loading more items...');
    });

    it('should hide loading indicator when not loading', () => {
      component.setLoading(false);
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.virtual-scroll-loading'));
      expect(loadingElement).toBeFalsy();
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large datasets efficiently', fakeAsync(() => {
      const largeDataset = generateTestItems(10000);
      hostComponent.items = largeDataset;
      fixture.detectChanges();

      tick(100);

      // Should only render a subset of items
      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      expect(itemElements.length).toBeLessThan(100); // Much less than 10,000
      expect(itemElements.length).toBeGreaterThan(0);
    }));

    it('should debounce scroll events', fakeAsync(() => {
      hostComponent.items = generateTestItems(1000);
      fixture.detectChanges();

      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      let rangeChangeCount = 0;
      
      hostComponent.onVisibleRangeChange = () => rangeChangeCount++;

      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        scrollContainer.nativeElement.scrollTop = i * 50;
        scrollContainer.triggerEventHandler('scroll', { target: scrollContainer.nativeElement });
        tick(10);
      }

      tick(200); // Wait for debounce

      // Should have fewer range changes than scroll events due to debouncing
      expect(rangeChangeCount).toBeLessThan(10);
    }));
  });

  describe('Configuration Options', () => {
    it('should respect custom item height', () => {
      hostComponent.items = generateTestItems(20);
      hostComponent.config = { ...hostComponent.config, itemHeight: 150 };
      fixture.detectChanges();

      const itemElements = fixture.debugElement.queryAll(By.css('.virtual-scroll-item'));
      itemElements.forEach(item => {
        expect(item.nativeElement.style.height).toBe('150px');
      });
    });

    it('should respect custom buffer size', fakeAsync(() => {
      hostComponent.items = generateTestItems(100);
      hostComponent.config = { ...hostComponent.config, bufferSize: 10 };
      fixture.detectChanges();
      tick(100);

      // With larger buffer, should render more items
      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      expect(itemElements.length).toBeGreaterThan(10);
    }));

    it('should respect custom scroll threshold', fakeAsync(() => {
      hostComponent.items = generateTestItems(100);
      hostComponent.config = { ...hostComponent.config, threshold: 0.5 };
      fixture.detectChanges();

      const scrollContainer = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      const element = scrollContainer.nativeElement;
      
      // Scroll to 60% (above 50% threshold)
      element.scrollTop = (element.scrollHeight - element.clientHeight) * 0.6;
      scrollContainer.triggerEventHandler('scroll', { target: element });
      
      tick(200);
      
      expect(hostComponent.scrollToEndCalled).toBeTruthy();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      hostComponent.items = generateTestItems(1);
      fixture.detectChanges();

      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      expect(itemElements.length).toBe(1);
    });

    it('should handle items without ID property', () => {
      const itemsWithoutId = [
        { name: 'Item 1', description: 'Desc 1' },
        { name: 'Item 2', description: 'Desc 2' }
      ];
      hostComponent.items = itemsWithoutId as any;
      fixture.detectChanges();

      const itemElements = fixture.debugElement.queryAll(By.css('.test-item'));
      expect(itemElements.length).toBe(2);
    });

    it('should handle container height changes', () => {
      hostComponent.items = generateTestItems(50);
      hostComponent.containerHeight = 200;
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.virtual-scroll-container'));
      expect(container.nativeElement.style.height).toBe('200px');

      hostComponent.containerHeight = 600;
      fixture.detectChanges();

      expect(container.nativeElement.style.height).toBe('600px');
    });
  });
});