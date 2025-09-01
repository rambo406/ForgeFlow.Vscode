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
    <header class="border-b border-border bg-card/95 sticky top-0 z-20 backdrop-blur">
      <div class="container-vscode py-4">
        <div class="flex items-center justify-between">
          <!-- Title and Navigation -->
          <div class="flex items-center gap-6">
            <div>
              <h1 class="text-xl font-semibold leading-tight">Azure DevOps PR Reviewer</h1>
              <p class="text-sm text-muted-foreground">Review, analyze, and manage pull requests efficiently</p>
            </div>
            
            <nav class="hidden vscode-md:flex gap-1">
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
              <div class="hidden vscode-lg:flex items-center gap-4 text-sm text-muted-foreground">
                <span class="px-2 py-1 rounded-md bg-muted">{{ stats.filteredPRs }}/{{ stats.totalPRs }} PRs</span>
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

        <!-- Stats Row (compact, mobile friendly) -->
        @if (hasValidConfiguration && stats) {
          <div class="mt-4 grid grid-cols-2 vscode-sm:grid-cols-3 vscode-lg:grid-cols-6 gap-3">
            <div class="card-vscode py-2 px-3">
              <div class="text-xs text-muted-foreground">Total</div>
              <div class="text-lg font-semibold">{{ stats.totalPRs }}</div>
            </div>
            <div class="card-vscode py-2 px-3">
              <div class="text-xs text-muted-foreground">Visible</div>
              <div class="text-lg font-semibold">{{ stats.filteredPRs }}</div>
            </div>
            <div class="card-vscode py-2 px-3">
              <div class="text-xs text-muted-foreground">Active</div>
              <div class="text-lg font-semibold">{{ stats.activePRs }}</div>
            </div>
            <div class="card-vscode py-2 px-3">
              <div class="text-xs text-muted-foreground">Completed</div>
              <div class="text-lg font-semibold">{{ stats.completedPRs }}</div>
            </div>
            <div class="card-vscode py-2 px-3">
              <div class="text-xs text-muted-foreground">Draft</div>
              <div class="text-lg font-semibold">{{ stats.draftPRs }}</div>
            </div>
            <div class="card-vscode py-2 px-3 hidden vscode-lg:block">
              <div class="text-xs text-muted-foreground">Refresh</div>
              <div class="text-sm">Manual</div>
            </div>
          </div>
        }
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
