import { bootstrapApplication } from '@angular/platform-browser';
import { NgZone, NoopNgZone } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    // Provide a NoopNgZone so Angular runs without Zone.js in the webview
    { provide: NgZone, useClass: NoopNgZone },
    ...(appConfig.providers ?? [])
  ]
})
  .catch((err) => console.error(err));
