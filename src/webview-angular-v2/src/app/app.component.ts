import { Component, inject, signal } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { VsCodeApiService } from './core/services/vscode-api.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [DashboardComponent],
    template: `
        <div class="p-4">
            <dashboard-root />
            <div class="mt-4 p-3 border border-gray-600 rounded-md card-vscode">
                <p class="text-sm font-medium mb-2">Zoneless Mode Test:</p>
                <p class="mb-3">Counter: <span class="font-mono text-blue-400">{{ counter() }}</span></p>
                <button 
                    (click)="increment()" 
                    class="btn-vscode hover:opacity-90 transition-opacity">
                    Increment
                </button>
            </div>
        </div>
    `
})
export class AppComponent {
    private readonly vscode = inject(VsCodeApiService);
    
    // Signal-based counter to test zoneless change detection
    counter = signal(0);

    increment(): void {
        this.counter.update(value => value + 1);
    }

    // Placeholder example to verify VS Code messaging wiring later
    sendPing(): void {
        this.vscode.postMessage({ type: 'webviewV2:ping', payload: { t: Date.now() } });
    }
}

