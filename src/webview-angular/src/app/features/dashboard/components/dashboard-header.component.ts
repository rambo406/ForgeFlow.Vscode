import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardView } from '../store/dashboard.store';
import { AppButtonComponent } from '@shared/components';

interface DashboardStats {
  totalPRs: number;
  filteredPRs: number;
  activePRs: number;
  completedPRs: number;
  draftPRs: number;
}

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  template: `
    <header class="border-b border-border bg-card px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Title and Navigation -->
        <div class="flex items-center gap-6">
          <h1 class="text-xl font-semibold">Azure DevOps PR Reviewer</h1>
          
          <nav class="flex gap-1">
            <app-button 
              [variant]="activeView === DashboardView.CONFIGURATION ? 'default' : 'ghost'"
              size="sm"
              (onClick)="onViewChange(DashboardView.CONFIGURATION)"
            >
              Configuration
            </app-button>
            
            <app-button 
              [variant]="activeView === DashboardView.PULL_REQUEST_LIST ? 'default' : 'ghost'"
              size="sm"
              [disabled]="!hasValidConfiguration"
              (onClick)="onViewChange(DashboardView.PULL_REQUEST_LIST)"
            >
              Pull Requests
            </app-button>
          </nav>
        </div>

        <!-- Stats and Actions -->
        <div class="flex items-center gap-4">
          @if (hasValidConfiguration && stats) {
            <div class="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{{ stats.filteredPRs }}/{{ stats.totalPRs }} PRs</span>
              <span>{{ stats.activePRs }} Active</span>
              <span>{{ stats.draftPRs }} Draft</span>
            </div>
          }

          <app-button 
            variant="outline" 
            size="sm"
            [disabled]="isLoading"
            (onClick)="onRefresh()"
          >
            @if (isLoading) {
              Refreshing...
            } @else {
              Refresh
            }
          </app-button>
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeaderComponent {
  @Input() activeView: DashboardView = DashboardView.PULL_REQUEST_LIST;
  @Input() isLoading = false;
  @Input() hasValidConfiguration = false;
  @Input() stats: DashboardStats | null = null;
  
  @Output() viewChange = new EventEmitter<DashboardView>();
  @Output() refresh = new EventEmitter<void>();

  readonly DashboardView = DashboardView;

  onViewChange(view: DashboardView): void {
    this.viewChange.emit(view);
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}