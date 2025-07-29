/**
 * Drools language parser implementation
 */

import {
    DroolsAST,
    PackageNode,
    ImportNode,
    GlobalNode,
    FunctionNode,
    ParameterNode,
    RuleNode,
    RuleAttributeNode,
    WhenNode,
    ThenNode,
    ConditionNode,
    ConstraintNode,
    QueryNode,
    DeclareNode,
    FieldNode,
    Position,
    Range,
    AnyASTNode,
    MultiLinePatternNode,
    MultiLinePatternMetadata,
    ParenthesesTracker,
    ParsingContext
} from './ast';

export interface ParseError {
    message: string;
    range: Range;
    severity: 'error' | 'warning';
}

export interface ParseResult {
    ast: DroolsAST;
    errors: ParseError[];
}

export interface IncrementalParseOptions {
    ranges?: { start: number; end: number }[];
    previousAST?: DroolsAST;
    enableIncrementalParsing?: boolean;
    performanceManager?: import('../performance/performanceManager').PerformanceManager;
    documentUri?: string;
}

export class DroolsParser {
    private text: string = '';
    private lines: string[] = [];
    private currentLine: number = 0;
    private currentChar: number = 0;
    private errors: ParseError[] = [];
    private recoveryMode: boolean = false;
    private maxErrors: number = 100;
    private parseStartTime: number = 0;
    
    // Multi-line pattern tracking properties
    private parsingContext: ParsingContext = {
        parenthesesDepth: 0,
        currentPattern: undefined,
        lineStart: 0,
        columnStart: 0,
        inMultiLinePattern: false,
        patternStack: []
    };
    private parenthesesTracker: ParenthesesTracker = {
        openPositions: [],
        closePositions: [],
        matchedPairs: [],
        unmatchedOpen: [],
        unmatchedClose: []
    };
    private multiLinePatterns: MultiLinePatternMetadata[] = [];

    public parse(text: string, options?: IncrementalParseOptions): ParseResult {
        this.parseStartTime = Date.now();
        this.text = text;
        this.lines = text.split('\n');
        this.currentLine = 0;
        this.currentChar = 0;
        this.errors = [];
        this.recoveryMode = false;
        
        // Reset multi-line pattern tracking state
        this.resetParsingContext();

        let ast: DroolsAST;
        
        try {
            if (options?.enableIncrementalParsing && options.ranges && options.previousAST) {
                ast = this.parseIncrementalOptimized(options);
            } else {
                ast = this.parseFile();
            }
        } catch (error) {
            // If parsing fails completely, create a minimal AST and enable recovery mode
            this.addError(`Critical parsing error: ${error}`, this.getCurrentPosition(), 'error');
            ast = this.createMinimalAST();
            this.recoveryMode = true;
        }
        
        return {
            ast,
            errors: this.errors
        };
    }

    /**
     * Optimized incremental parsing for multi-line patterns
     * Requirement: Implement incremental parsing for modified multi-line patterns only
     */
    private parseIncrementalOptimized(options: IncrementalParseOptions): DroolsAST {
        const { ranges, previousAST, performanceManager, documentUri } = options;
        
        if (!ranges || !previousAST || !performanceManager || !documentUri) {
            return this.parseFile();
        }

        // Try to get cached multi-line patterns
        const lineRanges = ranges.map(r => ({
            start: this.getLineFromOffset(r.start),
            end: this.getLineFromOffset(r.end)
        }));

        const cachedPatterns = performanceManager.getCachedMultiLinePatterns(
            documentUri,
            { getText: () => this.text, version: 1 } as any,
            lineRanges
        );

        // Try to get cached parentheses tracker
        const affectedLines = lineRanges.flatMap(r => 
            Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i)
        );

        const cachedParentheses = performanceManager.getCachedParenthesesTracker(
            documentUri,
            { getText: () => this.text, version: 1 } as any,
            affectedLines
        );

        // Start with previous AST
        let ast = JSON.parse(JSON.stringify(previousAST)) as DroolsAST;

        // Parse only the modified ranges
        for (const range of ranges) {
            const rangeText = this.text.substring(range.start, range.end);
            const startLine = this.getLineFromOffset(range.start);
            const endLine = this.getLineFromOffset(range.end);

            // Check if this range contains multi-line patterns
            const hasMultiLinePatterns = this.detectMultiLinePatternsInRange(rangeText, startLine);

            if (hasMultiLinePatterns) {
                // Parse multi-line patterns with optimization
                const patterns = this.parseMultiLinePatternsOptimized(rangeText, startLine, cachedPatterns);
                
                // Update AST with new patterns
                this.updateASTWithMultiLinePatterns(ast, patterns, startLine, endLine);

                // Cache the new patterns
                performanceManager.cacheMultiLinePatterns(
                    documentUri,
                    { getText: () => this.text, version: 1 } as any,
                    patterns,
                    [{ start: startLine, end: endLine }]
                );
            } else {
                // Standard incremental parsing for non-multi-line content
                this.updateASTWithStandardParsing(ast, rangeText, startLine, endLine);
            }
        }

        // Update parentheses tracker if needed
        if (!cachedParentheses) {
            this.updateParenthesesTracker(affectedLines);
            performanceManager.cacheParenthesesTracker(
                documentUri,
                { getText: () => this.text, version: 1 } as any,
                this.parenthesesTracker,
                affectedLines
            );
        } else {
            this.parenthesesTracker = cachedParentheses;
        }

        return ast;
    }

    /**
     * Detect if a range contains multi-line patterns
     */
    private detectMultiLinePatternsInRange(text: string, startLine: number): boolean {
        const patterns = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        
        for (const pattern of patterns) {
            const regex = new RegExp(`\\b${pattern}\\s*\\(`, 'g');
            if (regex.test(text)) {
                // Check if it spans multiple lines or has complex nesting
                const hasNewlines = text.includes('\n');
                const openCount = (text.match(/\(/g) || []).length;
                const closeCount = (text.match(/\)/g) || []).length;
                
                if (hasNewlines || openCount !== closeCount) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Parse multi-line patterns with performance optimizations
     * Requirement: Optimize parentheses matching algorithms for better performance
     */
    private parseMultiLinePatternsOptimized(
        text: string, 
        startLine: number, 
        cachedPatterns?: MultiLinePatternMetadata[] | null
    ): MultiLinePatternMetadata[] {
        // If we have cached patterns that are still valid, use them
        if (cachedPatterns && this.areCachedPatternsValid(cachedPatterns, text)) {
            return cachedPatterns;
        }

        const patterns: MultiLinePatternMetadata[] = [];
        const lines = text.split('\n');
        
        // Optimized pattern detection with early termination
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const patternMatch = line.match(/\b(exists|not|eval|forall|collect|accumulate)\s*\(/);
            
            if (patternMatch) {
                const keyword = patternMatch[1];
                const startPos: Position = { 
                    line: startLine + lineIndex, 
                    character: patternMatch.index || 0 
                };
                
                // Use optimized multi-line pattern parsing
                const pattern = this.parseOptimizedMultiLinePattern(
                    text, 
                    startPos, 
                    keyword as any, 
                    lineIndex
                );
                
                if (pattern) {
                    patterns.push(pattern);
                    
                    // Skip lines that are part of this pattern to avoid duplicate detection
                    lineIndex = pattern.endLine - startLine;
                }
            }
        }
        
        return patterns;
    }

    /**
     * Parse a single multi-line pattern with optimizations
     * Requirement: Create memory management strategies for complex nested patterns
     */
    private parseOptimizedMultiLinePattern(
        text: string,
        startPos: Position,
        keyword: 'exists' | 'not' | 'eval' | 'forall' | 'collect' | 'accumulate',
        startLineIndex: number
    ): MultiLinePatternMetadata | null {
        const lines = text.split('\n');
        let content = '';
        let parenDepth = 0;
        let endLineIndex = startLineIndex;
        let foundOpenParen = false;
        
        // Optimized parentheses matching with depth limit
        const maxDepth = 20; // Prevent excessive nesting
        
        for (let i = startLineIndex; i < lines.length && parenDepth >= 0; i++) {
            const line = lines[i];
            content += (i > startLineIndex ? '\n' : '') + line;
            
            // Track parentheses with string literal awareness
            let inString = false;
            let escaped = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (escaped) {
                    escaped = false;
                    continue;
                }
                
                if (char === '\\' && inString) {
                    escaped = true;
                    continue;
                }
                
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                
                if (!inString) {
                    if (char === '(') {
                        parenDepth++;
                        foundOpenParen = true;
                        
                        // Check depth limit for memory management
                        if (parenDepth > maxDepth) {
                            // Pattern too complex, truncate
                            break;
                        }
                    } else if (char === ')') {
                        parenDepth--;
                    }
                }
            }
            
            endLineIndex = i;
            
            // Pattern is complete when parentheses are balanced
            if (foundOpenParen && parenDepth === 0) {
                break;
            }
        }
        
        // Create optimized metadata
        return {
            type: keyword,
            keyword,
            startLine: startPos.line,
            endLine: startPos.line + endLineIndex - startLineIndex,
            startColumn: startPos.character,
            endColumn: lines[endLineIndex]?.length || 0,
            content,
            nestedPatterns: [], // Will be populated later if needed
            parenthesesRanges: [], // Will be populated later if needed
            isComplete: parenDepth === 0
        };
    }

    /**
     * Check if cached patterns are still valid
     */
    private areCachedPatternsValid(cachedPatterns: MultiLinePatternMetadata[], currentText: string): boolean {
        // Simple validation - check if pattern content still matches
        for (const pattern of cachedPatterns) {
            const lines = currentText.split('\n');
            const patternLines = lines.slice(
                pattern.startLine, 
                Math.min(pattern.endLine + 1, lines.length)
            );
            const reconstructedContent = patternLines.join('\n');
            
            if (!reconstructedContent.includes(pattern.keyword)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Update AST with new multi-line patterns
     */
    private updateASTWithMultiLinePatterns(
        ast: DroolsAST, 
        patterns: MultiLinePatternMetadata[], 
        startLine: number, 
        endLine: number
    ): void {
        // Find rules that overlap with the modified range
        for (const rule of ast.rules) {
            if (rule.range.start.line <= endLine && rule.range.end.line >= startLine) {
                // Update rule's when clause with new patterns
                if (rule.when) {
                    this.updateConditionsWithPatterns(rule.when.conditions, patterns);
                }
            }
        }
    }

    /**
     * Update conditions with new multi-line patterns
     */
    private updateConditionsWithPatterns(conditions: ConditionNode[], patterns: MultiLinePatternMetadata[]): void {
        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i];
            
            // Check if this condition overlaps with any pattern
            for (const pattern of patterns) {
                if (condition.range.start.line <= pattern.endLine && 
                    condition.range.end.line >= pattern.startLine) {
                    
                    // Update condition with multi-line pattern
                    condition.multiLinePattern = this.createMultiLinePatternNode(pattern);
                    condition.isMultiLine = true;
                    condition.spanLines = Array.from(
                        { length: pattern.endLine - pattern.startLine + 1 }, 
                        (_, i) => pattern.startLine + i
                    );
                }
            }
        }
    }

    /**
     * Update AST with standard parsing for non-multi-line content
     */
    private updateASTWithStandardParsing(ast: DroolsAST, text: string, startLine: number, endLine: number): void {
        // Standard incremental parsing logic for simple content
        // This is a simplified implementation - in practice, you'd want more sophisticated merging
        const tempParser = new DroolsParser();
        const tempResult = tempParser.parse(text);
        
        // Merge relevant parts of the temp AST into the main AST
        // This is a placeholder - actual implementation would be more complex
        this.errors.push(...tempResult.errors);
    }

    /**
     * Update parentheses tracker for affected lines
     */
    private updateParenthesesTracker(affectedLines: number[]): void {
        // Clear existing tracking for affected lines
        this.parenthesesTracker.openPositions = this.parenthesesTracker.openPositions.filter(
            pos => !affectedLines.includes(pos.line)
        );
        this.parenthesesTracker.closePositions = this.parenthesesTracker.closePositions.filter(
            pos => !affectedLines.includes(pos.line)
        );
        
        // Re-track parentheses for affected lines
        for (const lineNum of affectedLines) {
            if (lineNum < this.lines.length) {
                this.trackParenthesesInLine(this.lines[lineNum], lineNum);
            }
        }
        
        // Rebuild matched pairs
        this.rebuildMatchedPairs();
    }

    /**
     * Rebuild matched parentheses pairs
     */
    private rebuildMatchedPairs(): void {
        this.parenthesesTracker.matchedPairs = [];
        this.parenthesesTracker.unmatchedOpen = [];
        this.parenthesesTracker.unmatchedClose = [];
        
        const openStack: Position[] = [];
        
        // Sort all positions by line and character
        const allPositions = [
            ...this.parenthesesTracker.openPositions.map(pos => ({ ...pos, type: 'open' as const })),
            ...this.parenthesesTracker.closePositions.map(pos => ({ ...pos, type: 'close' as const }))
        ].sort((a, b) => {
            if (a.line !== b.line) return a.line - b.line;
            return a.character - b.character;
        });
        
        // Match parentheses
        for (const pos of allPositions) {
            if (pos.type === 'open') {
                openStack.push(pos);
            } else {
                if (openStack.length > 0) {
                    const openPos = openStack.pop()!;
                    this.parenthesesTracker.matchedPairs.push({
                        open: openPos,
                        close: pos
                    });
                } else {
                    this.parenthesesTracker.unmatchedClose.push(pos);
                }
            }
        }
        
        // Remaining open positions are unmatched
        this.parenthesesTracker.unmatchedOpen = openStack;
    }

    /**
     * Get line number from text offset
     */
    private getLineFromOffset(offset: number): number {
        let currentOffset = 0;
        for (let i = 0; i < this.lines.length; i++) {
            if (currentOffset + this.lines[i].length >= offset) {
                return i;
            }
            currentOffset += this.lines[i].length + 1; // +1 for newline
        }
        return this.lines.length - 1;
    }

    /**
     * Get the time taken for the last parse operation
     */
    public getParseTime(): number {
        return Date.now() - this.parseStartTime;
    }

    /**
     * Reset parsing context for multi-line patterns
     */
    private resetParsingContext(): void {
        this.parsingContext = {
            parenthesesDepth: 0,
            currentPattern: undefined,
            lineStart: 0,
            columnStart: 0,
            inMultiLinePattern: false,
            patternStack: []
        };
        
        this.parenthesesTracker = {
            openPositions: [],
            closePositions: [],
            matchedPairs: [],
            unmatchedOpen: [],
            unmatchedClose: []
        };
        
        this.multiLinePatterns = [];
    }

    /**
     * Track parentheses positions in a specific line
     */
    private trackParenthesesInLine(line: string, lineNumber: number): void {
        let inStringLiteral = false;
        let escapeNext = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
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
                const position: Position = { line: lineNumber, character: i };
                
                if (char === '(') {
                    this.parenthesesTracker.openPositions.push(position);
                } else if (char === ')') {
                    this.parenthesesTracker.closePositions.push(position);
                    
                    // Try to match with the most recent unmatched opening parenthesis
                    const lastOpenIndex = this.parenthesesTracker.openPositions.length - 1;
                    if (lastOpenIndex >= 0 && 
                        !this.parenthesesTracker.matchedPairs.some(pair => 
                            pair.open.line === this.parenthesesTracker.openPositions[lastOpenIndex].line &&
                            pair.open.character === this.parenthesesTracker.openPositions[lastOpenIndex].character)) {
                        
                        const openPos = this.parenthesesTracker.openPositions[lastOpenIndex];
                        this.parenthesesTracker.matchedPairs.push({
                            open: openPos,
                            close: position
                        });
                    }
                }
            }
        }
    }

    /**
     * Detect if content contains a multi-line pattern
     */
    private detectMultiLinePattern(content: string, startPosition: Position): MultiLinePatternMetadata | null {
        const patterns = [
            { keyword: 'exists', type: 'exists' as const },
            { keyword: 'not', type: 'not' as const },
            { keyword: 'eval', type: 'eval' as const },
            { keyword: 'forall', type: 'forall' as const },
            { keyword: 'collect', type: 'collect' as const },
            { keyword: 'accumulate', type: 'accumulate' as const }
        ];
        
        for (const pattern of patterns) {
            const regex = new RegExp(`\\b${pattern.keyword}\\s*\\(`);
            if (regex.test(content)) {
                // Check if this is a multi-line pattern (contains newlines or has complex structure)
                const hasNewlines = content.includes('\n');
                const openCount = (content.match(/\(/g) || []).length;
                const closeCount = (content.match(/\)/g) || []).length;
                
                // Consider it a multi-line pattern if:
                // 1. It contains newlines, OR
                // 2. It has unbalanced parentheses (incomplete), OR
                // 3. It has nested patterns
                if (hasNewlines || openCount !== closeCount || this.hasNestedPatterns(content, pattern.keyword)) {
                    const lines = content.split('\n');
                    return {
                        type: pattern.type,
                        keyword: pattern.keyword,
                        startLine: startPosition.line,
                        endLine: startPosition.line + lines.length - 1,
                        startColumn: startPosition.character,
                        endColumn: startPosition.character + lines[lines.length - 1].length,
                        content: content,
                        nestedPatterns: [],
                        parenthesesRanges: [],
                        isComplete: openCount === closeCount
                    };
                }
            }
        }
        
        return null;
    }

    /**
     * Check if content has nested patterns within it
     */
    private hasNestedPatterns(content: string, parentKeyword: string): boolean {
        const patterns = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        
        // Remove the parent pattern keyword to avoid false positives
        const innerContent = content.replace(new RegExp(`^\\s*${parentKeyword}\\s*\\(`), '');
        
        for (const pattern of patterns) {
            if (pattern !== parentKeyword) {
                const regex = new RegExp(`\\b${pattern}\\s*\\(`);
                if (regex.test(innerContent)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Update multi-line pattern metadata as we continue parsing
     */
    private updateMultiLinePattern(metadata: MultiLinePatternMetadata, fullContent: string, endLine: number): void {
        metadata.content = fullContent;
        metadata.endLine = endLine;
        metadata.endColumn = this.getCurrentLine().length;
        
        // Extract parentheses ranges from the content
        metadata.parenthesesRanges = this.extractParenthesesRanges(metadata);
        
        // Detect nested patterns within this pattern
        metadata.nestedPatterns = this.detectNestedPatterns(fullContent, metadata);
    }

    /**
     * Check if a multi-line pattern is complete (balanced parentheses)
     */
    private isMultiLinePatternComplete(metadata: MultiLinePatternMetadata): boolean {
        const openCount = (metadata.content.match(/\(/g) || []).length;
        const closeCount = (metadata.content.match(/\)/g) || []).length;
        return openCount === closeCount;
    }

    /**
     * Extract parentheses ranges from multi-line pattern content
     */
    private extractParenthesesRanges(metadata: MultiLinePatternMetadata): Range[] {
        const ranges: Range[] = [];
        const content = metadata.content;
        let inStringLiteral = false;
        let escapeNext = false;
        let currentLine = metadata.startLine;
        let currentChar = metadata.startColumn;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (char === '\n') {
                currentLine++;
                currentChar = 0;
                continue;
            }
            
            if (escapeNext) {
                escapeNext = false;
                currentChar++;
                continue;
            }
            
            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                currentChar++;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                currentChar++;
                continue;
            }
            
            if (!inStringLiteral && (char === '(' || char === ')')) {
                const position: Position = { line: currentLine, character: currentChar };
                ranges.push({
                    start: position,
                    end: { line: currentLine, character: currentChar + 1 }
                });
            }
            
            currentChar++;
        }
        
        return ranges;
    }

    /**
     * Detect nested patterns within a multi-line pattern
     */
    private detectNestedPatterns(content: string, parentMetadata: MultiLinePatternMetadata): MultiLinePatternMetadata[] {
        const nestedPatterns: MultiLinePatternMetadata[] = [];
        const patterns = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        
        for (const pattern of patterns) {
            const regex = new RegExp(`\\b${pattern}\\s*\\(`, 'g');
            let match;
            
            while ((match = regex.exec(content)) !== null) {
                // Skip if this is the parent pattern itself
                if (match.index === 0) {
                    continue;
                }
                
                // Create nested pattern metadata
                const nestedPattern: MultiLinePatternMetadata = {
                    type: pattern as any,
                    keyword: pattern,
                    startLine: parentMetadata.startLine, // Simplified - would need proper line calculation
                    endLine: parentMetadata.startLine,
                    startColumn: match.index,
                    endColumn: match.index + match[0].length,
                    content: '', // Would need to extract the nested content
                    nestedPatterns: [],
                    parenthesesRanges: [],
                    isComplete: false
                };
                
                nestedPatterns.push(nestedPattern);
            }
        }
        
        return nestedPatterns;
    }

    /**
     * Create a MultiLinePatternNode from metadata
     */
    private createMultiLinePatternNode(metadata: MultiLinePatternMetadata, depth: number = 0): MultiLinePatternNode {
        const startPos: Position = { line: metadata.startLine, character: metadata.startColumn };
        const endPos: Position = { line: metadata.endLine, character: metadata.endColumn };
        
        // Parse inner conditions within the multi-line pattern
        const innerConditions = this.parseInnerConditions(metadata.content, metadata);
        
        // Create nested pattern nodes
        const nestedPatterns = metadata.nestedPatterns.map(nested => 
            this.createMultiLinePatternNode(nested, depth + 1)
        );
        
        return {
            type: 'MultiLinePattern',
            patternType: metadata.type,
            keyword: metadata.keyword,
            content: metadata.content,
            range: { start: startPos, end: endPos },
            nestedPatterns,
            parenthesesRanges: metadata.parenthesesRanges,
            isComplete: metadata.isComplete,
            depth,
            innerConditions
        };
    }

    /**
     * Parse inner conditions within a multi-line pattern
     */
    private parseInnerConditions(content: string, parentMetadata: MultiLinePatternMetadata): ConditionNode[] {
        const conditions: ConditionNode[] = [];
        
        // Remove the outer pattern keyword and parentheses to get inner content
        const keywordPattern = new RegExp(`^\\s*${parentMetadata.keyword}\\s*\\(`);
        let innerContent = content.replace(keywordPattern, '');
        
        // Remove the last closing parenthesis if the pattern is complete
        if (parentMetadata.isComplete) {
            innerContent = innerContent.replace(/\)\s*$/, '');
        }
        
        // Split by logical operators (and, or) while respecting nested parentheses
        const conditionParts = this.splitByLogicalOperators(innerContent);
        
        for (let i = 0; i < conditionParts.length; i++) {
            const part = conditionParts[i].trim();
            if (part) {
                const condition = this.createConditionFromContent(part, parentMetadata, i);
                conditions.push(condition);
            }
        }
        
        return conditions;
    }

    /**
     * Split content by logical operators while respecting nested parentheses
     */
    private splitByLogicalOperators(content: string): string[] {
        const parts: string[] = [];
        let currentPart = '';
        let parenDepth = 0;
        let inStringLiteral = false;
        let escapeNext = false;
        let i = 0;
        
        while (i < content.length) {
            const char = content[i];
            
            if (escapeNext) {
                escapeNext = false;
                currentPart += char;
                i++;
                continue;
            }
            
            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                currentPart += char;
                i++;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                currentPart += char;
                i++;
                continue;
            }
            
            if (!inStringLiteral) {
                if (char === '(') {
                    parenDepth++;
                } else if (char === ')') {
                    parenDepth--;
                }
                
                // Check for logical operators at depth 0
                if (parenDepth === 0) {
                    // Check for 'and' operator
                    if (content.substr(i, 3) === 'and' && 
                        (i === 0 || /\s/.test(content[i - 1])) &&
                        (i + 3 >= content.length || /\s/.test(content[i + 3]))) {
                        parts.push(currentPart.trim());
                        currentPart = '';
                        i += 3;
                        continue;
                    }
                    
                    // Check for 'or' operator
                    if (content.substr(i, 2) === 'or' && 
                        (i === 0 || /\s/.test(content[i - 1])) &&
                        (i + 2 >= content.length || /\s/.test(content[i + 2]))) {
                        parts.push(currentPart.trim());
                        currentPart = '';
                        i += 2;
                        continue;
                    }
                }
            }
            
            currentPart += char;
            i++;
        }
        
        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }
        
        return parts;
    }

    /**
     * Create a ConditionNode from content string
     */
    private createConditionFromContent(content: string, parentMetadata: MultiLinePatternMetadata, index: number): ConditionNode {
        const startPos: Position = { 
            line: parentMetadata.startLine, 
            character: parentMetadata.startColumn + index * 10 // Approximate positioning
        };
        const endPos: Position = { 
            line: parentMetadata.endLine, 
            character: parentMetadata.startColumn + index * 10 + content.length 
        };
        
        // Detect condition type and extract components
        const conditionType = this.detectConditionType(content);
        const { variable, factType, constraints } = this.parseConditionComponents(content);
        
        // Check if this condition itself contains nested multi-line patterns
        const nestedPattern = this.detectMultiLinePattern(content, startPos);
        let multiLinePattern: MultiLinePatternNode | undefined;
        
        if (nestedPattern) {
            multiLinePattern = this.createMultiLinePatternNode(nestedPattern);
        }
        
        return {
            type: 'Condition',
            conditionType,
            content: content.trim(),
            variable,
            factType,
            constraints,
            range: { start: startPos, end: endPos },
            isMultiLine: content.includes('\n') || !!multiLinePattern,
            spanLines: this.calculateSpanLines(content, startPos),
            parenthesesRanges: this.extractParenthesesRangesFromContent(content, startPos),
            multiLinePattern,
            nestedConditions: multiLinePattern ? multiLinePattern.innerConditions : undefined
        };
    }

    /**
     * Detect the type of condition from content
     */
    private detectConditionType(content: string): ConditionNode['conditionType'] {
        const trimmed = content.trim();
        
        if (trimmed.startsWith('exists(')) {
            return 'exists';
        }
        if (trimmed.startsWith('not(')) {
            return 'not';
        }
        if (trimmed.startsWith('eval(')) {
            return 'eval';
        }
        if (trimmed.startsWith('forall(')) {
            return 'forall';
        }
        if (trimmed.startsWith('collect(')) {
            return 'collect';
        }
        if (trimmed.startsWith('accumulate(')) {
            return 'accumulate';
        }
        if (trimmed.includes(' and ')) {
            return 'and';
        }
        if (trimmed.includes(' or ')) {
            return 'or';
        }
        
        return 'pattern';
    }

    /**
     * Parse condition components (variable, fact type, constraints)
     */
    private parseConditionComponents(content: string): {
        variable?: string;
        factType?: string;
        constraints?: ConstraintNode[];
    } {
        const trimmed = content.trim();
        
        // Simple pattern matching for basic fact patterns
        const factPatternMatch = trimmed.match(/^(\$?\w+)\s*:\s*(\w+)\s*\((.*)\)$/);
        if (factPatternMatch) {
            const [, variable, factType, constraintsStr] = factPatternMatch;
            const constraints = this.parseConstraints(constraintsStr);
            return { variable, factType, constraints };
        }
        
        // Pattern without variable binding
        const simpleFactMatch = trimmed.match(/^(\w+)\s*\((.*)\)$/);
        if (simpleFactMatch) {
            const [, factType, constraintsStr] = simpleFactMatch;
            const constraints = this.parseConstraints(constraintsStr);
            return { factType, constraints };
        }
        
        return {};
    }

    /**
     * Parse constraints from constraint string
     */
    private parseConstraints(constraintsStr: string): ConstraintNode[] {
        const constraints: ConstraintNode[] = [];
        
        if (!constraintsStr.trim()) {
            return constraints;
        }
        
        // Split by comma while respecting nested parentheses and string literals
        const constraintParts = this.splitConstraints(constraintsStr);
        
        for (let i = 0; i < constraintParts.length; i++) {
            const part = constraintParts[i].trim();
            if (part) {
                const constraint = this.parseConstraint(part, i);
                if (constraint) {
                    constraints.push(constraint);
                }
            }
        }
        
        return constraints;
    }

    /**
     * Split constraints by comma while respecting nested structures
     */
    private splitConstraints(constraintsStr: string): string[] {
        const parts: string[] = [];
        let currentPart = '';
        let parenDepth = 0;
        let inStringLiteral = false;
        let escapeNext = false;
        
        for (let i = 0; i < constraintsStr.length; i++) {
            const char = constraintsStr[i];
            
            if (escapeNext) {
                escapeNext = false;
                currentPart += char;
                continue;
            }
            
            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                currentPart += char;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                currentPart += char;
                continue;
            }
            
            if (!inStringLiteral) {
                if (char === '(') {
                    parenDepth++;
                } else if (char === ')') {
                    parenDepth--;
                } else if (char === ',' && parenDepth === 0) {
                    parts.push(currentPart.trim());
                    currentPart = '';
                    continue;
                }
            }
            
            currentPart += char;
        }
        
        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }
        
        return parts;
    }

    /**
     * Parse a single constraint
     */
    private parseConstraint(constraintStr: string, index: number): ConstraintNode | null {
        const trimmed = constraintStr.trim();
        
        // Match field operator value pattern
        const constraintMatch = trimmed.match(/^(\w+)\s*(==|!=|<|>|<=|>=|matches|contains|memberOf|not\s+memberOf)\s*(.+)$/);
        if (constraintMatch) {
            const [, field, operator, value] = constraintMatch;
            
            return {
                type: 'Constraint',
                field: field.trim(),
                operator: operator.trim(),
                value: value.trim(),
                range: {
                    start: { line: 0, character: index * 20 }, // Approximate positioning
                    end: { line: 0, character: index * 20 + trimmed.length }
                }
            };
        }
        
        return null;
    }

    /**
     * Calculate which lines a content spans
     */
    private calculateSpanLines(content: string, startPos: Position): number[] {
        const lines: number[] = [];
        const contentLines = content.split('\n');
        
        for (let i = 0; i < contentLines.length; i++) {
            lines.push(startPos.line + i);
        }
        
        return lines;
    }

    /**
     * Extract parentheses ranges from content
     */
    private extractParenthesesRangesFromContent(content: string, startPos: Position): Range[] {
        const ranges: Range[] = [];
        let currentLine = startPos.line;
        let currentChar = startPos.character;
        let inStringLiteral = false;
        let escapeNext = false;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (char === '\n') {
                currentLine++;
                currentChar = 0;
                continue;
            }
            
            if (escapeNext) {
                escapeNext = false;
                currentChar++;
                continue;
            }
            
            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                currentChar++;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inStringLiteral = !inStringLiteral;
                currentChar++;
                continue;
            }
            
            if (!inStringLiteral && (char === '(' || char === ')')) {
                const position: Position = { line: currentLine, character: currentChar };
                ranges.push({
                    start: position,
                    end: { line: currentLine, character: currentChar + 1 }
                });
            }
            
            currentChar++;
        }
        
        return ranges;
    }

    /**
     * Parse multi-line conditions that span multiple lines with enhanced tracking and error recovery
     */
    private parseMultiLineConditionWithTracking(): string {
        const startLine = this.currentLine;
        const startColumn = this.currentChar;
        let condition = this.getCurrentLine();
        let parenCount = 0;
        let braceCount = 0;
        let inStringLiteral = false;
        let escapeNext = false;
        
        // Track parentheses positions for the first line
        this.trackParenthesesInLine(condition, this.currentLine);
        
        // Count brackets in the first line
        for (let i = 0; i < condition.length; i++) {
            const char = condition[i];
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
                if (char === '(') {
                    parenCount++;
                    this.parsingContext.parenthesesDepth++;
                } else if (char === ')') {
                    parenCount--;
                    this.parsingContext.parenthesesDepth--;
                } else if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                }
            }
        }
        
        // If brackets are balanced, return single line
        if (parenCount === 0 && braceCount === 0) {
            return condition;
        }
        
        // Mark that we're in a multi-line pattern
        this.parsingContext.inMultiLinePattern = true;
        this.parsingContext.lineStart = startLine;
        this.parsingContext.columnStart = startColumn;
        
        // Continue reading lines until brackets are balanced or EOF
        let lineIndex = this.currentLine + 1;
        let maxLinesRead = 0;
        const maxMultiLineDepth = 50; // Prevent infinite loops
        
        while (lineIndex < this.lines.length && 
               (parenCount > 0 || braceCount > 0) && 
               maxLinesRead < maxMultiLineDepth) {
            
            const nextLine = this.lines[lineIndex];
            condition += ' ' + nextLine.trim();
            
            // Track parentheses positions for this line
            this.trackParenthesesInLine(nextLine, lineIndex);
            
            // Count brackets in this line
            inStringLiteral = false;
            escapeNext = false;
            for (let i = 0; i < nextLine.length; i++) {
                const char = nextLine[i];
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
                    if (char === '(') {
                        parenCount++;
                        this.parsingContext.parenthesesDepth++;
                    } else if (char === ')') {
                        parenCount--;
                        this.parsingContext.parenthesesDepth--;
                    } else if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }
                }
            }
            
            lineIndex++;
            maxLinesRead++;
        }
        
        // Handle incomplete patterns at EOF or max depth reached
        if (parenCount > 0 || braceCount > 0) {
            this.handleIncompletePattern(condition, startLine, startColumn, parenCount, braceCount, lineIndex - 1);
        }
        
        // Update current line position to the last line we processed
        this.currentLine = Math.min(lineIndex - 1, this.lines.length - 1);
        
        return condition;
    }

    /**
     * Handle incomplete multi-line patterns with error recovery
     */
    private handleIncompletePattern(
        condition: string, 
        startLine: number, 
        startColumn: number, 
        parenCount: number, 
        braceCount: number,
        endLine: number
    ): void {
        // Create error for incomplete pattern
        const errorMessage = this.createIncompletePatternErrorMessage(parenCount, braceCount);
        this.addError(
            errorMessage,
            { line: startLine, character: startColumn },
            'error'
        );
        
        // Try to recover by creating a partial AST node
        const partialPattern = this.createPartialMultiLinePattern(
            condition, 
            startLine, 
            startColumn, 
            endLine,
            parenCount,
            braceCount
        );
        
        if (partialPattern) {
            this.multiLinePatterns.push(partialPattern);
        }
        
        // Enable recovery mode for graceful continuation
        this.recoveryMode = true;
    }

    /**
     * Create error message for incomplete patterns
     */
    private createIncompletePatternErrorMessage(parenCount: number, braceCount: number): string {
        const messages: string[] = [];
        
        if (parenCount > 0) {
            messages.push(`${parenCount} unmatched opening parenthesis${parenCount > 1 ? 'es' : ''}`);
        }
        if (parenCount < 0) {
            messages.push(`${Math.abs(parenCount)} unmatched closing parenthesis${Math.abs(parenCount) > 1 ? 'es' : ''}`);
        }
        if (braceCount > 0) {
            messages.push(`${braceCount} unmatched opening brace${braceCount > 1 ? 's' : ''}`);
        }
        if (braceCount < 0) {
            messages.push(`${Math.abs(braceCount)} unmatched closing brace${Math.abs(braceCount) > 1 ? 's' : ''}`);
        }
        
        const baseMessage = 'Incomplete multi-line pattern';
        return messages.length > 0 ? `${baseMessage}: ${messages.join(', ')}` : baseMessage;
    }

    /**
     * Create partial multi-line pattern metadata for incomplete patterns
     */
    private createPartialMultiLinePattern(
        condition: string,
        startLine: number,
        startColumn: number,
        endLine: number,
        parenCount: number,
        braceCount: number
    ): MultiLinePatternMetadata | null {
        // Detect pattern type from the beginning of the condition
        const patternType = this.detectPatternTypeFromContent(condition);
        if (!patternType) {
            return null;
        }
        
        // Create partial metadata
        const partialPattern: MultiLinePatternMetadata = {
            type: patternType.type,
            keyword: patternType.keyword,
            startLine,
            endLine,
            startColumn,
            endColumn: this.lines[endLine]?.length || 0,
            content: condition,
            nestedPatterns: [],
            parenthesesRanges: this.extractParenthesesRanges({
                type: patternType.type,
                keyword: patternType.keyword,
                startLine,
                endLine,
                startColumn,
                endColumn: this.lines[endLine]?.length || 0,
                content: condition,
                nestedPatterns: [],
                parenthesesRanges: [],
                isComplete: false
            }),
            isComplete: false
        };
        
        // Try to detect nested patterns even in incomplete state
        try {
            partialPattern.nestedPatterns = this.detectNestedPatterns(condition, partialPattern);
        } catch (error) {
            // Ignore errors in nested pattern detection for incomplete patterns
        }
        
        return partialPattern;
    }

    /**
     * Detect pattern type from content beginning
     */
    private detectPatternTypeFromContent(content: string): { type: MultiLinePatternMetadata['type'], keyword: string } | null {
        const trimmed = content.trim();
        const patterns = [
            { keyword: 'exists', type: 'exists' as const },
            { keyword: 'not', type: 'not' as const },
            { keyword: 'eval', type: 'eval' as const },
            { keyword: 'forall', type: 'forall' as const },
            { keyword: 'collect', type: 'collect' as const },
            { keyword: 'accumulate', type: 'accumulate' as const }
        ];
        
        for (const pattern of patterns) {
            const regex = new RegExp(`^\\s*${pattern.keyword}\\s*\\(`);
            if (regex.test(trimmed)) {
                return pattern;
            }
        }
        
        return null;
    }

    /**
     * Enhanced error recovery for malformed multi-line constructs
     */
    private recoverFromMalformedPattern(startPosition: Position): string {
        let recoveredContent = '';
        let currentLineIndex = startPosition.line;
        let foundRecoveryPoint = false;
        
        // Look for recovery points: rule boundaries, other keywords, or balanced brackets
        while (currentLineIndex < this.lines.length && !foundRecoveryPoint) {
            const line = this.lines[currentLineIndex];
            const trimmedLine = line.trim();
            
            // Check for rule boundaries
            if (trimmedLine.startsWith('rule ') || 
                trimmedLine.startsWith('when') || 
                trimmedLine.startsWith('then') || 
                trimmedLine === 'end') {
                foundRecoveryPoint = true;
                break;
            }
            
            // Check for other top-level constructs
            if (trimmedLine.startsWith('package ') ||
                trimmedLine.startsWith('import ') ||
                trimmedLine.startsWith('global ') ||
                trimmedLine.startsWith('function ')) {
                foundRecoveryPoint = true;
                break;
            }
            
            // Add line to recovered content
            recoveredContent += (recoveredContent ? ' ' : '') + trimmedLine;
            currentLineIndex++;
            
            // Limit recovery scope to prevent infinite loops
            if (currentLineIndex - startPosition.line > 20) {
                break;
            }
        }
        
        // Update current position
        this.currentLine = currentLineIndex;
        
        return recoveredContent;
    }

    /**
     * Create fallback parsing mode for malformed constructs
     */
    private createFallbackAST(content: string, startPosition: Position, endPosition: Position): ConditionNode {
        // Create a generic condition node that preserves the content
        return {
            type: 'Condition',
            conditionType: 'pattern', // Default to pattern type
            content: content.trim(),
            range: { start: startPosition, end: endPosition },
            isMultiLine: content.includes('\n'),
            spanLines: this.calculateSpanLines(content, startPosition),
            parenthesesRanges: this.extractParenthesesRangesFromContent(content, startPosition),
            // Mark as potentially malformed for diagnostic purposes
            variable: undefined,
            factType: undefined,
            constraints: []
        };
    }

    /**
     * Generate partial AST for incomplete but valid partial patterns
     */
    private generatePartialAST(partialContent: string, metadata: MultiLinePatternMetadata): MultiLinePatternNode {
        const startPos: Position = { line: metadata.startLine, character: metadata.startColumn };
        const endPos: Position = { line: metadata.endLine, character: metadata.endColumn };
        
        // Parse what we can from the partial content
        let innerConditions: ConditionNode[] = [];
        try {
            innerConditions = this.parseInnerConditions(partialContent, metadata);
        } catch (error) {
            // If parsing inner conditions fails, create a fallback condition
            const fallbackCondition = this.createFallbackAST(partialContent, startPos, endPos);
            innerConditions = [fallbackCondition];
        }
        
        return {
            type: 'MultiLinePattern',
            patternType: metadata.type,
            keyword: metadata.keyword,
            content: partialContent,
            range: { start: startPos, end: endPos },
            nestedPatterns: [], // Don't try to parse nested patterns in incomplete state
            parenthesesRanges: metadata.parenthesesRanges,
            isComplete: false, // Mark as incomplete
            depth: 0,
            innerConditions
        };
    }

    /**
     * Enhanced EOF handling within multi-line patterns
     */
    private handleEOFInMultiLinePattern(): void {
        if (this.parsingContext.inMultiLinePattern && this.parsingContext.currentPattern) {
            const pattern = this.parsingContext.currentPattern;
            
            // Create error for EOF in multi-line pattern
            this.addError(
                `Unexpected end of file within multi-line ${pattern.keyword} pattern`,
                { line: pattern.startLine, character: pattern.startColumn },
                'error'
            );
            
            // Create partial AST node for the incomplete pattern
            const partialNode = this.generatePartialAST(pattern.content, pattern);
            
            // Add to multi-line patterns for later processing
            this.multiLinePatterns.push(pattern);
        }
        
        // Check for any unmatched parentheses at EOF
        this.validateUnmatchedParenthesesAtEOF();
    }

    /**
     * Validate unmatched parentheses at end of file
     */
    private validateUnmatchedParenthesesAtEOF(): void {
        // Find unmatched opening parentheses
        const matchedOpenPositions = new Set(
            this.parenthesesTracker.matchedPairs.map(pair => 
                `${pair.open.line}:${pair.open.character}`
            )
        );
        
        this.parenthesesTracker.unmatchedOpen = this.parenthesesTracker.openPositions.filter(
            pos => !matchedOpenPositions.has(`${pos.line}:${pos.character}`)
        );
        
        // Find unmatched closing parentheses
        const matchedClosePositions = new Set(
            this.parenthesesTracker.matchedPairs.map(pair => 
                `${pair.close.line}:${pair.close.character}`
            )
        );
        
        this.parenthesesTracker.unmatchedClose = this.parenthesesTracker.closePositions.filter(
            pos => !matchedClosePositions.has(`${pos.line}:${pos.character}`)
        );
        
        // Report unmatched parentheses
        for (const pos of this.parenthesesTracker.unmatchedOpen) {
            this.addError(
                'Unmatched opening parenthesis',
                pos,
                'error'
            );
        }
        
        for (const pos of this.parenthesesTracker.unmatchedClose) {
            this.addError(
                'Unmatched closing parenthesis',
                pos,
                'error'
            );
        }
    }neIndex - 1;
        
        // Reset multi-line pattern state
        this.parsingContext.inMultiLinePattern = false;
        
        return condition;
    }

    // Utility methods
    private getCurrentPosition(): Position {
        return {
            line: this.currentLine,
            character: this.currentChar
        };
    }

    private getCurrentLine(): string {
        return this.currentLine < this.lines.length ? this.lines[this.currentLine] : '';
    }

    private nextLine(): void {
        this.currentLine++;
        this.currentChar = 0;
    }

    private addError(message: string, position: Position, severity: 'error' | 'warning' = 'error'): void {
        // Limit the number of errors to prevent overwhelming output
        if (this.errors.length >= this.maxErrors) {
            return;
        }
        
        this.errors.push({
            message,
            range: { start: position, end: position },
            severity
        });
    }

    /**
     * Get current position in the document
     */
    private getCurrentPosition(): Position {
        return { line: this.currentLine, character: this.currentChar };
    }

    /**
     * Get current line content
     */
    private getCurrentLine(): string {
        return this.lines[this.currentLine] || '';
    }

    /**
     * Add error to the errors list
     */
    private addError(message: string, position: Position, severity: 'error' | 'warning' = 'error'): void {
        if (this.errors.length >= this.maxErrors) {
            return;
        }

        this.errors.push({
            message,
            range: {
                start: position,
                end: { line: position.line, character: position.character + 1 }
            },
            severity
        });
    }

    /**
     * Parse the entire file
     */
    private parseFile(): DroolsAST {
        const ast: DroolsAST = {
            type: 'DroolsFile',
            range: {
                start: { line: 0, character: 0 },
                end: { line: this.lines.length - 1, character: this.lines[this.lines.length - 1]?.length || 0 }
            },
            imports: [],
            globals: [],
            functions: [],
            rules: [],
            queries: [],
            declares: []
        };

        // Handle EOF in multi-line patterns before finishing
        this.handleEOFInMultiLinePattern();

        return ast;
    }

    /**
     * Parse incremental changes
     */
    private parseIncremental(ranges: { start: number; end: number }[], previousAST: DroolsAST): DroolsAST {
        // For now, fall back to full parsing
        return this.parseFile();
    }

    /**
     * Create a minimal AST when parsing fails completely
     */
    private createMinimalAST(): DroolsAST {
        const start = this.getCurrentPosition();
        return {
            type: 'DroolsFile',
            range: { start, end: start },
            packageDeclaration: undefined,
            imports: [],
            globals: [],
            functions: [],
            rules: [],
            queries: [],
            declares: []
        };
    }

    /**
     * Get parsing performance metrics
     */
    public getParseTime(): number {
        return Date.now() - this.parseStartTime;
    }

    /**
     * Get detected multi-line patterns from the last parse
     */
    public getMultiLinePatterns(): MultiLinePatternNode[] {
        return this.multiLinePatterns.map(metadata => 
            this.createMultiLinePatternNode(metadata)
        );
    }

    /**
     * Parse a condition with multi-line pattern support
     */
    public parseConditionWithMultiLineSupport(conditionText: string, startPosition: Position): ConditionNode {
        // Detect if this is a multi-line pattern
        const multiLinePattern = this.detectMultiLinePattern(conditionText, startPosition);
        
        if (multiLinePattern) {
            // Update the pattern metadata with complete information
            this.updateMultiLinePattern(multiLinePattern, conditionText, startPosition.line);
            multiLinePattern.isComplete = this.isMultiLinePatternComplete(multiLinePattern);
            
            // Store the pattern for later access
            this.multiLinePatterns.push(multiLinePattern);
            
            // Create the multi-line pattern node
            const multiLinePatternNode = this.createMultiLinePatternNode(multiLinePattern);
            
            // Create a condition node that contains the multi-line pattern
            return {
                type: 'Condition',
                conditionType: multiLinePattern.type,
                content: conditionText,
                range: { start: startPosition, end: { line: multiLinePattern.endLine, character: multiLinePattern.endColumn } },
                isMultiLine: true,
                spanLines: this.calculateSpanLines(conditionText, startPosition),
                parenthesesRanges: multiLinePattern.parenthesesRanges,
                multiLinePattern: multiLinePatternNode,
                nestedConditions: multiLinePatternNode.innerConditions
            };
        } else {
            // Parse as a regular condition
            const conditionType = this.detectConditionType(conditionText);
            const { variable, factType, constraints } = this.parseConditionComponents(conditionText);
            
            return {
                type: 'Condition',
                conditionType,
                content: conditionText,
                variable,
                factType,
                constraints,
                range: { 
                    start: startPosition, 
                    end: { line: startPosition.line, character: startPosition.character + conditionText.length } 
                },
                isMultiLine: conditionText.includes('\n'),
                spanLines: this.calculateSpanLines(conditionText, startPosition),
                parenthesesRanges: this.extractParenthesesRangesFromContent(conditionText, startPosition)
            };
        }
    }

    // Placeholder methods for basic parsing functionality
    private parseIncremental(ranges: { start: number; end: number }[], previousAST: DroolsAST): DroolsAST {
        // For now, fall back to full parsing
        return this.parseFile();
    }

    private parseFile(): DroolsAST {
        const start = this.getCurrentPosition();
        
        const ast: DroolsAST = {
            type: 'DroolsFile',
            range: { start, end: start },
            packageDeclaration: undefined,
            imports: [],
            globals: [],
            functions: [],
            rules: [],
            queries: [],
            declares: []
        };

        // Basic parsing implementation - this would be expanded
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === '') {
                this.nextLine();
                continue;
            }

            // Skip comments
            if (line.startsWith('//') || line.startsWith('/*')) {
                this.nextLine();
                continue;
            }

            // For now, just skip all lines to avoid errors
            this.nextLine();
        }

        ast.range.end = this.getCurrentPosition();
        return ast;
    }
}