import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MessageService } from '../../../core/services/message.service';
import { 
  AppCardComponent, 
  AppInputComponent, 
  AppButtonComponent,
  AppAlertComponent
} from '@shared/components';

export interface AzureDevOpsConfig {
  organizationUrl: string;
  personalAccessToken: string;
  defaultProject?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  details?: {
    organization?: string;
    projects?: string[];
    permissions?: string[];
  };
}

@Component({
  selector: 'app-azure-devops-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppCardComponent,
    AppInputComponent,
    AppButtonComponent,
    AppAlertComponent
  ],
  template: `
    <app-card 
      title="Azure DevOps Connection" 
      subtitle="Configure your Azure DevOps organization connection">
      
      <!-- Connection Status Alert -->
      @if (connectionStatus()) {
        <app-alert 
          [variant]="connectionStatus()!.success ? 'default' : 'destructive'" 
          [title]="connectionStatus()!.success ? 'Connection Successful' : 'Connection Failed'"
          additionalClasses="mb-4">
          {{ connectionStatus()!.message }}
          @if (connectionDetails(); as details) {
            @if (details.organization) {
              <div class="mt-2 text-sm">
                <strong>Organization:</strong> {{ details.organization }}
              </div>
            }
            @if (details.projects && details.projects.length > 0) {
              <div class="mt-1 text-sm">
                <strong>Available Projects:</strong> {{ details.projects.join(', ') }}
              </div>
            }
            @if (details.permissions && details.permissions.length > 0) {
              <div class="mt-1 text-sm">
                <strong>Permissions:</strong> {{ details.permissions.join(', ') }}
              </div>
            }
          }
        </app-alert>
      }

      <!-- Real-time Validation Status -->
      @if (validationStatus()) {
        <app-alert 
          [variant]="validationStatus()!.type === 'success' ? 'default' : 'destructive'" 
          [title]="validationStatus()!.type === 'success' ? 'Validation Success' : 'Validation Error'"
          additionalClasses="mb-4">
          {{ validationStatus()!.message }}
        </app-alert>
      }

      <form [formGroup]="configForm" class="space-y-6">
        <!-- Organization URL Input -->
        <div class="space-y-2">
          <app-input
            label="Organization URL"
            placeholder="https://dev.azure.com/your-organization"
            formControlName="organizationUrl"
            [error]="getFieldError('organizationUrl')"
          />
          
          <!-- URL Format Help -->
          <div class="text-xs text-[var(--vscode-descriptionForeground)] space-y-1">
            <div><strong>Your Azure DevOps organization URL. Example: https://dev.azure.com/mycompany</strong></div>
            <div><strong>Supported formats:</strong></div>
            <div>• https://dev.azure.com/organization-name</div>
            <div>• https://organization-name.visualstudio.com</div>
          </div>
        </div>

        <!-- Personal Access Token Input with Test Button -->
        <div class="space-y-2">
          <div class="flex items-end space-x-2">
            <div class="flex-1">
              <app-input
                label="Personal Access Token"
                type="password"
                placeholder="Enter your PAT"
                formControlName="personalAccessToken"
                [error]="getFieldError('personalAccessToken')"
              />
            </div>
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="!canTestConnection() || testingConnection()"
              (onClick)="testConnection()"
              additionalClasses="mb-4">
              @if (testingConnection()) {
                <span class="codicon codicon-loading animate-spin mr-2"></span>
                Testing...
              } @else {
                <span class="codicon codicon-plug mr-2"></span>
                Test Connection
              }
            </app-button>
          </div>
          
          <!-- PAT Token Requirements Help -->
          <div class="text-xs text-[var(--vscode-descriptionForeground)] space-y-1">
            <div><strong>PAT token with Code (read), Pull Request (read/write), and Project and Team (read) permissions</strong></div>
            <div><strong>Required PAT permissions:</strong></div>
            <div>• Code (read) - Access source code and metadata</div>
            <div>• Pull Request (read & write) - Read and manage pull requests</div>
            <div>• Project and Team (read) - Read project and team information</div>
            <div class="mt-2">
              <a href="https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate" 
                 target="_blank" 
                 class="text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] underline">
                Learn how to create a Personal Access Token
              </a>
            </div>
          </div>
        </div>

        <!-- Default Project Input -->
        <div class="space-y-2">
          <app-input
            label="Default Project (Optional)"
            placeholder="Project name"
            formControlName="defaultProject"
          />
          
          <div class="text-xs text-[var(--vscode-descriptionForeground)]">
            <strong>Leave empty to show all projects, or specify a default project name</strong>
          </div>
          
          @if (availableProjects().length > 0) {
            <div class="text-xs text-[var(--vscode-descriptionForeground)]">
              <div><strong>Available projects:</strong></div>
              <div class="mt-1 flex flex-wrap gap-1">
                @for (project of availableProjects(); track project) {
                  <button
                    type="button"
                    (click)="selectProject(project)"
                    class="px-2 py-1 text-xs bg-[var(--vscode-button-secondaryBackground)] 
                           text-[var(--vscode-button-secondaryForeground)] rounded hover:bg-[var(--vscode-button-secondaryHoverBackground)]">
                    {{ project }}
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Advanced Connection Settings -->
        <details class="space-y-2">
          <summary class="cursor-pointer text-sm font-medium text-[var(--vscode-foreground)] hover:text-[var(--vscode-textLink-foreground)]">
            Advanced Settings
          </summary>
          
          <div class="pl-4 space-y-4 border-l-2 border-[var(--vscode-panel-border)]">
            <!-- Connection Timeout -->
            <div class="space-y-1">
              <app-input
                label="Connection Timeout (seconds)"
                type="number"
                min="5"
                max="120"
                placeholder="30"
                formControlName="connectionTimeout"
              />
              <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                <strong>Maximum time to wait for Azure DevOps API responses</strong>
              </div>
            </div>
            
            <!-- Retry Attempts -->
            <div class="space-y-1">
              <app-input
                label="Retry Attempts"
                type="number"
                min="0"
                max="10"
                placeholder="3"
                formControlName="retryAttempts"
              />
              <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                <strong>Number of times to retry failed API calls</strong>
              </div>
            </div>
            
            <!-- API Version -->
            <div class="space-y-1">
              <app-input
                label="API Version"
                placeholder="7.1-preview.1"
                formControlName="apiVersion"
              />
              <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                <strong>Azure DevOps REST API version to use</strong>
              </div>
            </div>
          </div>
        </details>

        <!-- Action Buttons -->
        <div class="flex justify-between items-center pt-4 border-t border-[var(--vscode-panel-border)]">
          <div class="flex space-x-2">
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="isLoading()"
              (onClick)="clearConfiguration()">
              <span class="codicon codicon-trash mr-2"></span>
              Clear
            </app-button>
            
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="!canTestConnection() || testingConnection()"
              (onClick)="validateConfiguration()">
              @if (validatingConfig()) {
                <span class="codicon codicon-loading animate-spin mr-2"></span>
                Validating...
              } @else {
                <span class="codicon codicon-check mr-2"></span>
                Validate
              }
            </app-button>
          </div>
          
          <div class="flex space-x-2">
            <app-button
              variant="outline"
              type="button"
              [disabled]="!configForm.valid || isLoading()"
              (onClick)="onSave()">
              <span class="codicon codicon-save mr-2"></span>
              Save Configuration
            </app-button>
            
            <app-button
              type="button"
              [disabled]="!canTestConnection() || testingConnection()"
              (onClick)="testFullConnection()">
              @if (testingConnection()) {
                <span class="codicon codicon-loading animate-spin mr-2"></span>
                Testing...
              } @else {
                <span class="codicon codicon-check-all mr-2"></span>
                Test & Save
              }
            </app-button>
          </div>
        </div>
      </form>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AzureDevOpsConfigComponent implements OnInit, OnDestroy {
  @Input() configuration: AzureDevOpsConfig | null = null;
  @Input() isLoading = signal(false);
  
  @Output() save = new EventEmitter<AzureDevOpsConfig>();
  @Output() test = new EventEmitter<AzureDevOpsConfig>();
  @Output() configurationChange = new EventEmitter<Partial<AzureDevOpsConfig>>();

  // Injected services
  private messageService = inject(MessageService);
  private destroy$ = new Subject<void>();

  // Form
  configForm: FormGroup;

  // State signals
  testingConnection = signal(false);
  validatingConfig = signal(false);
  connectionStatus = signal<ConnectionTestResult | null>(null);
  validationStatus = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  availableProjects = signal<string[]>([]);

  // Computed for connection details with null safety
  connectionDetails = computed(() => {
    const status = this.connectionStatus();
    return status?.details || null;
  });

  constructor(private fb: FormBuilder) {
    this.configForm = this.createForm();
    this.setupRealTimeValidation();
  }

  ngOnInit(): void {
    console.log('Azure DevOps Config component initialized');
    if (this.configuration) {
      this.configForm.patchValue(this.configuration);
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Create reactive form with Azure DevOps configuration fields
   */
  private createForm(): FormGroup {
    return this.fb.group({
      organizationUrl: ['', [Validators.required, this.azureDevOpsUrlValidator]],
      personalAccessToken: ['', [Validators.required, Validators.minLength(52)]],
      defaultProject: [''],
      connectionTimeout: [30, [Validators.min(5), Validators.max(120)]],
      retryAttempts: [3, [Validators.min(0), Validators.max(10)]],
      apiVersion: ['7.1-preview.1', Validators.required]
    });
  }

  /**
   * Setup real-time validation for form fields
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
        if (value && this.isValidAzureDevOpsUrl(value)) {
          this.setValidationStatus('success', 'Organization URL format is valid');
        } else if (value) {
          this.setValidationStatus('error', 'Invalid Azure DevOps organization URL format');
        } else {
          this.clearValidationStatus();
        }
        this.emitConfigurationChange();
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
          this.setValidationStatus('error', 'PAT token appears to be too short (minimum 52 characters)');
        } else {
          this.clearValidationStatus();
        }
        this.emitConfigurationChange();
      });

    // Default project validation
    this.configForm.get('defaultProject')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        this.emitConfigurationChange();
      });
  }

  /**
   * Custom validator for Azure DevOps URLs
   */
  private azureDevOpsUrlValidator(control: AbstractControl) {
    const value = control.value;
    if (!value) return null;
    
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') {
        return { invalidProtocol: true };
      }
      
      const isDevAzure = url.hostname === 'dev.azure.com' && url.pathname.split('/').length >= 2;
      const isVisualStudio = url.hostname.endsWith('.visualstudio.com');
      
      if (!isDevAzure && !isVisualStudio) {
        return { invalidDomain: true };
      }
      
      return null;
    } catch {
      return { invalidUrl: true };
    }
  }

  /**
   * Check if URL is a valid Azure DevOps URL
   */
  private isValidAzureDevOpsUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const isDevAzure = urlObj.hostname === 'dev.azure.com' && urlObj.pathname.split('/').length >= 2;
      const isVisualStudio = urlObj.hostname.endsWith('.visualstudio.com');
      return urlObj.protocol === 'https:' && (isDevAzure || isVisualStudio);
    } catch {
      return false;
    }
  }

  /**
   * Check if connection can be tested
   */
  canTestConnection(): boolean {
    const orgUrl = this.configForm.get('organizationUrl')?.value;
    const patToken = this.configForm.get('personalAccessToken')?.value;
    return !!(orgUrl && patToken && this.configForm.get('organizationUrl')?.valid && this.configForm.get('personalAccessToken')?.valid);
  }

  /**
   * Test Azure DevOps connection
   */
  async testConnection(): Promise<void> {
    if (!this.canTestConnection()) {
      this.setValidationStatus('error', 'Please provide valid organization URL and PAT token');
      return;
    }

    this.testingConnection.set(true);
    this.connectionStatus.set(null);
    this.clearValidationStatus();

    try {
      const config = this.getFormValue();
      
      // Use the generic testConnection method from MessageService
      const result = await this.messageService.testConnection({
        organizationUrl: config.organizationUrl,
        personalAccessToken: config.personalAccessToken,
        connectionTimeout: config.connectionTimeout,
        retryAttempts: config.retryAttempts,
        apiVersion: config.apiVersion
      });

      this.connectionStatus.set(result);
      
      if (result.success) {
        this.setValidationStatus('success', 'Azure DevOps connection successful');
        
        // Update available projects if returned
        if (result.details?.projects) {
          this.availableProjects.set(result.details.projects);
        }
      } else {
        this.setValidationStatus('error', result.message || 'Connection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      this.connectionStatus.set({
        success: false,
        message: errorMessage
      });
      this.setValidationStatus('error', `Connection test failed: ${errorMessage}`);
    } finally {
      this.testingConnection.set(false);
    }
  }

  /**
   * Validate configuration without testing connection
   */
  async validateConfiguration(): Promise<void> {
    this.validatingConfig.set(true);
    this.clearValidationStatus();

    try {
      const config = this.getFormValue();
      
      // Validate URL format
      if (!this.isValidAzureDevOpsUrl(config.organizationUrl)) {
        throw new Error('Invalid Azure DevOps organization URL format');
      }

      // Validate PAT token format
      if (config.personalAccessToken.length < 52) {
        throw new Error('Personal Access Token appears to be too short');
      }

      // Validate other fields
      if (config.connectionTimeout < 5 || config.connectionTimeout > 120) {
        throw new Error('Connection timeout must be between 5 and 120 seconds');
      }

      if (config.retryAttempts < 0 || config.retryAttempts > 10) {
        throw new Error('Retry attempts must be between 0 and 10');
      }

      this.setValidationStatus('success', 'Configuration validation passed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      this.setValidationStatus('error', errorMessage);
    } finally {
      this.validatingConfig.set(false);
    }
  }

  /**
   * Test full connection and save if successful
   */
  async testFullConnection(): Promise<void> {
    await this.testConnection();
    
    if (this.connectionStatus()?.success) {
      this.onSave();
    }
  }

  /**
   * Select a project from available projects
   */
  selectProject(projectName: string): void {
    this.configForm.patchValue({ defaultProject: projectName });
    this.emitConfigurationChange();
  }

  /**
   * Clear configuration form
   */
  clearConfiguration(): void {
    if (confirm('Are you sure you want to clear the Azure DevOps configuration?')) {
      this.configForm.reset();
      this.configForm.patchValue({
        connectionTimeout: 30,
        retryAttempts: 3,
        apiVersion: '7.1-preview.1'
      });
      this.connectionStatus.set(null);
      this.availableProjects.set([]);
      this.clearValidationStatus();
      this.emitConfigurationChange();
    }
  }

  /**
   * Save configuration
   */
  onSave(): void {
    if (this.configForm.valid) {
      const config = this.getFormValue();
      console.log('Saving Azure DevOps configuration:', config);
      this.save.emit(config);
    } else {
      this.setValidationStatus('error', 'Please fix validation errors before saving');
      this.markAllFieldsAsTouched();
    }
  }

  /**
   * Get current form value as Azure DevOps config
   */
  private getFormValue(): AzureDevOpsConfig & {
    connectionTimeout: number;
    retryAttempts: number;
    apiVersion: string;
  } {
    return this.configForm.value;
  }

  /**
   * Emit configuration changes for parent component
   */
  private emitConfigurationChange(): void {
    if (this.configForm.valid) {
      this.configurationChange.emit(this.getFormValue());
    }
  }

  /**
   * Set validation status message
   */
  private setValidationStatus(type: 'success' | 'error', message: string): void {
    this.validationStatus.set({ type, message });
  }
  
  /**
   * Clear validation status
   */
  private clearValidationStatus(): void {
    this.validationStatus.set(null);
  }

  /**
   * Get field validation error message
   */
  getFieldError(fieldName: string): string {
    const field = this.configForm.get(fieldName);
    if (field?.invalid && (field.dirty || field.touched)) {
      const errors = field.errors;
      
      if (errors?.['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      
      if (errors?.['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
      }
      
      if (errors?.['min']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['min'].min}`;
      }
      
      if (errors?.['max']) {
        return `${this.getFieldDisplayName(fieldName)} must be at most ${errors['max'].max}`;
      }
      
      if (errors?.['invalidProtocol']) {
        return 'URL must use HTTPS protocol';
      }
      
      if (errors?.['invalidDomain']) {
        return 'URL must be a valid Azure DevOps domain (dev.azure.com or *.visualstudio.com)';
      }
      
      if (errors?.['invalidUrl']) {
        return 'Invalid URL format';
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
      connectionTimeout: 'Connection Timeout',
      retryAttempts: 'Retry Attempts',
      apiVersion: 'API Version'
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