import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReviewComment } from '../../../core/models/interfaces';
import { CommentCardComponent } from './comment-card.component';

/**
 * Comment list component that displays comments in list or grouped view
 */
@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [
    CommonModule,
    CommentCardComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="comment-list h-full overflow-auto">
      @if (viewMode === 'list') {
        <!-- List View -->
        <div class="p-4 space-y-3">
          @for (comment of comments; track comment.id) {
            <app-comment-card
              [comment]="comment"
              [isSelected]="selectedComments.includes(comment.id)"
              [isLoading]="isLoading"
              (onSelect)="handleCommentSelect(comment.id, $event)"
              (onUpdate)="onCommentUpdate.emit({ commentId: comment.id, content: $event })"
              (onApprove)="onCommentApprove.emit(comment.id)"
              (onDismiss)="onCommentDismiss.emit(comment.id)"
              (onApplySuggestion)="onApplySuggestion.emit(comment.id)"
            />
          }
        </div>
      } @else {
        <!-- Grouped View -->
        <div class="divide-y divide-border">
          @for (group of getGroupEntries(); track group.key) {
            <div class="group-section">
              <!-- Group Header -->
              <div class="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b border-border">
                <div class="flex items-center justify-between p-4">
                  <div class="flex items-center space-x-3">
                    <button
                      class="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                      (click)="toggleGroupCollapse(group.key)"
                    >
                      <lucide-icon 
                        [name]="isGroupCollapsed(group.key) ? 'chevron-right' : 'chevron-down'" 
                        size="16"
                        class="transition-transform"
                      />
                      <span>{{ getGroupDisplayName(group.key) }}</span>
                    </button>
                    
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                      {{ group.comments.length }}
                    </span>

                    <!-- Group-level actions -->
                    <div class="flex items-center space-x-1">
                      @if (getGroupSelectedCount(group.comments) > 0) {
                        <button
                          class="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded hover:bg-accent"
                          (click)="selectAllInGroup(group.comments, false)"
                          title="Deselect all in group"
                        >
                          <lucide-icon name="square" size="12" />
                        </button>
                      } @else {
                        <button
                          class="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded hover:bg-accent"
                          (click)="selectAllInGroup(group.comments, true)"
                          title="Select all in group"
                        >
                          <lucide-icon name="check-square" size="12" />
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Group Statistics -->
                  <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                    @if (getGroupStats(group.comments); as stats) {
                      @if (stats.pending > 0) {
                        <span class="flex items-center space-x-1">
                          <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>{{ stats.pending }} pending</span>
                        </span>
                      }
                      @if (stats.approved > 0) {
                        <span class="flex items-center space-x-1">
                          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{{ stats.approved }} approved</span>
                        </span>
                      }
                      @if (stats.dismissed > 0) {
                        <span class="flex items-center space-x-1">
                          <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span>{{ stats.dismissed }} dismissed</span>
                        </span>
                      }
                    }
                  </div>
                </div>
              </div>

              <!-- Group Comments -->
              @if (!isGroupCollapsed(group.key)) {
                <div class="p-4 space-y-3 bg-background">
                  @for (comment of group.comments; track comment.id) {
                    <app-comment-card
                      [comment]="comment"
                      [isSelected]="selectedComments.includes(comment.id)"
                      [isLoading]="isLoading"
                      [showFilePath]="false"
                      (onSelect)="handleCommentSelect(comment.id, $event)"
                      (onUpdate)="onCommentUpdate.emit({ commentId: comment.id, content: $event })"
                      (onApprove)="onCommentApprove.emit(comment.id)"
                      (onDismiss)="onCommentDismiss.emit(comment.id)"
                      (onApplySuggestion)="onApplySuggestion.emit(comment.id)"
                    />
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (comments.length === 0) {
        <div class="flex items-center justify-center h-full p-8">
          <div class="text-center">
            <lucide-icon 
              name="message-square" 
              size="48" 
              class="mx-auto mb-4 text-muted-foreground opacity-50"
            />
            <h3 class="text-lg font-medium text-foreground mb-2">No Comments Found</h3>
            <p class="text-muted-foreground max-w-md">
              No comments match your current filter criteria. Try adjusting your filters or clearing them to see more results.
            </p>
          </div>
        </div>
      }

      <!-- Select All Floating Action -->
      @if (comments.length > 0 && viewMode === 'list') {
        <div class="fixed bottom-4 right-4 z-20">
          <button
            class="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            (click)="onSelectAll.emit()"
            [title]="allSelected ? 'Deselect all comments' : 'Select all comments'"
          >
            <lucide-icon 
              [name]="allSelected ? 'square' : 'check-square'" 
              size="16"
            />
            <span class="text-sm">{{ allSelected ? 'Deselect' : 'Select' }} All</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .comment-list {
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Custom scrollbar for VS Code theme */
    .comment-list::-webkit-scrollbar {
      width: 8px;
    }

    .comment-list::-webkit-scrollbar-track {
      background: var(--vscode-scrollbarSlider-background);
    }

    .comment-list::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-hoverBackground);
      border-radius: 4px;
    }

    .comment-list::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-activeBackground);
    }

    /* Group collapse animation */
    .group-section {
      transition: all 0.2s ease-out;
    }

    /* Smooth scroll behavior */
    .comment-list {
      scroll-behavior: smooth;
    }

    /* Group header hover effect */
    .group-section:hover .group-header {
      background-color: var(--vscode-list-hoverBackground);
    }

    /* Selected state for groups */
    .group-selected {
      border-left: 3px solid var(--vscode-button-background);
    }

    /* Floating action button animation */
    .floating-action {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Sticky group headers */
    .group-header {
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(8px);
    }

    /* Group stats indicators */
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-pending { background-color: var(--vscode-editorWarning-foreground); }
    .status-approved { background-color: var(--vscode-terminal-ansiGreen); }
    .status-dismissed { background-color: var(--vscode-editorInfo-foreground); }
    .status-modified { background-color: var(--vscode-terminal-ansiBlue); }
  `]
})
export class CommentListComponent {
  @Input() comments: ReviewComment[] = [];
  @Input() groupedComments: Record<string, ReviewComment[]> = {};
  @Input() viewMode: 'list' | 'grouped' = 'grouped';
  @Input() selectedComments: string[] = [];
  @Input() isLoading: boolean = false;

  @Output() onCommentSelect = new EventEmitter<{ commentId: string; selected: boolean }>();
  @Output() onCommentUpdate = new EventEmitter<{ commentId: string; content: string }>();
  @Output() onCommentApprove = new EventEmitter<string>();
  @Output() onCommentDismiss = new EventEmitter<string>();
  @Output() onApplySuggestion = new EventEmitter<string>();
  @Output() onSelectAll = new EventEmitter<void>();

  private collapsedGroups = new Set<string>();

  /**
   * Get grouped comments as array of entries
   */
  protected getGroupEntries(): Array<{ key: string; comments: ReviewComment[] }> {
    return Object.entries(this.groupedComments).map(([key, comments]) => ({
      key,
      comments
    }));
  }

  /**
   * Handle comment selection
   */
  protected handleCommentSelect(commentId: string, selected: boolean) {
    this.onCommentSelect.emit({ commentId, selected });
  }

  /**
   * Toggle group collapse state
   */
  protected toggleGroupCollapse(groupKey: string) {
    if (this.collapsedGroups.has(groupKey)) {
      this.collapsedGroups.delete(groupKey);
    } else {
      this.collapsedGroups.add(groupKey);
    }
  }

  /**
   * Check if group is collapsed
   */
  protected isGroupCollapsed(groupKey: string): boolean {
    return this.collapsedGroups.has(groupKey);
  }

  /**
   * Get display name for group
   */
  protected getGroupDisplayName(groupKey: string): string {
    // If it's a file path, show just the filename
    if (groupKey.includes('/') || groupKey.includes('\\')) {
      const parts = groupKey.replace(/\\/g, '/').split('/');
      return parts[parts.length - 1] || groupKey;
    }
    
    // For severity or other groupings, capitalize first letter
    return groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
  }

  /**
   * Get count of selected comments in group
   */
  protected getGroupSelectedCount(comments: ReviewComment[]): number {
    return comments.filter(comment => 
      this.selectedComments.includes(comment.id)
    ).length;
  }

  /**
   * Select/deselect all comments in a group
   */
  protected selectAllInGroup(comments: ReviewComment[], select: boolean) {
    comments.forEach(comment => {
      const isCurrentlySelected = this.selectedComments.includes(comment.id);
      if (select && !isCurrentlySelected) {
        this.onCommentSelect.emit({ commentId: comment.id, selected: true });
      } else if (!select && isCurrentlySelected) {
        this.onCommentSelect.emit({ commentId: comment.id, selected: false });
      }
    });
  }

  /**
   * Get statistics for a group of comments
   */
  protected getGroupStats(comments: ReviewComment[]) {
    const stats = {
      pending: 0,
      approved: 0,
      dismissed: 0,
      modified: 0
    };

    comments.forEach(comment => {
      switch (comment.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'approved':
          stats.approved++;
          break;
        case 'dismissed':
          stats.dismissed++;
          break;
        case 'modified':
          stats.modified++;
          break;
      }
    });

    return stats;
  }

  /**
   * Check if all comments are selected
   */
  protected get allSelected(): boolean {
    return this.comments.length > 0 && 
           this.comments.every(comment => this.selectedComments.includes(comment.id));
  }
}