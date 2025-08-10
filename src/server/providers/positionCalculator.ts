/**
 * Position Calculator for precise error underline positioning
 * Provides enhanced methods for finding exact positions of variables and tokens
 * without including surrounding whitespace
 */

import { Range } from '../parser/ast';
import { ThenNode, WhenNode } from '../parser/ast';

export interface IPositionCalculator {
    findVariablePositionInThenClause(thenClause: ThenNode, variableName: string): Range | null;
    findVariableDeclarationPosition(whenClause: WhenNode, variableName: string): Range | null;
    findJavaErrorPosition(line: string, errorToken: string, lineNumber: number): Range | null;
}

export interface MatchResult {
    index: number;
    length: number;
    matchedText: string;
}

/**
 * Enhanced position calculator with precise word boundary matching
 */
export class PrecisePositionCalculator implements IPositionCalculator {
    private documentLines: string[];

    constructor(documentLines: string[]) {
        this.documentLines = documentLines;
    }

    /**
     * Enhanced findVariablePositionInThenClause method with document line access
     * Uses word boundary regex matching to ensure exact token identification
     * Handles special characters and provides precise positioning without whitespace
     */
    public findVariablePositionInThenClause(thenClause: ThenNode, variableName: string): Range | null {
        if (!thenClause.actions) return null;

        // Get the actual document lines for precise positioning
        const thenStartLine = thenClause.range.start.line;
        const thenEndLine = thenClause.range.end.line;

        // Search through document lines within the then clause range
        for (let lineIndex = thenStartLine; lineIndex <= thenEndLine && lineIndex < this.documentLines.length; lineIndex++) {
            const line = this.documentLines[lineIndex];

            // Skip the "then" keyword line itself
            if (lineIndex === thenStartLine && line.trim().startsWith('then')) {
                continue;
            }

            // Stop if we've reached the end of the rule ("end" keyword)
            if (line.trim() === 'end' || line.trim().startsWith('end')) {
                break;
            }

            // Find the variable position using precise word boundary matching
            const position = this.findTokenInLine(line, variableName, lineIndex);
            if (position) {
                return position;
            }
        }

        return null;
    }

    /**
     * Enhanced findVariableDeclarationPosition method for when clause variables
     * Handles multi-line conditions and complex variable declarations
     * Supports nested patterns, exists/not constructs, and accumulate expressions
     */
    public findVariableDeclarationPosition(whenClause: WhenNode, variableName: string): Range | null {
        if (!whenClause.conditions) return null;

        const whenStartLine = whenClause.range.start.line;
        const whenEndLine = whenClause.range.end.line;

        // First, try to find the variable in the parsed conditions if available
        const conditionPosition = this.findVariableInConditions(whenClause.conditions, variableName);
        if (conditionPosition) {
            return conditionPosition;
        }

        // Fallback: Search through document lines within the when clause range
        return this.findVariableInWhenClauseLines(whenStartLine, whenEndLine, variableName);
    }

    /**
     * Find variable in parsed condition nodes with support for multi-line patterns
     */
    private findVariableInConditions(conditions: any[], variableName: string): Range | null {
        for (const condition of conditions) {
            // Check if this condition contains the variable
            if (condition.variable === variableName) {
                // Use the condition's range for precise positioning
                return this.findTokenInLine(
                    this.getLineContent(condition.range.start.line),
                    variableName,
                    condition.range.start.line
                );
            }

            // Check nested conditions (for exists, not, forall, etc.)
            if (condition.nestedConditions && condition.nestedConditions.length > 0) {
                const nestedPosition = this.findVariableInConditions(condition.nestedConditions, variableName);
                if (nestedPosition) {
                    return nestedPosition;
                }
            }

            // Check multi-line patterns
            if (condition.multiLinePattern && condition.multiLinePattern.innerConditions) {
                const patternPosition = this.findVariableInConditions(condition.multiLinePattern.innerConditions, variableName);
                if (patternPosition) {
                    return patternPosition;
                }
            }
        }

        return null;
    }

    /**
     * Find variable in when clause lines with enhanced multi-line support
     */
    private findVariableInWhenClauseLines(whenStartLine: number, whenEndLine: number, variableName: string): Range | null {
        let inMultiLinePattern = false;
        let parenthesesDepth = 0;

        // Search through document lines within the when clause range
        for (let lineIndex = whenStartLine; lineIndex <= whenEndLine && lineIndex < this.documentLines.length; lineIndex++) {
            const line = this.documentLines[lineIndex];
            const trimmedLine = line.trim();

            // Skip the "when" keyword line itself
            if (lineIndex === whenStartLine && trimmedLine.startsWith('when')) {
                continue;
            }

            // Stop if we've reached the then clause
            if (trimmedLine.startsWith('then')) {
                break;
            }

            // Track multi-line patterns (exists, not, forall, accumulate, etc.)
            if (this.isMultiLinePatternStart(trimmedLine)) {
                inMultiLinePattern = true;
                parenthesesDepth = 0;
            }

            // Track parentheses depth for multi-line patterns
            parenthesesDepth += this.countParentheses(line);

            // Check if we're exiting a multi-line pattern
            if (inMultiLinePattern && parenthesesDepth <= 0 && this.isPatternEnd(trimmedLine)) {
                inMultiLinePattern = false;
            }

            // Find the variable position using precise word boundary matching
            const position = this.findVariableDeclarationInLine(line, variableName, lineIndex, inMultiLinePattern);
            if (position) {
                return position;
            }
        }

        return null;
    }

    /**
     * Find variable declaration in a specific line with context awareness
     */
    private findVariableDeclarationInLine(line: string, variableName: string, lineIndex: number, inMultiLinePattern: boolean): Range | null {
        // Look for variable declarations in different patterns:
        // 1. $var : Type(...)
        // 2. $var : Type() from ...
        // 3. Type($var : field, ...)
        // 4. accumulate(...; $var : ...)

        // First try to find the exact variable name
        let position = this.findTokenInLine(line, variableName, lineIndex);
        if (position) {
            // Validate this is actually a variable declaration, not just usage
            if (this.isVariableDeclaration(line, variableName, position.start.character)) {
                return position;
            }
        }

        // If the variable name doesn't include $, try with $ prefix
        if (!variableName.startsWith('$')) {
            const dollarVariableName = '$' + variableName;
            position = this.findTokenInLine(line, dollarVariableName, lineIndex);
            if (position && this.isVariableDeclaration(line, dollarVariableName, position.start.character)) {
                return position;
            }
        }

        return null;
    }

    /**
     * Check if a token at a specific position is a variable declaration
     */
    private isVariableDeclaration(line: string, variableName: string, startPosition: number): boolean {
        // Look for patterns that indicate variable declaration:
        // - $var : Type
        // - $var : Type(
        // - Type($var :
        // - accumulate pattern with $var

        const beforeVar = line.substring(0, startPosition).trim();
        const afterVar = line.substring(startPosition + variableName.length).trim();

        // Pattern 1: $var : Type (most common)
        if (variableName.startsWith('$') && afterVar.startsWith(':')) {
            return true;
        }

        // Pattern 2: Type($var : field) - variable as constraint
        if (beforeVar.endsWith('(') && afterVar.startsWith(':')) {
            return true;
        }

        // Pattern 3: accumulate patterns
        if (beforeVar.includes('accumulate') || beforeVar.includes('collect')) {
            return true;
        }

        // Pattern 4: exists/not patterns
        if (beforeVar.includes('exists') || beforeVar.includes('not')) {
            return true;
        }

        return false;
    }

    /**
     * Check if a line starts a multi-line pattern
     */
    private isMultiLinePatternStart(line: string): boolean {
        const patterns = ['exists', 'not', 'forall', 'accumulate', 'collect', 'eval'];
        return patterns.some(pattern => line.includes(pattern + '('));
    }

    /**
     * Count parentheses to track nesting depth
     */
    private countParentheses(line: string): number {
        let count = 0;
        for (const char of line) {
            if (char === '(') count++;
            if (char === ')') count--;
        }
        return count;
    }

    /**
     * Check if a line ends a pattern (closing parenthesis or semicolon)
     */
    private isPatternEnd(line: string): boolean {
        return line.endsWith(')') || line.endsWith(';') || line.includes(') and') || line.includes(') or');
    }

    /**
     * Get line content safely with bounds checking
     */
    private getLineContent(lineNumber: number): string {
        if (lineNumber >= 0 && lineNumber < this.documentLines.length) {
            return this.documentLines[lineNumber];
        }
        return '';
    }

    /**
     * Enhanced findJavaErrorPosition method for capitalization and typo errors
     * Handles Java keywords, method names, and class names with precise positioning
     * Supports system/System, method names, and other Java constructs
     */
    public findJavaErrorPosition(line: string, errorToken: string, lineNumber: number): Range | null {
        // Return null for empty or invalid tokens
        if (!errorToken || errorToken.trim() === '') {
            return null;
        }

        // First try exact match with word boundaries
        let position = this.findTokenInLine(line, errorToken, lineNumber);
        if (position) {
            return position;
        }

        // Try case-insensitive matching for capitalization errors
        position = this.findJavaErrorCaseInsensitive(line, errorToken, lineNumber);
        if (position) {
            return position;
        }

        // Try fuzzy matching for typos (limited to common Java constructs)
        position = this.findJavaErrorFuzzy(line, errorToken, lineNumber);
        if (position) {
            return position;
        }

        return null;
    }

    /**
     * Find Java errors using case-insensitive matching for capitalization issues
     */
    private findJavaErrorCaseInsensitive(line: string, errorToken: string, lineNumber: number): Range | null {
        // Common Java capitalization errors
        const javaConstructs = [
            'System', 'String', 'Integer', 'Boolean', 'Double', 'Float', 'Long',
            'ArrayList', 'HashMap', 'List', 'Map', 'Set', 'Collection',
            'Exception', 'RuntimeException', 'IllegalArgumentException',
            'Math', 'Object', 'Class', 'Thread'
        ];

        // Check if the error token is a case variation of a known Java construct
        for (const construct of javaConstructs) {
            if (errorToken.toLowerCase() === construct.toLowerCase() && errorToken !== construct) {
                // Look for the incorrectly capitalized version in the line
                const pattern = this.createCaseInsensitivePattern(errorToken);
                const match = pattern.exec(line);
                if (match) {
                    return {
                        start: { line: lineNumber, character: match.index },
                        end: { line: lineNumber, character: match.index + match[0].length }
                    };
                }
            }
        }

        return null;
    }

    /**
     * Find Java errors using fuzzy matching for common typos
     */
    private findJavaErrorFuzzy(line: string, errorToken: string, lineNumber: number): Range | null {
        // Common Java typos and their corrections
        const commonTypos = new Map([
            ['Sytem', 'System'],
            ['sytem', 'System'],
            ['sistem', 'System'],
            ['Sistem', 'System'],
            ['Stirng', 'String'],
            ['stirng', 'String'],
            ['Strign', 'String'],
            ['strign', 'String'],
            ['Integr', 'Integer'],
            ['integr', 'Integer'],
            ['Intger', 'Integer'],
            ['intger', 'Integer'],
            ['printl', 'println'],
            ['prinln', 'println'],
            ['prntln', 'println']
        ]);

        // Check if the error token is a known typo
        if (commonTypos.has(errorToken)) {
            const pattern = this.createWordBoundaryPattern(errorToken);
            const match = pattern.exec(line);
            if (match) {
                return {
                    start: { line: lineNumber, character: match.index },
                    end: { line: lineNumber, character: match.index + match[0].length }
                };
            }
        }

        return null;
    }

    /**
     * Create a case-insensitive regex pattern for Java construct matching
     */
    private createCaseInsensitivePattern(token: string): RegExp {
        const escapedToken = this.escapeSpecialCharacters(token);
        return new RegExp(`\\b${escapedToken}\\b`, 'gi');
    }

    /**
     * Find Java method call errors with enhanced context awareness
     */
    public findJavaMethodError(line: string, methodName: string, lineNumber: number): Range | null {
        // Look for method calls: methodName( or object.methodName(
        const methodPattern = new RegExp(`\\b${this.escapeSpecialCharacters(methodName)}\\s*\\(`, 'g');
        const match = methodPattern.exec(line);

        if (match) {
            // Return position of just the method name, not including parentheses
            const methodNameLength = methodName.length;
            return {
                start: { line: lineNumber, character: match.index },
                end: { line: lineNumber, character: match.index + methodNameLength }
            };
        }

        return null;
    }

    /**
     * Find Java class instantiation errors (new ClassName())
     */
    public findJavaClassError(line: string, className: string, lineNumber: number): Range | null {
        // Look for class instantiation: new ClassName( or just ClassName as type
        const patterns = [
            new RegExp(`\\bnew\\s+${this.escapeSpecialCharacters(className)}\\b`, 'g'),
            new RegExp(`\\b${this.escapeSpecialCharacters(className)}\\s+\\w+`, 'g'),
            new RegExp(`\\b${this.escapeSpecialCharacters(className)}\\b`, 'g')
        ];

        for (const pattern of patterns) {
            const match = pattern.exec(line);
            if (match) {
                // Find the exact position of the class name within the match
                const classNameIndex = match[0].indexOf(className);
                if (classNameIndex !== -1) {
                    return {
                        start: { line: lineNumber, character: match.index + classNameIndex },
                        end: { line: lineNumber, character: match.index + classNameIndex + className.length }
                    };
                }
            }
        }

        return null;
    }

    /**
     * Find Java package/import errors
     */
    public findJavaPackageError(line: string, packageName: string, lineNumber: number): Range | null {
        // Look for package names in import statements or qualified class names
        const packagePattern = new RegExp(`\\b${this.escapeSpecialCharacters(packageName)}\\b`, 'g');
        const match = packagePattern.exec(line);

        if (match) {
            return {
                start: { line: lineNumber, character: match.index },
                end: { line: lineNumber, character: match.index + packageName.length }
            };
        }

        return null;
    }

    /**
     * Find a specific token in a line using word boundary regex matching
     * Handles special characters and ensures precise positioning
     */
    private findTokenInLine(line: string, token: string, lineNumber: number): Range | null {
        // Create a word boundary pattern for the token
        const pattern = this.createWordBoundaryPattern(token);

        const match = pattern.exec(line);
        if (match) {
            return {
                start: { line: lineNumber, character: match.index },
                end: { line: lineNumber, character: match.index + match[0].length }
            };
        }

        return null;
    }

    /**
     * Create a regex pattern with word boundaries for precise token matching
     * Handles special characters that need escaping for variables with regex metacharacters
     */
    private createWordBoundaryPattern(token: string): RegExp {
        const escapedToken = this.escapeSpecialCharacters(token);

        // For variables starting with $, we need special handling
        if (token.startsWith('$')) {
            // Match $ followed by word boundary for the variable name
            const variableName = token.substring(1);
            const escapedVariableName = this.escapeSpecialCharacters(variableName);
            return new RegExp(`\\$\\b${escapedVariableName}\\b`, 'g');
        }

        // For regular tokens, use standard word boundaries
        return new RegExp(`\\b${escapedToken}\\b`, 'g');
    }

    /**
     * Escape special regex characters for safe pattern creation
     * Handles all regex metacharacters that could appear in variable names
     * Essential for variables with special characters like dots, brackets, etc.
     */
    private escapeSpecialCharacters(input: string): string {
        // Escape all regex special characters: . * + ? ^ $ { } ( ) | [ ] \
        return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Find all matches of a pattern in content
     * Returns array of match results for handling multiple occurrences
     */
    private findAllMatches(pattern: RegExp, content: string): MatchResult[] {
        const matches: MatchResult[] = [];
        let match;

        // Reset regex state
        pattern.lastIndex = 0;

        while ((match = pattern.exec(content)) !== null) {
            matches.push({
                index: match.index,
                length: match[0].length,
                matchedText: match[0]
            });

            // Prevent infinite loop for zero-length matches
            if (match.index === pattern.lastIndex) {
                pattern.lastIndex++;
            }
        }

        return matches;
    }

    /**
     * Validate a regex pattern for safety and correctness
     * Ensures the pattern is valid and won't cause performance issues
     */
    public validateRegexPattern(pattern: string): { isValid: boolean; error?: string } {
        try {
            // Test pattern creation
            const regex = new RegExp(pattern, 'g');

            // Check for potentially problematic patterns
            if (this.isProblematicPattern(pattern)) {
                return {
                    isValid: false,
                    error: 'Pattern may cause performance issues or infinite loops'
                };
            }

            // Test with a simple string to ensure it doesn't hang
            const testString = 'test string for validation';
            const startTime = Date.now();

            // Set a timeout for pattern testing
            let matchCount = 0;
            let match;
            regex.lastIndex = 0;

            while ((match = regex.exec(testString)) !== null && matchCount < 100) {
                matchCount++;

                // Check for timeout (should be very fast for simple test)
                if (Date.now() - startTime > 10) {
                    return {
                        isValid: false,
                        error: 'Pattern execution timeout - may cause performance issues'
                    };
                }

                // Prevent infinite loop
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }

            return { isValid: true };

        } catch (error) {
            return {
                isValid: false,
                error: `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Check if a regex pattern is potentially problematic
     */
    private isProblematicPattern(pattern: string): boolean {
        // Patterns that could cause issues
        const problematicPatterns = [
            /\(\?\=/,           // Positive lookahead
            /\(\?\!/,           // Negative lookahead
            /\(\?\<=/,          // Positive lookbehind
            /\(\?\<!/,          // Negative lookbehind
            /\*\+/,             // Nested quantifiers
            /\+\*/,             // Nested quantifiers
            /\{\d+,\}/,         // Open-ended quantifiers with large numbers
            /\(\?\:/,           // Non-capturing groups (not problematic but complex)
        ];

        // Check for nested quantifiers and other problematic constructs
        return problematicPatterns.some(problemPattern => problemPattern.test(pattern));
    }

    /**
     * Create a safe regex pattern with validation and error handling
     * Returns null if the pattern is invalid or potentially dangerous
     */
    public createSafeRegexPattern(token: string, flags: string = 'g'): RegExp | null {
        try {
            // First escape the token
            const escapedToken = this.escapeSpecialCharacters(token);

            // Create the pattern string
            let patternString: string;

            if (token.startsWith('$')) {
                // Special handling for variables
                const variableName = token.substring(1);
                const escapedVariableName = this.escapeSpecialCharacters(variableName);
                patternString = `\\$\\b${escapedVariableName}\\b`;
            } else {
                // Regular word boundary pattern
                patternString = `\\b${escapedToken}\\b`;
            }

            // Validate the pattern
            const validation = this.validateRegexPattern(patternString);
            if (!validation.isValid) {
                console.warn(`Invalid regex pattern for token "${token}": ${validation.error}`);
                return null;
            }

            // Create and return the regex
            return new RegExp(patternString, flags);

        } catch (error) {
            console.warn(`Error creating regex pattern for token "${token}":`, error);
            return null;
        }
    }

    /**
     * Enhanced pattern creation with fallback strategies
     * Tries multiple approaches if the primary pattern fails
     */
    public createRobustPattern(token: string): RegExp | null {
        // Try the safe pattern first
        let pattern = this.createSafeRegexPattern(token);
        if (pattern) {
            return pattern;
        }

        // Fallback 1: Simple literal match without word boundaries
        try {
            const escapedToken = this.escapeSpecialCharacters(token);
            pattern = new RegExp(escapedToken, 'g');

            const validation = this.validateRegexPattern(escapedToken);
            if (validation.isValid) {
                console.warn(`Using fallback literal pattern for token "${token}"`);
                return pattern;
            }
        } catch (error) {
            // Continue to next fallback
        }

        // Fallback 2: Character-by-character matching for very complex tokens
        try {
            const charPattern = token.split('').map(char => this.escapeSpecialCharacters(char)).join('');
            pattern = new RegExp(charPattern, 'g');

            const validation = this.validateRegexPattern(charPattern);
            if (validation.isValid) {
                console.warn(`Using character-by-character pattern for token "${token}"`);
                return pattern;
            }
        } catch (error) {
            // Continue to final fallback
        }

        // Final fallback: Return null and let caller handle
        console.error(`Unable to create any regex pattern for token "${token}"`);
        return null;
    }

    /**
     * Test a pattern against sample text to ensure it works as expected
     */
    public testPatternAccuracy(pattern: RegExp, sampleText: string, expectedMatches: string[]): boolean {
        try {
            const matches: string[] = [];
            let match;

            // Reset pattern
            pattern.lastIndex = 0;

            while ((match = pattern.exec(sampleText)) !== null) {
                matches.push(match[0]);

                // Prevent infinite loop
                if (match.index === pattern.lastIndex) {
                    pattern.lastIndex++;
                }
            }

            // Check if matches are as expected
            if (matches.length !== expectedMatches.length) {
                return false;
            }

            return matches.every((match, index) => match === expectedMatches[index]);

        } catch (error) {
            console.error('Error testing pattern accuracy:', error);
            return false;
        }
    }

    /**
     * Validate that a range doesn't include leading or trailing whitespace
     * Used for debugging and validation purposes
     */
    public validateRangePrecision(range: Range, lineContent: string): boolean {
        const startChar = range.start.character;
        const endChar = range.end.character;

        // Check for leading whitespace inclusion
        if (startChar > 0) {
            const tokenStart = lineContent.substring(startChar);
            if (tokenStart.startsWith(' ') || tokenStart.startsWith('\t')) {
                return false; // Range includes leading whitespace
            }
        }

        // Check for trailing whitespace inclusion
        if (endChar < lineContent.length) {
            const tokenEnd = lineContent.substring(0, endChar);
            if (tokenEnd.endsWith(' ') || tokenEnd.endsWith('\t')) {
                return false; // Range includes trailing whitespace
            }
        }

        return true;
    }

    /**
     * Check if the range aligns with word boundaries
     * Ensures the range starts and ends at appropriate token boundaries
     */
    public checkWordBoundaries(range: Range, lineContent: string): boolean {
        const startChar = range.start.character;
        const endChar = range.end.character;

        // Check start boundary
        const charBefore = startChar > 0 ? lineContent[startChar - 1] : '';
        const charAtStart = lineContent[startChar];

        // Check end boundary
        const charAtEnd = endChar < lineContent.length ? lineContent[endChar] : '';
        const charBeforeEnd = endChar > 0 ? lineContent[endChar - 1] : '';

        // Word boundary rules:
        // - Start should be after whitespace, punctuation, or beginning of line
        // - End should be before whitespace, punctuation, or end of line
        const isValidStart = startChar === 0 || /[\s\W]/.test(charBefore) && /[\w$]/.test(charAtStart);
        const isValidEnd = endChar === lineContent.length || /[\w$]/.test(charBeforeEnd) && /[\s\W]/.test(charAtEnd);

        return isValidStart && isValidEnd;
    }

    /**
     * Visual validation helper for debugging underline accuracy
     * Creates a visual representation of where the underline would appear
     */
    public visualizeUnderlinePosition(range: Range, lineContent: string): string {
        const startChar = range.start.character;
        const endChar = range.end.character;

        // Create the visual representation
        const beforeUnderline = ' '.repeat(startChar);
        const underline = '^'.repeat(endChar - startChar);
        const afterUnderline = ' '.repeat(Math.max(0, lineContent.length - endChar));

        return `Line: ${lineContent}\n      ${beforeUnderline}${underline}${afterUnderline}`;
    }

    /**
     * Comprehensive range validation that checks all precision criteria
     * Returns detailed validation results for debugging
     */
    public validateRangeComprehensive(range: Range, lineContent: string, expectedToken: string): {
        isValid: boolean;
        issues: string[];
        extractedText: string;
        visualization: string;
    } {
        const issues: string[] = [];
        const startChar = range.start.character;
        const endChar = range.end.character;

        // Extract the actual text
        const extractedText = lineContent.substring(startChar, endChar);

        // Check if extracted text matches expected token
        if (extractedText !== expectedToken) {
            issues.push(`Extracted text "${extractedText}" does not match expected token "${expectedToken}"`);
        }

        // Check for leading whitespace
        if (startChar > 0 && /\s/.test(lineContent[startChar - 1])) {
            const tokenStart = lineContent.substring(startChar);
            if (tokenStart.startsWith(' ') || tokenStart.startsWith('\t')) {
                issues.push('Range includes leading whitespace');
            }
        }

        // Check for trailing whitespace
        if (endChar < lineContent.length && /\s/.test(lineContent[endChar])) {
            const tokenEnd = lineContent.substring(0, endChar);
            if (tokenEnd.endsWith(' ') || tokenEnd.endsWith('\t')) {
                issues.push('Range includes trailing whitespace');
            }
        }

        // Check word boundaries
        if (!this.checkWordBoundaries(range, lineContent)) {
            issues.push('Range does not align with proper word boundaries');
        }

        // Check for range bounds
        if (startChar < 0 || endChar > lineContent.length || startChar >= endChar) {
            issues.push('Range has invalid bounds');
        }

        // Create visualization
        const visualization = this.visualizeUnderlinePosition(range, lineContent);

        return {
            isValid: issues.length === 0,
            issues,
            extractedText,
            visualization
        };
    }

    /**
     * Debug helper that logs detailed information about a range
     * Useful for troubleshooting positioning issues
     */
    public debugRange(range: Range, lineContent: string, expectedToken: string, context?: string): void {
        const validation = this.validateRangeComprehensive(range, lineContent, expectedToken);

        console.log(`\n=== Range Debug ${context ? `(${context})` : ''} ===`);
        console.log(`Expected token: "${expectedToken}"`);
        console.log(`Range: ${range.start.character}-${range.end.character}`);
        console.log(`Extracted: "${validation.extractedText}"`);
        console.log(`Valid: ${validation.isValid ? '✅' : '❌'}`);

        if (validation.issues.length > 0) {
            console.log('Issues:');
            validation.issues.forEach(issue => console.log(`  - ${issue}`));
        }

        console.log('\nVisualization:');
        console.log(validation.visualization);
    }

    /**
     * Batch validation for multiple ranges on the same line
     * Useful for validating multiple errors on a single line
     */
    public validateMultipleRanges(ranges: Array<{ range: Range; expectedToken: string }>, lineContent: string): {
        allValid: boolean;
        results: Array<{ isValid: boolean; issues: string[]; extractedText: string }>;
        overlaps: Array<{ range1Index: number; range2Index: number }>;
    } {
        const results = ranges.map(({ range, expectedToken }) =>
            this.validateRangeComprehensive(range, lineContent, expectedToken)
        );

        // Check for overlapping ranges
        const overlaps: Array<{ range1Index: number; range2Index: number }> = [];
        for (let i = 0; i < ranges.length; i++) {
            for (let j = i + 1; j < ranges.length; j++) {
                const range1 = ranges[i].range;
                const range2 = ranges[j].range;

                // Check if ranges overlap
                if (range1.start.character < range2.end.character &&
                    range2.start.character < range1.end.character) {
                    overlaps.push({ range1Index: i, range2Index: j });
                }
            }
        }

        return {
            allValid: results.every(r => r.isValid) && overlaps.length === 0,
            results,
            overlaps
        };
    }

    /**
     * Performance validation helper
     * Measures the time taken for position calculation operations
     */
    public measurePositionCalculationPerformance<T>(
        operation: () => T,
        operationName: string,
        warningThresholdMs: number = 10
    ): { result: T; durationMs: number; isPerformant: boolean } {
        const startTime = performance.now();
        const result = operation();
        const endTime = performance.now();
        const durationMs = endTime - startTime;
        const isPerformant = durationMs <= warningThresholdMs;

        if (!isPerformant) {
            console.warn(`Performance warning: ${operationName} took ${durationMs.toFixed(2)}ms (threshold: ${warningThresholdMs}ms)`);
        }

        return {
            result,
            durationMs,
            isPerformant
        };
    }

    /**
     * Create a detailed positioning report for debugging
     * Includes all validation checks and visual representations
     */
    public createPositioningReport(
        ranges: Array<{ range: Range; expectedToken: string; context?: string }>,
        lineContent: string,
        lineNumber: number
    ): string {
        let report = `\n=== Positioning Report for Line ${lineNumber} ===\n`;
        report += `Line content: "${lineContent}"\n`;
        report += `Line length: ${lineContent.length} characters\n\n`;

        ranges.forEach(({ range, expectedToken, context }, index) => {
            const validation = this.validateRangeComprehensive(range, lineContent, expectedToken);

            report += `--- Range ${index + 1} ${context ? `(${context})` : ''} ---\n`;
            report += `Expected: "${expectedToken}"\n`;
            report += `Position: ${range.start.character}-${range.end.character}\n`;
            report += `Extracted: "${validation.extractedText}"\n`;
            report += `Valid: ${validation.isValid ? '✅' : '❌'}\n`;

            if (validation.issues.length > 0) {
                report += `Issues:\n`;
                validation.issues.forEach(issue => report += `  - ${issue}\n`);
            }

            report += `\nVisualization:\n${validation.visualization}\n\n`;
        });

        // Check for overlaps
        const rangeData = ranges.map(r => ({ range: r.range, expectedToken: r.expectedToken }));
        const multiValidation = this.validateMultipleRanges(rangeData, lineContent);

        if (multiValidation.overlaps.length > 0) {
            report += `--- Overlapping Ranges ---\n`;
            multiValidation.overlaps.forEach(({ range1Index, range2Index }) => {
                report += `Range ${range1Index + 1} overlaps with Range ${range2Index + 1}\n`;
            });
            report += '\n';
        }

        report += `Overall validation: ${multiValidation.allValid ? '✅ All ranges valid' : '❌ Issues found'}\n`;

        return report;
    }
}