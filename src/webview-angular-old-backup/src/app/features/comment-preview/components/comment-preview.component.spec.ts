import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';

import { CommentPreviewComponent } from './comment-preview.component';
import { CommentPreviewStore } from '../store/comment-preview.store';
import { MessageService } from '../../../core/services/message.service';
import { ReviewComment } from '../../../core/models/interfaces';
import { CommentSeverity, CommentStatus } from '../../../core/models/enums';

// Mock child components
@Component({
  selector: 'app-comment-header',
  template: '<div>Mock Comment Header</div>'
})
class MockCommentHeaderComponent {
  @Input() stats: any;
  @Input() isLoading: boolean = false;
  @Input() selectedCount: number = 0;
}

@Component({
  selector: 'app-comment-filters',
  template: '<div>Mock Comment Filters</div>'
})
class MockCommentFiltersComponent {
  @Input() filters: any;
  @Input() groupBy: string = 'file';
  @Input() viewMode: string = 'grouped';
  @Input() uniqueFiles: string[] = [];
  @Input() uniqueCategories: string[] = [];
  @Input() isLoading: boolean = false;
}

@Component({
  selector: 'app-comment-list',
  template: '<div>Mock Comment List</div>'
})
class MockCommentListComponent {
  @Input() comments: ReviewComment[] = [];
  @Input() groupedComments: any = {};
  @Input() viewMode: string = 'grouped';
  @Input() selectedComments: string[] = [];
  @Input() isLoading: boolean = false;
}

@Component({
  selector: 'app-comment-actions',
  template: '<div>Mock Comment Actions</div>'
})
class MockCommentActionsComponent {
  @Input() selectedCount: number = 0;
  @Input() allSelected: boolean = false;
  @Input() pendingActionsCount: number = 0;
  @Input() isLoading: boolean = false;
}

const mockComments: ReviewComment[] = [
  {
    id: 'comment-1',
    content: 'Test comment 1',
    filePath: 'test/file1.ts',
    lineNumber: 10,
    severity: CommentSeverity.WARNING,
    status: CommentStatus.PENDING,
    confidence: 0.8
  },
  {
    id: 'comment-2',
    content: 'Test comment 2',
    filePath: 'test/file2.ts',
    lineNumber: 20,
    severity: CommentSeverity.ERROR,
    status: CommentStatus.APPROVED,
    confidence: 0.9
  }
];

describe('CommentPreviewComponent', () => {
  let component: CommentPreviewComponent;
  let fixture: ComponentFixture<CommentPreviewComponent>;
  let mockStore: any;
  let mockMessageService: any;

  beforeEach(async () => {
    mockStore = {
      comments: jasmine.createSpy('comments').and.returnValue(mockComments),
      filteredComments: jasmine.createSpy('filteredComments').and.returnValue(mockComments),
      groupedComments: jasmine.createSpy('groupedComments').and.returnValue({ 'test/file1.ts': [mockComments[0]] }),
      selectedComments: jasmine.createSpy('selectedComments').and.returnValue([]),
      selectedCommentsCount: jasmine.createSpy('selectedCommentsCount').and.returnValue(0),
      allFilteredCommentsSelected: jasmine.createSpy('allFilteredCommentsSelected').and.returnValue(false),
      pendingActionsCount: jasmine.createSpy('pendingActionsCount').and.returnValue(1),
      isLoading: jasmine.createSpy('isLoading').and.returnValue(false),
      error: jasmine.createSpy('error').and.returnValue(undefined),
      filters: jasmine.createSpy('filters').and.returnValue({}),
      groupBy: jasmine.createSpy('groupBy').and.returnValue('file'),
      viewMode: jasmine.createSpy('viewMode').and.returnValue('grouped'),
      uniqueFilePaths: jasmine.createSpy('uniqueFilePaths').and.returnValue(['test/file1.ts', 'test/file2.ts']),
      uniqueCategories: jasmine.createSpy('uniqueCategories').and.returnValue(['Test']),
      commentsSummary: jasmine.createSpy('commentsSummary').and.returnValue({
        total: 2,
        pending: 1,
        approved: 1,
        dismissed: 0,
        modified: 0
      }),
      
      // Methods
      updateFilters: jasmine.createSpy('updateFilters'),
      setGroupBy: jasmine.createSpy('setGroupBy'),
      setViewMode: jasmine.createSpy('setViewMode'),
      clearFilters: jasmine.createSpy('clearFilters'),
      clearSelection: jasmine.createSpy('clearSelection'),
      selectAllFilteredComments: jasmine.createSpy('selectAllFilteredComments'),
      updateComment: jasmine.createSpy('updateComment'),
      approveComment: jasmine.createSpy('approveComment'),
      dismissComment: jasmine.createSpy('dismissComment'),
      bulkApproveComments: jasmine.createSpy('bulkApproveComments'),
      bulkDismissComments: jasmine.createSpy('bulkDismissComments'),
      applySuggestion: jasmine.createSpy('applySuggestion'),
      exportComments: jasmine.createSpy('exportComments'),
      clearError: jasmine.createSpy('clearError'),
      refreshComments: jasmine.createSpy('refreshComments')
    };

    mockMessageService = {
      onMessage: jasmine.createSpy('onMessage').and.returnValue({ pipe: () => ({ subscribe: () => {} }) })
    };

    await TestBed.configureTestingModule({
      imports: [CommentPreviewComponent],
      declarations: [
        MockCommentHeaderComponent,
        MockCommentFiltersComponent,
        MockCommentListComponent,
        MockCommentActionsComponent
      ],
      providers: [
        { provide: CommentPreviewStore, useValue: mockStore },
        { provide: MessageService, useValue: mockMessageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommentPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Structure', () => {
    it('should render comment header', () => {
      fixture.detectChanges();
      const headerElement = fixture.debugElement.query(By.css('app-comment-header'));
      expect(headerElement).toBeTruthy();
    });

    it('should render comment filters', () => {
      fixture.detectChanges();
      const filtersElement = fixture.debugElement.query(By.css('app-comment-filters'));
      expect(filtersElement).toBeTruthy();
    });

    it('should render comment list when not loading', () => {
      fixture.detectChanges();
      const listElement = fixture.debugElement.query(By.css('app-comment-list'));
      expect(listElement).toBeTruthy();
    });

    it('should render comment actions when comments are selected', () => {
      mockStore.selectedCommentsCount.and.returnValue(2);
      fixture.detectChanges();
      
      const actionsElement = fixture.debugElement.query(By.css('app-comment-actions'));
      expect(actionsElement).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons when loading', () => {
      mockStore.isLoading.and.returnValue(true);
      fixture.detectChanges();
      
      const skeletons = fixture.debugElement.queryAll(By.css('[hlmSkeleton]'));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should hide comment list when loading', () => {
      mockStore.isLoading.and.returnValue(true);
      fixture.detectChanges();
      
      const listElement = fixture.debugElement.query(By.css('app-comment-list'));
      expect(listElement).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      const errorMessage = 'Test error message';
      mockStore.error.and.returnValue(errorMessage);
      fixture.detectChanges();
      
      const errorElement = fixture.debugElement.query(By.css('[hlmAlert]'));
      expect(errorElement).toBeTruthy();
      
      const errorText = errorElement.nativeElement.textContent;
      expect(errorText).toContain(errorMessage);
    });

    it('should call clearError when dismiss button is clicked', () => {
      mockStore.error.and.returnValue('Test error');
      fixture.detectChanges();
      
      const dismissButton = fixture.debugElement.query(By.css('button[hlmBtn]'));
      dismissButton.nativeElement.click();
      
      expect(mockStore.clearError).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no comments', () => {
      mockStore.comments.and.returnValue([]);
      mockStore.filteredComments.and.returnValue([]);
      fixture.detectChanges();
      
      const emptyStateIcon = fixture.debugElement.query(By.css('lucide-icon[name="message-square"]'));
      expect(emptyStateIcon).toBeTruthy();
    });

    it('should show no results state when no filtered comments', () => {
      mockStore.comments.and.returnValue(mockComments);
      mockStore.filteredComments.and.returnValue([]);
      fixture.detectChanges();
      
      const noResultsIcon = fixture.debugElement.query(By.css('lucide-icon[name="filter-x"]'));
      expect(noResultsIcon).toBeTruthy();
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle refresh', () => {
      spyOn(component as any, 'getCurrentPRId').and.returnValue(123);
      
      component['handleRefresh']();
      
      expect(mockStore.refreshComments).toHaveBeenCalledWith(123);
    });

    it('should handle export', () => {
      component['handleExport']('json');
      
      expect(mockStore.exportComments).toHaveBeenCalledWith('json');
    });

    it('should handle filters change', () => {
      const filters = { severity: CommentSeverity.ERROR };
      
      component['handleFiltersChange'](filters);
      
      expect(mockStore.updateFilters).toHaveBeenCalledWith(filters);
    });

    it('should handle group by change', () => {
      component['handleGroupByChange']('severity');
      
      expect(mockStore.setGroupBy).toHaveBeenCalledWith('severity');
    });

    it('should handle view mode change', () => {
      component['handleViewModeChange']('list');
      
      expect(mockStore.setViewMode).toHaveBeenCalledWith('list');
    });

    it('should handle clear filters', () => {
      component['handleClearFilters']();
      
      expect(mockStore.clearFilters).toHaveBeenCalled();
    });

    it('should handle clear selection', () => {
      component['handleClearSelection']();
      
      expect(mockStore.clearSelection).toHaveBeenCalled();
    });

    it('should handle comment update', () => {
      const data = { commentId: 'comment-1', content: 'Updated content' };
      
      component['handleCommentUpdate'](data);
      
      expect(mockStore.updateComment).toHaveBeenCalledWith('comment-1', 'Updated content');
    });

    it('should handle comment approval', () => {
      component['handleCommentApprove']('comment-1');
      
      expect(mockStore.approveComment).toHaveBeenCalledWith('comment-1');
    });

    it('should handle comment dismissal', () => {
      component['handleCommentDismiss']('comment-1');
      
      expect(mockStore.dismissComment).toHaveBeenCalledWith('comment-1');
    });

    it('should handle apply suggestion', () => {
      component['handleApplySuggestion']('comment-1');
      
      expect(mockStore.applySuggestion).toHaveBeenCalledWith('comment-1');
    });

    it('should handle select all', () => {
      component['handleSelectAll']();
      
      expect(mockStore.selectAllFilteredComments).toHaveBeenCalled();
    });

    it('should handle bulk approve', () => {
      mockStore.selectedComments.and.returnValue(['comment-1', 'comment-2']);
      
      component['handleBulkApprove']();
      
      expect(mockStore.bulkApproveComments).toHaveBeenCalledWith(['comment-1', 'comment-2']);
    });

    it('should handle bulk dismiss', () => {
      mockStore.selectedComments.and.returnValue(['comment-1', 'comment-2']);
      
      component['handleBulkDismiss']();
      
      expect(mockStore.bulkDismissComments).toHaveBeenCalledWith(['comment-1', 'comment-2']);
    });

    it('should handle clear error', () => {
      component['handleClearError']();
      
      expect(mockStore.clearError).toHaveBeenCalled();
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to comment header', () => {
      fixture.detectChanges();
      
      const headerComponent = fixture.debugElement.query(By.css('app-comment-header'));
      const headerInstance = headerComponent.componentInstance;
      
      expect(headerInstance.stats).toBeDefined();
      expect(headerInstance.isLoading).toBe(false);
      expect(headerInstance.selectedCount).toBe(0);
    });

    it('should pass correct props to comment filters', () => {
      fixture.detectChanges();
      
      const filtersComponent = fixture.debugElement.query(By.css('app-comment-filters'));
      const filtersInstance = filtersComponent.componentInstance;
      
      expect(filtersInstance.filters).toBeDefined();
      expect(filtersInstance.groupBy).toBe('file');
      expect(filtersInstance.viewMode).toBe('grouped');
      expect(filtersInstance.uniqueFiles).toEqual(['test/file1.ts', 'test/file2.ts']);
      expect(filtersInstance.uniqueCategories).toEqual(['Test']);
      expect(filtersInstance.isLoading).toBe(false);
    });

    it('should pass correct props to comment list', () => {
      fixture.detectChanges();
      
      const listComponent = fixture.debugElement.query(By.css('app-comment-list'));
      const listInstance = listComponent.componentInstance;
      
      expect(listInstance.comments).toEqual(mockComments);
      expect(listInstance.groupedComments).toBeDefined();
      expect(listInstance.viewMode).toBe('grouped');
      expect(listInstance.selectedComments).toEqual([]);
      expect(listInstance.isLoading).toBe(false);
    });
  });
});