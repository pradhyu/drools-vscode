"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const droolsParser_1 = require("./parser/droolsParser");
const diagnosticProvider_1 = require("./providers/diagnosticProvider");
const completionProvider_1 = require("./providers/completionProvider");
const formattingProvider_1 = require("./providers/formattingProvider");
// Create a connection for the server, using Node's IPC as a transport.
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Create a simple text document manager.
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// Create parser instance
const parser = new droolsParser_1.DroolsParser();
// Cache parsed documents
const documentCache = new Map();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
connection.onInitialize((params) => {
    const capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation);
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', ' ', '\n']
            },
            // Tell the client that this server supports signature help.
            signatureHelpProvider: {
                triggerCharacters: ['(', ',']
            },
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false
            },
            // Tell the client that this server supports document formatting.
            documentFormattingProvider: true,
            // Tell the client that this server supports range formatting.
            documentRangeFormattingProvider: true
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});
// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings = {
    formatOnSave: true,
    maxNumberOfProblems: 1000,
    enableDiagnostics: true,
    enableCompletion: true,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: true,
    enableKeywordCompletion: true,
    enableFactTypeCompletion: true,
    enableFunctionCompletion: true,
    enableVariableCompletion: true,
    maxCompletionItems: 50
};
let globalSettings = defaultSettings;
// Cache the settings of all open documents
const documentSettings = new Map();
connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    }
    else {
        globalSettings = ((change.settings.drools || defaultSettings));
    }
    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});
function getDocumentSettings(resource) {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'drools'
        });
        documentSettings.set(resource, result);
    }
    return result;
}
// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    documentCache.delete(e.document.uri);
});
// Helper function to get or parse document
function getOrParseDocument(textDocument) {
    const cached = documentCache.get(textDocument.uri);
    // Check if we have a cached result for this version
    if (cached && cached.version === textDocument.version) {
        return cached.parseResult;
    }
    // Parse the document
    const parseResult = parser.parse(textDocument.getText());
    // Cache the result
    documentCache.set(textDocument.uri, {
        version: textDocument.version,
        parseResult
    });
    return parseResult;
}
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});
async function validateTextDocument(textDocument) {
    try {
        // Get the settings for this document
        const settings = await getDocumentSettings(textDocument.uri);
        if (!settings.enableDiagnostics) {
            // Clear diagnostics if disabled
            connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
            return;
        }
        // Use the parser to validate Drools syntax
        const parseResult = getOrParseDocument(textDocument);
        // Create diagnostic settings from server settings
        const diagnosticSettings = {
            maxNumberOfProblems: settings.maxNumberOfProblems,
            enableSyntaxValidation: settings.enableSyntaxValidation,
            enableSemanticValidation: settings.enableSemanticValidation,
            enableBestPracticeWarnings: settings.enableBestPracticeWarnings
        };
        // Create diagnostic provider and get diagnostics
        const diagnosticProvider = new diagnosticProvider_1.DroolsDiagnosticProvider(diagnosticSettings);
        const diagnostics = diagnosticProvider.provideDiagnostics(textDocument, parseResult.ast, parseResult.errors);
        // Send the computed diagnostics to VSCode.
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
    catch (error) {
        connection.console.error(`Error validating document ${textDocument.uri}: ${error}`);
        // Send empty diagnostics on error to clear any previous ones
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    }
}
connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        return {
            kind: node_1.DocumentDiagnosticReportKind.Full,
            items: await validateTextDocumentForDiagnostics(document)
        };
    }
    else {
        return {
            kind: node_1.DocumentDiagnosticReportKind.Full,
            items: []
        };
    }
});
async function validateTextDocumentForDiagnostics(textDocument) {
    const settings = await getDocumentSettings(textDocument.uri);
    if (!settings.enableDiagnostics) {
        return [];
    }
    // Use the parser to validate Drools syntax
    const parseResult = getOrParseDocument(textDocument);
    // Create diagnostic settings from server settings
    const diagnosticSettings = {
        maxNumberOfProblems: settings.maxNumberOfProblems,
        enableSyntaxValidation: settings.enableSyntaxValidation,
        enableSemanticValidation: settings.enableSemanticValidation,
        enableBestPracticeWarnings: settings.enableBestPracticeWarnings
    };
    // Create diagnostic provider and get diagnostics
    const diagnosticProvider = new diagnosticProvider_1.DroolsDiagnosticProvider(diagnosticSettings);
    return diagnosticProvider.provideDiagnostics(textDocument, parseResult.ast, parseResult.errors);
}
// Comprehensive completion provider
connection.onCompletion(async (textDocumentPosition) => {
    try {
        const document = documents.get(textDocumentPosition.textDocument.uri);
        if (!document) {
            return [];
        }
        const settings = await getDocumentSettings(textDocumentPosition.textDocument.uri);
        if (!settings.enableCompletion) {
            return [];
        }
        // Get parsed document
        const parseResult = getOrParseDocument(document);
        // Create completion settings from server settings
        const completionSettings = {
            enableKeywordCompletion: settings.enableKeywordCompletion,
            enableFactTypeCompletion: settings.enableFactTypeCompletion,
            enableFunctionCompletion: settings.enableFunctionCompletion,
            enableVariableCompletion: settings.enableVariableCompletion,
            maxCompletionItems: settings.maxCompletionItems
        };
        // Create completion provider and get completions
        const completionProvider = new completionProvider_1.DroolsCompletionProvider(completionSettings);
        return completionProvider.provideCompletions(document, textDocumentPosition.position, parseResult);
    }
    catch (error) {
        connection.console.error(`Error in completion: ${error}`);
        return [];
    }
});
// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item) => {
    try {
        // The new completion provider already provides all necessary information
        // in the initial completion items, so we just return the item as-is.
        // This handler can be used for lazy loading of expensive documentation
        // or additional details if needed in the future.
        return item;
    }
    catch (error) {
        connection.console.error(`Error in completion resolve: ${error}`);
        return item;
    }
});
// Signature help provider
connection.onSignatureHelp(async (textDocumentPosition) => {
    try {
        const document = documents.get(textDocumentPosition.textDocument.uri);
        if (!document) {
            return null;
        }
        const settings = await getDocumentSettings(textDocumentPosition.textDocument.uri);
        if (!settings.enableCompletion) {
            return null;
        }
        // Get parsed document
        const parseResult = getOrParseDocument(document);
        // Create completion settings from server settings
        const completionSettings = {
            enableKeywordCompletion: settings.enableKeywordCompletion,
            enableFactTypeCompletion: settings.enableFactTypeCompletion,
            enableFunctionCompletion: settings.enableFunctionCompletion,
            enableVariableCompletion: settings.enableVariableCompletion,
            maxCompletionItems: settings.maxCompletionItems
        };
        // Create completion provider and get signature help
        const completionProvider = new completionProvider_1.DroolsCompletionProvider(completionSettings);
        return completionProvider.provideSignatureHelp(document, textDocumentPosition.position, parseResult);
    }
    catch (error) {
        connection.console.error(`Error in signature help: ${error}`);
        return null;
    }
});
// Document formatting provider
connection.onDocumentFormatting(async (params) => {
    try {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }
        // Get parsed document
        const parseResult = getOrParseDocument(document);
        // Create formatting provider with default settings
        const formattingProvider = new formattingProvider_1.DroolsFormattingProvider();
        return formattingProvider.formatDocument(document, params.options, parseResult);
    }
    catch (error) {
        connection.console.error(`Error in document formatting: ${error}`);
        return [];
    }
});
// Document range formatting provider
connection.onDocumentRangeFormatting(async (params) => {
    try {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }
        // Get parsed document
        const parseResult = getOrParseDocument(document);
        // Create formatting provider with default settings
        const formattingProvider = new formattingProvider_1.DroolsFormattingProvider();
        // Update settings from formatting options
        const formattingSettings = {
            insertSpaces: params.options.insertSpaces,
            tabSize: params.options.tabSize,
            indentSize: params.options.insertSpaces ? params.options.tabSize : 1
        };
        const configuredProvider = new formattingProvider_1.DroolsFormattingProvider(formattingSettings);
        return configuredProvider.formatRange(document, params.range, parseResult);
    }
    catch (error) {
        connection.console.error(`Error in range formatting: ${error}`);
        return [];
    }
});
// Error handling for unhandled exceptions
process.on('unhandledRejection', (reason, promise) => {
    connection.console.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
});
process.on('uncaughtException', (error) => {
    connection.console.error(`Uncaught exception: ${error}`);
    process.exit(1);
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map