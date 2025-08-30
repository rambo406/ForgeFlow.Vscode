import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Comment actions component for bulk operations
 */
@Component({
  selector: 'app-comment-actions',
  standalone: true,
  imports: [
    CommonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="comment-actions p-4 bg-muted/30 border-t border-border">
      <div class="flex items-center justify-between">
        <!-- Selection Info -->
        <div class="flex items-center space-x-4">
          <div class="text-sm font-medium text-foreground">
            {{ selectedCount }} comment{{ selectedCount !== 1 ? 's' : '' }} selected
          </div>
          
          @if (pendingActionsCount > 0) {
            <div class="text-sm text-muted-foreground">
              {{ pendingActionsCount }} pending review
            </div>
          }
        </div>

        <!-- Bulk Actions -->
        <div class="flex items-center space-x-2">
          <!-- Select All Toggle -->
          <button
            class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            (click)="toggleSelectAll()"
            [disabled]="isLoading"
          >
            <lucide-icon 
              [name]="allSelected ? 'square' : 'check-square'" 
              size="14" 
              class="mr-2"
            />
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </button>

          <!-- Bulk Approve -->
          <button
            class="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            (click)="onBulkApprove.emit()"
            [disabled]="isLoading || selectedCount === 0"
            title="Approve selected comments"
          >
            <lucide-icon name="check" size="14" class="mr-2" />
            Approve <span [textContent]="selectedCount > 0 ? '(' + selectedCount + ')' : ''"></span>
          </button>

          <!-- Bulk Dismiss -->
          <button
            class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            (click)="onBulkDismiss.emit()"
            [disabled]="isLoading || selectedCount === 0"
            title="Dismiss selected comments"
          >
            <lucide-icon name="x" size="14" class="mr-2" />
            Dismiss <span [textContent]="selectedCount > 0 ? '(' + selectedCount + ')' : ''"></span>
          </button>

          <!-- More Actions Dropdown -->
          <div class="relative">
            <button
              class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              (click)="toggleMoreActions()"
              [disabled]="isLoading || selectedCount === 0"
              title="More actions"
            >
              <lucide-icon name="more-horizontal" size="14" class="mr-1" />
              More
              <lucide-icon name="chevron-down" size="12" class="ml-1" />
            </button>

            @if (showMoreActions) {
              <div class="absolute right-0 bottom-full mb-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                <div class="py-1">
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center space-x-2"
                    (click)="handleBulkExport()"
                  >
                    <lucide-icon name="download" size="12" />
                    <span>Export Selected</span>
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center space-x-2"
                    (click)="handleBulkCopy()"
                  >
                    <lucide-icon name="copy" size="12" />
                    <span>Copy to Clipboard</span>
                  </button>
                  <div class="border-t border-border my-1"></div>
                  <button
                    class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                    (click)="handleBulkDelete()"
                  >
                    <lucide-icon name="trash-2" size="12" />
                    <span>Delete Selected</span>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Clear Selection -->
          <button
            class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            (click)="onClearSelection.emit()"
            [disabled]="isLoading || selectedCount === 0"
            title="Clear selection"
          >
            <lucide-icon name="x" size="14" />
          </button>
        </div>
      </div>

      <!-- Progress Indicators (if actions are in progress) -->
      @if (isLoading) {
        <div class="mt-3 pt-3 border-t border-border">
          <div class="flex items-center space-x-3">
            <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span class="text-sm text-muted-foreground">Processing bulk action...</span>
          </div>
        </div>
      }

      <!-- Action Shortcuts Help -->
      @if (selectedCount > 0 && !isLoading) {
        <div class="mt-3 pt-3 border-t border-border">
          <div class="text-xs text-muted-foreground">
            <span class="font-medium">Keyboard shortcuts:</span>
            <span class="ml-2">
              <kbd class="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">A</kbd> Approve all
            </span>
            <span class="ml-2">
              <kbd class="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">D</kbd> Dismiss all
            </span>
            <span class="ml-2">
              <kbd class="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">Esc</kbd> Clear selection
            </span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .comment-actions {
      position: sticky;
      bottom: 0;
      z-index: 10;
      backdrop-filter: blur(8px);
      animation: slideUp 0.2s ease-out;
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

    /* Spinner animation */
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

    /* More actions menu animation */
    .more-actions-menu {
      animation: slideUp 0.15s ease-out;
    }

    /* Keyboard shortcut styling */
    kbd {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.75rem;
      line-height: 1;
      border: 1px solid var(--vscode-input-border);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    /* Button states */
    .bulk-action-btn {
      transition: all 0.2s ease-out;
    }

    .bulk-action-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .bulk-action-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    /* Action count badge */
    .action-count {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 2px 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  `],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown)': 'onKeyDown($event)'
  }
})
export class CommentActionsComponent {
  @Input() selectedCount: number = 0;
  @Input() allSelected: boolean = false;
  @Input() pendingActionsCount: number = 0;
  @Input() isLoading: boolean = false;

  @Output() onBulkApprove = new EventEmitter<void>();
  @Output() onBulkDismiss = new EventEmitter<void>();
  @Output() onSelectAll = new EventEmitter<void>();
  @Output() onClearSelection = new EventEmitter<void>();

  protected showMoreActions = false;

  /**
   * Toggle select all
   */
  protected toggleSelectAll() {
    this.onSelectAll.emit();
  }

  /**
   * Toggle more actions menu
   */
  protected toggleMoreActions() {
    this.showMoreActions = !this.showMoreActions;
  }

  /**
   * Handle bulk export
   */
  protected handleBulkExport() {
    // Implementation would depend on parent component capabilities
    console.log('Bulk export requested');
    this.showMoreActions = false;
  }

  /**
   * Handle bulk copy
   */
  protected async handleBulkCopy() {
    try {
      // This would be implemented by getting selected comments from parent
      console.log('Bulk copy requested');
      this.showMoreActions = false;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  /**
   * Handle bulk delete
   */
  protected handleBulkDelete() {
    // Implementation would depend on parent component capabilities
    if (confirm(`Are you sure you want to delete ${this.selectedCount} selected comments? This action cannot be undone.`)) {
      console.log('Bulk delete requested');
      this.showMoreActions = false;
    }
  }

  /**
   * Handle document click to close menus
   */
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.more-actions-menu') && !target.closest('[data-more-actions-trigger]')) {
      this.showMoreActions = false;
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent) {
    if (this.selectedCount === 0 || this.isLoading) return;

    switch (event.key.toLowerCase()) {
      case 'a':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.onBulkApprove.emit();
        }
        break;
      case 'd':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.onBulkDismiss.emit();
        }
        break;
      case 'escape':
        event.preventDefault();
        this.onClearSelection.emit();
        break;
    }
  }
}