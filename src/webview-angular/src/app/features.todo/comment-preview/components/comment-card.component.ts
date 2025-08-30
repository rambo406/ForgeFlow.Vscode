import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ReviewComment } from '../../../core/models/interfaces';
import { CommentSeverity, CommentStatus } from '../../../core/models/enums';

/**
 * Individual comment card component with inline editing and actions
 */
@Component({
  selector: 'app-comment-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div 
      class="comment-card border border-border rounded-lg transition-all duration-200 hover:shadow-md"
      [class]="getCardClasses()"
    >
      <!-- Card Header -->
      <div class="flex items-start justify-between p-4 pb-3">
        <div class="flex items-start space-x-3 flex-1 min-w-0">
          <!-- Selection Checkbox -->
          <div class="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              [checked]="isSelected"
              (change)="handleCheckboxChange($event)"
              [disabled]="isLoading"
              class="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
          </div>

          <!-- Comment Content -->
          <div class="flex-1 min-w-0">
            <!-- File path (if shown) -->
            @if (showFilePath) {
              <div class="flex items-center space-x-2 mb-2 text-xs text-muted-foreground">
                <lucide-icon name="file" size="12" />
                <span class="font-mono truncate">{{ comment.filePath }}</span>
                @if (comment.lineNumber) {
                  <span class="text-muted-foreground">:</span>
                  <span class="font-medium">{{ comment.lineNumber }}</span>
                }
              </div>
            }

            <!-- Severity and Status Badges -->
            <div class="flex items-center space-x-2 mb-3">
              <span 
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                [class]="getSeverityClasses(comment.severity)"
              >
                <lucide-icon [name]="getSeverityIcon(comment.severity)" size="10" class="mr-1" />
                {{ getSeverityLabel(comment.severity) }}
              </span>

              <span 
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                [class]="getStatusClasses(comment.status)"
              >
                <lucide-icon [name]="getStatusIcon(comment.status)" size="10" class="mr-1" />
                {{ getStatusLabel(comment.status) }}
              </span>

              @if (comment.confidence !== undefined) {
                <span 
                  class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground"
                  [title]="'Confidence: ' + (comment.confidence * 100).toFixed(0) + '%'"
                >
                  <lucide-icon name="target" size="10" class="mr-1" />
                  {{ (comment.confidence * 100).toFixed(0) }}%
                </span>
              }

              @if (comment.category) {
                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-accent text-accent-foreground">
                  {{ comment.category }}
                </span>
              }
            </div>

            <!-- Comment Content (Editable) -->
            <div class="mb-3">
              @if (isEditing) {
                <div class="space-y-2">
                  <textarea
                    class="w-full p-3 text-sm border border-border rounded-md bg-background text-foreground resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    [ngModel]="editingContent"
                    (ngModelChange)="editingContent = $event"
                    placeholder="Enter comment content..."
                    [disabled]="isLoading"
                  ></textarea>
                  <div class="flex items-center space-x-2">
                    <button
                      class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      (click)="saveEdit()"
                      [disabled]="isLoading || !editingContent.trim()"
                    >
                      <lucide-icon name="check" size="12" class="mr-1" />
                      Save
                    </button>
                    <button
                      class="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent"
                      (click)="cancelEdit()"
                      [disabled]="isLoading"
                    >
                      <lucide-icon name="x" size="12" class="mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              } @else {
                <div 
                  class="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
                  [innerHTML]="getFormattedContent()"
                ></div>
              }
            </div>

            <!-- Code Context (if available) -->
            @if (comment.codeContext && !isEditing) {
              <div class="mb-3">
                <details class="group">
                  <summary class="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1">
                    <lucide-icon name="code" size="12" />
                    <span>Code Context</span>
                    <lucide-icon name="chevron-down" size="12" class="group-open:rotate-180 transition-transform" />
                  </summary>
                  <div class="mt-2 p-3 bg-muted rounded-md">
                    <pre class="text-xs text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto">{{ comment.codeContext }}</pre>
                  </div>
                </details>
              </div>
            }

            <!-- Suggested Fix (if available) -->
            @if (comment.suggestedFix && !isEditing) {
              <div class="mb-3 p-3 bg-accent/30 border border-accent rounded-md">
                <div class="flex items-center space-x-2 mb-2">
                  <lucide-icon name="lightbulb" size="14" class="text-accent-foreground" />
                  <span class="text-sm font-medium text-accent-foreground">Suggested Fix</span>
                </div>
                <pre class="text-sm text-foreground font-mono whitespace-pre-wrap overflow-x-auto">{{ comment.suggestedFix }}</pre>
                <button
                  class="mt-2 px-3 py-1 text-xs bg-accent text-accent-foreground rounded-md hover:bg-accent/80 disabled:opacity-50"
                  (click)="onApplySuggestion.emit()"
                  [disabled]="isLoading || comment.fixApplied"
                >
                  <lucide-icon name="wand-2" size="12" class="mr-1" />
                  {{ comment.fixApplied ? 'Applied' : 'Apply Fix' }}
                </button>
              </div>
            }

            <!-- Tags (if available) -->
            @if (comment.tags && comment.tags.length > 0 && !isEditing) {
              <div class="flex flex-wrap gap-1 mb-3">
                @for (tag of comment.tags; track tag) {
                  <span class="inline-flex items-center px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md">
                    #{{ tag }}
                  </span>
                }
              </div>
            }

            <!-- Metadata -->
            @if (!isEditing) {
              <div class="flex items-center space-x-4 text-xs text-muted-foreground">
                @if (comment.lastModified) {
                  <span class="flex items-center space-x-1">
                    <lucide-icon name="clock" size="10" />
                    <span>Modified {{ getTimeAgo(comment.lastModified) }}</span>
                  </span>
                }
                @if (comment.modifiedBy) {
                  <span class="flex items-center space-x-1">
                    <lucide-icon name="user" size="10" />
                    <span>by {{ comment.modifiedBy }}</span>
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Action Buttons -->
        @if (!isEditing) {
          <div class="flex items-center space-x-1 flex-shrink-0">
            <button
              class="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50"
              (click)="startEdit()"
              [disabled]="isLoading"
              title="Edit comment"
            >
              <lucide-icon name="edit-2" size="14" />
            </button>

            @if (comment.status !== CommentStatus.APPROVED) {
              <button
                class="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors disabled:opacity-50"
                (click)="onApprove.emit()"
                [disabled]="isLoading"
                title="Approve comment"
              >
                <lucide-icon name="check" size="14" />
              </button>
            }

            @if (comment.status !== CommentStatus.DISMISSED) {
              <button
                class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                (click)="onDismiss.emit()"
                [disabled]="isLoading"
                title="Dismiss comment"
              >
                <lucide-icon name="x" size="14" />
              </button>
            }

            <!-- More Actions Menu -->
            <div class="relative">
              <button
                class="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                (click)="toggleActionsMenu()"
                [disabled]="isLoading"
                title="More actions"
              >
                <lucide-icon name="more-horizontal" size="14" />
              </button>

              @if (showActionsMenu) {
                <div class="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                  <div class="py-1">
                    <button
                      class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center space-x-2"
                      (click)="copyToClipboard()"
                    >
                      <lucide-icon name="copy" size="12" />
                      <span>Copy Comment</span>
                    </button>
                    <button
                      class="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center space-x-2"
                      (click)="copyFileLocation()"
                    >
                      <lucide-icon name="link" size="12" />
                      <span>Copy File Location</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .comment-card {
      transition: all 0.2s ease-out;
    }

    .comment-card:hover {
      transform: translateY(-1px);
    }

    .comment-card.selected {
      border-color: var(--vscode-button-background);
      box-shadow: 0 0 0 1px var(--vscode-button-background);
    }

    .comment-card.pending {
      border-left: 4px solid var(--vscode-editorWarning-foreground);
    }

    .comment-card.approved {
      border-left: 4px solid var(--vscode-terminal-ansiGreen);
    }

    .comment-card.dismissed {
      border-left: 4px solid var(--vscode-editorInfo-foreground);
      opacity: 0.7;
    }

    .comment-card.modified {
      border-left: 4px solid var(--vscode-terminal-ansiBlue);
    }

    /* Custom checkbox styling */
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
      font-size: 10px;
      font-weight: bold;
    }

    /* Code context styling */
    details summary {
      user-select: none;
    }

    details[open] summary .chevron {
      transform: rotate(180deg);
    }

    /* Actions menu animation */
    .actions-menu {
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

    /* Edit mode styling */
    .edit-mode {
      background-color: var(--vscode-input-background);
      border-color: var(--vscode-button-background);
    }

    /* Severity and status colors */
    .severity-error {
      background-color: rgba(248, 113, 113, 0.1);
      color: rgb(248, 113, 113);
      border: 1px solid rgba(248, 113, 113, 0.3);
    }

    .severity-warning {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .severity-info {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .severity-suggestion {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-pending {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .status-approved {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-dismissed {
      background-color: rgba(156, 163, 175, 0.1);
      color: rgb(156, 163, 175);
      border: 1px solid rgba(156, 163, 175, 0.3);
    }

    .status-modified {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
  `],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class CommentCardComponent {
  @Input() comment!: ReviewComment;
  @Input() isSelected: boolean = false;
  @Input() isLoading: boolean = false;
  @Input() showFilePath: boolean = true;

  @Output() onSelect = new EventEmitter<boolean>();
  @Output() onUpdate = new EventEmitter<string>();
  @Output() onApprove = new EventEmitter<void>();
  @Output() onDismiss = new EventEmitter<void>();
  @Output() onApplySuggestion = new EventEmitter<void>();

  protected isEditing = false;
  protected editingContent = '';
  protected showActionsMenu = false;

  // Expose enums to template
  protected CommentSeverity = CommentSeverity;
  protected CommentStatus = CommentStatus;

  /**
   * Handle checkbox change
   */
  protected handleCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.onSelect.emit(target.checked);
  }

  /**
   * Get CSS classes for the card
   */
  protected getCardClasses(): string {
    const classes = ['bg-background'];
    
    if (this.isSelected) {
      classes.push('selected');
    }

    if (this.isEditing) {
      classes.push('edit-mode');
    }

    classes.push(this.comment.status);

    return classes.join(' ');
  }

  /**
   * Get severity-specific CSS classes
   */
  protected getSeverityClasses(severity: CommentSeverity): string {
    return `severity-${severity}`;
  }

  /**
   * Get status-specific CSS classes
   */
  protected getStatusClasses(status: CommentStatus): string {
    return `status-${status}`;
  }

  /**
   * Get severity icon
   */
  protected getSeverityIcon(severity: CommentSeverity): string {
    switch (severity) {
      case CommentSeverity.ERROR:
        return 'alert-circle';
      case CommentSeverity.WARNING:
        return 'alert-triangle';
      case CommentSeverity.INFO:
        return 'info';
      case CommentSeverity.SUGGESTION:
        return 'lightbulb';
      default:
        return 'message-square';
    }
  }

  /**
   * Get status icon
   */
  protected getStatusIcon(status: CommentStatus): string {
    switch (status) {
      case CommentStatus.APPROVED:
        return 'check';
      case CommentStatus.DISMISSED:
        return 'x';
      case CommentStatus.MODIFIED:
        return 'edit';
      case CommentStatus.PENDING:
      default:
        return 'clock';
    }
  }

  /**
   * Get severity label
   */
  protected getSeverityLabel(severity: CommentSeverity): string {
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
   * Get status label
   */
  protected getStatusLabel(status: CommentStatus): string {
    switch (status) {
      case CommentStatus.APPROVED:
        return 'Approved';
      case CommentStatus.DISMISSED:
        return 'Dismissed';
      case CommentStatus.MODIFIED:
        return 'Modified';
      case CommentStatus.PENDING:
        return 'Pending';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get formatted content with basic HTML formatting
   */
  protected getFormattedContent(): string {
    if (!this.comment.content) return '';
    
    // Basic markdown-like formatting
    let formatted = this.comment.content
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    return formatted;
  }

  /**
   * Start editing mode
   */
  protected startEdit() {
    this.isEditing = true;
    this.editingContent = this.comment.content;
    this.showActionsMenu = false;
  }

  /**
   * Cancel editing
   */
  protected cancelEdit() {
    this.isEditing = false;
    this.editingContent = '';
  }

  /**
   * Save edit
   */
  protected saveEdit() {
    if (this.editingContent?.trim()) {
      this.onUpdate.emit(this.editingContent.trim());
      this.isEditing = false;
      this.editingContent = '';
    }
  }

  /**
   * Toggle actions menu
   */
  protected toggleActionsMenu() {
    this.showActionsMenu = !this.showActionsMenu;
  }

  /**
   * Handle document click to close menus
   */
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.actions-menu') && !target.closest('[data-actions-trigger]')) {
      this.showActionsMenu = false;
    }
  }

  /**
   * Copy comment to clipboard
   */
  protected async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.comment.content);
      this.showActionsMenu = false;
      // Could emit a notification event here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  /**
   * Copy file location to clipboard
   */
  protected async copyFileLocation() {
    try {
      const location = `${this.comment.filePath}:${this.comment.lineNumber}`;
      await navigator.clipboard.writeText(location);
      this.showActionsMenu = false;
      // Could emit a notification event here
    } catch (error) {
      console.error('Failed to copy file location:', error);
    }
  }

  /**
   * Get time ago string
   */
  protected getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
}