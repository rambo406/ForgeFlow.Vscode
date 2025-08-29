import * as vscode from 'vscode';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
    ValidationResult, 
    Profile, 
    AzureDevOpsError, 
    SettingsValidationResult, 
    ConfigurationChange, 
    SettingsConfiguration, 
    ImportOptions 
} from '../models/AzureDevOpsModels';
import { 
    CONFIG_KEYS, 
    DEFAULT_VALUES, 
    VALIDATION_PATTERNS, 
    SUPPORTED_MODELS, 
    ConfigurationUtils,
    SupportedModel 
} from '../utils/ConfigurationUtils';

/**
 * Manages extension configuration and secure storage
 */
export class ConfigurationManager {
    private static readonly PAT_TOKEN_KEY = 'azdo-pr-reviewer.patToken';
    private static readonly EXTENSION_ID = 'azdo-pr-reviewer';

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Get the stored PAT token from secure storage
     */
    async getPatToken(): Promise<string | undefined> {
        try {
            return await this.context.secrets.get(ConfigurationManager.PAT_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to retrieve PAT token:', error);
            return undefined;
        }
    }

    /**
     * Store PAT token securely
     */
    async setPatToken(token: string): Promise<void> {
        try {
            await this.context.secrets.store(ConfigurationManager.PAT_TOKEN_KEY, token);
        } catch (error) {
            console.error('Failed to store PAT token:', error);
            throw new Error('Failed to store PAT token securely');
        }
    }

    /**
     * Clear the stored PAT token
     */
    async clearPatToken(): Promise<void> {
        try {
            await this.context.secrets.delete(ConfigurationManager.PAT_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to clear PAT token:', error);
            throw new Error('Failed to clear PAT token');
        }
    }

    /**
     * Get organization URL from configuration
     */
    getOrganizationUrl(): string | undefined {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        return config.get<string>('organizationUrl');
    }

    /**
     * Get default project from configuration
     */
    getDefaultProject(): string | undefined {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        return config.get<string>('defaultProject');
    }

    /**
     * Get selected language model from configuration
     */
    getSelectedModel(): SupportedModel {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        const model = config.get<string>(CONFIG_KEYS.SELECTED_MODEL, DEFAULT_VALUES.SELECTED_MODEL);
        return ConfigurationUtils.isSupportedModel(model) ? model : DEFAULT_VALUES.SELECTED_MODEL;
    }

    /**
     * Get custom instructions from configuration
     */
    getCustomInstructions(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        return config.get<string>(CONFIG_KEYS.CUSTOM_INSTRUCTIONS, DEFAULT_VALUES.CUSTOM_INSTRUCTIONS);
    }

    /**
     * Get batch size from configuration
     */
    getBatchSize(): number {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        const batchSize = config.get<number>(CONFIG_KEYS.BATCH_SIZE, DEFAULT_VALUES.BATCH_SIZE);
        return ConfigurationUtils.validateBatchSize(batchSize) ? batchSize : DEFAULT_VALUES.BATCH_SIZE;
    }

    /**
     * Get telemetry setting from configuration
     */
    isTelemetryEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        return config.get<boolean>(CONFIG_KEYS.ENABLE_TELEMETRY, DEFAULT_VALUES.ENABLE_TELEMETRY);
    }

    /**
     * Validate PAT token against Azure DevOps API
     */
    async validatePatToken(token: string, organizationUrl?: string): Promise<ValidationResult> {
        if (!token || token.trim().length === 0) {
            return {
                isValid: false,
                error: 'Token is required',
                details: 'Please provide a valid Azure DevOps Personal Access Token'
            };
        }

        const orgUrl = organizationUrl || this.getOrganizationUrl();
        if (!orgUrl) {
            return {
                isValid: false,
                error: 'Organization URL is required',
                details: 'Please configure your Azure DevOps organization URL in settings'
            };
        }

        try {
            // Validate organization URL format
            const urlValidation = this.validateOrganizationUrl(orgUrl);
            if (!urlValidation.isValid) {
                return urlValidation;
            }

            // Test the token by calling the profile API
            const profileUrl = `${orgUrl}/_apis/profile/profiles/me?api-version=7.1-preview.3`;
            
            const response: AxiosResponse<Profile> = await axios.get(profileUrl, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            });

            if (response.status === 200 && response.data) {
                return {
                    isValid: true,
                    details: `Token validated successfully for user: ${response.data.displayName}`
                };
            }

            return {
                isValid: false,
                error: 'Invalid response from Azure DevOps',
                details: 'Received unexpected response format'
            };

        } catch (error) {
            return this.handleValidationError(error as AxiosError);
        }
    }

    /**
     * Validate organization URL format
     */
    private validateOrganizationUrl(url: string): ValidationResult {
        if (!url || url.trim().length === 0) {
            return {
                isValid: false,
                error: 'Organization URL is required',
                details: 'Please provide your Azure DevOps organization URL'
            };
        }

        const sanitized = ConfigurationUtils.sanitizeOrganizationUrl(url);
        if (!VALIDATION_PATTERNS.ORGANIZATION_URL.test(sanitized)) {
            return {
                isValid: false,
                error: 'Invalid organization URL format',
                details: 'URL must be in format: https://dev.azure.com/your-organization'
            };
        }

        return { isValid: true };
    }

    /**
     * Handle validation errors and provide user-friendly messages
     */
    private handleValidationError(error: AxiosError): ValidationResult {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                isValid: false,
                error: 'Network connection failed',
                details: 'Please check your internet connection and organization URL'
            };
        }

        if (error.code === 'ECONNABORTED') {
            return {
                isValid: false,
                error: 'Request timeout',
                details: 'The request to Azure DevOps timed out. Please try again.'
            };
        }

        if (error.response) {
            const status = error.response.status;
            
            switch (status) {
                case 401:
                    return {
                        isValid: false,
                        error: 'Authentication failed',
                        details: 'Invalid Personal Access Token. Please check your token and ensure it has the correct permissions.'
                    };
                case 403:
                    return {
                        isValid: false,
                        error: 'Access denied',
                        details: 'Token does not have sufficient permissions. Ensure your PAT has access to Code (read) and Pull Requests (read & write).'
                    };
                case 404:
                    return {
                        isValid: false,
                        error: 'Organization not found',
                        details: 'The specified Azure DevOps organization could not be found. Please verify the organization URL.'
                    };
                default:
                    const azError = error.response.data as AzureDevOpsError;
                    return {
                        isValid: false,
                        error: `Azure DevOps API error (${status})`,
                        details: azError?.message || error.message || 'Unknown error occurred'
                    };
            }
        }

        return {
            isValid: false,
            error: 'Validation failed',
            details: error.message || 'An unexpected error occurred during token validation'
        };
    }

    /**
     * Check if extension is properly configured
     */
    async isConfigured(): Promise<boolean> {
        const patToken = await this.getPatToken();
        const organizationUrl = this.getOrganizationUrl();
        
        return !!(patToken && organizationUrl);
    }

    /**
     * Validate all configuration settings
     */
    async validateConfiguration(): Promise<ValidationResult> {
        // Check PAT token
        const token = await this.getPatToken();
        if (!token) {
            return {
                isValid: false,
                error: 'PAT token not configured',
                details: 'Please configure your Azure DevOps Personal Access Token'
            };
        }

        // Check organization URL
        const orgUrl = this.getOrganizationUrl();
        if (!orgUrl) {
            return {
                isValid: false,
                error: 'Organization URL not configured',
                details: 'Please configure your Azure DevOps organization URL'
            };
        }

        // Validate organization URL format
        const urlValidation = this.validateOrganizationUrl(orgUrl);
        if (!urlValidation.isValid) {
            return urlValidation;
        }

        // Validate other settings
        const batchSize = this.getBatchSize();
        if (batchSize < 1 || batchSize > 50) {
            return {
                isValid: false,
                error: 'Invalid batch size',
                details: 'Batch size must be between 1 and 50'
            };
        }

        const selectedModel = this.getSelectedModel();
        if (!this.isValidModel(selectedModel)) {
            return {
                isValid: false,
                error: 'Invalid language model',
                details: 'Please select a valid language model from the available options'
            };
        }

        // Validate token against API
        const tokenValidation = await this.validatePatToken(token, orgUrl);
        if (!tokenValidation.isValid) {
            return tokenValidation;
        }

        return { isValid: true, details: 'Configuration is valid' };
    }

    /**
     * Check if the selected model is valid
     */
    private isValidModel(model: string): model is SupportedModel {
        return ConfigurationUtils.isSupportedModel(model);
    }

    /**
     * Set organization URL with validation
     */
    async setOrganizationUrl(url: string): Promise<ValidationResult> {
        const sanitized = ConfigurationUtils.sanitizeOrganizationUrl(url);
        const validation = this.validateOrganizationUrl(sanitized);
        if (!validation.isValid) {
            return validation;
        }

        try {
            const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
            await config.update(CONFIG_KEYS.ORGANIZATION_URL, sanitized, vscode.ConfigurationTarget.Global);
            return { isValid: true, details: 'Organization URL updated successfully' };
        } catch (error) {
            return {
                isValid: false,
                error: 'Failed to update configuration',
                details: `Unable to save organization URL: ${error}`
            };
        }
    }

    /**
     * Set selected model with validation
     */
    async setSelectedModel(model: string): Promise<ValidationResult> {
        if (!this.isValidModel(model)) {
            const supportedModels = SUPPORTED_MODELS.join(', ');
            return {
                isValid: false,
                error: 'Invalid model selection',
                details: `Model '${model}' is not supported. Please choose from: ${supportedModels}`
            };
        }

        try {
            const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
            await config.update(CONFIG_KEYS.SELECTED_MODEL, model, vscode.ConfigurationTarget.Global);
            return { isValid: true, details: `Language model updated to ${ConfigurationUtils.getModelDisplayName(model)}` };
        } catch (error) {
            return {
                isValid: false,
                error: 'Failed to update configuration',
                details: `Unable to save model selection: ${error}`
            };
        }
    }

    /**
     * Migration logic for configuration updates
     */
    async migrateConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        
        // Check if this is a new installation or upgrade
        const currentVersion = this.context.globalState.get<string>('configVersion', '0.0.0');
        const extensionVersion = vscode.extensions.getExtension('forgeflow.azdo-pr-code-reviewer')?.packageJSON.version || '0.1.0';

        if (currentVersion !== extensionVersion) {
            // Perform version-specific migrations
            await this.performMigrations(currentVersion, extensionVersion);
            
            // Update the stored version
            await this.context.globalState.update('configVersion', extensionVersion);
        }
    }

    /**
     * Perform specific migrations based on version
     */
    private async performMigrations(fromVersion: string, toVersion: string): Promise<void> {
        // Migration from 0.0.0 to any version (first install)
        if (fromVersion === '0.0.0') {
            // Set default values if not already set
            const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
            
            if (!config.has('selectedModel')) {
                await config.update('selectedModel', 'gpt-4', vscode.ConfigurationTarget.Global);
            }
            
            if (!config.has('batchSize')) {
                await config.update('batchSize', 10, vscode.ConfigurationTarget.Global);
            }
            
            if (!config.has('enableTelemetry')) {
                await config.update('enableTelemetry', true, vscode.ConfigurationTarget.Global);
            }
        }

        // Future migrations can be added here
        // Example:
        // if (this.compareVersions(fromVersion, '0.2.0') < 0) {
        //     // Migrate from pre-0.2.0 to 0.2.0
        // }
    }

    /**
     * Compare version strings
     */
    private compareVersions(version1: string, version2: string): number {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        
        return 0;
    }

    /**
     * Reset all configuration to defaults
     */
    async resetConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        
        // Clear all settings
        await config.update('organizationUrl', undefined, vscode.ConfigurationTarget.Global);
        await config.update('defaultProject', undefined, vscode.ConfigurationTarget.Global);
        await config.update('selectedModel', 'gpt-4', vscode.ConfigurationTarget.Global);
        await config.update('customInstructions', 'Focus on code quality, security vulnerabilities, performance issues, and maintainability. Provide specific suggestions for improvement.', vscode.ConfigurationTarget.Global);
        await config.update('batchSize', 10, vscode.ConfigurationTarget.Global);
        await config.update('enableTelemetry', true, vscode.ConfigurationTarget.Global);
        
        // Clear PAT token
        await this.clearPatToken();
        
        // Clear version tracking
        await this.context.globalState.update('configVersion', undefined);
    }

    /**
     * Validate all settings with detailed results
     */
    async validateAllSettings(): Promise<SettingsValidationResult> {
        const results: ValidationResult[] = [];
        const errors: string[] = [];
        
        // Validate Azure DevOps settings
        const patToken = await this.getPatToken();
        const orgUrl = this.getOrganizationUrl();
        
        if (!patToken) {
            results.push({
                isValid: false,
                error: 'PAT token not configured',
                details: 'Please configure your Azure DevOps Personal Access Token',
                category: 'azureDevOps'
            });
            errors.push('PAT token missing');
        }
        
        if (!orgUrl) {
            results.push({
                isValid: false,
                error: 'Organization URL not configured', 
                details: 'Please configure your Azure DevOps organization URL',
                category: 'azureDevOps'
            });
            errors.push('Organization URL missing');
        } else {
            const urlValidation = this.validateOrganizationUrl(orgUrl);
            if (!urlValidation.isValid) {
                results.push({
                    ...urlValidation,
                    category: 'azureDevOps'
                });
                errors.push('Invalid organization URL');
            }
        }
        
        // Validate Language Model settings
        const selectedModel = this.getSelectedModel();
        if (!this.isValidModel(selectedModel)) {
            results.push({
                isValid: false,
                error: 'Invalid language model',
                details: `Model '${selectedModel}' is not supported`,
                category: 'languageModel'
            });
            errors.push('Invalid language model');
        }
        
        // Validate Performance settings
        const batchSize = this.getBatchSize();
        if (batchSize < 1 || batchSize > 100) {
            results.push({
                isValid: false,
                error: 'Invalid batch size',
                details: 'Batch size must be between 1 and 100',
                category: 'performance'
            });
            errors.push('Invalid batch size');
        }
        
        // Validate Review Instructions
        const customInstructions = this.getCustomInstructions();
        if (customInstructions.length > 10000) {
            results.push({
                isValid: false,
                error: 'Custom instructions too long',
                details: 'Custom instructions must be less than 10,000 characters',
                category: 'reviewInstructions'
            });
            errors.push('Custom instructions too long');
        }

        return {
            isValid: errors.length === 0,
            results,
            errors,
            summary: errors.length === 0 ? 'All settings are valid' : `${errors.length} validation error(s) found`
        };
    }

    /**
     * Export current settings configuration
     */
    async exportSettings(): Promise<SettingsConfiguration> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        const patToken = await this.getPatToken();
        
        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            azureDevOps: {
                organizationUrl: this.getOrganizationUrl(),
                defaultProject: this.getDefaultProject(),
                hasPatToken: !!patToken
            },
            languageModel: {
                selectedModel: this.getSelectedModel(),
                customInstructions: this.getCustomInstructions()
            },
            performance: {
                batchSize: this.getBatchSize(),
                enableTelemetry: this.isTelemetryEnabled()
            },
            ui: {
                theme: config.get<string>('ui.theme', 'auto'),
                fontSize: config.get<number>('ui.fontSize', 14),
                compactMode: config.get<boolean>('ui.compactMode', false)
            }
        };
    }

    /**
     * Import settings configuration
     */
    async importSettings(settings: SettingsConfiguration, options: ImportOptions = {}): Promise<ValidationResult> {
        try {
            // Validate settings structure
            const validation = this.validateImportedSettings(settings);
            if (!validation.isValid) {
                return validation;
            }

            const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
            
            // Import Azure DevOps settings
            if (settings.azureDevOps && (!options.categories || options.categories.includes('azureDevOps'))) {
                if (settings.azureDevOps.organizationUrl) {
                    await config.update('organizationUrl', settings.azureDevOps.organizationUrl, vscode.ConfigurationTarget.Global);
                }
                if (settings.azureDevOps.defaultProject) {
                    await config.update('defaultProject', settings.azureDevOps.defaultProject, vscode.ConfigurationTarget.Global);
                }
            }

            // Import Language Model settings
            if (settings.languageModel && (!options.categories || options.categories.includes('languageModel'))) {
                if (settings.languageModel.selectedModel) {
                    await config.update('selectedModel', settings.languageModel.selectedModel, vscode.ConfigurationTarget.Global);
                }
                if (settings.languageModel.customInstructions) {
                    await config.update('customInstructions', settings.languageModel.customInstructions, vscode.ConfigurationTarget.Global);
                }
            }

            // Import Performance settings
            if (settings.performance && (!options.categories || options.categories.includes('performance'))) {
                if (settings.performance.batchSize !== undefined) {
                    await config.update('batchSize', settings.performance.batchSize, vscode.ConfigurationTarget.Global);
                }
                if (settings.performance.enableTelemetry !== undefined) {
                    await config.update('enableTelemetry', settings.performance.enableTelemetry, vscode.ConfigurationTarget.Global);
                }
            }

            // Import UI settings
            if (settings.ui && (!options.categories || options.categories.includes('ui'))) {
                if (settings.ui.theme) {
                    await config.update('ui.theme', settings.ui.theme, vscode.ConfigurationTarget.Global);
                }
                if (settings.ui.fontSize !== undefined) {
                    await config.update('ui.fontSize', settings.ui.fontSize, vscode.ConfigurationTarget.Global);
                }
                if (settings.ui.compactMode !== undefined) {
                    await config.update('ui.compactMode', settings.ui.compactMode, vscode.ConfigurationTarget.Global);
                }
            }

            return {
                isValid: true,
                details: 'Settings imported successfully'
            };

        } catch (error) {
            return {
                isValid: false,
                error: 'Import failed',
                details: `Failed to import settings: ${error}`
            };
        }
    }

    /**
     * Validate imported settings structure
     */
    private validateImportedSettings(settings: SettingsConfiguration): ValidationResult {
        if (!settings || typeof settings !== 'object') {
            return {
                isValid: false,
                error: 'Invalid settings format',
                details: 'Settings must be a valid JSON object'
            };
        }

        if (!settings.version) {
            return {
                isValid: false,
                error: 'Missing version',
                details: 'Settings file must include a version number'
            };
        }

        // Validate Azure DevOps settings
        if (settings.azureDevOps) {
            if (settings.azureDevOps.organizationUrl && !VALIDATION_PATTERNS.ORGANIZATION_URL.test(settings.azureDevOps.organizationUrl)) {
                return {
                    isValid: false,
                    error: 'Invalid organization URL in import',
                    details: 'Organization URL must be in correct format'
                };
            }
        }

        // Validate Language Model settings
        if (settings.languageModel) {
            if (settings.languageModel.selectedModel && !this.isValidModel(settings.languageModel.selectedModel)) {
                return {
                    isValid: false,
                    error: 'Invalid model in import',
                    details: 'Selected model is not supported'
                };
            }
        }

        // Validate Performance settings
        if (settings.performance) {
            if (settings.performance.batchSize !== undefined && 
                (settings.performance.batchSize < 1 || settings.performance.batchSize > 100)) {
                return {
                    isValid: false,
                    error: 'Invalid batch size in import',
                    details: 'Batch size must be between 1 and 100'
                };
            }
        }

        return { isValid: true };
    }

    /**
     * Register configuration change event handler
     */
    onConfigurationChanged(callback: (changes: ConfigurationChange[]) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            const changes: ConfigurationChange[] = [];
            
            if (event.affectsConfiguration(`${ConfigurationManager.EXTENSION_ID}.organizationUrl`)) {
                changes.push({
                    key: 'organizationUrl',
                    category: 'azureDevOps',
                    newValue: this.getOrganizationUrl(),
                    timestamp: new Date()
                });
            }
            
            if (event.affectsConfiguration(`${ConfigurationManager.EXTENSION_ID}.selectedModel`)) {
                changes.push({
                    key: 'selectedModel',
                    category: 'languageModel', 
                    newValue: this.getSelectedModel(),
                    timestamp: new Date()
                });
            }
            
            if (event.affectsConfiguration(`${ConfigurationManager.EXTENSION_ID}.batchSize`)) {
                changes.push({
                    key: 'batchSize',
                    category: 'performance',
                    newValue: this.getBatchSize(),
                    timestamp: new Date()
                });
            }
            
            if (event.affectsConfiguration(`${ConfigurationManager.EXTENSION_ID}.enableTelemetry`)) {
                changes.push({
                    key: 'enableTelemetry',
                    category: 'performance',
                    newValue: this.isTelemetryEnabled(),
                    timestamp: new Date()
                });
            }
            
            if (event.affectsConfiguration(`${ConfigurationManager.EXTENSION_ID}.customInstructions`)) {
                changes.push({
                    key: 'customInstructions',
                    category: 'reviewInstructions',
                    newValue: this.getCustomInstructions(),
                    timestamp: new Date()
                });
            }

            if (changes.length > 0) {
                callback(changes);
            }
        });
    }

    /**
     * Reset settings to default values
     */
    async resetSettingsToDefault(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
        
        // Reset to default values
        await config.update('selectedModel', DEFAULT_VALUES.SELECTED_MODEL, vscode.ConfigurationTarget.Global);
        await config.update('customInstructions', DEFAULT_VALUES.CUSTOM_INSTRUCTIONS, vscode.ConfigurationTarget.Global);
        await config.update('batchSize', DEFAULT_VALUES.BATCH_SIZE, vscode.ConfigurationTarget.Global);
        await config.update('enableTelemetry', DEFAULT_VALUES.ENABLE_TELEMETRY, vscode.ConfigurationTarget.Global);
        await config.update('ui.theme', 'auto', vscode.ConfigurationTarget.Global);
        await config.update('ui.fontSize', 14, vscode.ConfigurationTarget.Global);
        await config.update('ui.compactMode', false, vscode.ConfigurationTarget.Global);
    }
}