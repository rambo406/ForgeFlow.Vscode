import * as vscode from 'vscode';
import { AzureDevOpsClient } from '../../services/AzureDevOpsClient';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { LanguageModelService } from '../../services/LanguageModelService';
import { SettingsValidationService } from '../../services/SettingsValidationService';
import { DashboardView, MessageType, WebviewMessage, CurrentAnalysisState } from '../Messages';

export interface MessageHandler {
    canHandle(type: MessageType): boolean;
    handle(message: WebviewMessage, ctx: HandlerContext): Promise<void>;
}

export class HandlerContext {
    public panel: vscode.WebviewPanel | undefined;
    public currentView: DashboardView = DashboardView.PULL_REQUEST_LIST;
    public currentAnalysis: CurrentAnalysisState | undefined;
    public settingsPanelOpen = false;

    constructor(
        public readonly extensionContext: vscode.ExtensionContext,
        public readonly configurationManager: ConfigurationManager,
        public azureDevOpsClient: AzureDevOpsClient | undefined,
        public readonly languageModelService: LanguageModelService,
        public readonly settingsValidationService: SettingsValidationService,
        private readonly postMessage: (msg: WebviewMessage) => void
    ) {}

    sendMessage(message: WebviewMessage): void {
        if (this.panel) {
            try {
                // Safe debug log
                // eslint-disable-next-line no-console
                console.log('[Dashboard] Sending message', { type: message?.type, requestId: message?.requestId });
            } catch { /* noop */ }
            this.panel.webview.postMessage(message);
        }
    }

    async ensureAzureClient(): Promise<AzureDevOpsClient> {
        if (this.azureDevOpsClient) {
            return this.azureDevOpsClient;
        }
        const isConfigured = await this.configurationManager.isConfigured();
        if (!isConfigured) {
            throw new Error('Extension is not configured. Please configure it first.');
        }
        const organizationUrl = this.configurationManager.getOrganizationUrl();
        const patToken = await this.configurationManager.getPatToken();
        if (!organizationUrl || !patToken) {
            throw new Error('Missing configuration. Please check your settings.');
        }
        // dynamic import to avoid circular deps (mirrors legacy)
        const { AzureDevOpsClient: Client } = await import('../../services/AzureDevOpsClient');
        this.azureDevOpsClient = new Client(organizationUrl, patToken);
        return this.azureDevOpsClient;
    }
}

