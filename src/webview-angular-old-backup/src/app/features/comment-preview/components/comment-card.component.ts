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
      class="card-vscode transition-all duration-vscode hover:shadow-vscode-md"
      [class]="getCardClasses()"
    >
      <!-- Card Header - Mobile-First Responsive Design -->
      <div class="flex items-start justify-between gap-vscode-md">
        <div class="flex items-start gap-vscode-md flex-1 min-w-0">
          <!-- Selection Checkbox - Touch-Friendly -->
          <div class="flex-shrink-0 pt-vscode-xs">
            <input
              type="checkbox"
              [checked]="isSelected"
              (change)="handleCheckboxChange($event)"
              [disabled]="isLoading"
              class="input-vscode w-vscode-lg h-vscode-lg focus-vscode"
            />
          </div>

          <!-- Comment Content - Enhanced Responsive Layout -->
          <div class="flex-1 min-w-0">
            <!-- File path - Mobile-Optimized Display -->
            @if (showFilePath) {
              <div class="flex items-center gap-vscode-sm mb-vscode-sm text-vscode-xs text-muted-foreground">
                <lucide-icon name="file" size="12" />
                <span class="font-mono truncate">{{ comment.filePath }}</span>
                @if (comment.lineNumber) {
                  <span class="text-muted-foreground">:</span>
                  <span class="font-medium">{{ comment.lineNumber }}</span>
                }
              </div>
            }

            <!-- Severity and Status Badges - Mobile-First Responsive -->
            <div class="flex items-center gap-vscode-sm mb-vscode-md flex-wrap">
              <span 
                class="badge-vscode text-vscode-xs font-medium"
                [class]="getSeverityClasses(comment.severity)"
              >
                <lucide-icon [name]="getSeverityIcon(comment.severity)" size="10" class="mr-vscode-xs" />
                {{ getSeverityLabel(comment.severity) }}
              </span>

              <span 
                class="badge-vscode text-vscode-xs font-medium"
                [class]="getStatusClasses(comment.status)"
              >
                <lucide-icon [name]="getStatusIcon(comment.status)" size="10" class="mr-vscode-xs" />
                {{ getStatusLabel(comment.status) }}
              </span>

              @if (comment.confidence !== undefined) {
                <span 
                  class="badge-vscode bg-muted text-muted-foreground text-vscode-xs"
                  [title]="'Confidence: ' + (comment.confidence * 100).toFixed(0) + '%'"
                >
                  <lucide-icon name="target" size="10" class="mr-vscode-xs" />
                  {{ (comment.confidence * 100).toFixed(0) }}%
                </span>
              }

              @if (comment.category) {
                <span class="badge-vscode bg-accent text-accent-foreground text-vscode-xs">
                  {{ comment.category }}
                </span>
              }
            </div>

            <!-- Comment Content - Enhanced Mobile-First Editing -->
            <div class="mb-vscode-md">
              @if (isEditing) {
                <div class="space-y-vscode-sm">
                  <textarea
                    class="input-vscode w-full text-vscode-sm resize-y min-h-[100px]"
                    [ngModel]="editingContent"
                    (ngModelChange)="editingContent = $event"
                    placeholder="Enter comment content..."
                    [disabled]="isLoading"
                  ></textarea>
                  <div class="flex gap-vscode-sm flex-col vscode-sm:flex-row">
                    <button
                      class="btn-vscode text-vscode-sm w-full vscode-sm:w-auto"
                      (click)="saveEdit()"
                      [disabled]="isLoading || !editingContent.trim()"
                    >
                      <lucide-icon name="check" size="12" class="mr-vscode-xs" />
                      Save
                    </button>
                    <button
                      class="btn-vscode-secondary text-vscode-sm w-full vscode-sm:w-auto"
                      (click)="cancelEdit()"
                      [disabled]="isLoading"
                    >
                      <lucide-icon name="x" size="12" class="mr-vscode-xs" />
                      Cancel
                    </button>
                  </div>
                </div>
              } @else {
                <div 
                  class="text-vscode-sm text-foreground leading-relaxed whitespace-pre-wrap"
                  [innerHTML]="getFormattedContent()"
                ></div>
              }
            </div>

            <!-- Code Context - Mobile-Optimized Collapsible -->
            @if (comment.codeContext && !isEditing) {
              <div class="mb-vscode-md">
                <details class="group">
                  <summary class="cursor-pointer text-vscode-xs text-muted-foreground hover:text-foreground flex items-center gap-vscode-xs focus-vscode">
                    <lucide-icon name="code" size="12" />
                    <span>Code Context</span>
                    <lucide-icon name="chevron-down" size="12" class="group-open:rotate-180 transition-transform" />
                  </summary>
                  <div class="mt-vscode-sm">
                    <pre class="panel-vscode text-vscode-xs font-mono whitespace-pre-wrap overflow-x-auto">{{ comment.codeContext }}</pre>
                  </div>
                </details>
              </div>
            }

            <!-- Suggested Fix - Enhanced Mobile Display -->
            @if (comment.suggestedFix && !isEditing) {
              <div class="mb-vscode-md panel-vscode bg-accent/30 border border-accent">
                <div class="flex items-center gap-vscode-sm mb-vscode-sm">
                  <lucide-icon name="lightbulb" size="14" class="text-accent-foreground" />
                  <span class="text-vscode-sm font-medium text-accent-foreground">Suggested Fix</span>
                </div>
                <pre class="text-vscode-sm font-mono whitespace-pre-wrap overflow-x-auto mb-vscode-sm">{{ comment.suggestedFix }}</pre>
                <button
                  class="btn-vscode-secondary text-vscode-xs w-full vscode-sm:w-auto"
                  (click)="onApplySuggestion.emit()"
                  [disabled]="isLoading || comment.fixApplied"
                >
                  <lucide-icon name="wand-2" size="12" class="mr-vscode-xs" />
                  {{ comment.fixApplied ? 'Applied' : 'Apply Fix' }}
                </button>
              </div>
            }

            <!-- Tags - Mobile-First Responsive Tags -->
            @if (comment.tags && comment.tags.length > 0 && !isEditing) {
              <div class="flex flex-wrap gap-vscode-xs mb-vscode-md">
                @for (tag of comment.tags; track tag) {
                  <span class="badge-vscode bg-secondary text-secondary-foreground text-vscode-xs">
                    #{{ tag }}
                  </span>
                }
              </div>
            }

            <!-- Metadata - Mobile-Optimized Display -->
            @if (!isEditing) {
              <div class="flex items-center gap-vscode-lg text-vscode-xs text-muted-foreground flex-wrap">
                @if (comment.lastModified) {
                  <span class="flex items-center gap-vscode-xs">
                    <lucide-icon name="clock" size="10" />
                    <span>Modified {{ getTimeAgo(comment.lastModified) }}</span>
                  </span>
                }
                @if (comment.modifiedBy) {
                  <span class="flex items-center gap-vscode-xs">
                    <lucide-icon name="user" size="10" />
                    <span>by {{ comment.modifiedBy }}</span>
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Action Buttons - Mobile-First Layout -->
        @if (!isEditing) {
          <div class="flex items-center gap-vscode-xs flex-shrink-0 flex-col vscode-sm:flex-row">
            <button
              class="btn-vscode-ghost p-vscode-sm w-full vscode-sm:w-auto"
              (click)="startEdit()"
              [disabled]="isLoading"
              title="Edit comment"
            >
              <lucide-icon name="edit-2" size="14" />
              <span class="vscode-sm:sr-only ml-vscode-xs">Edit</span>
            </button>

            @if (comment.status !== CommentStatus.APPROVED) {
              <button
                class="btn-vscode-ghost p-vscode-sm text-vscode-success w-full vscode-sm:w-auto"
                (click)="onApprove.emit()"
                [disabled]="isLoading"
                title="Approve comment"
              >
                <lucide-icon name="check" size="14" />
                <span class="vscode-sm:sr-only ml-vscode-xs">Approve</span>
              </button>
            }

            @if (comment.status !== CommentStatus.DISMISSED) {
              <button
                class="btn-vscode-ghost p-vscode-sm text-vscode-error w-full vscode-sm:w-auto"
                (click)="onDismiss.emit()"
                [disabled]="isLoading"
                title="Dismiss comment"
              >
                <lucide-icon name="x" size="14" />
                <span class="vscode-sm:sr-only ml-vscode-xs">Dismiss</span>
              </button>
            }

            <!-- More Actions Menu - Mobile-Optimized -->
            <div class="relative">
              <button
                class="btn-vscode-ghost p-vscode-sm w-full vscode-sm:w-auto"
                (click)="toggleActionsMenu()"
                [disabled]="isLoading"
                title="More actions"
              >
                <lucide-icon name="more-horizontal" size="14" />
                <span class="vscode-sm:sr-only ml-vscode-xs">More</span>
              </button>

              @if (showActionsMenu) {
                <div class="absolute right-0 top-full mt-vscode-xs w-48 panel-vscode border border-border shadow-vscode-md z-10">
                  <div class="py-vscode-xs">
                    <button
                      class="w-full text-left px-vscode-md py-vscode-sm text-vscode-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-vscode-sm"
                      (click)="copyToClipboard()"
                    >
                      <lucide-icon name="copy" size="12" />
                      <span>Copy Comment</span>
                    </button>
                    <button
                      class="w-full text-left px-vscode-md py-vscode-sm text-vscode-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-vscode-sm"
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