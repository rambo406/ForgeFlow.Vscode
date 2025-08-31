/**
 * Visual regression testing setup and utilities
 */

// Mock HTML5 Canvas API for visual regression tests
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    fillStyle: '#ffffff',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '14px Arial',
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    clearRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    drawImage: jest.fn()
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
};

// Mock document.createElement for canvas
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock getBoundingClientRect for consistent layout testing
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  top: 0,
  left: 0,
  right: 300,
  bottom: 200,
  width: 300,
  height: 200,
  x: 0,
  y: 0,
  toJSON: jest.fn()
}));

// Mock getComputedStyle for consistent styling
window.getComputedStyle = jest.fn(() => ({
  backgroundColor: '#ffffff',
  color: '#000000',
  fontSize: '14px',
  fontFamily: 'Arial',
  borderWidth: '1px',
  borderColor: '#cccccc',
  getPropertyValue: jest.fn((prop: string) => {
    const styles: Record<string, string> = {
      'background-color': '#ffffff',
      'color': '#000000',
      'font-size': '14px',
      'font-family': 'Arial',
      'border-width': '1px',
      'border-color': '#cccccc'
    };
    return styles[prop] || '';
  })
} as any));

// Mock Intersection Observer for lazy loading tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Mock implementation
  }

  observe(target: Element): void {
    // Mock implementation
  }

  unobserve(target: Element): void {
    // Mock implementation
  }

  disconnect(): void {
    // Mock implementation
  }
} as any;

// Mock ResizeObserver for responsive testing
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    // Mock implementation
  }

  observe(target: Element, options?: ResizeObserverOptions): void {
    // Mock implementation
  }

  unobserve(target: Element): void {
    // Mock implementation
  }

  disconnect(): void {
    // Mock implementation
  }
} as any;

// Visual regression test utilities
interface VisualTestUtils {
  captureSnapshot: (element: HTMLElement) => Promise<string>;
  compareSnapshots: (baseline: string, current: string) => number;
  generateTestElement: (type: string, content?: string) => HTMLElement;
  simulateViewportSize: (width: number, height: number) => void;
}

declare global {
  var visualTestUtils: VisualTestUtils;
}

globalThis.visualTestUtils = {
  /**
   * Capture a snapshot of an element (mocked for testing)
   */
  captureSnapshot: async (element: HTMLElement): Promise<string> => {
    // Simulate snapshot capture
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'data:image/png;base64,mock-snapshot-data';
  },

  /**
   * Compare two snapshots and return difference percentage
   */
  compareSnapshots: (baseline: string, current: string): number => {
    // Mock comparison - return 0 for same snapshots
    return baseline === current ? 0 : 0.1; // 10% difference
  },

  /**
   * Generate test element for visual testing
   */
  generateTestElement: (type: string, content = 'Test Content'): HTMLElement => {
    const element = document.createElement('div');
    element.className = `test-${type}`;
    element.textContent = content;
    element.style.width = '300px';
    element.style.height = '200px';
    element.style.backgroundColor = '#f0f0f0';
    element.style.border = '1px solid #ccc';
    element.style.padding = '16px';
    return element;
  },

  /**
   * Simulate different viewport sizes for responsive testing
   */
  simulateViewportSize: (width: number, height: number): void => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  }
};

// Mock baseline snapshots for consistent testing
const mockBaselines = new Map<string, string>([
  ['configuration-section', 'data:image/png;base64,mock-config-baseline'],
  ['dashboard', 'data:image/png;base64,mock-dashboard-baseline'],
  ['pr-list', 'data:image/png;base64,mock-pr-list-baseline'],
  ['comment-preview', 'data:image/png;base64,mock-comment-preview-baseline'],
  ['loading-overlay', 'data:image/png;base64,mock-loading-baseline']
]);

// Provide mock baselines to visual regression service
Object.defineProperty(global, 'mockVisualBaselines', {
  value: mockBaselines,
  writable: false
});

// Configure test environment for visual regression
jest.setTimeout(30000); // 30 second timeout for visual tests

console.log('📸 Visual regression testing environment configured');