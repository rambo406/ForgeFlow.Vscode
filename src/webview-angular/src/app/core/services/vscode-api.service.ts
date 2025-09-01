import { Injectable, inject, signal, computed } from '@angular/core';
import { VsCodeApi } from '../models/vscode-api.types';

/**
 * Service for communicating with VS Code webview API
 */
@Injectable({
  providedIn: 'root'
})
export class VSCodeApiService {
  private vscodeApi: VsCodeApi | null = null;
  private _state = signal<unknown>(null);
  private _isInitialized = signal(false);

  readonly state = this._state.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isAvailable = computed(() => this.vscodeApi !== null);

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the VS Code API connection
   */
  private initialize(): void {
    try {
      if (typeof acquireVsCodeApi !== 'undefined') {
        this.vscodeApi = acquireVsCodeApi();
        const existing = this.vscodeApi.getState();
        this._state.set(existing ?? {});
        this._isInitialized.set(true);
        
        // Listen for messages from extension host
        window.addEventListener('message', this.handleMessage.bind(this));
        
        console.log('VS Code API initialized successfully');
      } else {
        console.warn('VS Code API not available - running outside of webview context');
      }
    } catch (error) {
      console.error('Failed to initialize VS Code API:', error);
    }
  }

  /**
   * Post a message to the extension host
   */
  postMessage(message: unknown): void {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.warn('Cannot post message - VS Code API not available');
    }
  }

  /**
   * Get the current webview state
   */
  getState(): unknown {
    if (this.vscodeApi) {
      return this.vscodeApi.getState();
    }
    return this._state();
  }

  /**
   * Set the webview state
   */
  setState(state: unknown): void {
    if (this.vscodeApi) {
      this.vscodeApi.setState(state);
      this._state.set(state);
    } else {
      this._state.set(state);
    }
  }

  /**
   * Update partial state
   */
  updateState(partialState: Record<string, unknown>): void {
    const currentState = (this.getState() as Record<string, unknown>) || {};
    const newState = { ...currentState, ...partialState } as Record<string, unknown>;
    this.setState(newState);
  }

  /**
   * Handle messages from extension host
   */
  private handleMessage(event: MessageEvent): void {
    const message = event.data;
    
    // Emit custom events for message handling by other services
    const customEvent = new CustomEvent('vscode-message', {
      detail: message
    });
    window.dispatchEvent(customEvent);
  }

  /**
   * Add message listener
   */
  onMessage(handler: (message: unknown) => void): () => void {
    const listener = (event: CustomEvent) => {
      handler(event.detail);
    };
    
    window.addEventListener('vscode-message', listener as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('vscode-message', listener as EventListener);
    };
  }

  /**
   * Send a request and wait for response (with timeout)
   */
  async sendRequest<T = unknown>(
    message: unknown, 
    timeout: number = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Use provided requestId if present so tests can control matching
      const requestId = (message && (message as { requestId?: string }).requestId) || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Set up response listener
      const cleanup = this.onMessage((response: unknown) => {
        if (!response) return;
        const resp = response as { requestId?: string; error?: string; payload?: T } & Record<string, unknown>;
        if (resp.requestId === requestId) {
          clearTimeout(timeoutId);
          cleanup();

          if (resp.error) {
            reject(new Error(resp.error));
            return;
          }

          // Support responses that either provide a `payload` field or inline fields
          if ((resp as { payload?: T }).payload !== undefined) {
            resolve((resp as { payload: T }).payload);
          } else {
            // Strip requestId from response and return remaining data
            const { requestId: _rid, ...rest } = resp;
            resolve(rest as T);
          }
        }
      });

      // Send message with request ID (preserve any provided fields)
      const base = (typeof message === 'object' && message !== null)
        ? (message as Record<string, unknown>)
        : {};
      this.postMessage({
        ...base,
        requestId
      });
    });
  }
}
