import { Injectable } from '@angular/core';
import { HashLocationStrategy } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SafeHashLocationStrategy extends HashLocationStrategy {
  override replaceState(state: any, title: string, path: string, queryParams: string): void {
    try {
      super.replaceState(state, title, path, queryParams);
    } catch (_err) {
      try {
        const url = path || '';
        const hash = url ? (url.startsWith('#') ? url : '#' + url) : '';
        if (hash && typeof location.replace === 'function') {
          location.replace(location.pathname + location.search + hash);
        } else if (hash) {
          location.hash = hash;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('SafeHashLocationStrategy: failed to update hash fallback', err);
      }
    }
  }

  override pushState(state: any, title: string, path: string, queryParams: string): void {
    try {
      super.pushState(state, title, path, queryParams);
    } catch (_err) {
      try {
        const url = path || '';
        const hash = url ? (url.startsWith('#') ? url : '#' + url) : '';
        if (hash) {
          location.hash = hash;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('SafeHashLocationStrategy: failed to update hash fallback', err);
      }
    }
  }
}

