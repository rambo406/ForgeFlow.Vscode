/**
 * Performance testing setup and utilities
 */

// Mock performance APIs for consistent testing
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10, // 10MB
      totalJSHeapSize: 1024 * 1024 * 50, // 50MB
      jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
    }
  }
});

// Mock requestAnimationFrame for performance tests
let animationFrameId = 0;
window.requestAnimationFrame = jest.fn((callback) => {
  animationFrameId++;
  setTimeout(callback, 16); // 60fps
  return animationFrameId;
});

window.cancelAnimationFrame = jest.fn((id) => {
  // Mock implementation
});

// Performance test utilities
global.performanceTestUtils = {
  /**
   * Simulate high CPU load
   */
  simulateLoad: (duration = 100) => {
    const start = Date.now();
    while (Date.now() - start < duration) {
      // Busy wait to simulate load
    }
  },

  /**
   * Mock slow async operation
   */
  slowAsyncOperation: (delay = 500) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  /**
   * Generate large dataset for performance testing
   */
  generateLargeDataset: (size = 1000) => {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`,
      timestamp: Date.now() + i,
      data: new Array(100).fill(i).map(x => x * Math.random())
    }));
  },

  /**
   * Measure execution time
   */
  measureTime: async (fn) => {
    const start = performance.now();
    await fn();
    return performance.now() - start;
  }
};

// Configure Jest for performance testing
jest.setTimeout(30000); // 30 second timeout for performance tests

console.log('🚀 Performance testing environment configured');