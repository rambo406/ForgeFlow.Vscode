import { Component, signal } from '@angular/core';
import { HlmButton } from "@spartan-ng/helm/button";

@Component({
    selector: 'dashboard-root',
    standalone: true,
    imports: [
        HlmButton
    ],
    templateUrl: './dashboard.component.html'
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

