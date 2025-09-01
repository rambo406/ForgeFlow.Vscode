import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { DashboardStore, DashboardView } from '@features/dashboard';
import { DashboardHeaderComponent } from '@features/dashboard';
import { ConfigurationViewComponent } from '@features/dashboard';
import { PullRequestListComponent } from '@features/dashboard';
import { PullRequestDetailComponent } from '@features/dashboard';
import { AppAlertComponent, AppButtonComponent } from '@shared/components';
import { MessageService, MessageType } from '../../../core/services/message.service';
import type {
  UpdateViewRequest,
  AIAnalysisProgressPayload,
  AIAnalysisCompletePayload,
  NotificationPayload
} from '../../../core/models/webview-message.interface';
import type { AnalysisProgress, AnalysisResult } from '../../../core/models/interfaces';
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
  templateUrl:      './dashboard.component.html',
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

  ngOnInit() {
    console.log('Dashboard component initialized - Angular migration in progress');

    // Setup message listeners for legacy compatibility
    this.setupMessageListeners();

    // Initialize dashboard by loading configuration
    this.store.loadConfiguration();

    // The store will reactively handle loading pull requests if configuration is valid
    // through the message listeners and computed properties

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
    // View updates
    this.messageService.onMessageOfType<UpdateViewRequest>(MessageType.UPDATE_VIEW)
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        const view = (msg.payload && (msg.payload as UpdateViewRequest).view) as DashboardView | undefined;
        if (view) {
          this.onViewChange(view);
        }
      });

    // Analysis progress (supports both {progress: {...}} and direct payload)
    this.messageService.onMessageOfType<AIAnalysisProgressPayload | { progress: AIAnalysisProgressPayload }>(MessageType.AI_ANALYSIS_PROGRESS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        const raw = (msg.payload as any);
        const p: AIAnalysisProgressPayload = (raw && raw.progress) ? raw.progress : raw;
        if (p) {
          const mapped: AnalysisProgress = {
            prId: typeof (p as any).prId === 'number' ? (p as any).prId : (this.store.selectedPR?.()?.id ?? 0),
            stage: (p as any).stage,
            currentFileName: (p as any).currentFileName,
            completed: (p as any).completed ?? 0,
            total: (p as any).total ?? 0,
            percentage: (p as any).percentage ?? 0,
            message: (p as any).message,
            startTime: this.store.currentAnalysis?.()?.startTime || new Date().toISOString(),
            estimatedCompletion: this.store.currentAnalysis?.()?.estimatedCompletion
          } as AnalysisProgress;
          this.store.updateAnalysisProgress(mapped);
        }
      });

    // Analysis complete
    this.messageService.onMessageOfType<AIAnalysisCompletePayload>(MessageType.AI_ANALYSIS_COMPLETE)
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        const payload = msg.payload as AIAnalysisCompletePayload;
        const result = (payload && (payload as any).result) as AnalysisResult | undefined;
        if (result) {
          this.store.completeAnalysis(result as AnalysisResult);
        }
      });

    // Notifications
    this.messageService.onMessageOfType<NotificationPayload>(MessageType.SHOW_ERROR)
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => this.handleErrorMessage((msg.payload as NotificationPayload)?.message || 'An error occurred'));

    this.messageService.onMessageOfType<NotificationPayload>(MessageType.SHOW_SUCCESS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => this.handleSuccessMessage((msg.payload as NotificationPayload)?.message || 'Operation completed'));
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

  onRefresh(): void {
    this.store.refresh();
  }

  onDismissError(): void {
    this.store.clearError();
  }

  onSaveConfiguration(config: Partial<ConfigurationData>): void {
    // Trigger configuration update
    this.store.updateConfiguration(config);

    // If configuration is now valid, switch to pull request list and load data
    // This will be handled reactively by the store
    if (this.store.hasValidConfiguration()) {
      this.store.setActiveView(DashboardView.PULL_REQUEST_LIST);
      this.store.loadPullRequests(undefined);
    }
  }

  onTestConnection(): void {
    this.store.testConnection();
  }

  onSelectPullRequest(prId: number): void {
    this.store.selectPullRequest(prId);
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
