import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullRequest } from '@core/models';
import { 
  AppButtonComponent,
  AppBadgeComponent 
} from '@shared/components';

@Component({
  selector: 'app-pull-request-item',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppBadgeComponent
  ],
  template: `
    <div class="pr-item-card p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
         [class.selected]="isSelected"
         (click)="onSelect()">
      
      <!-- Header Section -->
      <div class="flex items-start justify-between gap-4 mb-3">
        <div class="flex-1 min-w-0">
          <!-- Title and ID -->
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-medium text-sm line-clamp-2 flex-1 text-foreground group-hover:text-primary transition-colors">
              {{ pullRequest.title }}
            </h3>
          </div>
          
          <!-- PR ID and Repository -->
          <div class="text-xs text-muted-foreground">
            #{{ pullRequest.id }} • {{ pullRequest.repository }}
          </div>
        </div>
        
        <!-- Status Badges -->
        <div class="flex gap-2 flex-shrink-0">
          <app-badge [variant]="getStatusVariant(pullRequest.status)">
            {{ getStatusLabel(pullRequest.status) }}
          </app-badge>
          @if (pullRequest.isDraft) {
            <app-badge variant="secondary">Draft</app-badge>
          }
          @if (pullRequest.conflicts) {
            <app-badge variant="destructive">Conflicts</app-badge>
          }
        </div>
      </div>

      <!-- Author and Date Section -->
      <div class="flex items-center justify-between gap-4 mb-3">
        <div class="flex items-center gap-2">
          @if (pullRequest.authorImageUrl) {
            <img 
              [src]="pullRequest.authorImageUrl" 
              [alt]="pullRequest.author"
              class="w-6 h-6 rounded-full flex-shrink-0"
            />
          } @else {
            <div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-medium text-muted-foreground">
                {{ getAuthorInitials(pullRequest.author) }}
              </span>
            </div>
          }
          <div class="min-w-0">
            <div class="text-sm font-medium text-foreground">
              {{ pullRequest.authorDisplayName || pullRequest.author }}
            </div>
            @if (pullRequest.authorEmail && showAuthorEmail) {
              <div class="text-xs text-muted-foreground truncate">
                {{ pullRequest.authorEmail }}
              </div>
            }
          </div>
        </div>
        
        <div class="text-sm text-muted-foreground text-right">
          <div>{{ formatDate(pullRequest.createdDate) }}</div>
          @if (pullRequest.ageInDays !== undefined) {
            <div class="text-xs">
              {{ pullRequest.ageInDays }} day{{ pullRequest.ageInDays !== 1 ? 's' : '' }} ago
            </div>
          }
        </div>
      </div>

      <!-- Branch Information -->
      <div class="flex items-center gap-2 mb-3 text-xs">
        <div class="flex items-center gap-1 px-2 py-1 bg-muted rounded font-mono">
          <span class="text-muted-foreground">from:</span>
          <span class="text-foreground">{{ formatBranch(pullRequest.sourceRefName) }}</span>
        </div>
        <svg class="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
        </svg>
        <div class="flex items-center gap-1 px-2 py-1 bg-muted rounded font-mono">
          <span class="text-muted-foreground">to:</span>
          <span class="text-foreground">{{ formatBranch(pullRequest.targetRefName) }}</span>
        </div>
      </div>

      <!-- Labels Section -->
      @if (pullRequest.labels && pullRequest.labels.length > 0) {
        <div class="flex flex-wrap gap-1 mb-3">
          @for (label of pullRequest.labels.slice(0, maxVisibleLabels); track label) {
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
              {{ label }}
            </span>
          }
          @if (pullRequest.labels.length > maxVisibleLabels) {
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
              +{{ pullRequest.labels.length - maxVisibleLabels }} more
            </span>
          }
        </div>
      }

      <!-- Reviewers Section -->
      @if (pullRequest.reviewers && pullRequest.reviewers.length > 0) {
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-muted-foreground">Reviewers:</span>
          <div class="flex -space-x-1">
            @for (reviewer of pullRequest.reviewers.slice(0, maxVisibleReviewers); track reviewer.id) {
              <div class="relative group/reviewer">
                @if (reviewer.imageUrl) {
                  <img 
                    [src]="reviewer.imageUrl" 
                    [alt]="reviewer.displayName"
                    class="w-6 h-6 rounded-full border-2 border-background"
                    [class]="getReviewerBorderClass(reviewer.vote)"
                  />
                } @else {
                  <div class="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium"
                       [class]="getReviewerBackgroundClass(reviewer.vote)">
                    {{ getAuthorInitials(reviewer.displayName) }}
                  </div>
                }
                
                <!-- Reviewer Tooltip -->
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover/reviewer:opacity-100 transition-opacity z-10 whitespace-nowrap">
                  {{ reviewer.displayName }} - {{ getVoteLabel(reviewer.vote) }}
                  @if (reviewer.isRequired) {
                    <span class="text-destructive">*</span>
                  }
                </div>
              </div>
            }
            @if (pullRequest.reviewers.length > maxVisibleReviewers) {
              <div class="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                +{{ pullRequest.reviewers.length - maxVisibleReviewers }}
              </div>
            }
          </div>
        </div>
      }

      <!-- Work Items Section -->
      @if (pullRequest.workItems && pullRequest.workItems.length > 0) {
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-muted-foreground">Work Items:</span>
          <div class="flex gap-1">
            @for (workItem of pullRequest.workItems.slice(0, maxVisibleWorkItems); track workItem.id) {
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-accent text-accent-foreground">
                {{ workItem.id }}
              </span>
            }
            @if (pullRequest.workItems.length > maxVisibleWorkItems) {
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                +{{ pullRequest.workItems.length - maxVisibleWorkItems }}
              </span>
            }
          </div>
        </div>
      }

      <!-- Description Preview -->
      @if (pullRequest.description && showDescription) {
        <div class="text-sm text-muted-foreground line-clamp-2 mb-3">
          {{ pullRequest.description }}
        </div>
      }

      <!-- Actions Section -->
      <div class="flex items-center justify-between gap-2">
        <!-- Merge Status -->
        @if (pullRequest.mergeStatus) {
          <div class="flex items-center gap-1 text-xs">
            @if (pullRequest.mergeStatus.canMerge) {
              <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-green-600">Ready to merge</span>
            } @else {
              <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span class="text-amber-600">{{ pullRequest.mergeStatus.reason || 'Cannot merge' }}</span>
            }
          </div>
        }

        <!-- Action Buttons -->
        <div class="flex gap-2">
          @if (showViewButton) {
            <app-button
              size="sm"
              variant="outline"
              (onClick)="onView($event)"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              View
            </app-button>
          }
          
          @if (showAnalyzeButton) {
            <app-button
              size="sm"
              (onClick)="onAnalyze($event)"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Analyze
            </app-button>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PullRequestItemComponent {
  @Input() pullRequest!: PullRequest;
  @Input() isSelected = false;
  @Input() showAuthorEmail = false;
  @Input() showDescription = true;
  @Input() showViewButton = true;
  @Input() showAnalyzeButton = true;
  @Input() maxVisibleLabels = 3;
  @Input() maxVisibleReviewers = 4;
  @Input() maxVisibleWorkItems = 3;
  
  @Output() select = new EventEmitter<PullRequest>();
  @Output() view = new EventEmitter<PullRequest>();
  @Output() analyze = new EventEmitter<PullRequest>();

  onSelect(): void {
    this.select.emit(this.pullRequest);
  }

  onView(event: Event): void {
    event.stopPropagation();
    this.view.emit(this.pullRequest);
  }

  onAnalyze(event: Event): void {
    event.stopPropagation();
    this.analyze.emit(this.pullRequest);
  }

  getStatusVariant(status: any): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'abandoned': return 'destructive';
      default: return 'outline';
    }
  }

  getStatusLabel(status: any): string {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'abandoned': return 'Abandoned';
      default: return 'Unknown';
    }
  }

  getAuthorInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatBranch(branchName: string): string {
    // Remove refs/heads/ prefix if present
    return branchName.replace(/^refs\/heads\//, '');
  }

  getReviewerBorderClass(vote: any): string {
    switch (vote) {
      case 10: return 'border-green-500'; // Approved
      case 5: return 'border-blue-500'; // Approved with suggestions
      case -5: return 'border-amber-500'; // Waiting for author
      case -10: return 'border-red-500'; // Rejected
      default: return 'border-muted-foreground'; // No vote
    }
  }

  getReviewerBackgroundClass(vote: any): string {
    switch (vote) {
      case 10: return 'bg-green-100 text-green-700 border-green-500'; // Approved
      case 5: return 'bg-blue-100 text-blue-700 border-blue-500'; // Approved with suggestions
      case -5: return 'bg-amber-100 text-amber-700 border-amber-500'; // Waiting for author
      case -10: return 'bg-red-100 text-red-700 border-red-500'; // Rejected
      default: return 'bg-muted text-muted-foreground'; // No vote
    }
  }

  getVoteLabel(vote: any): string {
    switch (vote) {
      case 10: return 'Approved';
      case 5: return 'Approved with suggestions';
      case -5: return 'Waiting for author';
      case -10: return 'Rejected';
      default: return 'No vote';
    }
  }
}