import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullRequest, AnalysisProgress, FileChange, FileChangeType } from '@core/models';
import { 
  AppButtonComponent,
  AppCardComponent,
  AppBadgeComponent
} from '@shared/components';

@Component({
  selector: 'app-pull-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppCardComponent,
    AppBadgeComponent
  ],
  template: `
    <div class="h-full flex flex-col">
      <!-- Header -->
      <div class="border-b border-border bg-card/95 p-4 sticky top-0 z-20 backdrop-blur">
        <div class="container-vscode flex items-center justify-between">
          <div class="flex items-center gap-4">
            <app-button 
              variant="outline" 
              size="sm"
              (onClick)="onBack()"
            >
              ← Back to List
            </app-button>
            
            @if (pullRequest) {
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold">{{ pullRequest.title }}</h2>
                <app-badge [variant]="getStatusVariant(pullRequest.status)">
                  {{ getStatusLabel(pullRequest.status) }}
                </app-badge>
                @if (pullRequest.isDraft) {
                  <app-badge variant="secondary">Draft</app-badge>
                }
              </div>
            }
          </div>
          
          <div class="flex gap-2">
            @if (!isAnalysisRunning) {
              <app-button 
                variant="outline"
                (onClick)="onStartAnalysis()"
                [disabled]="!pullRequest"
              >
                Start AI Analysis
              </app-button>
            } @else {
              <app-button 
                variant="destructive"
                (onClick)="onCancelAnalysis()"
              >
                Cancel Analysis
              </app-button>
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto">
        @if (isLoading) {
          <div class="flex items-center justify-center h-full">
            <div class="text-muted-foreground">Loading pull request details...</div>
          </div>
        } @else if (!pullRequest) {
          <div class="flex items-center justify-center h-full">
            <div class="text-muted-foreground">No pull request selected</div>
          </div>
        } @else {
          <!-- Tabs for different sections -->
          <div class="border-b border-border bg-card/95 sticky top-[57px] z-10 backdrop-blur">
            <div class="container-vscode flex">
              <button 
                class="px-4 py-2 text-sm border-b-2 transition-colors"
                [class.border-primary]="activeTab() === 'overview'"
                [class.border-transparent]="activeTab() !== 'overview'"
                [class.text-primary]="activeTab() === 'overview'"
                [class.text-muted-foreground]="activeTab() !== 'overview'"
                (click)="setActiveTab('overview')"
              >
                Overview
              </button>
              <button 
                class="px-4 py-2 text-sm border-b-2 transition-colors"
                [class.border-primary]="activeTab() === 'files'"
                [class.border-transparent]="activeTab() !== 'files'"
                [class.text-primary]="activeTab() === 'files'"
                [class.text-muted-foreground]="activeTab() !== 'files'"
                (click)="setActiveTab('files')"
              >
                Files Changed ({{ fileChanges.length }})
              </button>
              <button 
                class="px-4 py-2 text-sm border-b-2 transition-colors"
                [class.border-primary]="activeTab() === 'analysis'"
                [class.border-transparent]="activeTab() !== 'analysis'"
                [class.text-primary]="activeTab() === 'analysis'"
                [class.text-muted-foreground]="activeTab() !== 'analysis'"
                (click)="setActiveTab('analysis')"
              >
                AI Analysis
                @if (analysisResults) {
                  <span class="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {{ analysisResults.comments?.length || 0 }}
                  </span>
                }
              </button>
            </div>
          </div>

          <div class="p-4 container-vscode">
            <!-- Overview Tab -->
            @if (activeTab() === 'overview') {
              <div class="space-y-6">
                <!-- Pull Request Info -->
                <app-card title="Pull Request Information">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm font-medium text-muted-foreground">Author</label>
                      <div class="flex items-center gap-2 mt-1">
                        @if (pullRequest.authorImageUrl) {
                          <img 
                            [src]="pullRequest.authorImageUrl" 
                            [alt]="pullRequest.author"
                            class="w-6 h-6 rounded-full"
                          />
                        }
                        <span>{{ pullRequest.author }}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label class="text-sm font-medium text-muted-foreground">Repository</label>
                      <div class="mt-1">{{ pullRequest.repository }}</div>
                    </div>
                    
                    <div>
                      <label class="text-sm font-medium text-muted-foreground">Created</label>
                      <div class="mt-1">{{ formatDate(pullRequest.createdDate) }}</div>
                    </div>
                    
                    <div>
                      <label class="text-sm font-medium text-muted-foreground">Branches</label>
                      <div class="mt-1 text-sm">
                        {{ pullRequest.sourceRefName }} → {{ pullRequest.targetRefName }}
                      </div>
                    </div>
                  </div>
                  
                  @if (pullRequest.description) {
                    <div class="mt-4">
                      <label class="text-sm font-medium text-muted-foreground">Description</label>
                      <div class="mt-1 p-3 bg-muted rounded-md text-sm">
                        {{ pullRequest.description }}
                      </div>
                    </div>
                  }
                </app-card>

                <!-- File Changes Summary -->
                @if (fileChanges.length > 0) {
                  <app-card title="Changes Summary">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div class="text-center">
                        <div class="text-2xl font-bold text-foreground">{{ fileChanges.length }}</div>
                        <div class="text-sm text-muted-foreground">Files</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">+{{ totalAdditions() }}</div>
                        <div class="text-sm text-muted-foreground">Additions</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-red-600">-{{ totalDeletions() }}</div>
                        <div class="text-sm text-muted-foreground">Deletions</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{{ filesByType().length }}</div>
                        <div class="text-sm text-muted-foreground">File Types</div>
                      </div>
                    </div>
                    
                    <!-- File type breakdown -->
                    <div class="mt-4">
                      <h4 class="text-sm font-medium mb-2">File Types</h4>
                      <div class="flex flex-wrap gap-2">
                        @for (type of filesByType(); track type.extension) {
                          <span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-muted">
                            {{ type.extension }} ({{ type.count }})
                          </span>
                        }
                      </div>
                    </div>
                  </app-card>
                }
              </div>
            }

            <!-- Files Tab -->
            @if (activeTab() === 'files') {
              <div class="space-y-4">
                <!-- File filters -->
                <div class="flex gap-4 items-center">
                  <select 
                    class="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    [value]="fileFilter()"
                    (change)="setFileFilter($any($event.target).value)"
                  >
                    <option value="all">All Files ({{ fileChanges.length }})</option>
                    <option value="added">Added ({{ getFilesByChangeType('add').length }})</option>
                    <option value="modified">Modified ({{ getFilesByChangeType('edit').length }})</option>
                    <option value="deleted">Deleted ({{ getFilesByChangeType('delete').length }})</option>
                    <option value="renamed">Renamed ({{ getFilesByChangeType('rename').length }})</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Filter files..."
                    class="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    [value]="fileSearchTerm()"
                    (input)="setFileSearchTerm($any($event.target).value)"
                  />
                  
                  <app-button 
                    variant="outline" 
                    size="sm"
                    (onClick)="toggleAllFiles()"
                  >
                    {{ allFilesExpanded() ? 'Collapse All' : 'Expand All' }}
                  </app-button>
                </div>

                <!-- File changes list -->
                <div class="space-y-2">
                  @for (file of filteredFiles(); track file.filePath) {
                    <div class="border border-border rounded-lg overflow-hidden">
                      <!-- File header -->
                      <div class="px-4 py-3 bg-muted/50 border-b border-border">
                        <div class="flex items-center justify-between cursor-pointer"
                             (click)="toggleFileExpansion(file.filePath)">
                          <div class="flex items-center gap-3">
                            <svg 
                              class="w-4 h-4 transition-transform"
                              [class.rotate-90]="isFileExpanded(file.filePath)"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                            
                            <app-badge [variant]="getChangeTypeVariant(file.changeType)">
                              {{ getChangeTypeLabel(file.changeType) }}
                            </app-badge>
                            
                            <span class="font-mono text-sm">{{ file.filePath }}</span>
                            
                            @if (file.oldFilePath && file.changeType === 'rename') {
                              <span class="text-muted-foreground text-sm">
                                (renamed from {{ file.oldFilePath }})
                              </span>
                            }
                          </div>
                          
                          <div class="flex items-center gap-4 text-sm">
                            @if (!file.isBinary) {
                              @if (file.addedLines > 0) {
                                <span class="text-green-600">+{{ file.addedLines }}</span>
                              }
                              @if (file.deletedLines > 0) {
                                <span class="text-red-600">-{{ file.deletedLines }}</span>
                              }
                            } @else {
                              <span class="text-muted-foreground">Binary file</span>
                            }
                            
                            @if (file.language) {
                              <span class="text-muted-foreground">{{ file.language }}</span>
                            }
                          </div>
                        </div>
                      </div>
                      
                      <!-- File diff content -->
                      @if (isFileExpanded(file.filePath)) {
                        <div class="bg-background">
                          @if (file.isBinary) {
                            <div class="p-4 text-center text-muted-foreground">
                              Binary file cannot be displayed
                            </div>
                          } @else if (file.lines && file.lines.length > 0) {
                            <div class="font-mono text-sm">
                              @for (line of file.lines; track $index) {
                                <div 
                                  class="flex hover:bg-muted/30"
                                  [class.bg-red-50]="line.type === 'deleted'"
                                  [class.bg-green-50]="line.type === 'added'"
                                  [class.bg-blue-50]="line.type === 'modified'"
                                >
                                  <!-- Line numbers -->
                                  <div class="flex">
                                    @if (line.originalLineNumber !== undefined) {
                                      <div class="w-12 px-2 py-1 text-xs text-muted-foreground text-right border-r border-border">
                                        {{ line.originalLineNumber }}
                                      </div>
                                    } @else {
                                      <div class="w-12 px-2 py-1 text-xs border-r border-border"></div>
                                    }
                                    
                                    @if (line.lineNumber !== undefined) {
                                      <div class="w-12 px-2 py-1 text-xs text-muted-foreground text-right border-r border-border">
                                        {{ line.lineNumber }}
                                      </div>
                                    } @else {
                                      <div class="w-12 px-2 py-1 text-xs border-r border-border"></div>
                                    }
                                  </div>
                                  
                                  <!-- Change indicator -->
                                  <div class="w-6 px-1 py-1 text-center">
                                    @if (line.type === 'added') {
                                      <span class="text-green-600">+</span>
                                    } @else if (line.type === 'deleted') {
                                      <span class="text-red-600">-</span>
                                    } @else if (line.type === 'modified') {
                                      <span class="text-blue-600">~</span>
                                    }
                                  </div>
                                  
                                  <!-- Line content -->
                                  <div class="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                                    {{ line.content }}
                                  </div>
                                </div>
                              }
                            </div>
                          } @else {
                            <div class="p-4 text-center text-muted-foreground">
                              No diff data available
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  
                  @if (filteredFiles().length === 0) {
                    <div class="text-center py-8 text-muted-foreground">
                      No files match the current filter
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Analysis Tab -->
            @if (activeTab() === 'analysis') {
              <div class="space-y-6">
                <!-- Analysis Progress -->
                @if (isAnalysisRunning && analysisProgress) {
                  <app-card title="AI Analysis Progress">
                    <div class="space-y-3">
                      <div class="flex justify-between text-sm">
                        <span>{{ analysisProgress.message || 'Analyzing...' }}</span>
                        <span>{{ analysisProgress.percentage }}%</span>
                      </div>
                      <div class="w-full bg-muted rounded-full h-2">
                        <div 
                          class="bg-primary h-2 rounded-full transition-all duration-300"
                          [style.width.%]="analysisProgress.percentage"
                        ></div>
                      </div>
                      <div class="text-xs text-muted-foreground">
                        Stage: {{ analysisProgress.stage }}
                      </div>
                    </div>
                  </app-card>
                }

                <!-- Analysis Results -->
                @if (analysisResults && !isAnalysisRunning) {
                  <app-card title="AI Analysis Results">
                    <div class="space-y-4">
                      @if (analysisResults.summary) {
                        <div>
                          <h4 class="font-medium mb-2">Summary</h4>
                          <div class="p-3 bg-muted rounded-md text-sm">
                            {{ analysisResults.summary }}
                          </div>
                        </div>
                      }
                      
                      @if (analysisResults.comments && analysisResults.comments.length > 0) {
                        <div>
                          <h4 class="font-medium mb-2">
                            Comments ({{ analysisResults.comments.length }})
                          </h4>
                          <div class="space-y-2">
                            @for (comment of analysisResults.comments.slice(0, 5); track comment.id) {
                              <div class="p-3 border border-border rounded-md">
                                <div class="flex justify-between items-start mb-2">
                                  <span class="text-sm font-medium">{{ comment.filePath }}</span>
                                  <app-badge 
                                    [variant]="getSeverityVariant(comment.severity)"
                                    additionalClasses="text-xs"
                                  >
                                    {{ comment.severity }}
                                  </app-badge>
                                </div>
                                <div class="text-sm text-muted-foreground">
                                  {{ comment.content }}
                                </div>
                              </div>
                            }
                            @if (analysisResults.comments.length > 5) {
                              <div class="text-sm text-muted-foreground text-center py-2">
                                And {{ analysisResults.comments.length - 5 }} more comments...
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </app-card>
                } @else if (!isAnalysisRunning) {
                  <div class="text-center py-8">
                    <div class="text-muted-foreground mb-4">No analysis results available</div>
                    <app-button (onClick)="onStartAnalysis()">
                      Start AI Analysis
                    </app-button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PullRequestDetailComponent {
  @Input() pullRequest: PullRequest | undefined = undefined;
  @Input() isLoading = false;
  @Input() analysisResults: any = null;
  @Input() analysisProgress: AnalysisProgress | undefined = undefined;
  @Input() isAnalysisRunning = false;
  @Input() fileChanges: FileChange[] = [];
  
  @Output() back = new EventEmitter<void>();
  @Output() startAnalysis = new EventEmitter<void>();
  @Output() cancelAnalysis = new EventEmitter<void>();

  // Tab management
  activeTab = signal<'overview' | 'files' | 'analysis'>('overview');
  
  // File expansion state
  expandedFiles = signal<Set<string>>(new Set());
  allFilesExpanded = signal(false);
  
  // File filtering
  fileFilter = signal<'all' | 'added' | 'modified' | 'deleted' | 'renamed'>('all');
  fileSearchTerm = signal('');
  
  // Computed properties
  filteredFiles = computed(() => {
    let files = this.fileChanges;
    
    // Apply change type filter
    if (this.fileFilter() !== 'all') {
      const filterMap: Record<string, FileChangeType> = {
        added: FileChangeType.ADD,
        modified: FileChangeType.EDIT,
        deleted: FileChangeType.DELETE,
        renamed: FileChangeType.RENAME
      };
      files = files.filter(f => f.changeType === filterMap[this.fileFilter()]);
    }
    
    // Apply search filter
    const searchTerm = this.fileSearchTerm().toLowerCase();
    if (searchTerm) {
      files = files.filter(f => 
        f.filePath.toLowerCase().includes(searchTerm) ||
        (f.oldFilePath && f.oldFilePath.toLowerCase().includes(searchTerm))
      );
    }
    
    return files;
  });
  
  totalAdditions = computed(() => 
    this.fileChanges.reduce((sum, file) => sum + file.addedLines, 0)
  );
  
  totalDeletions = computed(() => 
    this.fileChanges.reduce((sum, file) => sum + file.deletedLines, 0)
  );
  
  filesByType = computed(() => {
    const typeMap = new Map<string, number>();
    this.fileChanges.forEach(file => {
      const ext = this.getFileExtension(file.filePath);
      typeMap.set(ext, (typeMap.get(ext) || 0) + 1);
    });
    return Array.from(typeMap.entries())
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count);
  });

  onBack(): void {
    this.back.emit();
  }

  onStartAnalysis(): void {
    this.startAnalysis.emit();
  }

  onCancelAnalysis(): void {
    this.cancelAnalysis.emit();
  }
  
  // Tab methods
  setActiveTab(tab: 'overview' | 'files' | 'analysis'): void {
    this.activeTab.set(tab);
  }
  
  // File expansion methods
  toggleFileExpansion(filePath: string): void {
    const expanded = this.expandedFiles();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    
    this.expandedFiles.set(newExpanded);
  }
  
  isFileExpanded(filePath: string): boolean {
    return this.expandedFiles().has(filePath);
  }
  
  toggleAllFiles(): void {
    const allExpanded = this.allFilesExpanded();
    if (allExpanded) {
      this.expandedFiles.set(new Set());
      this.allFilesExpanded.set(false);
    } else {
      const allPaths = new Set(this.filteredFiles().map(f => f.filePath));
      this.expandedFiles.set(allPaths);
      this.allFilesExpanded.set(true);
    }
  }
  
  // Filter methods
  setFileFilter(filter: 'all' | 'added' | 'modified' | 'deleted' | 'renamed'): void {
    this.fileFilter.set(filter);
  }
  
  setFileSearchTerm(term: string): void {
    this.fileSearchTerm.set(term);
  }
  
  getFilesByChangeType(changeType: string): FileChange[] {
    const typeMap: Record<string, FileChangeType> = {
      add: FileChangeType.ADD,
      edit: FileChangeType.EDIT,
      delete: FileChangeType.DELETE,
      rename: FileChangeType.RENAME
    };
    return this.fileChanges.filter(f => f.changeType === typeMap[changeType]);
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

  getSeverityVariant(severity: any): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  }
  
  getChangeTypeVariant(changeType: FileChangeType): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (changeType) {
      case FileChangeType.ADD: return 'default';
      case FileChangeType.EDIT: return 'secondary';
      case FileChangeType.DELETE: return 'destructive';
      case FileChangeType.RENAME: return 'outline';
      default: return 'outline';
    }
  }
  
  getChangeTypeLabel(changeType: FileChangeType): string {
    switch (changeType) {
      case FileChangeType.ADD: return 'Added';
      case FileChangeType.EDIT: return 'Modified';
      case FileChangeType.DELETE: return 'Deleted';
      case FileChangeType.RENAME: return 'Renamed';
      default: return 'Unknown';
    }
  }
  
  getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) return 'No extension';
    const ext = filePath.substring(lastDot + 1);
    return ext.toUpperCase();
  }

  formatDate(dateString?: string): string {
    if (!dateString) { return ''; }
    const d = new Date(String(dateString));
    if (isNaN(d.getTime())) { return ''; }
    try {
      return d.toLocaleDateString();
    } catch {
      return d.toDateString();
    }
  }
}
