import { Component, inject } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { VsCodeApiService } from './core/services/vscode-api.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [DashboardComponent],
    template: `
        <div class="container">
            <dashboard-root />
        </div>
    `
})
export class AppComponent {
    private readonly vscode = inject(VsCodeApiService);

    // Placeholder example to verify VS Code messaging wiring later
    sendPing(): void {
        this.vscode.postMessage({ type: 'webviewV2:ping', payload: { t: Date.now() } });
    }
}

