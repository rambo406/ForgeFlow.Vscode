import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WebviewMessagingService, WebviewMessage } from '../../core/services/webview-messaging.service';

@Component({
  selector: 'ff-configuration',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConfigurationComponent implements OnInit {
  // Form state
  organizationUrl = signal<string>('');
  personalAccessToken = signal<string>('');
  defaultProject = signal<string>('');
  selectedModel = signal<string>('');
  availableModels = signal<Array<{ id: string; name: string; vendor: string; family: string; maxTokens?: number }>>([]);

  // UI state
  saving = signal<boolean>(false);
  testingOrg = signal<boolean>(false);
  testingPat = signal<boolean>(false);
  loadingModels = signal<boolean>(false);
  testingModel = signal<boolean>(false);
  showPat = signal<boolean>(false);

  // Feedback
  orgResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);
  patResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);
  modelResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);
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
          this.selectedModel.set(cfg.selectedModel || '');
          break;
        }
        case 'loadAvailableModels': {
          const list = ((msg.payload as any)?.models || []) as Array<any>; // eslint-disable-line
          // Keep only GitHub Copilot models if vendor is provided
          const copilotOnly = list.filter(m => (m.vendor || '').toLowerCase() === 'copilot');
          const normalized = (copilotOnly.length ? copilotOnly : list).map(m => ({
            id: m.id,
            name: m.name || m.id,
            vendor: m.vendor || 'unknown',
            family: m.family || 'unknown',
            maxTokens: m.maxTokens
          }));
          this.availableModels.set(normalized);
          this.loadingModels.set(false);
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
          } else if (p.testType === 'model') {
            this.testingModel.set(false);
            this.modelResult.set({ success: !!p.success, message: p.message, error: p.error });
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
    this.refreshModels();
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
          defaultProject: this.defaultProject(),
          selectedModel: this.selectedModel()
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

  refreshModels(): void {
    this.loadingModels.set(true);
    this.availableModels.set([]);
    this.bus.postMessage({ type: 'loadAvailableModels' });
  }

  testModel(): void {
    if (!this.selectedModel()) { return; }
    this.testingModel.set(true);
    this.modelResult.set(null);
    this.bus.postMessage({ type: 'testConnection', payload: { testType: 'model', modelName: this.selectedModel() } });
  }

  onModelChange(evt: Event): void {
    const value = (evt?.target as any)?.value ?? ''; // eslint-disable-line @typescript-eslint/no-explicit-any
    this.selectedModel.set(value);
    this.saveSelectedModel();
  }

  private saveSelectedModel(): void {
    // Save only the model selection to persist immediately on change
    this.bus.postMessage({
      type: 'saveConfig',
      payload: {
        config: {
          selectedModel: this.selectedModel()
        }
      }
    });
  }

  // Whether a model is currently selected (non-empty)
  hasValidModel(): boolean {
    const id = this.selectedModel();
    if (!id) { return false; }
    const list = this.availableModels();
    return list.some(m => m.id === id);
  }
}


