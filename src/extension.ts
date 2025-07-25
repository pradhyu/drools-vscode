import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import * as path from 'path';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('Drools VSCode Extension is now active!');

    // Start the language server
    startLanguageServer(context);

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

    // Register format-on-save functionality
    const formatOnSaveHandler = vscode.workspace.onWillSaveTextDocument(async (event) => {
        const document = event.document;

        // Only handle .drl files
        if (document.languageId !== 'drools') {
            return;
        }

        // Check if format-on-save is enabled
        const config = vscode.workspace.getConfiguration('drools', document.uri);
        const formatOnSave = config.get<boolean>('formatOnSave', true);

        if (!formatOnSave) {
            return;
        }

        // Get editor configuration for formatting options
        const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
        const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);
        const tabSize = editorConfig.get<number>('tabSize', 4);

        // Wait for formatting to complete
        event.waitUntil(
            Promise.resolve(
                vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, {
                    insertSpaces: insertSpaces,
                    tabSize: tabSize
                })
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

    context.subscriptions.push(onDidOpenTextDocument, setLanguageCommand, formatOnSaveHandler);
}

function startLanguageServer(context: vscode.ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));

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
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'droolsLanguageServer',
        'Drools Language Server',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    console.log('Drools VSCode Extension is now deactivated!');
    if (!client) {
        return undefined;
    }
    return client.stop();
}