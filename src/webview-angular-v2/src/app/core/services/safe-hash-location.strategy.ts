import { Injectable } from '@angular/core';
import { HashLocationStrategy } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SafeHashLocationStrategy extends HashLocationStrategy {
    // Wrap history.replaceState in a try/catch to avoid SecurityError inside VS Code webviews
    override replaceState(state: any, title: string, path: string, queryParams: string): void {
        try {
            super.replaceState(state, title, path, queryParams);
        } catch (err: unknown) {
            // If browser refuses (cross-origin), gracefully fallback to hash update
            try {
                // Attempt to set the hash portion only
                const url = path || '';
                const hash = url ? (url.startsWith('#') ? url : '#' + url) : '';
                // Use location.replace to avoid creating history entry when possible
                if (hash && typeof location.replace === 'function') {
                    // Using replace ensures we don't push a new history entry
                    location.replace(location.pathname + location.search + hash);
                } else if (hash) {
                    location.hash = hash;
                }
            } catch (_err) {
                // Last-resort: ignore — we don't want the app to crash for navigation state updates
                // eslint-disable-next-line no-console
                console.warn('SafeHashLocationStrategy: failed to update hash fallback', _err);
            }
        }
    }

    override pushState(state: any, title: string, path: string, queryParams: string): void {
        try {
            super.pushState(state, title, path, queryParams);
        } catch (err: unknown) {
            try {
                const url = path || '';
                const hash = url ? (url.startsWith('#') ? url : '#' + url) : '';
                if (hash) {
                    location.hash = hash;
                }
            } catch (_err) {
                // eslint-disable-next-line no-console
                console.warn('SafeHashLocationStrategy: failed to update hash fallback', _err);
            }
        }
    }
}
