import { Injectable, signal } from '@angular/core';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  details?: string;
  timestamp: Date;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

/**
 * Service for managing notifications and user feedback
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  private _isToastVisible = signal(false);
  private idCounter = 0;

  readonly notifications = this._notifications.asReadonly();
  readonly isToastVisible = this._isToastVisible.asReadonly();

  constructor() {
    // Auto-remove non-persistent notifications
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 1000);
  }

  /**
   * Show an error notification
   */
  showError(title: string, message?: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: 'error',
      title,
      message,
      duration: 10000, // 10 seconds for errors
      persistent: false,
      ...options
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(title: string, message?: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: 'warning',
      title,
      message,
      duration: 7000, // 7 seconds for warnings
      persistent: false,
      ...options
    });
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message?: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: 'info',
      title,
      message,
      duration: 5000, // 5 seconds for info
      persistent: false,
      ...options
    });
  }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message?: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: 'success',
      title,
      message,
      duration: 3000, // 3 seconds for success
      persistent: false,
      ...options
    });
  }

  /**
   * Show a persistent notification that requires user action
   */
  showPersistent(
    type: NotificationType,
    title: string,
    message?: string,
    actions?: NotificationAction[]
  ): string {
    return this.addNotification({
      type,
      title,
      message,
      persistent: true,
      actions
    });
  }

  /**
   * Add a notification
   */
  private addNotification(notification: Partial<Notification>): string {
    const id = `notification_${++this.idCounter}`;
    
    const newNotification: Notification = {
      id,
      type: 'info',
      title: 'Notification',
      timestamp: new Date(),
      duration: 5000,
      persistent: false,
      ...notification
    };

    const current = this._notifications();
    this._notifications.set([...current, newNotification]);
    this._isToastVisible.set(true);

    // Auto-remove after duration if not persistent
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }

  /**
   * Remove a notification by ID
   */
  removeNotification(id: string): void {
    const current = this._notifications();
    const filtered = current.filter(n => n.id !== id);
    this._notifications.set(filtered);

    if (filtered.length === 0) {
      this._isToastVisible.set(false);
    }
  }

  /**
   * Remove all notifications
   */
  clearAll(): void {
    this._notifications.set([]);
    this._isToastVisible.set(false);
  }

  /**
   * Remove notifications of a specific type
   */
  clearByType(type: NotificationType): void {
    const current = this._notifications();
    const filtered = current.filter(n => n.type !== type);
    this._notifications.set(filtered);

    if (filtered.length === 0) {
      this._isToastVisible.set(false);
    }
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return this._notifications().find(n => n.id === id);
  }

  /**
   * Check if there are any notifications of a specific type
   */
  hasNotificationsOfType(type: NotificationType): boolean {
    return this._notifications().some(n => n.type === type);
  }

  /**
   * Get notifications count by type
   */
  getCountByType(type: NotificationType): number {
    return this._notifications().filter(n => n.type === type).length;
  }

  /**
   * Clean up expired notifications
   */
  private cleanupExpiredNotifications(): void {
    const current = this._notifications();
    const now = new Date();
    
    const filtered = current.filter(notification => {
      if (notification.persistent) {
        return true; // Keep persistent notifications
      }
      
      if (!notification.duration) {
        return true; // Keep notifications without duration
      }
      
      const elapsed = now.getTime() - notification.timestamp.getTime();
      return elapsed < notification.duration;
    });

    if (filtered.length !== current.length) {
      this._notifications.set(filtered);
      
      if (filtered.length === 0) {
        this._isToastVisible.set(false);
      }
    }
  }

  /**
   * Show loading notification
   */
  showLoading(title: string, message?: string): string {
    return this.addNotification({
      type: 'info',
      title,
      message,
      persistent: true,
      actions: []
    });
  }

  /**
   * Update an existing notification
   */
  updateNotification(id: string, updates: Partial<Notification>): void {
    const current = this._notifications();
    const index = current.findIndex(n => n.id === id);
    
    if (index !== -1) {
      const updated = [...current];
      updated[index] = { ...updated[index], ...updates };
      this._notifications.set(updated);
    }
  }

  /**
   * Show confirmation dialog (using notifications)
   */
  showConfirmation(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): string {
    return this.showPersistent('warning', title, message, [
      {
        label: 'Cancel',
        action: () => {
          if (onCancel) onCancel();
        }
      },
      {
        label: 'Confirm',
        action: onConfirm,
        primary: true
      }
    ]);
  }

  /**
   * Show API error notification with retry option
   */
  showApiError(
    operation: string,
    error: Error,
    retryAction?: () => void
  ): string {
    const actions: NotificationAction[] = [];
    
    if (retryAction) {
      actions.push({
        label: 'Retry',
        action: retryAction,
        primary: true
      });
    }
    
    actions.push({
      label: 'Dismiss',
      action: () => {} // Will be handled by removal
    });

    return this.addNotification({
      type: 'error',
      title: `Failed to ${operation}`,
      message: error.message,
      details: error.stack,
      persistent: true,
      actions
    });
  }
}