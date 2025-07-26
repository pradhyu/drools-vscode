import {
    FoldingRange,
    FoldingRangeKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST, RuleNode, FunctionNode, AnyASTNode } from '../parser/ast';
import { ParseResult } from '../parser/droolsParser';

export interface FoldingSettings {
    enableRuleFolding: boolean;
    enableFunctionFolding: boolean;
    enableCommentFolding: boolean;
    enableImportFolding: boolean;
}

export class DroolsFoldingProvider {
    private settings: FoldingSettings;

    constructor(settings: Partial<FoldingSettings> = {}) {
        this.settings = {
            enableRuleFolding: true,
            enableFunctionFolding: true,
            enableCommentFolding: true,
            enableImportFolding: true,
            ...settings
        };
    }

    public provideFoldingRanges(
        document: TextDocument,
        parseResult: ParseResult
    ): FoldingRange[] {
        const foldingRanges: FoldingRange[] = [];

        try {
            // Add folding ranges for AST nodes
            if (parseResult.ast) {
                this.addASTFoldingRanges(foldingRanges, parseResult.ast);
            }

            // Add folding ranges for comments
            if (this.settings.enableCommentFolding) {
                this.addCommentFoldingRanges(foldingRanges, document);
            }

            // Add folding ranges for import blocks
            if (this.settings.enableImportFolding && parseResult.ast) {
                this.addImportFoldingRanges(foldingRanges, parseResult.ast);
            }

            // Sort folding ranges by start line
            foldingRanges.sort((a, b) => a.startLine - b.startLine);

            return foldingRanges;
        } catch (error) {
            console.error('Error providing folding ranges:', error);
            return [];
        }
    }

    private addASTFoldingRanges(foldingRanges: FoldingRange[], ast: DroolsAST): void {
        // Add folding ranges for rules
        if (this.settings.enableRuleFolding) {
            ast.rules.forEach(rule => {
                this.addRuleFoldingRange(foldingRanges, rule);
            });
        }

        // Add folding ranges for functions
        if (this.settings.enableFunctionFolding) {
            ast.functions.forEach(func => {
                this.addFunctionFoldingRange(foldingRanges, func);
            });
        }

        // Add folding ranges for queries
        ast.queries.forEach(query => {
            this.addQueryFoldingRange(foldingRanges, query);
        });

        // Add folding ranges for declare statements
        ast.declares.forEach(declare => {
            this.addDeclareFoldingRange(foldingRanges, declare);
        });
    }

    private addRuleFoldingRange(foldingRanges: FoldingRange[], rule: RuleNode): void {
        // Rules should be foldable from the rule declaration to the 'end' keyword
        const startLine = rule.range.start.line;
        const endLine = rule.range.end.line;

        // Only create folding range if the rule spans multiple lines
        if (endLine > startLine) {
            const foldingRange: FoldingRange = {
                startLine: startLine,
                endLine: endLine,
                kind: FoldingRangeKind.Region,
                collapsedText: `rule "${rule.name}"`
            };
            foldingRanges.push(foldingRange);
        }

        // Add folding ranges for when and then blocks within the rule
        if (rule.when && rule.when.range.end.line > rule.when.range.start.line) {
            foldingRanges.push({
                startLine: rule.when.range.start.line,
                endLine: rule.when.range.end.line,
                kind: FoldingRangeKind.Region,
                collapsedText: 'when...'
            });
        }

        if (rule.then && rule.then.range.end.line > rule.then.range.start.line) {
            foldingRanges.push({
                startLine: rule.then.range.start.line,
                endLine: rule.then.range.end.line,
                kind: FoldingRangeKind.Region,
                collapsedText: 'then...'
            });
        }
    }

    private addFunctionFoldingRange(foldingRanges: FoldingRange[], func: FunctionNode): void {
        const startLine = func.range.start.line;
        const endLine = func.range.end.line;

        // Only create folding range if the function spans multiple lines
        if (endLine > startLine) {
            const parameterList = func.parameters.map(p => `${p.dataType} ${p.name}`).join(', ');
            const foldingRange: FoldingRange = {
                startLine: startLine,
                endLine: endLine,
                kind: FoldingRangeKind.Region,
                collapsedText: `function ${func.returnType} ${func.name}(${parameterList})`
            };
            foldingRanges.push(foldingRange);
        }
    }

    private addQueryFoldingRange(foldingRanges: FoldingRange[], query: any): void {
        const startLine = query.range.start.line;
        const endLine = query.range.end.line;

        // Only create folding range if the query spans multiple lines
        if (endLine > startLine) {
            const foldingRange: FoldingRange = {
                startLine: startLine,
                endLine: endLine,
                kind: FoldingRangeKind.Region,
                collapsedText: `query "${query.name}"`
            };
            foldingRanges.push(foldingRange);
        }
    }

    private addDeclareFoldingRange(foldingRanges: FoldingRange[], declare: any): void {
        const startLine = declare.range.start.line;
        const endLine = declare.range.end.line;

        // Only create folding range if the declare spans multiple lines
        if (endLine > startLine) {
            const foldingRange: FoldingRange = {
                startLine: startLine,
                endLine: endLine,
                kind: FoldingRangeKind.Region,
                collapsedText: `declare ${declare.name}`
            };
            foldingRanges.push(foldingRange);
        }
    }

    private addCommentFoldingRanges(foldingRanges: FoldingRange[], document: TextDocument): void {
        const text = document.getText();
        const lines = text.split('\n');

        let blockCommentStart: number | null = null;
        let lineCommentStart: number | null = null;
        let consecutiveLineComments = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Handle block comments /* ... */
            if (line.includes('/*') && !blockCommentStart) {
                blockCommentStart = i;
            }
            if (line.includes('*/') && blockCommentStart !== null) {
                if (i > blockCommentStart) {
                    foldingRanges.push({
                        startLine: blockCommentStart,
                        endLine: i,
                        kind: FoldingRangeKind.Comment,
                        collapsedText: '/* ... */'
                    });
                }
                blockCommentStart = null;
            }

            // Handle line comments //
            if (line.startsWith('//')) {
                if (lineCommentStart === null) {
                    lineCommentStart = i;
                    consecutiveLineComments = 1;
                } else {
                    consecutiveLineComments++;
                }
            } else {
                // End of consecutive line comments
                if (lineCommentStart !== null && consecutiveLineComments >= 3) {
                    foldingRanges.push({
                        startLine: lineCommentStart,
                        endLine: i - 1,
                        kind: FoldingRangeKind.Comment,
                        collapsedText: `// ... (${consecutiveLineComments} lines)`
                    });
                }
                lineCommentStart = null;
                consecutiveLineComments = 0;
            }
        }

        // Handle case where file ends with consecutive line comments
        if (lineCommentStart !== null && consecutiveLineComments >= 3) {
            foldingRanges.push({
                startLine: lineCommentStart,
                endLine: lines.length - 1,
                kind: FoldingRangeKind.Comment,
                collapsedText: `// ... (${consecutiveLineComments} lines)`
            });
        }
    }

    private addImportFoldingRanges(foldingRanges: FoldingRange[], ast: DroolsAST): void {
        if (ast.imports.length <= 1) {
            return; // No need to fold single import or no imports
        }

        // Group consecutive imports
        let importGroupStart: number | null = null;
        let lastImportLine = -1;

        ast.imports.forEach((importNode, index) => {
            const currentLine = importNode.range.start.line;

            if (importGroupStart === null) {
                importGroupStart = currentLine;
            } else if (currentLine > lastImportLine + 1) {
                // Gap in imports, end current group and start new one
                if (lastImportLine > importGroupStart) {
                    foldingRanges.push({
                        startLine: importGroupStart,
                        endLine: lastImportLine,
                        kind: FoldingRangeKind.Imports,
                        collapsedText: `imports... (${index} items)`
                    });
                }
                importGroupStart = currentLine;
            }

            lastImportLine = currentLine;

            // Handle last import
            if (index === ast.imports.length - 1 && importGroupStart !== null && lastImportLine > importGroupStart) {
                foldingRanges.push({
                    startLine: importGroupStart,
                    endLine: lastImportLine,
                    kind: FoldingRangeKind.Imports,
                    collapsedText: `imports... (${ast.imports.length} items)`
                });
            }
        });
    }
}