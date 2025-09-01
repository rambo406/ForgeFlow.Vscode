// jasmine-compat.d.ts
// Provides minimal ambient declarations to satisfy Jasmine-style APIs used in specs
import { Signal } from '@angular/core';

// Augment @angular/core for InputSignal compatibility in tests
declare module '@angular/core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export type InputSignal<T> = T | Signal<T>;
}

declare global {
  // Provide a compatibility alias for InputSignal used in component @Input types
  // Many tests assign plain values to InputSignal<T> properties. Allow either.
  type InputSignal<T> = T | Signal<T>;

  // expectAsync shim typing (Jasmine-style)
  function expectAsync(promise: Promise<any>): {
    toBeRejectedWithError(expected?: any): Promise<void>;
  };
}

declare namespace jasmine {
  function any(constructor: any): any;
  function anything(): any;
  function objectContaining(obj: any): any;
  function arrayContaining(arr: any[]): any;
  function stringContaining(str: string): any;
  function createSpyObj(baseName: string, methods: string[]): any;

  // Minimal SpyObj interface compatible with Jasmine usages in specs
  interface SpyObj<T> extends jest.Mocked<T> {}
}

export {};
