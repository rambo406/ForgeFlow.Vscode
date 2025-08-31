import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import { DashboardStore, DashboardView } from '../store/dashboard.store';
import { DashboardHeaderComponent } from './dashboard-header.component';
import { ConfigurationViewComponent } from './configuration-view.component';
import { PullRequestListComponent } from './pull-request-list.component';
import { PullRequestDetailComponent } from './pull-request-detail.component';
import { AppAlertComponent, AppButtonComponent } from '@shared/components';
import { MessageService, MessageType } from '../../../core/services/message.service';
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
    AppAlertComponent,
    AppButtonComponent
  ],
  template: `
    <div class="h-screen flex flex-col bg-background text-foreground">
      <!-- Header -->
      <div class="flex-shrink-0 border-b border-border">
        <app-dashboard-header 
          [activeView]="activeView"
          [isLoading]="store.isLoading()"
          [hasValidConfiguration]="store.hasValidConfiguration()"
          [stats]="store.dashboardStats()"
          (viewChange)="onViewChange($event)"
          (refresh)="onRefresh()"
        />
      </div>

      <!-- Error Alert -->
      @if (errorMessage) {
        <div class="flex-shrink-0">
          <app-alert 
            variant="destructive" 
            title="Error" 
            [dismissible]="true"
            (dismiss)="onDismissError()"
            additionalClasses="m-4"
          >
            {{ errorMessage }}
          </app-alert>
        </div>
      }

      <!-- Main Content - Enhanced Responsive Layout -->
      <div class="flex-1 overflow-hidden">
        <div class="h-full dashboard-main-grid">
          @switch (activeView) {
            @case (DashboardView.CONFIGURATION) {
              <!-- Configuration View - Full Width Container -->
              <div class="col-span-full overflow-auto">
                <div class="container-vscode py-vscode-xl">
                  <app-configuration-view 
                    [configuration]="store.configuration()"
                    [isLoading]="store.isLoading()"
                    [errors]="store.configurationErrors()"
                    (save)="onSaveConfiguration($event)"
                    (test)="onTestConnection()"
                  />
                </div>
              </div>
            }
            @case (DashboardView.PULL_REQUEST_LIST) {
              <!-- Pull Request List - Enhanced Responsive Grid -->
              <div class="col-span-full overflow-auto">
                <div class="h-full flex flex-col">
                  <!-- Filters and Search Bar - Mobile-First Responsive -->
                  <div class="flex-shrink-0 border-b border-border bg-card">
                    <div class="p-vscode-lg">
                      <div class="flex-responsive gap-vscode-lg">
                        <div class="w-full vscode-sm:w-auto vscode-sm:flex-1">
                          <!-- Search and filters will be part of the list component -->
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Pull Request Grid - Optimized Layout -->
                  <div class="flex-1 overflow-auto p-vscode-lg">
                    <div class="dashboard-grid">
                      <div class="col-span-full">
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
            @case (DashboardView.PULL_REQUEST_DETAIL) {
              <!-- Pull Request Detail - Enhanced Two Column Layout -->
              <div class="col-span-full overflow-hidden">
                <div class="h-full grid grid-cols-1 vscode-lg:grid-cols-5 gap-0">
                  <!-- Navigation/Summary Sidebar - Responsive Design -->
                  <div class="hidden vscode-lg:block border-r border-vscode-panel-border bg-vscode-panel-background overflow-auto">
                    <div class="p-vscode-lg space-y-vscode-lg">
                      <app-button 
                        variant="secondary"
                        size="sm"
                        additionalClasses="w-full text-vscode-sm"
                        (onClick)="onBackToPullRequestList()"
                      >
                        ← Back to List
                      </app-button>
                      
                      <!-- PR Quick Info - Enhanced Layout -->
                      @if (selectedPR) {
                        <div class="space-y-vscode-md">
                          <div class="card-vscode">
                            <h3 class="font-medium text-vscode-sm text-vscode-foreground line-clamp-2">
                              {{ selectedPR.title }}
                            </h3>
                            <p class="text-vscode-xs text-vscode-muted mt-vscode-xs">
                              #{{ selectedPR.id }}
                            </p>
                          </div>
                          
                          <div class="space-y-vscode-sm text-vscode-xs">
                            <div class="flex justify-between">
                              <span class="text-vscode-muted">Author:</span>
                              <span class="text-vscode-foreground font-medium">{{ selectedPR.author }}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-vscode-muted">Status:</span>
                              <span class="text-vscode-foreground font-medium">{{ selectedPR.status }}</span>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                  
                  <!-- Main Detail Content - Enhanced Responsive Layout -->
                  <div class="col-span-full vscode-lg:col-span-4 flex flex-col overflow-hidden">
                    <!-- Mobile Back Button - Touch-Friendly -->
                    <div class="vscode-lg:hidden border-b border-vscode-panel-border bg-vscode-panel-background">
                      <div class="p-vscode-lg">
                        <app-button 
                          variant="secondary"
                          size="sm"
                          additionalClasses="w-full vscode-sm:w-auto text-vscode-sm"
                          (onClick)="onBackToPullRequestList()"
                        >
                          ← Back to List
                        </app-button>
                      </div>
                    </div>
                    
                    <!-- Detail Content - Responsive Padding -->
                    <div class="flex-1 overflow-auto p-vscode-lg vscode-lg:p-vscode-xl">
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
                    </div>
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly store = inject(DashboardStore);
  readonly messageService = inject(MessageService);
  readonly DashboardView = DashboardView;
  
  private destroy$ = new Subject<void>();

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
    console.log('Dashboard component initialized - Angular migration in progress');
    
    // Setup message listeners for legacy compatibility
    this.setupMessageListeners();
    
    // Initialize dashboard by loading configuration
    await this.store.loadConfiguration();
    
    // If configuration is valid, load pull requests
    if (this.store.hasValidConfiguration()) {
      await this.store.loadPullRequests();
    } else {
      // Switch to configuration view if not configured
      this.store.setActiveView(DashboardView.CONFIGURATION);
    }
    
    console.log('Dashboard initialization complete');
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Setup message listeners to maintain compatibility with legacy message protocol
   */
  private setupMessageListeners(): void {
    this.messageService.onMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('Received message:', message.type, message.payload);
        
        switch (message.type) {
          case MessageType.UPDATE_VIEW:
            if (message.payload?.view) {
              this.onViewChange(message.payload.view as DashboardView);
            }
            break;
            
          case MessageType.AI_ANALYSIS_PROGRESS:
            if (message.payload) {
              this.store.updateAnalysisProgress(message.payload);
            }
            break;
            
          case MessageType.AI_ANALYSIS_COMPLETE:
            if (message.payload) {
              this.store.completeAnalysis(message.payload);
            }
            break;
            
          case MessageType.SHOW_ERROR:
            this.handleErrorMessage(message.payload?.message || 'An error occurred');
            break;
            
          case MessageType.SHOW_SUCCESS:
            this.handleSuccessMessage(message.payload?.message || 'Operation completed');
            break;
            
          default:
            console.log('Unhandled message type:', message.type);
        }
      });
  }
  
  /**
   * Handle error messages from extension
   */
  private handleErrorMessage(message: string): void {
    console.error('Extension error:', message);
    // The store will be updated via the message service's error handling
  }
  
  /**
   * Handle success messages from extension
   */
  private handleSuccessMessage(message: string): void {
    console.log('Extension success:', message);
    // Could implement toast notifications here if needed
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