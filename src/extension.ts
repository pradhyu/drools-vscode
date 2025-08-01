import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    State,
    ErrorAction,
    CloseAction
} from 'vscode-languageclient/node';
import * as path from 'path';
import * as fs from 'fs';
import { DroolsSnippetProvider } from './snippetProvider';
import { DroolsFallbackProvider } from './fallbackProvider';
import { ConfigurationManager, isFormattingEnabled, isCompletionEnabled, isDiagnosticsEnabled, isSnippetsEnabled, getFormattingOptions } from './configurationManager';

let client: LanguageClient;
let isLanguageServerAvailable = false;
let fallbackMode = false;
let outputChannel: vscode.OutputChannel;
let fallbackProvider: DroolsFallbackProvider;
let fallbackDisposables: vscode.Disposable[] = [];
let configManager: ConfigurationManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Drools VSCode Extension is now active!');

    // Initialize configuration manager
    configManager = ConfigurationManager.getInstance();

    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Drools Extension');
    outputChannel.appendLine('Drools VSCode Extension activated');

    // Initialize fallback provider
    fallbackProvider = new DroolsFallbackProvider(outputChannel);

    // Start the language server with error handling (only if enabled)
    const serverConfig = configManager.getServerConfiguration();
    if (configManager.isFeatureEnabled('enableCompletion') ||
        configManager.isFeatureEnabled('enableDiagnostics') ||
        configManager.isFeatureEnabled('enableFormatting') ||
        configManager.isFeatureEnabled('enableSymbolProvider')) {
        startLanguageServer(context);
    } else {
        outputChannel.appendLine('Language server disabled by configuration, using fallback mode');
        enableFallbackMode('Language server disabled by configuration', context);
    }

    // Register the extension for .drl files
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'drools') {
            console.log('Drools file opened:', document.fileName);
            // Ensure the document is properly associated with drools language
            vscode.languages.setTextDocumentLanguage(document, 'drools');
        }
    });

    // Handle files that are already open when extension activates
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.fileName.endsWith('.drl') && document.languageId !== 'drools') {
            console.log('Setting language for already open .drl file:', document.fileName);
            vscode.languages.setTextDocumentLanguage(document, 'drools');
        }
    });

    // Register command to manually set language to drools
    const setLanguageCommand = vscode.commands.registerCommand('drools.setLanguage', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            vscode.languages.setTextDocumentLanguage(activeEditor.document, 'drools');
            vscode.window.showInformationMessage('Language set to Drools');
        }
    });

    // Register snippet management commands
    const createCustomSnippetCommand = vscode.commands.registerCommand('drools.createCustomSnippet', async () => {
        await createCustomSnippet(context);
    });

    const manageSnippetsCommand = vscode.commands.registerCommand('drools.manageSnippets', async () => {
        await manageSnippets(context);
    });

    const exportSnippetsCommand = vscode.commands.registerCommand('drools.exportSnippets', async () => {
        await exportSnippets(context);
    });

    const importSnippetsCommand = vscode.commands.registerCommand('drools.importSnippets', async () => {
        await importSnippets(context);
    });

    // Register custom snippet provider (only if snippets are enabled)
    let snippetProviderDisposable: vscode.Disposable | undefined;
    if (configManager.isFeatureEnabled('enableSnippets')) {
        const snippetProvider = new DroolsSnippetProvider(context);
        const snippetConfig = configManager.getSnippetsConfiguration();
        snippetProviderDisposable = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'drools' },
            snippetProvider,
            ...snippetConfig.triggerCharacters
        );
    }

    // Register format-on-save functionality
    const formatOnSaveHandler = vscode.workspace.onWillSaveTextDocument(async (event) => {
        const document = event.document;

        // Only handle .drl files
        if (document.languageId !== 'drools') {
            return;
        }

        // Check if formatting and format-on-save are enabled
        if (!isFormattingEnabled(document.uri)) {
            return;
        }

        const formattingConfig = configManager.getFormattingConfiguration(document.uri);
        if (!formattingConfig.formatOnSave) {
            return;
        }

        // Get formatting options from configuration
        const formattingOptions = getFormattingOptions(document.uri);

        // Wait for formatting to complete
        event.waitUntil(
            Promise.resolve(
                vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, formattingOptions)
            ).then((edits) => {
                const textEdits = edits as vscode.TextEdit[] | undefined;
                if (textEdits && textEdits.length > 0) {
                    console.log(`Applied ${textEdits.length} formatting edits to ${document.fileName}`);
                }
                return textEdits || [];
            }).catch((error: any) => {
                console.error('Error during format-on-save:', error);
                // Return empty array on error to prevent save from failing
                return [];
            })
        );
    });

    // Add disposables to context subscriptions
    const disposables = [
        onDidOpenTextDocument,
        setLanguageCommand,
        formatOnSaveHandler,
        createCustomSnippetCommand,
        manageSnippetsCommand,
        exportSnippetsCommand,
        importSnippetsCommand
    ];

    if (snippetProviderDisposable) {
        disposables.push(snippetProviderDisposable);
    }

    // Set up configuration change handler
    const configChangeHandler = configManager.onConfigurationChanged((config) => {
        outputChannel.appendLine('Configuration changed, reloading extension features...');

        // Restart language server if needed
        if (config.features.enableCompletion ||
            config.features.enableDiagnostics ||
            config.features.enableFormatting ||
            config.features.enableSymbolProvider) {
            if (fallbackMode) {
                outputChannel.appendLine('Restarting language server due to configuration change...');
                startLanguageServer(context);
            }
        } else {
            if (!fallbackMode && client) {
                outputChannel.appendLine('Stopping language server due to configuration change...');
                client.stop();
                enableFallbackMode('Language server disabled by configuration', context);
            }
        }
    });

    disposables.push(configChangeHandler);
    context.subscriptions.push(...disposables);
}

function startLanguageServer(context: vscode.ExtensionContext) {
    try {
        outputChannel.appendLine('Starting Drools Language Server...');

        // The server is implemented in node
        const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));

        // Check if server module exists
        if (!fs.existsSync(serverModule)) {
            outputChannel.appendLine(`ERROR: Language server module not found at ${serverModule}`);
            enableFallbackMode('Language server module not found', context);
            return;
        }

        // The debug options for the server
        const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                options: debugOptions
            }
        };

        // Options to control the language client
        const clientOptions: LanguageClientOptions = {
            // Register the server for drools documents
            documentSelector: [{ scheme: 'file', language: 'drools' }],
            synchronize: {
                // Notify the server about file changes to '.drl files contained in the workspace
                fileEvents: vscode.workspace.createFileSystemWatcher('**/*.drl')
            },
            // Enhanced error handling options
            errorHandler: {
                error: (error, message, count) => {
                    outputChannel.appendLine(`Language server error: ${error.message}`);
                    outputChannel.appendLine(`Message: ${message ? JSON.stringify(message) : 'N/A'}`);
                    outputChannel.appendLine(`Error count: ${count || 0}`);

                    // If too many errors, switch to fallback mode
                    if ((count || 0) >= 5) {
                        outputChannel.appendLine('Too many language server errors, switching to fallback mode');
                        enableFallbackMode('Too many language server errors', context);
                        return { action: ErrorAction.Shutdown };
                    }

                    return { action: ErrorAction.Continue };
                },
                closed: () => {
                    outputChannel.appendLine('Language server connection closed');
                    isLanguageServerAvailable = false;

                    // Attempt to restart after a delay
                    setTimeout(() => {
                        if (!fallbackMode) {
                            outputChannel.appendLine('Attempting to restart language server...');
                            restartLanguageServer(context);
                        }
                    }, 5000);

                    return { action: CloseAction.DoNotRestart };
                }
            }
        };

        // Create the language client and start the client.
        client = new LanguageClient(
            'droolsLanguageServer',
            'Drools Language Server',
            serverOptions,
            clientOptions
        );

        // Set up state change handlers
        client.onDidChangeState((event) => {
            outputChannel.appendLine(`Language server state changed: ${State[event.oldState]} -> ${State[event.newState]}`);

            switch (event.newState) {
                case State.Running:
                    isLanguageServerAvailable = true;
                    fallbackMode = false;
                    outputChannel.appendLine('Language server is now running');
                    vscode.window.setStatusBarMessage('Drools: Language server active', 3000);
                    break;
                case State.Stopped:
                    isLanguageServerAvailable = false;
                    outputChannel.appendLine('Language server stopped');
                    if (!fallbackMode) {
                        enableFallbackMode('Language server stopped unexpectedly', context);
                    }
                    break;
                case State.Starting:
                    outputChannel.appendLine('Language server starting...');
                    break;
            }
        });

        // Start the client with error handling
        client.start().then(() => {
            outputChannel.appendLine('Language server started successfully');
        }).catch((error) => {
            outputChannel.appendLine(`Failed to start language server: ${error.message}`);
            enableFallbackMode(`Failed to start language server: ${error.message}`, context);
        });

    } catch (error) {
        outputChannel.appendLine(`Error initializing language server: ${error}`);
        enableFallbackMode(`Error initializing language server: ${error}`, context);
    }
}

function enableFallbackMode(reason: string, context?: vscode.ExtensionContext) {
    fallbackMode = true;
    isLanguageServerAvailable = false;

    outputChannel.appendLine(`Enabling fallback mode: ${reason}`);

    // Dispose of any existing fallback providers
    fallbackDisposables.forEach(disposable => disposable.dispose());
    fallbackDisposables = [];

    // Register fallback providers if context is available
    if (context) {
        try {
            fallbackDisposables = fallbackProvider.registerFallbackProviders(context);
            outputChannel.appendLine('Fallback providers registered successfully');
        } catch (error) {
            outputChannel.appendLine(`Error registering fallback providers: ${error}`);
        }
    } else {
        outputChannel.appendLine('Context not available, fallback providers not registered');
    }

    vscode.window.showWarningMessage(
        `Drools language server unavailable. Running in fallback mode with basic syntax highlighting only. Reason: ${reason}`,
        'Show Output'
    ).then((selection) => {
        if (selection === 'Show Output') {
            outputChannel.show();
        }
    });

    // Set status bar message
    vscode.window.setStatusBarMessage('Drools: Fallback mode (basic syntax only)', 5000);
}

function restartLanguageServer(context: vscode.ExtensionContext) {
    if (client) {
        outputChannel.appendLine('Stopping existing language server...');
        client.stop().then(() => {
            outputChannel.appendLine('Existing language server stopped, starting new instance...');
            startLanguageServer(context);
        }).catch((error) => {
            outputChannel.appendLine(`Error stopping language server: ${error.message}`);
            // Try to start anyway
            startLanguageServer(context);
        });
    } else {
        startLanguageServer(context);
    }
}

// Snippet management functions
interface DroolsSnippet {
    prefix: string;
    body: string[];
    description: string;
}

interface DroolsSnippetCollection {
    [key: string]: DroolsSnippet;
}

async function createCustomSnippet(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Get snippet name
        const snippetName = await vscode.window.showInputBox({
            prompt: 'Enter a name for your custom snippet',
            placeHolder: 'e.g., My Custom Rule',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Snippet name cannot be empty';
                }
                return null;
            }
        });

        if (!snippetName) {
            return;
        }

        // Get snippet prefix (trigger)
        const snippetPrefix = await vscode.window.showInputBox({
            prompt: 'Enter the trigger prefix for your snippet',
            placeHolder: 'e.g., mycustomrule',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Snippet prefix cannot be empty';
                }
                if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                    return 'Prefix can only contain letters, numbers, hyphens, and underscores';
                }
                return null;
            }
        });

        if (!snippetPrefix) {
            return;
        }

        // Get snippet description
        const snippetDescription = await vscode.window.showInputBox({
            prompt: 'Enter a description for your snippet (optional)',
            placeHolder: 'e.g., Custom rule template for specific use case'
        });

        // Get snippet body from active editor selection or prompt for input
        let snippetBody: string[] = [];
        const activeEditor = vscode.window.activeTextEditor;

        if (activeEditor && !activeEditor.selection.isEmpty) {
            // Use selected text as snippet body
            const selectedText = activeEditor.document.getText(activeEditor.selection);
            snippetBody = selectedText.split('\n');

            const useSelection = await vscode.window.showQuickPick(
                ['Use selected text', 'Enter custom text'],
                { placeHolder: 'Use selected text as snippet body?' }
            );

            if (useSelection === 'Enter custom text') {
                snippetBody = [];
            }
        }

        if (snippetBody.length === 0) {
            // Prompt for snippet body
            const bodyInput = await vscode.window.showInputBox({
                prompt: 'Enter the snippet body (use \\n for line breaks, ${1:placeholder} for tab stops)',
                placeHolder: 'rule "${1:RuleName}"\\nwhen\\n\\t${2:condition}\\nthen\\n\\t${3:action}\\nend',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Snippet body cannot be empty';
                    }
                    return null;
                }
            });

            if (!bodyInput) {
                return;
            }

            snippetBody = bodyInput.split('\\n');
        }

        // Create the snippet object
        const newSnippet: DroolsSnippet = {
            prefix: snippetPrefix.trim(),
            body: snippetBody,
            description: snippetDescription?.trim() || `Custom snippet: ${snippetName}`
        };

        // Save the snippet
        await saveCustomSnippet(context, snippetName.trim(), newSnippet);

        vscode.window.showInformationMessage(`Custom snippet "${snippetName}" created successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create custom snippet: ${error}`);
    }
}

async function manageSnippets(context: vscode.ExtensionContext): Promise<void> {
    try {
        const customSnippets = await loadCustomSnippets(context);
        const builtInSnippets = await loadBuiltInSnippets(context);

        const actions = [
            'View All Snippets',
            'Edit Custom Snippet',
            'Delete Custom Snippet',
            'Create New Snippet',
            'Reset to Defaults'
        ];

        const selectedAction = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Choose an action for snippet management'
        });

        switch (selectedAction) {
            case 'View All Snippets':
                await viewAllSnippets(builtInSnippets, customSnippets);
                break;
            case 'Edit Custom Snippet':
                await editCustomSnippet(context, customSnippets);
                break;
            case 'Delete Custom Snippet':
                await deleteCustomSnippet(context, customSnippets);
                break;
            case 'Create New Snippet':
                await createCustomSnippet(context);
                break;
            case 'Reset to Defaults':
                await resetSnippetsToDefaults(context);
                break;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to manage snippets: ${error}`);
    }
}

async function exportSnippets(context: vscode.ExtensionContext): Promise<void> {
    try {
        const customSnippets = await loadCustomSnippets(context);

        if (Object.keys(customSnippets).length === 0) {
            vscode.window.showInformationMessage('No custom snippets to export.');
            return;
        }

        const exportUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('drools-custom-snippets.json'),
            filters: {
                'JSON Files': ['json']
            }
        });

        if (exportUri) {
            const exportData = {
                exportedAt: new Date().toISOString(),
                snippets: customSnippets
            };

            await vscode.workspace.fs.writeFile(
                exportUri,
                Buffer.from(JSON.stringify(exportData, null, 2))
            );

            vscode.window.showInformationMessage(`Custom snippets exported to ${exportUri.fsPath}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to export snippets: ${error}`);
    }
}

async function importSnippets(context: vscode.ExtensionContext): Promise<void> {
    try {
        const importUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON Files': ['json']
            }
        });

        if (!importUri || importUri.length === 0) {
            return;
        }

        const fileContent = await vscode.workspace.fs.readFile(importUri[0]);
        const importData = JSON.parse(fileContent.toString());

        let snippetsToImport: DroolsSnippetCollection;

        // Handle different import formats
        if (importData.snippets) {
            snippetsToImport = importData.snippets;
        } else {
            snippetsToImport = importData;
        }

        const existingSnippets = await loadCustomSnippets(context);
        const conflictingSnippets: string[] = [];

        // Check for conflicts
        for (const snippetName in snippetsToImport) {
            if (existingSnippets[snippetName]) {
                conflictingSnippets.push(snippetName);
            }
        }

        let shouldProceed = true;
        if (conflictingSnippets.length > 0) {
            const action = await vscode.window.showWarningMessage(
                `The following snippets already exist: ${conflictingSnippets.join(', ')}. How would you like to proceed?`,
                'Overwrite All',
                'Skip Existing',
                'Cancel'
            );

            if (action === 'Cancel') {
                return;
            }

            if (action === 'Skip Existing') {
                for (const conflictName of conflictingSnippets) {
                    delete snippetsToImport[conflictName];
                }
            }
        }

        // Import snippets
        const mergedSnippets = { ...existingSnippets, ...snippetsToImport };
        await saveAllCustomSnippets(context, mergedSnippets);

        const importedCount = Object.keys(snippetsToImport).length;
        vscode.window.showInformationMessage(`Successfully imported ${importedCount} snippet(s)!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to import snippets: ${error}`);
    }
}

// Helper functions
async function loadBuiltInSnippets(context: vscode.ExtensionContext): Promise<DroolsSnippetCollection> {
    try {
        const snippetPath = path.join(context.extensionPath, 'snippets', 'drools.json');
        const snippetContent = await fs.promises.readFile(snippetPath, 'utf8');
        return JSON.parse(snippetContent);
    } catch (error) {
        console.error('Failed to load built-in snippets:', error);
        return {};
    }
}

async function loadCustomSnippets(context: vscode.ExtensionContext): Promise<DroolsSnippetCollection> {
    try {
        const customSnippets = context.globalState.get<DroolsSnippetCollection>('drools.customSnippets', {});
        return customSnippets;
    } catch (error) {
        console.error('Failed to load custom snippets:', error);
        return {};
    }
}

async function saveCustomSnippet(context: vscode.ExtensionContext, name: string, snippet: DroolsSnippet): Promise<void> {
    const customSnippets = await loadCustomSnippets(context);
    customSnippets[name] = snippet;
    await context.globalState.update('drools.customSnippets', customSnippets);
}

async function saveAllCustomSnippets(context: vscode.ExtensionContext, snippets: DroolsSnippetCollection): Promise<void> {
    await context.globalState.update('drools.customSnippets', snippets);
}

async function viewAllSnippets(builtIn: DroolsSnippetCollection, custom: DroolsSnippetCollection): Promise<void> {
    const allSnippets: Array<{ label: string; description: string; detail: string; snippet: DroolsSnippet }> = [];

    // Add built-in snippets
    for (const [name, snippet] of Object.entries(builtIn)) {
        allSnippets.push({
            label: `📦 ${name}`,
            description: snippet.description,
            detail: `Prefix: ${snippet.prefix} (Built-in)`,
            snippet
        });
    }

    // Add custom snippets
    for (const [name, snippet] of Object.entries(custom)) {
        allSnippets.push({
            label: `⚙️ ${name}`,
            description: snippet.description,
            detail: `Prefix: ${snippet.prefix} (Custom)`,
            snippet
        });
    }

    const selectedSnippet = await vscode.window.showQuickPick(allSnippets, {
        placeHolder: 'Select a snippet to view details',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selectedSnippet) {
        const snippetPreview = selectedSnippet.snippet.body.join('\n');
        const message = `**${selectedSnippet.label}**\n\n**Prefix:** ${selectedSnippet.snippet.prefix}\n\n**Description:** ${selectedSnippet.snippet.description}\n\n**Body:**\n\`\`\`\n${snippetPreview}\n\`\`\``;

        const action = await vscode.window.showInformationMessage(
            `Snippet Details:\n${selectedSnippet.snippet.description}\n\nPrefix: ${selectedSnippet.snippet.prefix}`,
            'Insert Snippet',
            'Close'
        );

        if (action === 'Insert Snippet') {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const snippet = new vscode.SnippetString(selectedSnippet.snippet.body.join('\n'));
                await activeEditor.insertSnippet(snippet);
            }
        }
    }
}

async function editCustomSnippet(context: vscode.ExtensionContext, customSnippets: DroolsSnippetCollection): Promise<void> {
    if (Object.keys(customSnippets).length === 0) {
        vscode.window.showInformationMessage('No custom snippets to edit.');
        return;
    }

    const snippetNames = Object.keys(customSnippets).map(name => ({
        label: name,
        description: customSnippets[name].description,
        detail: `Prefix: ${customSnippets[name].prefix}`
    }));

    const selectedSnippet = await vscode.window.showQuickPick(snippetNames, {
        placeHolder: 'Select a custom snippet to edit'
    });

    if (selectedSnippet) {
        // For simplicity, we'll recreate the snippet
        await createCustomSnippet(context);
    }
}

async function deleteCustomSnippet(context: vscode.ExtensionContext, customSnippets: DroolsSnippetCollection): Promise<void> {
    if (Object.keys(customSnippets).length === 0) {
        vscode.window.showInformationMessage('No custom snippets to delete.');
        return;
    }

    const snippetNames = Object.keys(customSnippets).map(name => ({
        label: name,
        description: customSnippets[name].description,
        detail: `Prefix: ${customSnippets[name].prefix}`
    }));

    const selectedSnippet = await vscode.window.showQuickPick(snippetNames, {
        placeHolder: 'Select a custom snippet to delete'
    });

    if (selectedSnippet) {
        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the snippet "${selectedSnippet.label}"?`,
            'Delete',
            'Cancel'
        );

        if (confirmation === 'Delete') {
            delete customSnippets[selectedSnippet.label];
            await saveAllCustomSnippets(context, customSnippets);
            vscode.window.showInformationMessage(`Snippet "${selectedSnippet.label}" deleted successfully.`);
        }
    }
}

async function resetSnippetsToDefaults(context: vscode.ExtensionContext): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
        'This will delete all custom snippets and reset to default snippets. This action cannot be undone.',
        'Reset',
        'Cancel'
    );

    if (confirmation === 'Reset') {
        await context.globalState.update('drools.customSnippets', {});
        vscode.window.showInformationMessage('Snippets reset to defaults successfully.');
    }
}

export function deactivate(): Thenable<void> | undefined {
    console.log('Drools VSCode Extension is now deactivated!');
    outputChannel.appendLine('Drools VSCode Extension deactivated');

    // Dispose of fallback providers
    fallbackDisposables.forEach(disposable => disposable.dispose());
    fallbackDisposables = [];

    // Dispose of configuration manager
    if (configManager) {
        configManager.dispose();
    }

    if (!client) {
        outputChannel.dispose();
        return undefined;
    }

    return client.stop().then(() => {
        outputChannel.appendLine('Language server stopped successfully');
        outputChannel.dispose();
    }).catch((error) => {
        outputChannel.appendLine(`Error stopping language server: ${error.message}`);
        outputChannel.dispose();
    });
}