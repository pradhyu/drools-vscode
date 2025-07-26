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
    AnyASTNode
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
     * Provide workspace symbols for cross-file navigation
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
     * Find definition in a specific document
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
        }

        // Check declares
        for (const declare of ast.declares) {
            if (declare.name === word) {
                locations.push(Location.create(uri, this.astRangeToLspRange(declare.range)));
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
     * Create rule symbol
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

        // Add when clause
        if (rule.when) {
            children.push({
                name: `when (${rule.when.conditions.length} conditions)`,
                kind: SymbolKind.Object,
                range: this.astRangeToLspRange(rule.when.range),
                selectionRange: this.astRangeToLspRange(rule.when.range),
                children: rule.when.conditions.map(condition => ({
                    name: condition.content.substring(0, 50) + (condition.content.length > 50 ? '...' : ''),
                    kind: SymbolKind.Field,
                    range: this.astRangeToLspRange(condition.range),
                    selectionRange: this.astRangeToLspRange(condition.range),
                    children: []
                }))
            });
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