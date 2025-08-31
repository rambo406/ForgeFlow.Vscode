import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, Routes, withPreloading, PreloadAllModules } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GlobalErrorHandler } from './core/services/global-error-handler.service';

// Lazy loaded routes for performance optimization
const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full' as const
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/components/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'comment-preview',
    loadComponent: () => import('./features/comment-preview/components/comment-preview.component').then(m => m.CommentPreviewComponent)
  }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    importProvidersFrom(BrowserAnimationsModule),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};