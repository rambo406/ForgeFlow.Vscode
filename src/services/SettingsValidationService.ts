import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import { ValidationResult, SettingsValidationResult } from '../models/AzureDevOpsModels';
import { VALIDATION_PATTERNS, ConfigurationUtils } from '../utils/ConfigurationUtils';
import { LanguageModelService } from './LanguageModelService';

/**
 * Service for validating extension settings with real-time feedback
 */
export class SettingsValidationService {
    private validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
    private validationTimeouts = new Map<string, NodeJS.Timeout>();
    private readonly CACHE_DURATION = 30000; // 30 seconds
    private readonly DEBOUNCE_DELAY = 300; // 300ms

    constructor(
        private languageModelService: LanguageModelService
    ) {}

    /**
     * Validate Azure DevOps organization URL format and accessibility
     */
    async validateOrganizationUrl(url: string, useCache = true): Promise<ValidationResult> {
        if (!url || url.trim().length === 0) {
            return {
                isValid: false,
                error: 'Organization URL is required',
                details: 'Please provide your Azure DevOps organization URL',
                category: 'azureDevOps'
            };
        }

        const sanitized = ConfigurationUtils.sanitizeOrganizationUrl(url);
        const cacheKey = `org-url-${sanitized}`;
        
        // Check cache first
        if (useCache && this.isCacheValid(cacheKey)) {
            return this.validationCache.get(cacheKey)!.result;
        }

        // Format validation
        if (!VALIDATION_PATTERNS.ORGANIZATION_URL.test(sanitized)) {
            const result: ValidationResult = {
                isValid: false,
                error: 'Invalid organization URL format',
                details: 'URL must be in format: https://dev.azure.com/your-organization or https://your-org.visualstudio.com',
                category: 'azureDevOps'
            };
            this.cacheResult(cacheKey, result);
            return result;
        }

        // Network validation
        try {
            const response = await axios.head(sanitized, {
                timeout: 5000,
                maxRedirects: 0,
                validateStatus: (status) => status < 500 // Accept redirects and client errors but not server errors
            });

            const result: ValidationResult = {
                isValid: true,
                details: 'Organization URL is accessible',
                category: 'azureDevOps'
            };
            this.cacheResult(cacheKey, result);
            return result;

        } catch (error) {
            const axiosError = error as AxiosError;
            let result: ValidationResult;

            if (axiosError.code === 'ENOTFOUND') {
                result = {
                    isValid: false,
                    error: 'Organization not found',
                    details: 'The specified Azure DevOps organization could not be found. Please verify the URL.',
                    category: 'azureDevOps'
                };
            } else if (axiosError.code === 'ECONNABORTED') {
                result = {
                    isValid: false,
                    error: 'Connection timeout',
                    details: 'Unable to connect to the organization. Please check your internet connection.',
                    category: 'azureDevOps'
                };
            } else {
                result = {
                    isValid: true, // Assume valid if we can't verify (offline scenario)
                    details: 'URL format is valid (network validation skipped)',
                    category: 'azureDevOps'
                };
            }

            this.cacheResult(cacheKey, result);
            return result;
        }
    }

    /**
     * Validate Personal Access Token with real-time feedback
     */
    async validatePatToken(token: string, organizationUrl: string): Promise<ValidationResult> {
        if (!token || token.trim().length === 0) {
            return {
                isValid: false,
                error: 'PAT token is required',
                details: 'Please provide a valid Azure DevOps Personal Access Token',
                category: 'azureDevOps'
            };
        }

        if (token.length < 52) {
            return {
                isValid: false,
                error: 'Invalid token format',
                details: 'Azure DevOps PAT tokens are typically 52 characters long',
                category: 'azureDevOps'
            };
        }

        const cacheKey = `pat-${token.substring(0, 8)}...`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.validationCache.get(cacheKey)!.result;
        }

        try {
            // The profile API is hosted on a different Azure DevOps service endpoint and
            // can return 404 when called under the organization host (dev.azure.com/<org>).
            // Use the Projects API on the organization host to verify that the PAT can
            // access organization-level resources. A successful 200 indicates a valid token.
            const projectsUrl = `${organizationUrl}/_apis/projects?api-version=7.1-preview.4`;

            const response = await axios.get(projectsUrl, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
                validateStatus: (s) => s < 500 // let 4xx be handled by our logic
            });

            if (response.status === 200 && response.data) {
                const count = Array.isArray(response.data.value) ? response.data.value.length : undefined;
                const result: ValidationResult = {
                    isValid: true,
                    details: `Token validated successfully${count !== undefined ? ` — ${count} projects visible` : ''}`,
                    category: 'azureDevOps'
                };
                this.cacheResult(cacheKey, result);
                return result;
            }

            // Map common 4xx responses to clearer errors
            const axiosError = { response } as AxiosError;
            const mapped = this.handlePatTokenError(axiosError);
            this.cacheResult(cacheKey, mapped);
            return mapped;

        } catch (error) {
            const result = this.handlePatTokenError(error as AxiosError);
            this.cacheResult(cacheKey, result);
            return result;
        }
    }

    /**
     * Validate project existence in the organization
     */
    async validateProject(projectName: string, organizationUrl: string, patToken: string): Promise<ValidationResult> {
        if (!projectName || projectName.trim().length === 0) {
            return {
                isValid: false,
                error: 'Project name is required',
                details: 'Please specify a project name',
                category: 'azureDevOps'
            };
        }

        const cacheKey = `project-${organizationUrl}-${projectName}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.validationCache.get(cacheKey)!.result;
        }

        try {
            const projectUrl = `${organizationUrl}/_apis/projects/${encodeURIComponent(projectName)}?api-version=7.1-preview.4`;
            
            const response = await axios.get(projectUrl, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`:${patToken}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200 && response.data) {
                const result: ValidationResult = {
                    isValid: true,
                    details: `Project '${response.data.name}' found and accessible`,
                    category: 'azureDevOps'
                };
                this.cacheResult(cacheKey, result);
                return result;
            }

            const result: ValidationResult = {
                isValid: false,
                error: 'Project not found',
                details: `Project '${projectName}' could not be found or is not accessible`,
                category: 'azureDevOps'
            };
            this.cacheResult(cacheKey, result);
            return result;

        } catch (error) {
            const axiosError = error as AxiosError;
            let result: ValidationResult;

            if (axiosError.response?.status === 404) {
                result = {
                    isValid: false,
                    error: 'Project not found',
                    details: `Project '${projectName}' does not exist in the organization`,
                    category: 'azureDevOps'
                };
            } else if (axiosError.response?.status === 403) {
                result = {
                    isValid: false,
                    error: 'Access denied',
                    details: `You don't have permission to access project '${projectName}'`,
                    category: 'azureDevOps'
                };
            } else {
                result = {
                    isValid: false,
                    error: 'Validation failed',
                    details: `Unable to validate project: ${axiosError.message}`,
                    category: 'azureDevOps'
                };
            }

            this.cacheResult(cacheKey, result);
            return result;
        }
    }

    /**
     * Validate language model availability
     */
    async validateLanguageModel(modelName: string): Promise<ValidationResult> {
        if (!modelName || modelName.trim().length === 0) {
            return {
                isValid: false,
                error: 'Model name is required',
                details: 'Please select a language model',
                category: 'languageModel'
            };
        }

        const cacheKey = `model-${modelName}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.validationCache.get(cacheKey)!.result;
        }

        try {
            const isAvailable = await this.languageModelService.isModelAvailable(modelName);
            
            const result: ValidationResult = {
                isValid: isAvailable,
                error: isAvailable ? undefined : 'Model not available',
                details: isAvailable 
                    ? `Model '${ConfigurationUtils.getModelDisplayName(modelName)}' is available`
                    : `Model '${modelName}' is not currently available. Please ensure the provider (e.g., GitHub Copilot) is installed and authenticated.`,
                category: 'languageModel'
            };
            
            this.cacheResult(cacheKey, result);
            return result;

        } catch (error) {
            const result: ValidationResult = {
                isValid: false,
                error: 'Model validation failed',
                details: `Unable to validate model availability: ${error}`,
                category: 'languageModel'
            };
            this.cacheResult(cacheKey, result);
            return result;
        }
    }

    /**
     * Validate model parameters within acceptable ranges
     */
    validateModelParameters(modelName: string, parameters: any): ValidationResult {
        // Basic parameter validation - this would be expanded based on specific model requirements
        if (parameters.temperature !== undefined) {
            if (parameters.temperature < 0 || parameters.temperature > 2) {
                return {
                    isValid: false,
                    error: 'Invalid temperature',
                    details: 'Temperature must be between 0 and 2',
                    category: 'languageModel'
                };
            }
        }

        if (parameters.maxTokens !== undefined) {
            if (parameters.maxTokens < 1 || parameters.maxTokens > 4096) {
                return {
                    isValid: false,
                    error: 'Invalid max tokens',
                    details: 'Max tokens must be between 1 and 4096',
                    category: 'languageModel'
                };
            }
        }

        return {
            isValid: true,
            details: 'Model parameters are valid',
            category: 'languageModel'
        };
    }

    /**
     * Validate performance settings
     */
    validatePerformanceSettings(batchSize: number, timeoutSeconds: number): ValidationResult {
        if (batchSize < 1 || batchSize > 100) {
            return {
                isValid: false,
                error: 'Invalid batch size',
                details: 'Batch size must be between 1 and 100',
                category: 'performance'
            };
        }

        if (timeoutSeconds < 5 || timeoutSeconds > 300) {
            return {
                isValid: false,
                error: 'Invalid timeout',
                details: 'Timeout must be between 5 and 300 seconds',
                category: 'performance'
            };
        }

        return {
            isValid: true,
            details: 'Performance settings are valid',
            category: 'performance'
        };
    }

    /**
     * Validate custom instructions length and content
     */
    validateCustomInstructions(instructions: string): ValidationResult {
        if (instructions.length > 10000) {
            return {
                isValid: false,
                error: 'Instructions too long',
                details: `Custom instructions must be less than 10,000 characters (current: ${instructions.length})`,
                category: 'reviewInstructions'
            };
        }

        if (instructions.trim().length === 0) {
            return {
                isValid: false,
                error: 'Instructions required',
                details: 'Please provide custom review instructions',
                category: 'reviewInstructions'
            };
        }

        return {
            isValid: true,
            details: `Instructions are valid (${instructions.length} characters)`,
            category: 'reviewInstructions'
        };
    }

    /**
     * Perform real-time validation with debouncing
     */
    async validateWithDebounce(
        key: string, 
        validationFn: () => Promise<ValidationResult>, 
        delay = this.DEBOUNCE_DELAY
    ): Promise<ValidationResult> {
        return new Promise((resolve) => {
            // Clear existing timeout
            if (this.validationTimeouts.has(key)) {
                clearTimeout(this.validationTimeouts.get(key)!);
            }

            // Set new timeout
            const timeout = setTimeout(async () => {
                const result = await validationFn();
                this.validationTimeouts.delete(key);
                resolve(result);
            }, delay);

            this.validationTimeouts.set(key, timeout);
        });
    }

    /**
     * Handle PAT token validation errors
     */
    private handlePatTokenError(error: AxiosError): ValidationResult {
        if (error.response) {
            const status = error.response.status;
            
            switch (status) {
                case 401:
                    return {
                        isValid: false,
                        error: 'Authentication failed',
                        details: 'Invalid Personal Access Token. Please check your token and ensure it has the correct permissions.',
                        category: 'azureDevOps'
                    };
                case 403:
                    return {
                        isValid: false,
                        error: 'Access denied',
                        details: 'Token does not have sufficient permissions. Ensure your PAT has access to Code (read) and Pull Requests (read & write).',
                        category: 'azureDevOps'
                    };
                default:
                    return {
                        isValid: false,
                        error: `Azure DevOps API error (${status})`,
                        details: error.message || 'Unknown error occurred',
                        category: 'azureDevOps'
                    };
            }
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                isValid: false,
                error: 'Network connection failed',
                details: 'Please check your internet connection and organization URL',
                category: 'azureDevOps'
            };
        }

        if (error.code === 'ECONNABORTED') {
            return {
                isValid: false,
                error: 'Request timeout',
                details: 'The request to Azure DevOps timed out. Please try again.',
                category: 'azureDevOps'
            };
        }

        return {
            isValid: false,
            error: 'Validation failed',
            details: error.message || 'An unexpected error occurred during token validation',
            category: 'azureDevOps'
        };
    }

    /**
     * Check if cached result is still valid
     */
    private isCacheValid(key: string): boolean {
        const cached = this.validationCache.get(key);
        if (!cached) return false;
        
        return Date.now() - cached.timestamp < this.CACHE_DURATION;
    }

    /**
     * Cache validation result
     */
    private cacheResult(key: string, result: ValidationResult): void {
        this.validationCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear validation cache
     */
    clearCache(): void {
        this.validationCache.clear();
        
        // Clear all pending timeouts
        this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
        this.validationTimeouts.clear();
    }

    /**
     * Dispose of the service and clean up resources
     */
    dispose(): void {
        this.clearCache();
    }
}
