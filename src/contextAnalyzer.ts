import * as vscode from 'vscode';

export enum RuleContext {
    RULE_HEADER = 'rule-header',
    WHEN_CLAUSE = 'when-clause',
    THEN_CLAUSE = 'then-clause',
    GLOBAL = 'global',
    FUNCTION = 'function',
    IMPORT = 'import',
    PACKAGE = 'package',
    QUERY = 'query',
    UNKNOWN = 'unknown'
}

export interface RuleStructure {
    ruleStart: number;
    whenStart: number;
    thenStart: number;
    ruleEnd: number;
    ruleName?: string;
    attributes?: string[];
}

/**
 * Advanced context analyzer for Drools rule structure detection
 * Provides accurate context detection for intelligent snippet completion
 */
export class ContextAnalyzer {
    private static readonly RULE_KEYWORDS = ['rule', 'when', 'then', 'end'];
    private static readonly GLOBAL_KEYWORDS = ['global', 'import', 'package', 'function', 'query'];
    
    /**
     * Analyze the context at a given position in the document
     */
    public analyzeContext(document: vscode.TextDocument, position: vscode.Position): RuleContext {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // Check for global-level contexts first
        const globalContext = this.checkGlobalContext(text, offset);
        if (globalContext !== RuleContext.UNKNOWN) {
            return globalContext;
        }
        
        // Find the current rule structure
        const ruleStructure = this.findRuleStructure(text, offset);
        if (!ruleStructure) {
            return RuleContext.UNKNOWN;
        }
        
        // Determine position within rule structure
        return this.determineRuleContext(offset, ruleStructure);
    }

    /**
     * Check if position is in then clause specifically
     */
    public isInThenClause(document: vscode.TextDocument, position: vscode.Position): boolean {
        return this.analyzeContext(document, position) === RuleContext.THEN_CLAUSE;
    }

    /**
     * Get the indentation level at the current position
     */
    public getIndentationLevel(document: vscode.TextDocument, position: vscode.Position): number {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        
        let indentLevel = 0;
        for (let i = 0; i < lineText.length; i++) {
            if (lineText[i] === ' ') {
                indentLevel++;
            } else if (lineText[i] === '\t') {
                indentLevel += 4; // Assume tab = 4 spaces
            } else {
                break;
            }
        }
        
        return indentLevel;
    }

    /**
     * Find the rule structure containing the given offset
     */
    public findRuleStructure(text: string, offset: number): RuleStructure | null {
        const lines = text.split('\n');
        let currentOffset = 0;
        let ruleStructure: Partial<RuleStructure> = {};
        let inRule = false;
        let braceDepth = 0;
        let parenDepth = 0;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineStart = currentOffset;
            const lineEnd = currentOffset + line.length;
            
            // Parse line for rule structure
            const trimmedLine = line.trim();
            
            // Track brace and parenthesis depth for accurate parsing
            for (const char of line) {
                if (char === '{') braceDepth++;
                else if (char === '}') braceDepth--;
                else if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;
            }
            
            // Check for rule start
            if (trimmedLine.startsWith('rule ') && braceDepth === 0 && parenDepth === 0) {
                if (inRule && ruleStructure.ruleStart !== undefined) {
                    // Previous rule ended, check if offset was in it
                    if (offset < lineStart) {
                        return this.completeRuleStructure(ruleStructure);
                    }
                }
                
                // Start new rule
                inRule = true;
                ruleStructure = {
                    ruleStart: lineStart,
                    ruleName: this.extractRuleName(trimmedLine)
                };
            }
            
            // Check for when clause
            else if (trimmedLine === 'when' && inRule && braceDepth === 0 && parenDepth === 0) {
                ruleStructure.whenStart = lineStart;
            }
            
            // Check for then clause
            else if (trimmedLine === 'then' && inRule && braceDepth === 0 && parenDepth === 0) {
                ruleStructure.thenStart = lineStart;
            }
            
            // Check for rule end
            else if (trimmedLine === 'end' && inRule && braceDepth === 0 && parenDepth === 0) {
                ruleStructure.ruleEnd = lineEnd;
                
                // Check if offset is within this rule
                if (offset >= (ruleStructure.ruleStart || 0) && offset <= lineEnd) {
                    return this.completeRuleStructure(ruleStructure);
                }
                
                // Reset for next rule
                inRule = false;
                ruleStructure = {};
            }
            
            currentOffset = lineEnd + 1; // +1 for newline
        }
        
        // Handle case where we're at end of file in a rule
        if (inRule && offset >= (ruleStructure.ruleStart || 0)) {
            return this.completeRuleStructure(ruleStructure);
        }
        
        return null;
    }

    /**
     * Check for global-level contexts (package, import, global, function, query)
     */
    private checkGlobalContext(text: string, offset: number): RuleContext {
        const beforeOffset = text.substring(0, offset);
        const lines = beforeOffset.split('\n');
        
        // Check current and previous lines for global contexts
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
            const line = lines[i].trim();
            
            if (line.startsWith('package ')) {
                return RuleContext.PACKAGE;
            }
            if (line.startsWith('import ')) {
                return RuleContext.IMPORT;
            }
            if (line.startsWith('global ')) {
                return RuleContext.GLOBAL;
            }
            if (line.startsWith('function ')) {
                return RuleContext.FUNCTION;
            }
            if (line.startsWith('query ')) {
                return RuleContext.QUERY;
            }
            
            // Stop if we hit a rule or other major structure
            if (line.startsWith('rule ') || line === 'end') {
                break;
            }
        }
        
        return RuleContext.UNKNOWN;
    }

    /**
     * Determine the specific context within a rule structure
     */
    private determineRuleContext(offset: number, ruleStructure: RuleStructure): RuleContext {
        // Check if we're in the then clause
        if (ruleStructure.thenStart < Number.MAX_SAFE_INTEGER && offset >= ruleStructure.thenStart) {
            if (ruleStructure.ruleEnd === Number.MAX_SAFE_INTEGER || offset < ruleStructure.ruleEnd) {
                return RuleContext.THEN_CLAUSE;
            }
        }
        
        // Check if we're in the when clause
        if (ruleStructure.whenStart < Number.MAX_SAFE_INTEGER && offset >= ruleStructure.whenStart) {
            if (ruleStructure.thenStart === Number.MAX_SAFE_INTEGER || offset < ruleStructure.thenStart) {
                return RuleContext.WHEN_CLAUSE;
            }
        }
        
        // Check if we're in the rule header (between rule start and when)
        if (offset >= ruleStructure.ruleStart) {
            if (ruleStructure.whenStart === Number.MAX_SAFE_INTEGER || offset < ruleStructure.whenStart) {
                return RuleContext.RULE_HEADER;
            }
        }
        
        return RuleContext.UNKNOWN;
    }

    /**
     * Complete a partial rule structure with defaults
     */
    private completeRuleStructure(partial: Partial<RuleStructure>): RuleStructure {
        return {
            ruleStart: partial.ruleStart || 0,
            whenStart: partial.whenStart || Number.MAX_SAFE_INTEGER,
            thenStart: partial.thenStart || Number.MAX_SAFE_INTEGER,
            ruleEnd: partial.ruleEnd || Number.MAX_SAFE_INTEGER,
            ruleName: partial.ruleName,
            attributes: partial.attributes
        };
    }

    /**
     * Extract rule name from rule declaration line
     */
    private extractRuleName(ruleLine: string): string | undefined {
        const match = ruleLine.match(/rule\s+"([^"]+)"/);
        if (match) {
            return match[1];
        }
        
        // Try without quotes
        const match2 = ruleLine.match(/rule\s+(\w+)/);
        if (match2) {
            return match2[1];
        }
        
        return undefined;
    }

    /**
     * Get all rule structures in the document
     */
    public getAllRuleStructures(document: vscode.TextDocument): RuleStructure[] {
        const text = document.getText();
        const structures: RuleStructure[] = [];
        const lines = text.split('\n');
        let currentOffset = 0;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const trimmedLine = line.trim();
            
            // Look for rule starts
            if (trimmedLine.startsWith('rule ')) {
                const structure = this.findRuleStructure(text, currentOffset);
                if (structure) {
                    structures.push(structure);
                    
                    // Skip to after this rule
                    if (structure.ruleEnd < Number.MAX_SAFE_INTEGER) {
                        // Find the line containing the rule end
                        let skipOffset = 0;
                        const skipLines = text.split('\n');
                        for (let i = 0; i < skipLines.length; i++) {
                            if (skipOffset >= structure.ruleEnd) {
                                lineIndex = i;
                                currentOffset = skipOffset;
                                break;
                            }
                            skipOffset += skipLines[i].length + 1;
                        }
                    }
                }
            }
            
            currentOffset += line.length + 1; // +1 for newline
        }
        
        return structures;
    }

    /**
     * Check if a position is within a specific rule context with additional validation
     */
    public isInContextWithValidation(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        expectedContext: RuleContext
    ): boolean {
        const actualContext = this.analyzeContext(document, position);
        
        if (actualContext !== expectedContext) {
            return false;
        }
        
        // Additional validation for then clause
        if (expectedContext === RuleContext.THEN_CLAUSE) {
            return this.validateThenClauseContext(document, position);
        }
        
        return true;
    }

    /**
     * Validate that we're actually in a then clause and not in a comment or string
     */
    private validateThenClauseContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const charIndex = position.character;
        
        // Check if we're in a comment
        const commentIndex = lineText.indexOf('//');
        if (commentIndex !== -1 && charIndex > commentIndex) {
            return false;
        }
        
        // Check if we're in a multi-line comment
        const text = document.getText();
        const offset = document.offsetAt(position);
        const beforeOffset = text.substring(0, offset);
        
        let inMultiLineComment = false;
        let lastCommentStart = beforeOffset.lastIndexOf('/*');
        let lastCommentEnd = beforeOffset.lastIndexOf('*/');
        
        if (lastCommentStart > lastCommentEnd) {
            inMultiLineComment = true;
        }
        
        if (inMultiLineComment) {
            return false;
        }
        
        // Check if we're in a string literal
        const beforeChar = lineText.substring(0, charIndex);
        const singleQuotes = (beforeChar.match(/'/g) || []).length;
        const doubleQuotes = (beforeChar.match(/"/g) || []).length;
        
        if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1) {
            return false; // Inside string literal
        }
        
        return true;
    }
}