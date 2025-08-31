import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PullRequestDetailComponent } from './pull-request-detail.component';
import { PullRequest, PullRequestStatus, FileChange, FileChangeType, AnalysisProgress, AnalysisStage } from '@core/models';

// Mock shared components
@Component({
  selector: 'app-button',
  template: '<button [class]="additionalClasses" [disabled]="disabled" (click)="onClick.emit()"><ng-content></ng-content></button>',
  standalone: true,
  inputs: ['variant', 'size', 'disabled', 'additionalClasses'],
  outputs: ['onClick']
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

@Component({
  selector: 'app-card',
  template: '<div class="card"><div class="card-title">{{ title }}</div><div class="card-content"><ng-content></ng-content></div></div>',
  standalone: true,
  inputs: ['title']
})
class MockAppCardComponent {
  title = '';
}

describe('PullRequestDetailComponent', () => {
  let component: PullRequestDetailComponent;
  let fixture: ComponentFixture<PullRequestDetailComponent>;

  const mockPullRequest: PullRequest = {
    id: 123,
    title: 'Enhanced Feature Implementation',
    description: 'This PR implements a new feature with comprehensive test coverage and documentation.',
    author: 'John Developer',
    authorDisplayName: 'John Developer',
    authorEmail: 'john.dev@example.com',
    authorImageUrl: 'https://example.com/john-avatar.jpg',
    createdDate: '2024-01-15T10:00:00Z',
    updatedDate: '2024-01-20T15:30:00Z',
    status: PullRequestStatus.ACTIVE,
    isDraft: false,
    repository: 'awesome-project',
    repositoryId: 'repo-456',
    project: 'Development Team',
    projectId: 'proj-789',
    sourceRefName: 'refs/heads/feature/awesome-feature',
    targetRefName: 'refs/heads/develop',
    url: 'https://dev.azure.com/org/project/_git/repo/pullrequest/123',
    webUrl: 'https://dev.azure.com/org/project/_git/repo/pullrequest/123'
  };

  const mockFileChanges: FileChange[] = [
    {
      filePath: 'src/components/feature.component.ts',
      oldFilePath: undefined,
      changeType: FileChangeType.ADD,
      isBinary: false,
      addedLines: 120,
      deletedLines: 0,
      modifiedLines: 0,
      language: 'TypeScript',
      lines: [
        { lineNumber: 1, content: 'import { Component } from "@angular/core";', type: 'added' },
        { lineNumber: 2, content: '', type: 'added' },
        { lineNumber: 3, content: '@Component({', type: 'added' },
        { lineNumber: 4, content: '  selector: "app-feature",', type: 'added' },
        { lineNumber: 5, content: '  template: `<div>Feature Component</div>`', type: 'added' },
        { lineNumber: 6, content: '})', type: 'added' },
        { lineNumber: 7, content: 'export class FeatureComponent { }', type: 'added' }
      ]
    },
    {
      filePath: 'src/services/data.service.ts',
      oldFilePath: undefined,
      changeType: FileChangeType.EDIT,
      isBinary: false,
      addedLines: 15,
      deletedLines: 8,
      modifiedLines: 3,
      language: 'TypeScript',
      lines: [
        { lineNumber: 1, originalLineNumber: 1, content: 'import { Injectable } from "@angular/core";', type: 'unchanged' },
        { lineNumber: 2, originalLineNumber: 2, content: 'import { HttpClient } from "@angular/common/http";', type: 'added' },
        { originalLineNumber: 2, content: 'import { Http } from "@angular/http";', type: 'deleted' },
        { lineNumber: 3, originalLineNumber: 3, content: '', type: 'unchanged' },
        { lineNumber: 4, originalLineNumber: 4, content: '@Injectable()', type: 'unchanged' },
        { lineNumber: 5, originalLineNumber: 5, content: 'export class DataService {', type: 'unchanged' },
        { lineNumber: 6, originalLineNumber: 6, content: '  constructor(private http: HttpClient) { }', type: 'modified' }
      ]
    },
    {
      filePath: 'docs/feature-guide.md',
      oldFilePath: undefined,
      changeType: FileChangeType.ADD,
      isBinary: false,
      addedLines: 45,
      deletedLines: 0,
      language: 'Markdown'
    },
    {
      filePath: 'legacy/old-component.ts',
      oldFilePath: undefined,
      changeType: FileChangeType.DELETE,
      isBinary: false,
      addedLines: 0,
      deletedLines: 67,
      language: 'TypeScript'
    },
    {
      filePath: 'assets/image.png',
      oldFilePath: undefined,
      changeType: FileChangeType.ADD,
      isBinary: true,
      addedLines: 0,
      deletedLines: 0
    }
  ];

  const mockAnalysisProgress: AnalysisProgress = {
    prId: 123,
    stage: AnalysisStage.ANALYZING,
    currentFileName: 'src/components/feature.component.ts',
    completed: 3,
    total: 5,
    percentage: 60,
    message: 'Analyzing TypeScript files...',
    startTime: '2024-01-20T16:00:00Z',
    estimatedCompletion: '2024-01-20T16:05:00Z'
  };

  const mockAnalysisResults = {
    prId: 123,
    timestamp: '2024-01-20T16:05:00Z',
    duration: 300,
    comments: [
      {
        id: 'comment-1',
        content: 'Consider adding error handling for this HTTP request',
        filePath: 'src/services/data.service.ts',
        lineNumber: 15,
        severity: 'medium',
        category: 'Error Handling'
      },
      {
        id: 'comment-2',
        content: 'This method should have unit tests',
        filePath: 'src/components/feature.component.ts',
        lineNumber: 25,
        severity: 'low',
        category: 'Testing'
      }
    ],
    summary: {
      totalComments: 2,
      commentsBySeverity: { high: 0, medium: 1, low: 1 },
      averageConfidence: 0.85
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PullRequestDetailComponent],
      declarations: [MockAppButtonComponent, MockAppBadgeComponent, MockAppCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PullRequestDetailComponent);
    component = fixture.componentInstance;
    component.pullRequest = mockPullRequest;
    component.fileChanges = mockFileChanges;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering - Overview Tab', () => {
    beforeEach(() => {
      component.setActiveTab('overview');
      fixture.detectChanges();
    });

    it('should display pull request header information', () => {
      const title = fixture.debugElement.query(By.css('h2'));
      const backButton = fixture.debugElement.query(By.css('app-button[variant="outline"]'));
      
      expect(title.nativeElement.textContent.trim()).toBe('Enhanced Feature Implementation');
      expect(backButton.nativeElement.textContent.trim()).toContain('← Back to List');
    });

    it('should display pull request information card', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      const infoCard = cards.find(card => card.componentInstance.title === 'Pull Request Information');
      
      expect(infoCard).toBeTruthy();
      if (infoCard) {
        expect(infoCard.nativeElement.textContent).toContain('John Developer');
        expect(infoCard.nativeElement.textContent).toContain('awesome-project');
      }
    });

    it('should display changes summary when files exist', () => {
      const cards = fixture.debugElement.queryAll(By.css('app-card'));
      const summaryCard = cards.find(card => card.componentInstance.title === 'Changes Summary');
      
      expect(summaryCard).toBeTruthy();
      if (summaryCard) {
        expect(summaryCard.nativeElement.textContent).toContain('5'); // Total files
        expect(summaryCard.nativeElement.textContent).toContain('+180'); // Total additions
        expect(summaryCard.nativeElement.textContent).toContain('-75'); // Total deletions
      }
    });

    it('should display file type breakdown', () => {
      const fileTypes = component.filesByType();
      expect(fileTypes).toContainEqual({ extension: 'TS', count: 3 });
      expect(fileTypes).toContainEqual({ extension: 'MD', count: 1 });
      expect(fileTypes).toContainEqual({ extension: 'PNG', count: 1 });
    });
  });

  describe('Rendering - Files Tab', () => {
    beforeEach(() => {
      component.setActiveTab('files');
      fixture.detectChanges();
    });

    it('should display file filter controls', () => {
      const filterSelect = fixture.debugElement.query(By.css('select'));
      const searchInput = fixture.debugElement.query(By.css('input[placeholder="Filter files..."]'));
      const expandButton = fixture.debugElement.query(By.css('app-button[size="sm"]'));
      
      expect(filterSelect).toBeTruthy();
      expect(searchInput).toBeTruthy();
      expect(expandButton).toBeTruthy();
    });

    it('should display all file changes by default', () => {
      const fileHeaders = fixture.debugElement.queryAll(By.css('.px-4.py-3.bg-muted\\/50'));
      expect(fileHeaders.length).toBe(5); // All mock files
    });

    it('should display correct change type badges', () => {
      const badges = fixture.debugElement.queryAll(By.css('app-badge'));
      
      // Should have badges for Added, Modified, Deleted files
      const badgeTexts = badges.map(badge => badge.nativeElement.textContent.trim());
      expect(badgeTexts).toContain('Added');
      expect(badgeTexts).toContain('Modified');
      expect(badgeTexts).toContain('Deleted');
    });

    it('should display file paths and change statistics', () => {
      const filePaths = fixture.debugElement.queryAll(By.css('.font-mono.text-sm'));
      expect(filePaths[0].nativeElement.textContent.trim()).toBe('src/components/feature.component.ts');
      
      const additionsStats = fixture.debugElement.queryAll(By.css('.text-green-600'));
      const deletionsStats = fixture.debugElement.queryAll(By.css('.text-red-600'));
      
      expect(additionsStats.length).toBeGreaterThan(0);
      expect(deletionsStats.length).toBeGreaterThan(0);
    });

    it('should handle binary files correctly', () => {
      const fileHeaders = fixture.debugElement.queryAll(By.css('.px-4.py-3.bg-muted\\/50'));
      const binaryFileHeader = fileHeaders.find(header => 
        header.nativeElement.textContent.includes('assets/image.png')
      );
      
      expect(binaryFileHeader).toBeTruthy();
      if (binaryFileHeader) {
        expect(binaryFileHeader.nativeElement.textContent).toContain('Binary file');
      }
    });
  });

  describe('File Expansion Functionality', () => {
    beforeEach(() => {
      component.setActiveTab('files');
      fixture.detectChanges();
    });

    it('should expand and collapse individual files', () => {
      const filePath = mockFileChanges[0].filePath;
      
      expect(component.isFileExpanded(filePath)).toBe(false);
      
      component.toggleFileExpansion(filePath);
      expect(component.isFileExpanded(filePath)).toBe(true);
      
      component.toggleFileExpansion(filePath);
      expect(component.isFileExpanded(filePath)).toBe(false);
    });

    it('should expand all files when toggle all is clicked', () => {
      component.toggleAllFiles();
      
      mockFileChanges.forEach(file => {
        expect(component.isFileExpanded(file.filePath)).toBe(true);
      });
      expect(component.allFilesExpanded()).toBe(true);
    });

    it('should collapse all files when toggle all is clicked again', () => {
      component.toggleAllFiles(); // Expand all
      component.toggleAllFiles(); // Collapse all
      
      mockFileChanges.forEach(file => {
        expect(component.isFileExpanded(file.filePath)).toBe(false);
      });
      expect(component.allFilesExpanded()).toBe(false);
    });

    it('should display diff content when file is expanded', () => {
      const filePath = mockFileChanges[0].filePath;
      component.toggleFileExpansion(filePath);
      fixture.detectChanges();
      
      const diffLines = fixture.debugElement.queryAll(By.css('.flex.hover\\:bg-muted\\/30'));
      expect(diffLines.length).toBe(mockFileChanges[0].lines!.length);
    });

    it('should display line numbers correctly in diff view', () => {
      const filePath = mockFileChanges[1].filePath; // File with both old and new line numbers
      component.toggleFileExpansion(filePath);
      fixture.detectChanges();
      
      const lineNumbers = fixture.debugElement.queryAll(By.css('.w-12.px-2.py-1.text-xs'));
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it('should color-code diff lines correctly', () => {
      const filePath = mockFileChanges[1].filePath;
      component.toggleFileExpansion(filePath);
      fixture.detectChanges();
      
      const addedLines = fixture.debugElement.queryAll(By.css('.bg-green-50'));
      const deletedLines = fixture.debugElement.queryAll(By.css('.bg-red-50'));
      const modifiedLines = fixture.debugElement.queryAll(By.css('.bg-blue-50'));
      
      expect(addedLines.length).toBeGreaterThan(0);
      expect(deletedLines.length).toBeGreaterThan(0);
      expect(modifiedLines.length).toBeGreaterThan(0);
    });

    it('should display binary file message for binary files', () => {
      const binaryFilePath = mockFileChanges[4].filePath; // Binary file
      component.toggleFileExpansion(binaryFilePath);
      fixture.detectChanges();
      
      const binaryMessage = fixture.debugElement.query(By.css('.text-center.text-muted-foreground'));
      expect(binaryMessage.nativeElement.textContent.trim()).toBe('Binary file cannot be displayed');
    });
  });

  describe('File Filtering', () => {
    beforeEach(() => {
      component.setActiveTab('files');
      fixture.detectChanges();
    });

    it('should filter files by change type', () => {
      component.setFileFilter('added');
      const filtered = component.filteredFiles();
      
      expect(filtered.length).toBe(2); // Only added files
      expect(filtered.every(f => f.changeType === FileChangeType.ADD)).toBe(true);
    });

    it('should filter files by search term', () => {
      component.setFileSearchTerm('component');
      const filtered = component.filteredFiles();
      
      expect(filtered.length).toBe(2); // Files containing 'component'
      expect(filtered.every(f => f.filePath.toLowerCase().includes('component'))).toBe(true);
    });

    it('should combine filter type and search term', () => {
      component.setFileFilter('added');
      component.setFileSearchTerm('docs');
      const filtered = component.filteredFiles();
      
      expect(filtered.length).toBe(1); // Only docs/feature-guide.md
      expect(filtered[0].filePath).toBe('docs/feature-guide.md');
    });

    it('should return correct file counts by change type', () => {
      expect(component.getFilesByChangeType('add').length).toBe(2);
      expect(component.getFilesByChangeType('edit').length).toBe(1);
      expect(component.getFilesByChangeType('delete').length).toBe(1);
      expect(component.getFilesByChangeType('rename').length).toBe(0);
    });
  });

  describe('Rendering - Analysis Tab', () => {
    beforeEach(() => {
      component.setActiveTab('analysis');
      fixture.detectChanges();
    });

    it('should display analysis progress when running', () => {
      component.isAnalysisRunning = true;
      component.analysisProgress = mockAnalysisProgress;
      fixture.detectChanges();
      
      const progressCard = fixture.debugElement.query(By.css('app-card[title="AI Analysis Progress"]'));
      expect(progressCard).toBeTruthy();
      expect(progressCard.nativeElement.textContent).toContain('60%');
      expect(progressCard.nativeElement.textContent).toContain('Analyzing TypeScript files...');
    });

    it('should display analysis results when completed', () => {
      component.isAnalysisRunning = false;
      component.analysisResults = mockAnalysisResults;
      fixture.detectChanges();
      
      const resultsCard = fixture.debugElement.query(By.css('app-card[title="AI Analysis Results"]'));
      expect(resultsCard).toBeTruthy();
      expect(resultsCard.nativeElement.textContent).toContain('Comments (2)');
    });

    it('should display comment details', () => {
      component.isAnalysisRunning = false;
      component.analysisResults = mockAnalysisResults;
      fixture.detectChanges();
      
      const comments = fixture.debugElement.queryAll(By.css('.p-3.border.border-border.rounded-md'));
      expect(comments.length).toBe(2);
      
      expect(comments[0].nativeElement.textContent).toContain('src/services/data.service.ts');
      expect(comments[0].nativeElement.textContent).toContain('Consider adding error handling');
    });

    it('should display start analysis button when no results available', () => {
      component.isAnalysisRunning = false;
      component.analysisResults = null;
      fixture.detectChanges();
      
      const startButton = fixture.debugElement.query(By.css('app-button'));
      expect(startButton.nativeElement.textContent.trim()).toBe('Start AI Analysis');
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', () => {
      expect(component.activeTab()).toBe('overview');
      
      component.setActiveTab('files');
      expect(component.activeTab()).toBe('files');
      
      component.setActiveTab('analysis');
      expect(component.activeTab()).toBe('analysis');
    });

    it('should display correct tab styles', () => {
      component.setActiveTab('files');
      fixture.detectChanges();
      
      const tabs = fixture.debugElement.queryAll(By.css('button.px-4.py-2'));
      const filesTab = tabs.find(tab => tab.nativeElement.textContent.includes('Files Changed'));
      
      expect(filesTab?.nativeElement.classList.contains('border-primary')).toBe(true);
    });

    it('should show file count in files tab', () => {
      const tabs = fixture.debugElement.queryAll(By.css('button.px-4.py-2'));
      const filesTab = tabs.find(tab => tab.nativeElement.textContent.includes('Files Changed'));
      
      expect(filesTab?.nativeElement.textContent).toContain('Files Changed (5)');
    });

    it('should show comment count in analysis tab when results available', () => {
      component.analysisResults = mockAnalysisResults;
      fixture.detectChanges();
      
      const tabs = fixture.debugElement.queryAll(By.css('button.px-4.py-2'));
      const analysisTab = tabs.find(tab => tab.nativeElement.textContent.includes('AI Analysis'));
      
      expect(analysisTab?.nativeElement.textContent).toContain('2'); // Comment count badge
    });
  });

  describe('Event Handling', () => {
    it('should emit back event when back button is clicked', () => {
      jest.spyOn(component.back, 'emit');
      
      const backButton = fixture.debugElement.query(By.css('app-button[variant="outline"]'));
      backButton.nativeElement.click();
      
      expect(component.back.emit).toHaveBeenCalled();
    });

    it('should emit start analysis event', () => {
      jest.spyOn(component.startAnalysis, 'emit');
      
      component.onStartAnalysis();
      expect(component.startAnalysis.emit).toHaveBeenCalled();
    });

    it('should emit cancel analysis event', () => {
      jest.spyOn(component.cancelAnalysis, 'emit');
      
      component.onCancelAnalysis();
      expect(component.cancelAnalysis.emit).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    it('should calculate total additions correctly', () => {
      expect(component.totalAdditions()).toBe(180); // Sum of all added lines
    });

    it('should calculate total deletions correctly', () => {
      expect(component.totalDeletions()).toBe(75); // Sum of all deleted lines
    });

    it('should group files by type correctly', () => {
      const fileTypes = component.filesByType();
      expect(fileTypes).toContainEqual({ extension: 'TS', count: 3 });
      expect(fileTypes).toContainEqual({ extension: 'MD', count: 1 });
      expect(fileTypes).toContainEqual({ extension: 'PNG', count: 1 });
    });
  });

  describe('Utility Methods', () => {
    it('should return correct change type variants', () => {
      expect(component.getChangeTypeVariant(FileChangeType.ADD)).toBe('default');
      expect(component.getChangeTypeVariant(FileChangeType.EDIT)).toBe('secondary');
      expect(component.getChangeTypeVariant(FileChangeType.DELETE)).toBe('destructive');
      expect(component.getChangeTypeVariant(FileChangeType.RENAME)).toBe('outline');
    });

    it('should return correct change type labels', () => {
      expect(component.getChangeTypeLabel(FileChangeType.ADD)).toBe('Added');
      expect(component.getChangeTypeLabel(FileChangeType.EDIT)).toBe('Modified');
      expect(component.getChangeTypeLabel(FileChangeType.DELETE)).toBe('Deleted');
      expect(component.getChangeTypeLabel(FileChangeType.RENAME)).toBe('Renamed');
    });

    it('should extract file extensions correctly', () => {
      expect(component.getFileExtension('file.ts')).toBe('TS');
      expect(component.getFileExtension('document.md')).toBe('MD');
      expect(component.getFileExtension('image.png')).toBe('PNG');
      expect(component.getFileExtension('noextension')).toBe('No extension');
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      const loadingText = fixture.debugElement.query(By.css('.text-muted-foreground'));
      expect(loadingText.nativeElement.textContent.trim()).toBe('Loading pull request details...');
    });

    it('should display empty state when no PR is selected', () => {
      component.pullRequest = undefined;
      fixture.detectChanges();
      
      const emptyText = fixture.debugElement.query(By.css('.text-muted-foreground'));
      expect(emptyText.nativeElement.textContent.trim()).toBe('No pull request selected');
    });

    it('should handle no files state in files tab', () => {
      component.fileChanges = [];
      component.setActiveTab('files');
      fixture.detectChanges();
      
      const noFilesMessage = fixture.debugElement.query(By.css('.text-center.py-8'));
      expect(noFilesMessage.nativeElement.textContent.trim()).toBe('No files match the current filter');
    });
  });
});