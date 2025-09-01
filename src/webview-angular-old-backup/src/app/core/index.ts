// Export models
export * from './models';

// Export services (excluding duplicated types)
export { VSCodeApiService } from './services/vscode-api.service';
export { MessageService } from './services/message.service';
export { ThemeService, type ThemeKind } from './services/theme.service';
export { NotificationService, type NotificationType, type Notification } from './services/notification.service';
export { ErrorHandlerService, type ErrorLog } from './services/error-handler.service';