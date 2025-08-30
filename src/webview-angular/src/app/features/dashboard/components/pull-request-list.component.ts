import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullRequest, DashboardFilters } from '@core/models';
import { 
  AppButtonComponent,
  AppBadgeComponent,
  AppTableComponent,
  AppTableRowComponent,
  AppTableCellComponent,
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
    AppTableCellComponent
  ],
  template: `
    <div class="h-full flex flex-col">
      <!-- Search and Filters -->
      <div class="border-b border-border bg-card p-4">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search pull requests..."
              [value]="searchTerm || ''"
              (input)="onSearchChange($any($event.target).value)"
              class="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>
          
          <select
            [value]="filters.author || ''"
            (change)="onFilterChange('author', $any($event.target).value)"
            class="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            @for (option of authorOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
          
          <select
            [value]="filters.status || ''"
            (change)="onFilterChange('status', $any($event.target).value)"
            class="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
          
          <app-button
            variant="outline"
            size="sm"
            (onClick)="onClearFilters()"
          >
            Clear Filters
          </app-button>
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
        } @else {
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PullRequestListComponent {
  @Input() pullRequests: PullRequest[] = [];
  @Input() isLoading = false;
  @Input() filters: DashboardFilters = {} as DashboardFilters;
  @Input() searchTerm: string | undefined = '';
  @Input() sortBy: string | undefined = '';
  @Input() sortDirection: 'asc' | 'desc' | undefined = 'desc';
  
  @Output() select = new EventEmitter<number>();
  @Output() search = new EventEmitter<string>();
  @Output() filter = new EventEmitter<Partial<DashboardFilters>>();
  @Output() sort = new EventEmitter<{ sortBy: string; sortDirection?: 'asc' | 'desc' }>();
  @Output() analyze = new EventEmitter<number>();

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