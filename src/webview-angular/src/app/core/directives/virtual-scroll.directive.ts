import { Directive, ElementRef, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

/**
 * Interface for virtual scroll item
 */
export interface VirtualScrollItem {
  id: string | number;
  height?: number;
  data: any;
}

/**
 * Virtual scrolling directive for large lists
 * Improves performance by only rendering visible items
 */
@Directive({
  selector: '[appVirtualScroll]',
  standalone: true
})
export class VirtualScrollDirective implements OnInit, OnDestroy {
  @Input() items: VirtualScrollItem[] = [];
  @Input() itemHeight: number = 60; // Default item height in pixels
  @Input() bufferSize: number = 5; // Number of items to render outside viewport
  @Input() containerHeight?: number; // Optional fixed container height

  private destroy$ = new Subject<void>();
  private scrollContainer!: HTMLElement;
  private contentContainer!: HTMLElement;
  private visibleStartIndex = 0;
  private visibleEndIndex = 0;
  private itemsPerPage = 0;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.setupVirtualScroll();
    this.calculateVisibleItems();
    this.renderVisibleItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('scroll', ['$event'])
  onScroll(event: Event): void {
    this.calculateVisibleItems();
    this.renderVisibleItems();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.calculateVisibleItems();
    this.renderVisibleItems();
  }

  /**
   * Set up virtual scroll container
   */
  private setupVirtualScroll(): void {
    const element = this.elementRef.nativeElement;
    
    // Create scroll container if not exists
    if (!element.classList.contains('virtual-scroll-container')) {
      element.classList.add('virtual-scroll-container');
      element.style.cssText += `
        overflow-y: auto;
        position: relative;
        height: ${this.containerHeight ? this.containerHeight + 'px' : '100%'};
      `;
    }
    
    this.scrollContainer = element;
    
    // Create content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'virtual-scroll-content';
    this.contentContainer.style.cssText = `
      position: relative;
      height: ${this.getTotalHeight()}px;
    `;
    
    // Move existing content to content container
    while (element.firstChild) {
      this.contentContainer.appendChild(element.firstChild);
    }
    
    element.appendChild(this.contentContainer);
  }

  /**
   * Calculate which items should be visible
   */
  private calculateVisibleItems(): void {
    const scrollTop = this.scrollContainer.scrollTop;
    const containerHeight = this.scrollContainer.clientHeight;
    
    // Calculate visible range
    this.visibleStartIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    this.visibleEndIndex = Math.min(
      this.items.length - 1,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.bufferSize
    );
    
    this.itemsPerPage = this.visibleEndIndex - this.visibleStartIndex + 1;
  }

  /**
   * Render only visible items
   */
  private renderVisibleItems(): void {
    // Clear current content
    this.contentContainer.innerHTML = '';
    
    // Create spacer for items before visible range
    if (this.visibleStartIndex > 0) {
      const topSpacer = document.createElement('div');
      topSpacer.style.height = `${this.visibleStartIndex * this.itemHeight}px`;
      this.contentContainer.appendChild(topSpacer);
    }
    
    // Render visible items
    for (let i = this.visibleStartIndex; i <= this.visibleEndIndex; i++) {
      if (i < this.items.length) {
        const item = this.items[i];
        const itemElement = this.createItemElement(item, i);
        this.contentContainer.appendChild(itemElement);
      }
    }
    
    // Create spacer for items after visible range
    if (this.visibleEndIndex < this.items.length - 1) {
      const bottomSpacer = document.createElement('div');
      const remainingItems = this.items.length - 1 - this.visibleEndIndex;
      bottomSpacer.style.height = `${remainingItems * this.itemHeight}px`;
      this.contentContainer.appendChild(bottomSpacer);
    }
    
    // Update total height
    this.contentContainer.style.height = `${this.getTotalHeight()}px`;
  }

  /**
   * Create DOM element for an item
   */
  private createItemElement(item: VirtualScrollItem, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'virtual-scroll-item';
    element.style.cssText = `
      height: ${item.height || this.itemHeight}px;
      position: relative;
      box-sizing: border-box;
    `;
    
    // Add item data as attribute for debugging
    element.setAttribute('data-item-id', item.id.toString());
    element.setAttribute('data-item-index', index.toString());
    
    // Dispatch custom event for item rendering
    const renderEvent = new CustomEvent('virtualScrollItemRender', {
      detail: { item, index, element }
    });
    this.elementRef.nativeElement.dispatchEvent(renderEvent);
    
    return element;
  }

  /**
   * Get total height of all items
   */
  private getTotalHeight(): number {
    return this.items.reduce((total, item) => {
      return total + (item.height || this.itemHeight);
    }, 0);
  }

  /**
   * Scroll to specific item
   */
  scrollToItem(itemId: string | number): void {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    if (itemIndex >= 0) {
      const scrollTop = itemIndex * this.itemHeight;
      this.scrollContainer.scrollTop = scrollTop;
      this.calculateVisibleItems();
      this.renderVisibleItems();
    }
  }

  /**
   * Scroll to specific index
   */
  scrollToIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      const scrollTop = index * this.itemHeight;
      this.scrollContainer.scrollTop = scrollTop;
      this.calculateVisibleItems();
      this.renderVisibleItems();
    }
  }

  /**
   * Update items and re-render
   */
  updateItems(newItems: VirtualScrollItem[]): void {
    this.items = newItems;
    this.calculateVisibleItems();
    this.renderVisibleItems();
  }

  /**
   * Get currently visible items
   */
  getVisibleItems(): VirtualScrollItem[] {
    return this.items.slice(this.visibleStartIndex, this.visibleEndIndex + 1);
  }

  /**
   * Get visible range
   */
  getVisibleRange(): { start: number; end: number } {
    return {
      start: this.visibleStartIndex,
      end: this.visibleEndIndex
    };
  }
}

/**
 * Service for managing virtual scroll instances
 */
export class VirtualScrollService {
  private scrollInstances = new Map<string, VirtualScrollDirective>();

  /**
   * Register a virtual scroll instance
   */
  register(id: string, instance: VirtualScrollDirective): void {
    this.scrollInstances.set(id, instance);
  }

  /**
   * Unregister a virtual scroll instance
   */
  unregister(id: string): void {
    this.scrollInstances.delete(id);
  }

  /**
   * Get virtual scroll instance by ID
   */
  getInstance(id: string): VirtualScrollDirective | undefined {
    return this.scrollInstances.get(id);
  }

  /**
   * Scroll to item in specific instance
   */
  scrollToItem(instanceId: string, itemId: string | number): void {
    const instance = this.getInstance(instanceId);
    if (instance) {
      instance.scrollToItem(itemId);
    }
  }

  /**
   * Update items in specific instance
   */
  updateItems(instanceId: string, items: VirtualScrollItem[]): void {
    const instance = this.getInstance(instanceId);
    if (instance) {
      instance.updateItems(items);
    }
  }
}