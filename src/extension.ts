import * as vscode from 'vscode';
import { ConfigurationManager } from './services/ConfigurationManager';
import { ExtensionCommands } from './commands/ExtensionCommands';
import { TelemetryService } from './utils/TelemetryService';

let configurationManager: ConfigurationManager;
let extensionCommands: ExtensionCommands;
let telemetryService: TelemetryService;

/**
 * Extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('Azure DevOps PR Code Reviewer extension is now active!');

    try {
        // Initialize core services
        configurationManager = new ConfigurationManager(context);
        telemetryService = new TelemetryService(context, configurationManager);
        extensionCommands = new ExtensionCommands(context, configurationManager);

        // Track extension activation
        telemetryService.trackExtensionLifecycle('activated');

        // Register all commands
        await extensionCommands.registerCommands();

        // Show Overview page (Angular route) depending on settings/config
        await maybeShowOverview();

        // Add telemetry service to disposables
        context.subscriptions.push({
            dispose: () => telemetryService.dispose()
        });

        console.log('Azure DevOps PR Code Reviewer extension activated successfully');
    } catch (error) {
        console.error('Failed to activate Azure DevOps PR Code Reviewer extension:', error);
        
        // Track activation error
        telemetryService?.trackError('extension_activation_failed', error instanceof Error ? error.message : 'Unknown error');
        
        vscode.window.showErrorMessage(
            'Failed to activate Azure DevOps PR Code Reviewer extension. Please check the logs for details.'
        );
    }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate() {
    console.log('Azure DevOps PR Code Reviewer extension is being deactivated');
    
    try {
        // Track extension deactivation
        telemetryService?.trackExtensionLifecycle('deactivated');
        
        // Clean up resources
        if (extensionCommands) {
            extensionCommands.dispose();
        }
        
        if (telemetryService) {
            telemetryService.dispose();
        }
        
        console.log('Azure DevOps PR Code Reviewer extension deactivated successfully');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}

/**
 * Show welcome message for first-time users
 */
async function maybeShowOverview() {
    try {
        const config = vscode.workspace.getConfiguration('azdo-pr-reviewer');
        const showOnStartup = config.get<boolean>('showOverviewOnStartup', true);
        const isConfigured = await configurationManager.isConfigured();

        // Always show if not configured. Otherwise respect the setting.
        if (!isConfigured || showOnStartup) {
            await vscode.commands.executeCommand('azdo-pr-reviewer.showOverview');
        }
    } catch (err) {
        console.error('Failed to show overview:', err);
    }
}
