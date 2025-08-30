import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ConfigurationData } from '@core/models';
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

        <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Azure DevOps Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium">Azure DevOps Connection</h3>
            
            <app-input
              label="Organization URL"
              placeholder="https://dev.azure.com/your-organization"
              formControlName="organizationUrl"
              [error]="getFieldError('organizationUrl')"
            />
            
            <app-input
              label="Personal Access Token"
              type="password"
              placeholder="Enter your PAT"
              formControlName="personalAccessToken"
              [error]="getFieldError('personalAccessToken')"
            />
            
            <app-input
              label="Default Project (Optional)"
              placeholder="Project name"
              formControlName="defaultProject"
            />
          </div>

          <!-- AI Model Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium">AI Model Configuration</h3>
            
            <app-select
              label="Language Model"
              [options]="modelOptions"
              formControlName="selectedModel"
              [error]="getFieldError('selectedModel')"
            />
            
            <app-input
              label="Custom Instructions (Optional)"
              placeholder="Additional instructions for the AI reviewer"
              formControlName="customInstructions"
            />
          </div>

          <!-- Processing Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium">Processing Settings</h3>
            
            <app-input
              label="Batch Size"
              type="number"
              placeholder="10"
              formControlName="batchSize"
              [error]="getFieldError('batchSize')"
            />
          </div>

          <!-- Feature Flags -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium">Features</h3>
            
            <app-checkbox
              label="Enable Telemetry"
              formControlName="enableTelemetry"
            />
            
            <app-checkbox
              label="Enable Advanced Analysis"
              formControlName="enableAdvancedAnalysis"
            />
            
            <app-checkbox
              label="Enable Auto Review"
              formControlName="enableAutoReview"
            />
          </div>

          <!-- UI Preferences -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium">UI Preferences</h3>
            
            <app-select
              label="Theme"
              [options]="themeOptions"
              formControlName="theme"
            />
            
            <app-checkbox
              label="Compact Mode"
              formControlName="compactMode"
            />
            
            <app-checkbox
              label="Show Line Numbers"
              formControlName="showLineNumbers"
            />
          </div>

          <!-- Notification Settings -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium">Notifications</h3>
            
            <app-select
              label="Notification Level"
              [options]="notificationOptions"
              formControlName="notificationLevel"
            />
            
            <app-checkbox
              label="Sound Enabled"
              formControlName="soundEnabled"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-6 border-t">
            <app-button
              type="submit"
              [disabled]="!configForm.valid || isLoading"
            >
              @if (isLoading) {
                Saving...
              } @else {
                Save Configuration
              }
            </app-button>
            
            <app-button
              variant="outline"
              type="button"
              [disabled]="!configForm.get('organizationUrl')?.value || !configForm.get('personalAccessToken')?.value || isLoading"
              (onClick)="onTestConnection()"
            >
              Test Connection
            </app-button>
          </div>
        </form>
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationViewComponent implements OnInit {
  @Input() configuration: ConfigurationData | null = null;
  @Input() isLoading = false;
  @Input() errors: string[] = [];
  
  @Output() save = new EventEmitter<Partial<ConfigurationData>>();
  @Output() test = new EventEmitter<void>();

  configForm: FormGroup;

  modelOptions: SelectOption[] = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ];

  themeOptions: SelectOption[] = [
    { value: 'auto', label: 'Auto (Follow VS Code)' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];

  notificationOptions: SelectOption[] = [
    { value: 'all', label: 'All Notifications' },
    { value: 'errors', label: 'Errors Only' },
    { value: 'none', label: 'None' }
  ];

  constructor(private fb: FormBuilder) {
    this.configForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.configuration) {
      this.configForm.patchValue(this.configuration);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      organizationUrl: ['', [Validators.required, Validators.pattern(/^https:\/\/.*$/)]],
      personalAccessToken: ['', Validators.required],
      defaultProject: [''],
      selectedModel: ['gpt-4', Validators.required],
      customInstructions: [''],
      batchSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      enableTelemetry: [false],
      enableAdvancedAnalysis: [false],
      enableAutoReview: [false],
      theme: ['auto'],
      compactMode: [false],
      showLineNumbers: [true],
      notificationLevel: ['all'],
      soundEnabled: [false]
    });
  }

  onSubmit(): void {
    if (this.configForm.valid) {
      this.save.emit(this.configForm.value);
    }
  }

  onTestConnection(): void {
    this.test.emit();
  }

  getFieldError(fieldName: string): string {
    const field = this.configForm.get(fieldName);
    if (field?.invalid && (field.dirty || field.touched)) {
      const errors = field.errors;
      if (errors?.['required']) return `${fieldName} is required`;
      if (errors?.['pattern']) return `${fieldName} format is invalid`;
      if (errors?.['min']) return `${fieldName} must be at least ${errors['min'].min}`;
      if (errors?.['max']) return `${fieldName} must be at most ${errors['max'].max}`;
    }
    return '';
  }
}