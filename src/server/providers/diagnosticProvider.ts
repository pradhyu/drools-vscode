/**
 * Diagnostic provider for Drools language error detection and validation
 * Based on official Drools LSP implementation: https://github.com/kiegroup/drools-lsp
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

        // Perform semantic validation with fixed false positive issues
        if (this.settings.enableSemanticValidation) {
            this.validateSemantics(ast, diagnostics);
        }

        // Validate Drools keywords and language constructs
        if (this.settings.enableSyntaxValidation) {
            this.validateDroolsKeywords(diagnostics);
        }

        // Check best practices with corrected logic
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
     * Validate semantic correctness according to official Drools LSP specification
     * Based on https://github.com/kiegroup/drools-lsp implementation
     */
    private validateSemantics(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Core semantic validations based on official Drools LSP patterns
        
        // 1. Validate package declaration (optional but if present, must be valid)
        this.validatePackageDeclaration(ast, diagnostics);
        
        // 2. Validate import statements
        this.validateImportStatements(ast, diagnostics);
        
        // 3. Check for duplicate rule names (semantic error in Drools)
        this.validateDuplicateRuleNames(ast, diagnostics);
        
        // 4. Check for duplicate function names (semantic error in Drools)
        this.validateDuplicateFunctionNames(ast, diagnostics);
        
        // 5. Check for duplicate global names (semantic error in Drools)
        this.validateDuplicateGlobalNames(ast, diagnostics);
        
        // 6. Validate rule structure according to Drools specification
        this.validateDroolsRuleStructure(ast, diagnostics);
        
        // 7. Validate function structure according to Drools specification
        this.validateDroolsFunctionStructure(ast, diagnostics);
        
        // 8. Validate rule attributes are valid Drools attributes
        this.validateDroolsRuleAttributes(ast, diagnostics);
        
        // 9. Validate global variable declarations
        this.validateGlobalDeclarations(ast, diagnostics);
        
        // 10. Validate syntax patterns and constructs
        this.validateDroolsSyntaxPatterns(ast, diagnostics);
        
        // Variable validation is intentionally disabled due to complexity of Drools variable scoping
        // The official Drools LSP also handles variable scoping carefully to avoid false positives
        // Drools has complex variable scoping rules that require deep understanding of:
        // - Pattern binding variables ($var : Type)
        // - Accumulate result variables
        // - Collect result variables  
        // - Nested pattern variables in exists/not/forall
        // - Cross-rule variable references
        // Until we can implement proper Drools variable scoping like the official LSP, this validation is disabled
        // to prevent false positives
    }

    /**
     * Validate package declaration according to Drools specification
     */
    private validatePackageDeclaration(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        if (ast.packageDeclaration) {
            // Package name should follow Java package naming conventions
            const packageName = ast.packageDeclaration.name;
            if (packageName && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(packageName)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: ast.packageDeclaration.range.start.line, character: ast.packageDeclaration.range.start.character },
                        end: { line: ast.packageDeclaration.range.end.line, character: ast.packageDeclaration.range.end.character }
                    },
                    message: 'Package name should follow Java naming conventions (lowercase, dot-separated)',
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Validate import statements according to Drools specification
     */
    private validateImportStatements(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        const importPaths = new Set<string>();
        
        for (const importNode of ast.imports) {
            // Check for duplicate imports
            if (importPaths.has(importNode.path)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: importNode.range.start.line, character: importNode.range.start.character },
                        end: { line: importNode.range.end.line, character: importNode.range.end.character }
                    },
                    message: `Duplicate import: "${importNode.path}"`,
                    source: 'drools-semantic'
                });
            } else {
                importPaths.add(importNode.path);
            }

            // Validate import path format (including static imports)
            const isStaticImport = importNode.isStatic || importNode.path.startsWith('static ');
            const pathToValidate = isStaticImport ? importNode.path.replace(/^static\s+/, '') : importNode.path;
            
            // Allow both regular imports and static imports
            const validImportPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*(\.\*|(\.[a-zA-Z_][a-zA-Z0-9_]*))?$/;
            
            if (importNode.path && !validImportPattern.test(pathToValidate)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: importNode.range.start.line, character: importNode.range.start.character },
                        end: { line: importNode.range.end.line, character: importNode.range.end.character }
                    },
                    message: `Invalid import path: "${importNode.path}"`,
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Validate rule structure according to Drools specification
     */
    private validateDroolsRuleStructure(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            // Rule must have a name
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

            // Rule name should be quoted if it contains spaces or special characters
            if (rule.name && /[\s\-\.]/.test(rule.name) && !rule.name.startsWith('"')) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: 'Rule names with spaces or special characters should be quoted',
                    source: 'drools-semantic'
                });
            }

            // A rule should have at least a when or then clause (or both)
            if (!rule.when && !rule.then) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: 'Rule must have at least a when or then clause',
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Validate function structure according to Drools specification
     */
    private validateDroolsFunctionStructure(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const func of ast.functions) {
            // Function must have a name
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

            // Function must have a return type
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

            // Validate parameter structure
            for (const param of func.parameters) {
                if (!param.name || param.name.trim() === '') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: param.range.start.line, character: param.range.start.character },
                            end: { line: param.range.end.line, character: param.range.end.character }
                        },
                        message: 'Function parameter must have a name',
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
                        message: 'Function parameter must have a type',
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Validate rule attributes according to Drools specification
     */
    private validateDroolsRuleAttributes(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        const validAttributes = [
            'salience', 'no-loop', 'agenda-group', 'auto-focus', 'activation-group',
            'ruleflow-group', 'lock-on-active', 'dialect', 'date-effective', 'date-expires',
            'duration', 'timer', 'calendars', 'enabled'
        ];

        for (const rule of ast.rules) {
            // If the parser isn't correctly parsing attributes, we need to validate them from the raw text
            if (rule.attributes.length === 0) {
                // Fallback: validate attributes from the rule text
                this.validateRuleAttributesFromText(rule, validAttributes, diagnostics);
            } else {
                // Normal validation when parser correctly identifies attributes
                for (const attribute of rule.attributes) {
                    // Check if attribute name is valid
                    if (!validAttributes.includes(attribute.name)) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: rule.range.start.line, character: rule.range.start.character },
                                end: { line: rule.range.end.line, character: rule.range.end.character }
                            },
                            message: `Unknown rule attribute: "${attribute.name}". Valid attributes are: ${validAttributes.join(', ')}`,
                            source: 'drools-semantic'
                        });
                    }

                    // Validate attribute values based on type
                    this.validateAttributeValue(rule, attribute, diagnostics);
                }
            }
        }
    }

    /**
     * Validate rule attributes from raw text when parser doesn't capture them
     */
    private validateRuleAttributesFromText(rule: RuleNode, validAttributes: string[], diagnostics: Diagnostic[]): void {
        const ruleStartLine = rule.range.start.line;
        const ruleEndLine = rule.range.end.line;
        
        // Get the rule text
        let ruleText = '';
        for (let i = ruleStartLine; i <= ruleEndLine && i < this.documentLines.length; i++) {
            ruleText += this.documentLines[i] + '\n';
        }

        // Look for potential attributes in the rule text
        const attributePattern = /\b([a-zA-Z-]+)\s+(true|false|\d+|"[^"]*")/g;
        let match;
        
        while ((match = attributePattern.exec(ruleText)) !== null) {
            const attributeName = match[1];
            
            // Skip if it's a known keyword that's not an attribute
            if (['rule', 'when', 'then', 'end', 'import', 'package', 'global', 'function'].includes(attributeName)) {
                continue;
            }
            
            // Check if it's a valid attribute
            if (!validAttributes.includes(attributeName)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: `Unknown rule attribute: "${attributeName}". Valid attributes are: ${validAttributes.join(', ')}`,
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Validate global variable declarations according to Drools specification
     */
    private validateGlobalDeclarations(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const global of ast.globals) {
            // Global must have a name
            if (!global.name || global.name.trim() === '') {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: global.range.start.line, character: global.range.start.character },
                        end: { line: global.range.end.line, character: global.range.end.character }
                    },
                    message: 'Global variable must have a name',
                    source: 'drools-semantic'
                });
            }

            // Global must have a type
            if (!global.dataType || global.dataType.trim() === '') {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: global.range.start.line, character: global.range.start.character },
                        end: { line: global.range.end.line, character: global.range.end.character }
                    },
                    message: 'Global variable must have a type',
                    source: 'drools-semantic'
                });
            }

            // Global name should follow Java variable naming conventions
            if (global.name && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(global.name)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: global.range.start.line, character: global.range.start.character },
                        end: { line: global.range.end.line, character: global.range.end.character }
                    },
                    message: 'Global variable name should follow Java naming conventions',
                    source: 'drools-semantic'
                });
            }
        }
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
     * Validate conditions within when clauses - fixed false positives
     */
    private validateConditions(whenClause: WhenNode, diagnostics: Diagnostic[]): void {
        for (const condition of whenClause.conditions) {
            // Only validate truly problematic conditions, not style preferences
            
            // Check for empty eval conditions (actual error)
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

            // Removed overly strict validations that cause false positives:
            // - Variable name format validation (too strict)
            // - Fact type requirement (not always needed)
            // These validations were causing false positives for valid Drools code
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

            // Collect declared variables from when clause (including nested patterns)
            const declaredVariables = new Set<string>();
            
            // Primary method: collect from AST conditions
            this.collectVariablesFromConditions(rule.when.conditions, declaredVariables);

            // Fallback method: collect directly from the when clause text
            // This is crucial for cases where the parser might not have fully captured all variables
            const whenContent = this.getWhenClauseContent(rule);
            this.collectVariablesFromText(whenContent, declaredVariables);

            // Additional fallback: collect from the entire rule text as last resort
            const ruleContent = this.getRuleContent(rule);
            this.collectVariablesFromText(ruleContent, declaredVariables);

            // Debug logging (can be removed in production)
            console.log(`Rule "${rule.name}" - Declared variables:`, Array.from(declaredVariables));

            // Check for variable usage in then clause
            const thenActions = rule.then.actions;
            const variableUsageRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*/g;
            const usedVariables = thenActions.match(variableUsageRegex) || [];

            // Debug logging (can be removed in production)
            console.log(`Rule "${rule.name}" - Used variables:`, usedVariables);

            for (const usedVar of usedVariables) {
                if (!declaredVariables.has(usedVar)) {
                    // Find the approximate position of the undefined variable
                    const thenLines = thenActions.split('\n');
                    let lineIndex = -1;
                    let charIndex = -1;
                    
                    for (let i = 0; i < thenLines.length; i++) {
                        const index = thenLines[i].indexOf(usedVar);
                        if (index !== -1) {
                            lineIndex = i;
                            charIndex = index;
                            break;
                        }
                    }
                    
                    const line = rule.then.range.start.line + (lineIndex >= 0 ? lineIndex : 0);
                    const character = charIndex >= 0 ? charIndex : 0;
                    
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line, character },
                            end: { line, character: character + usedVar.length }
                        },
                        message: `Undefined variable: ${usedVar}`,
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Recursively collect variables from conditions, including nested multi-line patterns
     */
    private collectVariablesFromConditions(conditions: ConditionNode[], declaredVariables: Set<string>): void {
        for (const condition of conditions) {
            // Add variable from current condition
            if (condition.variable) {
                declaredVariables.add(condition.variable);
            }

            // Extract variables from condition content using regex
            // This handles cases where variables might be declared within the condition text
            const variableRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*\s*:/g;
            const matches = condition.content.match(variableRegex);
            if (matches) {
                for (const match of matches) {
                    const variable = match.replace(':', '').trim();
                    declaredVariables.add(variable);
                }
            }

            // Recursively collect from nested conditions (multi-line patterns)
            if (condition.nestedConditions && condition.nestedConditions.length > 0) {
                this.collectVariablesFromConditions(condition.nestedConditions, declaredVariables);
            }

            // Collect from multi-line pattern inner conditions
            if (condition.multiLinePattern && condition.multiLinePattern.innerConditions) {
                this.collectVariablesFromConditions(condition.multiLinePattern.innerConditions, declaredVariables);
            }

            // Additional parsing for complex multi-line patterns
            if (condition.isMultiLine && condition.content) {
                this.extractVariablesFromMultiLineContent(condition.content, declaredVariables);
            }
        }
    }

    /**
     * Extract variables from multi-line pattern content
     */
    private extractVariablesFromMultiLineContent(content: string, declaredVariables: Set<string>): void {
        // Pattern to match variable declarations in multi-line patterns
        // Matches patterns like: $variable : FactType(...) or $var : Type
        const variableDeclarationRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[a-zA-Z_][a-zA-Z0-9_.]*/g;
        const matches = content.match(variableDeclarationRegex);
        
        if (matches) {
            for (const match of matches) {
                const variable = match.split(':')[0].trim();
                if (variable.startsWith('$')) {
                    declaredVariables.add(variable);
                }
            }
        }

        // Also look for simple variable bindings without explicit type
        const simpleVariableRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*(?=\s*[=:])/g;
        const simpleMatches = content.match(simpleVariableRegex);
        
        if (simpleMatches) {
            for (const variable of simpleMatches) {
                declaredVariables.add(variable.trim());
            }
        }
    }

    /**
     * Get the raw content of the when clause from the document
     */
    private getWhenClauseContent(rule: RuleNode): string {
        if (!rule.when) {
            return '';
        }

        const startLine = rule.when.range.start.line;
        const endLine = rule.when.range.end.line;
        
        let content = '';
        for (let i = startLine; i <= endLine && i < this.documentLines.length; i++) {
            content += this.documentLines[i] + '\n';
        }
        
        return content;
    }

    /**
     * Extract variables from text content using regex (fallback method)
     */
    private collectVariablesFromText(text: string, declaredVariables: Set<string>): void {
        // Pattern to match variable declarations: $variableName : FactType
        const variableDeclarationRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
        let match;
        
        while ((match = variableDeclarationRegex.exec(text)) !== null) {
            declaredVariables.add('$' + match[1]);
        }

        // Also match variables in simple patterns without explicit typing
        // This handles cases like: $var = someExpression
        const simpleVariableRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
        let simpleMatch;
        
        while ((simpleMatch = simpleVariableRegex.exec(text)) !== null) {
            declaredVariables.add('$' + simpleMatch[1]);
        }
    }

    /**
     * Get the raw content of the entire rule from the document
     */
    private getRuleContent(rule: RuleNode): string {
        const startLine = rule.range.start.line;
        const endLine = rule.range.end.line;
        
        let content = '';
        for (let i = startLine; i <= endLine && i < this.documentLines.length; i++) {
            content += this.documentLines[i] + '\n';
        }
        
        return content;
    }

    /**
     * Validate best practices and style guidelines according to Drools documentation
     */
    private validateBestPractices(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Note: Salience is NOT required in Drools rules. It's only needed when you want to control rule execution order.
        // According to the official Drools documentation, salience is completely optional.

        // Check for rules that might cause infinite loops (actual best practice)
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

        // Validate rule attributes according to Drools specification
        this.validateRuleAttributes(ast, diagnostics);

        // Check for potential performance issues
        this.validatePerformanceIssues(ast, diagnostics);

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

    /**
     * Validate rule attributes according to Drools specification
     */
    private validateRuleAttributes(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            for (const attribute of rule.attributes) {
                this.validateSingleRuleAttribute(rule, attribute, diagnostics);
            }
        }
    }

    /**
     * Validate a single rule attribute
     */
    private validateSingleRuleAttribute(rule: RuleNode, attribute: any, diagnostics: Diagnostic[]): void {
        const validAttributes = [
            'salience', 'no-loop', 'agenda-group', 'auto-focus', 'activation-group',
            'ruleflow-group', 'lock-on-active', 'dialect', 'date-effective', 'date-expires',
            'duration', 'timer', 'calendars', 'enabled'
        ];

        if (!validAttributes.includes(attribute.name)) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: attribute.range?.start.line || rule.range.start.line, character: attribute.range?.start.character || 0 },
                    end: { line: attribute.range?.end.line || rule.range.start.line, character: attribute.range?.end.character || 100 }
                },
                message: `Unknown rule attribute: "${attribute.name}". Valid attributes are: ${validAttributes.join(', ')}`,
                source: 'drools-semantic'
            });
        }

        // Validate attribute values
        this.validateAttributeValue(rule, attribute, diagnostics);
    }

    /**
     * Validate rule attribute values
     */
    private validateAttributeValue(rule: RuleNode, attribute: any, diagnostics: Diagnostic[]): void {
        switch (attribute.name) {
            case 'salience':
                if (attribute.value !== undefined && typeof attribute.value !== 'number') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: attribute.range?.start.line || rule.range.start.line, character: attribute.range?.start.character || 0 },
                            end: { line: attribute.range?.end.line || rule.range.start.line, character: attribute.range?.end.character || 100 }
                        },
                        message: 'Salience value must be a number',
                        source: 'drools-semantic'
                    });
                }
                break;
            case 'no-loop':
            case 'auto-focus':
            case 'lock-on-active':
            case 'enabled':
                if (attribute.value !== undefined && typeof attribute.value !== 'boolean') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: attribute.range?.start.line || rule.range.start.line, character: attribute.range?.start.character || 0 },
                            end: { line: attribute.range?.end.line || rule.range.start.line, character: attribute.range?.end.character || 100 }
                        },
                        message: `${attribute.name} value must be true or false`,
                        source: 'drools-semantic'
                    });
                }
                break;
            case 'dialect':
                if (attribute.value && !['java', 'mvel'].includes(attribute.value.toLowerCase())) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: attribute.range?.start.line || rule.range.start.line, character: attribute.range?.start.character || 0 },
                            end: { line: attribute.range?.end.line || rule.range.start.line, character: attribute.range?.end.character || 100 }
                        },
                        message: 'Dialect should be "java" or "mvel"',
                        source: 'drools-semantic'
                    });
                }
                break;
        }
    }

    /**
     * Check for potential performance issues
     */
    private validatePerformanceIssues(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            // Check for overly complex conditions
            if (rule.when && rule.when.conditions.length > 10) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Information,
                    range: {
                        start: { line: rule.when.range.start.line, character: rule.when.range.start.character },
                        end: { line: rule.when.range.end.line, character: rule.when.range.end.character }
                    },
                    message: `Rule has many conditions (${rule.when.conditions.length}). Consider breaking into multiple rules for better performance`,
                    source: 'drools-performance'
                });
            }

            // Check for potentially expensive operations in conditions
            if (rule.when) {
                for (const condition of rule.when.conditions) {
                    if (condition.content.includes('matches') || condition.content.includes('contains')) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Information,
                            range: {
                                start: { line: condition.range.start.line, character: condition.range.start.character },
                                end: { line: condition.range.end.line, character: condition.range.end.character }
                            },
                            message: 'String operations like "matches" and "contains" can be expensive. Consider using more specific constraints',
                            source: 'drools-performance'
                        });
                    }
                }
            }

            // Check for eval usage (generally discouraged for performance)
            if (rule.when) {
                for (const condition of rule.when.conditions) {
                    if (condition.conditionType === 'eval') {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Information,
                            range: {
                                start: { line: condition.range.start.line, character: condition.range.start.character },
                                end: { line: condition.range.end.line, character: condition.range.end.character }
                            },
                            message: 'eval() can impact performance. Consider using pattern constraints instead',
                            source: 'drools-performance'
                        });
                    }
                }
            }
        }
    }

    /**
     * Validate Drools syntax patterns and constructs according to official LSP specification
     */
    private validateDroolsSyntaxPatterns(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Validate syntax patterns based on official Drools LSP implementation
        
        for (const rule of ast.rules) {
            if (rule.when) {
                this.validateWhenClausePatternSyntax(rule.when, diagnostics);
            }
            
            if (rule.then) {
                this.validateActionSyntax(rule.then, diagnostics);
            }
        }
        
        // Validate query syntax patterns
        for (const query of ast.queries) {
            this.validateQuerySyntax(query, diagnostics);
        }
        
        // Validate declare syntax patterns
        for (const declare of ast.declares) {
            this.validateDeclareSyntax(declare, diagnostics);
        }
    }

    /**
     * Validate pattern syntax in when clauses
     */
    private validateWhenClausePatternSyntax(whenClause: WhenNode, diagnostics: Diagnostic[]): void {
        for (const condition of whenClause.conditions) {
            // Validate multi-line pattern syntax
            if (condition.isMultiLine) {
                this.validateMultiLinePatternSyntax(condition, diagnostics);
            }
            
            // Validate constraint syntax
            if (condition.constraints) {
                for (const constraint of condition.constraints) {
                    this.validateConstraintSyntax(constraint, diagnostics);
                }
            }
        }
    }

    /**
     * Validate multi-line pattern syntax
     */
    private validateMultiLinePatternSyntax(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const validPatternTypes = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        
        if (condition.conditionType && !validPatternTypes.includes(condition.conditionType)) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: condition.range.start.line, character: condition.range.start.character },
                    end: { line: condition.range.end.line, character: condition.range.end.character }
                },
                message: `Invalid pattern type: "${condition.conditionType}". Valid types are: ${validPatternTypes.join(', ')}`,
                source: 'drools-syntax'
            });
        }
    }

    /**
     * Validate constraint syntax
     */
    private validateConstraintSyntax(constraint: any, diagnostics: Diagnostic[]): void {
        // Validate operator syntax
        const validOperators = ['==', '!=', '<', '>', '<=', '>=', 'matches', 'contains', 'memberOf', 'soundslike', 'in'];
        
        if (constraint.operator && !validOperators.includes(constraint.operator)) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: constraint.range?.start.line || 0, character: constraint.range?.start.character || 0 },
                    end: { line: constraint.range?.end.line || 0, character: constraint.range?.end.character || 0 }
                },
                message: `Unknown operator: "${constraint.operator}". Consider using standard Drools operators.`,
                source: 'drools-syntax'
            });
        }
    }

    /**
     * Validate action syntax in then clauses
     */
    private validateActionSyntax(thenClause: ThenNode, diagnostics: Diagnostic[]): void {
        const actions = thenClause.actions;
        
        // Check for common action patterns
        const actionPatterns = [
            { pattern: /insert\s*\(/g, name: 'insert' },
            { pattern: /update\s*\(/g, name: 'update' },
            { pattern: /modify\s*\(/g, name: 'modify' },
            { pattern: /retract\s*\(/g, name: 'retract' },
            { pattern: /delete\s*\(/g, name: 'delete' }
        ];
        
        for (const actionPattern of actionPatterns) {
            const matches = actions.match(actionPattern.pattern);
            if (matches) {
                // Validate that actions have proper syntax (basic check)
                const actionRegex = new RegExp(`${actionPattern.name}\\s*\\([^)]*\\)`, 'g');
                const properMatches = actions.match(actionRegex);
                
                if (!properMatches || properMatches.length !== matches.length) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: thenClause.range.start.line, character: thenClause.range.start.character },
                            end: { line: thenClause.range.end.line, character: thenClause.range.end.character }
                        },
                        message: `Potentially malformed ${actionPattern.name} action. Check syntax.`,
                        source: 'drools-syntax'
                    });
                }
            }
        }
    }

    /**
     * Validate query syntax
     */
    private validateQuerySyntax(query: any, diagnostics: Diagnostic[]): void {
        // Query must have a name
        if (!query.name || query.name.trim() === '') {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: query.range?.start.line || 0, character: query.range?.start.character || 0 },
                    end: { line: query.range?.end.line || 0, character: query.range?.end.character || 0 }
                },
                message: 'Query must have a name',
                source: 'drools-syntax'
            });
        }
    }

    /**
     * Validate declare syntax
     */
    private validateDeclareSyntax(declare: any, diagnostics: Diagnostic[]): void {
        // Declare must have a name
        if (!declare.name || declare.name.trim() === '') {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: declare.range?.start.line || 0, character: declare.range?.start.character || 0 },
                    end: { line: declare.range?.end.line || 0, character: declare.range?.end.character || 0 }
                },
                message: 'Declare statement must have a name',
                source: 'drools-syntax'
            });
        }
        
        // Validate field syntax
        if (declare.fields) {
            for (const field of declare.fields) {
                if (!field.name || field.name.trim() === '') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: field.range?.start.line || 0, character: field.range?.start.character || 0 },
                            end: { line: field.range?.end.line || 0, character: field.range?.end.character || 0 }
                        },
                        message: 'Field must have a name',
                        source: 'drools-syntax'
                    });
                }
                
                if (!field.dataType || field.dataType.trim() === '') {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: field.range?.start.line || 0, character: field.range?.start.character || 0 },
                            end: { line: field.range?.end.line || 0, character: field.range?.end.character || 0 }
                        },
                        message: 'Field must have a type',
                        source: 'drools-syntax'
                    });
                }
            }
        }
    }

    /**
     * Validate Drools keywords and language constructs
     */
    private validateDroolsKeywords(diagnostics: Diagnostic[]): void {
        const validDroolsKeywords = new Set([
            // Core language keywords
            'rule', 'when', 'then', 'end', 'function', 'import', 'package', 'global',
            'query', 'declare', 'extends', 'template', 'unit',
            
            // Rule attributes
            'salience', 'no-loop', 'agenda-group', 'auto-focus', 'activation-group',
            'ruleflow-group', 'lock-on-active', 'dialect', 'date-effective', 'date-expires',
            'duration', 'timer', 'calendars', 'enabled',
            
            // Pattern matching keywords
            'exists', 'not', 'and', 'or', 'eval', 'forall', 'collect', 'accumulate',
            'from', 'entry-point', 'over', 'window', 'length', 'time',
            
            // Operators and functions
            'matches', 'contains', 'memberOf', 'soundslike', 'str', 'in',
            'init', 'action', 'reverse', 'result',
            
            // Actions
            'insert', 'update', 'modify', 'delete', 'retract',
            
            // Types and modifiers
            'static', 'final', 'abstract', 'public', 'private', 'protected',
            
            // Common Java keywords that are valid in Drools
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
            'try', 'catch', 'finally', 'throw', 'throws', 'return', 'break', 'continue',
            'new', 'this', 'super', 'null', 'true', 'false',
            'class', 'interface', 'enum', 'instanceof', 'synchronized', 'volatile', 'transient',
            
            // Primitive types
            'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double', 'void'
        ]);

        const documentText = this.document.getText();
        const lines = documentText.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // Skip comments and strings
            const cleanLine = this.removeCommentsAndStrings(line);
            
            // Find potential keywords (word boundaries)
            const wordRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
            let match;
            
            while ((match = wordRegex.exec(cleanLine)) !== null) {
                const word = match[0];
                const startChar = match.index;
                
                // Skip if it's a valid Drools keyword
                if (validDroolsKeywords.has(word)) {
                    continue;
                }
                
                // Skip if it's likely a variable, fact type, or method name
                if (this.isLikelyValidIdentifier(word, cleanLine, startChar)) {
                    continue;
                }
                
                // Skip if it's in a context where custom identifiers are expected
                if (this.isInValidContext(cleanLine, startChar)) {
                    continue;
                }
                
                // If we reach here, it might be an invalid keyword
                // But we need to be careful not to flag valid Java identifiers
                if (this.looksLikeInvalidKeyword(word, cleanLine, startChar)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: startChar },
                            end: { line: lineIndex, character: startChar + word.length }
                        },
                        message: `Unknown keyword or identifier: "${word}". Check if this is a valid Drools keyword or Java identifier.`,
                        source: 'drools-keywords'
                    });
                }
            }
        }
    }

    /**
     * Remove comments and string literals from a line for keyword analysis
     */
    private removeCommentsAndStrings(line: string): string {
        let result = '';
        let inString = false;
        let inChar = false;
        let inLineComment = false;
        let inBlockComment = false;
        let escapeNext = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = i < line.length - 1 ? line[i + 1] : '';
            
            if (escapeNext) {
                escapeNext = false;
                if (inString || inChar) {
                    result += ' '; // Replace with space to maintain positions
                }
                continue;
            }
            
            if (char === '\\' && (inString || inChar)) {
                escapeNext = true;
                result += ' ';
                continue;
            }
            
            if (!inString && !inChar && !inLineComment && !inBlockComment) {
                if (char === '/' && nextChar === '/') {
                    inLineComment = true;
                    result += '  ';
                    i++; // Skip next character
                    continue;
                } else if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    result += '  ';
                    i++; // Skip next character
                    continue;
                } else if (char === '"') {
                    inString = true;
                    result += ' ';
                    continue;
                } else if (char === "'") {
                    inChar = true;
                    result += ' ';
                    continue;
                }
            }
            
            if (inString && char === '"') {
                inString = false;
                result += ' ';
                continue;
            }
            
            if (inChar && char === "'") {
                inChar = false;
                result += ' ';
                continue;
            }
            
            if (inBlockComment && char === '*' && nextChar === '/') {
                inBlockComment = false;
                result += '  ';
                i++; // Skip next character
                continue;
            }
            
            if (inString || inChar || inLineComment || inBlockComment) {
                result += ' '; // Replace with space to maintain positions
            } else {
                result += char;
            }
        }
        
        return result;
    }

    /**
     * Check if a word is likely a valid identifier (variable, class name, method name, etc.)
     */
    private isLikelyValidIdentifier(word: string, line: string, startChar: number): boolean {
        // Check if it's preceded by $ (variable)
        if (startChar > 0 && line[startChar - 1] === '$') {
            return true;
        }
        
        // Check if it's followed by ( (method call)
        const afterWord = line.substring(startChar + word.length).trim();
        if (afterWord.startsWith('(')) {
            return true;
        }
        
        // Check if it's preceded by . (method or field access)
        const beforeWord = line.substring(0, startChar).trim();
        if (beforeWord.endsWith('.')) {
            return true;
        }
        
        // Check if it's in a type declaration context
        if (beforeWord.match(/:\s*$/) || beforeWord.match(/\(\s*$/) || beforeWord.match(/,\s*$/)) {
            return true;
        }
        
        // Check if it starts with uppercase (likely a class name)
        if (word[0] === word[0].toUpperCase()) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if the word is in a context where custom identifiers are expected
     */
    private isInValidContext(line: string, startChar: number): boolean {
        const beforeWord = line.substring(0, startChar).trim();
        
        // In import statements
        if (beforeWord.includes('import')) {
            return true;
        }
        
        // In package declarations
        if (beforeWord.includes('package')) {
            return true;
        }
        
        // After 'new' keyword
        if (beforeWord.endsWith('new')) {
            return true;
        }
        
        // In rule names (quoted strings are handled separately)
        if (beforeWord.includes('rule') && !beforeWord.includes('"')) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if a word looks like it might be an invalid keyword
     */
    private looksLikeInvalidKeyword(word: string, line: string, startChar: number): boolean {
        // Don't flag if it's clearly a Java identifier in a valid context
        if (this.isLikelyValidIdentifier(word, line, startChar)) {
            return false;
        }
        
        // Don't flag common Java class names (start with uppercase)
        if (/^[A-Z][a-zA-Z0-9]*$/.test(word)) {
            return false;
        }
        
        // Don't flag constants (all uppercase with underscores)
        if (/^[A-Z_][A-Z0-9_]*$/.test(word)) {
            return false;
        }
        
        // Flag words that look like they might be intended as Drools keywords
        // This includes lowercase words that aren't obviously variable names
        if (word.length > 3 && /^[a-z]+$/.test(word)) {
            return true; // Pure lowercase words like "invalidkeyword"
        }
        
        // Flag camelCase words that contain "keyword" or other suspicious patterns
        if (/keyword|rule|when|then|exists|not|eval/i.test(word) && word.length > 5) {
            return true;
        }
        
        return false;
    }
}