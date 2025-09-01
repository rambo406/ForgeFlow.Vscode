import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PullRequest, DashboardFilters } from '@core/models';
import { 
  AppButtonComponent,
  AppBadgeComponent,
  AppTableComponent,
  AppTableRowComponent,
  AppTableCellComponent,
  VirtualScrollComponent,
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
  templateUrl: './pull-request-list.component.html'
})
export class PullRequestListComponent {
  // Signal-based inputs
  pullRequests = input<PullRequest[]>([]);
  isLoading = input(false);
  filters = input<DashboardFilters>({} as DashboardFilters);
  searchTerm = input<string | undefined>('');
  sortBy = input<string | undefined>('');
  sortDirection = input<'asc' | 'desc' | undefined>('desc');
  enableVirtualScroll = input(false);
  virtualScrollHeight = input(400);
  
  // Signal-based outputs
  select = output<number>();
  search = output<string>();
  filter = output<Partial<DashboardFilters>>();
  sort = output<{ sortBy: string; sortDirection?: 'asc' | 'desc' }>();
  analyze = output<number>();
  scrollToEnd = output<void>();

  tableColumns: TableColumn[] = [
    { key: 'title', label: 'Pull Request', sortable: true },
    { key: 'author', label: 'Author', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdDate', label: 'Created', sortable: true },
    { key: 'branch', label: 'Branch', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  // Computed signals for reactive data
  authorOptions = computed(() => {
    const authors = [...new Set(this.pullRequests().map((pr: PullRequest) => pr.author))];
    return [
      { value: '', label: 'All Authors' },
      ...authors.map((author: string) => ({ value: author, label: author }))
    ];
  });

  repositoryOptions = computed(() => {
    const repositories = [...new Set(this.pullRequests().map((pr: PullRequest) => pr.repository))];
    return [
      { value: '', label: 'All Repositories' },
      ...repositories.map((repo: string) => ({ value: repo, label: repo }))
    ];
  });

  statusOptions = computed(() => {
    return [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'abandoned', label: 'Abandoned' }
    ];
  });

  onSearchChange(value: string): void {
    this.search.emit(value);
  }

  onFilterChange(filterKey: string, value: string): void {
    const filterValue = value || undefined;
    this.filter.emit({ [filterKey]: filterValue });
  }

  onDateRangeChange(rangeType: 'from' | 'to', value: string): void {
    const currentRange = this.filters().dateRange || { from: '', to: '' };
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

  getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'abandoned': return 'destructive';
      default: return 'outline';
    }
  }

  getStatusLabel(status: string): string {
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