import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section style="padding:16px;">
      <h1 style="margin:0 0 8px 0;">Dashboard</h1>
      <p>Welcome to the v3 dashboard.</p>
      <a routerLink="/configuration">Go to Configuration</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {}

