import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ConfigurationComponent } from './features/configuration/configuration.component';
import { PullRequestDetailComponent } from './features/pull-request-detail/pull-request-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'configuration', component: ConfigurationComponent },
  { path: 'pull-request/:id', component: PullRequestDetailComponent },
  { path: '**', redirectTo: 'dashboard' }
];

