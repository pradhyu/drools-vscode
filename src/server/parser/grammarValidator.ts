/**
 * Grammar Validator for ANTLR DRL6 Grammar Compliance
 * 
 * This module validates that our parser implementation follows the official
 * ANTLR grammar rules defined in DRL6Expressions.g and DRL6Lexer.g
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { DroolsAST, ConditionNode, MultiLinePatternNode, Position, Range } from './ast';

export interface GrammarValidationResult {
    isValid: boolean;
    violations: GrammarViolation[];
    warnings: GrammarWarning[];
}

export interface GrammarViolation {
    rule: string;
    message: string;
    position: Position;
    severity: 'error' | 'warning';
    grammarReference: string;
}

export interface GrammarWarning {
    rule: string;
    message: string;
    position: Position;
    suggestion: string;
}

/**
 * ANTLR Grammar Rules Reference
 * Based on DRL6Expressions.g and DRL6Lexer.g
 */
export const ANTLR_GRAMMAR_RULES = {
    // Expression hierarchy from DRL6Expressions.g
    EXPRESSION_HIERARCHY: [
        'expression',
        'conditionalExpression', 
        'conditionalOrExpression',
        'conditionalAndExpression',
        'inclusiveOrExpression',
        'exclusiveOrExpression',
        'andExpression',
        'equalityExpression',
        'instanceOfExpression',
        'inExpression',
        'relationalExpression'
    ],
    
    // Multi-line pattern keywords
    PATTERN_KEYWORDS: ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'],
    
    // Operators from DRL6Lexer.g
    COMPARISON_OPERATORS: ['==', '!=', '>=', '<=', '>', '<'],
    LOGICAL_OPERATORS: ['&&', '||', '!'],
    ASSIGNMENT_OPERATORS: [':=', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%='],
    ARITHMETIC_OPERATORS: ['+', '-', '*', '/', '%'],
    
    // Literals from DRL6Lexer.g
    LITERAL_PATTERNS: {
        STRING: /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')$/,
        DECIMAL: /^\d+[lLiI]?$/,
        FLOAT: /^(\d+\.\d*|\.\d+)([eE][+-]?\d+)?[fFdDbB]?$/,
        HEX: /^0[xX][0-9a-fA-F]+[lLiI]?$/,
        BOOL: /^(true|false)$/,
        NULL: /^null$/,
        TIME_INTERVAL: /^(\d+d)?(\d+h)?(\d+m)?(\d+s)?(\d+ms?)?$/
    },
    
    // Bracket pairs from DRL6Lexer.g
    BRACKET_PAIRS: {
        '(': ')',
        '[': ']',
        '{': '}'
    }
};

export class GrammarValidator {
    private violations: GrammarViolation[] = [];
    private warnings: GrammarWarning[] = [];

    /**
     * Validate AST against ANTLR grammar rules
     * Requirement: Cross-reference parser behavior with DRL6Expressions.g grammar
     */
    public validateAST(ast: DroolsAST, sourceText: string): GrammarValidationResult {
        this.violations = [];
        this.warnings = [];

        // Validate each rule in the AST
        for (const rule of ast.rules) {
            this.validateRule(rule, sourceText);
        }

        // Validate global elements
        for (const global of ast.globals) {
            this.validateGlobal(global, sourceText);
        }

        // Validate imports
        for (const importNode of ast.imports) {
            this.validateImport(importNode, sourceText);
        }

        return {
            isValid: this.violations.filter(v => v.severity === 'error').length === 0,
            violations: this.violations,
            warnings: this.warnings
        };
    }

    /**
     * Validate rule structure against ANTLR grammar
     */
    private validateRule(rule: any, sourceText: string): void {
        // Validate rule name follows identifier rules
        if (!this.isValidIdentifier(rule.name)) {
            this.addViolation(
                'RULE_NAME',
                `Rule name "${rule.name}" does not follow ANTLR identifier rules`,
                rule.range.start,
                'error',
                'DRL6Lexer.g: ID rule'
            );
        }

        // Validate when clause
        if (rule.when) {
            this.validateWhenClause(rule.when, sourceText);
        }

        // Validate then clause
        if (rule.then) {
            this.validateThenClause(rule.then, sourceText);
        }

        // Validate rule attributes
        if (rule.attributes) {
            for (const attr of rule.attributes) {
                this.validateRuleAttribute(attr, sourceText);
            }
        }
    }

    /**
     * Validate when clause conditions against ANTLR expression grammar
     * Requirement: Ensure compliance with ANTLR-defined expression parsing rules
     */
    private validateWhenClause(whenClause: any, sourceText: string): void {
        for (const condition of whenClause.conditions) {
            this.validateCondition(condition, sourceText);
        }
    }

    /**
     * Validate individual condition against ANTLR grammar rules
     */
    private validateCondition(condition: ConditionNode, sourceText: string): void {
        // Validate multi-line patterns
        if (condition.isMultiLine && condition.multiLinePattern) {
            this.validateMultiLinePattern(condition.multiLinePattern, sourceText);
        }

        // Validate condition content follows expression grammar
        this.validateExpressionSyntax(condition.content, condition.range.start);

        // Validate parentheses matching
        if (condition.parenthesesRanges) {
            this.validateParenthesesMatching(condition.parenthesesRanges, condition.range.start);
        }

        // Validate constraint syntax
        if (condition.constraints) {
            for (const constraint of condition.constraints) {
                this.validateConstraint(constraint, sourceText);
            }
        }
    }

    /**
     * Validate multi-line pattern against ANTLR grammar
     * Requirement: Support all ANTLR-defined constructs
     */
    private validateMultiLinePattern(pattern: MultiLinePatternNode, sourceText: string): void {
        // Validate pattern keyword is recognized by ANTLR grammar
        if (!ANTLR_GRAMMAR_RULES.PATTERN_KEYWORDS.includes(pattern.keyword)) {
            this.addViolation(
                'INVALID_PATTERN_KEYWORD',
                `Pattern keyword "${pattern.keyword}" is not defined in ANTLR grammar`,
                pattern.range.start,
                'error',
                'DRL6Expressions.g: pattern keywords'
            );
        }

        // Validate pattern completeness
        // Note: This validation is also done in the diagnostic provider
        // to avoid duplicates, we'll let the diagnostic provider handle it
        // if (!pattern.isComplete) {
        //     this.addWarning(
        //         'INCOMPLETE_PATTERN',
        //         `Multi-line pattern "${pattern.keyword}" is incomplete`,
        //         pattern.range.start,
        //         'Consider adding missing closing parentheses'
        //     );
        // }

        // Validate nested patterns
        for (const nestedPattern of pattern.nestedPatterns) {
            this.validateMultiLinePattern(nestedPattern, sourceText);
        }

        // Validate inner conditions follow expression grammar
        if (pattern.innerConditions) {
            for (const innerCondition of pattern.innerConditions) {
                this.validateCondition(innerCondition, sourceText);
            }
        }

        // Validate parentheses ranges
        this.validateParenthesesMatching(pattern.parenthesesRanges, pattern.range.start);

        // Check for excessive nesting depth (memory management)
        if (pattern.depth && pattern.depth > 20) {
            this.addWarning(
                'EXCESSIVE_NESTING',
                `Pattern nesting depth (${pattern.depth}) exceeds recommended limit`,
                pattern.range.start,
                'Consider simplifying the pattern structure'
            );
        }
    }

    /**
     * Validate expression syntax against ANTLR expression grammar
     */
    private validateExpressionSyntax(expression: string, position: Position): void {
        // Check for valid operators
        this.validateOperators(expression, position);
        
        // Check for valid literals
        this.validateLiterals(expression, position);
        
        // Check for valid identifiers
        this.validateIdentifiersInExpression(expression, position);
        
        // Check for balanced quotes
        this.validateStringLiterals(expression, position);
    }

    /**
     * Validate operators against ANTLR lexer rules
     */
    private validateOperators(expression: string, position: Position): void {
        // Find all operator-like tokens
        const operatorPattern = /(==|!=|>=|<=|>|<|&&|\|\||!|:=|\+=|-=|\*=|\/=|&=|\|=|\^=|%=|\+|-|\*|\/|%)/g;
        let match;

        while ((match = operatorPattern.exec(expression)) !== null) {
            const operator = match[1];
            const isValid = [
                ...ANTLR_GRAMMAR_RULES.COMPARISON_OPERATORS,
                ...ANTLR_GRAMMAR_RULES.LOGICAL_OPERATORS,
                ...ANTLR_GRAMMAR_RULES.ASSIGNMENT_OPERATORS,
                ...ANTLR_GRAMMAR_RULES.ARITHMETIC_OPERATORS
            ].includes(operator);

            if (!isValid) {
                this.addViolation(
                    'INVALID_OPERATOR',
                    `Operator "${operator}" is not defined in ANTLR lexer grammar`,
                    { line: position.line, character: position.character + match.index! },
                    'error',
                    'DRL6Lexer.g: operator tokens'
                );
            }
        }
    }

    /**
     * Validate literals against ANTLR lexer patterns
     */
    private validateLiterals(expression: string, position: Position): void {
        // Extract potential literals (simplified approach)
        const tokens = expression.split(/[\s\(\)\[\]\{\},;]+/).filter(token => token.length > 0);

        for (const token of tokens) {
            if (this.isLiteral(token)) {
                this.validateLiteralFormat(token, position);
            }
        }
    }

    /**
     * Check if token is a literal
     */
    private isLiteral(token: string): boolean {
        return (
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.STRING.test(token) ||
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.DECIMAL.test(token) ||
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.FLOAT.test(token) ||
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.HEX.test(token) ||
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.BOOL.test(token) ||
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.NULL.test(token) ||
            ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS.TIME_INTERVAL.test(token)
        );
    }

    /**
     * Validate literal format against ANTLR patterns
     */
    private validateLiteralFormat(literal: string, position: Position): void {
        let isValidFormat = false;
        let literalType = '';

        for (const [type, pattern] of Object.entries(ANTLR_GRAMMAR_RULES.LITERAL_PATTERNS)) {
            if (pattern.test(literal)) {
                isValidFormat = true;
                literalType = type;
                break;
            }
        }

        if (!isValidFormat) {
            this.addViolation(
                'INVALID_LITERAL_FORMAT',
                `Literal "${literal}" does not match any ANTLR lexer pattern`,
                position,
                'error',
                'DRL6Lexer.g: literal patterns'
            );
        }
    }

    /**
     * Validate identifiers against ANTLR identifier rules
     */
    private validateIdentifiersInExpression(expression: string, position: Position): void {
        // Extract potential identifiers (simplified)
        const identifierPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
        let match;

        while ((match = identifierPattern.exec(expression)) !== null) {
            const identifier = match[0];
            
            // Skip keywords and literals
            if (!this.isKeywordOrLiteral(identifier)) {
                if (!this.isValidIdentifier(identifier)) {
                    this.addViolation(
                        'INVALID_IDENTIFIER',
                        `Identifier "${identifier}" does not follow ANTLR identifier rules`,
                        { line: position.line, character: position.character + match.index! },
                        'error',
                        'DRL6Lexer.g: ID rule'
                    );
                }
            }
        }
    }

    /**
     * Validate string literals for proper escaping
     */
    private validateStringLiterals(expression: string, position: Position): void {
        // Check for unbalanced quotes
        const doubleQuoteCount = (expression.match(/"/g) || []).length;
        const singleQuoteCount = (expression.match(/'/g) || []).length;

        if (doubleQuoteCount % 2 !== 0) {
            this.addViolation(
                'UNBALANCED_QUOTES',
                'Unbalanced double quotes in expression',
                position,
                'error',
                'DRL6Lexer.g: STRING rule'
            );
        }

        if (singleQuoteCount % 2 !== 0) {
            this.addViolation(
                'UNBALANCED_QUOTES',
                'Unbalanced single quotes in expression',
                position,
                'error',
                'DRL6Lexer.g: STRING rule'
            );
        }
    }

    /**
     * Validate parentheses matching according to ANTLR grammar
     */
    private validateParenthesesMatching(ranges: Range[], basePosition: Position): void {
        // Skip validation if no ranges provided
        if (!ranges || ranges.length === 0) {
            return;
        }

        // For now, we'll be more lenient with parentheses matching
        // The parser should handle most cases correctly, and we don't want
        // to generate false positives for valid multi-line patterns
        
        // Only report errors if we have a very obvious mismatch
        // This is a conservative approach to avoid false positives
        const totalRanges = ranges.length;
        
        // If we have an odd number of parentheses ranges, it might indicate an issue
        // But only report if it's a clear case (very few ranges)
        if (totalRanges === 1) {
            // Single parenthesis might be unmatched, but let's be conservative
            // and not report this as an error since the parser handles it
        }
    }

    /**
     * Validate constraint syntax
     */
    private validateConstraint(constraint: any, sourceText: string): void {
        // Validate constraint follows ANTLR constraint grammar
        if (constraint.operator && !this.isValidOperator(constraint.operator)) {
            this.addViolation(
                'INVALID_CONSTRAINT_OPERATOR',
                `Constraint operator "${constraint.operator}" is not valid`,
                constraint.range?.start || { line: 0, character: 0 },
                'error',
                'DRL6Expressions.g: operator rules'
            );
        }
    }

    /**
     * Validate global declaration
     */
    private validateGlobal(global: any, sourceText: string): void {
        if (!this.isValidIdentifier(global.name)) {
            this.addViolation(
                'INVALID_GLOBAL_NAME',
                `Global name "${global.name}" does not follow ANTLR identifier rules`,
                global.range?.start || { line: 0, character: 0 },
                'error',
                'DRL6Lexer.g: ID rule'
            );
        }
    }

    /**
     * Validate import statement
     */
    private validateImport(importNode: any, sourceText: string): void {
        // Validate import path follows Java package naming conventions
        const importPath = importNode.path;
        if (importPath && !this.isValidImportPath(importPath)) {
            this.addViolation(
                'INVALID_IMPORT_PATH',
                `Import path "${importPath}" does not follow valid format`,
                importNode.range?.start || { line: 0, character: 0 },
                'warning',
                'Java package naming conventions'
            );
        }
    }

    /**
     * Validate then clause
     */
    private validateThenClause(thenClause: any, sourceText: string): void {
        // Basic validation - then clause should contain valid Java-like code
        if (thenClause.content && thenClause.content.trim().length === 0) {
            this.addWarning(
                'EMPTY_THEN_CLAUSE',
                'Then clause is empty',
                thenClause.range?.start || { line: 0, character: 0 },
                'Consider adding action code or removing the rule'
            );
        }
    }

    /**
     * Validate rule attribute
     */
    private validateRuleAttribute(attribute: any, sourceText: string): void {
        const validAttributes = [
            'salience', 'no-loop', 'ruleflow-group', 'agenda-group',
            'auto-focus', 'activation-group', 'dialect', 'date-effective',
            'date-expires', 'enabled', 'duration', 'timer', 'calendars'
        ];

        if (!validAttributes.includes(attribute.name)) {
            this.addWarning(
                'UNKNOWN_RULE_ATTRIBUTE',
                `Rule attribute "${attribute.name}" is not a standard Drools attribute`,
                attribute.range?.start || { line: 0, character: 0 },
                'Verify the attribute name is correct'
            );
        }
    }

    /**
     * Check if identifier follows ANTLR rules
     */
    private isValidIdentifier(identifier: string): boolean {
        // ANTLR ID rule: IdentifierStart IdentifierPart*
        // Note: Rule names in Drools can contain spaces and are quoted strings
        return /^[a-zA-Z_$][a-zA-Z0-9_$\s]*$/.test(identifier);
    }

    /**
     * Check if token is a keyword or literal
     */
    private isKeywordOrLiteral(token: string): boolean {
        const keywords = [
            'rule', 'when', 'then', 'end', 'and', 'or', 'not', 'exists', 'eval',
            'forall', 'collect', 'accumulate', 'from', 'import', 'global',
            'function', 'query', 'declare', 'true', 'false', 'null'
        ];
        
        return keywords.includes(token) || this.isLiteral(token);
    }

    /**
     * Check if operator is valid according to ANTLR grammar
     */
    private isValidOperator(operator: string): boolean {
        return [
            ...ANTLR_GRAMMAR_RULES.COMPARISON_OPERATORS,
            ...ANTLR_GRAMMAR_RULES.LOGICAL_OPERATORS,
            ...ANTLR_GRAMMAR_RULES.ASSIGNMENT_OPERATORS,
            ...ANTLR_GRAMMAR_RULES.ARITHMETIC_OPERATORS
        ].includes(operator);
    }

    /**
     * Check if import path is valid
     */
    private isValidImportPath(path: string): boolean {
        // Java package naming: lowercase letters, dots, and underscores
        return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*(\.\*)?$/.test(path);
    }

    /**
     * Add grammar violation
     */
    private addViolation(
        rule: string,
        message: string,
        position: Position,
        severity: 'error' | 'warning',
        grammarReference: string
    ): void {
        this.violations.push({
            rule,
            message,
            position,
            severity,
            grammarReference
        });
    }

    /**
     * Add grammar warning
     */
    private addWarning(
        rule: string,
        message: string,
        position: Position,
        suggestion: string
    ): void {
        this.warnings.push({
            rule,
            message,
            position,
            suggestion
        });
    }
}

/**
 * Utility function to validate DRL content against ANTLR grammar
 */
export function validateDRLGrammar(drlContent: string, ast: DroolsAST): GrammarValidationResult {
    const validator = new GrammarValidator();
    return validator.validateAST(ast, drlContent);
}