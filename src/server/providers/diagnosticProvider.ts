/**
 * Diagnostic provider for Drools language error detection and validation
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST, AnyASTNode, RuleNode, FunctionNode, ConditionNode, WhenNode, ThenNode, MultiLinePatternNode, MultiLinePatternMetadata, ParenthesesTracker, Position, Range } from '../parser/ast';
import { ParseError } from '../parser/droolsParser';

export interface DiagnosticSettings {
    maxNumberOfProblems: number;
    enableSyntaxValidation: boolean;
    enableSemanticValidation: boolean;
    enableBestPracticeWarnings: boolean;
}

export class DroolsDiagnosticProvider {
    private settings: DiagnosticSettings;
    private document!: TextDocument;
    private documentLines!: string[];

    constructor(settings: DiagnosticSettings) {
        this.settings = settings;
    }

    /**
     * Analyze the document and AST to generate diagnostics
     */
    public provideDiagnostics(document: TextDocument, ast: DroolsAST, parseErrors: ParseError[]): Diagnostic[] {
        this.document = document;
        this.documentLines = document.getText().split('\n');
        
        const diagnostics: Diagnostic[] = [];

        // Convert parser errors to diagnostics
        if (this.settings.enableSyntaxValidation) {
            this.addParseErrorDiagnostics(parseErrors, diagnostics);
        }

        // Perform semantic validation
        if (this.settings.enableSemanticValidation) {
            this.validateSemantics(ast, diagnostics);
        }

        // Check best practices
        if (this.settings.enableBestPracticeWarnings) {
            this.validateBestPractices(ast, diagnostics);
        }

        // Additional syntax validation beyond parser
        this.validateSyntaxDetails(ast, diagnostics);

        // Validate multi-line patterns
        if (this.settings.enableSyntaxValidation) {
            this.validateMultiLinePatterns(ast, diagnostics);
        }

        // Limit the number of diagnostics
        return diagnostics.slice(0, this.settings.maxNumberOfProblems);
    }

    /**
     * Convert parser errors to LSP diagnostics
     */
    private addParseErrorDiagnostics(parseErrors: ParseError[], diagnostics: Diagnostic[]): void {
        for (const error of parseErrors) {
            diagnostics.push({
                severity: error.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
                range: {
                    start: { line: error.range.start.line, character: error.range.start.character },
                    end: { line: error.range.end.line, character: error.range.end.character }
                },
                message: error.message,
                source: 'drools-parser'
            });
        }
    }

    /**
     * Validate semantic correctness of the AST
     */
    private validateSemantics(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Check for duplicate rule names
        this.validateDuplicateRuleNames(ast, diagnostics);
        
        // Check for duplicate function names
        this.validateDuplicateFunctionNames(ast, diagnostics);
        
        // Check for duplicate global names
        this.validateDuplicateGlobalNames(ast, diagnostics);
        
        // Validate rule structure
        this.validateRuleStructure(ast, diagnostics);
        
        // Validate function structure
        this.validateFunctionStructure(ast, diagnostics);
        
        // Check for undefined variables in rules
        this.validateVariableUsage(ast, diagnostics);
    }

    /**
     * Check for duplicate rule names
     */
    private validateDuplicateRuleNames(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        const ruleNames = new Map<string, RuleNode>();
        
        for (const rule of ast.rules) {
            if (ruleNames.has(rule.name)) {
                const firstRule = ruleNames.get(rule.name)!;
                
                // Add error to the duplicate rule
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: `Duplicate rule name: "${rule.name}". First defined at line ${firstRule.range.start.line + 1}`,
                    source: 'drools-semantic'
                });
            } else {
                ruleNames.set(rule.name, rule);
            }
        }
    }

    /**
     * Check for duplicate function names
     */
    private validateDuplicateFunctionNames(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        const functionNames = new Map<string, FunctionNode>();
        
        for (const func of ast.functions) {
            if (functionNames.has(func.name)) {
                const firstFunction = functionNames.get(func.name)!;
                
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: func.range.start.line, character: func.range.start.character },
                        end: { line: func.range.end.line, character: func.range.end.character }
                    },
                    message: `Duplicate function name: "${func.name}". First defined at line ${firstFunction.range.start.line + 1}`,
                    source: 'drools-semantic'
                });
            } else {
                functionNames.set(func.name, func);
            }
        }
    }

    /**
     * Check for duplicate global names
     */
    private validateDuplicateGlobalNames(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        const globalNames = new Set<string>();
        
        for (const global of ast.globals) {
            if (globalNames.has(global.name)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: global.range.start.line, character: global.range.start.character },
                        end: { line: global.range.end.line, character: global.range.end.character }
                    },
                    message: `Duplicate global variable: "${global.name}"`,
                    source: 'drools-semantic'
                });
            } else {
                globalNames.add(global.name);
            }
        }
    }

    /**
     * Validate rule structure and completeness
     */
    private validateRuleStructure(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            // Check if rule has empty name
            if (!rule.name || rule.name.trim() === '') {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: 'Rule must have a name',
                    source: 'drools-semantic'
                });
            }

            // Check if rule has neither when nor then clause
            if (!rule.when && !rule.then) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: 'Rule should have when and/or then clauses',
                    source: 'drools-semantic'
                });
            }

            // Check for empty when clause
            if (rule.when && rule.when.conditions.length === 0) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: rule.when.range.start.line, character: rule.when.range.start.character },
                        end: { line: rule.when.range.end.line, character: rule.when.range.end.character }
                    },
                    message: 'When clause is empty',
                    source: 'drools-semantic'
                });
            }

            // Check for empty then clause
            if (rule.then && (!rule.then.actions || rule.then.actions.trim() === '')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: rule.then.range.start.line, character: rule.then.range.start.character },
                        end: { line: rule.then.range.end.line, character: rule.then.range.end.character }
                    },
                    message: 'Then clause is empty',
                    source: 'drools-semantic'
                });
            }

            // Validate conditions in when clause
            if (rule.when) {
                this.validateConditions(rule.when, diagnostics);
            }
        }
    }

    /**
     * Validate conditions within when clauses
     */
    private validateConditions(whenClause: WhenNode, diagnostics: Diagnostic[]): void {
        for (const condition of whenClause.conditions) {
            // Check for malformed pattern conditions
            if (condition.conditionType === 'pattern') {
                if (condition.variable && !condition.variable.startsWith('$')) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: condition.range.start.line, character: condition.range.start.character },
                            end: { line: condition.range.end.line, character: condition.range.end.character }
                        },
                        message: `Variable "${condition.variable}" should start with $`,
                        source: 'drools-semantic'
                    });
                }

                if (!condition.factType) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: condition.range.start.line, character: condition.range.start.character },
                            end: { line: condition.range.end.line, character: condition.range.end.character }
                        },
                        message: 'Pattern condition should specify a fact type',
                        source: 'drools-semantic'
                    });
                }
            }

            // Check for empty eval conditions
            if (condition.conditionType === 'eval' && (!condition.content || condition.content.trim() === '')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: 'Eval condition cannot be empty',
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Validate function structure
     */
    private validateFunctionStructure(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const func of ast.functions) {
            // Check if function has empty name
            if (!func.name || func.name.trim() === '') {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: func.range.start.line, character: func.range.start.character },
                        end: { line: func.range.end.line, character: func.range.end.character }
                    },
                    message: 'Function must have a name',
                    source: 'drools-semantic'
                });
            }

            // Check if function has return type
            if (!func.returnType || func.returnType.trim() === '') {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: func.range.start.line, character: func.range.start.character },
                        end: { line: func.range.end.line, character: func.range.end.character }
                    },
                    message: 'Function must specify a return type',
                    source: 'drools-semantic'
                });
            }

            // Check if function has empty body
            if (!func.body || func.body.trim() === '' || func.body.trim() === '{}') {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: func.range.start.line, character: func.range.start.character },
                        end: { line: func.range.end.line, character: func.range.end.character }
                    },
                    message: 'Function has empty body',
                    source: 'drools-semantic'
                });
            }

            // Validate parameter names
            for (const param of func.parameters) {
                if (!param.name || param.name.trim() === '') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: param.range.start.line, character: param.range.start.character },
                            end: { line: param.range.end.line, character: param.range.end.character }
                        },
                        message: 'Parameter must have a name',
                        source: 'drools-semantic'
                    });
                }

                if (!param.dataType || param.dataType.trim() === '') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: param.range.start.line, character: param.range.start.character },
                            end: { line: param.range.end.line, character: param.range.end.character }
                        },
                        message: 'Parameter must have a type',
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Validate variable usage in rules
     */
    private validateVariableUsage(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            if (!rule.when || !rule.then) {
                continue;
            }

            // Collect declared variables from when clause
            const declaredVariables = new Set<string>();
            for (const condition of rule.when.conditions) {
                if (condition.variable) {
                    declaredVariables.add(condition.variable);
                }
            }

            // Check for variable usage in then clause
            const thenActions = rule.then.actions;
            const variableUsageRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*/g;
            const usedVariables = thenActions.match(variableUsageRegex) || [];

            for (const usedVar of usedVariables) {
                if (!declaredVariables.has(usedVar)) {
                    // Find the approximate position of the undefined variable
                    const lineIndex = thenActions.split('\n').findIndex(line => line.includes(usedVar));
                    const line = rule.then.range.start.line + lineIndex + 1;
                    
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line, character: 0 },
                            end: { line, character: 100 }
                        },
                        message: `Undefined variable: ${usedVar}`,
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Validate best practices and style guidelines
     */
    private validateBestPractices(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Check for rules without salience when multiple rules exist
        if (ast.rules.length > 1) {
            for (const rule of ast.rules) {
                const hasSalience = rule.attributes.some(attr => attr.name === 'salience');
                if (!hasSalience) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Information,
                        range: {
                            start: { line: rule.range.start.line, character: rule.range.start.character },
                            end: { line: rule.range.end.line, character: rule.range.end.character }
                        },
                        message: 'Consider adding salience attribute when multiple rules exist',
                        source: 'drools-best-practice'
                    });
                }
            }
        }

        // Check for rules that might cause infinite loops
        for (const rule of ast.rules) {
            const hasNoLoop = rule.attributes.some(attr => attr.name === 'no-loop');
            if (!hasNoLoop && rule.then) {
                // Simple heuristic: check if then clause contains insert/update/modify
                const actions = rule.then.actions.toLowerCase();
                if (actions.includes('insert(') || actions.includes('update(') || actions.includes('modify(')) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Information,
                        range: {
                            start: { line: rule.range.start.line, character: rule.range.start.character },
                            end: { line: rule.range.end.line, character: rule.range.end.character }
                        },
                        message: 'Consider adding no-loop attribute to prevent infinite rule execution',
                        source: 'drools-best-practice'
                    });
                }
            }
        }

        // Check for unused global variables
        const globalNames = new Set(ast.globals.map(g => g.name));
        const usedGlobals = new Set<string>();

        // Check usage in rules
        for (const rule of ast.rules) {
            if (rule.when) {
                for (const condition of rule.when.conditions) {
                    this.findGlobalUsage(condition.content, globalNames, usedGlobals);
                }
            }
            if (rule.then) {
                this.findGlobalUsage(rule.then.actions, globalNames, usedGlobals);
            }
        }

        // Check usage in functions
        for (const func of ast.functions) {
            this.findGlobalUsage(func.body, globalNames, usedGlobals);
        }

        // Report unused globals
        for (const global of ast.globals) {
            if (!usedGlobals.has(global.name)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Information,
                    range: {
                        start: { line: global.range.start.line, character: global.range.start.character },
                        end: { line: global.range.end.line, character: global.range.end.character }
                    },
                    message: `Global variable "${global.name}" is declared but never used`,
                    source: 'drools-best-practice'
                });
            }
        }
    }

    /**
     * Find global variable usage in text
     */
    private findGlobalUsage(text: string, globalNames: Set<string>, usedGlobals: Set<string>): void {
        for (const globalName of globalNames) {
            if (text.includes(globalName)) {
                usedGlobals.add(globalName);
            }
        }
    }

    /**
     * Validate additional syntax details not caught by the parser
     */
    private validateSyntaxDetails(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Check for missing semicolons in specific contexts
        this.validateMissingSemicolons(ast, diagnostics);
        
        // Check for unmatched brackets (enhanced multi-line support)
        this.validateBracketMatching(diagnostics);
        
        // Check for malformed rule names
        this.validateRuleNames(ast, diagnostics);
    }

    /**
     * Check for missing semicolons
     */
    private validateMissingSemicolons(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Check package declaration
        if (ast.packageDeclaration) {
            const line = this.documentLines[ast.packageDeclaration.range.start.line];
            if (line && !line.trim().endsWith(';')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: ast.packageDeclaration.range.start.line, character: line.length - 1 },
                        end: { line: ast.packageDeclaration.range.start.line, character: line.length }
                    },
                    message: 'Package declaration should end with semicolon',
                    source: 'drools-syntax'
                });
            }
        }

        // Check import statements
        for (const importNode of ast.imports) {
            const line = this.documentLines[importNode.range.start.line];
            if (line && !line.trim().endsWith(';')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: importNode.range.start.line, character: line.length - 1 },
                        end: { line: importNode.range.start.line, character: line.length }
                    },
                    message: 'Import statement should end with semicolon',
                    source: 'drools-syntax'
                });
            }
        }

        // Check global declarations
        for (const global of ast.globals) {
            const line = this.documentLines[global.range.start.line];
            if (line && !line.trim().endsWith(';')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: global.range.start.line, character: line.length - 1 },
                        end: { line: global.range.start.line, character: line.length }
                    },
                    message: 'Global declaration should end with semicolon',
                    source: 'drools-syntax'
                });
            }
        }
    }

    /**
     * Enhanced multi-line bracket matching validation
     */
    private validateBracketMatching(diagnostics: Diagnostic[]): void {
        const bracketPairs = [
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '[', close: ']' }
        ];

        const fullText = this.document.getText();
        
        for (const pair of bracketPairs) {
            this.validateBracketPair(pair.open, pair.close, fullText, diagnostics);
        }
    }

    /**
     * Validate a specific bracket pair across the entire document
     */
    private validateBracketPair(openBracket: string, closeBracket: string, text: string, diagnostics: Diagnostic[]): void {
        const stack: Array<{ line: number; character: number }> = [];
        const lines = text.split('\n');
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let inStringLiteral = false;
            let inCharLiteral = false;
            let inLineComment = false;
            let inBlockComment = false;
            let escapeNext = false;
            
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const nextChar = charIndex < line.length - 1 ? line[charIndex + 1] : '';
                
                // Handle escape sequences
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\' && (inStringLiteral || inCharLiteral)) {
                    escapeNext = true;
                    continue;
                }
                
                // Handle comments
                if (!inStringLiteral && !inCharLiteral) {
                    if (char === '/' && nextChar === '/') {
                        inLineComment = true;
                        charIndex++; // Skip next character
                        continue;
                    }
                    
                    if (char === '/' && nextChar === '*') {
                        inBlockComment = true;
                        charIndex++; // Skip next character
                        continue;
                    }
                    
                    if (inBlockComment && char === '*' && nextChar === '/') {
                        inBlockComment = false;
                        charIndex++; // Skip next character
                        continue;
                    }
                }
                
                // Skip if we're in a comment
                if (inLineComment || inBlockComment) {
                    continue;
                }
                
                // Handle string literals
                if (char === '"' && !inCharLiteral) {
                    inStringLiteral = !inStringLiteral;
                    continue;
                }
                
                // Handle character literals
                if (char === "'" && !inStringLiteral) {
                    inCharLiteral = !inCharLiteral;
                    continue;
                }
                
                // Skip if we're in a string or character literal
                if (inStringLiteral || inCharLiteral) {
                    continue;
                }
                
                // Check for brackets
                if (char === openBracket) {
                    stack.push({ line: lineIndex, character: charIndex });
                } else if (char === closeBracket) {
                    if (stack.length === 0) {
                        // Unmatched closing bracket
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: { line: lineIndex, character: charIndex },
                                end: { line: lineIndex, character: charIndex + 1 }
                            },
                            message: `Unmatched closing ${closeBracket}`,
                            source: 'drools-syntax'
                        });
                    } else {
                        stack.pop();
                    }
                }
            }
            
            // Reset line comment flag at end of line
            inLineComment = false;
        }
        
        // Report unmatched opening brackets
        for (const bracket of stack) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: bracket.line, character: bracket.character },
                    end: { line: bracket.line, character: bracket.character + 1 }
                },
                message: `Unmatched opening ${openBracket}`,
                source: 'drools-syntax'
            });
        }
    }

    /**
     * Validate rule names follow conventions
     */
    private validateRuleNames(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            // Check if rule name contains only valid characters
            if (rule.name && !/^[a-zA-Z0-9\s_-]+$/.test(rule.name)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: `Rule name "${rule.name}" contains invalid characters`,
                    source: 'drools-syntax'
                });
            }

            // Check if rule name is too long
            if (rule.name && rule.name.length > 100) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Information,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: `Rule name "${rule.name}" is very long (${rule.name.length} characters)`,
                    source: 'drools-best-practice'
                });
            }
        }
    }

    /**
     * Validate multi-line patterns for syntax correctness and completeness
     */
    private validateMultiLinePatterns(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            if (rule.when) {
                this.validateMultiLineConditions(rule.when.conditions, diagnostics);
            }
        }
    }

    /**
     * Validate multi-line conditions for completeness and syntax errors
     */
    private validateMultiLineConditions(conditions: ConditionNode[], diagnostics: Diagnostic[]): void {
        for (const condition of conditions) {
            // Check for incomplete multi-line patterns
            if (condition.isMultiLine && condition.multiLinePattern) {
                this.validateMultiLinePattern(condition.multiLinePattern, diagnostics);
            }

            // Check for unmatched parentheses in multi-line conditions
            if (condition.parenthesesRanges && condition.parenthesesRanges.length > 0) {
                this.validateParenthesesMatching(condition, diagnostics);
            }

            // Validate nested conditions recursively
            if (condition.nestedConditions) {
                this.validateMultiLineConditions(condition.nestedConditions, diagnostics);
            }
        }
    }

    /**
     * Validate a specific multi-line pattern
     */
    private validateMultiLinePattern(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        // Check if pattern is incomplete
        if (!pattern.isComplete) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: pattern.range.start.line, character: pattern.range.start.character },
                    end: { line: pattern.range.end.line, character: pattern.range.end.character }
                },
                message: `Incomplete ${pattern.keyword} pattern: missing closing parenthesis`,
                source: 'drools-multiline'
            });
        }

        // Check for empty pattern content
        if (!pattern.content || pattern.content.trim() === `${pattern.keyword}()`) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: pattern.range.start.line, character: pattern.range.start.character },
                    end: { line: pattern.range.end.line, character: pattern.range.end.character }
                },
                message: `Empty ${pattern.keyword} pattern`,
                source: 'drools-multiline'
            });
        }

        // Validate nested patterns recursively
        for (const nestedPattern of pattern.nestedPatterns) {
            this.validateMultiLinePattern(nestedPattern, diagnostics);
        }

        // Validate inner conditions
        if (pattern.innerConditions) {
            this.validateMultiLineConditions(pattern.innerConditions, diagnostics);
        }

        // Check for malformed pattern syntax
        this.validatePatternSyntax(pattern, diagnostics);
    }

    /**
     * Validate parentheses matching in conditions
     */
    private validateParenthesesMatching(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        if (!condition.parenthesesRanges) {
            return;
        }

        const openParens: Range[] = [];
        const closeParens: Range[] = [];

        // Separate opening and closing parentheses
        for (const range of condition.parenthesesRanges) {
            const char = this.getCharacterAtPosition(range.start);
            if (char === '(') {
                openParens.push(range);
            } else if (char === ')') {
                closeParens.push(range);
            }
        }

        // Check for unmatched opening parentheses
        if (openParens.length > closeParens.length) {
            const unmatchedCount = openParens.length - closeParens.length;
            const lastOpen = openParens[openParens.length - 1];
            
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lastOpen.start.line, character: lastOpen.start.character },
                    end: { line: lastOpen.end.line, character: lastOpen.end.character }
                },
                message: `${unmatchedCount} unmatched opening parenthesis${unmatchedCount > 1 ? 'es' : ''}`,
                source: 'drools-multiline'
            });
        }

        // Check for unmatched closing parentheses
        if (closeParens.length > openParens.length) {
            const unmatchedCount = closeParens.length - openParens.length;
            const firstClose = closeParens[0];
            
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: firstClose.start.line, character: firstClose.start.character },
                    end: { line: firstClose.end.line, character: firstClose.end.character }
                },
                message: `${unmatchedCount} unmatched closing parenthesis${unmatchedCount > 1 ? 'es' : ''}`,
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate pattern syntax for common errors
     */
    private validatePatternSyntax(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        const content = pattern.content.trim();

        // Check for malformed eval patterns
        if (pattern.patternType === 'eval') {
            const evalMatch = content.match(/^eval\s*\(\s*(.*?)\s*\)$/s);
            if (evalMatch) {
                const evalContent = evalMatch[1].trim();
                if (!evalContent) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: pattern.range.start.line, character: pattern.range.start.character },
                            end: { line: pattern.range.end.line, character: pattern.range.end.character }
                        },
                        message: 'eval() pattern cannot be empty',
                        source: 'drools-multiline'
                    });
                }
            }
        }

        // Check for malformed exists/not patterns
        if (pattern.patternType === 'exists' || pattern.patternType === 'not') {
            const patternMatch = content.match(new RegExp(`^${pattern.keyword}\\s*\\(\\s*(.*?)\\s*\\)$`, 's'));
            if (patternMatch) {
                const innerContent = patternMatch[1].trim();
                if (!innerContent) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: pattern.range.start.line, character: pattern.range.start.character },
                            end: { line: pattern.range.end.line, character: pattern.range.end.character }
                        },
                        message: `${pattern.keyword}() pattern cannot be empty`,
                        source: 'drools-multiline'
                    });
                }
            }
        }

        // Check for malformed accumulate patterns
        if (pattern.patternType === 'accumulate') {
            if (!content.includes('init:') || !content.includes('action:') || !content.includes('result:')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: pattern.range.start.line, character: pattern.range.start.character },
                        end: { line: pattern.range.end.line, character: pattern.range.end.character }
                    },
                    message: 'accumulate pattern must contain init:, action:, and result: clauses',
                    source: 'drools-multiline'
                });
            }
        }

        // Check for excessive nesting depth
        if (pattern.depth > 5) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: pattern.range.start.line, character: pattern.range.start.character },
                    end: { line: pattern.range.end.line, character: pattern.range.end.character }
                },
                message: `Deeply nested pattern (depth: ${pattern.depth}). Consider simplifying.`,
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Get character at a specific position in the document
     */
    private getCharacterAtPosition(position: Position): string {
        if (position.line >= 0 && position.line < this.documentLines.length) {
            const line = this.documentLines[position.line];
            if (position.character >= 0 && position.character < line.length) {
                return line[position.character];
            }
        }
        return '';
    }

    /**
     * Validate incomplete patterns and provide recovery suggestions
     */
    private validateIncompletePatterns(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            if (rule.when) {
                this.findIncompletePatterns(rule.when.conditions, diagnostics);
            }
        }
    }

    /**
     * Find and report incomplete patterns with recovery suggestions
     */
    private findIncompletePatterns(conditions: ConditionNode[], diagnostics: Diagnostic[]): void {
        for (const condition of conditions) {
            // Check for patterns that end abruptly
            if (condition.content) {
                const trimmed = condition.content.trim();
                
                // Check for incomplete exists/not/eval patterns
                const incompletePatterns = [
                    { keyword: 'exists', regex: /exists\s*\(\s*$/ },
                    { keyword: 'not', regex: /not\s*\(\s*$/ },
                    { keyword: 'eval', regex: /eval\s*\(\s*$/ },
                    { keyword: 'forall', regex: /forall\s*\(\s*$/ },
                    { keyword: 'collect', regex: /collect\s*\(\s*$/ },
                    { keyword: 'accumulate', regex: /accumulate\s*\(\s*$/ }
                ];

                for (const pattern of incompletePatterns) {
                    if (pattern.regex.test(trimmed)) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: {
                                start: { line: condition.range.start.line, character: condition.range.start.character },
                                end: { line: condition.range.end.line, character: condition.range.end.character }
                            },
                            message: `Incomplete ${pattern.keyword} pattern. Expected condition inside parentheses.`,
                            source: 'drools-recovery'
                        });
                    }
                }

                // Check for patterns with unbalanced parentheses
                const openCount = (trimmed.match(/\(/g) || []).length;
                const closeCount = (trimmed.match(/\)/g) || []).length;
                
                if (openCount > closeCount) {
                    const missingCount = openCount - closeCount;
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: condition.range.end.line, character: Math.max(0, condition.range.end.character - 1) },
                            end: { line: condition.range.end.line, character: condition.range.end.character }
                        },
                        message: `Missing ${missingCount} closing parenthesis${missingCount > 1 ? 'es' : ''}. Add ')' to complete the pattern.`,
                        source: 'drools-recovery'
                    });
                }
            }

            // Recursively check nested conditions
            if (condition.nestedConditions) {
                this.findIncompletePatterns(condition.nestedConditions, diagnostics);
            }
        }
    }

    /**
     * Enhanced validation that includes incomplete pattern detection
     */
    public provideDiagnosticsWithRecovery(document: TextDocument, ast: DroolsAST, parseErrors: ParseError[]): Diagnostic[] {
        this.document = document;
        this.documentLines = document.getText().split('\n');
        
        const diagnostics: Diagnostic[] = [];

        // Convert parser errors to diagnostics
        if (this.settings.enableSyntaxValidation) {
            this.addParseErrorDiagnostics(parseErrors, diagnostics);
        }

        // Perform semantic validation
        if (this.settings.enableSemanticValidation) {
            this.validateSemantics(ast, diagnostics);
        }

        // Check best practices
        if (this.settings.enableBestPracticeWarnings) {
            this.validateBestPractices(ast, diagnostics);
        }

        // Additional syntax validation beyond parser
        this.validateSyntaxDetails(ast, diagnostics);

        // Validate multi-line patterns with error recovery
        if (this.settings.enableSyntaxValidation) {
            this.validateMultiLinePatterns(ast, diagnostics);
            this.validateIncompletePatterns(ast, diagnostics);
        }

        // Limit the number of diagnostics
        return diagnostics.slice(0, this.settings.maxNumberOfProblems);
    }
            if (rule.when) {
                this.validateMultiLineConditions(rule.when.conditions, diagnostics);
            }
        }
    }

    /**
     * Validate multi-line conditions within when clauses
     */
    private validateMultiLineConditions(conditions: ConditionNode[], diagnostics: Diagnostic[]): void {
        for (const condition of conditions) {
            // Check if this is a multi-line pattern
            if (condition.isMultiLine && condition.multiLinePattern) {
                this.validateMultiLinePattern(condition.multiLinePattern, diagnostics);
            }

            // Check for multi-line pattern keywords and validate parentheses
            if (this.isMultiLinePatternCondition(condition)) {
                this.validateParenthesesMatching(condition, diagnostics);
                this.validateIncompleteMultiLinePattern(condition, diagnostics);
                
                // Also validate specific pattern types even without multiLinePattern property
                this.validateSpecificPatternTypeFromCondition(condition, diagnostics);
            }

            // Recursively validate nested conditions
            if (condition.nestedConditions) {
                this.validateMultiLineConditions(condition.nestedConditions, diagnostics);
            }
        }
    }

    /**
     * Check if a condition represents a multi-line pattern
     */
    private isMultiLinePatternCondition(condition: ConditionNode): boolean {
        const multiLinePatternTypes = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'] as const;
        const hasMultiLineType = multiLinePatternTypes.includes(condition.conditionType as any);
        const hasMultiLineKeywords = condition.content ? this.containsMultiLinePatternKeywords(condition.content) : false;
        return hasMultiLineType || hasMultiLineKeywords;
    }

    /**
     * Check if content contains multi-line pattern keywords
     */
    private containsMultiLinePatternKeywords(content: string): boolean {
        const keywords = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        return keywords.some(keyword => {
            const regex = new RegExp(`\\b${keyword}\\s*\\(`, 'i');
            return regex.test(content);
        });
    }

    /**
     * Validate parentheses matching for multi-line patterns
     */
    private validateParenthesesMatching(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content;
        const startLine = condition.range.start.line;
        const parenthesesTracker = this.analyzeParenthesesInContent(content, startLine);

        // Report unmatched opening parentheses
        for (const unmatchedOpen of parenthesesTracker.unmatchedOpen) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: unmatchedOpen,
                    end: { line: unmatchedOpen.line, character: unmatchedOpen.character + 1 }
                },
                message: 'Unmatched opening parenthesis in multi-line pattern',
                source: 'drools-multiline'
            });
        }

        // Report unmatched closing parentheses
        for (const unmatchedClose of parenthesesTracker.unmatchedClose) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: unmatchedClose,
                    end: { line: unmatchedClose.line, character: unmatchedClose.character + 1 }
                },
                message: 'Unmatched closing parenthesis in multi-line pattern',
                source: 'drools-multiline'
            });
        }

        // Check for proper nesting in multi-line patterns
        this.validateNestedPatternParentheses(condition, parenthesesTracker, diagnostics);
    }

    /**
     * Analyze parentheses in content and return tracking information
     */
    private analyzeParenthesesInContent(content: string, startLine: number): ParenthesesTracker {
        const tracker: ParenthesesTracker = {
            openPositions: [],
            closePositions: [],
            matchedPairs: [],
            unmatchedOpen: [],
            unmatchedClose: []
        };

        const lines = content.split('\n');
        const stack: Position[] = [];

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let inStringLiteral = false;
            let inCharLiteral = false;
            let inComment = false;
            let escapeNext = false;

            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const nextChar = charIndex < line.length - 1 ? line[charIndex + 1] : '';

                // Handle escape sequences
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === '\\' && (inStringLiteral || inCharLiteral)) {
                    escapeNext = true;
                    continue;
                }

                // Handle comments
                if (!inStringLiteral && !inCharLiteral) {
                    if (char === '/' && nextChar === '/') {
                        inComment = true;
                        charIndex++; // Skip next character
                        continue;
                    }
                }

                // Skip if in comment
                if (inComment) {
                    continue;
                }

                // Handle string literals
                if (char === '"' && !inCharLiteral) {
                    inStringLiteral = !inStringLiteral;
                    continue;
                }

                // Handle character literals
                if (char === "'" && !inStringLiteral) {
                    inCharLiteral = !inCharLiteral;
                    continue;
                }

                // Skip if in string or character literal
                if (inStringLiteral || inCharLiteral) {
                    continue;
                }

                const position: Position = {
                    line: startLine + lineIndex,
                    character: charIndex
                };

                // Track parentheses
                if (char === '(') {
                    tracker.openPositions.push(position);
                    stack.push(position);
                } else if (char === ')') {
                    tracker.closePositions.push(position);
                    
                    if (stack.length > 0) {
                        const matchedOpen = stack.pop()!;
                        tracker.matchedPairs.push({
                            open: matchedOpen,
                            close: position
                        });
                    } else {
                        tracker.unmatchedClose.push(position);
                    }
                }
            }

            // Reset comment flag at end of line
            inComment = false;
        }

        // Any remaining items in stack are unmatched opening parentheses
        tracker.unmatchedOpen = stack;

        return tracker;
    }

    /**
     * Validate nested pattern parentheses for proper structure
     */
    private validateNestedPatternParentheses(condition: ConditionNode, tracker: ParenthesesTracker, diagnostics: Diagnostic[]): void {
        // Check for deeply nested patterns that might be confusing
        const maxNestingLevel = 5;
        let currentNesting = 0;
        let maxNesting = 0;

        for (const pair of tracker.matchedPairs) {
            // Simple heuristic: count nesting by checking if opening parentheses are within other pairs
            let nestingLevel = 0;
            for (const otherPair of tracker.matchedPairs) {
                if (otherPair !== pair &&
                    otherPair.open.line <= pair.open.line &&
                    otherPair.close.line >= pair.close.line &&
                    (otherPair.open.line < pair.open.line || otherPair.open.character < pair.open.character) &&
                    (otherPair.close.line > pair.close.line || otherPair.close.character > pair.close.character)) {
                    nestingLevel++;
                }
            }
            maxNesting = Math.max(maxNesting, nestingLevel);
        }

        if (maxNesting > maxNestingLevel) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: condition.range,
                message: `Multi-line pattern has deep nesting (${maxNesting} levels). Consider simplifying for better readability.`,
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate incomplete multi-line patterns
     */
    private validateIncompleteMultiLinePattern(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content;
        
        // Check for incomplete pattern keywords
        const incompletePatterns = [
            { keyword: 'exists', regex: /\bexists\s*$/ },
            { keyword: 'not', regex: /\bnot\s*$/ },
            { keyword: 'eval', regex: /\beval\s*$/ },
            { keyword: 'forall', regex: /\bforall\s*$/ },
            { keyword: 'collect', regex: /\bcollect\s*$/ },
            { keyword: 'accumulate', regex: /\baccumulate\s*$/ }
        ];

        for (const pattern of incompletePatterns) {
            if (pattern.regex.test(content.trim())) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: condition.range,
                    message: `Incomplete ${pattern.keyword} pattern: missing opening parenthesis`,
                    source: 'drools-multiline'
                });
            }
        }

        // Check for patterns with opening parenthesis but no content
        const emptyPatterns = [
            { keyword: 'exists', regex: /\bexists\s*\(\s*\)?\s*$/ },
            { keyword: 'not', regex: /\bnot\s*\(\s*\)?\s*$/ },
            { keyword: 'eval', regex: /\beval\s*\(\s*\)?\s*$/ },
            { keyword: 'forall', regex: /\bforall\s*\(\s*\)?\s*$/ },
            { keyword: 'collect', regex: /\bcollect\s*\(\s*\)?\s*$/ },
            { keyword: 'accumulate', regex: /\baccumulate\s*\(\s*\)?\s*$/ }
        ];

        for (const pattern of emptyPatterns) {
            if (pattern.regex.test(content.trim())) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: condition.range,
                    message: `Empty ${pattern.keyword} pattern: missing content within parentheses`,
                    source: 'drools-multiline'
                });
            }
        }

        // Check for patterns that span multiple lines but are incomplete
        if (content.includes('\n')) {
            const lines = content.split('\n');
            
            // Check each line for incomplete patterns
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Check if any line suggests an incomplete pattern
                if (line === '' || line.endsWith(',') || line.endsWith('&&') || line.endsWith('||')) {
                    // Skip the last line if it's just a closing parenthesis
                    if (i === lines.length - 1 && (line === ')' || line === '')) {
                        continue;
                    }
                    
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { 
                                line: condition.range.start.line + i, 
                                character: 0 
                            },
                            end: { 
                                line: condition.range.start.line + i, 
                                character: Math.max(line.length, 1)
                            }
                        },
                        message: 'Multi-line pattern appears to be incomplete',
                        source: 'drools-multiline'
                    });
                    break; // Only report the first incomplete line
                }
            }
        }
    }

    /**
     * Validate a specific multi-line pattern node
     */
    private validateMultiLinePattern(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        // Check if pattern is complete
        if (!pattern.isComplete) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: pattern.range,
                message: `Incomplete ${pattern.patternType} pattern: unbalanced parentheses`,
                source: 'drools-multiline'
            });
        }

        // Validate nested patterns
        for (const nestedPattern of pattern.nestedPatterns) {
            this.validateMultiLinePattern(nestedPattern, diagnostics);
        }

        // Check for proper content within the pattern
        if (!pattern.content || pattern.content.trim() === '') {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: pattern.range,
                message: `Empty ${pattern.patternType} pattern: missing content`,
                source: 'drools-multiline'
            });
        }

        // Validate specific pattern types
        this.validateSpecificPatternType(pattern, diagnostics);

        // Check for context-aware errors in nested patterns
        this.validateNestedPatternContext(pattern, diagnostics);
    }

    /**
     * Validate specific pattern types with their own rules
     */
    private validateSpecificPatternType(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        switch (pattern.patternType) {
            case 'eval':
                this.validateEvalPattern(pattern, diagnostics);
                break;
            case 'exists':
            case 'not':
                this.validateExistsNotPattern(pattern, diagnostics);
                break;
            case 'forall':
                this.validateForallPattern(pattern, diagnostics);
                break;
            case 'collect':
            case 'accumulate':
                this.validateCollectAccumulatePattern(pattern, diagnostics);
                break;
        }
    }

    /**
     * Validate eval patterns
     */
    private validateEvalPattern(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        const content = pattern.content.trim();
        
        // Check if eval contains valid expression
        if (!content || content === 'eval()' || content === 'eval(\n)') {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: pattern.range,
                message: 'eval pattern must contain a valid boolean expression',
                source: 'drools-multiline'
            });
        }

        // Check for common eval mistakes
        if (content.includes('=') && !content.includes('==') && !content.includes('!=')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: pattern.range,
                message: 'eval pattern contains assignment (=) instead of comparison (==). Did you mean to use == for comparison?',
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate exists/not patterns
     */
    private validateExistsNotPattern(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        const content = pattern.content.trim();
        
        // Check if exists/not contains valid pattern
        if (!content || content === `${pattern.patternType}()` || content === `${pattern.patternType}(\n)`) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: pattern.range,
                message: `${pattern.patternType} pattern must contain a valid condition or fact pattern`,
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate forall patterns
     */
    private validateForallPattern(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        const content = pattern.content.trim();
        
        // forall requires at least two conditions
        if (!content.includes(',') && !content.includes('\n')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: pattern.range,
                message: 'forall pattern typically requires multiple conditions separated by commas',
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate collect/accumulate patterns
     */
    private validateCollectAccumulatePattern(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        const content = pattern.content.trim();
        
        // These patterns have specific syntax requirements
        if (pattern.patternType === 'accumulate' && !content.includes('init') && !content.includes('action') && !content.includes('result')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: pattern.range,
                message: 'accumulate pattern should contain init, action, and result clauses',
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate specific pattern types from condition node (without multiLinePattern property)
     */
    private validateSpecificPatternTypeFromCondition(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        switch (condition.conditionType) {
            case 'eval':
                this.validateEvalPatternFromCondition(condition, diagnostics);
                break;
            case 'exists':
            case 'not':
                this.validateExistsNotPatternFromCondition(condition, diagnostics);
                break;
            case 'forall':
                this.validateForallPatternFromCondition(condition, diagnostics);
                break;
            case 'collect':
            case 'accumulate':
                this.validateCollectAccumulatePatternFromCondition(condition, diagnostics);
                break;
        }
    }

    /**
     * Validate eval patterns from condition node
     */
    private validateEvalPatternFromCondition(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content.trim();
        
        // Check if eval contains valid expression
        if (!content || content === 'eval()' || content === 'eval(\n)') {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: condition.range,
                message: 'eval pattern must contain a valid boolean expression',
                source: 'drools-multiline'
            });
        }

        // Check for common eval mistakes
        if (content.includes('=') && !content.includes('==') && !content.includes('!=')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: condition.range,
                message: 'eval pattern contains assignment (=) instead of comparison (==). Did you mean to use == for comparison?',
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate exists/not patterns from condition node
     */
    private validateExistsNotPatternFromCondition(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content.trim();
        
        // Check if exists/not contains valid pattern
        if (!content || content === `${condition.conditionType}()` || content === `${condition.conditionType}(\n)`) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: condition.range,
                message: `${condition.conditionType} pattern must contain a valid condition or fact pattern`,
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate forall patterns from condition node
     */
    private validateForallPatternFromCondition(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content.trim();
        
        // forall requires at least two conditions
        if (!content.includes(',') && !content.includes('\n')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: condition.range,
                message: 'forall pattern typically requires multiple conditions separated by commas',
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate collect/accumulate patterns from condition node
     */
    private validateCollectAccumulatePatternFromCondition(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content.trim();
        
        // These patterns have specific syntax requirements
        if (condition.conditionType === 'accumulate' && !content.includes('init') && !content.includes('action') && !content.includes('result')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: condition.range,
                message: 'accumulate pattern should contain init, action, and result clauses',
                source: 'drools-multiline'
            });
        }
    }

    /**
     * Validate nested pattern context for proper usage
     */
    private validateNestedPatternContext(pattern: MultiLinePatternNode, diagnostics: Diagnostic[]): void {
        // Check for excessive nesting depth
        if (pattern.depth > 3) {
            diagnostics.push({
                severity: DiagnosticSeverity.Information,
                range: pattern.range,
                message: `Deeply nested ${pattern.patternType} pattern (depth: ${pattern.depth}). Consider refactoring for better readability.`,
                source: 'drools-multiline'
            });
        }

        // Check for logical inconsistencies in nested patterns
        if (pattern.patternType === 'not' && pattern.nestedPatterns.some(nested => nested.patternType === 'not')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Information,
                range: pattern.range,
                message: 'Double negation detected (not containing not). Consider simplifying the logic.',
                source: 'drools-multiline'
            });
        }

        // Check for redundant exists patterns
        if (pattern.patternType === 'exists' && pattern.nestedPatterns.some(nested => nested.patternType === 'exists')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Information,
                range: pattern.range,
                message: 'Nested exists patterns detected. The inner exists may be redundant.',
                source: 'drools-multiline'
            });
        }
    }
}