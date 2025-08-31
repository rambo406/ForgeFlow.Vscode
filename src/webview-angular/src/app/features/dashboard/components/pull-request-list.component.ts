import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullRequest, DashboardFilters } from '@core/models';
import { 
  AppButtonComponent,
  AppBadgeComponent,
  AppTableComponent,
  AppTableRowComponent,
  AppTableCellComponent,
  VirtualScrollComponent,
  SelectOption,
  TableColumn
} from '@shared/components';

@Component({
  selector: 'app-pull-request-list',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppBadgeComponent,
    AppTableComponent,
    AppTableRowComponent,
    AppTableCellComponent,
    VirtualScrollComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col">
      <!-- Search and Filters - Enhanced Mobile-First Responsive -->
      <div class="border-b border-vscode-panel-border bg-vscode-panel-background p-vscode-lg">
        <div class="flex flex-col space-y-vscode-lg vscode-lg:flex-row vscode-lg:space-y-0 vscode-lg:items-center vscode-lg:gap-vscode-lg">
          <!-- Search Input - Full Width on Mobile -->
          <div class="w-full vscode-sm:min-w-[300px] vscode-lg:flex-1">
            <input
              type="text"
              placeholder="Search pull requests..."
              [value]="searchTerm || ''"
              (input)="onSearchChange($any($event.target).value)"
              class="input-vscode w-full text-vscode-sm"
            />
          </div>
          
          <!-- Filter Controls - Stacked on Mobile, Inline on Desktop -->
          <div class="flex flex-col space-y-vscode-sm vscode-sm:flex-row vscode-sm:space-y-0 vscode-sm:space-x-vscode-md vscode-sm:flex-wrap">
            <select
              [value]="filters.author || ''"
              (change)="onFilterChange('author', $any($event.target).value)"
              class="input-vscode text-vscode-sm w-full vscode-sm:w-auto vscode-sm:min-w-[140px]"
            >
              @for (option of authorOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            
            <select
              [value]="filters.repository || ''"
              (change)="onFilterChange('repository', $any($event.target).value)"
              class="input-vscode text-vscode-sm w-full vscode-sm:w-auto vscode-sm:min-w-[140px]"
            >
              @for (option of repositoryOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            
            <select
              [value]="filters.status || ''"
              (change)="onFilterChange('status', $any($event.target).value)"
              class="input-vscode text-vscode-sm w-full vscode-sm:w-auto vscode-sm:min-w-[120px]"
            >
              @for (option of statusOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            
            <!-- Date Range - Mobile-Optimized -->
            <div class="flex flex-col space-y-vscode-sm vscode-sm:flex-row vscode-sm:space-y-0 vscode-sm:items-center vscode-sm:space-x-vscode-sm">
              <input
                type="date"
                [value]="filters.dateRange?.from || ''"
                (change)="onDateRangeChange('from', $any($event.target).value)"
                placeholder="From date"
                class="input-vscode text-vscode-sm w-full vscode-sm:w-auto"
              />
              <span class="text-vscode-muted text-vscode-sm hidden vscode-sm:inline">to</span>
              <input
                type="date"
                [value]="filters.dateRange?.to || ''"
                (change)="onDateRangeChange('to', $any($event.target).value)"
                placeholder="To date"
                class="input-vscode text-vscode-sm w-full vscode-sm:w-auto"
              />
            </div>
            
            <!-- Clear Filters Button - Touch-Friendly -->
            <app-button
              variant="outline"
              size="sm"
              additionalClasses="w-full vscode-sm:w-auto"
              (onClick)="onClearFilters()"
            >
              Clear Filters
            </app-button>
          </div>
        </div>
      </div>

      <!-- Pull Request Table -->
      <div class="flex-1 overflow-auto">
        @if (isLoading) {
          <div class="flex items-center justify-center h-full">
            <div class="text-muted-foreground">Loading pull requests...</div>
          </div>
        } @else if (pullRequests.length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center">
            <div class="text-muted-foreground mb-2">No pull requests found</div>
            <div class="text-sm text-muted-foreground">
              @if (searchTerm || filters.author || filters.status) {
                Try adjusting your search criteria
              } @else {
                No pull requests available in this project
              }
            </div>
          </div>
        } @else if (enableVirtualScroll && pullRequests.length > 20) {
          <!-- Virtual Scroll Implementation for Large Lists -->
          <app-virtual-scroll
            [items]="pullRequests"
            [itemTemplate]="prItemTemplate"
            [containerHeight]="virtualScrollHeight"
            [config]="{
              itemHeight: 120,
              bufferSize: 5,
              threshold: 0.8,
              enableDynamicHeight: false
            }"
            (scrollToEnd)="scrollToEnd.emit()"
          ></app-virtual-scroll>
        } @else {
          <!-- Regular Table Implementation for Smaller Lists -->
          <app-table [columns]="tableColumns" additionalClasses="h-full">
            @for (pr of pullRequests; track pr.id) {
              <app-table-row 
                additionalClasses="cursor-pointer hover:bg-muted/50 transition-colors"
                (click)="onSelectPR(pr.id)"
              >
                <app-table-cell>
                  <div class="flex flex-col">
                    <div class="font-medium text-sm line-clamp-2">{{ pr.title }}</div>
                    <div class="text-xs text-muted-foreground mt-1">
                      #{{ pr.id }} • {{ pr.repository }}
                    </div>
                  </div>
                </app-table-cell>
                
                <app-table-cell>
                  <div class="flex items-center gap-2">
                    <div class="text-sm">{{ pr.author }}</div>
                    @if (pr.authorImageUrl) {
                      <img 
                        [src]="pr.authorImageUrl" 
                        [alt]="pr.author"
                        class="w-6 h-6 rounded-full"
                      />
                    }
                  </div>
                </app-table-cell>
                
                <app-table-cell>
                  <app-badge 
                    [variant]="getStatusVariant(pr.status)"
                  >
                    {{ getStatusLabel(pr.status) }}
                  </app-badge>
                  @if (pr.isDraft) {
                    <app-badge variant="secondary" additionalClasses="ml-2">
                      Draft
                    </app-badge>
                  }
                </app-table-cell>
                
                <app-table-cell>
                  <div class="text-sm">
                    {{ formatDate(pr.createdDate) }}
                  </div>
                  @if (pr.ageInDays) {
                    <div class="text-xs text-muted-foreground">
                      {{ pr.ageInDays }} days ago
                    </div>
                  }
                </app-table-cell>
                
                <app-table-cell>
                  <div class="text-xs">
                    <div>{{ pr.sourceRefName }} →</div>
                    <div>{{ pr.targetRefName }}</div>
                  </div>
                </app-table-cell>
                
                <app-table-cell>
                  <div class="flex gap-2">
                    <app-button
                      size="sm"
                      variant="outline"
                      (onClick)="onSelectPR(pr.id); $event.stopPropagation()"
                    >
                      View
                    </app-button>
                    <app-button
                      size="sm"
                      (onClick)="onAnalyzePR(pr.id); $event.stopPropagation()"
                    >
                      Analyze
                    </app-button>
                  </div>
                </app-table-cell>
              </app-table-row>
            }
          </app-table>
        }
      </div>
    </div>
    
    <!-- Template for Virtual Scroll Items - Enhanced Mobile-First -->
    <ng-template #prItemTemplate let-pr let-index="index">
      <div class="pr-virtual-item p-vscode-lg border-b border-vscode-panel-border bg-vscode-panel-background hover:bg-vscode-list-hover transition-colors cursor-pointer"
           (click)="onSelectPR(pr.id)">
        <div class="flex items-start justify-between gap-vscode-lg">
          <!-- Main PR Info - Mobile-Optimized Layout -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-vscode-sm mb-vscode-sm flex-col vscode-sm:flex-row vscode-sm:items-center">
              <h3 class="font-medium text-vscode-sm line-clamp-2 flex-1">{{ pr.title }}</h3>
              <div class="flex gap-vscode-xs">
                <app-badge [variant]="getStatusVariant(pr.status)">
                  {{ getStatusLabel(pr.status) }}
                </app-badge>
                @if (pr.isDraft) {
                  <app-badge variant="secondary">Draft</app-badge>
                }
              </div>
            </div>
            
            <div class="text-vscode-xs text-vscode-muted mb-vscode-sm">
              #{{ pr.id }} • {{ pr.repository }}
            </div>
            
            <!-- Author and Date - Responsive Layout -->
            <div class="flex flex-col space-y-vscode-xs vscode-sm:flex-row vscode-sm:space-y-0 vscode-sm:items-center vscode-sm:gap-vscode-lg text-vscode-sm">
              <div class="flex items-center gap-vscode-xs">
                @if (pr.authorImageUrl) {
                  <img 
                    [src]="pr.authorImageUrl" 
                    [alt]="pr.author"
                    class="w-5 h-5 rounded-full"
                  />
                }
                <span>{{ pr.author }}</span>
              </div>
              
              <div class="text-vscode-muted">
                {{ formatDate(pr.createdDate) }}
                @if (pr.ageInDays) {
                  <span class="text-vscode-xs">({{ pr.ageInDays }} days ago)</span>
                }
              </div>
            </div>
            
            <div class="text-vscode-xs text-vscode-muted mt-vscode-xs">
              <span class="font-mono">{{ pr.sourceRefName }}</span> → <span class="font-mono">{{ pr.targetRefName }}</span>
            </div>
          </div>
          
          <!-- Actions - Mobile-First Button Layout -->
          <div class="flex flex-col gap-vscode-xs vscode-sm:flex-row vscode-sm:gap-vscode-sm flex-shrink-0">
            <app-button
              size="sm"
              variant="outline"
              additionalClasses="w-full vscode-sm:w-auto text-vscode-xs"
              (onClick)="onSelectPR(pr.id); $event.stopPropagation()"
            >
              <span class="vscode-sm:hidden">View</span>
              <span class="hidden vscode-sm:inline">View Details</span>
            </app-button>
            <app-button
              size="sm"
              additionalClasses="w-full vscode-sm:w-auto text-vscode-xs"
              (onClick)="onAnalyzePR(pr.id); $event.stopPropagation()"
            >
              Analyze
            </app-button>
          </div>
        </div>
      </div>
    </ng-template>
  `
})
export class PullRequestListComponent {
  @Input() pullRequests: PullRequest[] = [];
  @Input() isLoading = false;
  @Input() filters: DashboardFilters = {} as DashboardFilters;
  @Input() searchTerm: string | undefined = '';
  @Input() sortBy: string | undefined = '';
  @Input() sortDirection: 'asc' | 'desc' | undefined = 'desc';
  @Input() enableVirtualScroll = false;
  @Input() virtualScrollHeight = 400;
  
  @Output() select = new EventEmitter<number>();
  @Output() search = new EventEmitter<string>();
  @Output() filter = new EventEmitter<Partial<DashboardFilters>>();
  @Output() sort = new EventEmitter<{ sortBy: string; sortDirection?: 'asc' | 'desc' }>();
  @Output() analyze = new EventEmitter<number>();
  @Output() scrollToEnd = new EventEmitter<void>();

  tableColumns: TableColumn[] = [
    { key: 'title', label: 'Pull Request', sortable: true },
    { key: 'author', label: 'Author', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdDate', label: 'Created', sortable: true },
    { key: 'branch', label: 'Branch', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  get authorOptions(): SelectOption[] {
    const authors = [...new Set(this.pullRequests.map(pr => pr.author))];
    return [
      { value: '', label: 'All Authors' },
      ...authors.map(author => ({ value: author, label: author }))
    ];
  }

  get repositoryOptions(): SelectOption[] {
    const repositories = [...new Set(this.pullRequests.map(pr => pr.repository))];
    return [
      { value: '', label: 'All Repositories' },
      ...repositories.map(repo => ({ value: repo, label: repo }))
    ];
  }

  get statusOptions(): SelectOption[] {
    return [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'abandoned', label: 'Abandoned' }
    ];
  }

  onSearchChange(value: string): void {
    this.search.emit(value);
  }

  onFilterChange(filterKey: string, value: string): void {
    const filterValue = value || undefined;
    this.filter.emit({ [filterKey]: filterValue });
  }

  onDateRangeChange(rangeType: 'from' | 'to', value: string): void {
    const currentRange = this.filters.dateRange || { from: '', to: '' };
    const newRange = { ...currentRange, [rangeType]: value || '' };
    
    // Only emit if both dates are provided or both are empty
    if ((newRange.from && newRange.to) || (!newRange.from && !newRange.to)) {
      this.filter.emit({ 
        dateRange: (newRange.from || newRange.to) ? newRange : undefined 
      });
    }
  }

  onClearFilters(): void {
    this.search.emit('');
    this.filter.emit({
      author: undefined,
      repository: undefined,
      status: undefined,
      dateRange: undefined,
      labels: []
    });
  }

  onSelectPR(prId: number): void {
    this.select.emit(prId);
  }

  onAnalyzePR(prId: number): void {
    this.analyze.emit(prId);
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}