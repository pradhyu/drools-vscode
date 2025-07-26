/**
 * Fallback provider for basic Drools language features when language server is unavailable
 */

import * as vscode from 'vscode';

export class DroolsFallbackProvider {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Register fallback providers when language server is unavailable
     */
    public registerFallbackProviders(context: vscode.ExtensionContext): vscode.Disposable[] {
        this.outputChannel.appendLine('Registering fallback providers...');
        
        const disposables: vscode.Disposable[] = [];

        // Basic completion provider
        const completionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'drools' },
            new DroolsFallbackCompletionProvider(this.outputChannel),
            ' ', '\n', '.'
        );
        disposables.push(completionProvider);

        // Basic hover provider
        const hoverProvider = vscode.languages.registerHoverProvider(
            { scheme: 'file', language: 'drools' },
            new DroolsFallbackHoverProvider(this.outputChannel)
        );
        disposables.push(hoverProvider);

        // Basic document symbol provider
        const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
            { scheme: 'file', language: 'drools' },
            new DroolsFallbackSymbolProvider(this.outputChannel)
        );
        disposables.push(symbolProvider);

        // Basic diagnostic provider (syntax errors only)
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('drools-fallback');
        const diagnosticProvider = new DroolsFallbackDiagnosticProvider(this.outputChannel, diagnosticCollection);
        
        const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.languageId === 'drools') {
                diagnosticProvider.updateDiagnostics(event.document);
            }
        });
        
        const documentOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === 'drools') {
                diagnosticProvider.updateDiagnostics(document);
            }
        });

        disposables.push(diagnosticCollection, documentChangeListener, documentOpenListener);

        this.outputChannel.appendLine(`Registered ${disposables.length} fallback providers`);
        return disposables;
    }
}

/**
 * Fallback completion provider with basic Drools keywords
 */
class DroolsFallbackCompletionProvider implements vscode.CompletionItemProvider {
    private outputChannel: vscode.OutputChannel;
    private keywords: vscode.CompletionItem[];

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.keywords = this.createKeywordCompletions();
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        try {
            const line = document.lineAt(position).text;
            const linePrefix = line.substring(0, position.character);

            // Provide keyword completions
            return this.keywords.filter(item => 
                item.label.toString().toLowerCase().startsWith(linePrefix.trim().toLowerCase())
            );
        } catch (error) {
            this.outputChannel.appendLine(`Fallback completion error: ${error}`);
            return [];
        }
    }

    private createKeywordCompletions(): vscode.CompletionItem[] {
        const keywords = [
            { label: 'rule', detail: 'Rule declaration', snippet: 'rule "${1:RuleName}"\nwhen\n\t${2:condition}\nthen\n\t${3:action}\nend' },
            { label: 'when', detail: 'Rule condition clause' },
            { label: 'then', detail: 'Rule action clause' },
            { label: 'end', detail: 'End rule declaration' },
            { label: 'package', detail: 'Package declaration', snippet: 'package ${1:com.example};' },
            { label: 'import', detail: 'Import statement', snippet: 'import ${1:com.example.FactType};' },
            { label: 'global', detail: 'Global variable declaration', snippet: 'global ${1:Type} ${2:variableName};' },
            { label: 'function', detail: 'Function declaration', snippet: 'function ${1:ReturnType} ${2:functionName}(${3:parameters}) {\n\t${4:body}\n}' },
            { label: 'query', detail: 'Query declaration', snippet: 'query "${1:QueryName}"(${2:parameters})\n\t${3:conditions}\nend' },
            { label: 'declare', detail: 'Type declaration', snippet: 'declare ${1:TypeName}\n\t${2:field} : ${3:Type}\nend' },
            { label: 'salience', detail: 'Rule priority attribute' },
            { label: 'no-loop', detail: 'Prevent rule from looping' },
            { label: 'agenda-group', detail: 'Rule agenda group' },
            { label: 'activation-group', detail: 'Rule activation group' },
            { label: 'exists', detail: 'Existential quantifier', snippet: 'exists(${1:condition})' },
            { label: 'not', detail: 'Negation', snippet: 'not(${1:condition})' },
            { label: 'eval', detail: 'Evaluate expression', snippet: 'eval(${1:expression})' },
            { label: 'insert', detail: 'Insert fact', snippet: 'insert(${1:fact});' },
            { label: 'update', detail: 'Update fact', snippet: 'update(${1:fact});' },
            { label: 'modify', detail: 'Modify fact', snippet: 'modify(${1:fact}) { ${2:modifications} }' },
            { label: 'delete', detail: 'Delete fact', snippet: 'delete(${1:fact});' },
            { label: 'retract', detail: 'Retract fact', snippet: 'retract(${1:fact});' }
        ];

        return keywords.map(kw => {
            const item = new vscode.CompletionItem(kw.label, vscode.CompletionItemKind.Keyword);
            item.detail = kw.detail;
            if (kw.snippet) {
                item.insertText = new vscode.SnippetString(kw.snippet);
            }
            return item;
        });
    }
}

/**
 * Fallback hover provider with basic keyword information
 */
class DroolsFallbackHoverProvider implements vscode.HoverProvider {
    private outputChannel: vscode.OutputChannel;
    private keywordInfo: Map<string, string>;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.keywordInfo = new Map([
            ['rule', 'Defines a business rule with conditions and actions'],
            ['when', 'Specifies the conditions that must be met for the rule to fire'],
            ['then', 'Specifies the actions to execute when the rule conditions are met'],
            ['end', 'Marks the end of a rule, function, query, or declare block'],
            ['package', 'Declares the package namespace for the rules file'],
            ['import', 'Imports Java classes or static methods for use in rules'],
            ['global', 'Declares a global variable accessible to all rules'],
            ['function', 'Defines a function that can be called from rules'],
            ['query', 'Defines a query to retrieve facts from working memory'],
            ['declare', 'Declares a new fact type'],
            ['salience', 'Sets the priority of a rule (higher values fire first)'],
            ['no-loop', 'Prevents a rule from firing again due to its own actions'],
            ['exists', 'Tests for the existence of facts matching a pattern'],
            ['not', 'Tests for the absence of facts matching a pattern'],
            ['eval', 'Evaluates a boolean expression'],
            ['insert', 'Inserts a new fact into working memory'],
            ['update', 'Updates an existing fact in working memory'],
            ['modify', 'Modifies an existing fact with new values'],
            ['delete', 'Removes a fact from working memory'],
            ['retract', 'Removes a fact from working memory (alias for delete)']
        ]);
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        try {
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return null;
            }

            const word = document.getText(wordRange);
            const info = this.keywordInfo.get(word.toLowerCase());
            
            if (info) {
                return new vscode.Hover(
                    new vscode.MarkdownString(`**${word}** - ${info}`),
                    wordRange
                );
            }

            return null;
        } catch (error) {
            this.outputChannel.appendLine(`Fallback hover error: ${error}`);
            return null;
        }
    }
}

/**
 * Fallback symbol provider for basic document outline
 */
class DroolsFallbackSymbolProvider implements vscode.DocumentSymbolProvider {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        try {
            const symbols: vscode.DocumentSymbol[] = [];
            const text = document.getText();
            const lines = text.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Match rule declarations
                const ruleMatch = line.match(/^rule\s+"([^"]+)"|^rule\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (ruleMatch) {
                    const ruleName = ruleMatch[1] || ruleMatch[2];
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        ruleName,
                        'Rule',
                        vscode.SymbolKind.Function,
                        range,
                        range
                    );
                    symbols.push(symbol);
                }

                // Match function declarations
                const functionMatch = line.match(/^function\s+\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (functionMatch) {
                    const functionName = functionMatch[1];
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        functionName,
                        'Function',
                        vscode.SymbolKind.Method,
                        range,
                        range
                    );
                    symbols.push(symbol);
                }

                // Match query declarations
                const queryMatch = line.match(/^query\s+"([^"]+)"/);
                if (queryMatch) {
                    const queryName = queryMatch[1];
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        queryName,
                        'Query',
                        vscode.SymbolKind.Interface,
                        range,
                        range
                    );
                    symbols.push(symbol);
                }

                // Match global declarations
                const globalMatch = line.match(/^global\s+\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                if (globalMatch) {
                    const globalName = globalMatch[1];
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        globalName,
                        'Global',
                        vscode.SymbolKind.Variable,
                        range,
                        range
                    );
                    symbols.push(symbol);
                }
            }

            return symbols;
        } catch (error) {
            this.outputChannel.appendLine(`Fallback symbol provider error: ${error}`);
            return [];
        }
    }
}

/**
 * Fallback diagnostic provider for basic syntax checking
 */
class DroolsFallbackDiagnosticProvider {
    private outputChannel: vscode.OutputChannel;
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(outputChannel: vscode.OutputChannel, diagnosticCollection: vscode.DiagnosticCollection) {
        this.outputChannel = outputChannel;
        this.diagnosticCollection = diagnosticCollection;
    }

    updateDiagnostics(document: vscode.TextDocument): void {
        try {
            const diagnostics: vscode.Diagnostic[] = [];
            const text = document.getText();
            const lines = text.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();

                // Skip empty lines and comments
                if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
                    continue;
                }

                // Check for unmatched brackets
                this.checkBrackets(line, i, diagnostics);

                // Check for missing semicolons on certain statements
                this.checkMissingSemicolons(trimmedLine, i, diagnostics);

                // Check for basic rule structure
                this.checkRuleStructure(trimmedLine, i, diagnostics);
            }

            this.diagnosticCollection.set(document.uri, diagnostics);
        } catch (error) {
            this.outputChannel.appendLine(`Fallback diagnostic error: ${error}`);
        }
    }

    private checkBrackets(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
        const brackets = [
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '[', close: ']' }
        ];

        for (const bracket of brackets) {
            const stack: number[] = [];
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === bracket.open) {
                    stack.push(i);
                } else if (char === bracket.close) {
                    if (stack.length === 0) {
                        const diagnostic = new vscode.Diagnostic(
                            new vscode.Range(lineNumber, i, lineNumber, i + 1),
                            `Unmatched closing ${bracket.close}`,
                            vscode.DiagnosticSeverity.Error
                        );
                        diagnostic.source = 'drools-fallback';
                        diagnostics.push(diagnostic);
                    } else {
                        stack.pop();
                    }
                }
            }
            
            // Report unmatched opening brackets
            for (const openIndex of stack) {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, openIndex, lineNumber, openIndex + 1),
                    `Unmatched opening ${bracket.open}`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'drools-fallback';
                diagnostics.push(diagnostic);
            }
        }
    }

    private checkMissingSemicolons(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
        // Check statements that should end with semicolons
        const shouldEndWithSemicolon = [
            /^package\s+/,
            /^import\s+/,
            /^global\s+/
        ];

        for (const pattern of shouldEndWithSemicolon) {
            if (pattern.test(line) && !line.endsWith(';')) {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, line.length - 1, lineNumber, line.length),
                    'Statement should end with semicolon',
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.source = 'drools-fallback';
                diagnostics.push(diagnostic);
            }
        }
    }

    private checkRuleStructure(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
        // Check for malformed rule declarations
        if (line.startsWith('rule ')) {
            if (!line.match(/^rule\s+"[^"]+"\s*$/) && !line.match(/^rule\s+[a-zA-Z_][a-zA-Z0-9_]*\s*$/)) {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, 0, lineNumber, line.length),
                    'Invalid rule declaration. Use: rule "RuleName" or rule RuleName',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'drools-fallback';
                diagnostics.push(diagnostic);
            }
        }

        // Check for malformed function declarations
        if (line.startsWith('function ')) {
            if (!line.match(/^function\s+\w+\s+\w+\s*\([^)]*\)\s*\{?\s*$/)) {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(lineNumber, 0, lineNumber, line.length),
                    'Invalid function declaration. Use: function ReturnType functionName(parameters)',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'drools-fallback';
                diagnostics.push(diagnostic);
            }
        }
    }
}