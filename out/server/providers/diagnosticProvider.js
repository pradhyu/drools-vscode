"use strict";
/**
 * Diagnostic provider for Drools language error detection and validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DroolsDiagnosticProvider = void 0;
const node_1 = require("vscode-languageserver/node");
class DroolsDiagnosticProvider {
    constructor(settings) {
        this.settings = settings;
    }
    /**
     * Analyze the document and AST to generate diagnostics
     */
    provideDiagnostics(document, ast, parseErrors) {
        this.document = document;
        this.documentLines = document.getText().split('\n');
        const diagnostics = [];
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
        // Limit the number of diagnostics
        return diagnostics.slice(0, this.settings.maxNumberOfProblems);
    }
    /**
     * Convert parser errors to LSP diagnostics
     */
    addParseErrorDiagnostics(parseErrors, diagnostics) {
        for (const error of parseErrors) {
            diagnostics.push({
                severity: error.severity === 'error' ? node_1.DiagnosticSeverity.Error : node_1.DiagnosticSeverity.Warning,
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
    validateSemantics(ast, diagnostics) {
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
    validateDuplicateRuleNames(ast, diagnostics) {
        const ruleNames = new Map();
        for (const rule of ast.rules) {
            if (ruleNames.has(rule.name)) {
                const firstRule = ruleNames.get(rule.name);
                // Add error to the duplicate rule
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: `Duplicate rule name: "${rule.name}". First defined at line ${firstRule.range.start.line + 1}`,
                    source: 'drools-semantic'
                });
            }
            else {
                ruleNames.set(rule.name, rule);
            }
        }
    }
    /**
     * Check for duplicate function names
     */
    validateDuplicateFunctionNames(ast, diagnostics) {
        const functionNames = new Map();
        for (const func of ast.functions) {
            if (functionNames.has(func.name)) {
                const firstFunction = functionNames.get(func.name);
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: func.range.start.line, character: func.range.start.character },
                        end: { line: func.range.end.line, character: func.range.end.character }
                    },
                    message: `Duplicate function name: "${func.name}". First defined at line ${firstFunction.range.start.line + 1}`,
                    source: 'drools-semantic'
                });
            }
            else {
                functionNames.set(func.name, func);
            }
        }
    }
    /**
     * Check for duplicate global names
     */
    validateDuplicateGlobalNames(ast, diagnostics) {
        const globalNames = new Set();
        for (const global of ast.globals) {
            if (globalNames.has(global.name)) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: global.range.start.line, character: global.range.start.character },
                        end: { line: global.range.end.line, character: global.range.end.character }
                    },
                    message: `Duplicate global variable: "${global.name}"`,
                    source: 'drools-semantic'
                });
            }
            else {
                globalNames.add(global.name);
            }
        }
    }
    /**
     * Validate rule structure and completeness
     */
    validateRuleStructure(ast, diagnostics) {
        for (const rule of ast.rules) {
            // Check if rule has empty name
            if (!rule.name || rule.name.trim() === '') {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
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
                    severity: node_1.DiagnosticSeverity.Warning,
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
                    severity: node_1.DiagnosticSeverity.Warning,
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
                    severity: node_1.DiagnosticSeverity.Warning,
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
    validateConditions(whenClause, diagnostics) {
        for (const condition of whenClause.conditions) {
            // Check for malformed pattern conditions
            if (condition.conditionType === 'pattern') {
                if (condition.variable && !condition.variable.startsWith('$')) {
                    diagnostics.push({
                        severity: node_1.DiagnosticSeverity.Error,
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
                        severity: node_1.DiagnosticSeverity.Warning,
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
                    severity: node_1.DiagnosticSeverity.Error,
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
    validateFunctionStructure(ast, diagnostics) {
        for (const func of ast.functions) {
            // Check if function has empty name
            if (!func.name || func.name.trim() === '') {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
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
                    severity: node_1.DiagnosticSeverity.Error,
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
                    severity: node_1.DiagnosticSeverity.Warning,
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
                        severity: node_1.DiagnosticSeverity.Error,
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
                        severity: node_1.DiagnosticSeverity.Error,
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
    validateVariableUsage(ast, diagnostics) {
        for (const rule of ast.rules) {
            if (!rule.when || !rule.then) {
                continue;
            }
            // Collect declared variables from when clause
            const declaredVariables = new Set();
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
                        severity: node_1.DiagnosticSeverity.Error,
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
    validateBestPractices(ast, diagnostics) {
        // Check for rules without salience when multiple rules exist
        if (ast.rules.length > 1) {
            for (const rule of ast.rules) {
                const hasSalience = rule.attributes.some(attr => attr.name === 'salience');
                if (!hasSalience) {
                    diagnostics.push({
                        severity: node_1.DiagnosticSeverity.Information,
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
                        severity: node_1.DiagnosticSeverity.Information,
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
        const usedGlobals = new Set();
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
                    severity: node_1.DiagnosticSeverity.Information,
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
    findGlobalUsage(text, globalNames, usedGlobals) {
        for (const globalName of globalNames) {
            if (text.includes(globalName)) {
                usedGlobals.add(globalName);
            }
        }
    }
    /**
     * Validate additional syntax details not caught by the parser
     */
    validateSyntaxDetails(ast, diagnostics) {
        // Check for missing semicolons in specific contexts
        this.validateMissingSemicolons(ast, diagnostics);
        // Check for unmatched brackets
        this.validateBracketMatching(diagnostics);
        // Check for malformed rule names
        this.validateRuleNames(ast, diagnostics);
    }
    /**
     * Check for missing semicolons
     */
    validateMissingSemicolons(ast, diagnostics) {
        // Check package declaration
        if (ast.packageDeclaration) {
            const line = this.documentLines[ast.packageDeclaration.range.start.line];
            if (line && !line.trim().endsWith(';')) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Warning,
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
                    severity: node_1.DiagnosticSeverity.Warning,
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
                    severity: node_1.DiagnosticSeverity.Warning,
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
     * Check for unmatched brackets
     */
    validateBracketMatching(diagnostics) {
        const bracketPairs = [
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '[', close: ']' }
        ];
        for (let lineIndex = 0; lineIndex < this.documentLines.length; lineIndex++) {
            const line = this.documentLines[lineIndex];
            for (const pair of bracketPairs) {
                const stack = [];
                for (let charIndex = 0; charIndex < line.length; charIndex++) {
                    const char = line[charIndex];
                    if (char === pair.open) {
                        stack.push(charIndex);
                    }
                    else if (char === pair.close) {
                        if (stack.length === 0) {
                            diagnostics.push({
                                severity: node_1.DiagnosticSeverity.Error,
                                range: {
                                    start: { line: lineIndex, character: charIndex },
                                    end: { line: lineIndex, character: charIndex + 1 }
                                },
                                message: `Unmatched closing ${pair.close}`,
                                source: 'drools-syntax'
                            });
                        }
                        else {
                            stack.pop();
                        }
                    }
                }
                // Report unmatched opening brackets
                for (const openIndex of stack) {
                    diagnostics.push({
                        severity: node_1.DiagnosticSeverity.Error,
                        range: {
                            start: { line: lineIndex, character: openIndex },
                            end: { line: lineIndex, character: openIndex + 1 }
                        },
                        message: `Unmatched opening ${pair.open}`,
                        source: 'drools-syntax'
                    });
                }
            }
        }
    }
    /**
     * Validate rule names follow conventions
     */
    validateRuleNames(ast, diagnostics) {
        for (const rule of ast.rules) {
            // Check if rule name contains only valid characters
            if (rule.name && !/^[a-zA-Z0-9\s_-]+$/.test(rule.name)) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Warning,
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
                    severity: node_1.DiagnosticSeverity.Information,
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
}
exports.DroolsDiagnosticProvider = DroolsDiagnosticProvider;
//# sourceMappingURL=diagnosticProvider.js.map