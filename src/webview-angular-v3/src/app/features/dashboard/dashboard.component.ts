import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WebviewMessagingService, WebviewMessage } from '../../core/services/webview-messaging.service';

@Component({
  selector: 'ff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DashboardComponent implements OnInit {
  // Config state
  organizationUrl = signal<string>('');
  personalAccessToken = signal<string>('');
  defaultProject = signal<string>('');
  isConfigured = computed(() => !!this.organizationUrl() && !!this.personalAccessToken());

  // PR state
  loadingPRs = signal<boolean>(false);
  prCount = signal<number | null>(null);
  lastProject = signal<string>('');
  pullRequests = signal<Array<{
    id: number;
    title: string;
    author: string;
    createdDate: string;
    status: string;
    sourceRefName: string;
    targetRefName: string;
    description: string;
    repository: string;
    isDraft: boolean;
    url: string;
  }>>([]);
  repositories = signal<Array<{ id: string; name: string }>>([]);
  searchQuery = signal<string>('');
  filters = signal<{ status: 'all' | 'active' | 'completed' | 'abandoned'; repositoryId?: string; author?: string; startDate?: string; endDate?: string }>({ status: 'all' });
  applyingFilters = signal<boolean>(false);

  constructor(private readonly bus: WebviewMessagingService, private readonly router: Router) {}

  ngOnInit(): void {
    this.bus.onMessage().subscribe((msg: WebviewMessage) => {
      switch (msg.type) {
        case 'loadConfig': {
          const cfg = (msg.payload as any)?.config || {}; // eslint-disable-line
          this.organizationUrl.set(cfg.organizationUrl || '');
          this.personalAccessToken.set(cfg.personalAccessToken || '');
          this.defaultProject.set(cfg.defaultProject || '');
          // load repositories for filters if we have a project
          const project = this.defaultProject();
          if (project) {
            this.bus.postMessage({ type: 'loadRepositories', payload: { project } });
          }
          break;
        }
        case 'loadPullRequests': {
          this.loadingPRs.set(false);
          const payload = (msg.payload as any) || {}; // eslint-disable-line
          const incoming = Array.isArray(payload.pullRequests) ? payload.pullRequests : [];
          const normalized = incoming.map((x: any) => this.normalizePR(x)); // eslint-disable-line
          this.pullRequests.set(normalized);
          this.prCount.set(payload.totalCount ?? normalized.length);
          if (payload.projectName) this.lastProject.set(payload.projectName);
          break;
        }
        case 'filterPullRequests': {
          this.applyingFilters.set(false);
          const payload = (msg.payload as any) || {}; // eslint-disable-line
          const incoming = Array.isArray(payload.pullRequests) ? payload.pullRequests : [];
          const normalized = incoming.map((x: any) => this.normalizePR(x)); // eslint-disable-line
          this.pullRequests.set(normalized);
          this.prCount.set(normalized.length);
          break;
        }
        case 'searchPullRequests': {
          this.loadingPRs.set(false);
          const payload = (msg.payload as any) || {}; // eslint-disable-line
          const incoming = Array.isArray(payload.pullRequests) ? payload.pullRequests : [];
          const normalized = incoming.map((x: any) => this.normalizePR(x)); // eslint-disable-line
          this.pullRequests.set(normalized);
          this.prCount.set(normalized.length);
          break;
        }
        case 'loadRepositories': {
          const payload = (msg.payload as any) || {}; // eslint-disable-line
          const repos = Array.isArray(payload.repositories) ? payload.repositories : [];
          this.repositories.set(repos.map((r: any) => ({ id: r.id, name: r.name })));
          break;
        }
        case 'showError': {
          this.loadingPRs.set(false);
          this.applyingFilters.set(false);
          break;
        }
      }
    });

    // Initial config load
    this.bus.postMessage({ type: 'loadConfig' });
  }

  loadActivePRs(): void {
    this.prCount.set(null);
    this.loadingPRs.set(true);
    this.bus.postMessage({ type: 'loadPullRequests', payload: { filters: {} } });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    // debounce-like simple delay
    setTimeout(() => {
      if (this.searchQuery() === value && value.trim().length > 0) {
        this.loadingPRs.set(true);
        this.bus.postMessage({ type: 'searchPullRequests', payload: { query: value, projectName: this.defaultProject() } });
      }
    }, 250);
  }

  applyFilters(): void {
    const f = this.filters();
    const payload: any = { filters: {}, projectName: this.defaultProject() }; // eslint-disable-line
    if (f.repositoryId) payload.filters.repositoryId = f.repositoryId;
    if (f.author && f.author.trim().length) payload.filters.author = f.author.trim();
    if (f.status && f.status !== 'all') payload.filters.status = f.status;
    if (f.startDate || f.endDate) payload.filters.dateRange = { startDate: f.startDate, endDate: f.endDate };
    this.applyingFilters.set(true);
    this.bus.postMessage({ type: 'filterPullRequests', payload });
  }

  clearFilters(): void {
    this.filters.set({ status: 'all' });
    this.searchQuery.set('');
    this.pullRequests.set([]);
    this.prCount.set(null);
  }

  selectPR(prId: number): void {
    this.bus.postMessage({ type: 'selectPullRequest', payload: { prId } });
    this.router.navigate(['/pull-request', prId]);
  }

  private normalizePR(x: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Accepts either transformed object from handleLoadPullRequests or raw PullRequest from AzureDevOpsClient
    const id = x.id ?? x.pullRequestId;
    const title = x.title ?? '';
    const author = x.author ?? x.createdBy?.displayName ?? '';
    const createdDate = x.createdDate ?? (x.creationDate ? new Date(x.creationDate).toISOString() : '');
    const status = x.status ?? '';
    const sourceRefName = x.sourceRefName ?? '';
    const targetRefName = x.targetRefName ?? '';
    const description = x.description ?? '';
    const repository = x.repository?.name ?? x.repository ?? '';
    const isDraft = !!(x.isDraft);
    const url = x.url ?? x._links?.web?.href ?? '';
    return { id, title, author, createdDate, status, sourceRefName, targetRefName, description, repository, isDraft, url };
  }

  // Template helpers to update filters (templates don't support object spread well)
  updateStatus(value: string): void {
    const f = this.filters();
    this.filters.set({ ...f, status: value as any });
  }
  updateRepository(value: string): void {
    const f = this.filters();
    this.filters.set({ ...f, repositoryId: value || undefined });
  }
  updateAuthor(value: string): void {
    const f = this.filters();
    this.filters.set({ ...f, author: value });
  }
  updateStartDate(value: string): void {
    const f = this.filters();
    this.filters.set({ ...f, startDate: value || undefined });
  }
  updateEndDate(value: string): void {
    const f = this.filters();
    this.filters.set({ ...f, endDate: value || undefined });
  }
}


