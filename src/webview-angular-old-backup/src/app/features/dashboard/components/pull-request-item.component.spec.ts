import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PullRequestItemComponent } from './pull-request-item.component';
import { PullRequest, PullRequestStatus, ReviewerVote } from '@core/models';

// Mock shared components
@Component({
  selector: 'app-button',
  template: '<button [class]="additionalClasses" (click)="onClick.emit()"><ng-content></ng-content></button>',
  // Not standalone so it can be declared in the testing module
})
class MockAppButtonComponent {
  variant = 'default';
  size = 'default';
  disabled = false;
  additionalClasses = '';
  onClick = { emit: jest.fn() };
}

@Component({
  selector: 'app-badge',
  template: '<span [class]="additionalClasses"><ng-content></ng-content></span>',
  standalone: true,
  inputs: ['variant', 'additionalClasses']
})
class MockAppBadgeComponent {
  variant = 'default';
  additionalClasses = '';
}

describe('PullRequestItemComponent', () => {
  let component: PullRequestItemComponent;
  let fixture: ComponentFixture<PullRequestItemComponent>;

  const mockPullRequest: PullRequest = {
    id: 123,
    title: 'Test Pull Request Title',
    description: 'Test description for the pull request',
    author: 'John Doe',
    authorDisplayName: 'John Doe',
    authorEmail: 'john.doe@example.com',
    authorImageUrl: 'https://example.com/avatar.jpg',
    createdDate: '2024-01-15T10:00:00Z',
    updatedDate: '2024-01-16T15:30:00Z',
    status: PullRequestStatus.ACTIVE,
    isDraft: false,
    repository: 'test-repo',
    repositoryId: 'repo-123',
    project: 'Test Project',
    projectId: 'proj-123',
    sourceRefName: 'refs/heads/feature/new-feature',
    targetRefName: 'refs/heads/main',
    url: 'https://dev.azure.com/org/project/_git/repo/pullrequest/123',
    webUrl: 'https://dev.azure.com/org/project/_git/repo/pullrequest/123',
    labels: ['bug', 'high-priority', 'needs-review'],
    reviewers: [
      {
        id: 'reviewer-1',
        displayName: 'Jane Smith',
        email: 'jane.smith@example.com',
        imageUrl: 'https://example.com/jane-avatar.jpg',
        vote: ReviewerVote.APPROVED,
        isRequired: true,
        isFlagged: false
      },
      {
        id: 'reviewer-2',
        displayName: 'Bob Wilson',
        email: 'bob.wilson@example.com',
        imageUrl: '',
        vote: ReviewerVote.WAITING_FOR_AUTHOR,
        isRequired: false,
        isFlagged: false
      }
    ],
    workItems: [
      { id: 1001, title: 'Fix bug in login', type: 'Bug', state: 'Active' },
      { id: 1002, title: 'Update documentation', type: 'Task', state: 'New' }
    ],
    mergeStatus: {
      canMerge: true,
      reason: '',
      conflictedFiles: []
    },
    conflicts: false,
    ageInDays: 5
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PullRequestItemComponent],
      declarations: [MockAppButtonComponent, MockAppBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PullRequestItemComponent);
    component = fixture.componentInstance;
    component.pullRequest = mockPullRequest;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should display pull request title and ID', () => {
      const titleElement = fixture.debugElement.query(By.css('h3'));
      const idElement = fixture.debugElement.query(By.css('.text-xs.text-muted-foreground'));
      
      expect(titleElement.nativeElement.textContent.trim()).toBe('Test Pull Request Title');
      expect(idElement.nativeElement.textContent.trim()).toContain('#123');
      expect(idElement.nativeElement.textContent.trim()).toContain('test-repo');
    });

    it('should display author information with image', () => {
      const authorImg = fixture.debugElement.query(By.css('img[alt="John Doe"]'));
      const authorName = fixture.debugElement.query(By.css('.text-sm.font-medium.text-foreground'));
      
      expect(authorImg).toBeTruthy();
      expect(authorImg.nativeElement.src).toBe('https://example.com/avatar.jpg');
      expect(authorName.nativeElement.textContent.trim()).toBe('John Doe');
    });

    it('should display author initials when no image is available', () => {
      component.pullRequest = { 
        ...mockPullRequest, 
        authorImageUrl: '',
        author: 'John Doe Smith'
      };
      fixture.detectChanges();
      
      const initialsDiv = fixture.debugElement.query(By.css('.w-6.h-6.rounded-full.bg-muted'));
      expect(initialsDiv).toBeTruthy();
      expect(initialsDiv.nativeElement.textContent.trim()).toBe('JD');
    });

    it('should display status badges correctly', () => {
      const badges = fixture.debugElement.queryAll(By.css('app-badge'));
      expect(badges.length).toBeGreaterThan(0);
      
      // Check for status badge
      const statusBadge = badges.find(badge => 
        badge.nativeElement.textContent.trim() === 'Active'
      );
      expect(statusBadge).toBeTruthy();
    });

    it('should display draft badge when pull request is draft', () => {
      component.pullRequest = { ...mockPullRequest, isDraft: true };
      fixture.detectChanges();
      
      const badges = fixture.debugElement.queryAll(By.css('app-badge'));
      const draftBadge = badges.find(badge => 
        badge.nativeElement.textContent.trim() === 'Draft'
      );
      expect(draftBadge).toBeTruthy();
    });

    it('should display conflicts badge when there are conflicts', () => {
      component.pullRequest = { ...mockPullRequest, conflicts: true };
      fixture.detectChanges();
      
      const badges = fixture.debugElement.queryAll(By.css('app-badge'));
      const conflictsBadge = badges.find(badge => 
        badge.nativeElement.textContent.trim() === 'Conflicts'
      );
      expect(conflictsBadge).toBeTruthy();
    });

    it('should display branch information', () => {
      const branchElements = fixture.debugElement.queryAll(By.css('.font-mono'));
      expect(branchElements.length).toBe(2);
      expect(branchElements[0].nativeElement.textContent).toContain('feature/new-feature');
      expect(branchElements[1].nativeElement.textContent).toContain('main');
    });

    it('should display limited number of labels with overflow indicator', () => {
      const labelElements = fixture.debugElement.queryAll(By.css('.text-xs.bg-primary\\/10'));
      expect(labelElements.length).toBeLessThanOrEqual(component.maxVisibleLabels);
      
      // Should show +X more indicator if there are more labels than max visible
      if (mockPullRequest.labels!.length > component.maxVisibleLabels) {
        const moreIndicator = fixture.debugElement.query(By.css('.bg-muted.text-muted-foreground'));
        expect(moreIndicator).toBeTruthy();
      }
    });

    it('should display reviewers with vote indicators', () => {
      const reviewerImages = fixture.debugElement.queryAll(By.css('.w-6.h-6.rounded-full.border-2'));
      expect(reviewerImages.length).toBeGreaterThan(0);
      
      // Check for approved reviewer (green border)
      const approvedReviewer = reviewerImages.find(img => 
        img.nativeElement.classList.contains('border-green-500')
      );
      expect(approvedReviewer).toBeTruthy();
    });

    it('should display work items', () => {
      const workItemElements = fixture.debugElement.queryAll(By.css('.bg-accent.text-accent-foreground'));
      expect(workItemElements.length).toBeGreaterThan(0);
      expect(workItemElements[0].nativeElement.textContent.trim()).toBe('1001');
    });

    it('should display merge status', () => {
      const mergeStatusIcon = fixture.debugElement.query(By.css('.text-green-500'));
      const mergeStatusText = fixture.debugElement.query(By.css('.text-green-600'));
      
      expect(mergeStatusIcon).toBeTruthy();
      expect(mergeStatusText.nativeElement.textContent.trim()).toBe('Ready to merge');
    });

    it('should display cannot merge status when merge is blocked', () => {
      component.pullRequest = {
        ...mockPullRequest,
        mergeStatus: { canMerge: false, reason: 'Conflicts detected' }
      };
      fixture.detectChanges();
      
      const warningIcon = fixture.debugElement.query(By.css('.text-amber-500'));
      const warningText = fixture.debugElement.query(By.css('.text-amber-600'));
      
      expect(warningIcon).toBeTruthy();
      expect(warningText.nativeElement.textContent.trim()).toBe('Conflicts detected');
    });
  });

  describe('Interactions', () => {
    it('should emit select event when card is clicked', () => {
      jest.spyOn(component.select, 'emit');
      
      const card = fixture.debugElement.query(By.css('.pr-item-card'));
      card.nativeElement.click();
      
      expect(component.select.emit).toHaveBeenCalledWith(mockPullRequest);
    });

    it('should emit view event when view button is clicked', () => {
      jest.spyOn(component.view, 'emit');
      
      const viewButton = fixture.debugElement.query(By.css('app-button[variant="outline"]'));
      viewButton.nativeElement.click();
      
      expect(component.view.emit).toHaveBeenCalledWith(mockPullRequest);
    });

    it('should emit analyze event when analyze button is clicked', () => {
      jest.spyOn(component.analyze, 'emit');
      
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      const analyzeButton = buttons.find(btn => 
        btn.nativeElement.textContent.trim() === 'Analyze'
      );
      
      analyzeButton?.nativeElement.click();
      expect(component.analyze.emit).toHaveBeenCalledWith(mockPullRequest);
    });

    it('should stop propagation when action buttons are clicked', () => {
      const event = new Event('click');
      jest.spyOn(event, 'stopPropagation');
      
      component.onView(event);
      expect(event.stopPropagation).toHaveBeenCalled();
      
      component.onAnalyze(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Input Properties', () => {
    it('should apply selected styling when isSelected is true', () => {
      component.isSelected = true;
      fixture.detectChanges();
      
      const card = fixture.debugElement.query(By.css('.pr-item-card'));
      expect(card.nativeElement.classList.contains('selected')).toBe(true);
    });

    it('should hide author email when showAuthorEmail is false', () => {
      component.showAuthorEmail = false;
      fixture.detectChanges();
      
      const authorEmail = fixture.debugElement.query(By.css('.text-xs.text-muted-foreground.truncate'));
      expect(authorEmail).toBeFalsy();
    });

    it('should hide description when showDescription is false', () => {
      component.showDescription = false;
      fixture.detectChanges();
      
      const description = fixture.debugElement.query(By.css('.line-clamp-2'));
      expect(description).toBeFalsy();
    });

    it('should hide buttons when show flags are false', () => {
      component.showViewButton = false;
      component.showAnalyzeButton = false;
      fixture.detectChanges();
      
      const buttons = fixture.debugElement.queryAll(By.css('app-button'));
      expect(buttons.length).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should return correct status variant', () => {
      expect(component.getStatusVariant('active')).toBe('default');
      expect(component.getStatusVariant('completed')).toBe('secondary');
      expect(component.getStatusVariant('abandoned')).toBe('destructive');
      expect(component.getStatusVariant('unknown')).toBe('outline');
    });

    it('should return correct status label', () => {
      expect(component.getStatusLabel('active')).toBe('Active');
      expect(component.getStatusLabel('completed')).toBe('Completed');
      expect(component.getStatusLabel('abandoned')).toBe('Abandoned');
      expect(component.getStatusLabel('unknown')).toBe('Unknown');
    });

    it('should generate correct author initials', () => {
      expect(component.getAuthorInitials('John Doe')).toBe('JD');
      expect(component.getAuthorInitials('Jane Mary Smith')).toBe('JM');
      expect(component.getAuthorInitials('Bob')).toBe('BO');
      expect(component.getAuthorInitials('')).toBe('');
    });

    it('should format branch names correctly', () => {
      expect(component.formatBranch('refs/heads/feature/test')).toBe('feature/test');
      expect(component.formatBranch('main')).toBe('main');
      expect(component.formatBranch('refs/heads/main')).toBe('main');
    });

    it('should return correct reviewer styling classes', () => {
      expect(component.getReviewerBorderClass(ReviewerVote.APPROVED)).toBe('border-green-500');
      expect(component.getReviewerBorderClass(ReviewerVote.APPROVED_WITH_SUGGESTIONS)).toBe('border-blue-500');
      expect(component.getReviewerBorderClass(ReviewerVote.WAITING_FOR_AUTHOR)).toBe('border-amber-500');
      expect(component.getReviewerBorderClass(ReviewerVote.REJECTED)).toBe('border-red-500');
      expect(component.getReviewerBorderClass(ReviewerVote.NO_VOTE)).toBe('border-muted-foreground');
    });

    it('should return correct vote labels', () => {
      expect(component.getVoteLabel(ReviewerVote.APPROVED)).toBe('Approved');
      expect(component.getVoteLabel(ReviewerVote.APPROVED_WITH_SUGGESTIONS)).toBe('Approved with suggestions');
      expect(component.getVoteLabel(ReviewerVote.WAITING_FOR_AUTHOR)).toBe('Waiting for author');
      expect(component.getVoteLabel(ReviewerVote.REJECTED)).toBe('Rejected');
      expect(component.getVoteLabel(ReviewerVote.NO_VOTE)).toBe('No vote');
    });
  });

  describe('Edge Cases', () => {
    it('should handle pull request without optional properties', () => {
      const minimalPR: PullRequest = {
        id: 1,
        title: 'Minimal PR',
        author: 'Author',
        createdDate: '2024-01-01T00:00:00Z',
        status: PullRequestStatus.ACTIVE,
        isDraft: false,
        repository: 'repo',
        repositoryId: 'repo-id',
        project: 'project',
        projectId: 'proj-id',
        sourceRefName: 'feature',
        targetRefName: 'main'
      };
      
      component.pullRequest = minimalPR;
      fixture.detectChanges();
      
      expect(fixture.debugElement.query(By.css('h3')).nativeElement.textContent.trim()).toBe('Minimal PR');
    });

    it('should handle empty arrays gracefully', () => {
      component.pullRequest = {
        ...mockPullRequest,
        labels: [],
        reviewers: [],
        workItems: []
      };
      fixture.detectChanges();
      
      const labelSection = fixture.debugElement.query(By.css('.flex-wrap.gap-1'));
      const reviewerSection = fixture.debugElement.query(By.css('.flex.-space-x-1'));
      const workItemSection = fixture.debugElement.query(By.css('.flex.gap-1'));
      
      expect(labelSection).toBeFalsy();
      expect(reviewerSection).toBeFalsy();
      expect(workItemSection).toBeFalsy();
    });
  });
});