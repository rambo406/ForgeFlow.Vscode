import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideVSCodeDesignSystem, allComponents } from '@vscode/webview-ui-toolkit';

// Register VS Code Webview UI Toolkit components
try {
  provideVSCodeDesignSystem().register(allComponents);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('VS Code UI Toolkit registration failed (may already be registered):', e);
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap Angular application', err);
});

