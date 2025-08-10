/**
 * Diagnostic provider for Drools language error detection and validation
 * Based on official Drools LSP implementation: https://github.com/kiegroup/drools-lsp
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST, AnyASTNode, RuleNode, FunctionNode, ConditionNode, WhenNode, ThenNode, MultiLinePatternNode, MultiLinePatternMetadata, ParenthesesTracker, Position, Range } from '../parser/ast';
import { ParseError } from '../parser/droolsParser';
import { ValidationMetricsCollector, ValidationType, ValidationMetrics, ValidationPhaseMetrics, PerformanceBenchmark } from '../performance/validationMetrics';
import { PrecisePositionCalculator, IPositionCalculator } from './positionCalculator';



/**
 * Manages validation state to prevent duplicate validation runs
 */
class ValidationState {
    private completedValidations: Set<ValidationType> = new Set();

    reset(): void {
        this.completedValidations.clear();
    }

    isComplete(type: ValidationType): boolean {
        return this.completedValidations.has(type);
    }

    markComplete(type: ValidationType): void {
        this.completedValidations.add(type);
    }
}

/**
 * Coordinates validation execution to prevent duplication
 */
interface ValidationCoordinator {
    coordinateValidation(ast: DroolsAST, diagnostics: Diagnostic[]): void;
    isValidationAlreadyRun(validationType: ValidationType): boolean;
    markValidationComplete(validationType: ValidationType): void;
}

/**
 * Context passed between validation methods
 */
interface ValidationContext {
    document: TextDocument;
    ast: DroolsAST;
    parseErrors: ParseError[];
    settings: DiagnosticSettings;
    validationState: ValidationState;
}

/**
 * Result of rule name validation
 */
interface RuleNameValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    isQuoted: boolean;
    unquotedName: string;
}

/**
 * Individual validation issue
 */
interface ValidationIssue {
    severity: DiagnosticSeverity;
    message: string;
    suggestion?: string;
}

/**
 * Enhanced rule name validator interface
 */
interface RuleNameValidator {
    validateRuleName(rule: RuleNode): RuleNameValidationResult;
    isQuotedRuleName(ruleName: string): boolean;
    extractUnquotedRuleName(ruleName: string): string;
    validateUnquotedRuleName(ruleName: string): ValidationIssue[];
    validateQuotedRuleName(ruleName: string): ValidationIssue[];
}

/**
 * Enhanced rule name validator implementation
 */
class EnhancedRuleNameValidator implements RuleNameValidator {
    validateRuleName(rule: RuleNode): RuleNameValidationResult {
        if (!rule.name || rule.name.trim() === '') {
            return {
                isValid: false,
                issues: [{
                    severity: DiagnosticSeverity.Error,
                    message: 'Rule must have a name'
                }],
                isQuoted: false,
                unquotedName: ''
            };
        }

        // The parser typically extracts rule names without quotes
        // So we need to check the original source to see if it was quoted
        const isQuoted = this.isQuotedRuleName(rule.name);
        const unquotedName = this.extractUnquotedRuleName(rule.name);

        // For rule names that contain spaces, they MUST be quoted in the source
        // But the parser extracts them without quotes, so we should be more lenient
        const issues: ValidationIssue[] = [];

        // Only validate for truly problematic rule names
        if (unquotedName.trim() === '') {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: 'Rule name cannot be empty'
            });
        }

        // Check for rule names starting with numbers (invalid in Drools)
        if (unquotedName && /^[0-9]/.test(unquotedName)) {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: 'Rule must have a name (cannot start with a number)'
            });
        }

        // Don't flag rule names with spaces as invalid - they're valid if quoted in source
        // The parser should handle the syntax validation

        return {
            isValid: issues.length === 0,
            issues,
            isQuoted,
            unquotedName
        };
    }

    isQuotedRuleName(ruleName: string): boolean {
        return ruleName.startsWith('"') && ruleName.endsWith('"') && ruleName.length >= 2;
    }

    extractUnquotedRuleName(ruleName: string): string {
        if (this.isQuotedRuleName(ruleName)) {
            return ruleName.slice(1, -1); // Remove surrounding quotes
        }
        return ruleName;
    }

    validateUnquotedRuleName(ruleName: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        // Check for spaces or special characters that require quoting
        if (/[\s\-\.]/.test(ruleName)) {
            issues.push({
                severity: DiagnosticSeverity.Warning,
                message: 'Rule names with spaces or special characters should be quoted',
                suggestion: `"${ruleName}"`
            });
        }

        // Check for invalid characters
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(ruleName)) {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: `Rule name "${ruleName}" contains invalid characters`
            });
        }

        return issues;
    }

    validateQuotedRuleName(ruleName: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const unquoted = this.extractUnquotedRuleName(ruleName);

        // Check for empty quoted name
        if (unquoted.trim() === '') {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: 'Quoted rule name cannot be empty'
            });
        }

        // Check for unescaped quotes inside
        if (unquoted.includes('"') && !unquoted.includes('\\"')) {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: 'Quotes inside rule names must be escaped with backslash'
            });
        }

        // Check for very long names
        if (unquoted.length > 100) {
            issues.push({
                severity: DiagnosticSeverity.Information,
                message: `Rule name is very long (${unquoted.length} characters)`,
                suggestion: 'Consider using a shorter, more concise name'
            });
        }

        return issues;
    }
}

export interface DiagnosticSettings {
    maxNumberOfProblems: number;
    enableSyntaxValidation: boolean;
    enableSemanticValidation: boolean;
    enableBestPracticeWarnings: boolean;
}

export class DroolsDiagnosticProvider implements ValidationCoordinator {
    private settings: DiagnosticSettings;
    private document!: TextDocument;
    private documentLines!: string[];
    private validationState: ValidationState = new ValidationState();
    private ruleNameValidator: RuleNameValidator = new EnhancedRuleNameValidator();
    private metricsCollector: ValidationMetricsCollector = new ValidationMetricsCollector();
    private positionCalculator!: IPositionCalculator;

    constructor(settings: DiagnosticSettings) {
        this.settings = settings;
    }

    /**
     * Check if a validation type has already been run
     */
    public isValidationAlreadyRun(validationType: ValidationType): boolean {
        return this.validationState.isComplete(validationType);
    }

    /**
     * Mark a validation type as complete
     */
    public markValidationComplete(validationType: ValidationType): void {
        this.validationState.markComplete(validationType);
    }

    /**
     * Analyze the document and AST to generate diagnostics
     */
    public provideDiagnostics(document: TextDocument, ast: DroolsAST, parseErrors: ParseError[]): Diagnostic[] {
        this.document = document;
        this.documentLines = document.getText().split('\n');

        // Initialize position calculator with document lines
        this.positionCalculator = new PrecisePositionCalculator(this.documentLines);

        const diagnostics: Diagnostic[] = [];

        // Reset validation state for new validation cycle
        this.validationState.reset();

        // Convert parser errors to diagnostics
        if (this.settings.enableSyntaxValidation) {
            this.addParseErrorDiagnostics(parseErrors, diagnostics);
        }

        // Coordinate all validation types to prevent duplication
        this.coordinateValidation(ast, diagnostics);

        // Finalize performance metrics
        const finalMetrics = this.metricsCollector.finalizeMetrics();

        // Add performance benchmark for this validation
        const fileSize = document.getText().length;
        const ruleCount = ast.rules.length;
        this.metricsCollector.addBenchmark(fileSize, ruleCount);

        // Check for performance issues (optional logging)
        if (this.metricsCollector.isPerformanceDegraded(fileSize, ruleCount)) {
            console.warn('Validation performance degraded:', this.metricsCollector.generatePerformanceReport());
        }

        // Remove duplicate diagnostics before returning
        const deduplicatedDiagnostics = this.deduplicateDiagnostics(diagnostics);

        // Limit the number of diagnostics
        return deduplicatedDiagnostics.slice(0, this.settings.maxNumberOfProblems);
    }

    /**
     * Coordinate validation execution to prevent duplication
     */
    public coordinateValidation(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Reset metrics for new validation cycle
        this.metricsCollector.resetMetrics();

        // Syntax validation (includes keywords and syntax details)
        if (this.settings.enableSyntaxValidation && !this.validationState.isComplete(ValidationType.SYNTAX)) {
            this.metricsCollector.startPhase(ValidationType.SYNTAX);
            const initialDiagnosticCount = diagnostics.length;

            this.validateDroolsKeywords(diagnostics);
            this.validateSyntaxDetails(ast, diagnostics);

            const errorsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 1).length;
            const warningsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 2).length;
            this.metricsCollector.endPhase(ValidationType.SYNTAX, errorsFound, warningsFound);
            this.validationState.markComplete(ValidationType.SYNTAX);
        }

        // Semantic validation - ONLY ONCE
        if (this.settings.enableSemanticValidation && !this.validationState.isComplete(ValidationType.SEMANTIC)) {
            this.metricsCollector.startPhase(ValidationType.SEMANTIC);
            const initialDiagnosticCount = diagnostics.length;

            this.validateSemantics(ast, diagnostics);

            const errorsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 1).length;
            const warningsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 2).length;
            this.metricsCollector.endPhase(ValidationType.SEMANTIC, errorsFound, warningsFound);
            this.validationState.markComplete(ValidationType.SEMANTIC);
        }

        // Best practice validation
        if (this.settings.enableBestPracticeWarnings && !this.validationState.isComplete(ValidationType.BEST_PRACTICE)) {
            this.metricsCollector.startPhase(ValidationType.BEST_PRACTICE);
            const initialDiagnosticCount = diagnostics.length;

            this.validateBestPractices(ast, diagnostics);

            const errorsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 1).length;
            const warningsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 2).length;
            this.metricsCollector.endPhase(ValidationType.BEST_PRACTICE, errorsFound, warningsFound);
            this.validationState.markComplete(ValidationType.BEST_PRACTICE);
        }

        // Multi-line pattern validation
        if (this.settings.enableSyntaxValidation && !this.validationState.isComplete(ValidationType.MULTILINE_PATTERNS)) {
            this.metricsCollector.startPhase(ValidationType.MULTILINE_PATTERNS);
            const initialDiagnosticCount = diagnostics.length;

            this.validateMultiLinePatterns(ast, diagnostics);

            const errorsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 1).length;
            const warningsFound = diagnostics.slice(initialDiagnosticCount).filter(d => d.severity === 2).length;
            this.metricsCollector.endPhase(ValidationType.MULTILINE_PATTERNS, errorsFound, warningsFound);
            this.validationState.markComplete(ValidationType.MULTILINE_PATTERNS);
        }
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

            // Allow both regular imports and static imports - be more lenient with validation
            // Modern Java allows more flexible package naming
            const validImportPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*(\.\*|(\.[a-zA-Z_][a-zA-Z0-9_]*))?$/;

            // Only flag obviously invalid imports, not just strict naming convention violations
            if (importNode.path && !/^[a-zA-Z_][a-zA-Z0-9_\.]*(\*)?$/.test(pathToValidate)) {
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
            // Use enhanced rule name validator
            const nameValidation = this.ruleNameValidator.validateRuleName(rule);

            for (const issue of nameValidation.issues) {
                diagnostics.push({
                    range: {
                        start: { line: rule.range.start.line, character: rule.range.start.character },
                        end: { line: rule.range.end.line, character: rule.range.end.character }
                    },
                    message: issue.message,
                    severity: issue.severity,
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

            // Validate conditions in when clause for syntax errors
            if (rule.when) {
                this.validateConditions(rule.when, diagnostics);
            }

            // Validate then clause for Java syntax errors
            if (rule.then) {
                this.validateThenClause(rule.then, diagnostics);
            }

            // Validate variable usage between LHS and RHS (includes duplicate detection)
            this.validateVariableUsageBetweenClauses(rule, diagnostics);
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
     * Made more conservative to avoid false positives
     */
    private validateRuleAttributesFromText(rule: RuleNode, validAttributes: string[], diagnostics: Diagnostic[]): void {
        const ruleStartLine = rule.range.start.line;
        const ruleEndLine = rule.range.end.line;

        // Get only the rule header (before 'when' clause) to avoid false positives
        let ruleHeaderText = '';
        for (let i = ruleStartLine; i <= ruleEndLine && i < this.documentLines.length; i++) {
            const line = this.documentLines[i];
            ruleHeaderText += line + '\n';

            // Stop at 'when' clause to avoid checking rule body content
            if (line.trim().startsWith('when')) {
                break;
            }
        }

        // Only look for attributes that are clearly in the rule header area
        // and match the exact Drools attribute syntax patterns

        // Pattern for known Drools attributes only - be very specific
        const knownAttributePatterns = [
            /\bsalience\s+(-?\d+)/g,
            /\bdialect\s+"[^"]*"/g,
            /\bno-loop\b/g,
            /\block-on-active\b/g,
            /\bauto-focus\s+(true|false)/g,
            /\bagenda-group\s+"[^"]*"/g,
            /\bactivation-group\s+"[^"]*"/g,
            /\bruleflow-group\s+"[^"]*"/g,
            /\bdate-effective\s+"[^"]*"/g,
            /\bdate-expires\s+"[^"]*"/g,
            /\bduration\s+\d+/g,
            /\btimer\s*\([^)]*\)/g,
            /\bcalendars\s+"[^"]*"/g,
            /\benabled\s+(true|false)/g
        ];

        // Only validate against these specific patterns to avoid false positives
        // The previous approach was too broad and caught normal rule content

        // For now, disable this validation entirely as it's causing too many false positives
        // The parser should handle attribute validation, and if it doesn't, it's better
        // to miss some invalid attributes than to flag valid rule content as invalid
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
     * Validate for duplicate variable declarations within the same rule scope
     * This addresses the specific issue mentioned where duplicate variables like:
     * $condition : Condition( true || false )
     * $condition : Condition()
     * $condition : Condition()
     * should be detected as errors
     */
    private validateDuplicateVariableDeclarations(rule: RuleNode, diagnostics: Diagnostic[]): void {
        if (!rule.when || !rule.when.conditions) {
            return;
        }

        // Track variable declarations with their positions
        const variableDeclarations = new Map<string, Array<{ condition: ConditionNode, position: Range }>>();

        // Collect all variable declarations from the when clause
        this.collectVariableDeclarations(rule.when.conditions, variableDeclarations);

        // Check for duplicates
        for (const [variableName, declarations] of variableDeclarations) {
            if (declarations.length > 1) {
                // Report error for each duplicate declaration (except the first one)
                for (let i = 1; i < declarations.length; i++) {
                    const duplicate = declarations[i];
                    const firstDeclaration = declarations[0];

                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: duplicate.position,
                        message: `Duplicate variable declaration: "${variableName}". First declared at line ${firstDeclaration.position.start.line + 1}`,
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Recursively collect variable declarations from conditions
     */
    private collectVariableDeclarations(
        conditions: ConditionNode[],
        variableDeclarations: Map<string, Array<{ condition: ConditionNode, position: Range }>>
    ): void {
        for (const condition of conditions) {
            // Check if this condition declares a variable
            if (condition.variable) {
                const variableName = condition.variable;
                if (!variableDeclarations.has(variableName)) {
                    variableDeclarations.set(variableName, []);
                }
                variableDeclarations.get(variableName)!.push({
                    condition: condition,
                    position: condition.range
                });
            }

            // Also extract variables from condition content using regex
            if (condition.content) {
                const variableMatches = condition.content.match(/(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:/g);
                if (variableMatches) {
                    for (const match of variableMatches) {
                        const variableName = match.replace(':', '').trim();
                        if (!variableDeclarations.has(variableName)) {
                            variableDeclarations.set(variableName, []);
                        }

                        // Use precise position calculator for accurate positioning
                        const precisePosition = this.positionCalculator.findVariableDeclarationPosition(
                            { conditions: [condition], range: condition.range } as WhenNode,
                            variableName
                        );

                        variableDeclarations.get(variableName)!.push({
                            condition: condition,
                            position: precisePosition || condition.range
                        });
                    }
                }
            }

            // Recursively check nested conditions (for complex patterns like exists, forall, etc.)
            if (condition.nestedConditions && condition.nestedConditions.length > 0) {
                this.collectVariableDeclarations(condition.nestedConditions, variableDeclarations);
            }

            // Check multi-line pattern inner conditions
            if (condition.multiLinePattern && condition.multiLinePattern.innerConditions) {
                this.collectVariableDeclarations(condition.multiLinePattern.innerConditions, variableDeclarations);
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
     * Validate conditions within when clauses - enhanced to catch syntax errors
     */
    private validateConditions(whenClause: WhenNode, diagnostics: Diagnostic[]): void {
        for (const condition of whenClause.conditions) {
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

            // Validate condition content for syntax errors
            if (condition.content) {
                this.validateConditionSyntax(condition, diagnostics);
            }
        }
    }

    /**
     * Validate then clause for Java syntax errors
     */
    private validateThenClause(thenClause: ThenNode, diagnostics: Diagnostic[]): void {
        if (!thenClause.actions || thenClause.actions.trim() === '') {
            return; // Empty then clause is already handled elsewhere
        }

        const actions = thenClause.actions.trim();

        // Validate Java syntax in RHS
        this.validateJavaSyntaxInRHS(actions, thenClause, diagnostics);

        // Check for missing semicolons in Java statements
        this.validateSemicolonsInRHS(actions, thenClause, diagnostics);

        // Check for invalid Drools syntax in RHS (should be Java)
        this.validateNoInvalidDroolsSyntaxInRHS(actions, thenClause, diagnostics);
    }

    /**
     * Validate Java syntax in RHS (then clause)
     * RHS is pure Java code where $variables from when clause are valid
     */
    private validateJavaSyntaxInRHS(actions: string, thenClause: ThenNode, diagnostics: Diagnostic[]): void {
        const lines = actions.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.startsWith('//') || line.startsWith('/*')) continue;

            const lineNumber = thenClause.range.start.line + i + 1;

            // 1. Java capitalization errors
            this.validateJavaCapitalization(line, lineNumber, diagnostics);

            // 2. Java syntax structure validation
            this.validateJavaStatementStructure(line, lineNumber, diagnostics);

            // 3. Java method call validation
            this.validateJavaMethodCalls(line, lineNumber, diagnostics);

            // 4. Java variable usage validation (allowing $variables from when clause)
            this.validateJavaVariableUsage(line, lineNumber, diagnostics);

            // 5. Java string and literal validation
            this.validateJavaLiterals(line, lineNumber, diagnostics);
        }
    }

    /**
     * Validate Java capitalization in RHS (then clause only)
     */
    private validateJavaCapitalization(line: string, lineNumber: number, diagnostics: Diagnostic[]): void {
        // System.out.println capitalization (common typo)
        if (line.includes('system.out.println')) {
            const position = this.positionCalculator.findJavaErrorPosition(line, 'system', lineNumber);
            if (position) {
                const positionInfo = `[Line ${position.start.line + 1}, Col ${position.start.character + 1}-${position.end.character}]`;
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: position,
                    message: `Incorrect capitalization: "system" should be "System" (capital S) ${positionInfo}`,
                    source: 'drools-syntax',
                    code: 'java-capitalization'
                });
            }
        }

        // Check for Sytem typo (missing 's')
        if (line.includes('Sytem.out.println')) {
            const position = this.positionCalculator.findJavaErrorPosition(line, 'Sytem', lineNumber);
            if (position) {
                const positionInfo = `[Line ${position.start.line + 1}, Col ${position.start.character + 1}-${position.end.character}]`;
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: position,
                    message: `Typo in class name: "Sytem" should be "System" ${positionInfo}`,
                    source: 'drools-syntax',
                    code: 'java-typo'
                });
            }
        }

        // Java type capitalization errors - ONLY in variable declarations, NOT in variable names
        // Pattern: looks for "type variableName" but excludes "$variableName" usage
        const javaTypeDeclarationErrors = [
            { pattern: /\bstring\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/gi, correct: 'String' },
            { pattern: /\bobject\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/gi, correct: 'Object' },
            { pattern: /\binteger\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/gi, correct: 'Integer' },
            { pattern: /\bdouble\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/gi, correct: 'Double' },
            { pattern: /\bboolean\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/gi, correct: 'Boolean' }
        ];

        for (const error of javaTypeDeclarationErrors) {
            let match;
            error.pattern.lastIndex = 0; // Reset regex state
            while ((match = error.pattern.exec(line)) !== null) {
                const typeWord = match[0].split(/\s+/)[0]; // Get just the type word
                const typeIndex = match.index;

                const positionInfo = `[Line ${lineNumber + 1}, Col ${typeIndex + 1}-${typeIndex + typeWord.length}]`;
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: lineNumber, character: typeIndex },
                        end: { line: lineNumber, character: typeIndex + typeWord.length }
                    },
                    message: `Java type should be capitalized: "${typeWord}" should be "${error.correct}" ${positionInfo}`,
                    source: 'drools-syntax',
                    code: 'java-capitalization'
                });
            }
        }
    }

    /**
     * Validate Java statement structure
     */
    private validateJavaStatementStructure(line: string, lineNumber: number, diagnostics: Diagnostic[]): void {
        // Check for statements that should end with semicolon
        const needsSemicolon = /^[^\/\*].*[^;}\s]$/.test(line) &&
            !line.includes('{') &&
            !line.includes('}') &&
            !line.startsWith('if') &&
            !line.startsWith('for') &&
            !line.startsWith('while') &&
            !line.startsWith('try') &&
            !line.startsWith('catch') &&
            !line.startsWith('finally');

        if (needsSemicolon && (line.includes('=') || line.includes('(') || line.includes('.'))) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineNumber, character: line.length - 1 },
                    end: { line: lineNumber, character: line.length }
                },
                message: 'Java statement must end with semicolon (;)',
                source: 'drools-syntax',
                code: 'missing-semicolon'
            });
        }

        // Check for unbalanced parentheses
        const openParens = (line.match(/\(/g) || []).length;
        const closeParens = (line.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineNumber, character: 0 },
                    end: { line: lineNumber, character: line.length }
                },
                message: `Unbalanced parentheses in Java statement: ${openParens} opening, ${closeParens} closing`,
                source: 'drools-syntax',
                code: 'unbalanced-parentheses'
            });
        }
    }

    /**
     * Validate Java method calls
     */
    private validateJavaMethodCalls(line: string, lineNumber: number, diagnostics: Diagnostic[]): void {
        // Check for malformed method calls
        const malformedMethodPattern = /\w+\s*\.\s*\(\s*\)/g; // obj.() instead of obj.method()
        let match;
        while ((match = malformedMethodPattern.exec(line)) !== null) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineNumber, character: match.index },
                    end: { line: lineNumber, character: match.index + match[0].length }
                },
                message: `Malformed method call: "${match[0]}". Missing method name before parentheses.`,
                source: 'drools-syntax',
                code: 'malformed-method-call'
            });
        }

        // Check for common method name typos
        const methodTypos = [
            { pattern: /\.printLn\(/g, correct: '.println(' },
            { pattern: /\.lenght\(/g, correct: '.length(' },
            { pattern: /\.toStirng\(/g, correct: '.toString(' },
            { pattern: /\.equlas\(/g, correct: '.equals(' }
        ];

        for (const typo of methodTypos) {
            typo.pattern.lastIndex = 0;
            while ((match = typo.pattern.exec(line)) !== null) {
                const positionInfo = `[Line ${lineNumber + 1}, Col ${match.index + 1}-${match.index + match[0].length}]`;
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: {
                        start: { line: lineNumber, character: match.index },
                        end: { line: lineNumber, character: match.index + match[0].length }
                    },
                    message: `Possible typo in method name: "${match[0]}" should be "${typo.correct}" ${positionInfo}`,
                    source: 'drools-syntax',
                    code: 'method-typo'
                });
            }
        }
    }

    /**
     * Validate Java variable usage (allowing $variables from when clause)
     */
    private validateJavaVariableUsage(line: string, lineNumber: number, diagnostics: Diagnostic[]): void {
        // Check for invalid variable names (but allow $variables from Drools when clause)
        const invalidVarPattern = /\b([0-9][a-zA-Z_][a-zA-Z0-9_]*)\b/g; // Variables starting with numbers
        let match;
        while ((match = invalidVarPattern.exec(line)) !== null) {
            const varName = match[1];
            if (!varName.startsWith('$')) { // $variables are valid in RHS
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: lineNumber, character: match.index },
                        end: { line: lineNumber, character: match.index + varName.length }
                    },
                    message: `Invalid Java variable name: "${varName}". Variable names cannot start with numbers.`,
                    source: 'drools-syntax',
                    code: 'invalid-variable-name'
                });
            }
        }

        // Check for bare words that aren't valid Java (but allow $variables)
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(line) && !line.startsWith('$')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineNumber, character: 0 },
                    end: { line: lineNumber, character: line.length }
                },
                message: `Invalid Java statement: "${line}". RHS must contain valid Java statements.`,
                source: 'drools-syntax',
                code: 'invalid-java-statement'
            });
        }
    }

    /**
     * Validate Java string literals and other literals
     */
    private validateJavaLiterals(line: string, lineNumber: number, diagnostics: Diagnostic[]): void {
        // Check for unmatched quotes
        const singleQuotes = (line.match(/'/g) || []).length;
        const doubleQuotes = (line.match(/"/g) || []).length;

        if (singleQuotes % 2 !== 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineNumber, character: 0 },
                    end: { line: lineNumber, character: line.length }
                },
                message: 'Unmatched single quote in Java string literal',
                source: 'drools-syntax',
                code: 'unmatched-quote'
            });
        }

        if (doubleQuotes % 2 !== 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineNumber, character: 0 },
                    end: { line: lineNumber, character: line.length }
                },
                message: 'Unmatched double quote in Java string literal',
                source: 'drools-syntax',
                code: 'unmatched-quote'
            });
        }
    }

    /**
     * Validate semicolons in RHS Java statements
     */
    private validateSemicolonsInRHS(actions: string, thenClause: ThenNode, diagnostics: Diagnostic[]): void {
        const lines = actions.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            // Skip comments and control structures
            if (line.startsWith('//') || line.startsWith('/*') ||
                line.startsWith('if') || line.startsWith('for') || line.startsWith('while') ||
                line.endsWith('{') || line === '}') {
                continue;
            }

            // Check if line looks like a Java statement but missing semicolon
            // But be very lenient for Drools-specific constructs and method calls within modify blocks
            if (this.looksLikeJavaStatement(line) && !line.endsWith(';')) {
                // Don't flag Drools-specific constructs that don't need semicolons
                const isDroolsConstruct = line.includes('modify(') ||
                    line.includes('insert(') ||
                    line.includes('update(') ||
                    line.includes('retract(') ||
                    line.includes('delete(') ||
                    line.trim().endsWith('{') ||
                    line.trim().endsWith('}') ||
                    line.trim().endsWith(',');

                // Also don't flag method calls that are inside modify blocks or similar constructs
                const isMethodCallInBlock = line.trim().match(/^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/);

                // Be very conservative - only flag obvious cases where semicolon is clearly missing
                const isObviouslyMissingSemicolon = line.includes(' = ') && !line.includes('(') && !isDroolsConstruct;

                if (isObviouslyMissingSemicolon) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Information, // Changed to info
                        range: {
                            start: { line: thenClause.range.start.line + i, character: 0 },
                            end: { line: thenClause.range.start.line + i, character: line.length }
                        },
                        message: `Consider adding semicolon to Java assignment: "${line}"`,
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Check if a line looks like a Java statement that should end with semicolon
     */
    private looksLikeJavaStatement(line: string): boolean {
        // Method calls, assignments, variable declarations, etc.
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[\.\(]/.test(line) ||  // Method calls like System.out.println
            /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/.test(line) ||        // Assignments
            /^\$[a-zA-Z_][a-zA-Z0-9_]*\./.test(line) ||          // Variable method calls
            /^(int|String|boolean|double|float|long)\s+/.test(line); // Variable declarations
    }

    /**
     * Check for invalid Drools syntax in RHS
     */
    private validateNoInvalidDroolsSyntaxInRHS(actions: string, thenClause: ThenNode, diagnostics: Diagnostic[]): void {
        // Check for Drools operators that shouldn't be in RHS
        const droolsOperators = ['matches', 'contains', 'memberOf', 'soundslike'];

        for (const operator of droolsOperators) {
            if (actions.includes(operator)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: thenClause.range.start.line, character: 0 },
                        end: { line: thenClause.range.end.line, character: 0 }
                    },
                    message: `Drools operator "${operator}" is not valid in RHS. Use Java methods instead.`,
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Check if rule name contains truly invalid characters
     * For quoted rule names, Drools allows most characters except unescaped quotes
     */
    private hasInvalidRuleNameCharacters(ruleName: string): boolean {
        // Check for empty rule name
        if (!ruleName || ruleName.trim() === '') {
            return true;
        }

        // Check for unescaped quotes (which would break parsing)
        // This is the main restriction for quoted rule names
        if (ruleName.includes('"') && !ruleName.includes('\\"')) {
            return true;
        }

        // For quoted rule names, Drools is very lenient
        // Allow most characters including special symbols, Unicode, etc.
        // Only restrict truly problematic characters that would break parsing
        return false;
    }

    /**
     * Find the specific position of a variable in the then clause with precise positioning
     */
    private findVariablePositionInThenClause(thenClause: ThenNode, variableName: string): Range | null {
        if (!thenClause.actions) return null;

        // Get the actual document lines for precise positioning
        const thenStartLine = thenClause.range.start.line + 1; // +1 to skip "then" line

        // Search through document lines starting from then clause
        for (let lineIndex = thenStartLine; lineIndex < this.documentLines.length; lineIndex++) {
            const line = this.documentLines[lineIndex];

            // Stop if we've reached the end of the rule (\"end\" keyword)
            if (line.trim() === 'end' || line.trim().startsWith('end')) {
                break;
            }

            // Use regex to find the exact variable position as a complete word
            const escapedVariableName = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const variableRegex = new RegExp('\\b' + escapedVariableName + '\\b', 'g');

            let match;
            while ((match = variableRegex.exec(line)) !== null) {
                // Found the variable, return precise position
                return {
                    start: { line: lineIndex, character: match.index },
                    end: { line: lineIndex, character: match.index + variableName.length }
                };
            }
        }

        return null;
    }

    /**
     * Validate syntax within condition content
     */
    private validateConditionSyntax(condition: ConditionNode, diagnostics: Diagnostic[]): void {
        const content = condition.content.trim();

        // 1. Check for invalid parentheses sequences like ())() or ))(
        const invalidParenthesesPatterns = [
            /\)\s*\)\s*\(/g,  // ())( with optional spaces
            /\)\)\(/g,        // ())( without spaces
            /\(\)\(\)/g,      // ()() - empty parentheses pairs
            /\)\)\)/g,        // ))) - too many closing
            /\(\(\(/g         // ((( - too many opening
        ];

        let parenMatch;
        for (const pattern of invalidParenthesesPatterns) {
            pattern.lastIndex = 0; // Reset regex state
            while ((parenMatch = pattern.exec(content)) !== null) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character + parenMatch.index },
                        end: { line: condition.range.start.line, character: condition.range.start.character + parenMatch.index + parenMatch[0].length }
                    },
                    message: `Invalid parentheses sequence: "${parenMatch[0]}". Check for missing operators or extra parentheses.`,
                    source: 'drools-syntax',
                    code: 'invalid-parentheses'
                });
            }
        }

        // 2. Check for missing $ prefix in variable declarations
        // Enhanced pattern to catch ALL variable declarations without $ prefix
        // This pattern matches: variableName : FactType anywhere in the content
        const missingDollarPattern = /(?:^|[^$\w])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[A-Z][a-zA-Z0-9_]*\s*\(/g;

        let match;
        while ((match = missingDollarPattern.exec(content)) !== null) {
            const variableName = match[1];

            // Skip if this is actually a valid Java construct (like labels)
            // In Drools LHS, all variable bindings MUST start with $
            const beforeMatch = content.substring(0, match.index);
            const isInJavaContext = beforeMatch.includes('//') || beforeMatch.includes('/*');

            if (!isInJavaContext) {
                // Use precise position calculator for accurate positioning
                const precisePosition = this.positionCalculator.findVariableDeclarationPosition(
                    { conditions: [condition], range: condition.range } as WhenNode,
                    variableName
                );

                if (precisePosition) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: precisePosition,
                        message: `Variable "${variableName}" must start with $ prefix. In Drools LHS, all variables must use $ prefix: $${variableName}`,
                        source: 'drools-syntax',
                        code: 'missing-dollar-prefix'
                    });
                }
            }

            // 3. Check for unbalanced parentheses
            const openParens = (content.match(/\(/g) || []).length;
            const closeParens = (content.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing. Check for missing or extra parentheses.`,
                    source: 'drools-syntax',
                    code: 'unbalanced-parentheses'
                });
            }

            // 4. Check for malformed variable declarations with spaces
            const malformedVariablePattern = /\$[a-zA-Z_][a-zA-Z0-9_]*\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:/g;
            while ((match = malformedVariablePattern.exec(content)) !== null) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: 'Variable names cannot contain spaces. Use camelCase or underscores instead.',
                    source: 'drools-syntax'
                });
            }

            // Check for malformed fact type names with spaces
            const malformedFactTypePattern = /:\s*[A-Z][a-zA-Z0-9_]*\s+[a-zA-Z0-9_]+\s*\(/g;
            while ((match = malformedFactTypePattern.exec(content)) !== null) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: 'Fact type names cannot contain spaces. Use camelCase instead.',
                    source: 'drools-semantic'
                });
            }

            // Check for invalid variable name patterns (starting with numbers, containing invalid chars)
            const invalidVariablePattern = /\$[0-9][a-zA-Z0-9_]*|[\$][a-zA-Z_][a-zA-Z0-9_]*[^a-zA-Z0-9_\s:]/g;
            while ((match = invalidVariablePattern.exec(content)) !== null) {
                const varName = match[0];
                if (varName.match(/\$[0-9]/)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: condition.range.start.line, character: condition.range.start.character },
                            end: { line: condition.range.end.line, character: condition.range.end.character }
                        },
                        message: `Variable name "${varName}" cannot start with a number.`,
                        source: 'drools-semantic'
                    });
                }
            }

            // Check for invalid semicolons in LHS (when clause)
            // Semicolons are generally not allowed in Drools LHS conditions
            // BUT they can appear in accumulate patterns and other complex constructs
            if (content.includes(';')) {
                // Don't flag semicolons in accumulate patterns or other complex constructs
                const isInAccumulate = content.includes('accumulate(') || content.includes('accumulate ');
                const isInComplexPattern = content.includes('forall(') || content.includes('exists(') || content.includes('eval(');

                if (!isInAccumulate && !isInComplexPattern) {
                    // Use precise position calculator for semicolon positioning
                    const semicolonPosition = this.positionCalculator.findJavaErrorPosition(content, ';', condition.range.start.line);
                    const fallbackRange = {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.start.line, character: condition.range.start.character + 1 }
                    };

                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning, // Changed to warning
                        range: semicolonPosition || fallbackRange,
                        message: 'Semicolons are generally not allowed in when clause conditions. Check if this is correct.',
                        source: 'drools-semantic'
                    });
                }
            }

            // Check for missing colons in variable declarations
            const missingColonPattern = /\$[a-zA-Z_][a-zA-Z0-9_]*\s+[A-Z][a-zA-Z0-9_]*\s*\(/g;
            while ((match = missingColonPattern.exec(content)) !== null) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: 'Missing colon (:) in variable declaration. Use format: $variable : FactType()',
                    source: 'drools-semantic'
                });
            }

            // Check for invalid bare words in LHS (should be proper Drools patterns)
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(content.trim())) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: `Invalid condition syntax: "${content.trim()}". LHS must contain proper Drools pattern syntax like: $variable : FactType() or eval(...).`,
                    source: 'drools-semantic'
                });
            }

            // Check for missing proper pattern structure
            // Disabled this validation as it's too broad and causes false positives
            // Drools has many valid pattern syntaxes that this check doesn't account for
            // The parser should handle basic syntax validation

            // Only flag obviously invalid patterns, not complex valid ones
            if (content.trim() && content.trim().length > 0) {
                // Only flag patterns that are clearly malformed, not just different from expected format
                const isClearlyInvalid = content.includes(':::') || // Triple colon is clearly wrong
                    content.includes('$$') ||    // Double dollar is wrong
                    /^\s*[{}]\s*$/.test(content); // Just braces alone

                if (isClearlyInvalid) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: condition.range.start.line, character: condition.range.start.character },
                            end: { line: condition.range.end.line, character: condition.range.end.character }
                        },
                        message: 'Invalid condition syntax detected.',
                        source: 'drools-semantic'
                    });
                }
            }

            // Check for double colon syntax error (:: should be :)
            const doubleColonPattern = /\$[a-zA-Z_][a-zA-Z0-9_]*\s*::\s*/g;
            let doubleColonMatch;
            while ((doubleColonMatch = doubleColonPattern.exec(content)) !== null) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: condition.range.start.line, character: condition.range.start.character },
                        end: { line: condition.range.end.line, character: condition.range.end.character }
                    },
                    message: 'Invalid double colon (::) in variable declaration. Use single colon (:) instead. Correct format: $variable : FactType()',
                    source: 'drools-semantic'
                });
            }
        }
    }

    /**
     * Validate variable usage between LHS (when) and RHS (then) clauses
     */
    private validateVariableUsageBetweenClauses(rule: RuleNode, diagnostics: Diagnostic[]): void {
        if (!rule.when || !rule.then) {
            return; // Can't validate if either clause is missing
        }

        // Extract variables declared in LHS (when clause) and check for duplicates
        const declaredVariables = new Set<string>();
        const variableDeclarations = new Map<string, ConditionNode[]>();

        // Get variables from parsed conditions
        for (const condition of rule.when.conditions) {
            if (condition.variable) {
                declaredVariables.add(condition.variable);

                // Track where each variable is declared for duplicate detection
                if (!variableDeclarations.has(condition.variable)) {
                    variableDeclarations.set(condition.variable, []);
                }
                variableDeclarations.get(condition.variable)!.push(condition);
            } else if (condition.content) {
                // Fallback: extract variables from condition content using regex if condition.variable is not available
                const variableMatches = condition.content.match(/\$[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/g);
                if (variableMatches) {
                    for (const variable of variableMatches) {
                        declaredVariables.add(variable);

                        // Track for duplicate detection
                        if (!variableDeclarations.has(variable)) {
                            variableDeclarations.set(variable, []);
                        }
                        variableDeclarations.get(variable)!.push(condition);
                    }
                }
            }
        }

        // Check for duplicate variable declarations
        this.checkForDuplicateVariables(variableDeclarations, diagnostics);

        // Extract variables used in RHS (then clause)
        const usedVariables = new Set<string>();
        if (rule.then.actions) {
            const variableMatches = rule.then.actions.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g);
            if (variableMatches) {
                for (const variable of variableMatches) {
                    usedVariables.add(variable);
                }
            }
        }

        // Check for undefined variables (used in RHS but not declared in LHS)
        for (const usedVariable of usedVariables) {
            if (!declaredVariables.has(usedVariable)) {
                // Check if this might be a global variable, function parameter, or built-in
                const isBuiltIn = ['drools', 'kcontext'].includes(usedVariable.replace('$', ''));
                const isGlobal = usedVariable.match(/^[a-zA-Z][a-zA-Z0-9]*$/); // No $ prefix for globals

                // Skip built-ins and globals
                if (!isBuiltIn && !isGlobal && usedVariable.startsWith('$')) {
                    // Find the specific position of the undefined variable in the then clause
                    const variablePosition = this.findVariablePositionInThenClause(rule.then, usedVariable);

                    const range = variablePosition || {
                        start: { line: rule.then.range.start.line, character: rule.then.range.start.character },
                        end: { line: rule.then.range.end.line, character: rule.then.range.end.character }
                    };
                    const positionInfo = `[Line ${range.start.line + 1}, Col ${range.start.character + 1}-${range.end.character}]`;
                    
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: range,
                        message: `Undefined variable: ${usedVariable} is used but not declared in the when clause ${positionInfo}`,
                        source: 'drools-semantic',
                        code: 'undefined-variable' // Helps with error categorization and gutter icons
                    });
                }
            }
        }

        // Optional: Check for unused variables (declared in LHS but not used in RHS)
        // This is a warning, not an error, as variables might be used for pattern matching only
        for (const declaredVariable of declaredVariables) {
            if (!usedVariables.has(declaredVariable)) {
                // Find the precise position of the unused variable declaration
                const variablePosition = this.findVariableDeclarationPosition(rule.when, declaredVariable);

                diagnostics.push({
                    severity: DiagnosticSeverity.Information,
                    range: variablePosition || {
                        start: { line: rule.when.range.start.line, character: rule.when.range.start.character },
                        end: { line: rule.when.range.end.line, character: rule.when.range.end.character }
                    },
                    message: `Variable ${declaredVariable} is declared but never used in the then clause.`,
                    source: 'drools-semantic',
                    tags: [1] // DiagnosticTag.Unnecessary - shows as faded/grayed out
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
                    // Use precise position calculator for accurate positioning
                    const precisePosition = this.positionCalculator.findVariablePositionInThenClause(rule.then, usedVar);

                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: precisePosition || {
                            start: { line: rule.then.range.start.line, character: 0 },
                            end: { line: rule.then.range.start.line, character: usedVar.length }
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

        // Rule attributes are already validated in validateDroolsRuleAttributes() above

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
        // Modern Drools (7+) does not require semicolons for package, import, and global declarations
        // Semicolon warnings are disabled to match modern Drools syntax conventions

        // Only validate semicolons in contexts where they are actually required
        // (e.g., within rule actions where Java syntax applies)

        // Note: This method is intentionally left mostly empty to avoid false positives
        // with modern Drools syntax that doesn't require semicolons for top-level declarations
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
            // Check if rule name contains truly invalid characters
            // For quoted rule names, Drools allows most characters except unescaped quotes
            // Only flag truly problematic characters
            if (rule.name && this.hasInvalidRuleNameCharacters(rule.name)) {
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
        // Check if pattern is incomplete - but be more lenient for complex patterns
        // as they often have complex nested structures that the parser might not fully understand
        const complexPatterns = ['accumulate', 'collect', 'from', 'not', 'exists', 'forall'];

        if (!pattern.isComplete && !complexPatterns.includes(pattern.keyword)) {
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

        // For complex patterns (accumulate, collect, from), only flag as incomplete if obviously malformed
        if (!pattern.isComplete && complexPatterns.includes(pattern.keyword)) {
            // Only flag if the pattern content is clearly incomplete (e.g., just "accumulate(" or "collect(")
            const isObviouslyIncomplete = pattern.content &&
                (pattern.content.trim().endsWith(`${pattern.keyword}(`) ||
                    pattern.content.trim() === pattern.keyword);

            if (isObviouslyIncomplete) {
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

        // Check for unmatched parentheses - but be very lenient for complex patterns
        // Only flag obvious mismatches, not complex multi-line patterns that might span conditions
        const mismatch = Math.abs(openParens.length - closeParens.length);

        // Only flag if there's a significant mismatch (more than 2) to avoid false positives
        // Complex Drools patterns often have parentheses that span multiple parsed conditions
        if (mismatch > 2) {
            if (openParens.length > closeParens.length) {
                const unmatchedCount = openParens.length - closeParens.length;
                const lastOpen = openParens[openParens.length - 1];

                diagnostics.push({
                    severity: DiagnosticSeverity.Warning, // Changed to warning
                    range: {
                        start: { line: lastOpen.start.line, character: lastOpen.start.character },
                        end: { line: lastOpen.end.line, character: lastOpen.end.character }
                    },
                    message: `Possible ${unmatchedCount} unmatched opening parenthesis${unmatchedCount > 1 ? 'es' : ''} - check if pattern is complete`,
                    source: 'drools-multiline'
                });
            }

            if (closeParens.length > openParens.length) {
                const unmatchedCount = closeParens.length - openParens.length;
                const firstClose = closeParens[0];

                diagnostics.push({
                    severity: DiagnosticSeverity.Warning, // Changed to warning
                    range: {
                        start: { line: firstClose.start.line, character: firstClose.start.character },
                        end: { line: firstClose.end.line, character: firstClose.end.character }
                    },
                    message: `Possible ${unmatchedCount} unmatched closing parenthesis${unmatchedCount > 1 ? 'es' : ''} - check if pattern is complete`,
                    source: 'drools-multiline'
                });
            }
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

        // Check for malformed accumulate patterns - but be more lenient
        if (pattern.patternType === 'accumulate') {
            // Accumulate can use either:
            // 1. Built-in functions: sum(), count(), avg(), min(), max(), etc.
            // 2. Custom functions with init:, action:, result: clauses
            // 3. Other valid accumulate patterns that we might not recognize

            const hasBuiltInFunction = /\b(sum|count|avg|average|min|max|collectList|collectSet|variance|standardDeviation)\s*\(/.test(content);

            // Be more flexible with custom clause detection - look for any of the keywords
            const hasInitClause = /\binit\s*\(/.test(content) || content.includes('init:');
            const hasActionClause = /\baction\s*\(/.test(content) || content.includes('action:');
            const hasResultClause = /\bresult\s*\(/.test(content) || content.includes('result:');
            const hasCustomClauses = hasInitClause && hasActionClause && hasResultClause;

            // Also check for other valid accumulate patterns
            const hasFromClause = content.includes('from ');
            const hasValidPattern = hasBuiltInFunction || hasCustomClauses || hasFromClause;

            // Only flag if it's clearly an invalid accumulate pattern
            if (!hasValidPattern && content.length > pattern.keyword.length + 2) {
                // But be very conservative - only flag obvious errors
                const isObviouslyInvalid = content.trim() === `${pattern.keyword}()` ||
                    content.trim() === pattern.keyword;

                if (isObviouslyInvalid) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning, // Changed to warning
                        range: {
                            start: { line: pattern.range.start.line, character: pattern.range.start.character },
                            end: { line: pattern.range.end.line, character: pattern.range.end.character }
                        },
                        message: 'accumulate pattern appears to be incomplete - consider adding built-in functions or custom clauses',
                        source: 'drools-multiline'
                    });
                }
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

        // Semantic validation is already handled in the main provideDiagnostics method
        // No need to duplicate it here

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

    // Duplicate validation methods removed - rule attributes are validated in validateDroolsRuleAttributes()

    /**
     * Validate rule attribute values
     */
    private validateAttributeValue(rule: RuleNode, attribute: any, diagnostics: Diagnostic[]): void {
        switch (attribute.name) {
            case 'salience':
                if (attribute.value !== undefined) {
                    // Handle both number and string representations
                    const numValue = typeof attribute.value === 'number' ? attribute.value : parseFloat(attribute.value);
                    if (isNaN(numValue)) {
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
                }
                break;
            case 'no-loop':
            case 'auto-focus':
            case 'lock-on-active':
            case 'enabled':
                if (attribute.value !== undefined) {
                    // Handle both boolean and string representations
                    const strValue = String(attribute.value).toLowerCase();
                    if (strValue !== 'true' && strValue !== 'false' && typeof attribute.value !== 'boolean') {
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
        const validBasicPatternTypes = ['pattern', 'constraint']; // Basic Drools patterns

        // Only validate if this is actually a multi-line pattern
        // Basic patterns like "$var : Type()" should not be restricted
        if (condition.conditionType &&
            !validPatternTypes.includes(condition.conditionType) &&
            !validBasicPatternTypes.includes(condition.conditionType)) {

            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: condition.range.start.line, character: condition.range.start.character },
                    end: { line: condition.range.end.line, character: condition.range.end.character }
                },
                message: `Invalid pattern type: "${condition.conditionType}". Valid types are: ${[...validPatternTypes, ...validBasicPatternTypes].join(', ')}`,
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

                // Skip common Java identifiers that are valid in Drools context
                // Disabled to reduce false positives - most identifiers are valid in Drools context

                // If we reach here, it might be an invalid keyword
                // But we need to be very conservative to avoid false positives
                if (this.looksLikeInvalidKeyword(word, cleanLine, startChar)) {
                    // Disable aggressive keyword validation to reduce false positives
                    // This validation is too aggressive and flags valid identifiers
                    // diagnostics.push({
                    //     severity: DiagnosticSeverity.Warning,
                    //     range: {
                    //         start: { line: lineIndex, character: startChar },
                    //         end: { line: lineIndex, character: startChar + word.length }
                    //     },
                    //     message: `Unknown keyword or identifier: "${word}". Check if this is a valid Drools keyword or Java identifier.`,
                    //     source: 'drools-keywords'
                    // });
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

    /**
     * Check for duplicate variable declarations and report them
     */
    private checkForDuplicateVariables(variableDeclarations: Map<string, ConditionNode[]>, diagnostics: Diagnostic[]): void {
        for (const [variableName, declarations] of variableDeclarations) {
            if (declarations.length > 1) {
                // Report duplicate declarations (skip the first one, report the rest)
                for (let i = 1; i < declarations.length; i++) {
                    const duplicateDeclaration = declarations[i];

                    // Find the specific position of the variable in the condition
                    const variablePosition = this.findVariablePositionInCondition(duplicateDeclaration, variableName);

                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: variablePosition || {
                            start: { line: duplicateDeclaration.range.start.line, character: duplicateDeclaration.range.start.character },
                            end: { line: duplicateDeclaration.range.end.line, character: duplicateDeclaration.range.end.character }
                        },
                        message: `Duplicate variable declaration: ${variableName} is already declared. Each variable can only be declared once in the when clause.`,
                        source: 'drools-semantic'
                    });
                }
            }
        }
    }

    /**
     * Find the specific position of a variable within a condition
     */
    private findVariablePositionInCondition(condition: ConditionNode, variableName: string): Range | null {
        // Use precise position calculator for accurate positioning
        return this.positionCalculator.findVariableDeclarationPosition(
            { conditions: [condition], range: condition.range } as WhenNode,
            variableName
        );
    }

    /**
     * Get current validation performance metrics
     */
    public getPerformanceMetrics(): ValidationMetrics {
        return this.metricsCollector.finalizeMetrics();
    }

    /**
     * Get detailed phase metrics for debugging
     */
    public getPhaseMetrics(): ValidationPhaseMetrics[] {
        return this.metricsCollector.getPhaseMetrics();
    }

    /**
     * Get performance benchmarks for analysis
     */
    public getPerformanceBenchmarks(): PerformanceBenchmark[] {
        return this.metricsCollector.getBenchmarks();
    }

    /**
     * Generate a performance report for debugging
     */
    public generatePerformanceReport(): string {
        return this.metricsCollector.generatePerformanceReport();
    }

    /**
     * Check if validation performance is acceptable
     */
    public isPerformanceAcceptable(maxTimeMs: number = 1000, maxMemoryMB: number = 50): boolean {
        return this.metricsCollector.isPerformanceAcceptable(maxTimeMs, maxMemoryMB);
    }

    /**
     * Get performance optimization suggestions
     */
    public getOptimizationSuggestions(): string[] {
        return this.metricsCollector.getOptimizationSuggestions();
    }

    /**
     * Record cache hit for performance tracking
     */
    public recordCacheHit(): void {
        this.metricsCollector.recordCacheHit();
    }

    /**
     * Record cache miss for performance tracking
     */
    public recordCacheMiss(): void {
        this.metricsCollector.recordCacheMiss();
    }

    /**
     * Check if current validation is performing slower than expected
     */
    public isPerformanceDegraded(fileSize: number, ruleCount: number): boolean {
        return this.metricsCollector.isPerformanceDegraded(fileSize, ruleCount);
    }

    /**
     * Remove duplicate diagnostics based on message, source, and position
     */
    private deduplicateDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
        const seen = new Set<string>();
        const deduplicated: Diagnostic[] = [];

        for (const diagnostic of diagnostics) {
            // Create a unique key based on message, source, line, and character
            const key = `${diagnostic.message}|${diagnostic.source}|${diagnostic.range.start.line}|${diagnostic.range.start.character}`;

            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(diagnostic);
            }
        }

        return deduplicated;
    }

    /**
     * Find the precise position where a variable is declared in the when clause
     */
    private findVariableDeclarationPosition(whenClause: WhenNode, variableName: string): Range | null {
        // Use the precise position calculator for accurate positioning
        return this.positionCalculator.findVariableDeclarationPosition(whenClause, variableName);
    }
}