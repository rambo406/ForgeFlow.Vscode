import { Injectable, signal, inject } from '@angular/core';
import { Observable, fromEvent, map, filter, timeout, retry, catchError, throwError } from 'rxjs';
import { VSCodeApiService } from './vscode-api.service';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Message types for communication between webview and extension host
 */
export enum MessageType {
  // Configuration messages
  LOAD_CONFIG = 'loadConfig',
  SAVE_CONFIG = 'saveConfig',
  TEST_CONNECTION = 'testConnection',
  
  // Pull request messages
  LOAD_PULL_REQUESTS = 'loadPullRequests',
  SELECT_PULL_REQUEST = 'selectPullRequest',
  LOAD_PR_DETAILS = 'loadPRDetails',
  
  // AI Analysis messages
  START_AI_ANALYSIS = 'startAIAnalysis',
  AI_ANALYSIS_PROGRESS = 'aiAnalysisProgress',
  AI_ANALYSIS_COMPLETE = 'aiAnalysisComplete',
  AI_ANALYSIS_CANCEL = 'aiAnalysisCancel',
  
  // Comment management messages
  APPROVE_COMMENT = 'approveComment',
  DISMISS_COMMENT = 'dismissComment',
  MODIFY_COMMENT = 'modifyComment',
  EXPORT_COMMENTS = 'exportComments',
  
  // Repository and project messages
  LOAD_REPOSITORIES = 'loadRepositories',
  LOAD_PROJECTS = 'loadProjects',
  
  // UI state messages
  UPDATE_VIEW = 'updateView',
  
  // Notification messages
  SHOW_ERROR = 'showError',
  SHOW_SUCCESS = 'showSuccess',
  SHOW_WARNING = 'showWarning',
  SHOW_INFO = 'showInfo',
  
  // Settings messages
  OPEN_SETTINGS = 'openSettings',
  CLOSE_SETTINGS = 'closeSettings',
  VALIDATE_SETTING = 'validateSetting',
  SAVE_SETTINGS = 'saveSettings',
  RESET_SETTINGS = 'resetSettings',
  EXPORT_SETTINGS = 'exportSettings',
  IMPORT_SETTINGS = 'importSettings',
  SETTINGS_CHANGED = 'settingsChanged',
  LOAD_AVAILABLE_MODELS = 'loadAvailableModels'
}

/**
 * Generic message interface
 */
export interface WebviewMessage<T = any> {
  type: MessageType;
  payload: T;
  requestId?: string;
  timestamp?: string;
}

/**
 * Service for handling typed message communication between webview and extension host
 */
@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private _lastError = signal<string | null>(null);
  private _isLoading = signal(false);
  private _retryCount = signal(0);
  
  readonly lastError = this._lastError.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly retryCount = this._retryCount.asReadonly();

  // Default timeouts for different operations (in milliseconds)
  private readonly DEFAULT_TIMEOUTS = {
    [MessageType.LOAD_CONFIG]: 5000,
    [MessageType.SAVE_CONFIG]: 10000,
    [MessageType.TEST_CONNECTION]: 30000,
    [MessageType.LOAD_PULL_REQUESTS]: 30000,
    [MessageType.LOAD_PR_DETAILS]: 15000,
    [MessageType.START_AI_ANALYSIS]: 60000,
    [MessageType.LOAD_REPOSITORIES]: 15000,
    [MessageType.LOAD_PROJECTS]: 15000,
    [MessageType.LOAD_AVAILABLE_MODELS]: 10000,
    DEFAULT: 10000
  };

  constructor(
    private vscodeApi: VSCodeApiService,
    private errorHandler: ErrorHandlerService
  ) {
    // Set up message handlers
    this.setupMessageHandlers();
  }

  /**
   * Set up handlers for incoming messages
   */
  private setupMessageHandlers(): void {
    this.vscodeApi.onMessage((message: WebviewMessage) => {
      switch (message.type) {
        case MessageType.SHOW_ERROR:
          this._lastError.set(message.payload.message);
          break;
        case MessageType.SHOW_SUCCESS:
        case MessageType.SHOW_WARNING:
        case MessageType.SHOW_INFO:
          this._lastError.set(null);
          break;
      }
    });
  }

  /**
   * Generate a unique request ID for tracking responses
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Safe message sending with error handling
   */
  sendMessage<T = any>(type: MessageType, payload?: T): void {
    try {
      const message: WebviewMessage<T> = {
        type,
        payload: payload as T,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
      
      this.vscodeApi.postMessage(message);
      this._lastError.set(null);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      this._lastError.set(errorMessage);
      
      this.errorHandler.handleError(
        error instanceof Error ? error : new Error(errorMessage),
        `Send ${type} message`,
        'medium'
      );
    }
  }

  /**
   * Send a request and wait for response with error handling and retry
   */
  private async sendRequest<TRequest = any, TResponse = any>(
    type: MessageType, 
    payload?: TRequest,
    timeoutMs?: number,
    retryAttempts: number = 2
  ): Promise<TResponse> {
    this._isLoading.set(true);
    this._retryCount.set(0);
    
    const operationTimeout = timeoutMs || (this.DEFAULT_TIMEOUTS as any)[type] || this.DEFAULT_TIMEOUTS.DEFAULT;
    const operationName = `${type} request`;
    
    try {
      const result = await this.errorHandler.retryOperation(
        async () => {
          const message: WebviewMessage<TRequest> = {
            type,
            payload: payload as TRequest,
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId()
          };
          
          // Use the existing vscodeApi.sendRequest method with timeout
          const response = await this.vscodeApi.sendRequest<TResponse>(message, operationTimeout);
          return response;
        },
        operationName,
        retryAttempts,
        1000 // Base delay for retry
      );
      
      this._lastError.set(null);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._lastError.set(errorMessage);
      
      // Enhanced error context for different error types
      let context = operationName;
      if (errorMessage.includes('timeout')) {
        context = `${operationName} (timeout after ${operationTimeout}ms)`;
      } else if (errorMessage.includes('network')) {
        context = `${operationName} (network error)`;
      }
      
      this.errorHandler.handleApiError(
        error instanceof Error ? error : new Error(errorMessage),
        context,
        () => this.sendRequest(type, payload, timeoutMs, retryAttempts)
      );
      
      throw error;
    } finally {
      this._isLoading.set(false);
      this._retryCount.set(0);
    }
  }

  // Configuration methods
  async loadConfiguration(): Promise<any> {
    return this.sendRequest(MessageType.LOAD_CONFIG);
  }

  async saveConfiguration(config: any): Promise<void> {
    return this.sendRequest(MessageType.SAVE_CONFIG, { config });
  }

  async testConnection(config: any): Promise<any> {
    return this.sendRequest(MessageType.TEST_CONNECTION, { config });
  }

  // Pull request methods
  async loadPullRequests(): Promise<any> {
    return this.sendRequest(MessageType.LOAD_PULL_REQUESTS);
  }

  async selectPullRequest(prId: number): Promise<any> {
    return this.sendRequest(MessageType.SELECT_PULL_REQUEST, { prId });
  }

  async loadPRDetails(prId: number): Promise<any> {
    return this.sendRequest(MessageType.LOAD_PR_DETAILS, { prId });
  }

  // AI Analysis methods
  startAIAnalysis(prId: number): void {
    this.sendMessage(MessageType.START_AI_ANALYSIS, { prId });
  }

  cancelAIAnalysis(prId: number): void {
    this.sendMessage(MessageType.AI_ANALYSIS_CANCEL, { prId });
  }

  // Comment management methods
  approveComment(commentId: string): void {
    this.sendMessage(MessageType.APPROVE_COMMENT, { commentId });
  }

  dismissComment(commentId: string): void {
    this.sendMessage(MessageType.DISMISS_COMMENT, { commentId });
  }

  modifyComment(commentId: string, content: string): void {
    this.sendMessage(MessageType.MODIFY_COMMENT, { commentId, content });
  }

  exportComments(): void {
    this.sendMessage(MessageType.EXPORT_COMMENTS);
  }

  // Repository and project methods
  async loadRepositories(): Promise<any> {
    return this.sendRequest(MessageType.LOAD_REPOSITORIES);
  }

  async loadProjects(): Promise<any> {
    return this.sendRequest(MessageType.LOAD_PROJECTS);
  }

  // UI state methods
  updateView(view: string): void {
    this.sendMessage(MessageType.UPDATE_VIEW, { view });
  }

  // Settings methods
  async openSettings(): Promise<void> {
    return this.sendRequest(MessageType.OPEN_SETTINGS);
  }

  closeSettings(): void {
    this.sendMessage(MessageType.CLOSE_SETTINGS);
  }

  async validateSetting(key: string, value: any): Promise<any> {
    return this.sendRequest(MessageType.VALIDATE_SETTING, { key, value });
  }

  async saveSettings(settings: any): Promise<void> {
    return this.sendRequest(MessageType.SAVE_SETTINGS, { settings });
  }

  resetSettings(): void {
    this.sendMessage(MessageType.RESET_SETTINGS);
  }

  exportSettings(): void {
    this.sendMessage(MessageType.EXPORT_SETTINGS);
  }

  importSettings(settings: any): void {
    this.sendMessage(MessageType.IMPORT_SETTINGS, { settings });
  }

  async loadAvailableModels(): Promise<any> {
    return this.sendRequest(MessageType.LOAD_AVAILABLE_MODELS);
  }

  // Notification methods
  showError(message: string, details?: string): void {
    this.sendMessage(MessageType.SHOW_ERROR, { message, details });
  }

  showSuccess(message: string): void {
    this.sendMessage(MessageType.SHOW_SUCCESS, { message });
  }

  showWarning(message: string): void {
    this.sendMessage(MessageType.SHOW_WARNING, { message });
  }

  showInfo(message: string): void {
    this.sendMessage(MessageType.SHOW_INFO, { message });
  }

  /**
   * Observable for incoming messages
   */
  onMessage<T = any>(): Observable<WebviewMessage<T>> {
    return fromEvent<CustomEvent>(window, 'vscode-message').pipe(
      map(event => event.detail as WebviewMessage<T>)
    );
  }

  /**
   * Observable for specific message types
   */
  onMessageOfType<T = any>(messageType: MessageType): Observable<WebviewMessage<T>> {
    return this.onMessage<T>().pipe(
      filter(message => message.type === messageType)
    );
  }

  /**
   * Clear the last error
   */
  clearError(): void {
    this._lastError.set(null);
  }
}