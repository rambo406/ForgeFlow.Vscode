import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStore, DashboardView } from '../store/dashboard.store';
import { DashboardHeaderComponent } from './dashboard-header.component';
import { ConfigurationViewComponent } from './configuration-view.component';
import { PullRequestListComponent } from './pull-request-list.component';
import { PullRequestDetailComponent } from './pull-request-detail.component';
import { AppAlertComponent } from '@shared/components';
import type { ConfigurationData, DashboardFilters } from '@core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ConfigurationViewComponent,
    PullRequestListComponent,
    PullRequestDetailComponent,
    AppAlertComponent
  ],
  template: `
    <div class="h-screen flex flex-col bg-background text-foreground">
      <!-- Header -->
      <app-dashboard-header 
        [activeView]="activeView"
        [isLoading]="store.isLoading()"
        [hasValidConfiguration]="store.hasValidConfiguration()"
        [stats]="store.dashboardStats()"
        (viewChange)="onViewChange($event)"
        (refresh)="onRefresh()"
      />

      <!-- Error Alert -->
      @if (errorMessage) {
        <app-alert 
          variant="destructive" 
          title="Error" 
          [dismissible]="true"
          (dismiss)="onDismissError()"
          additionalClasses="m-4"
        >
          {{ errorMessage }}
        </app-alert>
      }

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden">
        @switch (activeView) {
          @case (DashboardView.CONFIGURATION) {
            <app-configuration-view 
              [configuration]="store.configuration()"
              [isLoading]="store.isLoading()"
              [errors]="store.configurationErrors()"
              (save)="onSaveConfiguration($event)"
              (test)="onTestConnection()"
            />
          }
          @case (DashboardView.PULL_REQUEST_LIST) {
            <app-pull-request-list 
              [pullRequests]="store.sortedPullRequests()"
              [isLoading]="store.isLoading()"
              [filters]="store.filters()"
              [searchTerm]="searchTerm"
              [sortBy]="sortBy"
              [sortDirection]="sortDirection"
              (select)="onSelectPullRequest($event)"
              (search)="onSearch($event)"
              (filter)="onFilter($event)"
              (sort)="onSort($event)"
              (analyze)="onAnalyzePullRequest($event)"
            />
          }
          @case (DashboardView.PULL_REQUEST_DETAIL) {
            <app-pull-request-detail 
              [pullRequest]="selectedPR"
              [isLoading]="store.isLoading()"
              [analysisResults]="analysisResults"
              [analysisProgress]="analysisProgress"
              [isAnalysisRunning]="store.isAnalysisRunning()"
              (back)="onBackToPullRequestList()"
              (startAnalysis)="onStartAnalysis()"
              (cancelAnalysis)="onCancelAnalysis()"
            />
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  readonly store = inject(DashboardStore);
  readonly DashboardView = DashboardView;

  // Computed getters for template binding
  get activeView(): DashboardView { return this.store.activeView() as DashboardView; }
  get errorMessage() { return this.store.error?.(); }
  get searchTerm() { return this.store.searchTerm?.(); }
  get sortBy() { return this.store.sortBy?.(); }
  get sortDirection() { return this.store.sortDirection?.(); }
  get selectedPR() { return this.store.selectedPR?.(); }
  get analysisResults() { return this.store.analysisResults?.(); }
  get analysisProgress() { return this.store.currentAnalysis?.(); }

  async ngOnInit() {
    // Initialize dashboard by loading configuration
    await this.store.loadConfiguration();
    
    // If configuration is valid, load pull requests
    if (this.store.hasValidConfiguration()) {
      await this.store.loadPullRequests();
    } else {
      // Switch to configuration view if not configured
      this.store.setActiveView(DashboardView.CONFIGURATION);
    }
  }

  onViewChange(view: DashboardView): void {
    this.store.setActiveView(view);
  }

  async onRefresh(): Promise<void> {
    await this.store.refresh();
  }

  onDismissError(): void {
    this.store.clearError();
  }

  async onSaveConfiguration(config: Partial<ConfigurationData>): Promise<void> {
    await this.store.updateConfiguration(config);
    
    // If configuration is now valid, switch to pull request list
    if (this.store.hasValidConfiguration()) {
      this.store.setActiveView(DashboardView.PULL_REQUEST_LIST);
      await this.store.loadPullRequests();
    }
  }

  async onTestConnection(): Promise<void> {
    await this.store.testConnection();
  }

  async onSelectPullRequest(prId: number): Promise<void> {
    await this.store.selectPullRequest(prId);
  }

  onSearch(searchTerm: string): void {
    this.store.updateSearchTerm(searchTerm);
  }

  onFilter(filters: Partial<DashboardFilters>): void {
    this.store.updateFilters(filters);
  }

  onSort(event: { sortBy: string; sortDirection?: 'asc' | 'desc' }): void {
    this.store.updateSorting(event.sortBy, event.sortDirection);
  }

  async onAnalyzePullRequest(prId: number): Promise<void> {
    await this.store.selectPullRequest(prId);
    this.store.startAIAnalysis();
  }

  onBackToPullRequestList(): void {
    this.store.setActiveView(DashboardView.PULL_REQUEST_LIST);
  }

  onStartAnalysis(): void {
    this.store.startAIAnalysis();
  }

  onCancelAnalysis(): void {
    this.store.cancelAIAnalysis();
  }
}