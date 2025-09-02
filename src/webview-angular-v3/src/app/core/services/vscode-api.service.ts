/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';

declare const acquireVsCodeApi: undefined | (() => any);

@Injectable({ providedIn: 'root' })
export class VsCodeApiService {
  private readonly api: any;

  constructor() {
    if ((window as any).vscode) {
      this.api = (window as any).vscode;
    } else if (typeof acquireVsCodeApi === 'function') {
      try {
        this.api = acquireVsCodeApi();
        (window as any).vscode = this.api;
      } catch (error) {
        // eslint-disable-next-line no-console
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

