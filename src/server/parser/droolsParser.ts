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
    AnyASTNode
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

    public parse(text: string, options?: IncrementalParseOptions): ParseResult {
        this.parseStartTime = Date.now();
        this.text = text;
        this.lines = text.split('\n');
        this.currentLine = 0;
        this.currentChar = 0;
        this.errors = [];
        this.recoveryMode = false;

        let ast: DroolsAST;
        
        try {
            if (options?.enableIncrementalParsing && options.ranges && options.previousAST) {
                ast = this.parseIncremental(options.ranges, options.previousAST);
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
     * Perform incremental parsing on specific ranges
     */
    private parseIncremental(ranges: { start: number; end: number }[], previousAST: DroolsAST): DroolsAST {
        // Start with the previous AST
        const ast: DroolsAST = {
            type: 'DroolsFile',
            range: previousAST.range,
            packageDeclaration: previousAST.packageDeclaration,
            imports: [...previousAST.imports],
            globals: [...previousAST.globals],
            functions: [...previousAST.functions],
            rules: [...previousAST.rules],
            queries: [...previousAST.queries],
            declares: [...previousAST.declares]
        };

        // Parse only the changed ranges
        for (const range of ranges) {
            const rangeText = this.text.substring(range.start, range.end);
            const rangeLines = rangeText.split('\n');
            
            // Calculate line numbers for this range
            const startLine = this.getLineFromOffset(range.start);
            const endLine = this.getLineFromOffset(range.end);
            
            // Remove old AST nodes that fall within this range
            this.removeNodesInRange(ast, startLine, endLine);
            
            // Parse the range
            const rangeAST = this.parseRange(rangeText, startLine);
            
            // Merge the new nodes into the AST
            this.mergeAST(ast, rangeAST);
        }

        return ast;
    }

    /**
     * Parse a specific range of text
     */
    private parseRange(text: string, startLine: number): DroolsAST {
        const originalText = this.text;
        const originalLines = this.lines;
        const originalCurrentLine = this.currentLine;
        const originalCurrentChar = this.currentChar;

        // Set up for range parsing
        this.text = text;
        this.lines = text.split('\n');
        this.currentLine = 0;
        this.currentChar = 0;

        const ast = this.parseFile();

        // Adjust line numbers in the AST
        this.adjustLineNumbers(ast, startLine);

        // Restore original state
        this.text = originalText;
        this.lines = originalLines;
        this.currentLine = originalCurrentLine;
        this.currentChar = originalCurrentChar;

        return ast;
    }

    /**
     * Remove AST nodes that fall within the specified line range
     */
    private removeNodesInRange(ast: DroolsAST, startLine: number, endLine: number): void {
        // Remove package declaration if in range
        if (ast.packageDeclaration && this.isNodeInRange(ast.packageDeclaration, startLine, endLine)) {
            ast.packageDeclaration = undefined;
        }

        // Remove imports in range
        ast.imports = ast.imports.filter(node => !this.isNodeInRange(node, startLine, endLine));

        // Remove globals in range
        ast.globals = ast.globals.filter(node => !this.isNodeInRange(node, startLine, endLine));

        // Remove functions in range
        ast.functions = ast.functions.filter(node => !this.isNodeInRange(node, startLine, endLine));

        // Remove rules in range
        ast.rules = ast.rules.filter(node => !this.isNodeInRange(node, startLine, endLine));

        // Remove queries in range
        ast.queries = ast.queries.filter(node => !this.isNodeInRange(node, startLine, endLine));

        // Remove declares in range
        ast.declares = ast.declares.filter(node => !this.isNodeInRange(node, startLine, endLine));
    }

    /**
     * Check if a node falls within the specified line range
     */
    private isNodeInRange(node: AnyASTNode, startLine: number, endLine: number): boolean {
        return node.range.start.line >= startLine && node.range.end.line <= endLine;
    }

    /**
     * Merge new AST nodes into the existing AST
     */
    private mergeAST(targetAST: DroolsAST, sourceAST: DroolsAST): void {
        if (sourceAST.packageDeclaration) {
            targetAST.packageDeclaration = sourceAST.packageDeclaration;
        }

        targetAST.imports.push(...sourceAST.imports);
        targetAST.globals.push(...sourceAST.globals);
        targetAST.functions.push(...sourceAST.functions);
        targetAST.rules.push(...sourceAST.rules);
        targetAST.queries.push(...sourceAST.queries);
        targetAST.declares.push(...sourceAST.declares);

        // Sort nodes by line number to maintain order
        targetAST.imports.sort((a, b) => a.range.start.line - b.range.start.line);
        targetAST.globals.sort((a, b) => a.range.start.line - b.range.start.line);
        targetAST.functions.sort((a, b) => a.range.start.line - b.range.start.line);
        targetAST.rules.sort((a, b) => a.range.start.line - b.range.start.line);
        targetAST.queries.sort((a, b) => a.range.start.line - b.range.start.line);
        targetAST.declares.sort((a, b) => a.range.start.line - b.range.start.line);
    }

    /**
     * Adjust line numbers in AST nodes by adding an offset
     */
    private adjustLineNumbers(ast: DroolsAST, lineOffset: number): void {
        const adjustRange = (range: Range) => {
            range.start.line += lineOffset;
            range.end.line += lineOffset;
        };

        const adjustNode = (node: AnyASTNode) => {
            adjustRange(node.range);
        };

        adjustRange(ast.range);

        if (ast.packageDeclaration) {
            adjustNode(ast.packageDeclaration);
        }

        ast.imports.forEach(adjustNode);
        ast.globals.forEach(adjustNode);
        ast.functions.forEach(node => {
            adjustNode(node);
            node.parameters.forEach(adjustNode);
        });
        ast.rules.forEach(node => {
            adjustNode(node);
            node.attributes.forEach(adjustNode);
            if (node.when) {
                adjustNode(node.when);
                node.when.conditions.forEach(adjustNode);
            }
            if (node.then) {
                adjustNode(node.then);
            }
        });
        ast.queries.forEach(node => {
            adjustNode(node);
            node.parameters.forEach(adjustNode);
            node.conditions.forEach(adjustNode);
        });
        ast.declares.forEach(node => {
            adjustNode(node);
            node.fields.forEach(adjustNode);
        });
    }

    /**
     * Get line number from text offset
     */
    private getLineFromOffset(offset: number): number {
        let currentOffset = 0;
        for (let line = 0; line < this.lines.length; line++) {
            if (currentOffset + this.lines[line].length >= offset) {
                return line;
            }
            currentOffset += this.lines[line].length + 1; // +1 for newline
        }
        return this.lines.length - 1;
    }

    /**
     * Get parsing performance metrics
     */
    public getParseTime(): number {
        return Date.now() - this.parseStartTime;
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

        // Skip initial whitespace and comments
        this.skipWhitespaceAndComments();

        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === '') {
                this.nextLine();
                continue;
            }

            if (line.startsWith('package ')) {
                const pkg = this.parseWithRecovery(
                    () => this.parsePackage(),
                    { type: 'Package' as const, name: '', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing package declaration'
                );
                ast.packageDeclaration = pkg;
            } else if (line.startsWith('import ')) {
                const importNode = this.parseWithRecovery(
                    () => this.parseImport(),
                    { type: 'Import' as const, path: '', isStatic: false, range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing import statement'
                );
                ast.imports.push(importNode);
            } else if (line.startsWith('global ')) {
                const global = this.parseWithRecovery(
                    () => this.parseGlobal(),
                    { type: 'Global' as const, dataType: '', name: '', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing global declaration'
                );
                ast.globals.push(global);
            } else if (line.startsWith('function ')) {
                const func = this.parseWithRecovery(
                    () => this.parseFunction(),
                    { type: 'Function' as const, returnType: '', name: '', parameters: [], body: '', range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing function declaration'
                );
                ast.functions.push(func);
            } else if (line.startsWith('rule ')) {
                const rule = this.parseWithRecovery(
                    () => this.parseRule(),
                    { type: 'Rule' as const, name: '', attributes: [], when: undefined, then: undefined, range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing rule declaration'
                );
                ast.rules.push(rule);
            } else if (line.startsWith('query ')) {
                const query = this.parseWithRecovery(
                    () => this.parseQuery(),
                    { type: 'Query' as const, name: '', parameters: [], conditions: [], range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing query declaration'
                );
                ast.queries.push(query);
            } else if (line.startsWith('declare ')) {
                const declare = this.parseWithRecovery(
                    () => this.parseDeclare(),
                    { type: 'Declare' as const, name: '', fields: [], range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() } },
                    'Error parsing declare statement'
                );
                ast.declares.push(declare);
            } else {
                // Skip unknown lines or comments, but log them for debugging
                if (line && !line.startsWith('//') && !line.startsWith('/*')) {
                    this.addError(`Unknown construct: ${line}`, this.getCurrentPosition(), 'warning');
                }
                this.nextLine();
            }
            
            this.skipWhitespaceAndComments();
        }

        ast.range.end = this.getCurrentPosition();
        return ast;
    }

    private parsePackage(): PackageNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        const match = line.match(/^package\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;?$/);
        if (!match) {
            this.addError('Invalid package declaration', start);
            this.nextLine();
            return {
                type: 'Package',
                name: '',
                range: { start, end: this.getCurrentPosition() }
            };
        }

        const packageName = match[1];
        this.nextLine();
        
        return {
            type: 'Package',
            name: packageName,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseImport(): ImportNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        const staticMatch = line.match(/^import\s+static\s+([a-zA-Z_][a-zA-Z0-9_.*]*)\s*;?$/);
        const regularMatch = line.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_.*]*)\s*;?$/);
        
        let importPath = '';
        let isStatic = false;
        
        if (staticMatch) {
            importPath = staticMatch[1];
            isStatic = true;
        } else if (regularMatch) {
            importPath = regularMatch[1];
        } else {
            this.addError('Invalid import declaration', start);
        }

        this.nextLine();
        
        return {
            type: 'Import',
            path: importPath,
            isStatic,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseGlobal(): GlobalNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        const match = line.match(/^global\s+([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;?$/);
        if (!match) {
            this.addError('Invalid global declaration', start);
            this.nextLine();
            return {
                type: 'Global',
                dataType: '',
                name: '',
                range: { start, end: this.getCurrentPosition() }
            };
        }

        const dataType = match[1];
        const name = match[2];
        this.nextLine();
        
        return {
            type: 'Global',
            dataType,
            name,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseFunction(): FunctionNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        // Parse function signature: function ReturnType functionName(params)
        const match = line.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*\{?$/);
        if (!match) {
            this.addError('Invalid function declaration', start);
            this.nextLine();
            return {
                type: 'Function',
                returnType: '',
                name: '',
                parameters: [],
                body: '',
                range: { start, end: this.getCurrentPosition() }
            };
        }

        const returnType = match[1];
        const name = match[2];
        const paramString = match[3];
        
        // Parse parameters
        const parameters = this.parseParameters(paramString);
        
        // Parse function body
        // Check if the opening brace is on the same line as the function declaration
        const hasOpenBraceOnSameLine = line.includes('{');
        this.nextLine();
        const body = this.parseFunctionBody(hasOpenBraceOnSameLine);
        
        return {
            type: 'Function',
            returnType,
            name,
            parameters,
            body,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseParameters(paramString: string): ParameterNode[] {
        const parameters: ParameterNode[] = [];
        
        if (paramString.trim() === '') {
            return parameters;
        }

        const params = paramString.split(',');
        for (const param of params) {
            const trimmed = param.trim();
            const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
            
            if (match) {
                parameters.push({
                    type: 'Parameter',
                    dataType: match[1],
                    name: match[2],
                    range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
                });
            }
        }
        
        return parameters;
    }

    private parseFunctionBody(hasOpenBraceOnSameLine: boolean = false): string {
        let body = '';
        let braceCount = hasOpenBraceOnSameLine ? 1 : 0; // Start with 1 if opening brace was on declaration line
        let foundOpenBrace = hasOpenBraceOnSameLine;
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine();
            
            // Count braces in this line
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpenBrace = true;
                } else if (char === '}') {
                    braceCount--;
                }
            }
            
            body += line + '\n';
            this.nextLine();
            
            // Check if we've completed the function body
            if (foundOpenBrace && braceCount === 0) {
                break;
            }
        }
        
        return body.trim();
    }

    private parseRule(): RuleNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        // Parse rule name: rule "Rule Name" or rule RuleName
        const quotedMatch = line.match(/^rule\s+"([^"]+)"\s*$/);
        const unquotedMatch = line.match(/^rule\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        
        let ruleName = '';
        if (quotedMatch) {
            ruleName = quotedMatch[1];
        } else if (unquotedMatch) {
            ruleName = unquotedMatch[1];
        } else {
            this.addError('Invalid rule declaration', start);
        }

        this.nextLine();
        
        // Parse rule attributes (salience, no-loop, etc.)
        const attributes = this.parseRuleAttributes();
        
        // Parse when clause
        let whenClause: WhenNode | undefined;
        if (this.currentLine < this.lines.length && this.getCurrentLine().trim() === 'when') {
            whenClause = this.parseWhen();
        }
        
        // Parse then clause
        let thenClause: ThenNode | undefined;
        if (this.currentLine < this.lines.length && this.getCurrentLine().trim() === 'then') {
            thenClause = this.parseThen();
        }
        
        // Expect 'end' keyword
        if (this.currentLine < this.lines.length && this.getCurrentLine().trim() === 'end') {
            this.nextLine();
        } else {
            this.addError('Expected "end" keyword to close rule', this.getCurrentPosition());
        }
        
        return {
            type: 'Rule',
            name: ruleName,
            attributes,
            when: whenClause,
            then: thenClause,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseRuleAttributes(): RuleAttributeNode[] {
        const attributes: RuleAttributeNode[] = [];
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === 'when' || line === 'then' || line === 'end' || line === '') {
                break;
            }
            
            // Parse attributes like "salience 100", "no-loop true", etc.
            const match = line.match(/^([a-zA-Z-]+)(?:\s+(.+))?\s*$/);
            if (match) {
                const name = match[1];
                let value: string | number | boolean | undefined = match[2];
                
                // Try to parse value as number or boolean
                if (value) {
                    if (value === 'true') {
                        value = true;
                    } else if (value === 'false') {
                        value = false;
                    } else if (!isNaN(Number(value))) {
                        value = Number(value);
                    }
                }
                
                attributes.push({
                    type: 'RuleAttribute',
                    name,
                    value,
                    range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
                });
            }
            
            this.nextLine();
        }
        
        return attributes;
    }

    private parseWhen(): WhenNode {
        const start = this.getCurrentPosition();
        this.nextLine(); // Skip 'when' line
        
        const conditions: ConditionNode[] = [];
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === 'then' || line === 'end' || line === '') {
                break;
            }
            
            const condition = this.parseCondition();
            if (condition) {
                conditions.push(condition);
            }
            
            this.nextLine();
        }
        
        return {
            type: 'When',
            conditions,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseCondition(): ConditionNode | null {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        if (line === '') {
            return null;
        }
        
        // Parse different condition types
        let conditionType: 'pattern' | 'eval' | 'exists' | 'not' | 'and' | 'or' = 'pattern';
        let content = line;
        let variable: string | undefined;
        let factType: string | undefined;
        
        if (line.startsWith('exists(')) {
            conditionType = 'exists';
            content = line.substring(7, line.length - 1); // Remove exists( and )
        } else if (line.startsWith('not(')) {
            conditionType = 'not';
            content = line.substring(4, line.length - 1); // Remove not( and )
        } else if (line.startsWith('eval(')) {
            conditionType = 'eval';
            content = line.substring(5, line.length - 1); // Remove eval( and )
        } else {
            // Parse pattern: $var : FactType(constraints)
            const patternMatch = line.match(/^(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)\s*$/);
            if (patternMatch) {
                variable = patternMatch[1];
                factType = patternMatch[2];
                content = patternMatch[3];
            }
        }
        
        return {
            type: 'Condition',
            conditionType,
            content,
            variable,
            factType,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseThen(): ThenNode {
        const start = this.getCurrentPosition();
        this.nextLine(); // Skip 'then' line
        
        let actions = '';
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === 'end') {
                break;
            }
            
            actions += this.getCurrentLine() + '\n';
            this.nextLine();
        }
        
        return {
            type: 'Then',
            actions: actions.trim(),
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseQuery(): QueryNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        // Parse query: query "queryName"(params)
        const match = line.match(/^query\s+"([^"]+)"\s*(?:\((.*?)\))?\s*$/);
        if (!match) {
            this.addError('Invalid query declaration', start);
            this.nextLine();
            return {
                type: 'Query',
                name: '',
                parameters: [],
                conditions: [],
                range: { start, end: this.getCurrentPosition() }
            };
        }

        const name = match[1];
        const paramString = match[2] || '';
        const parameters = this.parseParameters(paramString);
        
        this.nextLine();
        
        // Parse query conditions (similar to rule when clause)
        const conditions: ConditionNode[] = [];
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === 'end') {
                this.nextLine();
                break;
            }
            
            if (line !== '') {
                const condition = this.parseCondition();
                if (condition) {
                    conditions.push(condition);
                }
            }
            
            this.nextLine();
        }
        
        return {
            type: 'Query',
            name,
            parameters,
            conditions,
            range: { start, end: this.getCurrentPosition() }
        };
    }

    private parseDeclare(): DeclareNode {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        
        // Parse declare: declare TypeName
        const match = line.match(/^declare\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        if (!match) {
            this.addError('Invalid declare statement', start);
            this.nextLine();
            return {
                type: 'Declare',
                name: '',
                fields: [],
                range: { start, end: this.getCurrentPosition() }
            };
        }

        const name = match[1];
        this.nextLine();
        
        // Parse fields
        const fields: FieldNode[] = [];
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            if (line === 'end') {
                this.nextLine();
                break;
            }
            
            if (line !== '') {
                const fieldMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_.<>]*)\s*$/);
                if (fieldMatch) {
                    fields.push({
                        type: 'Field',
                        name: fieldMatch[1],
                        dataType: fieldMatch[2],
                        range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
                    });
                }
            }
            
            this.nextLine();
        }
        
        return {
            type: 'Declare',
            name,
            fields,
            range: { start, end: this.getCurrentPosition() }
        };
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

    private skipWhitespaceAndComments(): void {
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            // Skip empty lines
            if (line === '') {
                this.nextLine();
                continue;
            }
            
            // Skip line comments
            if (line.startsWith('//')) {
                this.nextLine();
                continue;
            }
            
            // Skip block comments
            if (line.startsWith('/*')) {
                this.skipBlockComment();
                continue;
            }
            
            break;
        }
    }

    private skipBlockComment(): void {
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine();
            
            if (line.includes('*/')) {
                this.nextLine();
                break;
            }
            
            this.nextLine();
        }
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
     * Attempt to recover from parsing errors by skipping to the next known construct
     */
    private recoverFromError(): void {
        this.recoveryMode = true;
        
        // Skip lines until we find a known construct or reach end of file
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            
            // Look for known starting keywords
            if (line.startsWith('package ') || 
                line.startsWith('import ') || 
                line.startsWith('global ') || 
                line.startsWith('function ') || 
                line.startsWith('rule ') || 
                line.startsWith('query ') || 
                line.startsWith('declare ') ||
                line === 'end') {
                break;
            }
            
            this.nextLine();
        }
        
        this.recoveryMode = false;
    }

    /**
     * Enhanced parsing methods with error recovery
     */
    private parseWithRecovery<T>(parseMethod: () => T, defaultValue: T, errorMessage: string): T {
        try {
            return parseMethod();
        } catch (error) {
            this.addError(`${errorMessage}: ${error}`, this.getCurrentPosition(), 'error');
            this.recoverFromError();
            return defaultValue;
        }
    }
}