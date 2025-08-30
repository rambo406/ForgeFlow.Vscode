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
    <div class="comment-preview-container h-full flex flex-col bg-background text-foreground">
      <!-- Header Section -->
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

      <!-- Filters Section - Responsive Layout -->
      <div class="flex-shrink-0 border-b border-border bg-muted/30">
        <div class="container-vscode py-2 vscode-md:py-3">
          <app-comment-filters
            [filters]="store.filters()"
            [groupBy]="store.groupBy()"
            [viewMode]="store.viewMode()"
            [uniqueFiles]="store.uniqueFilePaths()"
            [uniqueCategories]="store.uniqueCategories()"
            [isLoading]="store.isLoading()"
            (onFiltersChange)="handleFiltersChange($event)"
            (onGroupByChange)="handleGroupByChange($event)"
            (onViewModeChange)="handleViewModeChange($event)"
            (onClearFilters)="handleClearFilters()"
          />
        </div>
      </div>

      <!-- Main Content Area - Responsive Grid Layout -->
      <div class="flex-1 flex flex-col min-h-0">
        <!-- Error Display -->
        @if (store.error(); as error) {
          <div class="flex-shrink-0 p-4">
            <div class="container-vscode">
              <div hlmAlert variant="destructive">
                <lucide-icon name="alert-circle" hlmIcon size="sm" class="mr-2" />
                <div class="flex-responsive items-start">
                  <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-sm vscode-md:text-base">Error</h4>
                    <p class="text-xs vscode-md:text-sm mt-1 break-words">{{ error }}</p>
                  </div>
                  <button 
                    hlmBtn
                    variant="outline"
                    size="sm"
                    class="btn-responsive flex-shrink-0 mt-2 vscode-md:mt-0 vscode-md:ml-4"
                    (click)="handleClearError()"
                  >
                    <lucide-icon name="x" hlmIcon size="xs" class="mr-1" />
                    <span class="hide-vscode-sm">Dismiss</span>
                    <span class="show-vscode-sm sr-only">Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Loading State - Responsive Grid -->
        @if (store.isLoading()) {
          <div class="flex-1 p-4">
            <div class="container-vscode">
              <div class="comment-preview-grid">
                @for (skeleton of skeletonArray; track $index) {
                  <div class="border border-border rounded-lg p-4 space-y-3 panel-vscode">
                    <div hlmSkeleton class="h-4 w-1/4"></div>
                    <div hlmSkeleton class="h-3 w-full"></div>
                    <div hlmSkeleton class="h-3 w-3/4"></div>
                    <div class="flex space-x-2">
                      <div hlmSkeleton class="h-6 w-16"></div>
                      <div hlmSkeleton class="h-6 w-20"></div>
                      <div hlmSkeleton class="h-6 w-14"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Comments List - Responsive Layout -->
        @if (!store.isLoading()) {
          <div class="flex-1 min-h-0">
            @if (store.comments().length === 0) {
              <!-- Empty State - Responsive -->
              <div class="flex-1 flex items-center justify-center p-4 vscode-md:p-8">
                <div class="text-center max-w-md">
                  <lucide-icon 
                    name="message-square" 
                    hlmIcon 
                    size="xl" 
                    class="mx-auto mb-4 text-muted-foreground opacity-50"
                  />
                  <h3 class="text-base vscode-md:text-lg font-semibold mb-2">No Comments Available</h3>
                  <p class="text-xs vscode-md:text-sm text-muted-foreground mb-4">
                    No review comments have been generated for this pull request yet. 
                    Start an analysis to get AI-powered code review suggestions.
                  </p>
                  <button 
                    hlmBtn
                    variant="outline"
                    class="btn-responsive text-sm"
                    (click)="handleRefresh()"
                  >
                    <lucide-icon name="refresh-cw" hlmIcon size="sm" class="mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
            } @else if (store.filteredComments().length === 0) {
              <!-- No Results State - Responsive -->
              <div class="flex-1 flex items-center justify-center p-4 vscode-md:p-8">
                <div class="text-center max-w-md">
                  <lucide-icon 
                    name="filter-x" 
                    hlmIcon 
                    size="xl" 
                    class="mx-auto mb-4 text-muted-foreground opacity-50"
                  />
                  <h3 class="text-base vscode-md:text-lg font-semibold mb-2">No Comments Match Filters</h3>
                  <p class="text-xs vscode-md:text-sm text-muted-foreground mb-4">
                    Try adjusting your filter criteria or clearing all filters to see more results.
                  </p>
                  <button 
                    hlmBtn
                    variant="outline"
                    class="btn-responsive text-sm"
                    (click)="handleClearFilters()"
                  >
                    <lucide-icon name="filter-x" hlmIcon size="sm" class="mr-2" />
                    Clear Filters
                  </button>
                </div>
              </div>
            } @else {
              <!-- Comments List Component - Full Height with Responsive Containers -->
              <div class="h-full overflow-auto">
                <div class="container-vscode py-4">
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

      <!-- Actions Footer - Responsive -->
      @if (store.selectedCommentsCount() > 0) {
        <div class="flex-shrink-0 border-t border-border bg-muted/30">
          <div class="container-vscode py-3">
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
    .comment-preview-container {
      height: 100vh;
      overflow: hidden;
    }

    .comment-preview-container > div {
      overflow: hidden;
    }

    /* Custom scrollbar styling for VS Code theme */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--vscode-scrollbarSlider-background);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-hoverBackground);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-activeBackground);
    }

    /* Animation for error alerts */
    .error-alert {
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
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
        if (message.type === MessageType.COMMENTS_LOADED) {
          this.store.updateComments(message.payload.comments);
        } else if (message.type === MessageType.COMMENT_UPDATED) {
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
    this.store.updateComment(data.commentId, data.content);
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