import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ConnectionsComponent } from './features/connections/connections.component';

export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'connections', component: ConnectionsComponent },
    // Fallback
    { path: '**', redirectTo: '' }
];

