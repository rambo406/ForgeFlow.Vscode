import { Component, signal } from '@angular/core';

@Component({
    selector: 'dashboard-root',
    standalone: true,
    template: `
        <section>
            <h1 style="margin: 0 0 8px 0;">ForgeFlow Dashboard v2 (Zoneless)</h1>
            <p class="muted">Redesign workspace. Safe to iterate independently.</p>
            <p style="font-size: 12px; color: #888;">Status: {{ status() }}</p>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="button-primary" (click)="updateStatus()">Primary Action</button>
                <button (click)="resetStatus()">Secondary</button>
            </div>
        </section>
    `
})
export class DashboardComponent {
    status = signal('Ready');

    updateStatus(): void {
        this.status.set(`Updated at ${new Date().toLocaleTimeString()}`);
    }

    resetStatus(): void {
        this.status.set('Ready');
    }
}

