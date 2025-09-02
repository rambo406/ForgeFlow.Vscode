import * as vscode from 'vscode';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { AzureDevOpsClient } from '../services/AzureDevOpsClient';
import { DashboardController } from './DashboardController';

export { MessageType, WebviewMessage, DashboardView } from './Messages';

/**
 * DEPRECATED: Use DashboardController instead. This wrapper is kept
 * for legacy imports and tests referencing PRDashboardController.
 */
export class PRDashboardController extends DashboardController {
    constructor(
        context: vscode.ExtensionContext,
        configurationManager: ConfigurationManager,
        azureDevOpsClient: AzureDevOpsClient | undefined
    ) {
        // eslint-disable-next-line no-console
        console.warn('[DEPRECATION] PRDashboardController is deprecated. Use DashboardController.');
        super(context, configurationManager, azureDevOpsClient);
    }
}

