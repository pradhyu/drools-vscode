/**
 * Tests for Enhanced Syntax Highlighter
 */

import { EnhancedSyntaxHighlighter, TooltipContent } from '../../src/server/utils/enhancedSyntaxHighlighter';
import { ThemeManager } from '../../src/server/utils/themeManager';

describe('EnhancedSyntaxHighlighter', () => {
    beforeEach(() => {
        // Reset theme to default
        ThemeManager.setTheme('dark');
    });

    describe('generateTooltipMarkdown', () => {
        it('should generate basic tooltip with title and description', () => {
            const content: TooltipContent = {
                title: 'Test Error',
                description: 'This is a test error message'
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);

            expect(result.kind).toBe('markdown');
            expect(result.value).toContain('### ⚠️ Test Error');
            expect(result.value).toContain('This is a test error message');
        });

        it('should include position information when provided', () => {
            const content: TooltipContent = {
                title: 'Test Error',
                description: 'This is a test error message',
                position: '[Line 5, Col 10-15]'
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);

            expect(result.value).toContain('**[Line 5, Col 10-15]**');
        });

        it('should include code context with syntax highlighting', () => {
            const content: TooltipContent = {
                title: 'Java Error',
                description: 'Capitalization error',
                codeContext: {
                    language: 'java',
                    content: 'System.out.println("Hello");',
                    errorToken: 'system'
                }
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);

            expect(result.value).toContain('**Code Context:**');
            expect(result.value).toContain('```java');
            expect(result.value).toContain('*System*');
            expect(result.value).toContain('**println**');
        });

        it('should include suggestions when provided', () => {
            const content: TooltipContent = {
                title: 'Test Error',
                description: 'Error description',
                suggestion: {
                    type: 'replacement',
                    incorrect: 'system',
                    correct: 'System',
                    explanation: 'Java classes start with capital letters'
                }
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);

            expect(result.value).toContain('**Suggestion:**');
            expect(result.value).toContain('Replace **`system`** with **`System`**');
            expect(result.value).toContain('Java classes start with capital letters');
        });

        it('should include before/after comparison when provided', () => {
            const content: TooltipContent = {
                title: 'Test Error',
                description: 'Error description',
                comparison: {
                    before: 'system.out.println("test");',
                    after: 'System.out.println("test");',
                    language: 'java'
                }
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);

            expect(result.value).toContain('**Comparison:**');
            expect(result.value).toContain('**Before:**');
            expect(result.value).toContain('**After:**');
        });

        it('should include tips when provided', () => {
            const content: TooltipContent = {
                title: 'Test Error',
                description: 'Error description',
                tip: 'Use proper capitalization for Java classes'
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);

            expect(result.value).toContain('💡 **Tip:** Use proper capitalization for Java classes');
        });
    });

    describe('formatCodeBlock', () => {
        it('should format Java code with syntax highlighting', () => {
            const code = 'System.out.println("Hello World");';
            const result = EnhancedSyntaxHighlighter.formatCodeBlock(code, 'java');

            expect(result).toContain('```java');
            expect(result).toContain('*System*');
            expect(result).toContain('**println**');
            expect(result).toContain('`"Hello World"`');
        });

        it('should format Drools code with syntax highlighting', () => {
            const code = 'rule "Test" when $p : Person() then end';
            const result = EnhancedSyntaxHighlighter.formatCodeBlock(code, 'drools');

            expect(result).toContain('```drools');
            expect(result).toContain('**rule**');
            expect(result).toContain('**when**');
            expect(result).toContain('**then**');
            expect(result).toContain('**end**');
            expect(result).toContain('*$p*');
            expect(result).toContain('*Person*');
        });

        it('should highlight error tokens with strikethrough', () => {
            const code = 'system.out.println("test");';
            const result = EnhancedSyntaxHighlighter.formatCodeBlock(code, 'java', {
                highlightErrorToken: 'system'
            });

            expect(result).toContain('~~**system**~~');
        });

        it('should add line numbers when requested', () => {
            const code = 'line1\nline2\nline3';
            const result = EnhancedSyntaxHighlighter.formatCodeBlock(code, 'generic', {
                showLineNumbers: true
            });

            expect(result).toContain(' 1: line1');
            expect(result).toContain(' 2: line2');
            expect(result).toContain(' 3: line3');
        });

        it('should truncate long code blocks', () => {
            const longCode = Array(15).fill('line').map((l, i) => `${l}${i}`).join('\n');
            const result = EnhancedSyntaxHighlighter.formatCodeBlock(longCode, 'generic', {
                maxLines: 5
            });

            expect(result).toContain('... (truncated)');
        });
    });

    describe('extractCodeContext', () => {
        const lines = [
            'package com.example;',
            '',
            'public class Test {',
            '    public void method() {',
            '        system.out.println("Hello");',
            '        System.out.println("World");',
            '    }',
            '}'
        ];

        it('should extract code context around error line', () => {
            const result = EnhancedSyntaxHighlighter.extractCodeContext(
                lines, 4, 8, 14, 2, 'java'
            );

            expect(result).toContain('3: public class Test {');
            expect(result).toContain('4:     public void method() {');
            expect(result).toContain('5:         ~~**system**~~.out.println("Hello");');
            expect(result).toContain('6:         System.out.println("World");');
            expect(result).toContain('7:     }');
        });

        it('should handle edge cases at file boundaries', () => {
            const result = EnhancedSyntaxHighlighter.extractCodeContext(
                lines, 0, 0, 7, 2, 'java'
            );

            expect(result).toContain('1: ~~**package**~~');
            expect(result).toContain('2: ');
            expect(result).toContain('3: public class Test {');
        });
    });

    describe('createInteractiveTooltip', () => {
        it('should create interactive tooltip with actions', () => {
            const actions = [
                { label: 'Quick Fix', command: 'editor.action.quickFix' },
                { label: 'Show Details', command: 'drools.showDetails' }
            ];

            const result = EnhancedSyntaxHighlighter.createInteractiveTooltip(
                'Test Error',
                'Error description',
                'System.out.println("test");',
                'java',
                actions
            );

            expect(result.value).toContain('### ⚠️ Test Error');
            expect(result.value).toContain('Error description');
            expect(result.value).toContain('**Actions:**');
            expect(result.value).toContain('[Quick Fix](command:editor.action.quickFix)');
            expect(result.value).toContain('[Show Details](command:drools.showDetails)');
        });
    });

    describe('createQuickFixTooltip', () => {
        it('should create quick fix tooltip with multiple fixes', () => {
            const fixes = [
                {
                    title: 'Capitalize System',
                    description: 'Change system to System',
                    code: 'System.out.println("test");'
                },
                {
                    title: 'Use logger instead',
                    description: 'Replace with logger call',
                    code: 'logger.info("test");'
                }
            ];

            const result = EnhancedSyntaxHighlighter.createQuickFixTooltip(
                'Capitalization Error',
                fixes
            );

            expect(result.value).toContain('### 🔧 Quick Fix: Capitalization Error');
            expect(result.value).toContain('**1. Capitalize System**');
            expect(result.value).toContain('**2. Use logger instead**');
            expect(result.value).toContain('Change system to System');
            expect(result.value).toContain('Replace with logger call');
        });
    });

    describe('theme integration', () => {
        it('should adapt to light theme', () => {
            ThemeManager.setTheme('light');
            
            const content: TooltipContent = {
                title: 'Test Error',
                description: 'Error description'
            };

            const result = EnhancedSyntaxHighlighter.generateTooltipMarkdown(content);
            
            // Should use light theme styling
            expect(result.value).toBeDefined();
        });

        it('should adapt to high contrast theme', () => {
            ThemeManager.setTheme('high-contrast');
            
            const result = EnhancedSyntaxHighlighter.createInteractiveTooltip(
                'Test Error',
                'Error description'
            );

            // Should use text-based icons for high contrast
            expect(result.value).toContain('[!]');
        });
    });

    describe('performance and validation', () => {
        it('should validate content size and truncate if needed', () => {
            const longContent = 'a'.repeat(6000);
            const result = EnhancedSyntaxHighlighter.validateContentSize(longContent, 5000);

            expect(result.length).toBeLessThanOrEqual(5100); // 5000 + truncation message
            expect(result).toContain('... (content truncated for performance)');
        });

        it('should handle empty and null inputs gracefully', () => {
            expect(() => {
                EnhancedSyntaxHighlighter.formatCodeBlock('', 'java');
            }).not.toThrow();

            expect(() => {
                EnhancedSyntaxHighlighter.extractCodeContext([], 0, 0, 0);
            }).not.toThrow();
        });
    });
});