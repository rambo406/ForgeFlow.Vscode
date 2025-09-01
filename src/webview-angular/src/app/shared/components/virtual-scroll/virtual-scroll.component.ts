import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  TemplateRef, 
  ViewChild, 
  ElementRef, 
  AfterViewInit, 
  OnDestroy, 
  ChangeDetectionStrategy,
  computed,
  signal,
  effect,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VirtualScrollItem<T = unknown> {
  id: string | number;
  data: T;
  height?: number;
}

export interface VirtualScrollConfig {
  itemHeight?: number;
  bufferSize?: number;
  threshold?: number;
  enableDynamicHeight?: boolean;
}

interface VisibleRange {
  start: number;
  end: number;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  totalHeight: number;
}

@Component({
  selector: 'app-virtual-scroll',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      #scrollContainer
      class="virtual-scroll-container"
      [style.height.px]="containerHeight()"
      [style.overflow]="'auto'"
      (scroll)="onScroll($event)"
    >
      <!-- Spacer before visible items -->
      <div 
        class="virtual-scroll-spacer-before"
        [style.height.px]="beforeHeight()"
      ></div>
      
      <!-- Visible items -->
      <div class="virtual-scroll-visible-items">
        @for (item of visibleItems(); track item.id; let i = $index) {
          <div 
            #itemElement
            class="virtual-scroll-item"
            [style.height.px]="config().enableDynamicHeight ? null : config().itemHeight"
            [attr.data-index]="startIndex() + i"
            [attr.data-item-id]="item.id"
          >
            <ng-container 
              *ngTemplateOutlet="itemTemplate(); context: { 
                $implicit: item.data, 
                index: startIndex() + i,
                id: item.id 
              }"
            ></ng-container>
          </div>
        }
      </div>
      
      <!-- Spacer after visible items -->
      <div 
        class="virtual-scroll-spacer-after"
        [style.height.px]="afterHeight()"
      ></div>
    </div>
    
    <!-- Loading indicator -->
    @if (isLoading()) {
      <div class="virtual-scroll-loading">
        <div class="loading-spinner"></div>
        <span>Loading more items...</span>
      </div>
    }
  `,
  styles: [`
    .virtual-scroll-container {
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .virtual-scroll-item {
      position: relative;
    }
    
    .virtual-scroll-loading {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      border-top: 1px solid var(--border);
    }
    
    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--muted);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Smooth scrolling */
    .virtual-scroll-container {
      scroll-behavior: smooth;
    }
    
    /* Custom scrollbar */
    .virtual-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .virtual-scroll-container::-webkit-scrollbar-track {
      background: var(--muted);
      border-radius: 4px;
    }
    
    .virtual-scroll-container::-webkit-scrollbar-thumb {
      background: var(--muted-foreground);
      border-radius: 4px;
    }
    
    .virtual-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--foreground);
    }
  `]
})
export class VirtualScrollComponent<T = unknown> implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true }) 
  scrollContainer!: ElementRef<HTMLElement>;

  // Signal-based inputs
  items = input<T[]>([]);
  itemTemplate = input.required<TemplateRef<unknown>>();
  containerHeight = input(400);
  config = input<VirtualScrollConfig>({
    itemHeight: 60,
    bufferSize: 5,
    threshold: 0.8,
    enableDynamicHeight: false
  });

  // Signal-based outputs
  scrollToEnd = output<void>();
  itemClick = output<{ item: T; index: number }>();
  visibleRangeChange = output<VisibleRange>();

  // Signals for reactive state management
  private scrollTop = signal(0);
  private itemHeights = signal<Map<number, number>>(new Map());
  private isScrolling = signal(false);
  isLoading = signal(false);

  // Computed signals for virtual scrolling calculations
  private totalItems = computed(() => this.items().length);
  
  private visibleRange = computed(() => {
    const scrollTop = this.scrollTop();
    const containerHeight = this.containerHeight();
    const config = this.config();
    const itemHeight = config.itemHeight || 60;
    const bufferSize = config.bufferSize || 5;

    if (config.enableDynamicHeight) {
      return this.calculateDynamicVisibleRange(scrollTop, containerHeight, bufferSize);
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const endIndex = Math.min(
      this.totalItems() - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
    );

    return { start: startIndex, end: endIndex };
  });

  startIndex = computed(() => this.visibleRange().start);
  endIndex = computed(() => this.visibleRange().end);

  visibleItems = computed(() => {
    const range = this.visibleRange();
    const config = this.config();
    return this.items().slice(range.start, range.end + 1).map((item: T, index: number): VirtualScrollItem<T> => ({
      id: this.getItemId(item, range.start + index),
      data: item,
      height: config.enableDynamicHeight ? 
        this.itemHeights().get(range.start + index) : 
        config.itemHeight
    }));
  });

  beforeHeight = computed(() => {
    const range = this.visibleRange();
    const config = this.config();
    if (config.enableDynamicHeight) {
      return this.calculateDynamicOffset(0, range.start);
    }
    return range.start * (config.itemHeight || 60);
  });

  afterHeight = computed(() => {
    const range = this.visibleRange();
    const totalItems = this.totalItems();
    const config = this.config();
    if (config.enableDynamicHeight) {
      return this.calculateDynamicOffset(range.end + 1, totalItems);
    }
    return (totalItems - range.end - 1) * (config.itemHeight || 60);
  });

  private scrollTimeoutId?: number;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;

  constructor() {
    // Effect to emit visible range changes
    effect(() => {
      const range = this.visibleRange();
      this.visibleRangeChange.emit(range);
    });

    // Effect to handle dynamic height calculations
    effect(() => {
      const config = this.config();
      if (config.enableDynamicHeight) {
        this.updateItemHeights();
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupDynamicHeightObserver();
    this.initialScroll();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    
    this.scrollTop.set(scrollTop);
    this.isScrolling.set(true);

    // Debounce scroll end detection
    if (this.scrollTimeoutId) {
      clearTimeout(this.scrollTimeoutId);
    }

    this.scrollTimeoutId = window.setTimeout(() => {
      this.isScrolling.set(false);
      this.checkScrollToEnd(target);
    }, 150);
  }

  private checkScrollToEnd(container: HTMLElement): void {
    const config = this.config();
    const threshold = config.threshold || 0.8;
    const scrollPercentage = 
      (container.scrollTop + container.clientHeight) / container.scrollHeight;

    if (scrollPercentage >= threshold) {
      this.scrollToEnd.emit();
    }
  }

  private calculateDynamicVisibleRange(
    scrollTop: number, 
    containerHeight: number, 
    bufferSize: number
  ): VisibleRange {
    const heights = this.itemHeights();
    const config = this.config();
    let currentOffset = 0;
    let startIndex = 0;
    let endIndex = 0;

    // Find start index
    for (let i = 0; i < this.totalItems(); i++) {
      const itemHeight = heights.get(i) || config.itemHeight || 60;
      if (currentOffset + itemHeight > scrollTop) {
        startIndex = Math.max(0, i - bufferSize);
        break;
      }
      currentOffset += itemHeight;
    }

    // Find end index
    currentOffset = this.calculateDynamicOffset(0, startIndex);
    for (let i = startIndex; i < this.totalItems(); i++) {
      const itemHeight = heights.get(i) || config.itemHeight || 60;
      if (currentOffset > scrollTop + containerHeight) {
        endIndex = Math.min(this.totalItems() - 1, i + bufferSize);
        break;
      }
      currentOffset += itemHeight;
    }

    if (endIndex === 0) {
      endIndex = this.totalItems() - 1;
    }

    return { start: startIndex, end: endIndex };
  }

  private calculateDynamicOffset(startIndex: number, endIndex: number): number {
    const heights = this.itemHeights();
    const config = this.config();
    let offset = 0;

    for (let i = startIndex; i < endIndex; i++) {
      offset += heights.get(i) || config.itemHeight || 60;
    }

    return offset;
  }

  private setupDynamicHeightObserver(): void {
    const config = this.config();
    if (!config.enableDynamicHeight) return;

    // Observe size changes to item elements
    this.resizeObserver = new ResizeObserver((entries) => {
      const heightsMap = new Map(this.itemHeights());
      let hasChanges = false;

      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const index = parseInt(element.getAttribute('data-index') || '0', 10);
        const height = entry.contentRect.height;

        if (heightsMap.get(index) !== height) {
          heightsMap.set(index, height);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        this.itemHeights.set(heightsMap);
      }
    });

    // Observe DOM mutations to track new items
    this.mutationObserver = new MutationObserver(() => {
      this.updateItemHeights();
    });

    const container = this.scrollContainer.nativeElement;
    this.mutationObserver.observe(container, {
      childList: true,
      subtree: true
    });
  }

  private updateItemHeights(): void {
    const config = this.config();
    if (!config.enableDynamicHeight) return;

    const container = this.scrollContainer.nativeElement;
    const itemElements = container.querySelectorAll('.virtual-scroll-item');
    const heightsMap = new Map(this.itemHeights());

    itemElements.forEach((element) => {
      const index = parseInt(element.getAttribute('data-index') || '0', 10);
      const height = element.getBoundingClientRect().height;
      
      if (height > 0) {
        heightsMap.set(index, height);
        
        // Observe this element for future size changes
        this.resizeObserver?.observe(element);
      }
    });

    this.itemHeights.set(heightsMap);
  }

  private getItemId(item: T, index: number): string | number {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const id = obj['id'] ?? obj['_id'] ?? obj['key'];
      if (typeof id === 'string' || typeof id === 'number') {
        return id;
      }
    }
    return index;
  }

  private initialScroll(): void {
    // Allow time for initial render before setting up observers
    setTimeout(() => {
      const config = this.config();
      if (config.enableDynamicHeight) {
        this.updateItemHeights();
      }
    }, 100);
  }

  private cleanup(): void {
    if (this.scrollTimeoutId) {
      clearTimeout(this.scrollTimeoutId);
    }

    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  // Public API methods

  /**
   * Scroll to a specific item by index
   */
  scrollToItem(index: number, behavior: ScrollBehavior = 'smooth'): void {
    if (index < 0 || index >= this.totalItems()) return;

    const container = this.scrollContainer.nativeElement;
    const config = this.config();
    let targetOffset: number;

    if (config.enableDynamicHeight) {
      targetOffset = this.calculateDynamicOffset(0, index);
    } else {
      targetOffset = index * (config.itemHeight || 60);
    }

    container.scrollTo({
      top: targetOffset,
      behavior
    });
  }

  /**
   * Scroll to the top of the list
   */
  scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
    const container = this.scrollContainer.nativeElement;
    container.scrollTo({
      top: 0,
      behavior
    });
  }

  /**
   * Scroll to the bottom of the list
   */
  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const container = this.scrollContainer.nativeElement;
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
  }

  /**
   * Get current scroll metrics
   */
  getScrollMetrics(): ScrollMetrics {
    const container = this.scrollContainer.nativeElement;
    return {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      totalHeight: this.calculateTotalHeight()
    };
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  private calculateTotalHeight(): number {
    const config = this.config();
    if (config.enableDynamicHeight) {
      return this.calculateDynamicOffset(0, this.totalItems());
    }
    return this.totalItems() * (config.itemHeight || 60);
  }
}
