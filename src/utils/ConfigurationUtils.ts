/**
 * Configuration utility functions and constants
 */

export const CONFIG_KEYS = {
    ORGANIZATION_URL: 'organizationUrl',
    DEFAULT_PROJECT: 'defaultProject',
    SELECTED_MODEL: 'selectedModel',
    CUSTOM_INSTRUCTIONS: 'customInstructions',
    INLINE_COMMENT_SYSTEM_PROMPT: 'inlineCommentSystemPrompt',
    BATCH_SIZE: 'batchSize',
    ENABLE_TELEMETRY: 'enableTelemetry'
} as const;

export const DEFAULT_VALUES = {
    // Default model preference; actual resolution is dynamic via VS Code LM API
    SELECTED_MODEL: 'gpt-4',
    CUSTOM_INSTRUCTIONS: 'Focus on code quality, security vulnerabilities, performance issues, and maintainability. Provide specific suggestions for improvement.',
    INLINE_COMMENT_SYSTEM_PROMPT: 'You are an expert code reviewer. Draft a concise, professional review comment for the given code location. Focus on clarity, correctness, maintainability, testing, performance, or security as appropriate. Offer a specific improvement or suggestion when applicable. Output only the comment text suitable for a PR review. No JSON. No code fences.',
    BATCH_SIZE: 10,
    ENABLE_TELEMETRY: true
} as const;

export const VALIDATION_PATTERNS = {
    ORGANIZATION_URL: /^https:\/\/dev\.azure\.com\/[^\/]+\/?$/,
    PAT_TOKEN_LENGTH: { min: 52, max: 52 } // Azure DevOps PAT tokens are 52 characters
} as const;

<<<<<<< HEAD
export const SUPPORTED_MODELS = [
    // GitHub Copilot (OpenAI) families
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'o3-mini',
    'o4-mini',
    // Legacy OpenAI names
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo', 
    // Anthropic via Copilot or direct
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3.5-sonnet'
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number];

=======
>>>>>>> 8a6ed91dc61cc80c455d4c05f74d458aee5842a1
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
     * Get model display name
     */
    static getModelDisplayName(model: string): string {
        const modelNames: Record<string, string> = {
            'gpt-4o': 'GPT-4o (Copilot)',
            'gpt-4o-mini': 'GPT-4o mini (Copilot)',
            'gpt-4.1': 'GPT-4.1 (Copilot)',
            'gpt-4.1-mini': 'GPT-4.1 mini (Copilot)',
            'o3-mini': 'o3-mini (Reasoning)',
            'o4-mini': 'o4-mini',
            'gpt-4': 'GPT-4',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'claude-3-opus': 'Claude 3 Opus',
            'claude-3-sonnet': 'Claude 3 Sonnet',
            'claude-3.5-sonnet': 'Claude 3.5 Sonnet'
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
