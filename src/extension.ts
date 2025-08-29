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

        // Show welcome message for first-time users
        await showWelcomeMessage(context);

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
async function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
    
    if (!hasShownWelcome) {
        const result = await vscode.window.showInformationMessage(
            'Welcome to Azure DevOps PR Code Reviewer! Would you like to configure it now?',
            'Configure Now',
            'Later'
        );
        
        if (result === 'Configure Now') {
            await vscode.commands.executeCommand('azdo-pr-reviewer.configure');
        }
        
        await context.globalState.update('hasShownWelcome', true);
    }
}