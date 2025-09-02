import * as vscode from 'vscode';
import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage } from '../Messages';
import { SettingsUtils } from '../../utils/SettingsUtils';
import { ValidationResult } from '../../models/AzureDevOpsModels';

export class SettingsHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.OPEN_SETTINGS,
        MessageType.CLOSE_SETTINGS,
        MessageType.VALIDATE_SETTING,
        MessageType.SAVE_SETTINGS,
        MessageType.RESET_SETTINGS,
        MessageType.EXPORT_SETTINGS,
        MessageType.IMPORT_SETTINGS,
        MessageType.LOAD_AVAILABLE_MODELS
    ]);

    canHandle(type: MessageType): boolean {
        return this.types.has(type);
    }

    async handle(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        switch (message.type) {
            case MessageType.OPEN_SETTINGS: return this.handleOpenSettings(message, ctx);
            case MessageType.CLOSE_SETTINGS: return this.handleCloseSettings(message, ctx);
            case MessageType.VALIDATE_SETTING: return this.handleValidateSetting(message, ctx);
            case MessageType.SAVE_SETTINGS: return this.handleSaveSettings(message, ctx);
            case MessageType.RESET_SETTINGS: return this.handleResetSettings(message, ctx);
            case MessageType.EXPORT_SETTINGS: return this.handleExportSettings(message, ctx);
            case MessageType.IMPORT_SETTINGS: return this.handleImportSettings(message, ctx);
            case MessageType.LOAD_AVAILABLE_MODELS: return this.handleLoadAvailableModels(message, ctx);
            default: return;
        }
    }

    private async handleOpenSettings(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            ctx.settingsPanelOpen = true;
            const settings = await ctx.configurationManager.exportSettings();
            const validationResult = await ctx.configurationManager.validateAllSettings();
            ctx.sendMessage({ type: MessageType.OPEN_SETTINGS, payload: { settings, validation: validationResult, isOpen: true }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to open settings:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to open settings' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleCloseSettings(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            ctx.settingsPanelOpen = false;
            ctx.sendMessage({ type: MessageType.CLOSE_SETTINGS, payload: { isOpen: false }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to close settings:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to close settings' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleValidateSetting(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { settingKey, settingValue, context } = message.payload || {};
            if (!settingKey) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Setting key is required for validation' }, requestId: message.requestId });
                return;
            }
            let validationResult: ValidationResult;
            switch (settingKey) {
                case 'organizationUrl':
                    validationResult = await ctx.settingsValidationService.validateOrganizationUrl(settingValue);
                    break;
                case 'patToken': {
                    const orgUrl = context?.organizationUrl || ctx.configurationManager.getOrganizationUrl();
                    if (orgUrl) {
                        validationResult = await ctx.settingsValidationService.validatePatToken(settingValue, orgUrl);
                    } else {
                        validationResult = { isValid: false, error: 'Organization URL required', details: 'Please set organization URL before validating PAT token', category: 'azureDevOps' };
                    }
                    break;
                }
                case 'defaultProject': {
                    const orgUrlForProject = context?.organizationUrl || ctx.configurationManager.getOrganizationUrl();
                    const patToken = context?.patToken || await ctx.configurationManager.getPatToken();
                    if (orgUrlForProject && patToken) {
                        validationResult = await ctx.settingsValidationService.validateProject(settingValue, orgUrlForProject, patToken);
                    } else {
                        validationResult = { isValid: false, error: 'Prerequisites missing', details: 'Organization URL and PAT token are required to validate project', category: 'azureDevOps' };
                    }
                    break;
                }
                case 'selectedModel':
                    validationResult = await ctx.settingsValidationService.validateLanguageModel(settingValue);
                    break;
                case 'customInstructions':
                    validationResult = ctx.settingsValidationService.validateCustomInstructions(settingValue);
                    break;
                case 'batchSize':
                    validationResult = ctx.settingsValidationService.validatePerformanceSettings(settingValue, 30);
                    break;
                default:
                    validationResult = SettingsUtils.validateSettingValue(settingKey, settingValue);
            }
            ctx.sendMessage({ type: MessageType.VALIDATE_SETTING, payload: { settingKey, validation: validationResult }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to validate setting:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to validate setting' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleSaveSettings(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { settings, categories } = message.payload || {};
            if (!settings) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Settings data is required' }, requestId: message.requestId });
                return;
            }
            const currentSettings = await ctx.configurationManager.exportSettings();
            const backupDir = vscode.Uri.joinPath(ctx.extensionContext.globalStorageUri, 'backups');
            await vscode.workspace.fs.createDirectory(backupDir);
            await SettingsUtils.createBackup(currentSettings, backupDir);
            const importResult = await ctx.configurationManager.importSettings(settings, { categories });
            if (!importResult.isValid) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: `Failed to save settings: ${importResult.error}` }, requestId: message.requestId });
                return;
            }
            const validationResult = await ctx.configurationManager.validateAllSettings();
            ctx.sendMessage({ type: MessageType.SAVE_SETTINGS, payload: { success: true, validation: validationResult, message: 'Settings saved successfully' }, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SETTINGS_CHANGED, payload: { settings: await ctx.configurationManager.exportSettings(), validation: validationResult } });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to save settings:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to save settings' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleResetSettings(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { categories, includeSecrets } = message.payload || {};
            const currentSettings = await ctx.configurationManager.exportSettings();
            const backupDir = vscode.Uri.joinPath(ctx.extensionContext.globalStorageUri, 'backups');
            await vscode.workspace.fs.createDirectory(backupDir);
            await SettingsUtils.createBackup(currentSettings, backupDir);
            if (categories && Array.isArray(categories)) {
                const defaultValues = SettingsUtils.getDefaultValues();
                const config = vscode.workspace.getConfiguration('azdo-pr-reviewer');
                for (const category of categories) {
                    const categorySettings = SettingsUtils.getSettingsCategories()[category] || [];
                    for (const settingKey of categorySettings) {
                        if (Object.prototype.hasOwnProperty.call(defaultValues, settingKey)) {
                            await config.update(settingKey, (defaultValues as any)[settingKey], vscode.ConfigurationTarget.Global); // eslint-disable-line @typescript-eslint/no-explicit-any
                        }
                    }
                }
                if (includeSecrets && categories.includes('azureDevOps')) {
                    await ctx.configurationManager.clearPatToken();
                }
            } else {
                await ctx.configurationManager.resetSettingsToDefault();
                if (includeSecrets) {
                    await ctx.configurationManager.clearPatToken();
                }
            }
            const updatedSettings = await ctx.configurationManager.exportSettings();
            const validationResult = await ctx.configurationManager.validateAllSettings();
            ctx.sendMessage({ type: MessageType.RESET_SETTINGS, payload: { success: true, settings: updatedSettings, validation: validationResult, message: 'Settings reset to defaults' }, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SETTINGS_CHANGED, payload: { settings: updatedSettings, validation: validationResult } });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to reset settings:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to reset settings' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleExportSettings(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { includeSecrets, format } = message.payload || {};
            const settings = await ctx.configurationManager.exportSettings();
            if (!includeSecrets && (settings as any).azureDevOps) { // eslint-disable-line @typescript-eslint/no-explicit-any
                (settings as any).azureDevOps.hasPatToken = false; // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            const exportData = SettingsUtils.serializeSettings(settings);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `azdo-pr-reviewer-settings-${timestamp}.json`;
            ctx.sendMessage({ type: MessageType.EXPORT_SETTINGS, payload: { data: exportData, filename, format: format || 'json', success: true }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to export settings:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to export settings' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleImportSettings(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { data, options } = message.payload || {};
            if (!data) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Import data is required' }, requestId: message.requestId });
                return;
            }
            const settings = SettingsUtils.deserializeSettings(data);
            const currentSettings = await ctx.configurationManager.exportSettings();
            const backupDir = vscode.Uri.joinPath(ctx.extensionContext.globalStorageUri, 'backups');
            await vscode.workspace.fs.createDirectory(backupDir);
            await SettingsUtils.createBackup(currentSettings, backupDir);
            const importResult = await ctx.configurationManager.importSettings(settings, options);
            if (!importResult.isValid) {
                ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: `Failed to import settings: ${importResult.error}` }, requestId: message.requestId });
                return;
            }
            const updatedSettings = await ctx.configurationManager.exportSettings();
            const validationResult = await ctx.configurationManager.validateAllSettings();
            ctx.sendMessage({ type: MessageType.IMPORT_SETTINGS, payload: { success: true, settings: updatedSettings, validation: validationResult, message: 'Settings imported successfully' }, requestId: message.requestId });
            ctx.sendMessage({ type: MessageType.SETTINGS_CHANGED, payload: { settings: updatedSettings, validation: validationResult } });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to import settings:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to import settings' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }

    private async handleLoadAvailableModels(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const models = await ctx.languageModelService.getAvailableModels();
            ctx.sendMessage({ type: MessageType.LOAD_AVAILABLE_MODELS, payload: { models, success: true }, requestId: message.requestId });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load available models:', error);
            ctx.sendMessage({ type: MessageType.SHOW_ERROR, payload: { message: 'Failed to load available models' + (error instanceof Error ? `: ${error.message}` : '') }, requestId: message.requestId });
        }
    }
}

