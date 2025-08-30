import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GlobalErrorHandler } from './core/error/global-error-handler';

// Simple routes for migration status page
const routes: Routes = [
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full' as const
  }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserAnimationsModule),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};