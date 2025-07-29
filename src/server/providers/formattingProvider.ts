/**
 * Drools document formatting provider
 * Handles document formatting, range formatting, and format-on-save functionality
 */

import {
    DocumentFormattingParams,
    DocumentRangeFormattingParams,
    FormattingOptions,
    TextEdit,
    Range,
    Position
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST, AnyASTNode, RuleNode, FunctionNode, WhenNode, ThenNode, MultiLinePatternNode, ConditionNode } from '../parser/ast';
import { ParseResult } from '../parser/droolsParser';

export interface FormattingSettings {
    insertSpaces: boolean;
    tabSize: number;
    indentSize: number;
    maxLineLength: number;
    insertFinalNewline: boolean;
    trimTrailingWhitespace: boolean;
    spaceAroundOperators: boolean;
    spaceAfterKeywords: boolean;
    alignRuleBlocks: boolean;
    alignClosingParentheses: boolean;
    indentMultiLinePatterns: boolean;
}

export interface MultiLineFormatting {
    formatMultiLinePattern(pattern: MultiLinePatternNode, document: TextDocument): TextEdit[];
    alignClosingParentheses(pattern: MultiLinePatternNode, document: TextDocument): TextEdit[];
    indentNestedLevels(pattern: MultiLinePatternNode, document: TextDocument): TextEdit[];
}

export class DroolsFormattingProvider implements MultiLineFormatting {
    private settings: FormattingSettings;

    constructor(settings: Partial<FormattingSettings> = {}) {
        this.settings = {
            insertSpaces: true,
            tabSize: 4,
            indentSize: 4,
            maxLineLength: 120,
            insertFinalNewline: true,
            trimTrailingWhitespace: true,
            spaceAroundOperators: true,
            spaceAfterKeywords: true,
            alignRuleBlocks: true,
            alignClosingParentheses: true,
            indentMultiLinePatterns: true,
            ...settings
        };
    }

    /**
     * Format entire document
     */
    public formatDocument(
        document: TextDocument,
        options: FormattingOptions,
        parseResult: ParseResult
    ): TextEdit[] {
        // Update settings from formatting options
        this.updateSettingsFromOptions(options);

        const fullRange: Range = {
            start: { line: 0, character: 0 },
            end: { line: document.lineCount - 1, character: document.getText().split('\n').pop()?.length || 0 }
        };

        return this.formatRange(document, fullRange, parseResult);
    }

    /**
     * Format selected range
     */
    public formatRange(
        document: TextDocument,
        range: Range,
        parseResult: ParseResult
    ): TextEdit[] {
        const edits: TextEdit[] = [];
        
        // First, handle multi-line patterns specifically
        const multiLinePatterns = this.findMultiLinePatternsInRange(parseResult.ast, range);
        for (const pattern of multiLinePatterns) {
            const patternEdits = this.formatMultiLinePattern(pattern, document);
            edits.push(...patternEdits);
        }
        
        // If we have multi-line pattern edits, return them
        if (edits.length > 0) {
            return edits;
        }
        
        // Otherwise, fall back to standard formatting
        const text = document.getText(range);
        const lines = text.split('\n');
        
        // Format the text
        const formattedLines = this.formatLines(lines, parseResult.ast, range.start.line);
        const formattedText = formattedLines.join('\n');

        // Apply final formatting rules
        const finalText = this.applyFinalFormatting(formattedText);

        // Return single text edit for the entire range
        return [{
            range,
            newText: finalText
        }];
    }

    /**
     * Format lines with proper indentation and spacing
     */
    private formatLines(lines: string[], ast: DroolsAST, startLine: number): string[] {
        const formattedLines: string[] = [];
        let currentIndentLevel = 0;
        let inRuleBlock = false;
        let inFunctionBlock = false;
        let inWhenBlock = false;
        let inThenBlock = false;
        let braceCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const lineNumber = startLine + i;

            // Skip empty lines but preserve them
            if (trimmedLine === '') {
                formattedLines.push('');
                continue;
            }

            // Skip comments but format their indentation
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
                formattedLines.push(this.getIndentation(currentIndentLevel) + trimmedLine);
                continue;
            }

            // Determine context and adjust indentation
            const contextInfo = this.analyzeLineContext(trimmedLine, ast, lineNumber);
            
            // Adjust indentation based on context
            if (contextInfo.isBlockStart) {
                if (contextInfo.blockType === 'rule') {
                    inRuleBlock = true;
                    currentIndentLevel = 0;
                } else if (contextInfo.blockType === 'function') {
                    inFunctionBlock = true;
                    currentIndentLevel = 0;
                } else if (contextInfo.blockType === 'when') {
                    inWhenBlock = true;
                    currentIndentLevel = 1;
                } else if (contextInfo.blockType === 'then') {
                    inThenBlock = true;
                    inWhenBlock = false;
                    currentIndentLevel = 1;
                }
            } else if (contextInfo.isBlockEnd) {
                if (trimmedLine === 'end') {
                    inRuleBlock = false;
                    inWhenBlock = false;
                    inThenBlock = false;
                    currentIndentLevel = 0;
                } else if (trimmedLine.includes('}')) {
                    if (inFunctionBlock) {
                        inFunctionBlock = false;
                        currentIndentLevel = 0;
                    } else {
                        currentIndentLevel = Math.max(0, currentIndentLevel - 1);
                    }
                }
            }

            // Count braces for function bodies
            braceCount += (trimmedLine.match(/\{/g) || []).length;
            braceCount -= (trimmedLine.match(/\}/g) || []).length;

            // Adjust indentation for function body content
            if (inFunctionBlock && braceCount > 0 && !trimmedLine.includes('{') && !trimmedLine.includes('}')) {
                currentIndentLevel = 1;
            }

            // Format the line content
            const formattedContent = this.formatLineContent(trimmedLine);
            
            // Apply indentation
            const indentedLine = this.getIndentation(currentIndentLevel) + formattedContent;
            formattedLines.push(indentedLine);

            // Adjust indentation for next line
            if (contextInfo.increasesIndent) {
                currentIndentLevel++;
            } else if (contextInfo.decreasesIndent) {
                currentIndentLevel = Math.max(0, currentIndentLevel - 1);
            }
        }

        return formattedLines;
    }

    /**
     * Analyze line context to determine formatting rules
     */
    private analyzeLineContext(line: string, ast: DroolsAST, lineNumber: number): {
        isBlockStart: boolean;
        isBlockEnd: boolean;
        blockType?: 'rule' | 'function' | 'when' | 'then' | 'query' | 'declare';
        increasesIndent: boolean;
        decreasesIndent: boolean;
    } {
        const result = {
            isBlockStart: false,
            isBlockEnd: false,
            blockType: undefined as 'rule' | 'function' | 'when' | 'then' | 'query' | 'declare' | undefined,
            increasesIndent: false,
            decreasesIndent: false
        };

        // Check for block starts
        if (line.startsWith('rule ')) {
            result.isBlockStart = true;
            result.blockType = 'rule';
        } else if (line.startsWith('function ')) {
            result.isBlockStart = true;
            result.blockType = 'function';
        } else if (line === 'when') {
            result.isBlockStart = true;
            result.blockType = 'when';
        } else if (line === 'then') {
            result.isBlockStart = true;
            result.blockType = 'then';
        } else if (line.startsWith('query ')) {
            result.isBlockStart = true;
            result.blockType = 'query';
        } else if (line.startsWith('declare ')) {
            result.isBlockStart = true;
            result.blockType = 'declare';
        }

        // Check for block ends
        if (line === 'end') {
            result.isBlockEnd = true;
        } else if (line.includes('}')) {
            result.isBlockEnd = true;
        }

        // Check for indentation changes
        if (line.includes('{') && !line.includes('}')) {
            result.increasesIndent = true;
        } else if (line.includes('}') && !line.includes('{')) {
            result.decreasesIndent = true;
        }

        return result;
    }

    /**
     * Format line content with proper spacing
     */
    private formatLineContent(line: string): string {
        let formatted = line;

        // Add space after keywords (but not in compound words like "no-loop")
        if (this.settings.spaceAfterKeywords) {
            // First, protect compound attributes
            formatted = formatted.replace(/\bno-loop\b/g, 'NO_LOOP_PLACEHOLDER');
            formatted = formatted.replace(/\block-on-active\b/g, 'LOCK_ON_ACTIVE_PLACEHOLDER');
            
            // Apply keyword spacing
            formatted = formatted.replace(/\b(rule|when|then|function|import|package|global|query|declare|exists|not|eval)\b(?!\s)/g, '$1 ');
            
            // Restore compound attributes
            formatted = formatted.replace(/NO_LOOP_PLACEHOLDER/g, 'no-loop');
            formatted = formatted.replace(/LOCK_ON_ACTIVE_PLACEHOLDER/g, 'lock-on-active');
        }

        // Add space around operators
        if (this.settings.spaceAroundOperators) {
            // Simple approach - add spaces around common operators
            // Use \w which includes letters, digits, and underscore
            formatted = formatted.replace(/(\w)(>=|<=|!=|==)(\w)/g, '$1 $2 $3');
            formatted = formatted.replace(/(\w)([<>])(\w)/g, '$1 $2 $3');
            formatted = formatted.replace(/(\w)(=)(\w)/g, '$1 $2 $3');
            formatted = formatted.replace(/(\w)(&&|\|\|)(\w)/g, '$1 $2 $3');
            formatted = formatted.replace(/(\w)(\+)(\w)/g, '$1 $2 $3');
            formatted = formatted.replace(/(\w)(\*)(\w)/g, '$1 $2 $3');
            formatted = formatted.replace(/(\w)(\/)(\w)/g, '$1 $2 $3');
            
            // Handle minus operator carefully (not for attribute names like "no-loop")
            formatted = formatted.replace(/(\w)-(\w)/g, (match, before, after) => {
                // Check if this looks like an attribute name
                if (/[a-zA-Z]/.test(before) && /[a-zA-Z]/.test(after)) {
                    return match; // Keep as-is for attribute names
                }
                return `${before} - ${after}`;
            });
        }

        // Format colons in patterns and declarations
        formatted = formatted.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1 : $2');
        formatted = formatted.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_.<>]*)/g, '$1 : $2');

        // Format function parameters with proper spacing
        formatted = formatted.replace(/,\s*/g, ', ');
        
        // Format parentheses spacing
        formatted = formatted.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '$1(');
        
        // Format function braces - ensure space before opening brace
        formatted = formatted.replace(/\)\s*\{/g, ') {');
        
        // Fix generic type formatting - remove spaces inside angle brackets (but not around comparison operators)
        // Only remove spaces around < and > when they appear to be generic type brackets
        formatted = formatted.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*<\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1<$2');
        formatted = formatted.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*>\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1>$2');
        
        // Clean up multiple spaces but preserve intentional spacing
        formatted = formatted.replace(/\s{2,}/g, ' ');

        // Trim trailing whitespace
        if (this.settings.trimTrailingWhitespace) {
            formatted = formatted.trimEnd();
        }

        return formatted;
    }

    /**
     * Get indentation string based on level
     */
    private getIndentation(level: number): string {
        const indentChar = this.settings.insertSpaces ? ' ' : '\t';
        const indentSize = this.settings.insertSpaces ? this.settings.indentSize : 1;
        return indentChar.repeat(level * indentSize);
    }

    /**
     * Apply final formatting rules
     */
    private applyFinalFormatting(text: string): string {
        let formatted = text;

        // Ensure final newline
        if (this.settings.insertFinalNewline && !formatted.endsWith('\n')) {
            formatted += '\n';
        }

        // Remove excessive blank lines (more than 2 consecutive)
        formatted = formatted.replace(/\n\s*\n\s*\n+/g, '\n\n');

        return formatted;
    }

    /**
     * Update settings from VSCode formatting options
     */
    private updateSettingsFromOptions(options: FormattingOptions): void {
        this.settings.insertSpaces = options.insertSpaces;
        this.settings.tabSize = options.tabSize;
        
        // Use tabSize as indentSize if insertSpaces is true
        if (options.insertSpaces) {
            this.settings.indentSize = options.tabSize;
        }
    }

    /**
     * Check if a position is within a specific AST node
     */
    private isPositionInNode(position: Position, node: AnyASTNode): boolean {
        return position.line >= node.range.start.line && 
               position.line <= node.range.end.line &&
               (position.line !== node.range.start.line || position.character >= node.range.start.character) &&
               (position.line !== node.range.end.line || position.character <= node.range.end.character);
    }

    /**
     * Find the AST node at a specific position
     */
    private findNodeAtPosition(position: Position, ast: DroolsAST): AnyASTNode | null {
        // Check rules
        for (const rule of ast.rules) {
            if (this.isPositionInNode(position, rule)) {
                return rule;
            }
        }

        // Check functions
        for (const func of ast.functions) {
            if (this.isPositionInNode(position, func)) {
                return func;
            }
        }

        // Check other nodes...
        return null;
    }

    /**
     * Find multi-line patterns within a given range
     */
    private findMultiLinePatternsInRange(ast: DroolsAST, range: Range): MultiLinePatternNode[] {
        const patterns: MultiLinePatternNode[] = [];
        
        // Search through rules for multi-line patterns
        for (const rule of ast.rules) {
            if (rule.when) {
                const rulePatterns = this.extractMultiLinePatternsFromConditions(rule.when.conditions, range);
                patterns.push(...rulePatterns);
            }
        }
        
        return patterns;
    }

    /**
     * Extract multi-line patterns from condition nodes
     */
    private extractMultiLinePatternsFromConditions(conditions: ConditionNode[], range: Range): MultiLinePatternNode[] {
        const patterns: MultiLinePatternNode[] = [];
        
        for (const condition of conditions) {
            // Check if condition has a multi-line pattern
            if (condition.multiLinePattern && this.isRangeOverlapping(condition.multiLinePattern.range, range)) {
                patterns.push(condition.multiLinePattern);
            }
            
            // Check nested conditions
            if (condition.nestedConditions) {
                const nestedPatterns = this.extractMultiLinePatternsFromConditions(condition.nestedConditions, range);
                patterns.push(...nestedPatterns);
            }
        }
        
        return patterns;
    }

    /**
     * Check if two ranges overlap
     */
    private isRangeOverlapping(range1: Range, range2: Range): boolean {
        return !(range1.end.line < range2.start.line || 
                range2.end.line < range1.start.line ||
                (range1.end.line === range2.start.line && range1.end.character < range2.start.character) ||
                (range2.end.line === range1.start.line && range2.end.character < range1.start.character));
    }

    /**
     * Format a multi-line pattern with proper indentation and alignment
     * Requirement 5.1, 5.2, 5.3, 5.4
     */
    public formatMultiLinePattern(pattern: MultiLinePatternNode, document: TextDocument): TextEdit[] {
        const edits: TextEdit[] = [];
        
        if (!this.settings.indentMultiLinePatterns) {
            return edits;
        }

        // Get the base indentation level from the pattern's context
        const baseIndentLevel = this.getBaseIndentationLevel(pattern, document);
        
        // Format nested levels within the pattern
        const nestedEdits = this.indentNestedLevels(pattern, document);
        edits.push(...nestedEdits);
        
        // Align closing parentheses if enabled
        if (this.settings.alignClosingParentheses) {
            const alignmentEdits = this.alignClosingParentheses(pattern, document);
            edits.push(...alignmentEdits);
        }
        
        // Format the pattern content with proper spacing
        const contentEdits = this.formatMultiLinePatternContent(pattern, document, baseIndentLevel);
        edits.push(...contentEdits);
        
        return edits;
    }

    /**
     * Align closing parentheses with their opening counterparts
     * Requirement 5.2
     */
    public alignClosingParentheses(pattern: MultiLinePatternNode, document: TextDocument): TextEdit[] {
        const edits: TextEdit[] = [];
        
        if (!pattern.parenthesesRanges || pattern.parenthesesRanges.length === 0) {
            return edits;
        }
        
        // Process each parentheses pair
        for (let i = 0; i < pattern.parenthesesRanges.length; i += 2) {
            if (i + 1 >= pattern.parenthesesRanges.length) break;
            
            const openRange = pattern.parenthesesRanges[i];
            const closeRange = pattern.parenthesesRanges[i + 1];
            
            // Only align if closing parenthesis is on a different line
            if (openRange.start.line !== closeRange.start.line) {
                const openLineText = document.getText({
                    start: { line: openRange.start.line, character: 0 },
                    end: { line: openRange.start.line + 1, character: 0 }
                });
                
                // Calculate the indentation needed for the closing parenthesis
                const openIndentation = this.getLineIndentation(openLineText);
                const targetIndentation = this.getIndentation(this.getIndentationLevel(openIndentation) + 1);
                
                // Get current closing line
                const closeLineText = document.getText({
                    start: { line: closeRange.start.line, character: 0 },
                    end: { line: closeRange.start.line + 1, character: 0 }
                });
                
                const currentIndentation = this.getLineIndentation(closeLineText);
                
                // Only add edit if indentation needs to change
                if (currentIndentation !== openIndentation) {
                    const closeLineContent = closeLineText.trim();
                    edits.push({
                        range: {
                            start: { line: closeRange.start.line, character: 0 },
                            end: { line: closeRange.start.line, character: closeLineText.length - closeLineContent.length }
                        },
                        newText: openIndentation
                    });
                }
            }
        }
        
        return edits;
    }

    /**
     * Create formatting rules for nested levels within multi-line patterns
     * Requirement 5.3
     */
    public indentNestedLevels(pattern: MultiLinePatternNode, document: TextDocument): TextEdit[] {
        const edits: TextEdit[] = [];
        
        // Get base indentation level
        const baseIndentLevel = this.getBaseIndentationLevel(pattern, document);
        
        // Process each line within the pattern
        for (let lineNum = pattern.range.start.line; lineNum <= pattern.range.end.line; lineNum++) {
            const lineText = document.getText({
                start: { line: lineNum, character: 0 },
                end: { line: lineNum + 1, character: 0 }
            });
            
            const trimmedLine = lineText.trim();
            
            // Skip empty lines and comments
            if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
                continue;
            }
            
            // Calculate required indentation level for this line
            const requiredIndentLevel = this.calculateRequiredIndentLevel(
                lineNum, 
                pattern, 
                document, 
                baseIndentLevel
            );
            
            const requiredIndentation = this.getIndentation(requiredIndentLevel);
            const currentIndentation = this.getLineIndentation(lineText);
            
            // Add edit if indentation needs to change
            if (currentIndentation !== requiredIndentation) {
                edits.push({
                    range: {
                        start: { line: lineNum, character: 0 },
                        end: { line: lineNum, character: currentIndentation.length }
                    },
                    newText: requiredIndentation
                });
            }
        }
        
        // Process nested patterns recursively
        for (const nestedPattern of pattern.nestedPatterns) {
            const nestedEdits = this.indentNestedLevels(nestedPattern, document);
            edits.push(...nestedEdits);
        }
        
        return edits;
    }

    /**
     * Format the content within a multi-line pattern
     */
    private formatMultiLinePatternContent(pattern: MultiLinePatternNode, document: TextDocument, baseIndentLevel: number): TextEdit[] {
        const edits: TextEdit[] = [];
        
        // Format each line within the pattern
        for (let lineNum = pattern.range.start.line; lineNum <= pattern.range.end.line; lineNum++) {
            const lineRange: Range = {
                start: { line: lineNum, character: 0 },
                end: { line: lineNum + 1, character: 0 }
            };
            
            const lineText = document.getText(lineRange);
            const trimmedLine = lineText.trim();
            
            // Skip empty lines
            if (trimmedLine === '') {
                continue;
            }
            
            // Format the line content
            const formattedContent = this.formatLineContent(trimmedLine);
            
            // Calculate indentation
            const indentLevel = this.calculateRequiredIndentLevel(lineNum, pattern, document, baseIndentLevel);
            const indentation = this.getIndentation(indentLevel);
            
            const newLineText = indentation + formattedContent + '\n';
            
            // Add edit if line needs formatting
            if (lineText !== newLineText) {
                edits.push({
                    range: lineRange,
                    newText: newLineText
                });
            }
        }
        
        return edits;
    }

    /**
     * Get the base indentation level for a multi-line pattern
     */
    private getBaseIndentationLevel(pattern: MultiLinePatternNode, document: TextDocument): number {
        const startLineText = document.getText({
            start: { line: pattern.range.start.line, character: 0 },
            end: { line: pattern.range.start.line + 1, character: 0 }
        });
        
        const indentation = this.getLineIndentation(startLineText);
        return this.getIndentationLevel(indentation);
    }

    /**
     * Calculate the required indentation level for a line within a multi-line pattern
     */
    private calculateRequiredIndentLevel(
        lineNum: number, 
        pattern: MultiLinePatternNode, 
        document: TextDocument, 
        baseIndentLevel: number
    ): number {
        const lineText = document.getText({
            start: { line: lineNum, character: 0 },
            end: { line: lineNum + 1, character: 0 }
        });
        
        const trimmedLine = lineText.trim();
        
        // First line of pattern (contains the keyword like 'exists(')
        if (lineNum === pattern.range.start.line) {
            return baseIndentLevel;
        }
        
        // Last line of pattern (usually just closing parenthesis)
        if (lineNum === pattern.range.end.line && trimmedLine === ')') {
            return baseIndentLevel;
        }
        
        // Lines within the pattern should be indented one level more
        let indentLevel = baseIndentLevel + 1;
        
        // Check for additional nesting based on parentheses
        const additionalNesting = this.calculateAdditionalNesting(lineNum, pattern, document);
        indentLevel += additionalNesting;
        
        return indentLevel;
    }

    /**
     * Calculate additional nesting level based on parentheses depth
     */
    private calculateAdditionalNesting(lineNum: number, pattern: MultiLinePatternNode, document: TextDocument): number {
        let nesting = 0;
        
        // Count unclosed parentheses up to this line
        for (let i = pattern.range.start.line; i < lineNum; i++) {
            const lineText = document.getText({
                start: { line: i, character: 0 },
                end: { line: i + 1, character: 0 }
            });
            
            const openCount = (lineText.match(/\(/g) || []).length;
            const closeCount = (lineText.match(/\)/g) || []).length;
            nesting += openCount - closeCount;
        }
        
        return Math.max(0, nesting - 1); // Subtract 1 because the main pattern parenthesis is already accounted for
    }

    /**
     * Get the indentation string from a line
     */
    private getLineIndentation(line: string): string {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    }

    /**
     * Get the indentation level from an indentation string
     */
    private getIndentationLevel(indentation: string): number {
        if (this.settings.insertSpaces) {
            return Math.floor(indentation.length / this.settings.indentSize);
        } else {
            return indentation.length; // Each tab is one level
        }
    }
}