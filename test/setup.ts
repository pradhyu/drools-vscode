/**
 * Test setup file for Jest
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock VSCode API for unit tests
const mockVSCode = {
    workspace: {
        getConfiguration: jest.fn(),
        onDidChangeConfiguration: jest.fn(),
        createFileSystemWatcher: jest.fn(),
        textDocuments: [],
        onDidOpenTextDocument: jest.fn(),
        onDidCloseTextDocument: jest.fn(),
        onDidChangeTextDocument: jest.fn(),
        fs: {
            readFile: jest.fn(),
            writeFile: jest.fn()
        }
    },
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showInputBox: jest.fn(),
        showQuickPick: jest.fn(),
        showSaveDialog: jest.fn(),
        showOpenDialog: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        setStatusBarMessage: jest.fn(),
        activeTextEditor: undefined
    },
    languages: {
        setTextDocumentLanguage: jest.fn(),
        registerCompletionItemProvider: jest.fn(),
        registerDocumentFormattingProvider: jest.fn(),
        registerDocumentRangeFormattingProvider: jest.fn(),
        registerFoldingRangeProvider: jest.fn(),
        registerDocumentSymbolProvider: jest.fn()
    },
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn()
    },
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path, toString: () => path }))
    },
    Range: jest.fn(),
    Position: jest.fn(),
    TextEdit: jest.fn(),
    CompletionItem: jest.fn(),
    CompletionItemKind: {},
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    SnippetString: jest.fn(),
    ExtensionContext: jest.fn()
};

// Mock the vscode module
jest.mock('vscode', () => mockVSCode, { virtual: true });

// Global test utilities
(global as any).createMockTextDocument = (content: string, uri: string = 'test://test.drl') => ({
    uri,
    fileName: uri,
    languageId: 'drools',
    version: 1,
    getText: jest.fn(() => content),
    lineAt: jest.fn((line: number) => ({
        text: content.split('\n')[line] || '',
        lineNumber: line
    })),
    lineCount: content.split('\n').length,
    positionAt: jest.fn((offset: number) => {
        const lines = content.split('\n');
        let currentOffset = 0;
        for (let i = 0; i < lines.length; i++) {
            if (currentOffset + lines[i].length >= offset) {
                return { line: i, character: offset - currentOffset };
            }
            currentOffset += lines[i].length + 1; // +1 for newline
        }
        return { line: lines.length - 1, character: lines[lines.length - 1].length };
    }),
    offsetAt: jest.fn((position: { line: number; character: number }) => {
        const lines = content.split('\n');
        let offset = 0;
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        return offset + position.character;
    })
});

// Mock language server connection for integration tests
(global as any).createMockConnection = () => ({
    console: {
        log: jest.fn(),
        error: jest.fn()
    },
    sendDiagnostics: jest.fn(),
    onInitialize: jest.fn(),
    onInitialized: jest.fn(),
    onCompletion: jest.fn(),
    onCompletionResolve: jest.fn(),
    onDocumentFormatting: jest.fn(),
    onDocumentRangeFormatting: jest.fn(),
    onFoldingRanges: jest.fn(),
    onDocumentSymbol: jest.fn(),
    onWorkspaceSymbol: jest.fn(),
    onDefinition: jest.fn(),
    onDidChangeConfiguration: jest.fn(),
    workspace: {
        getConfiguration: jest.fn()
    },
    client: {
        register: jest.fn()
    },
    listen: jest.fn()
});