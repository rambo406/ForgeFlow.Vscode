/**
 * VS Code webview API type declarations
 */

export interface VsCodeApi {
  /**
   * Post a message to the extension host
   */
  postMessage(message: unknown): void;
  
  /**
   * Get the webview state
   */
  getState(): unknown;
  
  /**
   * Set the webview state
   */
  setState(state: unknown): void;
}

/**
 * Global VS Code API function
 */
declare global {
  function acquireVsCodeApi(): VsCodeApi;
}
