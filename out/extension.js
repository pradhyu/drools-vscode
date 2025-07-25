"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
const path = __importStar(require("path"));
let client;
function activate(context) {
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
        const formatOnSave = config.get('formatOnSave', true);
        if (!formatOnSave) {
            return;
        }
        // Get editor configuration for formatting options
        const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
        const insertSpaces = editorConfig.get('insertSpaces', true);
        const tabSize = editorConfig.get('tabSize', 4);
        // Wait for formatting to complete
        event.waitUntil(Promise.resolve(vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, {
            insertSpaces: insertSpaces,
            tabSize: tabSize
        })).then((edits) => {
            const textEdits = edits;
            if (textEdits && textEdits.length > 0) {
                console.log(`Applied ${textEdits.length} formatting edits to ${document.fileName}`);
            }
            return textEdits || [];
        }).catch((error) => {
            console.error('Error during format-on-save:', error);
            // Return empty array on error to prevent save from failing
            return [];
        }));
    });
    context.subscriptions.push(onDidOpenTextDocument, setLanguageCommand, formatOnSaveHandler);
}
exports.activate = activate;
function startLanguageServer(context) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));
    // The debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    // Options to control the language client
    const clientOptions = {
        // Register the server for drools documents
        documentSelector: [{ scheme: 'file', language: 'drools' }],
        synchronize: {
            // Notify the server about file changes to '.drl files contained in the workspace
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.drl')
        }
    };
    // Create the language client and start the client.
    client = new node_1.LanguageClient('droolsLanguageServer', 'Drools Language Server', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
}
function deactivate() {
    console.log('Drools VSCode Extension is now deactivated!');
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map