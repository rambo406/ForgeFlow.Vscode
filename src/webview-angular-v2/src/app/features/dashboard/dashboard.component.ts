import { Component, signal } from '@angular/core';

@Component({
    selector: 'dashboard-root',
    standalone: true,
    template: `
        <section class="mb-6">
            <h1 class="text-2xl font-bold mb-2 text-white">ForgeFlow Dashboard v2 (Zoneless)</h1>
            <p class="text-gray-400 mb-2">Redesign workspace. Safe to iterate independently.</p>
            <p class="text-xs text-gray-500 mb-4">Status: <span class="font-mono">{{ status() }}</span></p>
            <div class="flex gap-2">
                <button 
                    class="btn-vscode" 
                    (click)="updateStatus()">
                    Primary Action
                </button>
                <button 
                    class="px-3 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors" 
                    (click)="resetStatus()">
                    Secondary
                </button>
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

