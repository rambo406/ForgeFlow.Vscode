import { Component } from '@angular/core';

@Component({
    selector: 'dashboard-root',
    standalone: true,
    template: `
        <section>
            <h1 style="margin: 0 0 8px 0;">ForgeFlow Dashboard v2</h1>
            <p class="muted">Redesign workspace. Safe to iterate independently.</p>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="button-primary" (click)="noop()">Primary Action</button>
                <button (click)="noop()">Secondary</button>
            </div>
        </section>
    `
})
export class DashboardComponent {
    noop(): void { /* placeholder for future actions */ }
}

