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
    <div class="p-vscode-lg bg-background border-b border-border">
      <!-- Mobile-First Responsive Header Layout -->
      <div class="flex-responsive gap-vscode-lg">
        <!-- Left Side: Title and Stats - Mobile-First -->
        <div class="flex items-center gap-vscode-lg">
          <div>
            <h2 class="text-vscode-lg vscode-md:text-vscode-xl font-semibold text-foreground">
              Review Comments
            </h2>
            <div class="flex items-center gap-vscode-sm mt-vscode-xs">
              <span class="text-vscode-sm text-muted-foreground">
                {{ stats.total }} total
              </span>
              @if (selectedCount > 0) {
                <div class="h-vscode-lg w-px bg-border"></div>
                <span class="text-vscode-sm text-primary font-medium">
                  {{ selectedCount }} selected
                </span>
              }
            </div>
          </div>

          <!-- Summary Badges - Mobile-First Responsive -->
          <div class="flex items-center gap-vscode-sm flex-wrap">
            @if (stats.pending > 0) {
              <div 
                class="badge-vscode-warning"
                title="Pending review"
              >
                <lucide-icon name="clock" size="xs" class="mr-vscode-xs" />
                {{ stats.pending }} pending
              </div>
            }

            @if (stats.approved > 0) {
              <div 
                class="badge-vscode-success"
                title="Approved comments"
              >
                <lucide-icon name="check" size="xs" class="mr-vscode-xs" />
                {{ stats.approved }} approved
              </div>
            }

            @if (stats.dismissed > 0) {
              <div 
                class="badge-vscode bg-muted text-muted-foreground"
                title="Dismissed comments"
              >
                <lucide-icon name="x" size="xs" class="mr-vscode-xs" />
                {{ stats.dismissed }} dismissed
              </div>
            }

            @if (stats.modified > 0) {
              <div 
                class="badge-vscode-info"
                title="Modified comments"
              >
                <lucide-icon name="edit" size="xs" class="mr-vscode-xs" />
                {{ stats.modified }} modified
              </div>
            }
          </div>
        </div>

        <!-- Right Side: Action Buttons - Mobile-First -->
        <div class="flex items-center gap-vscode-sm flex-wrap">
          @if (selectedCount > 0) {
            <button
              class="btn-vscode-ghost btn-vscode-sm w-full vscode-sm:w-auto"
              (click)="onClearSelection.emit()"
              title="Clear selection"
            >
              <lucide-icon name="x" size="sm" class="mr-vscode-xs" />
              <span class="vscode-sm:inline hidden">Clear Selection</span>
            </button>
          }

          <!-- Export Dropdown - Mobile-Optimized -->
          <div class="relative">
            <button
              class="btn-vscode-secondary btn-vscode-sm w-full vscode-sm:w-auto"
              (click)="toggleExportMenu()"
              [disabled]="isLoading || stats.total === 0"
              title="Export comments"
            >
              <lucide-icon name="download" size="sm" class="mr-vscode-xs" />
              <span class="vscode-sm:inline hidden">Export</span>
              <lucide-icon name="chevron-down" size="xs" class="ml-vscode-xs" />
            </button>
            
            @if (showExportMenu) {
              <div class="absolute right-0 top-full mt-vscode-xs w-48 panel-vscode border border-border shadow-vscode-md z-10 export-menu">
                <div class="py-vscode-xs">
                  <button
                    class="w-full text-left px-vscode-md py-vscode-sm text-vscode-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-vscode-sm"
                    (click)="handleExport('json')"
                  >
                    <lucide-icon name="braces" size="xs" />
                    Export as JSON
                  </button>
                  <button
                    class="w-full text-left px-vscode-md py-vscode-sm text-vscode-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-vscode-sm"
                    (click)="handleExport('csv')"
                  >
                    <lucide-icon name="table" size="xs" />
                    Export as CSV
                  </button>
                  <button
                    class="w-full text-left px-vscode-md py-vscode-sm text-vscode-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-vscode-sm"
                    (click)="handleExport('markdown')"
                  >
                    <lucide-icon name="file-text" size="xs" />
                    Export as Markdown
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Refresh Button - Mobile-Optimized -->
          <button
            class="btn-vscode btn-vscode-sm w-full vscode-sm:w-auto"
            (click)="onRefresh.emit()"
            [disabled]="isLoading"
            title="Refresh comments"
          >
            <lucide-icon 
              name="refresh-cw" 
              size="sm" 
              [class.animate-vscode-pulse]="isLoading"
              class="mr-vscode-xs"
            />
            <span class="vscode-sm:inline hidden">
              {{ isLoading ? 'Refreshing...' : 'Refresh' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Detailed Statistics - Enhanced Mobile-First -->
      @if (stats.total > 0) {
        <div class="mt-vscode-lg pt-vscode-lg border-t border-border">
          <div class="grid grid-cols-1 vscode-sm:grid-cols-2 vscode-lg:grid-cols-4 gap-vscode-lg text-vscode-sm">
            <!-- Severity Breakdown -->
            <div>
              <div class="text-muted-foreground mb-vscode-sm font-medium">By Severity</div>
              <div class="space-y-vscode-xs">
                @if (stats.bySeverity.error > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-vscode-sm h-vscode-sm bg-vscode-error rounded-full mr-vscode-sm"></div>
                      Error
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.error }}</span>
                  </div>
                }
                @if (stats.bySeverity.warning > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-vscode-sm h-vscode-sm bg-vscode-warning rounded-full mr-vscode-sm"></div>
                      Warning
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.warning }}</span>
                  </div>
                }
                @if (stats.bySeverity.info > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-vscode-sm h-vscode-sm bg-vscode-info rounded-full mr-vscode-sm"></div>
                      Info
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.info }}</span>
                  </div>
                }
                @if (stats.bySeverity.suggestion > 0) {
                  <div class="flex items-center justify-between">
                    <span class="flex items-center">
                      <div class="w-vscode-sm h-vscode-sm bg-vscode-success rounded-full mr-vscode-sm"></div>
                      Suggestion
                    </span>
                    <span class="font-medium">{{ stats.bySeverity.suggestion }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- File Count -->
            <div>
              <div class="text-muted-foreground mb-vscode-sm font-medium">Files with Comments</div>
              <div class="text-vscode-lg font-semibold">
                {{ getFileCount() }}
              </div>
            </div>

            <!-- Quality Metrics -->
            <div>
              <div class="text-muted-foreground mb-vscode-sm font-medium">Quality</div>
              <div class="space-y-vscode-xs">
                <div class="text-vscode-sm">
                  Avg. Confidence: {{ (stats.averageConfidence * 100).toFixed(0) }}%
                </div>
                <div class="text-vscode-sm">
                  High Confidence: {{ stats.highConfidenceCount }}
                </div>
              </div>
            </div>

            <!-- Progress -->
            <div>
              <div class="text-muted-foreground mb-vscode-sm font-medium">Progress</div>
              <div class="space-y-vscode-xs">
                @if (stats.total > 0) {
                  <div class="text-vscode-sm">
                    Reviewed: {{ getReviewedPercentage() }}%
                  </div>
                  <div class="w-full bg-muted rounded-full h-vscode-sm">
                    <div 
                      class="bg-primary h-vscode-sm rounded-full transition-all duration-vscode"
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