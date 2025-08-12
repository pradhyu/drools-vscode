/**
 * Enhanced Java completion provider for comprehensive auto-completion
 * Provides intelligent Java API completion with full method signatures and documentation
 */

import {
    CompletionItem,
    CompletionItemKind,
    Position,
    InsertTextFormat,
    MarkupKind,
    CompletionList
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JavaAPIKnowledge, ClassDefinition, MethodDefinition } from '../knowledge/javaAPIKnowledge';
import { JavaKeywords } from '../documentation/javaKeywords';

export interface JavaCompletionContext {
    isInThenClause: boolean;
    currentWord: string;
    beforeCursor: string;
    afterCursor: string;
    line: string;
    position: Position;
}

export class JavaCompletionProvider {
    private static initialized = false;

    /**
     * Initialize the Java completion provider
     */
    public static initialize(): void {
        if (this.initialized) return;
        
        JavaAPIKnowledge.initialize();
        JavaKeywords.initialize();
        this.initialized = true;
    }

    /**
     * Provide comprehensive Java completions using API knowledge base
     */
    public static provideCompletions(
        document: TextDocument,
        position: Position,
        triggerCharacter?: string
    ): CompletionList {
        this.initialize();

        const context = this.analyzeContext(document, position);
        const completions: CompletionItem[] = [];

        // Handle different completion scenarios
        if (triggerCharacter === '.') {
            completions.push(...this.provideMemberCompletions(context));
        } else {
            completions.push(...this.provideGeneralCompletions(context));
        }

        return {
            items: completions,
            isIncomplete: false
        };
    }

    /**
     * Analyze the completion context
     */
    private static analyzeContext(document: TextDocument, position: Position): JavaCompletionContext {
        const line = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: position.character }
        });

        const beforeCursor = line;
        const afterCursor = document.getText({
            start: position,
            end: { line: position.line, character: line.length }
        });

        // Extract current word being typed
        const wordMatch = beforeCursor.match(/(\w*)$/);
        const currentWord = wordMatch ? wordMatch[1] : '';

        return {
            isInThenClause: this.isInThenClause(document, position),
            currentWord,
            beforeCursor,
            afterCursor,
            line: beforeCursor + afterCursor,
            position
        };
    }

    /**
     * Check if position is in then clause
     */
    private static isInThenClause(document: TextDocument, position: Position): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Look backwards for 'then' keyword
        for (let i = position.line; i >= 0; i--) {
            const line = lines[i];
            if (line.includes('then')) {
                return true;
            }
            if (line.includes('when') && i < position.line) {
                return false;
            }
        }
        
        return false;
    }

    /**
     * Provide member completions after dot notation
     */
    private static provideMemberCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];
        
        // Extract the object/class name before the dot
        const beforeDotMatch = context.beforeCursor.match(/(\w+)\.$/);
        if (!beforeDotMatch) return completions;
        
        const objectName = beforeDotMatch[1];
        
        // Try to determine the type and provide appropriate completions
        const typeCompletions = this.getCompletionsForType(objectName, context.currentWord);
        completions.push(...typeCompletions);
        
        return completions;
    }

    /**
     * Provide general completions (classes, keywords, etc.)
     */
    private static provideGeneralCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];
        
        // Add Java keywords
        completions.push(...this.getKeywordCompletions(context.currentWord));
        
        // Add Java classes from API knowledge base
        completions.push(...this.getClassCompletions(context.currentWord));
        
        // Add lambda expressions if in appropriate context
        if (this.isLambdaContext(context.beforeCursor)) {
            completions.push(...this.getLambdaCompletions());
        }
        
        return completions;
    }

    /**
     * Get keyword completions using JavaKeywords
     */
    private static getKeywordCompletions(currentWord: string): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Add Java keywords
        JavaKeywords.KEYWORDS.forEach(keyword => {
            if (keyword.toLowerCase().startsWith(currentWord.toLowerCase())) {
                completions.push({
                    label: keyword,
                    kind: CompletionItemKind.Keyword,
                    detail: 'Java keyword',
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `Java language keyword: \`${keyword}\``
                    },
                    insertText: keyword,
                    sortText: `1_${keyword}`
                });
            }
        });

        // Add Java literals
        JavaKeywords.LITERALS.forEach(literal => {
            if (literal.toLowerCase().startsWith(currentWord.toLowerCase())) {
                completions.push({
                    label: literal,
                    kind: CompletionItemKind.Value,
                    detail: 'Java literal',
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `Java literal value: \`${literal}\``
                    },
                    insertText: literal,
                    sortText: `1_${literal}`
                });
            }
        });

        return completions;
    }

    /**
     * Get class completions from API knowledge base
     */
    private static getClassCompletions(currentWord: string): CompletionItem[] {
        const completions: CompletionItem[] = [];
        const allClasses = JavaAPIKnowledge.getAllClasses();

        allClasses.forEach(classInfo => {
            if (classInfo.name.toLowerCase().startsWith(currentWord.toLowerCase())) {
                const methodNames = [
                    ...classInfo.methods.map(m => m.name),
                    ...classInfo.staticMethods.map(m => m.name)
                ].slice(0, 8); // Show first 8 methods

                completions.push({
                    label: classInfo.name,
                    kind: classInfo.isInterface ? CompletionItemKind.Interface : CompletionItemKind.Class,
                    detail: `${classInfo.package}.${classInfo.name}${classInfo.since ? ` (Java ${classInfo.since}+)` : ''}`,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${classInfo.name}**: ${classInfo.documentation}\n\n` +
                               `**Package**: \`${classInfo.package}\`\n\n` +
                               `**Common methods**: ${methodNames.map(m => `\`${m}()\``).join(', ')}`
                    },
                    insertText: classInfo.name,
                    sortText: `2_${classInfo.name}`
                });
            }
        });

        return completions;
    }

    /**
     * Get completions for a specific type (after dot notation)
     */
    private static getCompletionsForType(typeName: string, currentWord: string): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Try exact class match first
        let classInfo = JavaAPIKnowledge.getClass(typeName);
        
        // If no exact match, try pattern matching
        if (!classInfo) {
            classInfo = this.findClassByPattern(typeName);
        }

        if (classInfo) {
            // Add instance methods
            classInfo.methods.forEach(method => {
                if (method.name.toLowerCase().startsWith(currentWord.toLowerCase())) {
                    completions.push(this.createMethodCompletionItem(method, classInfo!.name));
                }
            });

            // Add static methods if accessing via class name
            if (this.isStaticAccess(typeName)) {
                classInfo.staticMethods.forEach(method => {
                    if (method.name.toLowerCase().startsWith(currentWord.toLowerCase())) {
                        completions.push(this.createMethodCompletionItem(method, classInfo!.name, true));
                    }
                });
            }

            // Add fields
            classInfo.fields.forEach(field => {
                if (field.name.toLowerCase().startsWith(currentWord.toLowerCase())) {
                    completions.push({
                        label: field.name,
                        kind: CompletionItemKind.Field,
                        detail: `${field.type} ${field.name}${field.isStatic ? ' (static)' : ''}`,
                        documentation: {
                            kind: MarkupKind.Markdown,
                            value: `**${field.name}**: ${field.documentation}`
                        },
                        insertText: field.name,
                        sortText: `1_${field.name}`
                    });
                }
            });
        }

        return completions;
    }

    /**
     * Find class by pattern matching (for variable names like 'list', 'map', etc.)
     */
    private static findClassByPattern(typeName: string): ClassDefinition | undefined {
        const lowerTypeName = typeName.toLowerCase();
        
        // Pattern matching for common variable naming conventions
        const patterns: { [key: string]: string } = {
            'string': 'String',
            'str': 'String',
            'list': 'List',
            'arraylist': 'ArrayList',
            'map': 'Map',
            'hashmap': 'HashMap',
            'set': 'Set',
            'hashset': 'HashSet',
            'optional': 'Optional',
            'stream': 'Stream',
            'date': 'LocalDate',
            'time': 'LocalTime',
            'datetime': 'LocalDateTime',
            'duration': 'Duration',
            'period': 'Period',
            'formatter': 'DateTimeFormatter',
            'builder': 'StringBuilder',
            'bigdecimal': 'BigDecimal',
            'math': 'Math',
            'system': 'System',
            'arrays': 'Arrays',
            'collections': 'Collections',
            'objects': 'Objects'
        };

        for (const [pattern, className] of Object.entries(patterns)) {
            if (lowerTypeName.includes(pattern)) {
                const classInfo = JavaAPIKnowledge.getClass(className);
                if (classInfo) return classInfo;
            }
        }

        return undefined;
    }

    /**
     * Check if this is static access (class name vs instance variable)
     */
    private static isStaticAccess(typeName: string): boolean {
        // If the first letter is uppercase, it's likely a class name (static access)
        return /^[A-Z]/.test(typeName);
    }

    /**
     * Create a completion item for a method
     */
    private static createMethodCompletionItem(method: MethodDefinition, className: string, isStatic = false): CompletionItem {
        // Create parameter snippet
        const paramSnippet = method.parameters.length > 0 
            ? method.parameters.map((param, index) => `\${${index + 1}:${param.name}}`).join(', ')
            : '';

        // Create method signature
        const paramSignature = method.parameters.map(param => 
            `${param.type} ${param.name}${param.optional ? '?' : ''}`
        ).join(', ');

        const signature = `${method.name}(${paramSignature}): ${method.returnType}`;

        return {
            label: method.name,
            kind: CompletionItemKind.Method,
            detail: `${signature}${isStatic ? ' (static)' : ''}${method.since ? ` (Java ${method.since}+)` : ''}`,
            documentation: {
                kind: MarkupKind.Markdown,
                value: `**${method.name}**: ${method.documentation}\n\n` +
                       `**Returns**: \`${method.returnType}\`\n\n` +
                       (method.parameters.length > 0 ? 
                        `**Parameters**:\n${method.parameters.map(p => `- \`${p.name}\` (${p.type}): ${p.description || 'No description'}`).join('\n')}\n\n` : '') +
                       (method.examples && method.examples.length > 0 ? 
                        `**Examples**:\n\`\`\`java\n${method.examples.join('\n')}\n\`\`\`` : '')
            },
            insertText: `${method.name}(${paramSnippet})`,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: `1_${method.name}`
        };
    }

    /**
     * Check if context suggests lambda expression
     */
    private static isLambdaContext(beforeCursor: string): boolean {
        return /\.(filter|map|forEach|reduce|anyMatch|allMatch|noneMatch)\s*\(\s*$/.test(beforeCursor) ||
               /\bstream\s*\(\s*\)\s*\.\s*$/.test(beforeCursor);
    }

    /**
     * Get lambda expression completions
     */
    private static getLambdaCompletions(): CompletionItem[] {
        return [
            {
                label: '-> (lambda)',
                kind: CompletionItemKind.Snippet,
                detail: 'Lambda expression',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Lambda expression with single parameter'
                },
                insertText: '${1:param} -> ${2:expression}',
                insertTextFormat: InsertTextFormat.Snippet,
                sortText: '0_lambda'
            },
            {
                label: '() -> (lambda)',
                kind: CompletionItemKind.Snippet,
                detail: 'Lambda expression (no parameters)',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Lambda expression with no parameters'
                },
                insertText: '() -> ${1:expression}',
                insertTextFormat: InsertTextFormat.Snippet,
                sortText: '0_lambda_no_params'
            },
            {
                label: '(,) -> (lambda)',
                kind: CompletionItemKind.Snippet,
                detail: 'Lambda expression (multiple parameters)',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Lambda expression with multiple parameters'
                },
                insertText: '(${1:param1}, ${2:param2}) -> ${3:expression}',
                insertTextFormat: InsertTextFormat.Snippet,
                sortText: '0_lambda_multi_params'
            },
            {
                label: ':: (method reference)',
                kind: CompletionItemKind.Snippet,
                detail: 'Method reference',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: 'Method reference syntax'
                },
                insertText: '${1:Class}::${2:method}',
                insertTextFormat: InsertTextFormat.Snippet,
                sortText: '0_method_reference'
            }
        ];
    }
}