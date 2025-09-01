import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';

import { VSCodeApiService } from './vscode-api.service';
import { MessageService, MessageType } from './message.service';
import { ThemeService } from './theme.service';

export interface WebviewState {
  activeView?: string;
  selectedPRId?: number;
  scrollPosition?: number;
  filterState?: Record<string, unknown>;
  lastUpdate?: string;
}

/**
 * Service for managing webview lifecycle, state persistence, and integration
 */
@Injectable({
  providedIn: 'root'
})
export class WebviewLifecycleService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private vscodeApi = inject(VSCodeApiService);
  private messageService = inject(MessageService);
  private themeService = inject(ThemeService);

  private _isReady = signal(false);
  private _isVisible = signal(true);
  private _hasError = signal(false);

  readonly isReady = this._isReady.asReadonly();
  readonly isVisible = this._isVisible.asReadonly();
  readonly hasError = this._hasError.asReadonly();

  constructor() {
    this.initializeWebview();
    this.setupMessageHandlers();
    this.setupVisibilityHandling();
    this.setupStateManagement();
    this.setupErrorHandling();
    this.setupHeartbeat();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize webview integration
   */
  private initializeWebview(): void {
    try {
      // Wait for VS Code API to be ready
      if (this.vscodeApi.isInitialized()) {
        this.completeInitialization();
      } else {
        // Retry initialization with timeout
        const initTimer = timer(0, 100).pipe(takeUntil(this.destroy$));
        initTimer.subscribe(() => {
          if (this.vscodeApi.isInitialized()) {
            this.completeInitialization();
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize webview:', error);
      this._hasError.set(true);
    }
  }

  /**
   * Complete webview initialization
   */
  private completeInitialization(): void {
    // Restore state if available
    this.restoreState();
    
    // Signal readiness
    this._isReady.set(true);
    
    // Notify extension host that webview is ready
    this.messageService.sendMessage(MessageType.UPDATE_VIEW, { 
      status: 'ready',
      timestamp: new Date().toISOString()
    });

    console.log('Webview lifecycle service initialized successfully');
  }

  /**
   * Set up message handlers for lifecycle events
   */
  private setupMessageHandlers(): void {
    // Listen for visibility changes from extension host
    this.messageService.onMessageOfType(MessageType.UPDATE_VIEW)
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        const payload = message.payload as { visible?: boolean } | undefined;
        if (payload?.visible !== undefined) {
          this._isVisible.set(payload.visible);
        }
      });

    // Listen for state update requests
    this.messageService.onMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        const payload = message.payload as { action?: string } | undefined;
        if (message.type === MessageType.UPDATE_VIEW && payload?.action === 'updateState') {
          this.saveCurrentState();
        }
      });
  }

  /**
   * Set up visibility handling
   */
  private setupVisibilityHandling(): void {
    // Handle document visibility changes
    document.addEventListener('visibilitychange', () => {
      this._isVisible.set(!document.hidden);
      
      if (document.hidden) {
        // Save state when becoming hidden
        this.saveCurrentState();
      } else {
        // Refresh when becoming visible
        this.handleVisibilityChange(true);
      }
    });

    // Handle window focus/blur
    window.addEventListener('focus', () => {
      this.handleVisibilityChange(true);
    });

    window.addEventListener('blur', () => {
      this.handleVisibilityChange(false);
    });
  }

  /**
   * Set up state management
   */
  private setupStateManagement(): void {
    // Automatically save state every 30 seconds
    timer(30000, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveCurrentState();
      });

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this._hasError.set(true);
      
      this.messageService.showError(
        'An unexpected error occurred',
        event.error?.message || 'Unknown error'
      );
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this._hasError.set(true);
      
      this.messageService.showError(
        'An unexpected error occurred',
        event.reason?.message || 'Unknown error'
      );
    });
  }

  /**
   * Set up heartbeat to maintain connection with extension host
   */
  private setupHeartbeat(): void {
    timer(60000, 60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this._isReady() && this._isVisible()) {
          this.sendHeartbeat();
        }
      });
  }

  /**
   * Handle visibility changes
   */
  private handleVisibilityChange(isVisible: boolean): void {
    this._isVisible.set(isVisible);
    
    if (isVisible && this._isReady()) {
      // Refresh data when becoming visible
      this.messageService.sendMessage(MessageType.UPDATE_VIEW, {
        action: 'refresh',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Save current application state
   */
  saveCurrentState(): void {
    try {
      const state: WebviewState = {
        activeView: this.getCurrentView(),
        selectedPRId: this.getSelectedPRId(),
        scrollPosition: window.scrollY,
        filterState: this.getFilterState(),
        lastUpdate: new Date().toISOString()
      };

      this.vscodeApi.setState(state);
      console.log('State saved:', state);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Restore state from VS Code API
   */
  private restoreState(): void {
    try {
      const state = this.vscodeApi.getState() as WebviewState;
      
      if (state) {
        console.log('Restoring state:', state);
        
        // Restore scroll position
        if (state.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, state.scrollPosition || 0);
          }, 100);
        }

        // Restore other state through message service
        this.messageService.sendMessage(MessageType.UPDATE_VIEW, {
          action: 'restore',
          state
        });
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  /**
   * Send heartbeat to extension host
   */
  private sendHeartbeat(): void {
    this.messageService.sendMessage(MessageType.UPDATE_VIEW, {
      action: 'heartbeat',
      timestamp: new Date().toISOString(),
      state: {
        isVisible: this._isVisible(),
        hasError: this._hasError()
      }
    });
  }

  /**
   * Get current view from DOM or application state
   */
  private getCurrentView(): string {
    // This would be implemented based on your routing/state management
    const viewElement = document.querySelector('[data-current-view]');
    return viewElement?.getAttribute('data-current-view') || 'dashboard';
  }

  /**
   * Get selected PR ID from application state
   */
  private getSelectedPRId(): number | undefined {
    // This would be implemented based on your state management
    const prElement = document.querySelector('[data-selected-pr]');
    const prId = prElement?.getAttribute('data-selected-pr');
    return prId ? parseInt(prId, 10) : undefined;
  }

  /**
   * Get current filter state
   */
  private getFilterState(): Record<string, unknown> {
    // This would be implemented based on your filter state management
    return {
      // Extract filter state from stores or localStorage
    };
  }

  /**
   * Handle webview becoming ready
   */
  onReady(callback: () => void): () => void {
    if (this._isReady()) {
      callback();
      return () => {}; // No cleanup needed
    }

    const subscription = timer(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this._isReady()) {
          callback();
          subscription.unsubscribe();
        }
      });

    return () => subscription.unsubscribe();
  }

  /**
   * Handle visibility changes
   */
  onVisibilityChange(callback: (isVisible: boolean) => void): () => void {
    let previousVisible = this._isVisible();
    
    const subscription = timer(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const currentVisible = this._isVisible();
        if (currentVisible !== previousVisible) {
          callback(currentVisible);
          previousVisible = currentVisible;
        }
      });

    return () => subscription.unsubscribe();
  }

  /**
   * Manually trigger state save
   */
  persistState(): void {
    this.saveCurrentState();
  }

  /**
   * Reset error state
   */
  clearError(): void {
    this._hasError.set(false);
  }

  /**
   * Check if webview is properly integrated
   */
  isIntegrated(): boolean {
    return this._isReady() && this.vscodeApi.isAvailable();
  }

  /**
   * Get webview capabilities
   */
  getCapabilities(): WebviewCapabilities {
    return {
      canPersistState: this.vscodeApi.isAvailable(),
      canReceiveMessages: this.vscodeApi.isAvailable(),
      canSendMessages: this.vscodeApi.isAvailable(),
      supportsThemes: true,
      supportsHeartbeat: true
    };
  }
}

export interface WebviewCapabilities {
  canPersistState: boolean;
  canReceiveMessages: boolean;
  canSendMessages: boolean;
  supportsThemes: boolean;
  supportsHeartbeat: boolean;
}
