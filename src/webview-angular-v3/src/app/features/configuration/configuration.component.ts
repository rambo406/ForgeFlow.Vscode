import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WebviewMessagingService, WebviewMessage } from '../../core/services/webview-messaging.service';

@Component({
  selector: 'ff-configuration',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConfigurationComponent implements OnInit {
  // Form state
  organizationUrl = signal<string>('');
  personalAccessToken = signal<string>('');
  defaultProject = signal<string>('');

  // UI state
  saving = signal<boolean>(false);
  testingOrg = signal<boolean>(false);
  testingPat = signal<boolean>(false);
  showPat = signal<boolean>(false);

  // Feedback
  orgResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);
  patResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);
  toast = signal<{ kind: 'success' | 'error'; message: string } | null>(null);

  constructor(private readonly bus: WebviewMessagingService) {}

  ngOnInit(): void {
    this.bus.onMessage().subscribe((msg: WebviewMessage) => {
      switch (msg.type) {
        case 'loadConfig': {
          const cfg = (msg.payload as any)?.config || {}; // eslint-disable-line
          this.organizationUrl.set(cfg.organizationUrl || '');
          // Do NOT echo PAT if empty/undefined; it's retrieved only when user opens config
          this.personalAccessToken.set(cfg.personalAccessToken || '');
          this.defaultProject.set(cfg.defaultProject || '');
          break;
        }
        case 'testConnection': {
          const p = (msg.payload as any) || {}; // eslint-disable-line
          if (p.testType === 'organization') {
            this.testingOrg.set(false);
            this.orgResult.set({ success: !!p.success, message: p.message, error: p.error });
          } else if (p.testType === 'patToken') {
            this.testingPat.set(false);
            this.patResult.set({ success: !!p.success, message: p.message, error: p.error });
          }
          break;
        }
        case 'showSuccess': {
          const message = (msg.payload as any)?.message || 'Success'; // eslint-disable-line
          this.toast.set({ kind: 'success', message });
          break;
        }
        case 'showError': {
          const message = (msg.payload as any)?.message || 'Something went wrong'; // eslint-disable-line
          this.toast.set({ kind: 'error', message });
          break;
        }
      }
    });

    // Initial load
    this.bus.postMessage({ type: 'loadConfig' });
  }

  save(): void {
    this.saving.set(true);
    this.toast.set(null);
    this.bus.postMessage({
      type: 'saveConfig',
      payload: {
        config: {
          organizationUrl: this.organizationUrl(),
          personalAccessToken: this.personalAccessToken(),
          defaultProject: this.defaultProject()
        }
      }
    });
    // Optimistically end saving state after brief delay; backend will also send toast
    setTimeout(() => this.saving.set(false), 300);
  }

  testOrg(): void {
    this.testingOrg.set(true);
    this.orgResult.set(null);
    this.bus.postMessage({
      type: 'testConnection',
      payload: { testType: 'organization', organizationUrl: this.organizationUrl() }
    });
  }

  testPat(): void {
    this.testingPat.set(true);
    this.patResult.set(null);
    this.bus.postMessage({
      type: 'testConnection',
      payload: { testType: 'patToken', patToken: this.personalAccessToken(), organizationUrl: this.organizationUrl() }
    });
  }
}


