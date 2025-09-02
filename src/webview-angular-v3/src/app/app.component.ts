import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav style="display:flex; gap:12px; padding:8px 12px; border-bottom: 1px solid var(--vscode-panel-border, #333);">
      <a routerLink="/dashboard">Dashboard</a>
      <a routerLink="/configuration">Configuration</a>
    </nav>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {}

