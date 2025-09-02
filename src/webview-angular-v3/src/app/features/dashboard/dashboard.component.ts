import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

  constructor(private readonly bus: WebviewMessagingService) {}

  ngOnInit(): void {
    this.bus.onMessage().subscribe((msg: WebviewMessage) => {
      switch (msg.type) {
        case 'loadConfig': {
          const cfg = (msg.payload as any)?.config || {}; // eslint-disable-line
          this.organizationUrl.set(cfg.organizationUrl || '');
          this.personalAccessToken.set(cfg.personalAccessToken || '');
          this.defaultProject.set(cfg.defaultProject || '');
          break;
        }
        case 'loadPullRequests': {
          this.loadingPRs.set(false);
          const payload = (msg.payload as any) || {}; // eslint-disable-line
          this.prCount.set(payload.totalCount ?? (payload.pullRequests?.length ?? 0));
          if (payload.projectName) this.lastProject.set(payload.projectName);
          break;
        }
        case 'showError': {
          this.loadingPRs.set(false);
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
}


