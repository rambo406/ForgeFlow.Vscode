/**
 * Configuration utility functions and constants
 */

export const CONFIG_KEYS = {
    ORGANIZATION_URL: 'organizationUrl',
    DEFAULT_PROJECT: 'defaultProject',
    SELECTED_MODEL: 'selectedModel',
    CUSTOM_INSTRUCTIONS: 'customInstructions',
    BATCH_SIZE: 'batchSize',
    ENABLE_TELEMETRY: 'enableTelemetry'
} as const;

export const DEFAULT_VALUES = {
    SELECTED_MODEL: 'gpt-4',
    CUSTOM_INSTRUCTIONS: 'Focus on code quality, security vulnerabilities, performance issues, and maintainability. Provide specific suggestions for improvement.',
    BATCH_SIZE: 10,
    ENABLE_TELEMETRY: true
} as const;

export const VALIDATION_PATTERNS = {
    ORGANIZATION_URL: /^https:\/\/dev\.azure\.com\/[^\/]+\/?$/,
    PAT_TOKEN_LENGTH: { min: 52, max: 52 } // Azure DevOps PAT tokens are 52 characters
} as const;

export const SUPPORTED_MODELS = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo', 
    'claude-3-opus',
    'claude-3-sonnet'
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number];

/**
 * Configuration utility functions
 */
export class ConfigurationUtils {
    /**
     * Sanitize organization URL by removing trailing slashes
     */
    static sanitizeOrganizationUrl(url: string): string {
        return url.trim().replace(/\/+$/, '');
    }

    /**
     * Format organization URL for display
     */
    static formatOrganizationUrl(url: string): string {
        const sanitized = this.sanitizeOrganizationUrl(url);
        return sanitized.replace('https://dev.azure.com/', '');
    }

    /**
     * Check if a model is supported
     */
    static isSupportedModel(model: string): model is SupportedModel {
        return SUPPORTED_MODELS.includes(model as SupportedModel);
    }

    /**
     * Get model display name
     */
    static getModelDisplayName(model: string): string {
        const modelNames: Record<string, string> = {
            'gpt-4': 'GPT-4',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'claude-3-opus': 'Claude 3 Opus',
            'claude-3-sonnet': 'Claude 3 Sonnet'
        };
        return modelNames[model] || model;
    }

    /**
     * Validate batch size
     */
    static validateBatchSize(size: number): boolean {
        return Number.isInteger(size) && size >= 1 && size <= 50;
    }

    /**
     * Validate PAT token format (basic check)
     */
    static validatePatTokenFormat(token: string): boolean {
        if (!token) return false;
        
        // Azure DevOps PAT tokens are base64-encoded and typically 52 characters
        const trimmed = token.trim();
        return trimmed.length === VALIDATION_PATTERNS.PAT_TOKEN_LENGTH.min &&
               /^[A-Za-z0-9+/]+=*$/.test(trimmed);
    }

    /**
     * Mask sensitive values for logging
     */
    static maskSensitiveValue(value: string): string {
        if (!value || value.length < 4) return '***';
        return value.substring(0, 4) + '*'.repeat(value.length - 4);
    }
}