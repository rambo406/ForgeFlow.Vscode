import * as vscode from 'vscode';
import { SettingsConfiguration, ValidationResult } from '../models/AzureDevOpsModels';

/**
 * Utility functions for settings management
 */
export class SettingsUtils {
    /**
     * Migrate settings from older versions to newer format
     */
    static async migrateSettings(fromVersion: string, toVersion: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('azdo-pr-reviewer');

        // Migration from pre-1.0.0 versions
        if (SettingsUtils.compareVersions(fromVersion, '1.0.0') < 0) {
            // Migrate old configuration keys to new format
            const oldOrgUrl = config.get<string>('organization');
            if (oldOrgUrl && !config.has('organizationUrl')) {
                await config.update('organizationUrl', oldOrgUrl, vscode.ConfigurationTarget.Global);
                await config.update('organization', undefined, vscode.ConfigurationTarget.Global);
            }

            // Migrate old model names to new format
            const oldModel = config.get<string>('model');
            if (oldModel && !config.has('selectedModel')) {
                const newModelName = SettingsUtils.migrateModelName(oldModel);
                await config.update('selectedModel', newModelName, vscode.ConfigurationTarget.Global);
                await config.update('model', undefined, vscode.ConfigurationTarget.Global);
            }
        }

        // Future migrations can be added here
        if (SettingsUtils.compareVersions(fromVersion, '1.1.0') < 0) {
            // Add new default settings introduced in 1.1.0
            if (!config.has('ui.theme')) {
                await config.update('ui.theme', 'auto', vscode.ConfigurationTarget.Global);
            }
            if (!config.has('ui.fontSize')) {
                await config.update('ui.fontSize', 14, vscode.ConfigurationTarget.Global);
            }
        }
    }

    /**
     * Migrate old model names to new format
     */
    private static migrateModelName(oldModelName: string): string {
        const modelMigrationMap: { [key: string]: string } = {
            'gpt-4': 'copilot-gpt-4',
            'gpt-3.5-turbo': 'copilot-gpt-3.5-turbo',
            'claude': 'anthropic-claude',
            'codellama': 'meta-codellama'
        };

        return modelMigrationMap[oldModelName] || oldModelName;
    }

    /**
     * Compare two version strings
     */
    static compareVersions(version1: string, version2: string): number {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        const maxLength = Math.max(v1Parts.length, v2Parts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }

    /**
     * Serialize settings for export
     */
    static serializeSettings(settings: SettingsConfiguration): string {
        try {
            return JSON.stringify(settings, null, 2);
        } catch (error) {
            throw new Error(`Failed to serialize settings: ${error}`);
        }
    }

    /**
     * Deserialize settings from import
     */
    static deserializeSettings(data: string): SettingsConfiguration {
        try {
            const parsed = JSON.parse(data);
            return SettingsUtils.validateSettingsStructure(parsed);
        } catch (error) {
            throw new Error(`Failed to deserialize settings: ${error}`);
        }
    }

    /**
     * Validate settings structure and add defaults for missing properties
     */
    private static validateSettingsStructure(settings: any): SettingsConfiguration {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Invalid settings format: must be a JSON object');
        }

        const validatedSettings: SettingsConfiguration = {
            version: settings.version || '1.0.0',
            exportDate: settings.exportDate || new Date().toISOString(),
            azureDevOps: settings.azureDevOps || {},
            languageModel: settings.languageModel || {},
            performance: settings.performance || {},
            ui: settings.ui || {}
        };

        return validatedSettings;
    }

    /**
     * Get settings categories for UI organization
     */
    static getSettingsCategories(): { [key: string]: string[] } {
        return {
            azureDevOps: [
                'organizationUrl',
                'defaultProject',
                'patToken'
            ],
            languageModel: [
                'selectedModel',
                'customInstructions',
                'temperature',
                'maxTokens'
            ],
            performance: [
                'batchSize',
                'timeout',
                'enableTelemetry',
                'cacheSize'
            ],
            reviewInstructions: [
                'customInstructions',
                'includeSecurityCheck',
                'includePerformanceCheck',
                'includeMaintainabilityCheck'
            ],
            ui: [
                'theme',
                'fontSize',
                'compactMode',
                'showLineNumbers'
            ]
        };
    }

    /**
     * Get display names for settings keys
     */
    static getSettingDisplayName(key: string): string {
        const displayNames: { [key: string]: string } = {
            organizationUrl: 'Organization URL',
            defaultProject: 'Default Project',
            patToken: 'Personal Access Token',
            selectedModel: 'Language Model',
            customInstructions: 'Custom Instructions',
            temperature: 'Temperature',
            maxTokens: 'Max Tokens',
            batchSize: 'Batch Size',
            timeout: 'Timeout (seconds)',
            enableTelemetry: 'Enable Telemetry',
            cacheSize: 'Cache Size',
            includeSecurityCheck: 'Include Security Check',
            includePerformanceCheck: 'Include Performance Check',
            includeMaintainabilityCheck: 'Include Maintainability Check',
            theme: 'Theme',
            fontSize: 'Font Size',
            compactMode: 'Compact Mode',
            showLineNumbers: 'Show Line Numbers'
        };

        return displayNames[key] || key;
    }

    /**
     * Get setting descriptions for help text
     */
    static getSettingDescription(key: string): string {
        const descriptions: { [key: string]: string } = {
            organizationUrl: 'The URL of your Azure DevOps organization (e.g., https://dev.azure.com/your-org)',
            defaultProject: 'Default project to use when none is specified',
            patToken: 'Personal Access Token for Azure DevOps authentication',
            selectedModel: 'Language model to use for code review analysis',
            customInstructions: 'Additional instructions to guide the code review process',
            temperature: 'Controls randomness in model responses (0.0 = deterministic, 1.0 = creative)',
            maxTokens: 'Maximum number of tokens the model can generate',
            batchSize: 'Number of files to process simultaneously',
            timeout: 'Maximum time to wait for model responses',
            enableTelemetry: 'Allow anonymous usage data collection to improve the extension',
            cacheSize: 'Maximum number of cached responses to store',
            includeSecurityCheck: 'Include security vulnerability checks in reviews',
            includePerformanceCheck: 'Include performance analysis in reviews',
            includeMaintainabilityCheck: 'Include maintainability assessment in reviews',
            theme: 'Visual theme for the extension interface',
            fontSize: 'Font size for the extension interface',
            compactMode: 'Use compact layout to save space',
            showLineNumbers: 'Show line numbers in code displays'
        };

        return descriptions[key] || 'No description available';
    }

    /**
     * Get default values for settings
     */
    static getDefaultValues(): { [key: string]: any } {
        return {
            selectedModel: 'copilot-gpt-4',
            customInstructions: 'Focus on code quality, security vulnerabilities, performance issues, and maintainability. Provide specific suggestions for improvement.',
            temperature: 0.1,
            maxTokens: 4000,
            batchSize: 10,
            timeout: 30,
            enableTelemetry: true,
            cacheSize: 100,
            includeSecurityCheck: true,
            includePerformanceCheck: true,
            includeMaintainabilityCheck: true,
            theme: 'auto',
            fontSize: 14,
            compactMode: false,
            showLineNumbers: true
        };
    }

    /**
     * Validate setting value against constraints
     */
    static validateSettingValue(key: string, value: any): ValidationResult {
        switch (key) {
            case 'organizationUrl':
                if (!value || typeof value !== 'string') {
                    return { isValid: false, error: 'Organization URL is required' };
                }
                if (!value.match(/^https:\/\/(dev\.azure\.com\/[\w-]+|[\w-]+\.visualstudio\.com)$/)) {
                    return { isValid: false, error: 'Invalid organization URL format' };
                }
                break;

            case 'batchSize':
                if (typeof value !== 'number' || value < 1 || value > 100) {
                    return { isValid: false, error: 'Batch size must be between 1 and 100' };
                }
                break;

            case 'timeout':
                if (typeof value !== 'number' || value < 5 || value > 300) {
                    return { isValid: false, error: 'Timeout must be between 5 and 300 seconds' };
                }
                break;

            case 'temperature':
                if (typeof value !== 'number' || value < 0 || value > 2) {
                    return { isValid: false, error: 'Temperature must be between 0 and 2' };
                }
                break;

            case 'maxTokens':
                if (typeof value !== 'number' || value < 100 || value > 8000) {
                    return { isValid: false, error: 'Max tokens must be between 100 and 8000' };
                }
                break;

            case 'fontSize':
                if (typeof value !== 'number' || value < 8 || value > 24) {
                    return { isValid: false, error: 'Font size must be between 8 and 24' };
                }
                break;

            case 'customInstructions':
                if (typeof value !== 'string') {
                    return { isValid: false, error: 'Custom instructions must be text' };
                }
                if (value.length > 10000) {
                    return { isValid: false, error: 'Custom instructions must be less than 10,000 characters' };
                }
                break;

            case 'theme':
                if (!['auto', 'light', 'dark', 'high-contrast'].includes(value)) {
                    return { isValid: false, error: 'Invalid theme selection' };
                }
                break;
        }

        return { isValid: true };
    }

    /**
     * Generate backup filename with timestamp
     */
    static generateBackupFilename(prefix = 'settings-backup'): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}-${timestamp}.json`;
    }

    /**
     * Clean up old backup files (keep only recent ones)
     */
    static async cleanupOldBackups(backupDir: vscode.Uri, maxBackups = 5): Promise<void> {
        try {
            const files = await vscode.workspace.fs.readDirectory(backupDir);
            const backupFiles = files
                .filter(([name, type]) => type === vscode.FileType.File && name.startsWith('settings-backup-'))
                .map(([name]) => name)
                .sort()
                .reverse(); // Most recent first

            // Delete old backups
            for (let i = maxBackups; i < backupFiles.length; i++) {
                const fileUri = vscode.Uri.joinPath(backupDir, backupFiles[i]);
                await vscode.workspace.fs.delete(fileUri);
            }
        } catch (error) {
            console.warn('Failed to cleanup old backups:', error);
        }
    }

    /**
     * Create a settings backup before making changes
     */
    static async createBackup(settings: SettingsConfiguration, backupDir: vscode.Uri): Promise<vscode.Uri> {
        const filename = SettingsUtils.generateBackupFilename();
        const backupUri = vscode.Uri.joinPath(backupDir, filename);
        
        const backupData = {
            ...settings,
            backupDate: new Date().toISOString(),
            backupReason: 'Automatic backup before settings change'
        };

        const content = new TextEncoder().encode(JSON.stringify(backupData, null, 2));
        await vscode.workspace.fs.writeFile(backupUri, content);

        // Cleanup old backups
        await SettingsUtils.cleanupOldBackups(backupDir);

        return backupUri;
    }

    /**
     * Restore settings from backup
     */
    static async restoreFromBackup(backupUri: vscode.Uri): Promise<SettingsConfiguration> {
        try {
            const content = await vscode.workspace.fs.readFile(backupUri);
            const data = new TextDecoder().decode(content);
            return SettingsUtils.deserializeSettings(data);
        } catch (error) {
            throw new Error(`Failed to restore from backup: ${error}`);
        }
    }
}