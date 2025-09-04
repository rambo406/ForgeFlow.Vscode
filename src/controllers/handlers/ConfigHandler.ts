import * as vscode from 'vscode';
import { MessageHandler, HandlerContext } from './MessageHandler';
import { MessageType, WebviewMessage } from '../Messages';

export class ConfigHandler implements MessageHandler {
    private readonly types = new Set<MessageType>([
        MessageType.LOAD_CONFIG,
        MessageType.SAVE_CONFIG,
        MessageType.TEST_CONNECTION,
        MessageType.LOAD_AVAILABLE_MODELS
    ]);

    canHandle(type: MessageType): boolean {
        return this.types.has(type);
    }

    async handle(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        switch (message.type) {
            case MessageType.LOAD_CONFIG:
                return this.handleLoadConfig(message, ctx);
            case MessageType.SAVE_CONFIG:
                return this.handleSaveConfig(message, ctx);
            case MessageType.TEST_CONNECTION:
                return this.handleTestConnection(message, ctx);
            case MessageType.LOAD_AVAILABLE_MODELS:
                return this.handleLoadAvailableModels(message, ctx);
            default:
                return; // unreachable due to canHandle
        }
    }

    private async handleLoadConfig(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const config = {
                organizationUrl: ctx.configurationManager.getOrganizationUrl() || '',
                personalAccessToken: await ctx.configurationManager.getPatToken() || '',
                defaultProject: ctx.configurationManager.getDefaultProject() || '',
                selectedModel: ctx.configurationManager.getSelectedModel(),
                customInstructions: ctx.configurationManager.getCustomInstructions(),
                inlineCommentSystemPrompt: ctx.configurationManager.getInlineCommentSystemPrompt(),
                batchSize: ctx.configurationManager.getBatchSize(),
                enableTelemetry: ctx.configurationManager.isTelemetryEnabled()
            };

            ctx.sendMessage({
                type: MessageType.LOAD_CONFIG,
                payload: { config },
                requestId: message.requestId
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load configuration:', error);
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load configuration' },
                requestId: message.requestId
            });
        }
    }

    private async handleLoadAvailableModels(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const models = await ctx.languageModelService.getAvailableModels();
            ctx.sendMessage({
                type: MessageType.LOAD_AVAILABLE_MODELS,
                payload: { models },
                requestId: message.requestId
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load available models:', error);
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to load available models' },
                requestId: message.requestId
            });
        }
    }

    private async handleSaveConfig(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const config = message.payload?.config;
            if (!config) {
                throw new Error('Configuration data is required');
            }

            if (config.organizationUrl) {
                const urlResult = await ctx.configurationManager.setOrganizationUrl(config.organizationUrl);
                if (!urlResult.isValid) {
                    ctx.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: urlResult.error || 'Invalid organization URL' },
                        requestId: message.requestId
                    });
                    return;
                }
            }

            if (config.personalAccessToken) {
                await ctx.configurationManager.setPatToken(config.personalAccessToken);
            }

            const vscodeConfig = vscode.workspace.getConfiguration('azdo-pr-reviewer');

            if (config.defaultProject !== undefined) {
                await vscodeConfig.update('defaultProject', config.defaultProject || undefined, vscode.ConfigurationTarget.Global);
            }

            if (config.selectedModel) {
                const modelResult = await ctx.configurationManager.setSelectedModel(config.selectedModel);
                if (!modelResult.isValid) {
                    ctx.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: modelResult.error || 'Invalid model selection' },
                        requestId: message.requestId
                    });
                    return;
                }
            }

            if (config.customInstructions !== undefined) {
                await vscodeConfig.update('customInstructions', config.customInstructions, vscode.ConfigurationTarget.Global);
            }

            if (config.inlineCommentSystemPrompt !== undefined) {
                await vscodeConfig.update('inlineCommentSystemPrompt', config.inlineCommentSystemPrompt, vscode.ConfigurationTarget.Global);
            }

            if (config.batchSize !== undefined) {
                await vscodeConfig.update('batchSize', config.batchSize, vscode.ConfigurationTarget.Global);
            }

            if (config.enableTelemetry !== undefined) {
                await vscodeConfig.update('enableTelemetry', config.enableTelemetry, vscode.ConfigurationTarget.Global);
            }

            ctx.sendMessage({
                type: MessageType.SAVE_CONFIG,
                payload: { success: true },
                requestId: message.requestId
            });

            ctx.sendMessage({
                type: MessageType.SHOW_SUCCESS,
                payload: { message: 'Configuration saved successfully' },
                requestId: message.requestId
            });

            // Proactively broadcast the latest configuration so the dashboard
            // can immediately pick up changes (PAT updates don't trigger
            // onDidChangeConfiguration events).
            try {
                const latestConfig = {
                    organizationUrl: ctx.configurationManager.getOrganizationUrl() || '',
                    personalAccessToken: (await ctx.configurationManager.getPatToken()) || '',
                    defaultProject: ctx.configurationManager.getDefaultProject() || '',
                    selectedModel: ctx.configurationManager.getSelectedModel(),
                    customInstructions: ctx.configurationManager.getCustomInstructions(),
                    batchSize: ctx.configurationManager.getBatchSize(),
                    enableTelemetry: ctx.configurationManager.isTelemetryEnabled()
                };
                ctx.sendMessage({
                    type: MessageType.LOAD_CONFIG,
                    payload: { config: latestConfig }
                });
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('Failed to broadcast updated configuration:', e);
            }

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to save configuration:', error);
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Failed to save configuration: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    private async handleTestConnection(message: WebviewMessage, ctx: HandlerContext): Promise<void> {
        try {
            const { testType, ...testParams } = message.payload || {};

            switch (testType) {
                case 'organization':
                    return this.handleTestOrganization(message, ctx, testParams);
                case 'patToken':
                    return this.handleTestPatToken(message, ctx, testParams);
                case 'project':
                    return this.handleTestProject(message, ctx, testParams);
                case 'model':
                    return this.handleTestModel(message, ctx, testParams);
                default:
                    ctx.sendMessage({
                        type: MessageType.SHOW_ERROR,
                        payload: { message: 'Invalid test type' },
                        requestId: message.requestId
                    });
                    return;
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Connection test failed:', error);
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
                requestId: message.requestId
            });
        }
    }

    private async handleTestOrganization(message: WebviewMessage, ctx: HandlerContext, params: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
        const { organizationUrl } = params || {};
        if (!organizationUrl) {
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Organization URL is required' },
                requestId: message.requestId
            });
            return;
        }
        const validationResult = await ctx.settingsValidationService.validateOrganizationUrl(organizationUrl);
        ctx.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: { success: validationResult.isValid, message: validationResult.details, error: validationResult.error, testType: 'organization' },
            requestId: message.requestId
        });
    }

    private async handleTestPatToken(message: WebviewMessage, ctx: HandlerContext, params: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
        const { patToken, organizationUrl } = params || {};
        if (!patToken || !organizationUrl) {
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'PAT token and organization URL are required' },
                requestId: message.requestId
            });
            return;
        }
        const validationResult = await ctx.settingsValidationService.validatePatToken(patToken, organizationUrl);
        ctx.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: { success: validationResult.isValid, message: validationResult.details, error: validationResult.error, testType: 'patToken' },
            requestId: message.requestId
        });
    }

    private async handleTestProject(message: WebviewMessage, ctx: HandlerContext, params: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
        const { projectName, organizationUrl, patToken } = params || {};
        if (!projectName || !organizationUrl || !patToken) {
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Project name, organization URL, and PAT token are required' },
                requestId: message.requestId
            });
            return;
        }
        const validationResult = await ctx.settingsValidationService.validateProject(projectName, organizationUrl, patToken);
        ctx.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: { success: validationResult.isValid, message: validationResult.details, error: validationResult.error, testType: 'project' },
            requestId: message.requestId
        });
    }

    private async handleTestModel(message: WebviewMessage, ctx: HandlerContext, params: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
        const { modelName } = params || {};
        if (!modelName) {
            ctx.sendMessage({
                type: MessageType.SHOW_ERROR,
                payload: { message: 'Model name is required' },
                requestId: message.requestId
            });
            return;
        }
        const validationResult = await ctx.settingsValidationService.validateLanguageModel(modelName);
        ctx.sendMessage({
            type: MessageType.TEST_CONNECTION,
            payload: { success: validationResult.isValid, message: validationResult.details, error: validationResult.error, testType: 'model' },
            requestId: message.requestId
        });
    }
}
