/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';

declare const acquireVsCodeApi: undefined | (() => any);

@Injectable({ providedIn: 'root' })
export class VsCodeApiService {
    private readonly api: any;

    constructor() {
        // Check if VS Code API is already available on window (set by controller)
        // If not, try to acquire it, but handle the case where it might already be acquired
        if ((window as any).vscode) {
            this.api = (window as any).vscode;
        } else if (typeof acquireVsCodeApi === 'function') {
            try {
                this.api = acquireVsCodeApi();
                (window as any).vscode = this.api; // Store for future use
            } catch (error) {
                console.warn('Failed to acquire VS Code API:', error);
                this.api = null;
            }
        } else {
            this.api = null;
        }
    }

    postMessage(message: unknown): void {
        if (this.api && typeof this.api.postMessage === 'function') {
            this.api.postMessage(message);
        } else {
            // eslint-disable-next-line no-console
            console.warn('VS Code API not available. Message not posted:', message);
        }
    }
}

