/**
 * VS Code webview API type declarations
 */

export interface VsCodeApi {
  /**
   * Post a message to the extension host
   */
  postMessage(message: any): void;
  
  /**
   * Get the webview state
   */
  getState(): any;
  
  /**
   * Set the webview state
   */
  setState(state: any): void;
}

/**
 * Global VS Code API function
 */
declare global {
  function acquireVsCodeApi(): VsCodeApi;
}