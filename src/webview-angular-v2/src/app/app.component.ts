import { Component, inject, signal } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { VsCodeApiService } from './core/services/vscode-api.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [DashboardComponent],
    template: `
        <div class="container">
            <dashboard-root />
            <div style="margin-top: 16px; padding: 8px; border: 1px solid #333; border-radius: 4px;">
                <p>Zoneless Mode Test:</p>
                <p>Counter: {{ counter() }}</p>
                <button (click)="increment()">Increment</button>
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

