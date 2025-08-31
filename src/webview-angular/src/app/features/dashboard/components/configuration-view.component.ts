import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfigurationData } from '@core/models';
import { MessageService } from '../../../core/services/message.service';
import { 
  AppCardComponent, 
  AppInputComponent, 
  AppSelectComponent, 
  AppCheckboxComponent, 
  AppButtonComponent,
  AppAlertComponent,
  SelectOption
} from '@shared/components';

@Component({
  selector: 'app-configuration-view',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppCardComponent,
    AppInputComponent,
    AppSelectComponent,
    AppCheckboxComponent,
    AppButtonComponent,
    AppAlertComponent
  ],
  template: `
    <div class="container mx-auto p-6 max-w-4xl">
      <app-card title="Configuration" subtitle="Configure your Azure DevOps connection and AI settings">
        <!-- Validation Errors -->
        @if (errors.length > 0) {
          <app-alert variant="destructive" title="Configuration Errors" additionalClasses="mb-6">
            <ul class="list-disc pl-4">
              @for (error of errors; track error) {
                <li>{{ error }}</li>
              }
            </ul>
          </app-alert>
        }

        <!-- Real-time Validation Status -->
        @if (validationStatus) {
          <app-alert 
            [variant]="validationStatus.type === 'success' ? 'default' : 'destructive'" 
            [title]="validationStatus.type === 'success' ? 'Validation Success' : 'Validation Error'"
            additionalClasses="mb-6">
            {{ validationStatus.message }}
          </app-alert>
        }

        <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="space-y-8">
          <!-- Azure DevOps Settings Section -->
          <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">Azure DevOps Connection</h3>
              <div class="flex items-center space-x-2">
                @if (testResults.organization) {
                  <span class="text-xs px-2 py-1 rounded" 
                        [class.bg-green-100]="testResults.organization.success"
                        [class.text-green-800]="testResults.organization.success"
                        [class.bg-red-100]="!testResults.organization.success"
                        [class.text-red-800]="!testResults.organization.success">
                    {{ testResults.organization.success ? '✓ Connected' : '✗ Failed' }}
                  </span>
                }
              </div>
            </div>
            
              <app-input
              label="Organization URL"
              placeholder="https://dev.azure.com/your-organization"
              formControlName="organizationUrl"
              [error]="getFieldError('organizationUrl')"
              helpText="Your Azure DevOps organization URL. Example: https://dev.azure.com/mycompany"
            />
            
            <div class="flex items-end space-x-2">
              <div class="flex-1">
                <app-input
                  label="Personal Access Token"
                  type="password"
                  placeholder="Enter your PAT"
                  formControlName="personalAccessToken"
                  [error]="getFieldError('personalAccessToken')"
                  helpText="PAT token with Code (read), Pull Request (read/write), and Project and Team (read) permissions"
                />
              </div>
              <app-button
                variant="outline"
                type="button"
                size="sm"
                [disabled]="!configForm.get('organizationUrl')?.value || !configForm.get('personalAccessToken')?.value || testingConnection"
                (onClick)="testOrganizationConnection()"
                additionalClasses="mb-4">
                @if (testingConnection) {
                  Testing...
                } @else {
                  Test
                }
              </app-button>
            </div>
            
            <app-input
              label="Default Project (Optional)"
              placeholder="Project name"
              formControlName="defaultProject"
              helpText="Leave empty to show all projects, or specify a default project name"
            />
          </div>

          <!-- AI Model Settings Section -->
          <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">AI Model Configuration</h3>
              <div class="flex items-center space-x-2">
                @if (testResults.model) {
                  <span class="text-xs px-2 py-1 rounded"
                        [class.bg-green-100]="testResults.model.success"
                        [class.text-green-800]="testResults.model.success"
                        [class.bg-red-100]="!testResults.model.success"
                        [class.text-red-800]="!testResults.model.success">
                    {{ testResults.model.success ? '✓ Available' : '✗ Unavailable' }}
                  </span>
                }
              </div>
            </div>
            
            <div class="flex items-end space-x-2">
              <div class="flex-1">
                <app-select
                  label="Language Model"
                  [options]="modelOptions"
                  formControlName="selectedModel"
                  [error]="getFieldError('selectedModel')"
                />
              </div>
              <app-button
                variant="outline"
                type="button"
                size="sm"
                [disabled]="!configForm.get('selectedModel')?.value || testingModel"
                (onClick)="testModelAvailability()"
                additionalClasses="mb-4">
                @if (testingModel) {
                  Testing...
                } @else {
                  Test Model
                }
              </app-button>
            </div>
            
            <app-input
              label="Custom Instructions (Optional)"
              placeholder="Additional instructions for the AI reviewer"
              formControlName="customInstructions"
              helpText="Custom instructions to guide the AI review process (e.g., focus areas, coding standards)"
            />
            
            <!-- Advanced Model Settings -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-input
                label="Temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                formControlName="temperature"
                helpText="Controls randomness in AI responses (0.0-2.0)"
              />
              
              <app-input
                label="Max Tokens"
                type="number"
                placeholder="2048"
                formControlName="maxTokens"
                helpText="Maximum tokens per API call"
              />
            </div>
          </div>

          <!-- Processing Settings Section -->
          <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
            <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">Processing Settings</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-input
                label="Batch Size"
                type="number"
                min="1"
                max="100"
                placeholder="10"
                formControlName="batchSize"
                [error]="getFieldError('batchSize')"
                helpText="Number of files to process simultaneously (1-100)"
              />
              
              <app-input
                label="Analysis Timeout (minutes)"
                type="number"
                min="1"
                max="60"
                placeholder="15"
                formControlName="analysisTimeout"
                helpText="Maximum time for analysis before timeout"
              />
            </div>
            
              <app-input
              label="File Size Limit (MB)"
              type="number"
              min="1"
              max="50"
              placeholder="5"
              formControlName="fileSizeLimit"
                helpText="Maximum file size to analyze"
            />
          </div>

          <!-- Feature Flags Section -->
          <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
            <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">Features</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-checkbox
                label="Enable Telemetry"
                formControlName="enableTelemetry"
                helpText="Send anonymous usage data to help improve the extension"
              />
              
              <app-checkbox
                label="Enable Advanced Analysis"
                formControlName="enableAdvancedAnalysis"
                helpText="Use advanced AI models for deeper code analysis"
              />
              
              <app-checkbox
                label="Enable Auto Review"
                formControlName="enableAutoReview"
                helpText="Automatically start analysis when PR is selected"
              />
              
              <app-checkbox
                label="Enable Code Suggestions"
                formControlName="enableCodeSuggestions"
                helpText="Generate code improvement suggestions"
              />
              
              <app-checkbox
                label="Enable Security Analysis"
                formControlName="enableSecurityAnalysis"
                helpText="Scan for potential security issues"
              />
              
              <app-checkbox
                label="Enable Performance Analysis"
                formControlName="enablePerformanceAnalysis"
                helpText="Analyze code for performance issues"
              />
            </div>
          </div>

          <!-- UI Preferences Section -->
          <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
            <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">UI Preferences</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-select
                label="Theme"
                [options]="themeOptions"
                formControlName="theme"
              />
              
              <app-select
                label="Language"
                [options]="languageOptions"
                formControlName="language"
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <app-checkbox
                label="Compact Mode"
                formControlName="compactMode"
                helpText="Use compact layout to show more content"
              />
              
              <app-checkbox
                label="Show Line Numbers"
                formControlName="showLineNumbers"
                helpText="Display line numbers in code views"
              />
              
              <app-checkbox
                label="Syntax Highlighting"
                formControlName="syntaxHighlighting"
                helpText="Enable syntax highlighting in code diffs"
              />
            </div>
          </div>

          <!-- Notification Settings Section -->
          <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
            <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">Notifications</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-select
                label="Notification Level"
                [options]="notificationOptions"
                formControlName="notificationLevel"
              />
              
              <app-checkbox
                label="Sound Enabled"
                formControlName="soundEnabled"
                helpText="Play sounds for notifications"
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-checkbox
                label="Desktop Notifications"
                formControlName="desktopNotifications"
                helpText="Show desktop notifications for important events"
              />
              
              <app-checkbox
                label="Email Notifications"
                formControlName="emailNotifications"
                helpText="Send email notifications for analysis completion"
              />
            </div>
          </div>

          <!-- Actions Section -->
          <div class="flex justify-between items-center pt-6 border-t border-[var(--vscode-panel-border)]">
            <div class="flex space-x-3">
              <app-button
                variant="outline"
                type="button"
                [disabled]="isLoading"
                (onClick)="resetToDefaults()">
                Reset to Defaults
              </app-button>
              
              <app-button
                variant="outline"
                type="button"
                [disabled]="isLoading"
                (onClick)="exportConfiguration()">
                Export
              </app-button>
              
              <app-button
                variant="outline"
                type="button"
                [disabled]="isLoading"
                (onClick)="importConfiguration()">
                Import
              </app-button>
            </div>
            
            <div class="flex space-x-3">
              <app-button
                variant="outline"
                type="button"
                [disabled]="!configForm.get('organizationUrl')?.value || !configForm.get('personalAccessToken')?.value || isLoading"
                (onClick)="onTestConnection()">
                @if (testingFullConnection) {
                  Testing Full Connection...
                } @else {
                  Test Full Connection
                }
              </app-button>
              
              <app-button
                type="submit"
                [disabled]="!configForm.valid || isLoading">
                @if (isLoading) {
                  <span class="codicon codicon-loading animate-spin mr-2"></span>
                  Saving...
                } @else {
                  Save Configuration
                }
              </app-button>
            </div>
          </div>
        </form>
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationViewComponent implements OnInit, OnDestroy {
  @Input() configuration: ConfigurationData | null = null;
  @Input() isLoading = false;
  @Input() errors: string[] = [];
  
  @Output() save = new EventEmitter<Partial<ConfigurationData>>();
  @Output() test = new EventEmitter<void>();

  // Injected services
  private messageService = inject(MessageService);
  private destroy$ = new Subject<void>();

  // Form and validation state
  configForm: FormGroup;
  validationStatus: { type: 'success' | 'error'; message: string } | null = null;
  
  // Testing state
  testingConnection = false;
  testingModel = false;
  testingFullConnection = false;
  testResults: {
    organization?: { success: boolean; message?: string };
    model?: { success: boolean; message?: string };
  } = {};

  // Options for dropdowns
  modelOptions: SelectOption[] = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' }
  ];

  themeOptions: SelectOption[] = [
    { value: 'auto', label: 'Auto (Follow VS Code)' },
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'high-contrast', label: 'High Contrast' }
  ];

  languageOptions: SelectOption[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' }
  ];

  notificationOptions: SelectOption[] = [
    { value: 'all', label: 'All Notifications' },
    { value: 'important', label: 'Important Only' },
    { value: 'errors', label: 'Errors Only' },
    { value: 'none', label: 'None' }
  ];

  constructor(private fb: FormBuilder) {
    this.configForm = this.createForm();
    this.setupRealTimeValidation();
  }

  ngOnInit(): void {
    console.log('Configuration view initialized');
    if (this.configuration) {
      this.configForm.patchValue(this.configuration);
    }
    
    // Load available models
    this.loadAvailableModels();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Create reactive form with all configuration fields
   * Matches legacy configuration form structure
   */
  private createForm(): FormGroup {
    return this.fb.group({
      // Azure DevOps settings
      organizationUrl: ['', [Validators.required, this.urlValidator]],
      personalAccessToken: ['', Validators.required],
      defaultProject: [''],
      
      // AI Model settings
      selectedModel: ['gpt-4', Validators.required],
      customInstructions: [''],
      temperature: [0.7, [Validators.min(0), Validators.max(2)]],
      maxTokens: [2048, [Validators.min(1), Validators.max(8192)]],
      
      // Processing settings
      batchSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      analysisTimeout: [15, [Validators.min(1), Validators.max(60)]],
      fileSizeLimit: [5, [Validators.min(1), Validators.max(50)]],
      
      // Feature flags
      enableTelemetry: [false],
      enableAdvancedAnalysis: [true],
      enableAutoReview: [false],
      enableCodeSuggestions: [true],
      enableSecurityAnalysis: [true],
      enablePerformanceAnalysis: [true],
      
      // UI preferences
      theme: ['auto'],
      language: ['en'],
      compactMode: [false],
      showLineNumbers: [true],
      syntaxHighlighting: [true],
      
      // Notification settings
      notificationLevel: ['all'],
      soundEnabled: [false],
      desktopNotifications: [true],
      emailNotifications: [false]
    });
  }
  
  /**
   * Setup real-time validation like legacy implementation
   */
  private setupRealTimeValidation(): void {
    // Organization URL validation
    this.configForm.get('organizationUrl')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value && this.isValidUrl(value)) {
          this.setValidationStatus('success', 'Organization URL format is valid');
        } else if (value) {
          this.setValidationStatus('error', 'Invalid organization URL format');
        } else {
          this.clearValidationStatus();
        }
      });
      
    // PAT token validation
    this.configForm.get('personalAccessToken')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value && value.length >= 52) {
          this.setValidationStatus('success', 'PAT token format appears valid');
        } else if (value && value.length > 0) {
          this.setValidationStatus('error', 'PAT token appears to be too short');
        } else {
          this.clearValidationStatus();
        }
      });
  }
  
  /**
   * URL validator for organization URL
   */
  private urlValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') {
        return { pattern: true };
      }
      if (!url.hostname.includes('dev.azure.com') && !url.hostname.includes('visualstudio.com')) {
        return { pattern: true };
      }
      return null;
    } catch {
      return { pattern: true };
    }
  }
  
  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
  }
  
  /**
   * Set validation status message
   */
  private setValidationStatus(type: 'success' | 'error', message: string): void {
    this.validationStatus = { type, message };
  }
  
  /**
   * Clear validation status
   */
  private clearValidationStatus(): void {
    this.validationStatus = null;
  }
  
  /**
   * Load available AI models
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      const models = await this.messageService.loadAvailableModels();
      if (models.models && models.models.length > 0) {
        this.modelOptions = models.models.map((model: any) => ({
          value: model.id,
          label: model.name
        }));
      }
    } catch (error) {
      console.warn('Failed to load available models:', error);
      // Keep default models if loading fails
    }
  }
  
  /**
   * Test organization connection
   * Replaces legacy testOrganizationConnection functionality
   */
  async testOrganizationConnection(): Promise<void> {
    const orgUrl = this.configForm.get('organizationUrl')?.value;
    const patToken = this.configForm.get('personalAccessToken')?.value;
    
    if (!orgUrl || !patToken) return;
    
    this.testingConnection = true;
    this.testResults.organization = undefined;
    
    try {
      const result = await this.messageService.testConnection({
        organizationUrl: orgUrl,
        personalAccessToken: patToken
      });
      
      this.testResults.organization = {
        success: result.success,
        message: result.message
      };
      
      if (result.success) {
        this.setValidationStatus('success', 'Organization connection successful');
      } else {
        this.setValidationStatus('error', result.message || 'Connection failed');
      }
    } catch (error) {
      this.testResults.organization = {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
      this.setValidationStatus('error', 'Connection test failed');
    } finally {
      this.testingConnection = false;
    }
  }
  
  /**
   * Test model availability
   * New functionality for enhanced configuration
   */
  async testModelAvailability(): Promise<void> {
    const selectedModel = this.configForm.get('selectedModel')?.value;
    
    if (!selectedModel) return;
    
    this.testingModel = true;
    this.testResults.model = undefined;
    
    try {
      // Test if the model is available
      const result = await this.messageService.validateSetting('selectedModel', selectedModel);
      
      this.testResults.model = {
        success: result.valid,
        message: result.message
      };
      
      if (result.valid) {
        this.setValidationStatus('success', 'Model is available');
      } else {
        this.setValidationStatus('error', result.message || 'Model is not available');
      }
    } catch (error) {
      this.testResults.model = {
        success: false,
        message: error instanceof Error ? error.message : 'Model test failed'
      };
      this.setValidationStatus('error', 'Model availability test failed');
    } finally {
      this.testingModel = false;
    }
  }
  
  /**
   * Reset configuration to defaults
   * Replaces legacy resetConfiguration functionality
   */
  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      this.configForm.reset();
      this.configForm.patchValue({
        selectedModel: 'gpt-4',
        batchSize: 10,
        temperature: 0.7,
        maxTokens: 2048,
        analysisTimeout: 15,
        fileSizeLimit: 5,
        enableAdvancedAnalysis: true,
        enableCodeSuggestions: true,
        enableSecurityAnalysis: true,
        enablePerformanceAnalysis: true,
        theme: 'auto',
        language: 'en',
        showLineNumbers: true,
        syntaxHighlighting: true,
        notificationLevel: 'all',
        desktopNotifications: true
      });
      this.clearValidationStatus();
      this.testResults = {};
    }
  }
  
  /**
   * Export configuration
   * Replaces legacy exportSettings functionality
   */
  exportConfiguration(): void {
    const config = this.configForm.value;
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'forgeflow-config.json';
    link.click();
    
    this.setValidationStatus('success', 'Configuration exported successfully');
  }
  
  /**
   * Import configuration
   * Replaces legacy importSettings functionality
   */
  importConfiguration(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const config = JSON.parse(e.target.result);
            this.configForm.patchValue(config);
            this.setValidationStatus('success', 'Configuration imported successfully');
          } catch (error) {
            this.setValidationStatus('error', 'Failed to import configuration: Invalid JSON');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  /**
   * Submit form - replaces legacy saveConfiguration
   */
  onSubmit(): void {
    if (this.configForm.valid) {
      console.log('Saving configuration:', this.configForm.value);
      this.save.emit(this.configForm.value);
    } else {
      this.setValidationStatus('error', 'Please fix validation errors before saving');
      this.markAllFieldsAsTouched();
    }
  }

  /**
   * Test full connection - replaces legacy testConnection
   */
  async onTestConnection(): Promise<void> {
    this.testingFullConnection = true;
    
    try {
      console.log('Testing full connection...');
      this.test.emit();
      
      // The actual test is handled by the parent component/store
      // We just emit the event here
    } catch (error) {
      this.setValidationStatus('error', 'Full connection test failed');
    } finally {
      this.testingFullConnection = false;
    }
  }

  /**
   * Get field validation error message
   * Enhanced from the basic version to handle more error types
   */
  getFieldError(fieldName: string): string {
    const field = this.configForm.get(fieldName);
    if (field?.invalid && (field.dirty || field.touched)) {
      const errors = field.errors;
      
      if (errors?.['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      
      if (errors?.['pattern']) {
        if (fieldName === 'organizationUrl') {
          return 'Organization URL must be a valid HTTPS URL for Azure DevOps';
        }
        return `${this.getFieldDisplayName(fieldName)} format is invalid`;
      }
      
      if (errors?.['min']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['min'].min}`;
      }
      
      if (errors?.['max']) {
        return `${this.getFieldDisplayName(fieldName)} must be at most ${errors['max'].max}`;
      }
      
      if (errors?.['email']) {
        return `${this.getFieldDisplayName(fieldName)} must be a valid email address`;
      }
      
      return `${this.getFieldDisplayName(fieldName)} is invalid`;
    }
    return '';
  }
  
  /**
   * Get user-friendly field display name
   */
  private getFieldDisplayName(fieldName: string): string {
    const fieldNameMap: { [key: string]: string } = {
      organizationUrl: 'Organization URL',
      personalAccessToken: 'Personal Access Token',
      defaultProject: 'Default Project',
      selectedModel: 'Language Model',
      customInstructions: 'Custom Instructions',
      temperature: 'Temperature',
      maxTokens: 'Max Tokens',
      batchSize: 'Batch Size',
      analysisTimeout: 'Analysis Timeout',
      fileSizeLimit: 'File Size Limit',
      enableTelemetry: 'Enable Telemetry',
      enableAdvancedAnalysis: 'Enable Advanced Analysis',
      enableAutoReview: 'Enable Auto Review',
      enableCodeSuggestions: 'Enable Code Suggestions',
      enableSecurityAnalysis: 'Enable Security Analysis',
      enablePerformanceAnalysis: 'Enable Performance Analysis',
      theme: 'Theme',
      language: 'Language',
      compactMode: 'Compact Mode',
      showLineNumbers: 'Show Line Numbers',
      syntaxHighlighting: 'Syntax Highlighting',
      notificationLevel: 'Notification Level',
      soundEnabled: 'Sound Enabled',
      desktopNotifications: 'Desktop Notifications',
      emailNotifications: 'Email Notifications'
    };
    
    return fieldNameMap[fieldName] || fieldName;
  }
  
  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.configForm.controls).forEach(key => {
      this.configForm.get(key)?.markAsTouched();
    });
  }
}