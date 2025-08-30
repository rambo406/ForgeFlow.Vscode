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
  private _state = signal<any>(null);
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
        this._state.set(this.vscodeApi.getState() || {});
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
  postMessage(message: any): void {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.warn('Cannot post message - VS Code API not available');
    }
  }

  /**
   * Get the current webview state
   */
  getState(): any {
    if (this.vscodeApi) {
      return this.vscodeApi.getState();
    }
    return this._state();
  }

  /**
   * Set the webview state
   */
  setState(state: any): void {
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
  updateState(partialState: any): void {
    const currentState = this.getState() || {};
    const newState = { ...currentState, ...partialState };
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
  onMessage(handler: (message: any) => void): () => void {
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
  async sendRequest<T = any>(
    message: any, 
    timeout: number = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
      
      // Set up response listener
      const cleanup = this.onMessage((response: any) => {
        if (response.requestId === requestId) {
          clearTimeout(timeoutId);
          cleanup();
          
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.payload);
          }
        }
      });
      
      // Send message with request ID
      this.postMessage({
        ...message,
        requestId
      });
    });
  }
}