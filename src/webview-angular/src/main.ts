import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    // Run Angular in zoneless mode for VS Code webview
    provideZonelessChangeDetection(),
    ...(appConfig.providers ?? [])
  ]
})
  .catch((err) => console.error(err));
