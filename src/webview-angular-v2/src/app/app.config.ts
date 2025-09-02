import { ApplicationConfig, provideZonelessChangeDetection, } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { LocationStrategy } from "@angular/common";
import { SafeHashLocationStrategy } from "./core/services/safe-hash-location.strategy";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    // Use a safe hash-based LocationStrategy inside VS Code webviews to avoid
    // history.replaceState trying to set a different-origin URL which triggers a SecurityError.
    { provide: LocationStrategy, useClass: SafeHashLocationStrategy },
    provideRouter(routes),
  ],
};
