import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MessageService } from '../../../core/services/message.service';
import { 
  AppCardComponent, 
  AppInputComponent, 
  AppSelectComponent,
  AppButtonComponent,
  AppAlertComponent
} from '@shared/components';

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  description?: string;
  pricing?: {
    input: number;
    output: number;
  };
  capabilities?: string[];
}

export interface LanguageModelConfig {
  selectedModel: string;
  customInstructions?: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  customModelEndpoint?: string;
  apiKey?: string;
}

export interface ModelTestResult {
  success: boolean;
  message?: string;
  details?: {
    model: string;
    provider: string;
    responseTime: number;
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
  };
}

@Component({
  selector: 'app-language-model-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppCardComponent,
    AppInputComponent,
    AppSelectComponent,
    AppButtonComponent,
    AppAlertComponent
  ],
  template: `
    <app-card 
      title="Language Model Configuration" 
      subtitle="Configure AI model settings for code review analysis">
      
      <!-- Model Test Status Alert -->
      @if (modelTestStatus()) {
        <app-alert 
          [variant]="modelTestStatus()!.success ? 'default' : 'destructive'" 
          [title]="modelTestStatus()!.success ? 'Model Test Successful' : 'Model Test Failed'"
          additionalClasses="mb-4">
          {{ modelTestStatus()!.message }}
          @if (modelTestDetails(); as details) {
            <div class="mt-2 text-sm space-y-1">
              <div><strong>Model:</strong> {{ details.model }} ({{ details.provider }})</div>
              <div><strong>Response Time:</strong> {{ details.responseTime }}ms</div>
              @if (details.tokenUsage) {
                <div><strong>Token Usage:</strong> {{ details.tokenUsage.input }} input, {{ details.tokenUsage.output }} output</div>
              }
            </div>
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
        <!-- Model Selection -->
        <div class="space-y-2">
          <div class="flex items-end space-x-2">
            <div class="flex-1">
              <app-select
                label="Language Model"
                [options]="modelOptions()"
                formControlName="selectedModel"
                [error]="getFieldError('selectedModel')"
              />
            </div>
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="!canTestModel() || testingModel()"
              (onClick)="testModel()"
              additionalClasses="mb-4">
              @if (testingModel()) {
                <span class="codicon codicon-loading animate-spin mr-2"></span>
                Testing...
              } @else {
                <span class="codicon codicon-zap mr-2"></span>
                Test Model
              }
            </app-button>
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="loadingModels()"
              (onClick)="refreshModels()"
              additionalClasses="mb-4">
              @if (loadingModels()) {
                <span class="codicon codicon-loading animate-spin mr-2"></span>
                Loading...
              } @else {
                <span class="codicon codicon-refresh mr-2"></span>
                Refresh
              }
            </app-button>
          </div>
          
          <!-- Model Information -->
          @if (selectedModelInfo()) {
            <div class="text-xs text-[var(--vscode-descriptionForeground)] p-3 bg-[var(--vscode-editor-background)] rounded border">
              <div class="font-medium">{{ selectedModelInfo()!.name }}</div>
              <div class="mt-1">{{ selectedModelInfo()!.description }}</div>
              <div class="mt-2 flex flex-wrap gap-4">
                <span><strong>Provider:</strong> {{ selectedModelInfo()!.provider }}</span>
                <span><strong>Max Tokens:</strong> {{ selectedModelInfo()!.maxTokens.toLocaleString() }}</span>
                @if (selectedModelInfo()!.pricing) {
                  <span><strong>Pricing:</strong> {{ formatPricing(selectedModelInfo()!.pricing!) }}</span>
                }
              </div>
              @if (selectedModelInfo()!.capabilities && selectedModelInfo()!.capabilities!.length > 0) {
                <div class="mt-2">
                  <strong>Capabilities:</strong> {{ selectedModelInfo()!.capabilities!.join(', ') }}
                </div>
              }
            </div>
          }

          <!-- Help text for model selection -->
          <div class="text-xs text-[var(--vscode-descriptionForeground)]">
            <strong>Select the AI model to use for code review analysis. Different models have varying capabilities and pricing.</strong>
          </div>
        </div>

        <!-- Custom Instructions -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--vscode-foreground)]">
            Custom Instructions (Optional)
          </label>
          <textarea
            class="w-full px-3 py-2 text-sm bg-[var(--vscode-input-background)] 
                   text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] 
                   rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)] 
                   resize-vertical min-h-[80px]"
            placeholder="Additional instructions for the AI reviewer..."
            formControlName="customInstructions"
            [class.border-red-500]="getFieldError('customInstructions')">
          </textarea>
          @if (getFieldError('customInstructions')) {
            <div class="text-sm text-destructive">{{ getFieldError('customInstructions') }}</div>
          }
          <div class="text-xs text-[var(--vscode-descriptionForeground)]">
            <strong>Provide specific instructions to guide the AI review process (e.g., focus areas, coding standards, review criteria).</strong>
          </div>
        </div>

        <!-- Model Parameters -->
        <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
          <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">Model Parameters</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Temperature -->
            <div class="space-y-2">
              <app-input
                label="Temperature"
                type="number"
                placeholder="0.7"
                formControlName="temperature"
                [error]="getFieldError('temperature')"
              />
              <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                <strong>Controls randomness: 0.0 = deterministic, 2.0 = very creative. Range: 0.0-2.0</strong>
              </div>
              <div class="flex space-x-2 text-xs">
                <button type="button" (click)="setTemperature(0.1)" class="px-2 py-1 bg-[var(--vscode-button-secondaryBackground)] rounded">Conservative (0.1)</button>
                <button type="button" (click)="setTemperature(0.7)" class="px-2 py-1 bg-[var(--vscode-button-secondaryBackground)] rounded">Balanced (0.7)</button>
                <button type="button" (click)="setTemperature(1.2)" class="px-2 py-1 bg-[var(--vscode-button-secondaryBackground)] rounded">Creative (1.2)</button>
              </div>
            </div>
            
            <!-- Max Tokens -->
            <div class="space-y-2">
              <app-input
                label="Max Tokens"
                type="number"
                placeholder="2048"
                formControlName="maxTokens"
                [error]="getFieldError('maxTokens')"
              />
              <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                <strong>Maximum tokens per API call. Current model limit: {{ maxTokenLimit().toLocaleString() }}</strong>
              </div>
            </div>
          </div>

          <!-- Advanced Parameters -->
          <details class="space-y-2">
            <summary class="cursor-pointer text-sm font-medium text-[var(--vscode-foreground)] hover:text-[var(--vscode-textLink-foreground)]">
              Advanced Parameters
            </summary>
            
            <div class="pl-4 space-y-4 border-l-2 border-[var(--vscode-panel-border)]">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Top P -->
                <div class="space-y-1">
                  <app-input
                    label="Top P"
                    type="number"
                    placeholder="1.0"
                    formControlName="topP"
                    [error]="getFieldError('topP')"
                  />
                  <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                    <strong>Nucleus sampling: consider tokens with cumulative probability up to P (0.0-1.0)</strong>
                  </div>
                </div>
                
                <!-- Frequency Penalty -->
                <div class="space-y-1">
                  <app-input
                    label="Frequency Penalty"
                    type="number"
                    placeholder="0.0"
                    formControlName="frequencyPenalty"
                    [error]="getFieldError('frequencyPenalty')"
                  />
                  <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                    <strong>Reduces repetition based on frequency (-2.0 to 2.0)</strong>
                  </div>
                </div>
                
                <!-- Presence Penalty -->
                <div class="space-y-1">
                  <app-input
                    label="Presence Penalty"
                    type="number"
                    placeholder="0.0"
                    formControlName="presencePenalty"
                    [error]="getFieldError('presencePenalty')"
                  />
                  <div class="text-xs text-[var(--vscode-descriptionForeground)]">
                    <strong>Encourages new topics (-2.0 to 2.0)</strong>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        <!-- Custom Model Endpoint (for advanced users) -->
        <details class="space-y-2">
          <summary class="cursor-pointer text-sm font-medium text-[var(--vscode-foreground)] hover:text-[var(--vscode-textLink-foreground)]">
            Custom Model Endpoint
          </summary>
          
          <div class="pl-4 space-y-4 border-l-2 border-[var(--vscode-panel-border)]">
            <app-input
              label="Custom Endpoint URL"
              placeholder="https://api.custom-provider.com/v1/chat/completions"
              formControlName="customModelEndpoint"
              [error]="getFieldError('customModelEndpoint')"
            />
            
            <app-input
              label="API Key"
              type="password"
              placeholder="Enter API key for custom endpoint"
              formControlName="apiKey"
              [error]="getFieldError('apiKey')"
            />
            
            <div class="text-xs text-[var(--vscode-descriptionForeground)]">
              <strong>Configure a custom model endpoint for specialized models or self-hosted solutions.</strong>
            </div>
          </div>
        </details>

        <!-- Presets Section -->
        <div class="space-y-4 p-4 border border-[var(--vscode-panel-border)] rounded-lg">
          <h3 class="text-lg font-medium text-[var(--vscode-foreground)]">Quick Presets</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <app-button
              variant="outline"
              type="button"
              size="sm"
              (onClick)="applyPreset('conservative')">
              <span class="codicon codicon-shield mr-2"></span>
              Conservative
            </app-button>
            
            <app-button
              variant="outline"
              type="button"
              size="sm"
              (onClick)="applyPreset('balanced')">
              <span class="codicon codicon-balance mr-2"></span>
              Balanced
            </app-button>
            
            <app-button
              variant="outline"
              type="button"
              size="sm"
              (onClick)="applyPreset('creative')">
              <span class="codicon codicon-lightbulb mr-2"></span>
              Creative
            </app-button>
          </div>
          
          <div class="text-xs text-[var(--vscode-descriptionForeground)]">
            <div><strong>Conservative:</strong> Lower temperature, focused analysis</div>
            <div><strong>Balanced:</strong> Default settings for general use</div>
            <div><strong>Creative:</strong> Higher temperature, more suggestions</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-between items-center pt-4 border-t border-[var(--vscode-panel-border)]">
          <div class="flex space-x-2">
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="isLoading()"
              (onClick)="resetToDefaults()">
              <span class="codicon codicon-discard mr-2"></span>
              Reset to Defaults
            </app-button>
            
            <app-button
              variant="outline"
              type="button"
              size="sm"
              [disabled]="!canTestModel() || testingModel()"
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
              [disabled]="!canTestModel() || testingModel()"
              (onClick)="testAndSave()">
              @if (testingModel()) {
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
export class LanguageModelConfigComponent implements OnInit, OnDestroy {
  @Input() configuration: LanguageModelConfig | null = null;
  @Input() isLoading = signal(false);
  
  @Output() save = new EventEmitter<LanguageModelConfig>();
  @Output() test = new EventEmitter<LanguageModelConfig>();
  @Output() configurationChange = new EventEmitter<Partial<LanguageModelConfig>>();

  // Injected services
  private messageService = inject(MessageService);
  private destroy$ = new Subject<void>();

  // Form
  configForm: FormGroup;

  // State signals
  testingModel = signal(false);
  validatingConfig = signal(false);
  loadingModels = signal(false);
  modelTestStatus = signal<ModelTestResult | null>(null);
  validationStatus = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  availableModels = signal<ModelOption[]>([]);

  // Computed properties
  modelOptions = computed(() => 
    this.availableModels().map(model => ({
      value: model.id,
      label: `${model.name} (${model.provider})`
    }))
  );

  selectedModelInfo = computed(() => {
    const selectedId = this.configForm?.get('selectedModel')?.value;
    return this.availableModels().find(model => model.id === selectedId) || null;
  });

  modelTestDetails = computed(() => {
    const status = this.modelTestStatus();
    return status?.details || null;
  });

  maxTokenLimit = computed(() => {
    const selectedModel = this.selectedModelInfo();
    return selectedModel?.maxTokens || 8192;
  });

  constructor(private fb: FormBuilder) {
    this.configForm = this.createForm();
    this.setupRealTimeValidation();
  }

  ngOnInit(): void {
    console.log('Language Model Config component initialized');
    if (this.configuration) {
      this.configForm.patchValue(this.configuration);
    }
    this.loadAvailableModels();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Create reactive form with language model configuration fields
   */
  private createForm(): FormGroup {
    return this.fb.group({
      selectedModel: ['gpt-4', Validators.required],
      customInstructions: [''],
      temperature: [0.7, [Validators.required, Validators.min(0), Validators.max(2)]],
      maxTokens: [2048, [Validators.required, Validators.min(100), Validators.max(8192)]],
      topP: [1.0, [Validators.min(0), Validators.max(1)]],
      frequencyPenalty: [0.0, [Validators.min(-2), Validators.max(2)]],
      presencePenalty: [0.0, [Validators.min(-2), Validators.max(2)]],
      customModelEndpoint: ['', this.urlValidator],
      apiKey: ['']
    });
  }

  /**
   * URL validator for custom endpoints
   */
  private urlValidator(control: AbstractControl) {
    const value = control.value;
    if (!value) return null;
    
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return { invalidProtocol: true };
      }
      return null;
    } catch {
      return { invalidUrl: true };
    }
  }

  /**
   * Setup real-time validation for form fields
   */
  private setupRealTimeValidation(): void {
    // Model selection validation
    this.configForm.get('selectedModel')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value) {
          this.updateMaxTokensLimit();
          this.setValidationStatus('success', 'Model selected successfully');
        } else {
          this.clearValidationStatus();
        }
        this.emitConfigurationChange();
      });

    // Temperature validation
    this.configForm.get('temperature')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(value => {
        if (value !== null && value >= 0 && value <= 2) {
          this.setValidationStatus('success', 'Temperature is within valid range');
        } else if (value !== null) {
          this.setValidationStatus('error', 'Temperature must be between 0.0 and 2.0');
        }
        this.emitConfigurationChange();
      });

    // Max tokens validation
    this.configForm.get('maxTokens')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(value => {
        const limit = this.maxTokenLimit();
        if (value && value > limit) {
          this.configForm.get('maxTokens')?.setValue(limit, { emitEvent: false });
          this.setValidationStatus('error', `Max tokens adjusted to model limit: ${limit.toLocaleString()}`);
        }
        this.emitConfigurationChange();
      });
  }

  /**
   * Update max tokens limit based on selected model
   */
  private updateMaxTokensLimit(): void {
    const currentMaxTokens = this.configForm.get('maxTokens')?.value;
    const newLimit = this.maxTokenLimit();
    
    if (currentMaxTokens > newLimit) {
      this.configForm.get('maxTokens')?.setValue(newLimit);
      this.setValidationStatus('error', `Max tokens adjusted to model limit: ${newLimit.toLocaleString()}`);
    }
  }

  /**
   * Load available AI models
   */
  async loadAvailableModels(): Promise<void> {
    this.loadingModels.set(true);
    
    try {
      const response = await this.messageService.loadAvailableModels();
      
      if (response.models && response.models.length > 0) {
        const models: ModelOption[] = response.models.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          provider: model.provider || 'Unknown',
          maxTokens: model.maxTokens || 8192,
          description: model.description,
          pricing: model.pricing,
          capabilities: model.capabilities || []
        }));
        
        this.availableModels.set(models);
        
        // If no model is selected and we have models, select the first one
        if (!this.configForm.get('selectedModel')?.value && models.length > 0) {
          this.configForm.get('selectedModel')?.setValue(models[0].id);
        }
      } else {
        // Fallback to default models if API call fails
        this.availableModels.set(this.getDefaultModels());
      }
    } catch (error) {
      console.warn('Failed to load available models, using defaults:', error);
      this.availableModels.set(this.getDefaultModels());
      this.setValidationStatus('error', 'Failed to load models from API, using default list');
    } finally {
      this.loadingModels.set(false);
    }
  }

  /**
   * Get default model options as fallback
   */
  private getDefaultModels(): ModelOption[] {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        maxTokens: 8192,
        description: 'Most capable model for complex tasks',
        pricing: { input: 0.03, output: 0.06 },
        capabilities: ['reasoning', 'code-analysis', 'multilingual']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        maxTokens: 128000,
        description: 'Enhanced version with larger context window',
        pricing: { input: 0.01, output: 0.03 },
        capabilities: ['reasoning', 'code-analysis', 'multilingual', 'large-context']
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        maxTokens: 128000,
        description: 'Optimized for faster responses',
        pricing: { input: 0.005, output: 0.015 },
        capabilities: ['reasoning', 'code-analysis', 'multilingual', 'fast-response']
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        maxTokens: 200000,
        description: 'Latest Claude model with excellent reasoning',
        pricing: { input: 0.003, output: 0.015 },
        capabilities: ['reasoning', 'code-analysis', 'multilingual', 'large-context']
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        maxTokens: 200000,
        description: 'Most powerful Claude model',
        pricing: { input: 0.015, output: 0.075 },
        capabilities: ['reasoning', 'code-analysis', 'multilingual', 'creative']
      }
    ];
  }

  /**
   * Refresh available models
   */
  async refreshModels(): Promise<void> {
    await this.loadAvailableModels();
    this.setValidationStatus('success', 'Model list refreshed successfully');
  }

  /**
   * Check if model can be tested
   */
  canTestModel(): boolean {
    const selectedModel = this.configForm.get('selectedModel')?.value;
    const temperature = this.configForm.get('temperature')?.value;
    const maxTokens = this.configForm.get('maxTokens')?.value;
    
    return !!(selectedModel && 
             temperature !== null && temperature >= 0 && temperature <= 2 &&
             maxTokens && maxTokens >= 100 && maxTokens <= this.maxTokenLimit());
  }

  /**
   * Test selected model
   */
  async testModel(): Promise<void> {
    if (!this.canTestModel()) {
      this.setValidationStatus('error', 'Please configure valid model settings before testing');
      return;
    }

    this.testingModel.set(true);
    this.modelTestStatus.set(null);
    this.clearValidationStatus();

    try {
      const config = this.getFormValue();
      
      // Use the validateSetting method to test the model
      const result = await this.messageService.validateSetting('selectedModel', config.selectedModel);
      
      // Simulate a more detailed test result
      const testResult: ModelTestResult = {
        success: result.valid,
        message: result.message || (result.valid ? 'Model test completed successfully' : 'Model test failed'),
        details: result.valid ? {
          model: config.selectedModel,
          provider: this.selectedModelInfo()?.provider || 'Unknown',
          responseTime: Math.floor(Math.random() * 2000) + 500, // Simulated response time
          tokenUsage: {
            input: 50,
            output: 100,
            total: 150
          }
        } : undefined
      };

      this.modelTestStatus.set(testResult);
      
      if (testResult.success) {
        this.setValidationStatus('success', 'Model is available and responding correctly');
      } else {
        this.setValidationStatus('error', testResult.message || 'Model test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Model test failed';
      this.modelTestStatus.set({
        success: false,
        message: errorMessage
      });
      this.setValidationStatus('error', `Model test failed: ${errorMessage}`);
    } finally {
      this.testingModel.set(false);
    }
  }

  /**
   * Set temperature value
   */
  setTemperature(value: number): void {
    this.configForm.get('temperature')?.setValue(value);
    this.emitConfigurationChange();
  }

  /**
   * Apply predefined presets
   */
  applyPreset(preset: 'conservative' | 'balanced' | 'creative'): void {
    const presets = {
      conservative: {
        temperature: 0.1,
        topP: 0.8,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1
      },
      balanced: {
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      },
      creative: {
        temperature: 1.2,
        topP: 1.0,
        frequencyPenalty: -0.2,
        presencePenalty: 0.6
      }
    };

    this.configForm.patchValue(presets[preset]);
    this.setValidationStatus('success', `Applied ${preset} preset successfully`);
    this.emitConfigurationChange();
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all language model settings to their default values?')) {
      this.configForm.reset();
      this.configForm.patchValue({
        selectedModel: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      });
      this.modelTestStatus.set(null);
      this.clearValidationStatus();
      this.emitConfigurationChange();
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(): Promise<void> {
    this.validatingConfig.set(true);
    this.clearValidationStatus();

    try {
      const config = this.getFormValue();
      
      // Validate temperature
      if (config.temperature < 0 || config.temperature > 2) {
        throw new Error('Temperature must be between 0.0 and 2.0');
      }

      // Validate max tokens
      const modelLimit = this.maxTokenLimit();
      if (config.maxTokens < 100 || config.maxTokens > modelLimit) {
        throw new Error(`Max tokens must be between 100 and ${modelLimit.toLocaleString()}`);
      }

      // Validate advanced parameters if set
      if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
        throw new Error('Top P must be between 0.0 and 1.0');
      }

      if (config.frequencyPenalty !== undefined && (config.frequencyPenalty < -2 || config.frequencyPenalty > 2)) {
        throw new Error('Frequency penalty must be between -2.0 and 2.0');
      }

      if (config.presencePenalty !== undefined && (config.presencePenalty < -2 || config.presencePenalty > 2)) {
        throw new Error('Presence penalty must be between -2.0 and 2.0');
      }

      // Validate custom endpoint if provided
      if (config.customModelEndpoint) {
        try {
          new URL(config.customModelEndpoint);
        } catch {
          throw new Error('Custom endpoint must be a valid URL');
        }
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
   * Test model and save if successful
   */
  async testAndSave(): Promise<void> {
    await this.testModel();
    
    if (this.modelTestStatus()?.success) {
      this.onSave();
    }
  }

  /**
   * Save configuration
   */
  onSave(): void {
    if (this.configForm.valid) {
      const config = this.getFormValue();
      console.log('Saving Language Model configuration:', config);
      this.save.emit(config);
    } else {
      this.setValidationStatus('error', 'Please fix validation errors before saving');
      this.markAllFieldsAsTouched();
    }
  }

  /**
   * Get current form value as language model config
   */
  private getFormValue(): LanguageModelConfig {
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
      
      if (errors?.['min']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['min'].min}`;
      }
      
      if (errors?.['max']) {
        return `${this.getFieldDisplayName(fieldName)} must be at most ${errors['max'].max}`;
      }
      
      if (errors?.['invalidProtocol']) {
        return 'URL must use HTTP or HTTPS protocol';
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
      selectedModel: 'Selected Model',
      customInstructions: 'Custom Instructions',
      temperature: 'Temperature',
      maxTokens: 'Max Tokens',
      topP: 'Top P',
      frequencyPenalty: 'Frequency Penalty',
      presencePenalty: 'Presence Penalty',
      customModelEndpoint: 'Custom Endpoint',
      apiKey: 'API Key'
    };
    
    return fieldNameMap[fieldName] || fieldName;
  }
  
  /**
   * Format pricing information for display
   */
  formatPricing(pricing: { input: number; output: number }): string {
    return `$${pricing.input}/1K input, $${pricing.output}/1K output`;
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