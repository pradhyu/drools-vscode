/**
 * Completion provider for Drools language IntelliSense support
 */

import {
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    Position,
    InsertTextFormat,
    MarkupKind,
    SignatureHelp,
    SignatureInformation,
    ParameterInformation
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST, RuleNode, FunctionNode, GlobalNode } from '../parser/ast';
import { ParseResult } from '../parser/droolsParser';

export interface CompletionSettings {
    enableKeywordCompletion: boolean;
    enableFactTypeCompletion: boolean;
    enableFunctionCompletion: boolean;
    enableVariableCompletion: boolean;
    maxCompletionItems: number;
}

export interface CompletionContext {
    position: Position;
    triggerCharacter?: string;
    currentToken: string;
    scope: 'global' | 'rule' | 'when' | 'then' | 'function';
    ruleContext?: RuleNode;
    functionContext?: FunctionNode;
}

export class DroolsCompletionProvider {
    private settings: CompletionSettings;
    private document!: TextDocument;
    private ast!: DroolsAST;
    private parseResult!: ParseResult;

    // Common Drools keywords
    private readonly DROOLS_KEYWORDS = [
        'rule', 'when', 'then', 'end', 'package', 'import', 'function', 'global',
        'query', 'declare', 'exists', 'not', 'and', 'or', 'eval', 'forall',
        'accumulate', 'collect', 'from', 'entry-point', 'salience', 'no-loop',
        'ruleflow-group', 'activation-group', 'agenda-group', 'auto-focus',
        'lock-on-active', 'date-effective', 'date-expires', 'enabled',
        'dialect', 'duration', 'timer', 'calendars'
    ];

    // Common Java/Drools fact types
    private readonly COMMON_FACT_TYPES = [
        'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Date',
        'BigDecimal', 'BigInteger', 'List', 'Map', 'Set', 'Collection',
        'Object', 'Number', 'Comparable'
    ];

    // Common Drools functions and methods
    private readonly DROOLS_FUNCTIONS = [
        'insert', 'update', 'modify', 'delete', 'retract', 'insertLogical',
        'kcontext', 'drools', 'System.out.println'
    ];

    // Common operators and expressions
    private readonly OPERATORS = [
        'matches', 'contains', 'memberOf', 'soundslike', 'str',
        '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!'
    ];

    constructor(settings: CompletionSettings) {
        this.settings = settings;
    }

    /**
     * Provide completion items for the given position
     */
    public provideCompletions(
        document: TextDocument,
        position: Position,
        parseResult: ParseResult,
        triggerCharacter?: string
    ): CompletionItem[] {
        this.document = document;
        this.ast = parseResult.ast;
        this.parseResult = parseResult;

        const context = this.analyzeContext(position, triggerCharacter);
        const completions: CompletionItem[] = [];

        // Add keyword completions
        if (this.settings.enableKeywordCompletion) {
            completions.push(...this.getKeywordCompletions(context));
        }

        // Add fact type completions
        if (this.settings.enableFactTypeCompletion) {
            completions.push(...this.getFactTypeCompletions(context));
        }

        // Add function completions
        if (this.settings.enableFunctionCompletion) {
            completions.push(...this.getFunctionCompletions(context));
        }

        // Add variable completions
        if (this.settings.enableVariableCompletion) {
            completions.push(...this.getVariableCompletions(context));
        }

        // Add operator completions
        completions.push(...this.getOperatorCompletions(context));

        // Add snippet completions
        completions.push(...this.getSnippetCompletions(context));

        // Limit the number of completion items
        return completions.slice(0, this.settings.maxCompletionItems);
    }

    /**
     * Analyze the context around the cursor position
     */
    private analyzeContext(position: Position, triggerCharacter?: string): CompletionContext {
        const line = this.document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: position.character }
        });

        // Extract current token
        const tokenMatch = line.match(/(\w+)$/);
        const currentToken = tokenMatch ? tokenMatch[1] : '';

        // Determine scope
        const scope = this.determineScope(position);
        
        // Find rule or function context
        const ruleContext = this.findRuleContext(position);
        const functionContext = this.findFunctionContext(position);

        return {
            position,
            triggerCharacter,
            currentToken,
            scope,
            ruleContext,
            functionContext
        };
    }

    /**
     * Determine the current scope (global, rule, when, then, function)
     */
    private determineScope(position: Position): 'global' | 'rule' | 'when' | 'then' | 'function' {
        // Check if we're inside a function
        for (const func of this.ast.functions) {
            if (this.isPositionInRange(position, func.range)) {
                return 'function';
            }
        }

        // Check if we're inside a rule
        for (const rule of this.ast.rules) {
            if (this.isPositionInRange(position, rule.range)) {
                // Check if we're in when clause
                if (rule.when && this.isPositionInRange(position, rule.when.range)) {
                    return 'when';
                }
                // Check if we're in then clause
                if (rule.then && this.isPositionInRange(position, rule.then.range)) {
                    return 'then';
                }
                return 'rule';
            }
        }

        return 'global';
    }

    /**
     * Find the rule context for the current position
     */
    private findRuleContext(position: Position): RuleNode | undefined {
        return this.ast.rules.find(rule => this.isPositionInRange(position, rule.range));
    }

    /**
     * Find the function context for the current position
     */
    private findFunctionContext(position: Position): FunctionNode | undefined {
        return this.ast.functions.find(func => this.isPositionInRange(position, func.range));
    }

    /**
     * Check if a position is within a range
     */
    private isPositionInRange(position: Position, range: { start: Position; end: Position }): boolean {
        if (position.line < range.start.line || position.line > range.end.line) {
            return false;
        }
        if (position.line === range.start.line && position.character < range.start.character) {
            return false;
        }
        if (position.line === range.end.line && position.character > range.end.character) {
            return false;
        }
        return true;
    }

    /**
     * Get keyword completions based on context
     */
    private getKeywordCompletions(context: CompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Filter keywords based on scope
        let relevantKeywords: string[] = [];

        switch (context.scope) {
            case 'global':
                relevantKeywords = ['package', 'import', 'global', 'function', 'rule', 'query', 'declare'];
                break;
            case 'rule':
                relevantKeywords = ['when', 'then', 'end', 'salience', 'no-loop', 'ruleflow-group', 
                                  'activation-group', 'agenda-group', 'auto-focus', 'lock-on-active',
                                  'date-effective', 'date-expires', 'enabled', 'dialect', 'duration', 'timer'];
                break;
            case 'when':
                relevantKeywords = ['exists', 'not', 'and', 'or', 'eval', 'forall', 'accumulate', 
                                  'collect', 'from', 'entry-point', 'then'];
                break;
            case 'then':
                relevantKeywords = ['insert', 'update', 'modify', 'delete', 'retract', 'insertLogical', 'end'];
                break;
            case 'function':
                relevantKeywords = ['return', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally'];
                break;
        }

        for (const keyword of relevantKeywords) {
            if (keyword.startsWith(context.currentToken.toLowerCase())) {
                completions.push({
                    label: keyword,
                    kind: CompletionItemKind.Keyword,
                    detail: `Drools keyword`,
                    documentation: this.getKeywordDocumentation(keyword),
                    insertText: keyword,
                    sortText: `0_${keyword}` // Prioritize keywords
                });
            }
        }

        return completions;
    }

    /**
     * Get fact type completions
     */
    private getFactTypeCompletions(context: CompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Only provide fact types in when clauses or after certain keywords
        if (context.scope !== 'when' && context.scope !== 'then') {
            return completions;
        }

        // Add common Java types
        for (const factType of this.COMMON_FACT_TYPES) {
            if (factType.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                completions.push({
                    label: factType,
                    kind: CompletionItemKind.Class,
                    detail: `Java type`,
                    documentation: `Common Java/Drools fact type: ${factType}`,
                    insertText: factType,
                    sortText: `1_${factType}`
                });
            }
        }

        // Add custom fact types from imports (simplified - would need better import analysis)
        for (const importNode of this.ast.imports) {
            const className = importNode.path.split('.').pop();
            if (className && className.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                completions.push({
                    label: className,
                    kind: CompletionItemKind.Class,
                    detail: `Imported type from ${importNode.path}`,
                    documentation: `Imported fact type: ${className}`,
                    insertText: className,
                    sortText: `1_${className}`
                });
            }
        }

        return completions;
    }

    /**
     * Get function completions
     */
    private getFunctionCompletions(context: CompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Add built-in Drools functions
        for (const func of this.DROOLS_FUNCTIONS) {
            if (func.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                completions.push({
                    label: func,
                    kind: CompletionItemKind.Function,
                    detail: `Drools function`,
                    documentation: this.getFunctionDocumentation(func),
                    insertText: this.getFunctionInsertText(func),
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `2_${func}`
                });
            }
        }

        // Add user-defined functions
        for (const func of this.ast.functions) {
            if (func.name.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                const paramList = func.parameters.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ');
                
                completions.push({
                    label: func.name,
                    kind: CompletionItemKind.Function,
                    detail: `${func.returnType} ${func.name}(${func.parameters.map(p => `${p.dataType} ${p.name}`).join(', ')})`,
                    documentation: `User-defined function returning ${func.returnType}`,
                    insertText: `${func.name}(${paramList})`,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `2_${func.name}`
                });
            }
        }

        return completions;
    }

    /**
     * Get variable completions
     */
    private getVariableCompletions(context: CompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Add global variables
        for (const global of this.ast.globals) {
            if (global.name.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                completions.push({
                    label: global.name,
                    kind: CompletionItemKind.Variable,
                    detail: `Global variable: ${global.dataType}`,
                    documentation: `Global variable of type ${global.dataType}`,
                    insertText: global.name,
                    sortText: `3_${global.name}`
                });
            }
        }

        // Add rule variables (from when clause)
        if (context.ruleContext && context.ruleContext.when) {
            for (const condition of context.ruleContext.when.conditions) {
                if (condition.variable && condition.variable.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: condition.variable,
                        kind: CompletionItemKind.Variable,
                        detail: `Rule variable: ${condition.factType || 'unknown type'}`,
                        documentation: `Variable bound in when clause${condition.factType ? ` of type ${condition.factType}` : ''}`,
                        insertText: condition.variable,
                        sortText: `3_${condition.variable}`
                    });
                }
            }
        }

        // Add function parameters
        if (context.functionContext) {
            for (const param of context.functionContext.parameters) {
                if (param.name.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: param.name,
                        kind: CompletionItemKind.Variable,
                        detail: `Parameter: ${param.dataType}`,
                        documentation: `Function parameter of type ${param.dataType}`,
                        insertText: param.name,
                        sortText: `3_${param.name}`
                    });
                }
            }
        }

        return completions;
    }

    /**
     * Get operator completions
     */
    private getOperatorCompletions(context: CompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Only provide operators in when and then clauses
        if (context.scope !== 'when' && context.scope !== 'then') {
            return completions;
        }

        for (const operator of this.OPERATORS) {
            if (operator.toLowerCase().startsWith(context.currentToken.toLowerCase())) {
                completions.push({
                    label: operator,
                    kind: CompletionItemKind.Operator,
                    detail: `Drools operator`,
                    documentation: this.getOperatorDocumentation(operator),
                    insertText: operator,
                    sortText: `4_${operator}`
                });
            }
        }

        return completions;
    }

    /**
     * Get snippet completions for common patterns
     */
    private getSnippetCompletions(context: CompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        switch (context.scope) {
            case 'global':
                if ('rule'.startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: 'rule',
                        kind: CompletionItemKind.Snippet,
                        detail: 'Basic rule template',
                        documentation: 'Creates a basic rule structure',
                        insertText: 'rule "${1:RuleName}"\nwhen\n\t${2:// conditions}\nthen\n\t${3:// actions}\nend',
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: '0_rule_snippet'
                    });
                }

                if ('function'.startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: 'function',
                        kind: CompletionItemKind.Snippet,
                        detail: 'Function template',
                        documentation: 'Creates a function definition',
                        insertText: 'function ${1:ReturnType} ${2:functionName}(${3:parameters}) {\n\t${4:// function body}\n\treturn ${5:value};\n}',
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: '0_function_snippet'
                    });
                }
                break;

            case 'when':
                if ('pattern'.startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: 'pattern',
                        kind: CompletionItemKind.Snippet,
                        detail: 'Fact pattern',
                        documentation: 'Creates a fact pattern with variable binding',
                        insertText: '${1:$var} : ${2:FactType}(${3:constraints})',
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: '0_pattern_snippet'
                    });
                }

                if ('exists'.startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: 'exists',
                        kind: CompletionItemKind.Snippet,
                        detail: 'Exists condition',
                        documentation: 'Creates an exists condition',
                        insertText: 'exists(${1:FactType}(${2:constraints}))',
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: '0_exists_snippet'
                    });
                }
                break;

            case 'then':
                if ('insert'.startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: 'insert',
                        kind: CompletionItemKind.Snippet,
                        detail: 'Insert fact',
                        documentation: 'Inserts a new fact into working memory',
                        insertText: 'insert(new ${1:FactType}(${2:parameters}));',
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: '0_insert_snippet'
                    });
                }

                if ('modify'.startsWith(context.currentToken.toLowerCase())) {
                    completions.push({
                        label: 'modify',
                        kind: CompletionItemKind.Snippet,
                        detail: 'Modify fact',
                        documentation: 'Modifies an existing fact',
                        insertText: 'modify(${1:$variable}) {\n\t${2:// modifications}\n}',
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: '0_modify_snippet'
                    });
                }
                break;
        }

        return completions;
    }

    /**
     * Get documentation for keywords
     */
    private getKeywordDocumentation(keyword: string): string {
        const docs: { [key: string]: string } = {
            'rule': 'Defines a business rule with conditions and actions',
            'when': 'Specifies the conditions that must be met for the rule to fire',
            'then': 'Specifies the actions to execute when the rule fires',
            'end': 'Marks the end of a rule definition',
            'package': 'Declares the package namespace for the rules file',
            'import': 'Imports Java classes or static methods',
            'global': 'Declares a global variable accessible to all rules',
            'function': 'Defines a function that can be called from rules',
            'exists': 'Tests for the existence of a fact matching the pattern',
            'not': 'Tests for the absence of a fact matching the pattern',
            'eval': 'Evaluates a boolean expression',
            'salience': 'Sets the priority of the rule (higher values fire first)',
            'no-loop': 'Prevents the rule from firing again due to its own actions'
        };
        return docs[keyword] || `Drools keyword: ${keyword}`;
    }

    /**
     * Get documentation for functions
     */
    private getFunctionDocumentation(func: string): string {
        const docs: { [key: string]: string } = {
            'insert': 'Inserts a new fact into the working memory',
            'update': 'Updates an existing fact and notifies the engine',
            'modify': 'Modifies an existing fact with a block of changes',
            'delete': 'Removes a fact from the working memory',
            'retract': 'Removes a fact from the working memory (alias for delete)',
            'insertLogical': 'Inserts a fact that will be automatically retracted when the rule is no longer true',
            'kcontext': 'Provides access to the rule context and knowledge session',
            'drools': 'Provides access to the Drools runtime context'
        };
        return docs[func] || `Function: ${func}`;
    }

    /**
     * Get insert text for functions with parameters
     */
    private getFunctionInsertText(func: string): string {
        const insertTexts: { [key: string]: string } = {
            'insert': 'insert(${1:fact})',
            'update': 'update(${1:fact})',
            'modify': 'modify(${1:fact}) {\n\t${2:// modifications}\n}',
            'delete': 'delete(${1:fact})',
            'retract': 'retract(${1:fact})',
            'insertLogical': 'insertLogical(${1:fact})',
            'System.out.println': 'System.out.println(${1:message})'
        };
        return insertTexts[func] || `${func}(\${1:parameters})`;
    }

    /**
     * Get documentation for operators
     */
    private getOperatorDocumentation(operator: string): string {
        const docs: { [key: string]: string } = {
            'matches': 'Tests if a string matches a regular expression',
            'contains': 'Tests if a collection contains an element',
            'memberOf': 'Tests if an element is a member of a collection',
            'soundslike': 'Tests if two strings sound similar (soundex algorithm)',
            'str': 'Converts a value to string for comparison',
            '==': 'Equality comparison',
            '!=': 'Inequality comparison',
            '<': 'Less than comparison',
            '>': 'Greater than comparison',
            '<=': 'Less than or equal comparison',
            '>=': 'Greater than or equal comparison',
            '&&': 'Logical AND operator',
            '||': 'Logical OR operator',
            '!': 'Logical NOT operator'
        };
        return docs[operator] || `Operator: ${operator}`;
    }

    /**
     * Provide signature help for function calls
     */
    public provideSignatureHelp(
        document: TextDocument,
        position: Position,
        parseResult: ParseResult
    ): SignatureHelp | null {
        this.document = document;
        this.ast = parseResult.ast;
        this.parseResult = parseResult;

        // Get the current line up to the cursor position
        const line = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: position.character }
        });

        // Find function call pattern: functionName(
        const functionCallMatch = line.match(/(\w+)\s*\(\s*([^)]*)$/);
        if (!functionCallMatch) {
            return null;
        }

        const functionName = functionCallMatch[1];
        const currentParams = functionCallMatch[2];
        
        // Count current parameter position (by counting commas)
        const activeParameter = currentParams ? currentParams.split(',').length - 1 : 0;

        // Look for user-defined functions first
        for (const func of this.ast.functions) {
            if (func.name === functionName) {
                return this.createSignatureHelp(func, activeParameter);
            }
        }

        // Look for built-in Drools functions
        const builtInSignature = this.getBuiltInFunctionSignature(functionName);
        if (builtInSignature) {
            return {
                signatures: [builtInSignature],
                activeSignature: 0,
                activeParameter: Math.min(activeParameter, (builtInSignature.parameters?.length || 1) - 1)
            };
        }

        return null;
    }

    /**
     * Create signature help for a user-defined function
     */
    private createSignatureHelp(func: FunctionNode, activeParameter: number): SignatureHelp {
        const parameters: ParameterInformation[] = func.parameters.map(param => ({
            label: `${param.dataType} ${param.name}`,
            documentation: `Parameter of type ${param.dataType}`
        }));

        const signature: SignatureInformation = {
            label: `${func.returnType} ${func.name}(${func.parameters.map(p => `${p.dataType} ${p.name}`).join(', ')})`,
            documentation: `User-defined function returning ${func.returnType}`,
            parameters
        };

        return {
            signatures: [signature],
            activeSignature: 0,
            activeParameter: Math.min(activeParameter, parameters.length - 1)
        };
    }

    /**
     * Get signature information for built-in Drools functions
     */
    private getBuiltInFunctionSignature(functionName: string): SignatureInformation | null {
        const signatures: { [key: string]: SignatureInformation } = {
            'insert': {
                label: 'void insert(Object fact)',
                documentation: 'Inserts a new fact into the working memory',
                parameters: [
                    {
                        label: 'Object fact',
                        documentation: 'The fact object to insert'
                    }
                ]
            },
            'update': {
                label: 'void update(Object fact)',
                documentation: 'Updates an existing fact and notifies the engine',
                parameters: [
                    {
                        label: 'Object fact',
                        documentation: 'The fact object to update'
                    }
                ]
            },
            'delete': {
                label: 'void delete(Object fact)',
                documentation: 'Removes a fact from the working memory',
                parameters: [
                    {
                        label: 'Object fact',
                        documentation: 'The fact object to delete'
                    }
                ]
            },
            'retract': {
                label: 'void retract(Object fact)',
                documentation: 'Removes a fact from the working memory (alias for delete)',
                parameters: [
                    {
                        label: 'Object fact',
                        documentation: 'The fact object to retract'
                    }
                ]
            },
            'insertLogical': {
                label: 'void insertLogical(Object fact)',
                documentation: 'Inserts a fact that will be automatically retracted when the rule is no longer true',
                parameters: [
                    {
                        label: 'Object fact',
                        documentation: 'The fact object to insert logically'
                    }
                ]
            },
            'modify': {
                label: 'void modify(Object fact) { ... }',
                documentation: 'Modifies an existing fact with a block of changes',
                parameters: [
                    {
                        label: 'Object fact',
                        documentation: 'The fact object to modify'
                    }
                ]
            }
        };

        return signatures[functionName] || null;
    }
}