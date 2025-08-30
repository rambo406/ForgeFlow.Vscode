import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CommentSummaryStats } from '../../../core/models/interfaces';

/**
 * Comment header component with summary statistics and action buttons
 */
@Component({
  selector: 'app-comment-header',
  standalone: true,
  imports: [
    CommonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="comment-header p-4 bg-background border-b border-border">
      <div class="flex items-center justify-between">
        <!-- Left Side: Title and Stats -->
        <div class="flex items-center space-x-4">
          <div>
            <h2 class="text-lg font-semibold text-foreground">
              Review Comments
            </h2>
            <div class="flex items-center space-x-2 mt-1">
              <span class="text-sm text-muted-foreground">
                {{ stats.total }} total
              </span>
              @if (selectedCount > 0) {
                <div class="h-4 w-px bg-border"></div>
                <span class="text-sm text-primary font-medium">
                  {{ selectedCount }} selected
                </span>
              }
            </div>
          </div>

          <!-- Summary Badges -->
          <div class="flex items-center space-x-2">
            @if (stats.pending > 0) {
              <div 
                hlmBadge 
                variant="outline"
                class="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700"
                hlmTooltip="Pending review"
              >
                <lucide-icon name="clock" hlmIcon size="xs" class="mr-1" />
                {{ stats.pending }} pending
              </div>
            }

            @if (stats.approved > 0) {
              <div 
                hlmBadge 
                variant="outline"
                class="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700"
                hlmTooltip="Approved comments"
              >
                <lucide-icon name="check" hlmIcon size="xs" class="mr-1" />
                {{ stats.approved }} approved
              </div>
            }

            @if (stats.dismissed > 0) {
              <div 
                hlmBadge 
                variant="outline"
                class="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700"
                hlmTooltip="Dismissed comments"
              >
                <lucide-icon name="x" hlmIcon size="xs" class="mr-1" />
                {{ stats.dismissed }} dismissed
              </div>
            }

            @if (stats.modified > 0) {
              <div 
                hlmBadge 
                variant="outline"
                class="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700"
                hlmTooltip="Modified comments"
              >
                <lucide-icon name="edit" hlmIcon size="xs" class="mr-1" />
                {{ stats.modified }} modified
              </div>
            }
          </div>
        </div>

        <!-- Right Side: Action Buttons -->
        <div class="flex items-center space-x-2">
          @if (selectedCount > 0) {
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="onClearSelection.emit()"
              hlmTooltip="Clear selection"
            >
              <lucide-icon name="x" hlmIcon size="sm" class="mr-1" />
              Clear Selection
            </button>
          }

          <!-- Export Dropdown -->
          <div class="relative">
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="toggleExportMenu()"
              [disabled]="isLoading || stats.total === 0"
              hlmTooltip="Export comments"
            >
              <lucide-icon name="download" hlmIcon size="sm" class="mr-1" />
              Export
              <lucide-icon name="chevron-down" hlmIcon size="xs" class="ml-1" />
            </button>
            
            @if (showExportMenu) {
              <div class="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                <div class="py-1">
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    (click)="handleExport('json')"
                  >
                    <lucide-icon name="braces" hlmIcon size="xs" class="mr-2" />
                    Export as JSON
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    (click)="handleExport('csv')"
                  >
                    <lucide-icon name="table" hlmIcon size="xs" class="mr-2" />
                    Export as CSV
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    (click)="handleExport('markdown')"
                  >
                    <lucide-icon name="file-text" hlmIcon size="xs" class="mr-2" />
                    Export as Markdown
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Refresh Button -->
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            (click)="onRefresh.emit()"
            [disabled]="isLoading"
            hlmTooltip="Refresh comments"
          >
            <lucide-icon 
              name="refresh-cw" 
              hlmIcon 
              size="sm" 
              [class.animate-spin]="isLoading"
            />
          </button>
        </div>
      </div>

      <!-- Detailed Statistics -->
      @if (stats.total > 0) {
        <div class="mt-4 pt-4 border-t border-border">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <!-- Severity Breakdown -->
            <div>
              <div class="text-muted-foreground mb-2 font-medium">By Severity</div>
              <div class="space-y-1">
                @if (stats.bySeverity.error > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Error
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.error }}</span>
                  </div>
                }
                @if (stats.bySeverity.warning > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      Warning
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.warning }}</span>
                  </div>
                }
                @if (stats.bySeverity.info > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Info
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.info }}</span>
                  </div>
                }
                @if (stats.bySeverity.suggestion > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Suggestion
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.suggestion }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- File Count -->
            <div>
              <div class="text-muted-foreground mb-2 font-medium">Files with Comments</div>
              <div class="text-lg font-semibold">
                {{ getFileCount() }}
              </div>
            </div>

            <!-- Quality Metrics -->
            <div>
              <div class="text-muted-foreground mb-2 font-medium">Quality</div>
              <div class="space-y-1">
                <div class="text-sm">
                  Avg. Confidence: {{ (stats.averageConfidence * 100).toFixed(0) }}%
                </div>
                <div class="text-sm">
                  High Confidence: {{ stats.highConfidenceCount }}
                </div>
              </div>
            </div>

            <!-- Progress -->
            <div>
              <div class="text-muted-foreground mb-2 font-medium">Progress</div>
              <div class="space-y-1">
                @if (stats.total > 0) {
                  <div class="text-sm">
                    Reviewed: {{ getReviewedPercentage() }}%
                  </div>
                  <div class="w-full bg-muted rounded-full h-2">
                    <div 
                      class="bg-primary h-2 rounded-full transition-all duration-300"
                      [style.width.%]="getReviewedPercentage()"
                    ></div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .comment-header {
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(8px);
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* Export menu animation */
    .export-menu {
      animation: slideDown 0.15s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class CommentHeaderComponent {
  @Input() stats: CommentSummaryStats = {
    total: 0,
    pending: 0,
    approved: 0,
    dismissed: 0,
    modified: 0,
    bySeverity: {
      error: 0,
      warning: 0,
      info: 0,
      suggestion: 0
    },
    byFile: {},
    byCategory: {},
    averageConfidence: 0,
    highConfidenceCount: 0
  };

  @Input() isLoading: boolean = false;
  @Input() selectedCount: number = 0;

  @Output() onRefresh = new EventEmitter<void>();
  @Output() onExport = new EventEmitter<'json' | 'csv' | 'markdown'>();
  @Output() onClearSelection = new EventEmitter<void>();

  protected showExportMenu = false;

  /**
   * Toggle export menu visibility
   */
  protected toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  /**
   * Handle export action
   */
  protected handleExport(format: 'json' | 'csv' | 'markdown') {
    this.onExport.emit(format);
    this.showExportMenu = false;
  }

  /**
   * Handle document click to close export menu
   */
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-menu') && !target.closest('[data-export-trigger]')) {
      this.showExportMenu = false;
    }
  }

  /**
   * Get count of files with comments
   */
  protected getFileCount(): number {
    return Object.keys(this.stats.byFile).length;
  }

  /**
   * Get reviewed percentage
   */
  protected getReviewedPercentage(): number {
    if (this.stats.total === 0) return 0;
    const reviewed = this.stats.approved + this.stats.dismissed;
    return Math.round((reviewed / this.stats.total) * 100);
  }
}