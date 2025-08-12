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
import { DroolsAST, RuleNode, ConditionNode } from '../parser/ast';
import { JavaCompletionProvider, JavaCompletionContext } from './javaCompletionProvider';

export interface CompletionSettings {
    enableKeywordCompletion: boolean;
    enableFactTypeCompletion: boolean;
    enableFunctionCompletion: boolean;
    enableVariableCompletion: boolean;
    enableGlobalCompletion?: boolean;
    maxCompletionItems: number;
    enableSnippets?: boolean;
    enableSignatureHelp?: boolean;
}

interface CompletionContext {
    type: 'file-level' | 'when-clause' | 'then-clause' | 'multi-line-pattern';
    rule?: RuleNode;
    beforeCursor: string;
    afterCursor: string;
    patternType?: string;
    nestingLevel?: number;
}

interface Variable {
    name: string;
    type?: string;
    range?: { start: Position; end: Position };
}

export class DroolsCompletionProvider {
    private settings: CompletionSettings;

    constructor(settings: CompletionSettings) {
        this.settings = settings;
    }

    /**
     * Provide completions (main entry point expected by server)
     */
    async provideCompletions(
        document: TextDocument,
        position: Position,
        ast: DroolsAST
    ): Promise<CompletionItem[]> {
        return this.provideCompletionItems(document, position, ast);
    }

    /**
     * Provide signature help
     */
    async provideSignatureHelp(
        document: TextDocument,
        position: Position,
        ast: DroolsAST
    ): Promise<SignatureHelp | null> {
        // Basic signature help implementation
        if (!ast.functions || ast.functions.length === 0) {
            return null;
        }

        // For now, return a basic signature help for the first function
        const func = ast.functions[0];
        const parameters = func.parameters.map(p => ({
            label: `${p.dataType} ${p.name}`,
            documentation: `Parameter: ${p.name} of type ${p.dataType}`
        }));

        return {
            signatures: [{
                label: `${func.returnType} ${func.name}(${func.parameters.map(p => `${p.dataType} ${p.name}`).join(', ')})`,
                documentation: `Function: ${func.name}`,
                parameters: parameters
            }],
            activeSignature: 0,
            activeParameter: 0
        };
    }

    /**
     * Provide completion items at the given position
     */
    async provideCompletionItems(
        document: TextDocument,
        position: Position,
        ast: DroolsAST
    ): Promise<CompletionItem[]> {
        const items: CompletionItem[] = [];
        
        // Determine completion context
        const context = this.getCompletionContext(document, position, ast);
        
        // Provide completions based on context
        switch (context.type) {
            case 'file-level':
                items.push(...this.getFileLevelCompletions(ast));
                break;
            case 'when-clause':
                items.push(...this.getWhenClauseCompletions(context, ast));
                break;
            case 'then-clause':
                items.push(...this.getThenClauseCompletions(context, ast));
                break;
            case 'multi-line-pattern':
                items.push(...this.getMultiLinePatternCompletions(context, ast));
                break;
        }
        
        // Apply settings limits
        const limitedItems = items.slice(0, this.settings.maxCompletionItems);
        
        return limitedItems;
    }

    /**
     * Get completion context based on position and AST
     */
    private getCompletionContext(document: TextDocument, position: Position, ast: DroolsAST): CompletionContext {
        const lines = document.getText().split('\n');
        const line = lines[position.line] || '';
        const beforeCursor = line.substring(0, position.character);
        const afterCursor = line.substring(position.character);
        
        // Check if we're in a rule context
        const currentRule = this.findRuleAtPosition(ast, position);
        if (currentRule) {
            // Check if we're in when clause
            if (this.isInWhenClause(currentRule, position)) {
                // Check if we're inside a multi-line pattern
                const multiLineContext = this.getMultiLinePatternContext(currentRule, position);
                if (multiLineContext) {
                    return {
                        type: 'multi-line-pattern',
                        rule: currentRule,
                        beforeCursor,
                        afterCursor,
                        patternType: multiLineContext.patternType,
                        nestingLevel: multiLineContext.nestingLevel
                    };
                }
                
                return {
                    type: 'when-clause',
                    rule: currentRule,
                    beforeCursor,
                    afterCursor
                };
            }
            
            // Check if we're in then clause
            if (this.isInThenClause(currentRule, position)) {
                return {
                    type: 'then-clause',
                    rule: currentRule,
                    beforeCursor,
                    afterCursor
                };
            }
        }
        
        // Default to file level
        return {
            type: 'file-level',
            beforeCursor,
            afterCursor
        };
    }

    /**
     * Get multi-line pattern context if position is inside one
     */
    private getMultiLinePatternContext(rule: RuleNode, position: Position): { patternType: string; nestingLevel: number } | null {
        if (!rule.when?.conditions) return null;
        
        for (const condition of rule.when.conditions) {
            if (condition.isMultiLine && condition.range) {
                // Check if position is within this multi-line pattern
                if (position.line >= condition.range.start.line && 
                    position.line <= condition.range.end.line) {
                    
                    // Determine pattern type
                    let patternType = 'pattern';
                    if (condition.multiLinePattern) {
                        patternType = condition.multiLinePattern.patternType;
                    } else if (condition.conditionType !== 'pattern') {
                        patternType = condition.conditionType;
                    }
                    
                    // Calculate nesting level (simplified)
                    let nestingLevel = 0;
                    if (condition.multiLinePattern?.nestedPatterns) {
                        nestingLevel = condition.multiLinePattern.nestedPatterns.length;
                    }
                    
                    return { patternType, nestingLevel };
                }
            }
        }
        
        return null;
    }

    /**
     * Get completions for file level
     */
    private getFileLevelCompletions(ast: DroolsAST): CompletionItem[] {
        const items: CompletionItem[] = [];
        
        // Add rule keyword
        items.push({
            label: 'rule',
            kind: CompletionItemKind.Keyword,
            detail: 'Rule definition',
            insertText: 'rule "${1:RuleName}"\nwhen\n    ${2:conditions}\nthen\n    ${3:actions}\nend',
            insertTextFormat: InsertTextFormat.Snippet
        });
        
        // Add rule structure keywords
        const ruleKeywords = ['when', 'then', 'end'];
        items.push(...ruleKeywords.map(keyword => ({
            label: keyword,
            kind: CompletionItemKind.Keyword,
            detail: `Rule keyword: ${keyword}`,
            insertText: keyword
        })));
        
        // Add other top-level keywords
        const keywords = ['package', 'import', 'global', 'function', 'query'];
        items.push(...keywords.map(keyword => ({
            label: keyword,
            kind: CompletionItemKind.Keyword,
            detail: `${keyword} declaration`,
            insertText: keyword
        })));
        
        return items;
    }

    /**
     * Get completions for when clause
     */
    private getWhenClauseCompletions(context: CompletionContext, ast: DroolsAST): CompletionItem[] {
        const items: CompletionItem[] = [];
        
        // Add pattern keywords
        const patternKeywords = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        items.push(...patternKeywords.map(keyword => ({
            label: keyword,
            kind: CompletionItemKind.Keyword,
            detail: `Pattern keyword: ${keyword}`,
            insertText: `${keyword}(`
        })));
        
        // Add logical operators
        const logicalOperators = ['and', 'or'];
        items.push(...logicalOperators.map(op => ({
            label: op,
            kind: CompletionItemKind.Keyword,
            detail: `Logical operator: ${op}`,
            insertText: op
        })));
        
        // Add fact types (if enabled)
        if (this.settings.enableFactTypeCompletion) {
            const factTypes = ['Person', 'Account', 'Customer', 'Transaction', 'Alert', 'Blacklist', 'Exception'];
            items.push(...factTypes.map(factType => ({
                label: factType,
                kind: CompletionItemKind.Class,
                detail: `Fact type: ${factType}`,
                insertText: factType
            })));
        }
        
        // Add functions from AST
        if (ast.functions) {
            items.push(...ast.functions.map(func => ({
                label: func.name,
                kind: CompletionItemKind.Function,
                detail: `${func.returnType} ${func.name}(${func.parameters.map(p => `${p.dataType} ${p.name}`).join(", ")})`,
                insertText: func.name
            })));
        }
        
        // Add operators
        const operators = ['==', '!=', '>', '<', '>=', '<=', 'matches', 'contains'];
        items.push(...operators.map(op => ({
            label: op,
            kind: CompletionItemKind.Operator,
            detail: `Comparison operator: ${op}`,
            insertText: op
        })));
        
        // Add variables from current rule
        if (context.rule?.when?.conditions) {
            const variables = this.extractVariables(context.rule.when.conditions);
            items.push(...variables.map(variable => ({
                label: variable.name,
                kind: CompletionItemKind.Variable,
                detail: `Variable: ${variable.type || 'unknown'}`,
                insertText: variable.name
            })));
        }
        
        return items;
    }

    /**
     * Get completions for then clause with comprehensive Java support
     */
    private getThenClauseCompletions(context: CompletionContext, ast: DroolsAST): CompletionItem[] {
        const items: CompletionItem[] = [];
        
        // Add functions from AST first (higher priority)
        if (ast.functions) {
            items.push(...ast.functions.map(func => ({
                label: func.name,
                kind: CompletionItemKind.Function,
                detail: `${func.returnType} ${func.name}(${func.parameters.map(p => `${p.dataType} ${p.name}`).join(", ")})`,
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `**Function**: ${func.name}\n\n**Returns**: ${func.returnType}`
                },
                insertText: func.name
            })));
        }
        
        // Get comprehensive Java completions using our enhanced provider
        const javaCompletions = this.getJavaCompletions(context);
        items.push(...javaCompletions);
        
        // Add Drools-specific action keywords
        items.push(
            {
                label: 'update',
                kind: CompletionItemKind.Function,
                detail: 'Update fact in working memory',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Updates a fact in working memory, triggering re-evaluation of rules'
                },
                insertText: 'update(${1:fact});',
                insertTextFormat: InsertTextFormat.Snippet
            },
            {
                label: 'insert',
                kind: CompletionItemKind.Function,
                detail: 'Insert new fact into working memory',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Inserts a new fact into working memory'
                },
                insertText: 'insert(${1:fact});',
                insertTextFormat: InsertTextFormat.Snippet
            },
            {
                label: 'retract',
                kind: CompletionItemKind.Function,
                detail: 'Remove fact from working memory',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Removes a fact from working memory'
                },
                insertText: 'retract(${1:fact});',
                insertTextFormat: InsertTextFormat.Snippet
            },
            {
                label: 'modify',
                kind: CompletionItemKind.Function,
                detail: 'Modify fact properties',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Modifies fact properties and updates working memory'
                },
                insertText: 'modify(${1:fact}) {\n    ${2:property} = ${3:value}\n}',
                insertTextFormat: InsertTextFormat.Snippet
            }
        );
        

        
        // Add variables from when clause
        if (context.rule?.when?.conditions) {
            const variables = this.extractVariables(context.rule.when.conditions);
            items.push(...variables.map(variable => ({
                label: variable.name,
                kind: CompletionItemKind.Variable,
                detail: `Variable: ${variable.type || 'unknown'}`,
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `**Variable**: ${variable.name}\n\n**Type**: ${variable.type || 'unknown'}`
                },
                insertText: variable.name
            })));
        }
        
        // Add global variables if available
        if (ast.globals) {
            items.push(...ast.globals.map(global => ({
                label: global.name,
                kind: CompletionItemKind.Variable,
                detail: `Global: ${global.dataType}`,
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `**Global Variable**: ${global.name}\n\n**Type**: ${global.dataType}`
                },
                insertText: global.name
            })));
        }
        
        return items;
    }

    /**
     * Get comprehensive Java completions for then clause
     */
    private getJavaCompletions(context: CompletionContext): CompletionItem[] {
        // Create a mock document and position for the Java completion provider
        const mockDocument = {
            getText: () => context.beforeCursor + context.afterCursor,
            uri: 'mock://java-completion'
        } as TextDocument;
        
        const mockPosition = {
            line: 0,
            character: context.beforeCursor.length
        };
        
        // Determine trigger character
        const triggerChar = context.beforeCursor.endsWith('.') ? '.' : undefined;
        
        // Get Java completions
        const javaResult = JavaCompletionProvider.provideCompletions(
            mockDocument,
            mockPosition,
            triggerChar
        );
        
        return javaResult.items;
    }

    /**
     * Get completions for multi-line patterns
     */
    private getMultiLinePatternCompletions(context: CompletionContext, ast: DroolsAST): CompletionItem[] {
        const items: CompletionItem[] = [];
        
        // Add fact types that are commonly used in patterns
        const commonFactTypes = ['Person', 'Account', 'Customer', 'Transaction', 'Alert', 'Blacklist', 'Exception'];
        items.push(...commonFactTypes.map(factType => ({
            label: factType,
            kind: CompletionItemKind.Class,
            detail: `Fact type: ${factType}`,
            insertText: factType
        })));
        
        // Add pattern-specific keywords based on pattern type
        if (context.patternType) {
            switch (context.patternType) {
                case 'exists':
                case 'not':
                    // Add nested pattern keywords
                    items.push(...['exists', 'not', 'eval'].map(keyword => ({
                        label: keyword,
                        kind: CompletionItemKind.Keyword,
                        detail: `Pattern keyword: ${keyword}`,
                        insertText: `${keyword}(`
                    })));
                    break;
                case 'eval':
                    // Add logical operators and functions
                    items.push(...['&&', '||', '!'].map(op => ({
                        label: op,
                        kind: CompletionItemKind.Operator,
                        detail: `Logical operator: ${op}`,
                        insertText: op
                    })));
                    break;
            }
        }
        
        // Add variables from the current rule
        if (context.rule?.when?.conditions) {
            const variables = this.extractVariables(context.rule.when.conditions);
            items.push(...variables.map(variable => ({
                label: variable.name,
                kind: CompletionItemKind.Variable,
                detail: `Variable: ${variable.type || 'unknown'}`,
                insertText: variable.name
            })));
        }
        
        // Add operators
        const operators = ['==', '!=', '>', '<', '>=', '<=', 'matches', 'contains'];
        items.push(...operators.map(op => ({
            label: op,
            kind: CompletionItemKind.Operator,
            detail: `Comparison operator: ${op}`,
            insertText: op
        })));
        
        return items;
    }

    /**
     * Find rule at given position
     */
    private findRuleAtPosition(ast: DroolsAST, position: Position): RuleNode | null {
        for (const rule of ast.rules) {
            if (rule.range && 
                position.line >= rule.range.start.line && 
                position.line <= rule.range.end.line) {
                return rule;
            }
        }
        return null;
    }

    /**
     * Check if position is in when clause
     */
    private isInWhenClause(rule: RuleNode, position: Position): boolean {
        if (!rule.when) return false;
        
        return position.line >= rule.when.range.start.line && 
               position.line <= rule.when.range.end.line;
    }

    /**
     * Check if position is in then clause
     */
    private isInThenClause(rule: RuleNode, position: Position): boolean {
        if (!rule.then) return false;
        
        return position.line >= rule.then.range.start.line && 
               position.line <= rule.then.range.end.line;
    }

    /**
     * Extract variables from conditions
     */
    private extractVariables(conditions: ConditionNode[]): Variable[] {
        const variables: Variable[] = [];
        
        for (const condition of conditions) {
            // Extract variables from condition content
            if (condition.content) {
                const variableMatches = condition.content.match(/\$\w+/g);
                if (variableMatches) {
                    for (const match of variableMatches) {
                        if (!variables.some(v => v.name === match)) {
                            variables.push({
                                name: match,
                                type: this.inferVariableType(condition.content, match),
                                range: condition.range
                            });
                        }
                    }
                }
            }
            
            // Extract from variable property if available
            if (condition.variable) {
                if (!variables.some(v => v.name === condition.variable)) {
                    variables.push({
                        name: condition.variable,
                        type: condition.factType,
                        range: condition.range
                    });
                }
            }
        }
        
        return variables;
    }

    /**
     * Infer variable type from context
     */
    private inferVariableType(text: string, variableName: string): string | undefined {
        // Simple type inference based on pattern matching
        const typePattern = new RegExp(`${variableName.replace('$', '\\$')}\\s*:\\s*(\\w+)`);
        const match = text.match(typePattern);
        return match ? match[1] : undefined;
    }
}