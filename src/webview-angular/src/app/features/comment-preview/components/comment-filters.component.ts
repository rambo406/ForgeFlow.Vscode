import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CommentFilters } from '../../../core/models/interfaces';
import { CommentSeverity, CommentStatus } from '../../../core/models/enums';

/**
 * Comment filters component for filtering and organizing comments
 */
@Component({
  selector: 'app-comment-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="comment-filters p-4 bg-muted/30 border-b border-border">
      <div class="flex flex-wrap items-center gap-4">
        <!-- Severity Filter -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-muted-foreground">Severity:</label>
          <select 
            class="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            [ngModel]="filters.severity"
            (ngModelChange)="updateFilter('severity', $event)"
            [disabled]="isLoading"
          >
            <option [value]="undefined">All Severities</option>
            <option [value]="CommentSeverity.ERROR">Error</option>
            <option [value]="CommentSeverity.WARNING">Warning</option>
            <option [value]="CommentSeverity.INFO">Info</option>
            <option [value]="CommentSeverity.SUGGESTION">Suggestion</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-muted-foreground">Status:</label>
          <select 
            class="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            [ngModel]="filters.status"
            (ngModelChange)="updateFilter('status', $event)"
            [disabled]="isLoading"
          >
            <option [value]="undefined">All Status</option>
            <option [value]="CommentStatus.PENDING">Pending</option>
            <option [value]="CommentStatus.APPROVED">Approved</option>
            <option [value]="CommentStatus.DISMISSED">Dismissed</option>
            <option [value]="CommentStatus.MODIFIED">Modified</option>
          </select>
        </div>

        <!-- File Filter -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-muted-foreground">File:</label>
          <select 
            class="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-w-xs"
            [ngModel]="filters.file"
            (ngModelChange)="updateFilter('file', $event)"
            [disabled]="isLoading"
          >
            <option [value]="undefined">All Files</option>
            @for (file of uniqueFiles; track file) {
              <option [value]="file">{{ getFileDisplayName(file) }}</option>
            }
          </select>
        </div>

        <!-- Category Filter -->
        @if (uniqueCategories.length > 0) {
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-muted-foreground">Category:</label>
            <select 
              class="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              [ngModel]="filters.category"
              (ngModelChange)="updateFilter('category', $event)"
              [disabled]="isLoading"
            >
              <option [value]="undefined">All Categories</option>
              @for (category of uniqueCategories; track category) {
                <option [value]="category">{{ category }}</option>
              }
            </select>
          </div>
        }

        <!-- Visibility Toggles -->
        <div class="flex items-center space-x-4 ml-auto">
          <div class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="show-pending"
              class="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
              [ngModel]="filters.showPending"
              (ngModelChange)="updateFilter('showPending', $event)"
              [disabled]="isLoading"
            />
            <label for="show-pending" class="text-sm text-muted-foreground cursor-pointer">
              Show Pending
            </label>
          </div>

          <div class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="show-approved"
              class="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
              [ngModel]="filters.showApproved"
              (ngModelChange)="updateFilter('showApproved', $event)"
              [disabled]="isLoading"
            />
            <label for="show-approved" class="text-sm text-muted-foreground cursor-pointer">
              Show Approved
            </label>
          </div>

          <div class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="show-dismissed"
              class="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
              [ngModel]="filters.showDismissed"
              (ngModelChange)="updateFilter('showDismissed', $event)"
              [disabled]="isLoading"
            />
            <label for="show-dismissed" class="text-sm text-muted-foreground cursor-pointer">
              Show Dismissed
            </label>
          </div>
        </div>
      </div>

      <!-- Second Row: Group By and View Mode -->
      <div class="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div class="flex items-center space-x-6">
          <!-- Group By -->
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-muted-foreground">Group by:</label>
            <select 
              class="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              [ngModel]="groupBy"
              (ngModelChange)="onGroupByChange.emit($event)"
              [disabled]="isLoading"
            >
              <option value="file">File</option>
              <option value="severity">Severity</option>
              <option value="none">None</option>
            </select>
          </div>

          <!-- View Mode -->
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-muted-foreground">View:</label>
            <div class="flex rounded-md border border-border overflow-hidden">
              <button
                class="px-3 py-1 text-sm transition-colors"
                [class]="viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent'"
                (click)="onViewModeChange.emit('list')"
                [disabled]="isLoading"
              >
                <lucide-icon name="list" size="14" class="mr-1" />
                List
              </button>
              <button
                class="px-3 py-1 text-sm transition-colors border-l border-border"
                [class]="viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent'"
                (click)="onViewModeChange.emit('grouped')"
                [disabled]="isLoading"
              >
                <lucide-icon name="folder" size="14" class="mr-1" />
                Grouped
              </button>
            </div>
          </div>
        </div>

        <!-- Clear Filters -->
        <button
          class="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          (click)="onClearFilters.emit()"
          [disabled]="isLoading || isFiltersEmpty()"
        >
          <lucide-icon name="filter-x" size="14" class="mr-1" />
          Clear Filters
        </button>
      </div>

      <!-- Active Filters Display -->
      @if (!isFiltersEmpty()) {
        <div class="mt-3 pt-3 border-t border-border">
          <div class="flex items-center space-x-2 flex-wrap">
            <span class="text-sm text-muted-foreground">Active filters:</span>
            
            @if (filters.severity) {
              <span class="inline-flex items-center px-2 py-1 text-xs bg-accent text-accent-foreground rounded-md">
                Severity: {{ getSeverityDisplayName(filters.severity) }}
                <button 
                  class="ml-1 hover:text-foreground"
                  (click)="updateFilter('severity', undefined)"
                >
                  <lucide-icon name="x" size="12" />
                </button>
              </span>
            }

            @if (filters.status) {
              <span class="inline-flex items-center px-2 py-1 text-xs bg-accent text-accent-foreground rounded-md">
                Status: {{ getStatusDisplayName(filters.status) }}
                <button 
                  class="ml-1 hover:text-foreground"
                  (click)="updateFilter('status', undefined)"
                >
                  <lucide-icon name="x" size="12" />
                </button>
              </span>
            }

            @if (filters.file) {
              <span class="inline-flex items-center px-2 py-1 text-xs bg-accent text-accent-foreground rounded-md">
                File: {{ getFileDisplayName(filters.file) }}
                <button 
                  class="ml-1 hover:text-foreground"
                  (click)="updateFilter('file', undefined)"
                >
                  <lucide-icon name="x" size="12" />
                </button>
              </span>
            }

            @if (filters.category) {
              <span class="inline-flex items-center px-2 py-1 text-xs bg-accent text-accent-foreground rounded-md">
                Category: {{ filters.category }}
                <button 
                  class="ml-1 hover:text-foreground"
                  (click)="updateFilter('category', undefined)"
                >
                  <lucide-icon name="x" size="12" />
                </button>
              </span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .comment-filters {
      position: sticky;
      top: 0;
      z-index: 9;
      backdrop-filter: blur(8px);
    }

    /* Custom checkbox styling for VS Code theme */
    input[type="checkbox"] {
      appearance: none;
      width: 16px;
      height: 16px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      background: var(--vscode-input-background);
      position: relative;
      cursor: pointer;
    }

    input[type="checkbox"]:checked {
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    input[type="checkbox"]:checked::before {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--vscode-button-foreground);
      font-size: 12px;
      font-weight: bold;
    }

    input[type="checkbox"]:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }

    input[type="checkbox"]:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Select styling */
    select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
      padding-right: 32px;
    }

    /* Filter chip animation */
    .filter-chip {
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class CommentFiltersComponent {
  @Input() filters: CommentFilters = {
    severity: undefined,
    status: undefined,
    file: undefined,
    category: undefined,
    showApproved: true,
    showDismissed: false,
    showPending: true
  };

  @Input() groupBy: 'file' | 'severity' | 'none' = 'file';
  @Input() viewMode: 'list' | 'grouped' = 'grouped';
  @Input() uniqueFiles: string[] = [];
  @Input() uniqueCategories: string[] = [];
  @Input() isLoading: boolean = false;

  @Output() onFiltersChange = new EventEmitter<Partial<CommentFilters>>();
  @Output() onGroupByChange = new EventEmitter<'file' | 'severity' | 'none'>();
  @Output() onViewModeChange = new EventEmitter<'list' | 'grouped'>();
  @Output() onClearFilters = new EventEmitter<void>();

  // Expose enums to template
  protected CommentSeverity = CommentSeverity;
  protected CommentStatus = CommentStatus;

  /**
   * Update a specific filter
   */
  protected updateFilter(key: keyof CommentFilters, value: any) {
    const updatedFilters = { ...this.filters, [key]: value };
    this.onFiltersChange.emit(updatedFilters);
  }

  /**
   * Check if any filters are active
   */
  protected isFiltersEmpty(): boolean {
    return !this.filters.severity && 
           !this.filters.status && 
           !this.filters.file && 
           !this.filters.category &&
           this.filters.showApproved && 
           !this.filters.showDismissed && 
           this.filters.showPending;
  }

  /**
   * Get display name for file path
   */
  protected getFileDisplayName(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length > 2) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }

  /**
   * Get display name for severity
   */
  protected getSeverityDisplayName(severity: CommentSeverity): string {
    switch (severity) {
      case CommentSeverity.ERROR:
        return 'Error';
      case CommentSeverity.WARNING:
        return 'Warning';
      case CommentSeverity.INFO:
        return 'Info';
      case CommentSeverity.SUGGESTION:
        return 'Suggestion';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get display name for status
   */
  protected getStatusDisplayName(status: CommentStatus): string {
    switch (status) {
      case CommentStatus.PENDING:
        return 'Pending';
      case CommentStatus.APPROVED:
        return 'Approved';
      case CommentStatus.DISMISSED:
        return 'Dismissed';
      case CommentStatus.MODIFIED:
        return 'Modified';
      default:
        return 'Unknown';
    }
  }
}