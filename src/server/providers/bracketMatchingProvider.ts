import {
    Position,
    Range,
    Hover,
    MarkupContent,
    MarkupKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST, MultiLinePatternNode, ConditionNode, ParenthesesTracker } from '../parser/ast';
import { ParseResult } from '../parser/droolsParser';

export interface BracketPair {
    open: Position;
    close: Position;
    type: 'parentheses' | 'braces' | 'brackets';
    isMultiLine: boolean;
    patternType?: string;
}

export interface BracketMatchingSettings {
    enableBracketMatching: boolean;
    enableHoverSupport: boolean;
    enableVisualIndicators: boolean;
    maxSearchDistance: number;
}

export class DroolsBracketMatchingProvider {
    private settings: BracketMatchingSettings;

    constructor(settings: Partial<BracketMatchingSettings> = {}) {
        this.settings = {
            enableBracketMatching: true,
            enableHoverSupport: true,
            enableVisualIndicators: true,
            maxSearchDistance: 1000,
            ...settings
        };
    }

    /**
     * Find matching bracket for the given position
     */
    public findMatchingBracket(
        document: TextDocument,
        position: Position,
        parseResult: ParseResult
    ): BracketPair | null {
        if (!this.settings.enableBracketMatching) {
            return null;
        }

        try {
            const text = document.getText();
            const offset = document.offsetAt(position);
            const char = text[offset];

            // Check if we're at a bracket character
            if (!this.isBracketCharacter(char)) {
                return null;
            }

            // Use AST information for better bracket matching in multi-line patterns
            const bracketPair = this.findBracketPairFromAST(position, parseResult.ast);
            if (bracketPair) {
                return bracketPair;
            }

            // Fallback to text-based bracket matching
            return this.findBracketPairFromText(document, position, char);
        } catch (error) {
            console.error('Error finding matching bracket:', error);
            return null;
        }
    }

    /**
     * Provide hover information for bracket pairs
     */
    public provideBracketHover(
        document: TextDocument,
        position: Position,
        parseResult: ParseResult
    ): Hover | null {
        if (!this.settings.enableHoverSupport) {
            return null;
        }

        try {
            const bracketPair = this.findMatchingBracket(document, position, parseResult);
            if (!bracketPair) {
                return null;
            }

            const hoverContent = this.createBracketHoverContent(bracketPair, document, parseResult);
            if (!hoverContent) {
                return null;
            }

            return {
                contents: hoverContent,
                range: {
                    start: position,
                    end: { line: position.line, character: position.character + 1 }
                }
            };
        } catch (error) {
            console.error('Error providing bracket hover:', error);
            return null;
        }
    }

    /**
     * Get all bracket pairs in the document for visual indicators
     */
    public getAllBracketPairs(
        document: TextDocument,
        parseResult: ParseResult
    ): BracketPair[] {
        if (!this.settings.enableVisualIndicators) {
            return [];
        }

        try {
            const bracketPairs: BracketPair[] = [];

            // Extract bracket pairs from multi-line patterns in AST
            if (parseResult.ast) {
                this.extractBracketPairsFromAST(parseResult.ast, bracketPairs);
            }

            // Add additional bracket pairs from text analysis
            this.extractBracketPairsFromText(document, bracketPairs);

            return bracketPairs;
        } catch (error) {
            console.error('Error getting all bracket pairs:', error);
            return [];
        }
    }

    private isBracketCharacter(char: string): boolean {
        return ['(', ')', '[', ']', '{', '}'].includes(char);
    }

    private findBracketPairFromAST(position: Position, ast: DroolsAST): BracketPair | null {
        // Search through multi-line patterns first
        for (const rule of ast.rules) {
            if (rule.when) {
                for (const condition of rule.when.conditions) {
                    const bracketPair = this.findBracketInCondition(position, condition);
                    if (bracketPair) {
                        return bracketPair;
                    }
                }
            }
        }

        return null;
    }

    private findBracketInCondition(position: Position, condition: ConditionNode): BracketPair | null {
        // Check if position is within this condition's range
        if (!this.isPositionInRange(position, condition.range)) {
            return null;
        }

        // Check multi-line pattern brackets
        if (condition.multiLinePattern) {
            const bracketPair = this.findBracketInMultiLinePattern(position, condition.multiLinePattern);
            if (bracketPair) {
                return bracketPair;
            }
        }

        // Check parentheses ranges in the condition
        if (condition.parenthesesRanges) {
            for (const range of condition.parenthesesRanges) {
                if (this.isPositionAtRangeStart(position, range)) {
                    // Find matching closing bracket
                    const matchingClose = this.findMatchingCloseInRanges(range.start, condition.parenthesesRanges);
                    if (matchingClose) {
                        return {
                            open: range.start,
                            close: matchingClose,
                            type: 'parentheses',
                            isMultiLine: range.start.line !== matchingClose.line,
                            patternType: condition.conditionType
                        };
                    }
                } else if (this.isPositionAtRangeStart(position, { start: range.end, end: range.end })) {
                    // Find matching opening bracket
                    const matchingOpen = this.findMatchingOpenInRanges(range.end, condition.parenthesesRanges);
                    if (matchingOpen) {
                        return {
                            open: matchingOpen,
                            close: range.end,
                            type: 'parentheses',
                            isMultiLine: matchingOpen.line !== range.end.line,
                            patternType: condition.conditionType
                        };
                    }
                }
            }
        }

        // Check nested conditions
        if (condition.nestedConditions) {
            for (const nestedCondition of condition.nestedConditions) {
                const bracketPair = this.findBracketInCondition(position, nestedCondition);
                if (bracketPair) {
                    return bracketPair;
                }
            }
        }

        return null;
    }

    private findBracketInMultiLinePattern(position: Position, pattern: MultiLinePatternNode): BracketPair | null {
        // Check if position is within this pattern's range
        if (!this.isPositionInRange(position, pattern.range)) {
            return null;
        }

        // Check parentheses ranges in the pattern
        for (const range of pattern.parenthesesRanges) {
            if (this.isPositionAtRangeStart(position, range)) {
                // Find matching closing bracket
                const matchingClose = this.findMatchingCloseInRanges(range.start, pattern.parenthesesRanges);
                if (matchingClose) {
                    return {
                        open: range.start,
                        close: matchingClose,
                        type: 'parentheses',
                        isMultiLine: range.start.line !== matchingClose.line,
                        patternType: pattern.patternType
                    };
                }
            } else if (this.isPositionAtRangeStart(position, { start: range.end, end: range.end })) {
                // Find matching opening bracket
                const matchingOpen = this.findMatchingOpenInRanges(range.end, pattern.parenthesesRanges);
                if (matchingOpen) {
                    return {
                        open: matchingOpen,
                        close: range.end,
                        type: 'parentheses',
                        isMultiLine: matchingOpen.line !== range.end.line,
                        patternType: pattern.patternType
                    };
                }
            }
        }

        // Check nested patterns
        for (const nestedPattern of pattern.nestedPatterns) {
            const bracketPair = this.findBracketInMultiLinePattern(position, nestedPattern);
            if (bracketPair) {
                return bracketPair;
            }
        }

        return null;
    }

    private findBracketPairFromText(document: TextDocument, position: Position, char: string): BracketPair | null {
        const text = document.getText();
        const offset = document.offsetAt(position);

        if (['(', '[', '{'].includes(char)) {
            // Find matching closing bracket
            const matchingClose = this.findMatchingCloseBracket(text, offset, char);
            if (matchingClose !== -1) {
                const closePosition = document.positionAt(matchingClose);
                return {
                    open: position,
                    close: closePosition,
                    type: this.getBracketType(char),
                    isMultiLine: position.line !== closePosition.line
                };
            }
        } else if ([')', ']', '}'].includes(char)) {
            // Find matching opening bracket
            const matchingOpen = this.findMatchingOpenBracket(text, offset, char);
            if (matchingOpen !== -1) {
                const openPosition = document.positionAt(matchingOpen);
                return {
                    open: openPosition,
                    close: position,
                    type: this.getBracketType(char),
                    isMultiLine: openPosition.line !== position.line
                };
            }
        }

        return null;
    }

    private findMatchingCloseBracket(text: string, startOffset: number, openChar: string): number {
        const closeChar = this.getMatchingBracket(openChar);
        let depth = 1;
        let inStringLiteral = false;
        let escapeNext = false;

        for (let i = startOffset + 1; i < text.length && i < startOffset + this.settings.maxSearchDistance; i++) {
            const char = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                continue;
            }

            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                continue;
            }

            if (!inStringLiteral) {
                if (char === openChar) {
                    depth++;
                } else if (char === closeChar) {
                    depth--;
                    if (depth === 0) {
                        return i;
                    }
                }
            }
        }

        return -1;
    }

    private findMatchingOpenBracket(text: string, startOffset: number, closeChar: string): number {
        const openChar = this.getMatchingBracket(closeChar);
        let depth = 1;
        let inStringLiteral = false;
        let escapeNext = false;

        for (let i = startOffset - 1; i >= 0 && i > startOffset - this.settings.maxSearchDistance; i--) {
            const char = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                continue;
            }

            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                continue;
            }

            if (!inStringLiteral) {
                if (char === closeChar) {
                    depth++;
                } else if (char === openChar) {
                    depth--;
                    if (depth === 0) {
                        return i;
                    }
                }
            }
        }

        return -1;
    }

    private getMatchingBracket(bracket: string): string {
        const pairs: { [key: string]: string } = {
            '(': ')',
            ')': '(',
            '[': ']',
            ']': '[',
            '{': '}',
            '}': '{'
        };
        return pairs[bracket] || '';
    }

    private getBracketType(bracket: string): 'parentheses' | 'braces' | 'brackets' {
        if (['(', ')'].includes(bracket)) {return 'parentheses';}
        if (['{', '}'].includes(bracket)) {return 'braces';}
        if (['[', ']'].includes(bracket)) {return 'brackets';}
        return 'parentheses';
    }

    private isPositionInRange(position: Position, range: Range): boolean {
        return (
            (position.line > range.start.line || 
             (position.line === range.start.line && position.character >= range.start.character)) &&
            (position.line < range.end.line || 
             (position.line === range.end.line && position.character <= range.end.character))
        );
    }

    private isPositionAtRangeStart(position: Position, range: Range): boolean {
        return position.line === range.start.line && position.character === range.start.character;
    }

    private findMatchingCloseInRanges(openPos: Position, ranges: Range[]): Position | null {
        // Simple implementation - in a real scenario, this would need more sophisticated matching
        for (const range of ranges) {
            if (range.start.line === openPos.line && range.start.character === openPos.character) {
                return range.end;
            }
        }
        return null;
    }

    private findMatchingOpenInRanges(closePos: Position, ranges: Range[]): Position | null {
        // Simple implementation - in a real scenario, this would need more sophisticated matching
        for (const range of ranges) {
            if (range.end.line === closePos.line && range.end.character === closePos.character) {
                return range.start;
            }
        }
        return null;
    }

    private createBracketHoverContent(
        bracketPair: BracketPair,
        document: TextDocument,
        parseResult: ParseResult
    ): MarkupContent | null {
        const content: string[] = [];

        // Add bracket pair information
        content.push(`**Bracket Pair**: ${bracketPair.type}`);
        
        if (bracketPair.isMultiLine) {
            content.push(`**Multi-line**: Lines ${bracketPair.open.line + 1} - ${bracketPair.close.line + 1}`);
        }

        if (bracketPair.patternType) {
            content.push(`**Pattern Type**: ${bracketPair.patternType}`);
        }

        // Add position information
        content.push(`**Opening**: Line ${bracketPair.open.line + 1}, Column ${bracketPair.open.character + 1}`);
        content.push(`**Closing**: Line ${bracketPair.close.line + 1}, Column ${bracketPair.close.character + 1}`);

        // Add content preview for multi-line patterns
        if (bracketPair.isMultiLine) {
            const startLine = Math.max(0, bracketPair.open.line);
            const endLine = Math.min(document.lineCount - 1, bracketPair.close.line);
            const previewLines: string[] = [];
            
            for (let i = startLine; i <= endLine && previewLines.length < 5; i++) {
                const line = document.getText({
                    start: { line: i, character: 0 },
                    end: { line: i, character: Number.MAX_SAFE_INTEGER }
                }).trim();
                if (line) {
                    previewLines.push(line);
                }
            }
            
            if (previewLines.length > 0) {
                content.push('', '**Content Preview**:');
                content.push('```drools');
                content.push(...previewLines);
                if (endLine - startLine + 1 > 5) {
                    content.push('...');
                }
                content.push('```');
            }
        }

        return {
            kind: MarkupKind.Markdown,
            value: content.join('\n')
        };
    }

    private extractBracketPairsFromAST(ast: DroolsAST, bracketPairs: BracketPair[]): void {
        // Extract from rules
        for (const rule of ast.rules) {
            if (rule.when) {
                for (const condition of rule.when.conditions) {
                    this.extractBracketPairsFromCondition(condition, bracketPairs);
                }
            }
        }
    }

    private extractBracketPairsFromCondition(condition: ConditionNode, bracketPairs: BracketPair[]): void {
        // Extract from multi-line patterns
        if (condition.multiLinePattern) {
            this.extractBracketPairsFromMultiLinePattern(condition.multiLinePattern, bracketPairs);
        }

        // Extract from parentheses ranges
        if (condition.parenthesesRanges) {
            for (let i = 0; i < condition.parenthesesRanges.length; i += 2) {
                if (i + 1 < condition.parenthesesRanges.length) {
                    const openRange = condition.parenthesesRanges[i];
                    const closeRange = condition.parenthesesRanges[i + 1];
                    
                    bracketPairs.push({
                        open: openRange.start,
                        close: closeRange.start,
                        type: 'parentheses',
                        isMultiLine: openRange.start.line !== closeRange.start.line,
                        patternType: condition.conditionType
                    });
                }
            }
        }

        // Extract from nested conditions
        if (condition.nestedConditions) {
            for (const nestedCondition of condition.nestedConditions) {
                this.extractBracketPairsFromCondition(nestedCondition, bracketPairs);
            }
        }
    }

    private extractBracketPairsFromMultiLinePattern(pattern: MultiLinePatternNode, bracketPairs: BracketPair[]): void {
        // Extract from parentheses ranges
        for (let i = 0; i < pattern.parenthesesRanges.length; i += 2) {
            if (i + 1 < pattern.parenthesesRanges.length) {
                const openRange = pattern.parenthesesRanges[i];
                const closeRange = pattern.parenthesesRanges[i + 1];
                
                bracketPairs.push({
                    open: openRange.start,
                    close: closeRange.start,
                    type: 'parentheses',
                    isMultiLine: openRange.start.line !== closeRange.start.line,
                    patternType: pattern.patternType
                });
            }
        }

        // Extract from nested patterns
        for (const nestedPattern of pattern.nestedPatterns) {
            this.extractBracketPairsFromMultiLinePattern(nestedPattern, bracketPairs);
        }
    }

    private extractBracketPairsFromText(document: TextDocument, bracketPairs: BracketPair[]): void {
        const text = document.getText();
        const stack: Array<{ char: string; position: Position }> = [];

        let inStringLiteral = false;
        let escapeNext = false;
        let line = 0;
        let character = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '\n') {
                line++;
                character = 0;
                continue;
            }

            if (escapeNext) {
                escapeNext = false;
                character++;
                continue;
            }

            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                character++;
                continue;
            }

            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                character++;
                continue;
            }

            if (!inStringLiteral && this.isBracketCharacter(char)) {
                const position: Position = { line, character };

                if (['(', '[', '{'].includes(char)) {
                    stack.push({ char, position });
                } else if ([')', ']', '}'].includes(char)) {
                    const matchingOpen = this.getMatchingBracket(char);
                    
                    // Find matching opening bracket in stack
                    for (let j = stack.length - 1; j >= 0; j--) {
                        if (stack[j].char === matchingOpen) {
                            const openItem = stack.splice(j, 1)[0];
                            
                            bracketPairs.push({
                                open: openItem.position,
                                close: position,
                                type: this.getBracketType(char),
                                isMultiLine: openItem.position.line !== position.line
                            });
                            break;
                        }
                    }
                }
            }

            character++;
        }
    }
}