"use strict";
/**
 * Drools document formatting provider
 * Handles document formatting, range formatting, and format-on-save functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DroolsFormattingProvider = void 0;
class DroolsFormattingProvider {
    constructor(settings = {}) {
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
            ...settings
        };
    }
    /**
     * Format entire document
     */
    formatDocument(document, options, parseResult) {
        // Update settings from formatting options
        this.updateSettingsFromOptions(options);
        const fullRange = {
            start: { line: 0, character: 0 },
            end: { line: document.lineCount - 1, character: document.getText().split('\n').pop()?.length || 0 }
        };
        return this.formatRange(document, fullRange, parseResult);
    }
    /**
     * Format selected range
     */
    formatRange(document, range, parseResult) {
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
    formatLines(lines, ast, startLine) {
        const formattedLines = [];
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
                }
                else if (contextInfo.blockType === 'function') {
                    inFunctionBlock = true;
                    currentIndentLevel = 0;
                }
                else if (contextInfo.blockType === 'when') {
                    inWhenBlock = true;
                    currentIndentLevel = 1;
                }
                else if (contextInfo.blockType === 'then') {
                    inThenBlock = true;
                    inWhenBlock = false;
                    currentIndentLevel = 1;
                }
            }
            else if (contextInfo.isBlockEnd) {
                if (trimmedLine === 'end') {
                    inRuleBlock = false;
                    inWhenBlock = false;
                    inThenBlock = false;
                    currentIndentLevel = 0;
                }
                else if (trimmedLine.includes('}')) {
                    if (inFunctionBlock) {
                        inFunctionBlock = false;
                        currentIndentLevel = 0;
                    }
                    else {
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
            }
            else if (contextInfo.decreasesIndent) {
                currentIndentLevel = Math.max(0, currentIndentLevel - 1);
            }
        }
        return formattedLines;
    }
    /**
     * Analyze line context to determine formatting rules
     */
    analyzeLineContext(line, ast, lineNumber) {
        const result = {
            isBlockStart: false,
            isBlockEnd: false,
            blockType: undefined,
            increasesIndent: false,
            decreasesIndent: false
        };
        // Check for block starts
        if (line.startsWith('rule ')) {
            result.isBlockStart = true;
            result.blockType = 'rule';
        }
        else if (line.startsWith('function ')) {
            result.isBlockStart = true;
            result.blockType = 'function';
        }
        else if (line === 'when') {
            result.isBlockStart = true;
            result.blockType = 'when';
        }
        else if (line === 'then') {
            result.isBlockStart = true;
            result.blockType = 'then';
        }
        else if (line.startsWith('query ')) {
            result.isBlockStart = true;
            result.blockType = 'query';
        }
        else if (line.startsWith('declare ')) {
            result.isBlockStart = true;
            result.blockType = 'declare';
        }
        // Check for block ends
        if (line === 'end') {
            result.isBlockEnd = true;
        }
        else if (line.includes('}')) {
            result.isBlockEnd = true;
        }
        // Check for indentation changes
        if (line.includes('{') && !line.includes('}')) {
            result.increasesIndent = true;
        }
        else if (line.includes('}') && !line.includes('{')) {
            result.decreasesIndent = true;
        }
        return result;
    }
    /**
     * Format line content with proper spacing
     */
    formatLineContent(line) {
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
    getIndentation(level) {
        const indentChar = this.settings.insertSpaces ? ' ' : '\t';
        const indentSize = this.settings.insertSpaces ? this.settings.indentSize : 1;
        return indentChar.repeat(level * indentSize);
    }
    /**
     * Apply final formatting rules
     */
    applyFinalFormatting(text) {
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
    updateSettingsFromOptions(options) {
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
    isPositionInNode(position, node) {
        return position.line >= node.range.start.line &&
            position.line <= node.range.end.line &&
            (position.line !== node.range.start.line || position.character >= node.range.start.character) &&
            (position.line !== node.range.end.line || position.character <= node.range.end.character);
    }
    /**
     * Find the AST node at a specific position
     */
    findNodeAtPosition(position, ast) {
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
}
exports.DroolsFormattingProvider = DroolsFormattingProvider;
//# sourceMappingURL=formattingProvider.js.map