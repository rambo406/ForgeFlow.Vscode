import { Component, OnInit, OnDestroy, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CommentPreviewStore } from '../store/comment-preview.store';
import { MessageService } from '../../../core/services/message.service';
import { MessageType } from '../../../core/models/enums';
import { CommentHeaderComponent } from './comment-header.component';
import { CommentFiltersComponent } from './comment-filters.component';
import { CommentListComponent } from './comment-list.component';
import { CommentActionsComponent } from './comment-actions.component';

import { HlmSkeletonModule } from '../../../../../libs/ui/ui-skeleton-helm/src';
import { HlmAlertModule } from '../../../../../libs/ui/ui-alert-helm/src';
import { HlmButtonModule } from '../../../../../libs/ui/ui-button-helm/src';
import { HlmIconModule } from '../../../../../libs/ui/ui-icon-helm/src';

/**
 * Main comment preview component that orchestrates the comment review interface
 * Uses OnPush change detection for optimal performance
 */
@Component({
  selector: 'app-comment-preview',
  standalone: true,
  imports: [
    CommonModule,
    CommentHeaderComponent,
    CommentFiltersComponent,
    CommentListComponent,
    CommentActionsComponent,
    HlmSkeletonModule,
    HlmAlertModule,
    HlmButtonModule,
    HlmIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-background text-foreground">
      <!-- Header Section - Enhanced Mobile-First Design -->
      <div class="flex-shrink-0 border-b border-border">
        <app-comment-header
          [stats]="store.commentsSummary()"
          [isLoading]="store.isLoading()"
          [selectedCount]="store.selectedCommentsCount()"
          (onRefresh)="handleRefresh()"
          (onExport)="handleExport($event)"
          (onClearSelection)="handleClearSelection()"
        />
      </div>

      <!-- Filters Section - Enhanced Responsive Layout -->
      <div class="flex-shrink-0 border-b border-border bg-card">
        <div class="container-vscode py-vscode-sm vscode-md:py-vscode-md">
          <app-comment-filters
            [filters]="store.filters()"
            [groupBy]="store.groupBy()"
            [viewMode]="store.viewMode()"
            [uniqueFiles]="store.uniqueFilePaths()"
            [uniqueCategories]="uniqueCategoriesSafe()"
            [isLoading]="store.isLoading()"
            (onFiltersChange)="handleFiltersChange($event)"
            (onGroupByChange)="handleGroupByChange($event)"
            (onViewModeChange)="handleViewModeChange($event)"
            (onClearFilters)="handleClearFilters()"
          />
        </div>
      </div>

      <!-- Main Content Area - Enhanced Responsive Grid Layout -->
      <div class="flex-1 flex flex-col min-h-0">
        <!-- Error Display - Mobile-First Alert Design -->
        @if (store.error && store.error(); as error) {
          <div class="flex-shrink-0 p-vscode-lg">
            <div class="container-vscode">
              <div class="card-vscode bg-error text-error-foreground">
                <div class="flex-responsive gap-vscode-md">
                  <div class="flex items-start gap-vscode-sm">
                    <span class="text-vscode-lg flex-shrink-0">⚠️</span>
                    <div class="flex-1 min-w-0">
                      <h4 class="font-semibold text-vscode-sm vscode-md:text-vscode-base">Error</h4>
                      <p class="text-vscode-xs vscode-md:text-vscode-sm mt-vscode-xs break-words">{{ error }}</p>
                    </div>
                  </div>
                  <button 
                    class="btn-vscode-secondary flex-shrink-0 w-full vscode-sm:w-auto"
                    (click)="handleClearError()"
                  >
                    <span class="inline-flex items-center">✕</span>
                    <span class="ml-vscode-xs vscode-sm:inline hidden">Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Loading State - Enhanced Responsive Grid -->
        @if (store.isLoading()) {
          <div class="flex-1 p-vscode-lg">
            <div class="container-vscode">
              <div class="comment-preview-grid">
                @for (skeleton of skeletonArray; track $index) {
                  <div class="card-vscode space-y-vscode-md animate-vscode-pulse">
                    <div hlmSkeleton class="h-vscode-lg w-1/4"></div>
                    <div hlmSkeleton class="h-vscode-md w-full"></div>
                    <div hlmSkeleton class="h-vscode-md w-3/4"></div>
                    <div class="flex gap-vscode-sm">
                      <div hlmSkeleton class="h-vscode-xl w-16"></div>
                      <div hlmSkeleton class="h-vscode-xl w-20"></div>
                      <div hlmSkeleton class="h-vscode-xl w-14"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Comments List - Enhanced Responsive Layout -->
        @if (!store.isLoading()) {
          <div class="flex-1 min-h-0">
            @if (store.comments().length === 0) {
              <!-- Empty State - Mobile-Optimized -->
              <div class="flex-1 flex items-center justify-center p-vscode-lg vscode-md:p-vscode-2xl">
                <div class="text-center max-w-md">
                  <span class="text-6xl">💬</span>
                  <h3 class="text-vscode-lg vscode-md:text-vscode-xl font-semibold mt-vscode-lg mb-vscode-md">
                    No Comments Available
                  </h3>
                  <p class="text-vscode-sm vscode-md:text-vscode-base text-muted-foreground mb-vscode-lg">
                    No review comments have been generated for this pull request yet. 
                    Start an analysis to get AI-powered code review suggestions.
                  </p>
                  <button 
                    class="btn-vscode w-full vscode-sm:w-auto"
                    (click)="handleRefresh()"
                  >
                    <span class="inline-flex items-center">🔄</span>
                    <span class="ml-vscode-sm">Refresh</span>
                  </button>
                </div>
              </div>
            } @else if (store.filteredComments().length === 0) {
              <!-- No Results State - Mobile-Optimized -->
              <div class="flex-1 flex items-center justify-center p-vscode-lg vscode-md:p-vscode-2xl">
                <div class="text-center max-w-md">
                  <span class="text-6xl">🚫</span>
                  <h3 class="text-vscode-lg vscode-md:text-vscode-xl font-semibold mt-vscode-lg mb-vscode-md">
                    No Comments Match Filters
                  </h3>
                  <p class="text-vscode-sm vscode-md:text-vscode-base text-muted-foreground mb-vscode-lg">
                    Try adjusting your filter criteria or clearing all filters to see more results.
                  </p>
                  <button 
                    class="btn-vscode-secondary w-full vscode-sm:w-auto"
                    (click)="handleClearFilters()"
                  >
                    <span class="inline-flex items-center">❌</span>
                    <span class="ml-vscode-sm">Clear Filters</span>
                  </button>
                </div>
              </div>
            } @else {
              <!-- Comments List Component - Enhanced Responsive Design -->
              <div class="h-full overflow-auto scrollbar-vscode">
                <div class="container-vscode py-vscode-lg">
                  <app-comment-list
                    [comments]="store.filteredComments()"
                    [groupedComments]="store.groupedComments()"
                    [viewMode]="store.viewMode()"
                    [selectedComments]="store.selectedComments()"
                    [isLoading]="store.isLoading()"
                    (onCommentSelect)="handleCommentSelect($event)"
                    (onCommentUpdate)="handleCommentUpdate($event)"
                    (onCommentApprove)="handleCommentApprove($event)"
                    (onCommentDismiss)="handleCommentDismiss($event)"
                    (onApplySuggestion)="handleApplySuggestion($event)"
                    (onSelectAll)="handleSelectAll()"
                  />
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Actions Footer - Enhanced Mobile-First Design -->
      @if (store.selectedCommentsCount() > 0) {
        <div class="flex-shrink-0 border-t border-border bg-card">
          <div class="container-vscode py-vscode-md">
            <app-comment-actions
              [selectedCount]="store.selectedCommentsCount()"
              [allSelected]="store.allFilteredCommentsSelected()"
              [pendingActionsCount]="store.pendingActionsCount()"
              [isLoading]="store.isLoading()"
              (onBulkApprove)="handleBulkApprove()"
              (onBulkDismiss)="handleBulkDismiss()"
              (onSelectAll)="handleSelectAll()"
              (onClearSelection)="handleClearSelection()"
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Enhanced VS Code Theme Integration */
    .animate-vscode-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class CommentPreviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  protected store = inject(CommentPreviewStore);
  private messageService = inject(MessageService);

  // For skeleton loading state
  protected skeletonArray = Array(3).fill(0);

  ngOnInit() {
    // Listen for incoming comment data from extension host
    this.messageService.onMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        // Narrow message type checks to avoid TypeScript mismatch when using union enums
        if (message && (message.type as MessageType) === MessageType.COMMENTS_LOADED) {
          this.store.updateComments(message.payload.comments);
        } else if (message && (message.type as MessageType) === MessageType.COMMENT_UPDATED) {
          // Handle individual comment updates
          const updatedComment = message.payload.comment;
          const currentComments = this.store.comments();
          const updatedComments = currentComments.map(comment =>
            comment.id === updatedComment.id ? updatedComment : comment
          );
          this.store.updateComments(updatedComments);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Ensure unique categories list is strictly string[] for template/data bindings
   */
  protected uniqueCategoriesSafe(): string[] {
    const raw = this.store.uniqueCategories && this.store.uniqueCategories();
    if (!raw) return [];
    // Filter out undefined and coerce types
    return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }

  /**
   * Handle refresh action
   */
  protected handleRefresh() {
    // Get current PR ID from parent context or store
    const prId = this.getCurrentPRId();
    if (prId) {
      this.store.refreshComments(prId);
    }
  }

  /**
   * Handle export action
   */
  protected handleExport(format: 'json' | 'csv' | 'markdown') {
    this.store.exportComments(format);
  }

  /**
   * Handle filters change
   */
  protected handleFiltersChange(filters: any) {
    this.store.updateFilters(filters);
  }

  /**
   * Handle group by change
   */
  protected handleGroupByChange(groupBy: 'file' | 'severity' | 'none') {
    this.store.setGroupBy(groupBy);
  }

  /**
   * Handle view mode change
   */
  protected handleViewModeChange(viewMode: 'list' | 'grouped') {
    this.store.setViewMode(viewMode);
  }

  /**
   * Handle clear filters
   */
  protected handleClearFilters() {
    this.store.clearFilters();
  }

  /**
   * Handle clear selection
   */
  protected handleClearSelection() {
    this.store.clearSelection();
  }

  /**
   * Handle comment selection
   */
  protected handleCommentSelect(data: { commentId: string; selected: boolean }) {
    if (data.selected) {
      this.store.selectComment(data.commentId);
    } else {
      this.store.deselectComment(data.commentId);
    }
  }

  /**
   * Handle comment update
   */
  protected handleCommentUpdate(data: { commentId: string; content: string }) {
    this.store.updateComment({ commentId: data.commentId, content: data.content });
  }

  /**
   * Handle comment approval
   */
  protected handleCommentApprove(commentId: string) {
    this.store.approveComment(commentId);
  }

  /**
   * Handle comment dismiss
   */
  protected handleCommentDismiss(commentId: string) {
    this.store.dismissComment(commentId);
  }

  /**
   * Handle apply suggestion
   */
  protected handleApplySuggestion(commentId: string) {
    this.store.applySuggestion(commentId);
  }

  /**
   * Handle select all
   */
  protected handleSelectAll() {
    this.store.selectAllFilteredComments();
  }

  /**
   * Handle bulk approve
   */
  protected handleBulkApprove() {
    const selectedComments = this.store.selectedComments();
    if (selectedComments.length > 0) {
      this.store.bulkApproveComments(selectedComments);
    }
  }

  /**
   * Handle bulk dismiss
   */
  protected handleBulkDismiss() {
    const selectedComments = this.store.selectedComments();
    if (selectedComments.length > 0) {
      this.store.bulkDismissComments(selectedComments);
    }
  }

  /**
   * Handle clear error
   */
  protected handleClearError() {
    this.store.clearError();
  }

  /**
   * Get current PR ID from context
   * This would be injected or passed from parent component in real implementation
   */
  private getCurrentPRId(): number | undefined {
    // TODO: Get from route params or parent component input
    return undefined;
  }
}