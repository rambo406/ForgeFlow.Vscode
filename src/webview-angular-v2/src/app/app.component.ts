import { Component, inject, signal } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { VsCodeApiService } from './core/services/vscode-api.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [DashboardComponent],
    templateUrl: './app.component.html'
})
export class AppComponent {
    // Signal-based counter to test zoneless change detection
    counter = signal(0);
    private readonly vscode = inject(VsCodeApiService);

    increment(): void {
        this.counter.update(value => value + 1);
    }

    // Placeholder example to verify VS Code messaging wiring later
    sendPing(): void {
        this.vscode.postMessage({ type: 'webviewV2:ping', payload: { t: Date.now() } });
    }
}

