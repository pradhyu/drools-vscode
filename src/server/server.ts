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
    TextEdit,
    FoldingRangeParams,
    FoldingRange,
    DocumentSymbolParams,
    DocumentSymbol,
    WorkspaceSymbolParams,
    WorkspaceSymbol,
    DefinitionParams,
    Location
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsParser, ParseResult, IncrementalParseOptions } from './parser/droolsParser';
import { DroolsAST } from './parser/ast';
import { DroolsDiagnosticProvider, DiagnosticSettings } from './providers/diagnosticProvider';
import { DroolsCompletionProvider, CompletionSettings } from './providers/completionProvider';
import { DroolsFormattingProvider, FormattingSettings } from './providers/formattingProvider';
import { DroolsFoldingProvider, FoldingSettings } from './providers/foldingProvider';
import { DroolsSymbolProvider, SymbolSettings } from './providers/symbolProvider';
import { PerformanceManager, PerformanceSettings } from './performance/performanceManager';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create parser instance
const parser = new DroolsParser();

// Performance manager instance
let performanceManager: PerformanceManager;

// Error tracking and recovery state
let serverErrorCount = 0;
let lastErrorTime = 0;
const MAX_ERRORS_PER_MINUTE = 10;
const ERROR_RESET_INTERVAL = 60000; // 1 minute

// Logging utility
function logError(context: string, error: any, uri?: string): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    
    connection.console.error(`[${timestamp}] ${context}${uri ? ` (${uri})` : ''}: ${errorMessage}`);
    if (stack) {
        connection.console.error(`Stack trace: ${stack}`);
    }
    
    // Track error frequency
    const now = Date.now();
    if (now - lastErrorTime > ERROR_RESET_INTERVAL) {
        serverErrorCount = 0;
    }
    serverErrorCount++;
    lastErrorTime = now;
    
    // If too many errors, suggest restart
    if (serverErrorCount > MAX_ERRORS_PER_MINUTE) {
        connection.console.error(`Too many errors (${serverErrorCount}) in the last minute. Consider restarting the language server.`);
    }
}

function logInfo(context: string, message: string, uri?: string): void {
    const timestamp = new Date().toISOString();
    connection.console.log(`[${timestamp}] ${context}${uri ? ` (${uri})` : ''}: ${message}`);
}

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
            documentRangeFormattingProvider: true,
            // Tell the client that this server supports folding ranges.
            foldingRangeProvider: true,
            // Tell the client that this server supports document symbols.
            documentSymbolProvider: true,
            // Tell the client that this server supports workspace symbols.
            workspaceSymbolProvider: true,
            // Tell the client that this server supports go-to-definition.
            definitionProvider: true
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
    
    // Initialize performance manager with default settings
    const performanceSettings: PerformanceSettings = {
        enableIncrementalParsing: defaultSettings.performance.enableIncrementalParsing,
        enableCaching: defaultSettings.performance.enableCaching,
        debounceDelay: defaultSettings.performance.debounceDelay,
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        maxFileSize: defaultSettings.server.maxFileSize,
        gcInterval: 5 * 60 * 1000 // 5 minutes
    };
    performanceManager = new PerformanceManager(performanceSettings);
});

// The comprehensive settings interface matching the configuration structure
interface DroolsSettings {
    features: {
        enableSyntaxHighlighting: boolean;
        enableCompletion: boolean;
        enableDiagnostics: boolean;
        enableFormatting: boolean;
        enableBracketMatching: boolean;
        enableSnippets: boolean;
        enableSymbolProvider: boolean;
    };
    completion: {
        enableKeywords: boolean;
        enableFactTypes: boolean;
        enableFunctions: boolean;
        enableVariables: boolean;
        maxItems: number;
        triggerCharacters: string[];
    };
    diagnostics: {
        enableSyntaxValidation: boolean;
        enableSemanticValidation: boolean;
        enableBestPracticeWarnings: boolean;
        maxProblems: number;
        severity: {
            syntaxErrors: 'error' | 'warning' | 'info' | 'hint';
            semanticErrors: 'error' | 'warning' | 'info' | 'hint';
            bestPracticeViolations: 'error' | 'warning' | 'info' | 'hint';
        };
    };
    formatting: {
        formatOnSave: boolean;
        formatOnType: boolean;
        indentSize: number;
        insertSpaces: boolean;
        trimTrailingWhitespace: boolean;
        insertFinalNewline: boolean;
        spaceAroundOperators: boolean;
        spaceAfterCommas: boolean;
        alignRuleBlocks: boolean;
        preserveBlankLines: number;
    };
    snippets: {
        enableBuiltIn: boolean;
        enableCustom: boolean;
        customPath: string;
        triggerCharacters: string[];
        showInCompletion: boolean;
        templates: {
            basicRule: boolean;
            conditionalRule: boolean;
            functionDefinition: boolean;
            importStatement: boolean;
            packageDeclaration: boolean;
            globalDeclaration: boolean;
            queryDefinition: boolean;
        };
    };
    server: {
        maxFileSize: number;
        timeout: number;
        logLevel: 'off' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    };
    performance: {
        enableIncrementalParsing: boolean;
        enableCaching: boolean;
        debounceDelay: number;
    };
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: DroolsSettings = {
    features: {
        enableSyntaxHighlighting: true,
        enableCompletion: true,
        enableDiagnostics: true,
        enableFormatting: true,
        enableBracketMatching: true,
        enableSnippets: true,
        enableSymbolProvider: true,
    },
    completion: {
        enableKeywords: true,
        enableFactTypes: true,
        enableFunctions: true,
        enableVariables: true,
        maxItems: 50,
        triggerCharacters: ['.', ' ', '(', ','],
    },
    diagnostics: {
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true,
        maxProblems: 1000,
        severity: {
            syntaxErrors: 'error',
            semanticErrors: 'error',
            bestPracticeViolations: 'warning',
        },
    },
    formatting: {
        formatOnSave: true,
        formatOnType: false,
        indentSize: 4,
        insertSpaces: true,
        trimTrailingWhitespace: true,
        insertFinalNewline: true,
        spaceAroundOperators: true,
        spaceAfterCommas: true,
        alignRuleBlocks: true,
        preserveBlankLines: 1,
    },
    snippets: {
        enableBuiltIn: true,
        enableCustom: true,
        customPath: '',
        triggerCharacters: ['r', 'f', 'i', 'p', 'g', 'q', 'w', 't'],
        showInCompletion: true,
        templates: {
            basicRule: true,
            conditionalRule: true,
            functionDefinition: true,
            importStatement: true,
            packageDeclaration: true,
            globalDeclaration: true,
            queryDefinition: true,
        },
    },
    server: {
        maxFileSize: 5242880,
        timeout: 30000,
        logLevel: 'info',
    },
    performance: {
        enableIncrementalParsing: true,
        enableCaching: true,
        debounceDelay: 300,
    },
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

    // Update performance manager settings
    if (performanceManager && change.settings?.drools?.performance) {
        const perfSettings = change.settings.drools.performance;
        performanceManager.updateSettings({
            enableIncrementalParsing: perfSettings.enableIncrementalParsing,
            enableCaching: perfSettings.enableCaching,
            debounceDelay: perfSettings.debounceDelay
        });
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
    if (performanceManager) {
        performanceManager.clearDocumentCache(e.document.uri);
    }
});

// Helper function to get or parse document with error handling and performance optimization
async function getOrParseDocument(textDocument: TextDocument, changes?: any[]): Promise<ParseResult> {
    try {
        if (!performanceManager) {
            // Fallback if performance manager not initialized
            return parser.parse(textDocument.getText());
        }

        // Check if document is too large for full processing
        if (performanceManager.isDocumentTooLarge(textDocument)) {
            logInfo('Parser', `Document too large (${textDocument.getText().length} chars), using simplified parsing`, textDocument.uri);
            // For very large documents, use a simplified parsing approach
            return parser.parse(textDocument.getText().substring(0, performanceManager['settings'].maxFileSize));
        }

        // Try to get cached result
        const cachedResult = performanceManager.getCachedParseResult(textDocument.uri, textDocument);
        if (cachedResult) {
            logInfo('Parser', `Using cached parse result for version ${textDocument.version}`, textDocument.uri);
            return cachedResult;
        }
        
        logInfo('Parser', `Parsing document version ${textDocument.version}`, textDocument.uri);
        
        // Get previous AST for incremental parsing (try cache again for previous version)
        const settings = await getDocumentSettings(textDocument.uri);
        let previousAST: DroolsAST | undefined = undefined;
        
        // For incremental parsing, we might want to use a previous version's AST
        // For now, we'll start fresh each time but this could be optimized further
        
        const parseOptions: IncrementalParseOptions = {
            enableIncrementalParsing: settings.performance.enableIncrementalParsing && changes && changes.length > 0,
            ranges: settings.performance.enableIncrementalParsing ? 
                performanceManager.getIncrementalParsingRanges(textDocument, changes || []) : undefined,
            previousAST
        };

        // Parse the document with performance optimizations
        const parseResult = parser.parse(textDocument.getText(), parseOptions);
        
        // Log parsing results
        if (parseResult.errors.length > 0) {
            logInfo('Parser', `Parsing completed with ${parseResult.errors.length} errors in ${parser.getParseTime()}ms`, textDocument.uri);
        } else {
            logInfo('Parser', `Parsing completed successfully in ${parser.getParseTime()}ms`, textDocument.uri);
        }
        
        // Cache the result
        performanceManager.cacheParseResult(textDocument.uri, textDocument, parseResult);
        
        return parseResult;
        
    } catch (error) {
        logError('Parser', error, textDocument.uri);
        
        // Return a minimal parse result on critical failure
        return {
            ast: {
                type: 'DroolsFile',
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                packageDeclaration: undefined,
                imports: [],
                globals: [],
                functions: [],
                rules: [],
                queries: [],
                declares: []
            },
            errors: [{
                message: `Critical parsing error: ${error instanceof Error ? error.message : String(error)}`,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                severity: 'error'
            }]
        };
    }
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    // Use debounced validation for performance
    if (performanceManager) {
        performanceManager.debounce(
            `validate-${change.document.uri}`,
            validateTextDocument,
            change.document
        );
    } else {
        validateTextDocument(change.document);
    }
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    try {
        logInfo('Validation', 'Starting document validation', textDocument.uri);
        
        // Get the settings for this document
        const settings = await getDocumentSettings(textDocument.uri);
        
        if (!settings.features.enableDiagnostics) {
            logInfo('Validation', 'Diagnostics disabled, clearing diagnostics', textDocument.uri);
            connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
            return;
        }

        // Create settings hash for cache validation
        const settingsHash = JSON.stringify({
            maxProblems: settings.diagnostics.maxProblems,
            syntaxValidation: settings.diagnostics.enableSyntaxValidation,
            semanticValidation: settings.diagnostics.enableSemanticValidation,
            bestPractices: settings.diagnostics.enableBestPracticeWarnings
        });

        // Try to get cached diagnostics
        let diagnostics: Diagnostic[] | null = null;
        if (performanceManager) {
            diagnostics = performanceManager.getCachedDiagnostics(textDocument.uri, textDocument, settingsHash);
        }

        if (diagnostics) {
            logInfo('Validation', `Using cached diagnostics (${diagnostics.length} items)`, textDocument.uri);
        } else {
            // Use the parser to validate Drools syntax
            const parseResult = await getOrParseDocument(textDocument);
            
            // Create diagnostic settings from server settings
            const diagnosticSettings: DiagnosticSettings = {
                maxNumberOfProblems: settings.diagnostics.maxProblems,
                enableSyntaxValidation: settings.diagnostics.enableSyntaxValidation,
                enableSemanticValidation: settings.diagnostics.enableSemanticValidation,
                enableBestPracticeWarnings: settings.diagnostics.enableBestPracticeWarnings
            };
            
            // Create diagnostic provider and get diagnostics
            const diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);
            diagnostics = diagnosticProvider.provideDiagnostics(
                textDocument, 
                parseResult.ast, 
                parseResult.errors
            );

            // Cache the diagnostics
            if (performanceManager) {
                performanceManager.cacheDiagnostics(textDocument.uri, textDocument, diagnostics, settingsHash);
            }

            logInfo('Validation', `Generated ${diagnostics.length} diagnostics`, textDocument.uri);
        }

        // Send the computed diagnostics to VSCode.
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
        
    } catch (error) {
        logError('Validation', error, textDocument.uri);
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
    
    if (!settings.features.enableDiagnostics) {
        return [];
    }

    // Use the parser to validate Drools syntax
    const parseResult = await getOrParseDocument(textDocument);
    
    // Create diagnostic settings from server settings
    const diagnosticSettings: DiagnosticSettings = {
        maxNumberOfProblems: settings.diagnostics.maxProblems,
        enableSyntaxValidation: settings.diagnostics.enableSyntaxValidation,
        enableSemanticValidation: settings.diagnostics.enableSemanticValidation,
        enableBestPracticeWarnings: settings.diagnostics.enableBestPracticeWarnings
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
            if (!settings.features.enableCompletion) {
                return [];
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create completion settings from server settings
            const completionSettings: CompletionSettings = {
                enableKeywordCompletion: settings.completion.enableKeywords,
                enableFactTypeCompletion: settings.completion.enableFactTypes,
                enableFunctionCompletion: settings.completion.enableFunctions,
                enableVariableCompletion: settings.completion.enableVariables,
                maxCompletionItems: settings.completion.maxItems
            };
            
            // Create completion provider and get completions
            const completionProvider = new DroolsCompletionProvider(completionSettings);
            return completionProvider.provideCompletions(
                document,
                textDocumentPosition.position,
                parseResult
            );
            
        } catch (error) {
            logError('Completion', error, textDocumentPosition.textDocument.uri);
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
            logError('CompletionResolve', error);
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
            if (!settings.features.enableCompletion) {
                return null;
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create completion settings from server settings
            const completionSettings: CompletionSettings = {
                enableKeywordCompletion: settings.completion.enableKeywords,
                enableFactTypeCompletion: settings.completion.enableFactTypes,
                enableFunctionCompletion: settings.completion.enableFunctions,
                enableVariableCompletion: settings.completion.enableVariables,
                maxCompletionItems: settings.completion.maxItems
            };
            
            // Create completion provider and get signature help
            const completionProvider = new DroolsCompletionProvider(completionSettings);
            return completionProvider.provideSignatureHelp(
                document,
                textDocumentPosition.position,
                parseResult
            );
            
        } catch (error) {
            logError('SignatureHelp', error, textDocumentPosition.textDocument.uri);
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

            const settings = await getDocumentSettings(params.textDocument.uri);
            if (!settings.features.enableFormatting) {
                return [];
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create formatting settings from server settings
            const formattingSettings: FormattingSettings = {
                insertSpaces: settings.formatting.insertSpaces,
                tabSize: settings.formatting.indentSize,
                indentSize: settings.formatting.indentSize,
                maxLineLength: 120, // Default value
                trimTrailingWhitespace: settings.formatting.trimTrailingWhitespace,
                insertFinalNewline: settings.formatting.insertFinalNewline,
                spaceAroundOperators: settings.formatting.spaceAroundOperators,
                spaceAfterKeywords: true, // Default value
                alignRuleBlocks: settings.formatting.alignRuleBlocks
            };
            
            // Create formatting provider with configuration settings
            const formattingProvider = new DroolsFormattingProvider(formattingSettings);
            
            return formattingProvider.formatDocument(
                document,
                params.options,
                parseResult
            );
            
        } catch (error) {
            logError('DocumentFormatting', error, params.textDocument.uri);
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

            const settings = await getDocumentSettings(params.textDocument.uri);
            if (!settings.features.enableFormatting) {
                return [];
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create formatting settings from server settings, with options override
            const formattingSettings: FormattingSettings = {
                insertSpaces: params.options.insertSpaces ?? settings.formatting.insertSpaces,
                tabSize: params.options.tabSize ?? settings.formatting.indentSize,
                indentSize: params.options.insertSpaces ? (params.options.tabSize ?? settings.formatting.indentSize) : 1,
                maxLineLength: 120, // Default value
                trimTrailingWhitespace: settings.formatting.trimTrailingWhitespace,
                insertFinalNewline: settings.formatting.insertFinalNewline,
                spaceAroundOperators: settings.formatting.spaceAroundOperators,
                spaceAfterKeywords: true, // Default value
                alignRuleBlocks: settings.formatting.alignRuleBlocks
            };
            
            const configuredProvider = new DroolsFormattingProvider(formattingSettings);
            
            return configuredProvider.formatRange(
                document,
                params.range,
                parseResult
            );
            
        } catch (error) {
            logError('RangeFormatting', error, params.textDocument.uri);
            return [];
        }
    }
);

// Folding range provider
connection.onFoldingRanges(
    async (params: FoldingRangeParams): Promise<FoldingRange[]> => {
        try {
            const document = documents.get(params.textDocument.uri);
            if (!document) {
                return [];
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create folding provider with default settings
            const foldingProvider = new DroolsFoldingProvider();
            
            return foldingProvider.provideFoldingRanges(
                document,
                parseResult
            );
            
        } catch (error) {
            logError('FoldingRanges', error, params.textDocument.uri);
            return [];
        }
    }
);

// Document symbol provider
connection.onDocumentSymbol(
    async (params: DocumentSymbolParams): Promise<DocumentSymbol[]> => {
        try {
            const document = documents.get(params.textDocument.uri);
            if (!document) {
                return [];
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create symbol provider with default settings
            const symbolProvider = new DroolsSymbolProvider();
            
            return symbolProvider.provideDocumentSymbols(
                document,
                parseResult
            );
            
        } catch (error) {
            logError('DocumentSymbols', error, params.textDocument.uri);
            return [];
        }
    }
);

// Workspace symbol provider
connection.onWorkspaceSymbol(
    async (params: WorkspaceSymbolParams): Promise<WorkspaceSymbol[]> => {
        try {
            // Create symbol provider with default settings
            const symbolProvider = new DroolsSymbolProvider();
            
            // Get all parsed documents
            const allDocuments = new Map<string, { document: TextDocument; parseResult: ParseResult }>();
            
            for (const document of documents.all()) {
                const parseResult = await getOrParseDocument(document);
                allDocuments.set(document.uri, { document, parseResult });
            }
            
            return symbolProvider.provideWorkspaceSymbols(
                params,
                allDocuments
            );
            
        } catch (error) {
            logError('WorkspaceSymbols', error);
            return [];
        }
    }
);

// Go-to-definition provider
connection.onDefinition(
    async (params: DefinitionParams): Promise<Location[]> => {
        try {
            const document = documents.get(params.textDocument.uri);
            if (!document) {
                return [];
            }

            // Get parsed document
            const parseResult = await getOrParseDocument(document);
            
            // Create symbol provider with default settings
            const symbolProvider = new DroolsSymbolProvider();
            
            // Get all parsed documents for cross-file navigation
            const allDocuments = new Map<string, { document: TextDocument; parseResult: ParseResult }>();
            
            for (const doc of documents.all()) {
                const result = await getOrParseDocument(doc);
                allDocuments.set(doc.uri, { document: doc, parseResult: result });
            }
            
            return symbolProvider.provideDefinition(
                document,
                params.position,
                parseResult,
                allDocuments
            );
            
        } catch (error) {
            logError('GoToDefinition', error, params.textDocument.uri);
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
    // Cleanup performance manager before exit
    if (performanceManager) {
        performanceManager.dispose();
    }
    process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    connection.console.log('Received SIGTERM, shutting down gracefully...');
    if (performanceManager) {
        performanceManager.dispose();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    connection.console.log('Received SIGINT, shutting down gracefully...');
    if (performanceManager) {
        performanceManager.dispose();
    }
    process.exit(0);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();