// Try to use the newer setupZoneTestEnv if available (jest-preset-angular v12+), otherwise fall back
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zone = require('jest-preset-angular/setup-env/zone');
  if (zone && typeof zone.setupZoneTestEnv === 'function') {
    zone.setupZoneTestEnv();
  }
} catch (e) {
  // ignore and fall back to older setup if necessary
}

// Mock HTMLCanvasElement for visual regression tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    toDataURL: jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
    fillStyle: '',
    font: '',
  })),
});

// Mock Canvas constructor
global.HTMLCanvasElement = HTMLCanvasElement;

// Mock toDataURL directly on HTMLCanvasElement prototype 
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  writable: true,
});

// Mock window.confirm for settings modal
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));

// Mock ScrollBehavior
(global as any).ScrollBehavior = {};

// Mock KeyboardEvent for tests
const originalKeyboardEvent = global.KeyboardEvent;
(global as any).KeyboardEvent = class MockKeyboardEvent extends Event {
  constructor(type: string, options: KeyboardEventInit = {}) {
    super(type, options);
    this.key = options.key || '';
    this.code = options.code || '';
    this.ctrlKey = options.ctrlKey || false;
    this.shiftKey = options.shiftKey || false;
    this.altKey = options.altKey || false;
    this.metaKey = options.metaKey || false;
  }
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

// Mock Performance API
Object.defineProperty(performance, 'getEntriesByType', {
  writable: true,
  value: jest.fn((type: string) => {
    if (type === 'measure') {
      return [
        { name: 'component-load', duration: 50 },
        { name: 'component-render', duration: 20 },
      ];
    }
    return [];
  }),
});

Object.defineProperty(performance, 'mark', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(performance, 'measure', {
  writable: true,
  value: jest.fn(),
});

// Add jasmine compatibility for Jest
export {};
declare global {
  namespace NodeJS {
    interface Global {
      jasmine: any;
      spyOn: any;
      expectAsync?: any;
    }
  }
}

// Provide jasmine compatibility layer
(global as any).jasmine = {
  createSpy: (name?: string) => {
    const spy = jest.fn();
    (spy as any).and = {
      returnValue: (value: any) => spy.mockReturnValue(value),
      callFake: (fn: any) => spy.mockImplementation(fn),
      throwError: (error: any) => spy.mockImplementation(() => { throw error; }),
      stub: () => spy,
    };
    // Provide .calls compatibility used by Jasmine tests (calls.reset(), calls.count(), calls.argsFor())
    if (!(spy as any).calls) {
      (spy as any).calls = {
        reset: () => spy.mockClear(),
        count: () => spy.mock.calls.length,
        argsFor: (index: number) => spy.mock.calls[index],
        all: () => spy.mock.calls,
      };
    }
    return spy;
  },
  createSpyObj: (baseName: string, methods: string[]) => {
    const obj: any = {};
    methods.forEach(method => {
      const spy = jest.fn();
      (spy as any).and = {
        returnValue: (value: any) => spy.mockReturnValue(value),
        callFake: (fn: any) => spy.mockImplementation(fn),
        throwError: (error: any) => spy.mockImplementation(() => { throw error; }),
        stub: () => spy,
      };
      (spy as any).calls = {
        reset: () => spy.mockClear(),
        count: () => spy.mock.calls.length,
        argsFor: (index: number) => spy.mock.calls[index],
        all: () => spy.mock.calls,
      };
      obj[method] = spy;
    });
    return obj;
  },
  any: (constructor: any) => expect.any(constructor),
  anything: () => expect.anything(),
  objectContaining: (obj: any) => expect.objectContaining(obj),
  arrayContaining: (arr: any[]) => expect.arrayContaining(arr),
  stringContaining: (str: string) => expect.stringContaining(str),
  SpyObj: {} as any, // Type placeholder
};

// Enhanced spyOn to add .and property
const originalSpyOn = jest.spyOn;
(global as any).spyOn = (object: any, method: string) => {
  // If the method doesn't exist, create a jest.fn() so spyOn can wrap it
  try {
    if (!object) {
      (object as any) = {};
    }
    if (typeof object[method] !== 'function') {
      // Define as writable so jest.spyOn can replace it
      Object.defineProperty(object, method, {
        value: jest.fn(),
        writable: true,
        configurable: true,
      });
    }
  } catch (e) {
    // Fall back silently; originalSpyOn will throw a meaningful error if it can't spy
  }

  const spy = originalSpyOn(object, method as any);
  if (!(spy as any).and) {
    (spy as any).and = {
      returnValue: (value: any) => spy.mockReturnValue(value),
      callFake: (fn: any) => spy.mockImplementation(fn),
      throwError: (error: any) => spy.mockImplementation(() => { throw error; }),
      stub: () => spy,
    };
  }
  return spy;
};

// Add Jest custom matchers for jasmine compatibility
expect.extend({
  toBeFalse(received) {
    const pass = received === false;
    return {
      message: () => `expected ${received} to be false`,
      pass,
    };
  },
  toBeTrue(received) {
    const pass = received === true;
    return {
      message: () => `expected ${received} to be true`,
      pass,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeFalse(): R;
      toBeTrue(): R;
    }
  }
}

// Provide a global expectAsync shim mapping to Jest's expect().rejects/resolve
(global as any).expectAsync = (p: Promise<any>) => {
  return {
    async toBeRejectedWithError(expected?: any) {
      await expect(p).rejects.toThrow(expected);
    }
  };
};
