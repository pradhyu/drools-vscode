/**
 * Enhanced hover provider with documentation support
 * Provides rich hover information for Drools keywords, Java methods, and functions
 */

import { Hover, Position, MarkupContent, MarkupKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsAST } from '../parser/ast';
import { ParseResult } from '../parser/droolsParser';
import { DroolsDocumentation, DroolsKeywordDoc, DroolsFunctionDoc } from '../documentation/droolsDocumentation';
import { JavaDocumentation, JavaClassDoc, JavaMethodDoc } from '../documentation/javaDocumentation';
import { JavaKeywords } from '../documentation/javaKeywords';
import { EnhancedSyntaxHighlighter } from '../utils/enhancedSyntaxHighlighter';

export interface HoverContext {
    word: string;
    line: string;
    lineNumber: number;
    character: number;
    isInWhenClause: boolean;
    isInThenClause: boolean;
    isInRuleHeader: boolean;
}

export class EnhancedHoverProvider {
    /**
     * Provide hover information for the given position
     */
    public static provideHover(
        document: TextDocument,
        position: Position,
        parseResult: ParseResult
    ): Hover | null {
        try {
            const context = this.getHoverContext(document, position);
            if (!context) return null;

            // Try different hover providers in order of priority
            return (
                this.provideDroolsKeywordHover(context) ||
                this.provideDroolsFunctionHover(context) ||
                this.provideJavaKeywordHover(context) ||
                this.provideJavaMethodHover(context) ||
                this.provideJavaClassHover(context) ||
                this.provideVariableHover(context, parseResult) ||
                null
            );
        } catch (error) {
            console.error('Error providing hover:', error);
            return null;
        }
    }

    /**
     * Get hover context from document and position
     */
    private static getHoverContext(document: TextDocument, position: Position): HoverContext | null {
        const line = document.getText({
            start: { line: position.line, character: 0 },
            end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
        });

        const word = this.getWordAtPosition(line, position.character);
        if (!word) return null;

        // Determine context within rule structure
        const fullText = document.getText();
        const lines = fullText.split('\n');
        const { isInWhenClause, isInThenClause, isInRuleHeader } = this.analyzeRuleContext(lines, position.line);

        return {
            word,
            line,
            lineNumber: position.line,
            character: position.character,
            isInWhenClause,
            isInThenClause,
            isInRuleHeader
        };
    }

    /**
     * Get word at specific character position
     */
    private static getWordAtPosition(line: string, character: number): string {
        // Updated regex to include hyphens for Drools attributes like no-loop, lock-on-active
        const wordRegex = /[$a-zA-Z_][$a-zA-Z0-9_-]*/g;
        let match;
        
        while ((match = wordRegex.exec(line)) !== null) {
            if (character >= match.index && character <= match.index + match[0].length) {
                return match[0];
            }
        }
        
        return '';
    }

    /**
     * Analyze rule context to determine where we are in the rule structure
     */
    private static analyzeRuleContext(lines: string[], currentLine: number): {
        isInWhenClause: boolean;
        isInThenClause: boolean;
        isInRuleHeader: boolean;
    } {
        let isInWhenClause = false;
        let isInThenClause = false;
        let isInRuleHeader = false;
        let inRule = false;

        // Look backwards to find rule context
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i].trim();
            
            if (line.startsWith('rule ')) {
                inRule = true;
                if (i === currentLine) {
                    isInRuleHeader = true;
                }
                break;
            } else if (line === 'when') {
                isInWhenClause = true;
                break;
            } else if (line === 'then') {
                isInThenClause = true;
                break;
            } else if (line === 'end') {
                break;
            }
        }

        // If we didn't find when/then, check if we're between them
        if (inRule && !isInWhenClause && !isInThenClause && !isInRuleHeader) {
            let foundWhen = false;
            let foundThen = false;
            
            for (let i = 0; i <= currentLine; i++) {
                const line = lines[i].trim();
                if (line === 'when') foundWhen = true;
                if (line === 'then') foundThen = true;
            }
            
            if (foundWhen && !foundThen) {
                isInWhenClause = true;
            } else if (foundThen) {
                isInThenClause = true;
            }
        }

        return { isInWhenClause, isInThenClause, isInRuleHeader };
    }

    /**
     * Provide hover for Drools keywords
     */
    private static provideDroolsKeywordHover(context: HoverContext): Hover | null {
        const keywordDoc = DroolsDocumentation.getKeywordDoc(context.word);
        if (!keywordDoc) return null;

        const content = this.formatDroolsKeywordHover(keywordDoc);
        
        return {
            contents: content,
            range: this.getWordRange(context)
        };
    }

    /**
     * Provide hover for Drools functions
     */
    private static provideDroolsFunctionHover(context: HoverContext): Hover | null {
        const functionDoc = DroolsDocumentation.getFunctionDoc(context.word);
        if (!functionDoc) return null;

        const content = this.formatDroolsFunctionHover(functionDoc);
        
        return {
            contents: content,
            range: this.getWordRange(context)
        };
    }

    /**
     * Provide hover for Java keywords and built-in classes
     */
    private static provideJavaKeywordHover(context: HoverContext): Hover | null {
        // Initialize Java keywords if not already done
        JavaKeywords.initialize();
        
        // Check if it's a Java keyword
        if (JavaKeywords.isKeyword(context.word)) {
            const content: MarkupContent = {
                kind: MarkupKind.Markdown,
                value: `### ☕ Java Keyword: \`${context.word}\`

**Description:** Java language keyword

**Usage:** This is a reserved word in Java with special meaning to the compiler.

**Example:**
\`\`\`java
${this.getJavaKeywordExample(context.word)}
\`\`\``
            };
            
            return {
                contents: content,
                range: this.getWordRange(context)
            };
        }
        
        // Check if it's a Java literal
        if (JavaKeywords.isLiteral(context.word)) {
            const content: MarkupContent = {
                kind: MarkupKind.Markdown,
                value: `### ☕ Java Literal: \`${context.word}\`

**Description:** Java literal value

**Usage:** This is a built-in literal value in Java.

**Example:**
\`\`\`java
${this.getJavaLiteralExample(context.word)}
\`\`\``
            };
            
            return {
                contents: content,
                range: this.getWordRange(context)
            };
        }
        
        return null;
    }

    /**
     * Provide hover for Java methods
     */
    private static provideJavaMethodHover(context: HoverContext): Hover | null {
        if (!context.isInThenClause) return null;

        // Try to detect method calls like System.out.println or obj.method()
        const methodMatch = context.line.match(/(\w+)\.(\w+)\s*\(/);
        if (!methodMatch) return null;

        const [, className, methodName] = methodMatch;
        const methodSignature = `${className}.${methodName}`;
        
        const methodDoc = JavaDocumentation.getMethodDoc(methodSignature);
        if (!methodDoc) return null;

        const content = this.formatJavaMethodHover(methodDoc);
        
        return {
            contents: content,
            range: this.getWordRange(context)
        };
    }

    /**
     * Provide hover for Java classes
     */
    private static provideJavaClassHover(context: HoverContext): Hover | null {
        if (!context.isInThenClause && !context.isInWhenClause) return null;

        const classDoc = JavaDocumentation.getClassDoc(context.word);
        if (!classDoc) return null;

        const content = this.formatJavaClassHover(classDoc);
        
        return {
            contents: content,
            range: this.getWordRange(context)
        };
    }

    /**
     * Provide hover for variables
     */
    private static provideVariableHover(context: HoverContext, parseResult: ParseResult): Hover | null {
        if (!context.word.startsWith('$')) return null;

        // This would analyze the AST to find variable declarations and usage
        // For now, provide basic variable information
        const content: MarkupContent = {
            kind: MarkupKind.Markdown,
            value: `### 🔧 Drools Variable: \`${context.word}\`

**Type:** Variable binding

**Context:** ${context.isInWhenClause ? 'When clause (LHS)' : context.isInThenClause ? 'Then clause (RHS)' : 'Unknown'}

**Usage:** Variables in Drools must be declared in the when clause before being used in the then clause.

**Example:**
\`\`\`drools
when
    ${context.word} : Customer(age >= 18)
then
    ${context.word}.setStatus("ADULT");
    update(${context.word});
end
\`\`\``
        };

        return {
            contents: content,
            range: this.getWordRange(context)
        };
    }

    /**
     * Format Drools keyword hover content
     */
    private static formatDroolsKeywordHover(keywordDoc: DroolsKeywordDoc): MarkupContent {
        let content = `### 📘 Drools Keyword: \`${keywordDoc.keyword}\`

**Category:** ${keywordDoc.category}

**Description:** ${keywordDoc.description}

**Syntax:**
\`\`\`drools
${keywordDoc.syntax}
\`\`\`

**Example:**
\`\`\`drools
${keywordDoc.example}
\`\`\``;

        if (keywordDoc.relatedKeywords && keywordDoc.relatedKeywords.length > 0) {
            content += `\n\n**Related Keywords:** ${keywordDoc.relatedKeywords.map(k => `\`${k}\``).join(', ')}`;
        }

        return {
            kind: MarkupKind.Markdown,
            value: content
        };
    }

    /**
     * Format Drools function hover content
     */
    private static formatDroolsFunctionHover(functionDoc: DroolsFunctionDoc): MarkupContent {
        let content = `### 🔧 Drools Function: \`${functionDoc.name}\`

**Category:** ${functionDoc.category}

**Description:** ${functionDoc.description}

**Return Type:** \`${functionDoc.returnType}\``;

        if (functionDoc.parameters.length > 0) {
            content += '\n\n**Parameters:**\n';
            functionDoc.parameters.forEach(param => {
                const optional = param.optional ? ' (optional)' : '';
                content += `- \`${param.name}\`: \`${param.type}\`${optional} - ${param.description}\n`;
            });
        }

        content += `\n**Example:**
\`\`\`java
${functionDoc.example}
\`\`\``;

        return {
            kind: MarkupKind.Markdown,
            value: content
        };
    }

    /**
     * Format Java method hover content
     */
    private static formatJavaMethodHover(methodDoc: JavaMethodDoc): MarkupContent {
        let content = `### ☕ Java Method: \`${methodDoc.className}.${methodDoc.methodName}\`

**Class:** \`${methodDoc.className}\`

**Description:** ${methodDoc.description}

**Return Type:** \`${methodDoc.returnType}\``;

        if (methodDoc.parameters.length > 0) {
            content += '\n\n**Parameters:**\n';
            methodDoc.parameters.forEach(param => {
                content += `- \`${param.name}\`: \`${param.type}\` - ${param.description}\n`;
            });
        }

        if (methodDoc.exceptions && methodDoc.exceptions.length > 0) {
            content += `\n**Throws:** ${methodDoc.exceptions.map(e => `\`${e}\``).join(', ')}`;
        }

        content += `\n\n**Example:**
\`\`\`java
${methodDoc.example}
\`\`\``;

        if (methodDoc.since) {
            content += `\n\n**Since:** Java ${methodDoc.since}`;
        }

        return {
            kind: MarkupKind.Markdown,
            value: content
        };
    }

    /**
     * Format Java class hover content
     */
    private static formatJavaClassHover(classDoc: JavaClassDoc): MarkupContent {
        let content = `### ☕ Java Class: \`${classDoc.className}\`

**Package:** \`${classDoc.packageName}\`

**Description:** ${classDoc.description}`;

        if (classDoc.commonMethods.length > 0) {
            content += `\n\n**Common Methods:** ${classDoc.commonMethods.map(m => `\`${m}\``).join(', ')}`;
        }

        content += `\n\n**Example:**
\`\`\`java
${classDoc.example}
\`\`\``;

        if (classDoc.since) {
            content += `\n\n**Since:** Java ${classDoc.since}`;
        }

        if (classDoc.deprecated) {
            content += '\n\n⚠️ **Deprecated:** This class is deprecated and should not be used in new code.';
        }

        return {
            kind: MarkupKind.Markdown,
            value: content
        };
    }

    /**
     * Get word range for hover
     */
    private static getWordRange(context: HoverContext): { start: Position; end: Position } {
        const wordStart = context.line.lastIndexOf(context.word, context.character);
        const wordEnd = wordStart + context.word.length;

        return {
            start: { line: context.lineNumber, character: wordStart },
            end: { line: context.lineNumber, character: wordEnd }
        };
    }

    /**
     * Get Java keyword example
     */
    private static getJavaKeywordExample(keyword: string): string {
        const examples: { [key: string]: string } = {
            'if': 'if (condition) { /* code */ }',
            'else': 'if (condition) { /* code */ } else { /* other code */ }',
            'for': 'for (int i = 0; i < 10; i++) { /* code */ }',
            'while': 'while (condition) { /* code */ }',
            'try': 'try { /* code */ } catch (Exception e) { /* handle */ }',
            'catch': 'try { /* code */ } catch (Exception e) { /* handle */ }',
            'finally': 'try { /* code */ } finally { /* cleanup */ }',
            'return': 'return value;',
            'break': 'for (int i = 0; i < 10; i++) { if (condition) break; }',
            'continue': 'for (int i = 0; i < 10; i++) { if (condition) continue; }',
            'new': 'List<String> list = new ArrayList<>();',
            'this': 'this.field = value;',
            'super': 'super.method();',
            'static': 'public static void main(String[] args) { }',
            'final': 'final String CONSTANT = "value";',
            'public': 'public class MyClass { }',
            'private': 'private String field;',
            'protected': 'protected void method() { }',
            'class': 'public class MyClass { }',
            'interface': 'public interface MyInterface { }',
            'extends': 'public class Child extends Parent { }',
            'implements': 'public class MyClass implements MyInterface { }',
            'var': 'var list = new ArrayList<String>();',
            'instanceof': 'if (obj instanceof String) { }',
            'synchronized': 'synchronized (lock) { /* code */ }',
            'volatile': 'private volatile boolean flag;',
            'transient': 'private transient String temp;',
            'abstract': 'public abstract class AbstractClass { }',
            'enum': 'public enum Color { RED, GREEN, BLUE }',
            'switch': 'switch (value) { case 1: break; default: break; }',
            'case': 'switch (value) { case 1: /* code */ break; }',
            'default': 'switch (value) { default: /* code */ break; }',
            'throw': 'throw new IllegalArgumentException("message");',
            'throws': 'public void method() throws Exception { }',
            'import': 'import java.util.List;',
            'package': 'package com.example;'
        };
        
        return examples[keyword] || `${keyword} example;`;
    }

    /**
     * Get Java literal example
     */
    private static getJavaLiteralExample(literal: string): string {
        const examples: { [key: string]: string } = {
            'true': 'boolean flag = true;',
            'false': 'boolean flag = false;',
            'null': 'String str = null; if (str != null) { /* code */ }'
        };
        
        return examples[literal] || `${literal} example;`;
    }
}