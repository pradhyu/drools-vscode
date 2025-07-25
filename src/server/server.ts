import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    DocumentDiagnosticReportKind,
    type DocumentDiagnosticReport,
    DocumentFormattingParams,
    DocumentRangeFormattingParams,
    TextEdit
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsParser, ParseResult } from './parser/droolsParser';
import { DroolsAST } from './parser/ast';
import { DroolsDiagnosticProvider, DiagnosticSettings } from './providers/diagnosticProvider';
import { DroolsCompletionProvider, CompletionSettings } from './providers/completionProvider';
import { DroolsFormattingProvider, FormattingSettings } from './providers/formattingProvider';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create parser instance
const parser = new DroolsParser();

// Cache parsed documents
const documentCache: Map<string, { version: number; parseResult: ParseResult }> = new Map();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
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
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
interface DroolsSettings {
    formatOnSave: boolean;
    maxNumberOfProblems: number;
    enableDiagnostics: boolean;
    enableCompletion: boolean;
    enableSyntaxValidation: boolean;
    enableSemanticValidation: boolean;
    enableBestPracticeWarnings: boolean;
    enableKeywordCompletion: boolean;
    enableFactTypeCompletion: boolean;
    enableFunctionCompletion: boolean;
    enableVariableCompletion: boolean;
    maxCompletionItems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: DroolsSettings = { 
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
let globalSettings: DroolsSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<DroolsSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <DroolsSettings>(
            (change.settings.drools || defaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<DroolsSettings> {
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
function getOrParseDocument(textDocument: TextDocument): ParseResult {
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
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
        const diagnosticSettings: DiagnosticSettings = {
            maxNumberOfProblems: settings.maxNumberOfProblems,
            enableSyntaxValidation: settings.enableSyntaxValidation,
            enableSemanticValidation: settings.enableSemanticValidation,
            enableBestPracticeWarnings: settings.enableBestPracticeWarnings
        };
        
        // Create diagnostic provider and get diagnostics
        const diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);
        const diagnostics = diagnosticProvider.provideDiagnostics(
            textDocument, 
            parseResult.ast, 
            parseResult.errors
        );

        // Send the computed diagnostics to VSCode.
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
        
    } catch (error) {
        connection.console.error(`Error validating document ${textDocument.uri}: ${error}`);
        // Send empty diagnostics on error to clear any previous ones
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    }
}

connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        return <DocumentDiagnosticReport>{
            kind: DocumentDiagnosticReportKind.Full,
            items: await validateTextDocumentForDiagnostics(document)
        };
    } else {
        return <DocumentDiagnosticReport>{
            kind: DocumentDiagnosticReportKind.Full,
            items: []
        };
    }
});

async function validateTextDocumentForDiagnostics(textDocument: TextDocument): Promise<Diagnostic[]> {
    const settings = await getDocumentSettings(textDocument.uri);
    
    if (!settings.enableDiagnostics) {
        return [];
    }

    // Use the parser to validate Drools syntax
    const parseResult = getOrParseDocument(textDocument);
    
    // Create diagnostic settings from server settings
    const diagnosticSettings: DiagnosticSettings = {
        maxNumberOfProblems: settings.maxNumberOfProblems,
        enableSyntaxValidation: settings.enableSyntaxValidation,
        enableSemanticValidation: settings.enableSemanticValidation,
        enableBestPracticeWarnings: settings.enableBestPracticeWarnings
    };
    
    // Create diagnostic provider and get diagnostics
    const diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);
    return diagnosticProvider.provideDiagnostics(
        textDocument, 
        parseResult.ast, 
        parseResult.errors
    );
}

// Comprehensive completion provider
connection.onCompletion(
    async (textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
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
            const completionSettings: CompletionSettings = {
                enableKeywordCompletion: settings.enableKeywordCompletion,
                enableFactTypeCompletion: settings.enableFactTypeCompletion,
                enableFunctionCompletion: settings.enableFunctionCompletion,
                enableVariableCompletion: settings.enableVariableCompletion,
                maxCompletionItems: settings.maxCompletionItems
            };
            
            // Create completion provider and get completions
            const completionProvider = new DroolsCompletionProvider(completionSettings);
            return completionProvider.provideCompletions(
                document,
                textDocumentPosition.position,
                parseResult
            );
            
        } catch (error) {
            connection.console.error(`Error in completion: ${error}`);
            return [];
        }
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        try {
            // The new completion provider already provides all necessary information
            // in the initial completion items, so we just return the item as-is.
            // This handler can be used for lazy loading of expensive documentation
            // or additional details if needed in the future.
            return item;
        } catch (error) {
            connection.console.error(`Error in completion resolve: ${error}`);
            return item;
        }
    }
);

// Signature help provider
connection.onSignatureHelp(
    async (textDocumentPosition: TextDocumentPositionParams) => {
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
            const completionSettings: CompletionSettings = {
                enableKeywordCompletion: settings.enableKeywordCompletion,
                enableFactTypeCompletion: settings.enableFactTypeCompletion,
                enableFunctionCompletion: settings.enableFunctionCompletion,
                enableVariableCompletion: settings.enableVariableCompletion,
                maxCompletionItems: settings.maxCompletionItems
            };
            
            // Create completion provider and get signature help
            const completionProvider = new DroolsCompletionProvider(completionSettings);
            return completionProvider.provideSignatureHelp(
                document,
                textDocumentPosition.position,
                parseResult
            );
            
        } catch (error) {
            connection.console.error(`Error in signature help: ${error}`);
            return null;
        }
    }
);

// Document formatting provider
connection.onDocumentFormatting(
    async (params: DocumentFormattingParams): Promise<TextEdit[]> => {
        try {
            const document = documents.get(params.textDocument.uri);
            if (!document) {
                return [];
            }

            // Get parsed document
            const parseResult = getOrParseDocument(document);
            
            // Create formatting provider with default settings
            const formattingProvider = new DroolsFormattingProvider();
            
            return formattingProvider.formatDocument(
                document,
                params.options,
                parseResult
            );
            
        } catch (error) {
            connection.console.error(`Error in document formatting: ${error}`);
            return [];
        }
    }
);

// Document range formatting provider
connection.onDocumentRangeFormatting(
    async (params: DocumentRangeFormattingParams): Promise<TextEdit[]> => {
        try {
            const document = documents.get(params.textDocument.uri);
            if (!document) {
                return [];
            }

            // Get parsed document
            const parseResult = getOrParseDocument(document);
            
            // Create formatting provider with default settings
            const formattingProvider = new DroolsFormattingProvider();
            
            // Update settings from formatting options
            const formattingSettings: Partial<FormattingSettings> = {
                insertSpaces: params.options.insertSpaces,
                tabSize: params.options.tabSize,
                indentSize: params.options.insertSpaces ? params.options.tabSize : 1
            };
            
            const configuredProvider = new DroolsFormattingProvider(formattingSettings);
            
            return configuredProvider.formatRange(
                document,
                params.range,
                parseResult
            );
            
        } catch (error) {
            connection.console.error(`Error in range formatting: ${error}`);
            return [];
        }
    }
);

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