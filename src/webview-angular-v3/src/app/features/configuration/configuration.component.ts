import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ff-configuration',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section style="padding:16px;">
      <h1 style="margin:0 0 8px 0;">Configuration</h1>
      <p>Manage your settings here. (Stub)</p>
      <a routerLink="/dashboard">Back to Dashboard</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationComponent {}

