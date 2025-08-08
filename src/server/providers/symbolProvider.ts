/**
 * Symbol provider for Drools language navigation support
 */

import {
    DocumentSymbol,
    SymbolKind,
    WorkspaceSymbol,
    Location,
    Position,
    Range,
    DefinitionParams,
    WorkspaceSymbolParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { 
    DroolsAST, 
    RuleNode, 
    FunctionNode, 
    GlobalNode, 
    PackageNode,
    QueryNode,
    DeclareNode,
    AnyASTNode,
    ConditionNode,
    MultiLinePatternNode,
    WhenNode
} from '../parser/ast';
import { ParseResult } from '../parser/droolsParser';

export interface SymbolSettings {
    enableDocumentSymbols: boolean;
    enableWorkspaceSymbols: boolean;
    enableGoToDefinition: boolean;
    maxSymbolResults: number;
}

export class DroolsSymbolProvider {
    private settings: SymbolSettings;
    private documentCache: Map<string, { document: TextDocument; parseResult: ParseResult }> = new Map();

    constructor(settings: Partial<SymbolSettings> = {}) {
        this.settings = {
            enableDocumentSymbols: true,
            enableWorkspaceSymbols: true,
            enableGoToDefinition: true,
            maxSymbolResults: 100,
            ...settings
        };
    }

    /**
     * Provide document symbols for outline view
     */
    public provideDocumentSymbols(
        document: TextDocument,
        parseResult: ParseResult
    ): DocumentSymbol[] {
        if (!this.settings.enableDocumentSymbols) {
            return [];
        }

        const symbols: DocumentSymbol[] = [];
        const ast = parseResult.ast;

        // Add package declaration
        if (ast.packageDeclaration) {
            symbols.push(this.createPackageSymbol(ast.packageDeclaration));
        }

        // Add imports as a group
        if (ast.imports.length > 0) {
            symbols.push(this.createImportsGroupSymbol(ast.imports));
        }

        // Add globals
        for (const global of ast.globals) {
            symbols.push(this.createGlobalSymbol(global));
        }

        // Add functions
        for (const func of ast.functions) {
            symbols.push(this.createFunctionSymbol(func));
        }

        // Add rules
        for (const rule of ast.rules) {
            symbols.push(this.createRuleSymbol(rule));
        }

        // Add queries
        for (const query of ast.queries) {
            symbols.push(this.createQuerySymbol(query));
        }

        // Add declares
        for (const declare of ast.declares) {
            symbols.push(this.createDeclareSymbol(declare));
        }

        return symbols;
    }

    /**
     * Provide workspace symbols for cross-file navigation with multi-line pattern support
     */
    public provideWorkspaceSymbols(
        params: WorkspaceSymbolParams,
        documents: Map<string, { document: TextDocument; parseResult: ParseResult }>
    ): WorkspaceSymbol[] {
        if (!this.settings.enableWorkspaceSymbols) {
            return [];
        }

        const symbols: WorkspaceSymbol[] = [];
        const query = params.query.toLowerCase();

        for (const [uri, { document, parseResult }] of documents) {
            const ast = parseResult.ast;

            // Search in rules
            for (const rule of ast.rules) {
                if (rule.name.toLowerCase().includes(query)) {
                    symbols.push({
                        name: rule.name,
                        kind: SymbolKind.Function,
                        location: Location.create(uri, this.astRangeToLspRange(rule.range)),
                        containerName: ast.packageDeclaration?.name
                    });
                }

                // Search within rule conditions for multi-line patterns
                if (rule.when) {
                    const patternSymbols = this.searchMultiLinePatterns(
                        rule.when.conditions, 
                        query, 
                        uri, 
                        rule.name,
                        ast.packageDeclaration?.name
                    );
                    symbols.push(...patternSymbols);
                }
            }

            // Search in functions
            for (const func of ast.functions) {
                if (func.name.toLowerCase().includes(query)) {
                    symbols.push({
                        name: func.name,
                        kind: SymbolKind.Method,
                        location: Location.create(uri, this.astRangeToLspRange(func.range)),
                        containerName: ast.packageDeclaration?.name
                    });
                }
            }

            // Search in globals
            for (const global of ast.globals) {
                if (global.name.toLowerCase().includes(query)) {
                    symbols.push({
                        name: global.name,
                        kind: SymbolKind.Variable,
                        location: Location.create(uri, this.astRangeToLspRange(global.range)),
                        containerName: ast.packageDeclaration?.name
                    });
                }
            }

            // Search in queries
            for (const queryNode of ast.queries) {
                if (queryNode.name.toLowerCase().includes(query)) {
                    symbols.push({
                        name: queryNode.name,
                        kind: SymbolKind.Interface,
                        location: Location.create(uri, this.astRangeToLspRange(queryNode.range)),
                        containerName: ast.packageDeclaration?.name
                    });
                }

                // Search within query conditions for multi-line patterns
                const queryPatternSymbols = this.searchMultiLinePatterns(
                    queryNode.conditions,
                    query,
                    uri,
                    queryNode.name,
                    ast.packageDeclaration?.name
                );
                symbols.push(...queryPatternSymbols);
            }

            // Search in declares
            for (const declare of ast.declares) {
                if (declare.name.toLowerCase().includes(query)) {
                    symbols.push({
                        name: declare.name,
                        kind: SymbolKind.Class,
                        location: Location.create(uri, this.astRangeToLspRange(declare.range)),
                        containerName: ast.packageDeclaration?.name
                    });
                }
            }

            if (symbols.length >= this.settings.maxSymbolResults) {
                break;
            }
        }

        return symbols.slice(0, this.settings.maxSymbolResults);
    }

    /**
     * Provide go-to-definition functionality
     */
    public provideDefinition(
        document: TextDocument,
        position: Position,
        parseResult: ParseResult,
        allDocuments: Map<string, { document: TextDocument; parseResult: ParseResult }>
    ): Location[] {
        if (!this.settings.enableGoToDefinition) {
            return [];
        }

        const wordAtPosition = this.getWordAtPosition(document, position);
        if (!wordAtPosition) {
            return [];
        }

        const locations: Location[] = [];

        // Search in current document first
        const currentLocations = this.findDefinitionInDocument(
            document.uri,
            wordAtPosition,
            parseResult
        );
        locations.push(...currentLocations);

        // Search in other documents if not found in current
        if (locations.length === 0) {
            for (const [uri, { document: doc, parseResult: result }] of allDocuments) {
                if (uri !== document.uri) {
                    const otherLocations = this.findDefinitionInDocument(
                        uri,
                        wordAtPosition,
                        result
                    );
                    locations.push(...otherLocations);
                }
            }
        }

        return locations;
    }

    /**
     * Find definition in a specific document with multi-line pattern support
     */
    private findDefinitionInDocument(
        uri: string,
        word: string,
        parseResult: ParseResult
    ): Location[] {
        const locations: Location[] = [];
        const ast = parseResult.ast;

        // Check rules
        for (const rule of ast.rules) {
            if (rule.name === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(rule.range)));
            }

            // Search within rule conditions for multi-line patterns and variables
            if (rule.when) {
                const conditionLocations = this.findDefinitionInConditions(
                    rule.when.conditions,
                    word,
                    uri
                );
                locations.push(...conditionLocations);
            }
        }

        // Check functions
        for (const func of ast.functions) {
            if (func.name === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(func.range)));
            }
        }

        // Check globals
        for (const global of ast.globals) {
            if (global.name === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(global.range)));
            }
        }

        // Check queries
        for (const query of ast.queries) {
            if (query.name === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(query.range)));
            }

            // Search within query conditions
            const queryConditionLocations = this.findDefinitionInConditions(
                query.conditions,
                word,
                uri
            );
            locations.push(...queryConditionLocations);
        }

        // Check declares
        for (const declare of ast.declares) {
            if (declare.name === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(declare.range)));
            }

            // Check declare fields
            for (const field of declare.fields) {
                if (field.name === word) {
                    locations.push(Location.create(uri, this.astRangeToLspRange(field.range)));
                }
            }
        }

        return locations;
    }

    /**
     * Get word at position in document
     */
    private getWordAtPosition(document: TextDocument, position: Position): string | null {
        const line = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line + 1, character: 0 }
        });

        // Remove newline character if present
        const cleanLine = line.replace(/\n$/, '');

        // Check if the position is inside a string literal
        if (this.isPositionInStringLiteral(cleanLine, position.character)) {
            return null; // Don't provide navigation for variables inside string literals
        }

        // More comprehensive word regex that handles function calls and identifiers
        const wordRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;
        let match;
        let bestMatch = null;
        let bestDistance = Infinity;

        while ((match = wordRegex.exec(cleanLine)) !== null) {
            const startChar = match.index;
            const endChar = match.index + match[0].length;

            // Check if position is within or very close to this word
            if (position.character >= startChar && position.character <= endChar) {
                return match[0];
            }

            // Also check for closest word if position is between words
            const distance = Math.min(
                Math.abs(position.character - startChar),
                Math.abs(position.character - endChar)
            );

            if (distance < bestDistance && distance <= 2) {
                bestMatch = match[0];
                bestDistance = distance;
            }
        }

        return bestMatch;
    }

    /**
     * Check if a position is inside a string literal
     */
    private isPositionInStringLiteral(line: string, position: number): boolean {
        let inString = false;
        let stringChar = '';
        let escaped = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\' && inString) {
                escaped = true;
                continue;
            }

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = '';
            }

            // If we've reached the position and we're inside a string, return true
            if (i === position && inString) {
                return true;
            }
        }

        // If position is at the end and we're still in a string
        return position >= line.length && inString;
    }

    /**
     * Create package symbol
     */
    private createPackageSymbol(packageNode: PackageNode): DocumentSymbol {
        return {
            name: packageNode.name,
            kind: SymbolKind.Package,
            range: this.astRangeToLspRange(packageNode.range),
            selectionRange: this.astRangeToLspRange(packageNode.range),
            children: []
        };
    }

    /**
     * Create imports group symbol
     */
    private createImportsGroupSymbol(imports: any[]): DocumentSymbol {
        const firstImport = imports[0];
        const lastImport = imports[imports.length - 1];
        
        const groupRange = {
            start: firstImport.range.start,
            end: lastImport.range.end
        };

        const children = imports.map(imp => ({
            name: imp.path,
            kind: SymbolKind.Module,
            range: this.astRangeToLspRange(imp.range),
            selectionRange: this.astRangeToLspRange(imp.range),
            children: []
        }));

        return {
            name: `Imports (${imports.length})`,
            kind: SymbolKind.Namespace,
            range: this.astRangeToLspRange(groupRange),
            selectionRange: this.astRangeToLspRange(groupRange),
            children
        };
    }

    /**
     * Create global symbol
     */
    private createGlobalSymbol(global: GlobalNode): DocumentSymbol {
        return {
            name: `${global.name}: ${global.dataType}`,
            kind: SymbolKind.Variable,
            range: this.astRangeToLspRange(global.range),
            selectionRange: this.astRangeToLspRange(global.range),
            children: []
        };
    }

    /**
     * Create function symbol
     */
    private createFunctionSymbol(func: FunctionNode): DocumentSymbol {
        const paramNames = func.parameters.map(p => `${p.name}: ${p.dataType}`).join(', ');
        const signature = `${func.name}(${paramNames}): ${func.returnType}`;

        const children = func.parameters.map(param => ({
            name: `${param.name}: ${param.dataType}`,
            kind: SymbolKind.Property,
            range: this.astRangeToLspRange(param.range),
            selectionRange: this.astRangeToLspRange(param.range),
            children: []
        }));

        return {
            name: signature,
            kind: SymbolKind.Method,
            range: this.astRangeToLspRange(func.range),
            selectionRange: this.astRangeToLspRange(func.range),
            children
        };
    }

    /**
     * Create rule symbol with enhanced multi-line pattern support
     */
    private createRuleSymbol(rule: RuleNode): DocumentSymbol {
        const children: DocumentSymbol[] = [];

        // Add rule attributes as children
        for (const attr of rule.attributes) {
            children.push({
                name: `${attr.name}${attr.value !== undefined ? `: ${attr.value}` : ''}`,
                kind: SymbolKind.Property,
                range: this.astRangeToLspRange(attr.range),
                selectionRange: this.astRangeToLspRange(attr.range),
                children: []
            });
        }

        // Add when clause with enhanced multi-line pattern support
        if (rule.when) {
            const whenSymbol = this.createWhenClauseSymbol(rule.when);
            children.push(whenSymbol);
        }

        // Add then clause
        if (rule.then) {
            const actionPreview = rule.then.actions.substring(0, 50) + 
                (rule.then.actions.length > 50 ? '...' : '');
            children.push({
                name: `then: ${actionPreview}`,
                kind: SymbolKind.Object,
                range: this.astRangeToLspRange(rule.then.range),
                selectionRange: this.astRangeToLspRange(rule.then.range),
                children: []
            });
        }

        return {
            name: rule.name,
            kind: SymbolKind.Function,
            range: this.astRangeToLspRange(rule.range),
            selectionRange: this.astRangeToLspRange(rule.range),
            children
        };
    }

    /**
     * Create query symbol
     */
    private createQuerySymbol(query: QueryNode): DocumentSymbol {
        const paramNames = query.parameters.map(p => `${p.name}: ${p.dataType}`).join(', ');
        const signature = `${query.name}(${paramNames})`;

        const children = query.conditions.map((condition, index) => ({
            name: `condition ${index + 1}: ${condition.content.substring(0, 40)}${condition.content.length > 40 ? '...' : ''}`,
            kind: SymbolKind.Field,
            range: this.astRangeToLspRange(condition.range),
            selectionRange: this.astRangeToLspRange(condition.range),
            children: []
        }));

        return {
            name: signature,
            kind: SymbolKind.Interface,
            range: this.astRangeToLspRange(query.range),
            selectionRange: this.astRangeToLspRange(query.range),
            children
        };
    }

    /**
     * Create declare symbol
     */
    private createDeclareSymbol(declare: DeclareNode): DocumentSymbol {
        const children = declare.fields.map(field => ({
            name: `${field.name}: ${field.dataType}`,
            kind: SymbolKind.Property,
            range: this.astRangeToLspRange(field.range),
            selectionRange: this.astRangeToLspRange(field.range),
            children: []
        }));

        return {
            name: declare.name,
            kind: SymbolKind.Class,
            range: this.astRangeToLspRange(declare.range),
            selectionRange: this.astRangeToLspRange(declare.range),
            children
        };
    }

    /**
     * Create when clause symbol with multi-line pattern support
     */
    private createWhenClauseSymbol(whenNode: WhenNode): DocumentSymbol {
        const children: DocumentSymbol[] = [];
        
        // Group conditions by multi-line patterns and regular conditions
        const multiLinePatterns: ConditionNode[] = [];
        const regularConditions: ConditionNode[] = [];
        
        for (const condition of whenNode.conditions) {
            if (condition.isMultiLine && condition.multiLinePattern) {
                multiLinePatterns.push(condition);
            } else {
                regularConditions.push(condition);
            }
        }
        
        // Add multi-line patterns as structured symbols
        for (const condition of multiLinePatterns) {
            const patternSymbol = this.createMultiLinePatternSymbol(condition);
            children.push(patternSymbol);
        }
        
        // Add regular conditions
        for (const condition of regularConditions) {
            const conditionSymbol = this.createConditionSymbol(condition);
            children.push(conditionSymbol);
        }
        
        const totalConditions = whenNode.conditions.length;
        const multiLineCount = multiLinePatterns.length;
        const regularCount = regularConditions.length;
        
        let whenName = `when (${totalConditions} conditions)`;
        if (multiLineCount > 0) {
            whenName = `when (${multiLineCount} multi-line, ${regularCount} regular)`;
        }
        
        return {
            name: whenName,
            kind: SymbolKind.Object,
            range: this.astRangeToLspRange(whenNode.range),
            selectionRange: this.astRangeToLspRange(whenNode.range),
            children
        };
    }

    /**
     * Create multi-line pattern symbol showing structure
     */
    private createMultiLinePatternSymbol(condition: ConditionNode): DocumentSymbol {
        if (!condition.multiLinePattern) {
            return this.createConditionSymbol(condition);
        }
        
        const pattern = condition.multiLinePattern;
        const children: DocumentSymbol[] = [];
        
        // Add nested patterns as children
        for (const nestedPattern of pattern.nestedPatterns) {
            const nestedSymbol = this.createNestedPatternSymbol(nestedPattern);
            children.push(nestedSymbol);
        }
        
        // Add inner conditions as children
        for (const innerCondition of pattern.innerConditions) {
            const innerSymbol = this.createConditionSymbol(innerCondition);
            children.push(innerSymbol);
        }
        
        // Create a descriptive name for the multi-line pattern
        const patternName = this.createMultiLinePatternName(pattern);
        
        return {
            name: patternName,
            kind: SymbolKind.Constructor, // Use Constructor to distinguish multi-line patterns
            range: this.astRangeToLspRange(pattern.range),
            selectionRange: this.astRangeToLspRange(pattern.range),
            children
        };
    }

    /**
     * Create nested pattern symbol
     */
    private createNestedPatternSymbol(nestedPattern: MultiLinePatternNode): DocumentSymbol {
        const children: DocumentSymbol[] = [];
        
        // Add nested patterns recursively
        for (const subPattern of nestedPattern.nestedPatterns) {
            children.push(this.createNestedPatternSymbol(subPattern));
        }
        
        // Add inner conditions
        for (const innerCondition of nestedPattern.innerConditions) {
            children.push(this.createConditionSymbol(innerCondition));
        }
        
        const patternName = this.createMultiLinePatternName(nestedPattern);
        
        return {
            name: patternName,
            kind: SymbolKind.Constructor,
            range: this.astRangeToLspRange(nestedPattern.range),
            selectionRange: this.astRangeToLspRange(nestedPattern.range),
            children
        };
    }

    /**
     * Create regular condition symbol
     */
    private createConditionSymbol(condition: ConditionNode): DocumentSymbol {
        const conditionPreview = condition.content.substring(0, 50) + 
            (condition.content.length > 50 ? '...' : '');
        
        const children: DocumentSymbol[] = [];
        
        // Add constraints as children if available
        if (condition.constraints) {
            for (const constraint of condition.constraints) {
                children.push({
                    name: `${constraint.field} ${constraint.operator} ${constraint.value}`,
                    kind: SymbolKind.Property,
                    range: this.astRangeToLspRange(constraint.range),
                    selectionRange: this.astRangeToLspRange(constraint.range),
                    children: []
                });
            }
        }
        
        // Add nested conditions if available
        if (condition.nestedConditions) {
            for (const nestedCondition of condition.nestedConditions) {
                children.push(this.createConditionSymbol(nestedCondition));
            }
        }
        
        return {
            name: conditionPreview,
            kind: SymbolKind.Field,
            range: this.astRangeToLspRange(condition.range),
            selectionRange: this.astRangeToLspRange(condition.range),
            children
        };
    }

    /**
     * Create descriptive name for multi-line pattern
     */
    private createMultiLinePatternName(pattern: MultiLinePatternNode): string {
        const keyword = pattern.keyword;
        const depth = pattern.depth;
        const nestedCount = pattern.nestedPatterns.length;
        const conditionCount = pattern.innerConditions.length;
        
        let name = keyword;
        
        if (depth > 0) {
            name = `${keyword} (depth ${depth})`;
        }
        
        const parts: string[] = [];
        if (nestedCount > 0) {
            parts.push(`${nestedCount} nested`);
        }
        if (conditionCount > 0) {
            parts.push(`${conditionCount} conditions`);
        }
        
        if (parts.length > 0) {
            name += ` (${parts.join(', ')})`;
        }
        
        // Add line span information for multi-line patterns
        if (pattern.range.start.line !== pattern.range.end.line) {
            const lineSpan = pattern.range.end.line - pattern.range.start.line + 1;
            name += ` [${lineSpan} lines]`;
        }
        
        return name;
    }

    /**
     * Search for multi-line patterns in conditions that match the query
     */
    private searchMultiLinePatterns(
        conditions: ConditionNode[],
        query: string,
        uri: string,
        containerName: string,
        packageName?: string
    ): WorkspaceSymbol[] {
        const symbols: WorkspaceSymbol[] = [];

        for (const condition of conditions) {
            // Check if condition has multi-line pattern
            if (condition.isMultiLine && condition.multiLinePattern) {
                const pattern = condition.multiLinePattern;
                
                // Check if pattern keyword matches query
                if (pattern.keyword.toLowerCase().includes(query)) {
                    symbols.push({
                        name: `${pattern.keyword} pattern`,
                        kind: SymbolKind.Constructor,
                        location: Location.create(uri, this.astRangeToLspRange(pattern.range)),
                        containerName: `${containerName} > when`
                    });
                }

                // Check pattern content for matches
                if (pattern.content.toLowerCase().includes(query)) {
                    const contentPreview = pattern.content.substring(0, 50) + 
                        (pattern.content.length > 50 ? '...' : '');
                    symbols.push({
                        name: `${pattern.keyword}: ${contentPreview}`,
                        kind: SymbolKind.Constructor,
                        location: Location.create(uri, this.astRangeToLspRange(pattern.range)),
                        containerName: `${containerName} > when`
                    });
                }

                // Recursively search nested patterns
                symbols.push(...this.searchNestedPatterns(
                    pattern.nestedPatterns,
                    query,
                    uri,
                    `${containerName} > ${pattern.keyword}`,
                    packageName
                ));

                // Search inner conditions
                symbols.push(...this.searchMultiLinePatterns(
                    pattern.innerConditions,
                    query,
                    uri,
                    `${containerName} > ${pattern.keyword}`,
                    packageName
                ));
            } else {
                // Check regular condition content
                if (condition.content.toLowerCase().includes(query)) {
                    const contentPreview = condition.content.substring(0, 50) + 
                        (condition.content.length > 50 ? '...' : '');
                    symbols.push({
                        name: contentPreview,
                        kind: SymbolKind.Field,
                        location: Location.create(uri, this.astRangeToLspRange(condition.range)),
                        containerName: `${containerName} > when`
                    });
                }

                // Check variable name if available
                if (condition.variable && condition.variable.toLowerCase().includes(query)) {
                    symbols.push({
                        name: `$${condition.variable}`,
                        kind: SymbolKind.Variable,
                        location: Location.create(uri, this.astRangeToLspRange(condition.range)),
                        containerName: `${containerName} > when`
                    });
                }

                // Check fact type if available
                if (condition.factType && condition.factType.toLowerCase().includes(query)) {
                    symbols.push({
                        name: condition.factType,
                        kind: SymbolKind.Class,
                        location: Location.create(uri, this.astRangeToLspRange(condition.range)),
                        containerName: `${containerName} > when`
                    });
                }
            }

            // Search nested conditions
            if (condition.nestedConditions) {
                symbols.push(...this.searchMultiLinePatterns(
                    condition.nestedConditions,
                    query,
                    uri,
                    containerName,
                    packageName
                ));
            }
        }

        return symbols;
    }

    /**
     * Search nested patterns recursively
     */
    private searchNestedPatterns(
        nestedPatterns: MultiLinePatternNode[],
        query: string,
        uri: string,
        containerName: string,
        packageName?: string
    ): WorkspaceSymbol[] {
        const symbols: WorkspaceSymbol[] = [];

        for (const pattern of nestedPatterns) {
            // Check pattern keyword
            if (pattern.keyword.toLowerCase().includes(query)) {
                symbols.push({
                    name: `${pattern.keyword} (nested)`,
                    kind: SymbolKind.Constructor,
                    location: Location.create(uri, this.astRangeToLspRange(pattern.range)),
                    containerName
                });
            }

            // Check pattern content
            if (pattern.content.toLowerCase().includes(query)) {
                const contentPreview = pattern.content.substring(0, 50) + 
                    (pattern.content.length > 50 ? '...' : '');
                symbols.push({
                    name: `${pattern.keyword}: ${contentPreview}`,
                    kind: SymbolKind.Constructor,
                    location: Location.create(uri, this.astRangeToLspRange(pattern.range)),
                    containerName
                });
            }

            // Recursively search deeper nested patterns
            symbols.push(...this.searchNestedPatterns(
                pattern.nestedPatterns,
                query,
                uri,
                `${containerName} > ${pattern.keyword}`,
                packageName
            ));

            // Search inner conditions
            symbols.push(...this.searchMultiLinePatterns(
                pattern.innerConditions,
                query,
                uri,
                `${containerName} > ${pattern.keyword}`,
                packageName
            ));
        }

        return symbols;
    }

    /**
     * Find definitions within conditions (for go-to-definition across multi-line patterns)
     */
    private findDefinitionInConditions(
        conditions: ConditionNode[],
        word: string,
        uri: string
    ): Location[] {
        const locations: Location[] = [];

        for (const condition of conditions) {
            // Check if the word matches a variable name
            if (condition.variable === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(condition.range)));
            }

            // Check if the word matches a fact type
            if (condition.factType === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(condition.range)));
            }

            // Check constraints for field names and values
            if (condition.constraints) {
                for (const constraint of condition.constraints) {
                    if (constraint.field === word || constraint.value === word) {
                        locations.push(Location.create(uri, this.astRangeToLspRange(constraint.range)));
                    }
                }
            }

            // Search within multi-line patterns
            if (condition.isMultiLine && condition.multiLinePattern) {
                const pattern = condition.multiLinePattern;
                
                // Check if word appears in pattern content
                if (pattern.content.includes(word)) {
                    locations.push(Location.create(uri, this.astRangeToLspRange(pattern.range)));
                }

                // Recursively search nested patterns
                locations.push(...this.findDefinitionInNestedPatterns(
                    pattern.nestedPatterns,
                    word,
                    uri
                ));

                // Search inner conditions
                locations.push(...this.findDefinitionInConditions(
                    pattern.innerConditions,
                    word,
                    uri
                ));
            }

            // Search nested conditions
            if (condition.nestedConditions) {
                locations.push(...this.findDefinitionInConditions(
                    condition.nestedConditions,
                    word,
                    uri
                ));
            }
        }

        return locations;
    }

    /**
     * Find definitions within nested patterns
     */
    private findDefinitionInNestedPatterns(
        nestedPatterns: MultiLinePatternNode[],
        word: string,
        uri: string
    ): Location[] {
        const locations: Location[] = [];

        for (const pattern of nestedPatterns) {
            // Check if word appears in pattern content
            if (pattern.content.includes(word)) {
                locations.push(Location.create(uri, this.astRangeToLspRange(pattern.range)));
            }

            // Recursively search deeper nested patterns
            locations.push(...this.findDefinitionInNestedPatterns(
                pattern.nestedPatterns,
                word,
                uri
            ));

            // Search inner conditions
            locations.push(...this.findDefinitionInConditions(
                pattern.innerConditions,
                word,
                uri
            ));
        }

        return locations;
    }

    /**
     * Convert AST range to LSP range
     */
    private astRangeToLspRange(astRange: any): Range {
        return {
            start: {
                line: astRange.start.line,
                character: astRange.start.character
            },
            end: {
                line: astRange.end.line,
                character: astRange.end.character
            }
        };
    }
}