import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { MessageService } from '../../../core/services/message.service';
import { 
  AppButtonComponent,
  AppAlertComponent
} from '@shared/components';
import { AzureDevOpsConfigComponent, AzureDevOpsConfig } from './azure-devops-config.component';
import { LanguageModelConfigComponent, LanguageModelConfig } from './language-model-config.component';

// Import Helm Dialog components
import { 
  HlmDialog,
  HlmDialogClose,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogOverlay,
  HlmDialogTitle,
  HlmDialogService
} from '@spartan-ng/helm/dialog';

// Import Helm Tabs components
import {
  HlmTabs,
  HlmTabsList,
  HlmTabsTrigger,
  HlmTabsContent
} from '@spartan-ng/helm/tabs';

export interface SettingsData {
  azureDevOps: AzureDevOpsConfig;
  languageModel: LanguageModelConfig;
  processing: {
    batchSize: number;
    analysisTimeout: number;
    fileSizeLimit: number;
  };
  features: {
    enableTelemetry: boolean;
    enableAdvancedAnalysis: boolean;
    enableAutoReview: boolean;
    enableCodeSuggestions: boolean;
    enableSecurityAnalysis: boolean;
    enablePerformanceAnalysis: boolean;
  };
  ui: {
    theme: string;
    language: string;
    compactMode: boolean;
    showLineNumbers: boolean;
    syntaxHighlighting: boolean;
  };
  notifications: {
    level: string;
    soundEnabled: boolean;
    desktopNotifications: boolean;
    emailNotifications: boolean;
  };
}

export interface SettingsExportData {
  version: string;
  timestamp: string;
  settings: SettingsData;
  metadata: {
    extensionVersion: string;
    exportedBy: string;
  };
}

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppAlertComponent,
    AzureDevOpsConfigComponent,
    LanguageModelConfigComponent,
    // Helm Dialog components
    HlmDialog,
    HlmDialogClose,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogOverlay,
    HlmDialogTitle,
    // Helm Tabs components
    HlmTabs,
    HlmTabsList,
    HlmTabsTrigger,
    HlmTabsContent
  ],
  template: `
    <!-- Dialog Trigger -->
    @if (!isOpen()) {
      <app-button
        variant="outline"
        (onClick)="openSettings()"
        [disabled]="isLoading()">
        <span class="codicon codicon-settings-gear mr-2"></span>
        Settings
      </app-button>
    }

    <!-- Settings Dialog -->
    <hlm-dialog [open]="isOpen()">
      <hlm-dialog-overlay />
      <hlm-dialog-content 
        class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        (escapeKeyDown)="closeSettings()">
        
        <!-- Dialog Header -->
        <hlm-dialog-header class="border-b border-[var(--vscode-panel-border)] pb-4">
          <hlm-dialog-title class="text-xl font-semibold text-[var(--vscode-foreground)]">
            <span class="codicon codicon-settings-gear mr-2"></span>
            Extension Settings
          </hlm-dialog-title>
          <hlm-dialog-description class="text-[var(--vscode-descriptionForeground)]">
            Configure Azure DevOps connection, AI models, and extension preferences
          </hlm-dialog-description>
        </hlm-dialog-header>

        <!-- Main Content with Tabs -->
        <div class="flex-1 overflow-hidden py-4">
          <hlm-tabs [value]="activeTab()" (valueChange)="setActiveTab($event)" class="h-full flex flex-col">
            <!-- Tab Navigation -->
            <hlm-tabs-list class="grid grid-cols-5 w-full mb-4 bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-1">
              <hlm-tabs-trigger value="connection" class="flex items-center space-x-2 text-xs">
                <span class="codicon codicon-plug"></span>
                <span>Connection</span>
              </hlm-tabs-trigger>
              <hlm-tabs-trigger value="ai-model" class="flex items-center space-x-2 text-xs">
                <span class="codicon codicon-robot"></span>
                <span>AI Model</span>
              </hlm-tabs-trigger>
              <hlm-tabs-trigger value="processing" class="flex items-center space-x-2 text-xs">
                <span class="codicon codicon-gear"></span>
                <span>Processing</span>
              </hlm-tabs-trigger>
              <hlm-tabs-trigger value="features" class="flex items-center space-x-2 text-xs">
                <span class="codicon codicon-extensions"></span>
                <span>Features</span>
              </hlm-tabs-trigger>
              <hlm-tabs-trigger value="preferences" class="flex items-center space-x-2 text-xs">
                <span class="codicon codicon-preferences-open"></span>
                <span>Preferences</span>
              </hlm-tabs-trigger>
            </hlm-tabs-list>

            <!-- Tab Content -->
            <div class="flex-1 overflow-auto">
              <!-- Status Alerts -->
              @if (alertMessage()) {
                <app-alert 
                  [variant]="alertMessage()!.type === 'success' ? 'default' : 'destructive'" 
                  [title]="alertMessage()!.type === 'success' ? 'Success' : 'Error'"
                  additionalClasses="mb-4">
                  {{ alertMessage()!.message }}
                </app-alert>
              }

              <!-- Azure DevOps Connection Tab -->
              <hlm-tabs-content value="connection" class="space-y-4">
                <app-azure-devops-config
                  [configuration]="settings()?.azureDevOps || null"
                  [isLoading]="isLoading"
                  (save)="onAzureDevOpsConfigSave($event)"
                  (test)="onAzureDevOpsConfigTest($event)"
                  (configurationChange)="onAzureDevOpsConfigChange($event)"
                />
              </hlm-tabs-content>

              <!-- AI Model Configuration Tab -->
              <hlm-tabs-content value="ai-model" class="space-y-4">
                <app-language-model-config
                  [configuration]="settings()?.languageModel || null"
                  [isLoading]="isLoading"
                  (save)="onLanguageModelConfigSave($event)"
                  (test)="onLanguageModelConfigTest($event)"
                  (configurationChange)="onLanguageModelConfigChange($event)"
                />
              </hlm-tabs-content>

              <!-- Processing Settings Tab -->
              <hlm-tabs-content value="processing" class="space-y-4">
                <div class="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-6">
                  <h3 class="text-lg font-medium text-[var(--vscode-foreground)] mb-4">Processing Configuration</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Batch Size -->
                    <div class="space-y-2">
                      <label class="block text-sm font-medium text-[var(--vscode-foreground)]">Batch Size</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        [value]="settings()?.processing?.batchSize || 10"
                        (input)="updateProcessingSetting('batchSize', $event)"
                        class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                               text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                               rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]"
                      />
                      <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                        Number of files to process simultaneously (1-100)
                      </div>
                    </div>

                    <!-- Analysis Timeout -->
                    <div class="space-y-2">
                      <label class="block text-sm font-medium text-[var(--vscode-foreground)]">Analysis Timeout (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        [value]="settings()?.processing?.analysisTimeout || 15"
                        (input)="updateProcessingSetting('analysisTimeout', $event)"
                        class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                               text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                               rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]"
                      />
                      <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                        Maximum time for analysis before timeout
                      </div>
                    </div>

                    <!-- File Size Limit -->
                    <div class="space-y-2">
                      <label class="block text-sm font-medium text-[var(--vscode-foreground)]">File Size Limit (MB)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        [value]="settings()?.processing?.fileSizeLimit || 5"
                        (input)="updateProcessingSetting('fileSizeLimit', $event)"
                        class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                               text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                               rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]"
                      />
                      <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                        Maximum file size to analyze
                      </div>
                    </div>
                  </div>
                </div>
              </hlm-tabs-content>

              <!-- Features Tab -->
              <hlm-tabs-content value="features" class="space-y-4">
                <div class="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-6">
                  <h3 class="text-lg font-medium text-[var(--vscode-foreground)] mb-4">Feature Settings</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Feature Toggles -->
                    @for (feature of featureToggles; track feature.key) {
                      <div class="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          [id]="feature.key"
                          [checked]="getFeatureSetting(feature.key)"
                          (change)="updateFeatureSetting(feature.key, $event)"
                          class="w-4 h-4 text-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] 
                                 border-[var(--vscode-input-border)] rounded focus:ring-[var(--vscode-focusBorder)]"
                        />
                        <div class="flex-1">
                          <label [for]="feature.key" class="text-sm font-medium text-[var(--vscode-foreground)] cursor-pointer">
                            {{ feature.label }}
                          </label>
                          <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                            {{ feature.description }}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </hlm-tabs-content>

              <!-- Preferences Tab -->
              <hlm-tabs-content value="preferences" class="space-y-4">
                <div class="space-y-6">
                  <!-- UI Preferences -->
                  <div class="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-6">
                    <h3 class="text-lg font-medium text-[var(--vscode-foreground)] mb-4">UI Preferences</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <!-- Theme Selection -->
                      <div class="space-y-2">
                        <label class="block text-sm font-medium text-[var(--vscode-foreground)]">Theme</label>
                        <select
                          [value]="settings()?.ui?.theme || 'auto'"
                          (change)="updateUISetting('theme', $event)"
                          class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                                 text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                                 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]">
                          <option value="auto">Auto (Follow VS Code)</option>
                          <option value="light">Light Theme</option>
                          <option value="dark">Dark Theme</option>
                          <option value="high-contrast">High Contrast</option>
                        </select>
                      </div>

                      <!-- Language Selection -->
                      <div class="space-y-2">
                        <label class="block text-sm font-medium text-[var(--vscode-foreground)]">Language</label>
                        <select
                          [value]="settings()?.ui?.language || 'en'"
                          (change)="updateUISetting('language', $event)"
                          class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                                 text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                                 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]">
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                          <option value="ja">Japanese</option>
                          <option value="zh">Chinese</option>
                        </select>
                      </div>

                      <!-- UI Toggles -->
                      @for (uiToggle of uiToggles; track uiToggle.key) {
                        <div class="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            [id]="uiToggle.key"
                            [checked]="getUISetting(uiToggle.key)"
                            (change)="updateUIToggle(uiToggle.key, $event)"
                            class="w-4 h-4 text-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] 
                                   border-[var(--vscode-input-border)] rounded focus:ring-[var(--vscode-focusBorder)]"
                          />
                          <div class="flex-1">
                            <label [for]="uiToggle.key" class="text-sm font-medium text-[var(--vscode-foreground)] cursor-pointer">
                              {{ uiToggle.label }}
                            </label>
                            <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                              {{ uiToggle.description }}
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Notification Preferences -->
                  <div class="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-6">
                    <h3 class="text-lg font-medium text-[var(--vscode-foreground)] mb-4">Notification Preferences</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <!-- Notification Level -->
                      <div class="space-y-2">
                        <label class="block text-sm font-medium text-[var(--vscode-foreground)]">Notification Level</label>
                        <select
                          [value]="settings()?.notifications?.level || 'all'"
                          (change)="updateNotificationSetting('level', $event)"
                          class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                                 text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                                 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]">
                          <option value="all">All Notifications</option>
                          <option value="important">Important Only</option>
                          <option value="errors">Errors Only</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      <!-- Notification Toggles -->
                      @for (notificationToggle of notificationToggles; track notificationToggle.key) {
                        <div class="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            [id]="notificationToggle.key"
                            [checked]="getNotificationSetting(notificationToggle.key)"
                            (change)="updateNotificationToggle(notificationToggle.key, $event)"
                            class="w-4 h-4 text-[var(--vscode-button-background)] bg-[var(--vscode-input-background)] 
                                   border-[var(--vscode-input-border)] rounded focus:ring-[var(--vscode-focusBorder)]"
                          />
                          <div class="flex-1">
                            <label [for]="notificationToggle.key" class="text-sm font-medium text-[var(--vscode-foreground)] cursor-pointer">
                              {{ notificationToggle.label }}
                            </label>
                            <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                              {{ notificationToggle.description }}
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </hlm-tabs-content>
            </div>
          </hlm-tabs>
        </div>

        <!-- Dialog Footer -->
        <hlm-dialog-footer class="border-t border-[var(--vscode-panel-border)] pt-4">
          <div class="flex justify-between items-center w-full">
            <!-- Left side actions -->
            <div class="flex space-x-2">
              <app-button
                variant="outline"
                size="sm"
                [disabled]="isLoading()"
                (onClick)="exportSettings()">
                <span class="codicon codicon-export mr-2"></span>
                Export
              </app-button>
              
              <app-button
                variant="outline"
                size="sm"
                [disabled]="isLoading()"
                (onClick)="importSettings()">
                <span class="codicon codicon-import mr-2"></span>
                Import
              </app-button>
              
              <app-button
                variant="outline"
                size="sm"
                [disabled]="isLoading()"
                (onClick)="resetAllSettings()">
                <span class="codicon codicon-discard mr-2"></span>
                Reset All
              </app-button>
            </div>

            <!-- Right side actions -->
            <div class="flex space-x-2">
              <app-button
                variant="outline"
                [disabled]="isLoading()"
                (onClick)="closeSettings()">
                Cancel
              </app-button>
              
              <app-button
                [disabled]="isLoading() || !hasUnsavedChanges()"
                (onClick)="saveAllSettings()">
                @if (isLoading()) {
                  <span class="codicon codicon-loading animate-spin mr-2"></span>
                  Saving...
                } @else {
                  <span class="codicon codicon-save mr-2"></span>
                  Save Settings
                }
              </app-button>
            </div>
          </div>
        </hlm-dialog-footer>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = signal(false);
  @Input() settings = signal<SettingsData | null>(null);
  @Input() isLoading = signal(false);
  
  @Output() open = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<SettingsData>();
  @Output() export = new EventEmitter<void>();
  @Output() import = new EventEmitter<File>();

  // Injected services
  private messageService = inject(MessageService);
  private dialogService = inject(HlmDialogService);
  private destroy$ = new Subject<void>();

  // State signals
  activeTab = signal('connection');
  alertMessage = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  pendingChanges = signal<Partial<SettingsData>>({});

  // Computed properties
  hasUnsavedChanges = computed(() => {
    const changes = this.pendingChanges();
    return Object.keys(changes).length > 0;
  });

  // Feature toggle definitions
  featureToggles = [
    {
      key: 'enableTelemetry',
      label: 'Enable Telemetry',
      description: 'Send anonymous usage data to help improve the extension'
    },
    {
      key: 'enableAdvancedAnalysis',
      label: 'Enable Advanced Analysis',
      description: 'Use advanced AI models for deeper code analysis'
    },
    {
      key: 'enableAutoReview',
      label: 'Enable Auto Review',
      description: 'Automatically start analysis when PR is selected'
    },
    {
      key: 'enableCodeSuggestions',
      label: 'Enable Code Suggestions',
      description: 'Generate code improvement suggestions'
    },
    {
      key: 'enableSecurityAnalysis',
      label: 'Enable Security Analysis',
      description: 'Scan for potential security issues'
    },
    {
      key: 'enablePerformanceAnalysis',
      label: 'Enable Performance Analysis',
      description: 'Analyze code for performance issues'
    }
  ];

  uiToggles = [
    {
      key: 'compactMode',
      label: 'Compact Mode',
      description: 'Use compact layout to show more content'
    },
    {
      key: 'showLineNumbers',
      label: 'Show Line Numbers',
      description: 'Display line numbers in code views'
    },
    {
      key: 'syntaxHighlighting',
      label: 'Syntax Highlighting',
      description: 'Enable syntax highlighting in code diffs'
    }
  ];

  notificationToggles = [
    {
      key: 'soundEnabled',
      label: 'Sound Enabled',
      description: 'Play sounds for notifications'
    },
    {
      key: 'desktopNotifications',
      label: 'Desktop Notifications',
      description: 'Show desktop notifications for important events'
    },
    {
      key: 'emailNotifications',
      label: 'Email Notifications',
      description: 'Send email notifications for analysis completion'
    }
  ];

  ngOnInit(): void {
    console.log('Settings Modal component initialized');
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Open settings modal
   */
  openSettings(): void {
    this.isOpen.set(true);
    this.open.emit();
    this.clearAlert();
  }

  /**
   * Close settings modal
   */
  closeSettings(): void {
    if (this.hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
        this.discardChanges();
        this.isOpen.set(false);
        this.close.emit();
      }
    } else {
      this.isOpen.set(false);
      this.close.emit();
    }
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
    this.clearAlert();
  }

  /**
   * Handle Azure DevOps config save
   */
  onAzureDevOpsConfigSave(config: AzureDevOpsConfig): void {
    this.updatePendingChanges({ azureDevOps: config });
    this.setAlert('success', 'Azure DevOps configuration updated');
  }

  /**
   * Handle Azure DevOps config test
   */
  onAzureDevOpsConfigTest(config: AzureDevOpsConfig): void {
    console.log('Testing Azure DevOps configuration:', config);
  }

  /**
   * Handle Azure DevOps config change
   */
  onAzureDevOpsConfigChange(config: Partial<AzureDevOpsConfig>): void {
    const currentAzureDevOps = this.pendingChanges().azureDevOps || this.settings()?.azureDevOps || {};
    this.updatePendingChanges({ 
      azureDevOps: { ...currentAzureDevOps, ...config }
    });
  }

  /**
   * Handle Language Model config save
   */
  onLanguageModelConfigSave(config: LanguageModelConfig): void {
    this.updatePendingChanges({ languageModel: config });
    this.setAlert('success', 'Language model configuration updated');
  }

  /**
   * Handle Language Model config test
   */
  onLanguageModelConfigTest(config: LanguageModelConfig): void {
    console.log('Testing Language Model configuration:', config);
  }

  /**
   * Handle Language Model config change
   */
  onLanguageModelConfigChange(config: Partial<LanguageModelConfig>): void {
    const currentLanguageModel = this.pendingChanges().languageModel || this.settings()?.languageModel || {};
    this.updatePendingChanges({ 
      languageModel: { ...currentLanguageModel, ...config }
    });
  }

  /**
   * Update processing setting
   */
  updateProcessingSetting(key: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    const currentProcessing = this.pendingChanges().processing || this.settings()?.processing || {};
    this.updatePendingChanges({
      processing: { ...currentProcessing, [key]: value }
    });
  }

  /**
   * Get feature setting value
   */
  getFeatureSetting(key: string): boolean {
    const pendingFeatures = this.pendingChanges().features;
    const currentFeatures = this.settings()?.features;
    return pendingFeatures?.[key as keyof typeof pendingFeatures] ?? 
           currentFeatures?.[key as keyof typeof currentFeatures] ?? false;
  }

  /**
   * Update feature setting
   */
  updateFeatureSetting(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    const currentFeatures = this.pendingChanges().features || this.settings()?.features || {};
    this.updatePendingChanges({
      features: { ...currentFeatures, [key]: value }
    });
  }

  /**
   * Get UI setting value
   */
  getUISetting(key: string): boolean {
    const pendingUI = this.pendingChanges().ui;
    const currentUI = this.settings()?.ui;
    return pendingUI?.[key as keyof typeof pendingUI] ?? 
           currentUI?.[key as keyof typeof currentUI] ?? false;
  }

  /**
   * Update UI setting
   */
  updateUISetting(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const currentUI = this.pendingChanges().ui || this.settings()?.ui || {};
    this.updatePendingChanges({
      ui: { ...currentUI, [key]: value }
    });
  }

  /**
   * Update UI toggle
   */
  updateUIToggle(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    const currentUI = this.pendingChanges().ui || this.settings()?.ui || {};
    this.updatePendingChanges({
      ui: { ...currentUI, [key]: value }
    });
  }

  /**
   * Get notification setting value
   */
  getNotificationSetting(key: string): boolean {
    const pendingNotifications = this.pendingChanges().notifications;
    const currentNotifications = this.settings()?.notifications;
    return pendingNotifications?.[key as keyof typeof pendingNotifications] ?? 
           currentNotifications?.[key as keyof typeof currentNotifications] ?? false;
  }

  /**
   * Update notification setting
   */
  updateNotificationSetting(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const currentNotifications = this.pendingChanges().notifications || this.settings()?.notifications || {};
    this.updatePendingChanges({
      notifications: { ...currentNotifications, [key]: value }
    });
  }

  /**
   * Update notification toggle
   */
  updateNotificationToggle(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    const currentNotifications = this.pendingChanges().notifications || this.settings()?.notifications || {};
    this.updatePendingChanges({
      notifications: { ...currentNotifications, [key]: value }
    });
  }

  /**
   * Save all settings
   */
  async saveAllSettings(): Promise<void> {
    if (!this.hasUnsavedChanges()) {
      this.setAlert('error', 'No changes to save');
      return;
    }

    try {
      const currentSettings = this.settings() || {} as SettingsData;
      const updatedSettings = this.mergeSettings(currentSettings, this.pendingChanges());
      
      this.save.emit(updatedSettings);
      this.pendingChanges.set({});
      this.setAlert('success', 'Settings saved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      this.setAlert('error', errorMessage);
    }
  }

  /**
   * Export settings
   */
  exportSettings(): void {
    try {
      const currentSettings = this.settings();
      if (!currentSettings) {
        this.setAlert('error', 'No settings to export');
        return;
      }

      const exportData: SettingsExportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        settings: currentSettings,
        metadata: {
          extensionVersion: '0.1.1',
          exportedBy: 'ForgeFlow Extension'
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `forgeflow-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.setAlert('success', 'Settings exported successfully');
      this.export.emit();
    } catch (error) {
      this.setAlert('error', 'Failed to export settings');
    }
  }

  /**
   * Import settings
   */
  importSettings(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const importData = JSON.parse(e.target.result) as SettingsExportData;
            
            // Validate import data
            if (!importData.settings) {
              throw new Error('Invalid settings file format');
            }

            this.settings.set(importData.settings);
            this.pendingChanges.set({});
            this.setAlert('success', 'Settings imported successfully');
            this.import.emit(file);
          } catch (error) {
            this.setAlert('error', 'Failed to import settings: Invalid file format');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  /**
   * Reset all settings to defaults
   */
  resetAllSettings(): void {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      const defaultSettings: SettingsData = {
        azureDevOps: {
          organizationUrl: '',
          personalAccessToken: '',
          defaultProject: ''
        },
        languageModel: {
          selectedModel: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2048
        },
        processing: {
          batchSize: 10,
          analysisTimeout: 15,
          fileSizeLimit: 5
        },
        features: {
          enableTelemetry: false,
          enableAdvancedAnalysis: true,
          enableAutoReview: false,
          enableCodeSuggestions: true,
          enableSecurityAnalysis: true,
          enablePerformanceAnalysis: true
        },
        ui: {
          theme: 'auto',
          language: 'en',
          compactMode: false,
          showLineNumbers: true,
          syntaxHighlighting: true
        },
        notifications: {
          level: 'all',
          soundEnabled: false,
          desktopNotifications: true,
          emailNotifications: false
        }
      };

      this.settings.set(defaultSettings);
      this.pendingChanges.set({});
      this.setAlert('success', 'All settings reset to defaults');
    }
  }

  /**
   * Update pending changes
   */
  private updatePendingChanges(changes: Partial<SettingsData>): void {
    const current = this.pendingChanges();
    this.pendingChanges.set({ ...current, ...changes });
  }

  /**
   * Merge settings with pending changes
   */
  private mergeSettings(current: SettingsData, pending: Partial<SettingsData>): SettingsData {
    return {
      azureDevOps: { ...current.azureDevOps, ...pending.azureDevOps },
      languageModel: { ...current.languageModel, ...pending.languageModel },
      processing: { ...current.processing, ...pending.processing },
      features: { ...current.features, ...pending.features },
      ui: { ...current.ui, ...pending.ui },
      notifications: { ...current.notifications, ...pending.notifications }
    };
  }

  /**
   * Discard pending changes
   */
  private discardChanges(): void {
    this.pendingChanges.set({});
    this.clearAlert();
  }

  /**
   * Set alert message
   */
  private setAlert(type: 'success' | 'error', message: string): void {
    this.alertMessage.set({ type, message });
    
    // Auto-clear success alerts after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (this.alertMessage()?.type === 'success' && this.alertMessage()?.message === message) {
          this.clearAlert();
        }
      }, 3000);
    }
  }

  /**
   * Clear alert message
   */
  private clearAlert(): void {
    this.alertMessage.set(null);
  }
}