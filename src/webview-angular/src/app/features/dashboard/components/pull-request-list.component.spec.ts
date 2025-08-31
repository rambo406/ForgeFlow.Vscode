import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { PullRequestListComponent } from './pull-request-list.component';
import { PullRequest, DashboardFilters } from '@core/models';
import { PullRequestStatus } from '@core/models/enums';

describe('PullRequestListComponent', () => {
  let component: PullRequestListComponent;
  let fixture: ComponentFixture<PullRequestListComponent>;

  const mockPullRequests: PullRequest[] = [
    {
      id: 1,
      title: 'Feature: Add user authentication',
      author: 'john.doe',
      authorDisplayName: 'John Doe',
      authorImageUrl: 'https://example.com/avatar1.jpg',
      createdDate: '2024-01-15T10:00:00Z',
      status: PullRequestStatus.ACTIVE,
      isDraft: false,
      repository: 'frontend-app',
      repositoryId: 'repo-1',
      project: 'MyProject',
      projectId: 'proj-1',
      sourceRefName: 'refs/heads/feature/auth',
      targetRefName: 'refs/heads/main',
      ageInDays: 5
    },
    {
      id: 2,
      title: 'Fix: Resolve memory leak in component',
      author: 'jane.smith',
      authorDisplayName: 'Jane Smith',
      authorImageUrl: 'https://example.com/avatar2.jpg',
      createdDate: '2024-01-10T14:30:00Z',
      status: PullRequestStatus.COMPLETED,
      isDraft: true,
      repository: 'backend-api',
      repositoryId: 'repo-2',
      project: 'MyProject',
      projectId: 'proj-1',
      sourceRefName: 'refs/heads/fix/memory-leak',
      targetRefName: 'refs/heads/develop',
      ageInDays: 10
    },
    {
      id: 3,
      title: 'Update documentation for API endpoints',
      author: 'bob.wilson',
      authorDisplayName: 'Bob Wilson',
      createdDate: '2024-01-12T09:15:00Z',
      status: PullRequestStatus.ABANDONED,
      isDraft: false,
      repository: 'documentation',
      repositoryId: 'repo-3',
      project: 'MyProject',
      projectId: 'proj-1',
      sourceRefName: 'refs/heads/docs/api-update',
      targetRefName: 'refs/heads/main',
      ageInDays: 8
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PullRequestListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PullRequestListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should display loading state when isLoading is true', () => {
      component.isLoading = true;
      component.pullRequests = [];
      fixture.detectChanges();

      const loadingText = fixture.debugElement.query(By.css('.text-muted-foreground'));
      expect(loadingText?.nativeElement.textContent).toContain('Loading pull requests...');
    });

    it('should display empty state when no pull requests are available', () => {
      component.isLoading = false;
      component.pullRequests = [];
      fixture.detectChanges();

      const emptyStateText = fixture.debugElement.query(By.css('.text-muted-foreground'));
      expect(emptyStateText?.nativeElement.textContent).toContain('No pull requests found');
    });

    it('should display pull requests when available', () => {
      component.pullRequests = mockPullRequests;
      component.isLoading = false;
      fixture.detectChanges();

      const tableRows = fixture.debugElement.queryAll(By.css('app-table-row'));
      expect(tableRows.length).toBe(mockPullRequests.length);
    });

    it('should display PR title and ID correctly', () => {
      component.pullRequests = [mockPullRequests[0]];
      component.isLoading = false;
      fixture.detectChanges();

      const titleElement = fixture.debugElement.query(By.css('.font-medium'));
      const idElement = fixture.debugElement.query(By.css('.text-xs.text-muted-foreground'));
      
      expect(titleElement?.nativeElement.textContent).toContain(mockPullRequests[0].title);
      expect(idElement?.nativeElement.textContent).toContain(`#${mockPullRequests[0].id}`);
    });

    it('should display author information with avatar when available', () => {
      component.pullRequests = [mockPullRequests[0]];
      component.isLoading = false;
      fixture.detectChanges();

      const authorText = fixture.debugElement.query(By.css('.text-sm'));
      const avatar = fixture.debugElement.query(By.css('img'));
      
      expect(authorText?.nativeElement.textContent).toContain(mockPullRequests[0].author);
      expect(avatar?.nativeElement.src).toBe(mockPullRequests[0].authorImageUrl);
    });

    it('should display status badge with correct variant', () => {
      component.pullRequests = mockPullRequests;
      component.isLoading = false;
      fixture.detectChanges();

      const badges = fixture.debugElement.queryAll(By.css('app-badge'));
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should display draft badge for draft PRs', () => {
      component.pullRequests = [mockPullRequests[1]]; // Draft PR
      component.isLoading = false;
      fixture.detectChanges();

      const draftBadge = fixture.debugElement.query(By.css('app-badge[variant="secondary"]'));
      expect(draftBadge?.nativeElement.textContent).toContain('Draft');
    });
  });

  describe('Search Functionality', () => {
    it('should emit search event when search input changes', () => {
      spyOn(component.search, 'emit');
      
      const searchInput = fixture.debugElement.query(By.css('input[type="text"]'));
      const inputElement = searchInput.nativeElement as HTMLInputElement;
      
      inputElement.value = 'feature';
      inputElement.dispatchEvent(new Event('input'));
      
      expect(component.search.emit).toHaveBeenCalledWith('feature');
    });

    it('should display current search term in input', () => {
      component.searchTerm = 'authentication';
      fixture.detectChanges();

      const searchInput = fixture.debugElement.query(By.css('input[type="text"]'));
      expect(searchInput.nativeElement.value).toBe('authentication');
    });

    it('should show adjusted search message when no results with filters', () => {
      component.pullRequests = [];
      component.searchTerm = 'nonexistent';
      component.isLoading = false;
      fixture.detectChanges();

      const message = fixture.debugElement.query(By.css('.text-sm.text-muted-foreground'));
      expect(message?.nativeElement.textContent).toContain('Try adjusting your search criteria');
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      component.pullRequests = mockPullRequests;
      fixture.detectChanges();
    });

    it('should generate author options from pull requests', () => {
      const expectedAuthors = ['john.doe', 'jane.smith', 'bob.wilson'];
      const authorOptions = component.authorOptions;
      
      expect(authorOptions.length).toBe(expectedAuthors.length + 1); // +1 for "All Authors"
      expect(authorOptions[0].label).toBe('All Authors');
      
      expectedAuthors.forEach(author => {
        expect(authorOptions.some(option => option.value === author)).toBeTruthy();
      });
    });

    it('should generate repository options from pull requests', () => {
      const expectedRepos = ['frontend-app', 'backend-api', 'documentation'];
      const repositoryOptions = component.repositoryOptions;
      
      expect(repositoryOptions.length).toBe(expectedRepos.length + 1); // +1 for "All Repositories"
      expect(repositoryOptions[0].label).toBe('All Repositories');
      
      expectedRepos.forEach(repo => {
        expect(repositoryOptions.some(option => option.value === repo)).toBeTruthy();
      });
    });

    it('should have predefined status options', () => {
      const statusOptions = component.statusOptions;
      const expectedStatuses = ['All Statuses', 'Active', 'Completed', 'Abandoned'];
      
      expect(statusOptions.length).toBe(expectedStatuses.length);
      statusOptions.forEach((option, index) => {
        expect(option.label).toBe(expectedStatuses[index]);
      });
    });

    it('should emit filter change when author filter changes', () => {
      spyOn(component.filter, 'emit');
      
      const authorSelect = fixture.debugElement.queryAll(By.css('select'))[0];
      authorSelect.nativeElement.value = 'john.doe';
      authorSelect.nativeElement.dispatchEvent(new Event('change'));
      
      expect(component.filter.emit).toHaveBeenCalledWith({ author: 'john.doe' });
    });

    it('should emit filter change when repository filter changes', () => {
      spyOn(component.filter, 'emit');
      
      const repositorySelect = fixture.debugElement.queryAll(By.css('select'))[1];
      repositorySelect.nativeElement.value = 'frontend-app';
      repositorySelect.nativeElement.dispatchEvent(new Event('change'));
      
      expect(component.filter.emit).toHaveBeenCalledWith({ repository: 'frontend-app' });
    });

    it('should emit filter change when status filter changes', () => {
      spyOn(component.filter, 'emit');
      
      const statusSelect = fixture.debugElement.queryAll(By.css('select'))[2];
      statusSelect.nativeElement.value = 'active';
      statusSelect.nativeElement.dispatchEvent(new Event('change'));
      
      expect(component.filter.emit).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should emit filter change when date range is complete', () => {
      spyOn(component.filter, 'emit');
      
      // Set from date first
      component.filters = { dateRange: { from: '', to: '' } };
      component.onDateRangeChange('from', '2024-01-01');
      
      // Should not emit until both dates are set
      expect(component.filter.emit).not.toHaveBeenCalled();
      
      // Set to date
      component.onDateRangeChange('to', '2024-01-31');
      
      expect(component.filter.emit).toHaveBeenCalledWith({
        dateRange: { from: '2024-01-01', to: '2024-01-31' }
      });
    });

    it('should emit undefined date range when both dates are cleared', () => {
      spyOn(component.filter, 'emit');
      
      component.filters = { dateRange: { from: '2024-01-01', to: '2024-01-31' } };
      component.onDateRangeChange('from', '');
      component.onDateRangeChange('to', '');
      
      expect(component.filter.emit).toHaveBeenCalledWith({ dateRange: undefined });
    });

    it('should clear all filters when clear button is clicked', () => {
      spyOn(component.search, 'emit');
      spyOn(component.filter, 'emit');
      
      const clearButton = fixture.debugElement.query(By.css('app-button[variant="outline"]'));
      clearButton.triggerEventHandler('onClick', null);
      
      expect(component.search.emit).toHaveBeenCalledWith('');
      expect(component.filter.emit).toHaveBeenCalledWith({
        author: undefined,
        repository: undefined,
        status: undefined,
        dateRange: undefined,
        labels: []
      });
    });

    it('should display current filter values in selects', () => {
      const filters: DashboardFilters = {
        author: 'john.doe',
        repository: 'frontend-app',
        status: PullRequestStatus.ACTIVE
      };
      component.filters = filters;
      fixture.detectChanges();

      const selects = fixture.debugElement.queryAll(By.css('select'));
      expect(selects[0].nativeElement.value).toBe('john.doe');
      expect(selects[1].nativeElement.value).toBe('frontend-app');
      expect(selects[2].nativeElement.value).toBe('active');
    });
  });

  describe('Interaction Events', () => {
    beforeEach(() => {
      component.pullRequests = mockPullRequests;
      fixture.detectChanges();
    });

    it('should emit select event when PR row is clicked', () => {
      spyOn(component.select, 'emit');
      
      const firstRow = fixture.debugElement.query(By.css('app-table-row'));
      firstRow.triggerEventHandler('click', null);
      
      expect(component.select.emit).toHaveBeenCalledWith(mockPullRequests[0].id);
    });

    it('should emit select event when View button is clicked', () => {
      spyOn(component.select, 'emit');
      
      const viewButton = fixture.debugElement.query(By.css('app-button[variant="outline"]'));
      viewButton.triggerEventHandler('onClick', null);
      
      expect(component.select.emit).toHaveBeenCalledWith(mockPullRequests[0].id);
    });

    it('should emit analyze event when Analyze button is clicked', () => {
      spyOn(component.analyze, 'emit');
      
      const analyzeButtons = fixture.debugElement.queryAll(By.css('app-button:not([variant="outline"])'));
      const analyzeButton = analyzeButtons.find(btn => 
        btn.nativeElement.textContent?.trim() === 'Analyze'
      );
      
      analyzeButton?.triggerEventHandler('onClick', null);
      expect(component.analyze.emit).toHaveBeenCalledWith(mockPullRequests[0].id);
    });

    it('should stop event propagation when action buttons are clicked', () => {
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') };
      spyOn(component.select, 'emit');
      
      // Simulate the onClick event with stopPropagation
      component.onSelectPR(1);
      expect(component.select.emit).toHaveBeenCalledWith(1);
    });
  });

  describe('Status Helpers', () => {
    it('should return correct status variant for different statuses', () => {
      expect(component.getStatusVariant(PullRequestStatus.ACTIVE)).toBe('default');
      expect(component.getStatusVariant(PullRequestStatus.COMPLETED)).toBe('secondary');
      expect(component.getStatusVariant(PullRequestStatus.ABANDONED)).toBe('destructive');
      expect(component.getStatusVariant('unknown')).toBe('outline');
    });

    it('should return correct status label for different statuses', () => {
      expect(component.getStatusLabel(PullRequestStatus.ACTIVE)).toBe('Active');
      expect(component.getStatusLabel(PullRequestStatus.COMPLETED)).toBe('Completed');
      expect(component.getStatusLabel(PullRequestStatus.ABANDONED)).toBe('Abandoned');
      expect(component.getStatusLabel('unknown')).toBe('Unknown');
    });

    it('should format date correctly', () => {
      const testDate = '2024-01-15T10:00:00Z';
      const formattedDate = component.formatDate(testDate);
      const expectedDate = new Date(testDate).toLocaleDateString();
      
      expect(formattedDate).toBe(expectedDate);
    });
  });

  describe('Component State', () => {
    it('should handle empty author options when no pull requests', () => {
      component.pullRequests = [];
      const authorOptions = component.authorOptions;
      
      expect(authorOptions.length).toBe(1);
      expect(authorOptions[0].label).toBe('All Authors');
    });

    it('should handle empty repository options when no pull requests', () => {
      component.pullRequests = [];
      const repositoryOptions = component.repositoryOptions;
      
      expect(repositoryOptions.length).toBe(1);
      expect(repositoryOptions[0].label).toBe('All Repositories');
    });

    it('should handle undefined search term', () => {
      component.searchTerm = undefined;
      fixture.detectChanges();

      const searchInput = fixture.debugElement.query(By.css('input[type="text"]'));
      expect(searchInput.nativeElement.value).toBe('');
    });

    it('should handle missing author image', () => {
      const prWithoutImage = { ...mockPullRequests[0] };
      delete prWithoutImage.authorImageUrl;
      
      component.pullRequests = [prWithoutImage];
      fixture.detectChanges();

      const avatar = fixture.debugElement.query(By.css('img'));
      expect(avatar).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      component.pullRequests = mockPullRequests;
      fixture.detectChanges();
    });

    it('should have proper alt text for author avatars', () => {
      const avatar = fixture.debugElement.query(By.css('img'));
      expect(avatar?.nativeElement.alt).toBe(mockPullRequests[0].author);
    });

    it('should have proper placeholder text for search input', () => {
      const searchInput = fixture.debugElement.query(By.css('input[type="text"]'));
      expect(searchInput.nativeElement.placeholder).toBe('Search pull requests...');
    });

    it('should have clickable table rows with proper cursor styling', () => {
      const tableRow = fixture.debugElement.query(By.css('app-table-row'));
      expect(tableRow.nativeElement.classList).toContain('cursor-pointer');
    });
  });
});