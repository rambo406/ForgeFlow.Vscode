import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { AppToastContainerComponent } from './shared/components/feedback/app-toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, AppToastContainerComponent],
  template: `
    <div class="h-screen w-full">
      <app-dashboard />
      <!-- Toast container for global notifications -->
      <app-toast-container />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `]
})
export class AppComponent {
  title = 'ForgeFlow Azure DevOps PR Reviewer';
}