import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppToastComponent, ToastAction } from './app-toast.component';
import { NotificationService, Notification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, AppToastComponent],
  template: `
    <!-- Toast Container positioned in different corners based on configuration -->
    <div class="toast-container-wrapper">
      <!-- Top Right -->
      <div class="toast-stack top-right">
        @for (notification of topRightNotifications(); track notification.id) {
          <app-toast
            [type]="notification.type"
            [title]="notification.title"
            [message]="notification.message || ''"
            [details]="notification.details || ''"
            [duration]="notification.duration || 0"
            [persistent]="notification.persistent || false"
            [dismissible]="true"
            [actions]="mapNotificationActions(notification)"
            position="top-right"
            (dismiss)="onToastDismiss(notification.id)"
            (actionExecuted)="onActionExecuted(notification.id, $event)"
          />
        }
      </div>

      <!-- Top Left -->
      <div class="toast-stack top-left">
        @for (notification of topLeftNotifications(); track notification.id) {
          <app-toast
            [type]="notification.type"
            [title]="notification.title"
            [message]="notification.message || ''"
            [details]="notification.details || ''"
            [duration]="notification.duration || 0"
            [persistent]="notification.persistent || false"
            [dismissible]="true"
            [actions]="mapNotificationActions(notification)"
            position="top-left"
            (dismiss)="onToastDismiss(notification.id)"
            (actionExecuted)="onActionExecuted(notification.id, $event)"
          />
        }
      </div>

      <!-- Bottom Right -->
      <div class="toast-stack bottom-right">
        @for (notification of bottomRightNotifications(); track notification.id) {
          <app-toast
            [type]="notification.type"
            [title]="notification.title"
            [message]="notification.message || ''"
            [details]="notification.details || ''"
            [duration]="notification.duration || 0"
            [persistent]="notification.persistent || false"
            [dismissible]="true"
            [actions]="mapNotificationActions(notification)"
            position="bottom-right"
            (dismiss)="onToastDismiss(notification.id)"
            (actionExecuted)="onActionExecuted(notification.id, $event)"
          />
        }
      </div>

      <!-- Bottom Left -->
      <div class="toast-stack bottom-left">
        @for (notification of bottomLeftNotifications(); track notification.id) {
          <app-toast
            [type]="notification.type"
            [title]="notification.title"
            [message]="notification.message || ''"
            [details]="notification.details || ''"
            [duration]="notification.duration || 0"
            [persistent]="notification.persistent || false"
            [dismissible]="true"
            [actions]="mapNotificationActions(notification)"
            position="bottom-left"
            (dismiss)="onToastDismiss(notification.id)"
            (actionExecuted)="onActionExecuted(notification.id, $event)"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    .toast-container-wrapper {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1000;
    }

    .toast-stack {
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: auto;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 16px;
    }

    .toast-stack.top-right {
      top: 0;
      right: 0;
      align-items: flex-end;
    }

    .toast-stack.top-left {
      top: 0;
      left: 0;
      align-items: flex-start;
    }

    .toast-stack.bottom-right {
      bottom: 0;
      right: 0;
      align-items: flex-end;
      flex-direction: column-reverse;
    }

    .toast-stack.bottom-left {
      bottom: 0;
      left: 0;
      align-items: flex-start;
      flex-direction: column-reverse;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .toast-stack {
        padding: 8px;
        gap: 8px;
      }
      
      .toast-stack.top-right,
      .toast-stack.top-left {
        left: 8px;
        right: 8px;
        align-items: stretch;
      }
      
      .toast-stack.bottom-right,
      .toast-stack.bottom-left {
        left: 8px;
        right: 8px;
        align-items: stretch;
      }
    }

    /* Ensure toasts don't interfere with scrollbars */
    .toast-stack::-webkit-scrollbar {
      width: 4px;
    }

    .toast-stack::-webkit-scrollbar-track {
      background: transparent;
    }

    .toast-stack::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .toast-stack::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppToastContainerComponent {
  private notificationService = inject(NotificationService);

  // Get notifications for each position
  topRightNotifications = computed(() => 
    this.notificationService.notifications().filter(n => 
      this.getNotificationPosition(n) === 'top-right'
    )
  );

  topLeftNotifications = computed(() => 
    this.notificationService.notifications().filter(n => 
      this.getNotificationPosition(n) === 'top-left'
    )
  );

  bottomRightNotifications = computed(() => 
    this.notificationService.notifications().filter(n => 
      this.getNotificationPosition(n) === 'bottom-right'
    )
  );

  bottomLeftNotifications = computed(() => 
    this.notificationService.notifications().filter(n => 
      this.getNotificationPosition(n) === 'bottom-left'
    )
  );

  /**
   * Handle toast dismissal
   */
  onToastDismiss(notificationId: string): void {
    this.notificationService.removeNotification(notificationId);
  }

  /**
   * Handle action execution
   */
  onActionExecuted(notificationId: string, action: ToastAction): void {
    // Action is already executed by the toast component
    // We just need to handle any cleanup if needed
    console.log(`Action "${action.label}" executed for notification ${notificationId}`);
  }

  /**
   * Map notification actions to toast actions
   */
  mapNotificationActions(notification: Notification): ToastAction[] {
    if (!notification.actions) return [];
    
    return notification.actions.map((action) => ({
      label: action.label,
      action: action.action,
      primary: action.primary || false
    }));
  }

  /**
   * Determine notification position based on type and severity
   */
  private getNotificationPosition(notification: Notification): 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' {
    // Critical errors go to top-left to be more prominent
    if (notification.type === 'error' && notification.persistent) {
      return 'top-left';
    }
    
    // Success notifications go to bottom-right to be less intrusive
    if (notification.type === 'success') {
      return 'bottom-right';
    }
    
    // Info notifications go to bottom-left
    if (notification.type === 'info') {
      return 'bottom-left';
    }
    
    // Default: top-right for warnings and non-persistent errors
    return 'top-right';
  }
}
