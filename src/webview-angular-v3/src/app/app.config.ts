import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LocationStrategy } from '@angular/common';
import { routes } from './app.routes';
import { SafeHashLocationStrategy } from './core/services/safe-hash-location.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    { provide: LocationStrategy, useClass: SafeHashLocationStrategy },
    provideRouter(routes)
  ]
};

