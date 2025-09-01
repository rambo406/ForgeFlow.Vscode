/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';

declare const acquireVsCodeApi: undefined | (() => any);

@Injectable({ providedIn: 'root' })
export class VsCodeApiService {
    private readonly api: any;

    constructor() {
        this.api = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
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

