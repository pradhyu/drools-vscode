/**
 * Enhanced syntax highlighter for diagnostic tooltips with VSCode integration
 * Provides rich Markdown-based syntax highlighting for error tooltips and gutter indicators
 */

import { MarkupContent, MarkupKind } from 'vscode-languageserver/node';
import { ThemeManager } from './themeManager';

export interface HighlightTheme {
    keyword: string;
    type: string;
    variable: string;
    string: string;
    number: string;
    operator: string;
    error: string;
    comment: string;
    background: string;
    foreground: string;
}

export interface TooltipContent {
    title: string;
    description: string;
    codeContext?: {
        language: 'java' | 'drools' | 'generic';
        content: string;
        errorLine?: number;
        errorToken?: string;
    };
    suggestion?: {
        type: 'replacement' | 'addition' | 'removal';
        incorrect: string;
        correct: string;
        explanation: string;
    };
    comparison?: {
        before: string;
        after: string;
        language: 'java' | 'drools' | 'generic';
    };
    tip?: string;
    position?: string;
}

export interface HighlightOptions {
    language?: 'java' | 'drools' | 'generic';
    showLineNumbers?: boolean;
    highlightErrorToken?: string;
    theme?: 'light' | 'dark' | 'auto';
    maxLines?: number;
}

export class EnhancedSyntaxHighlighter {
    /**
     * Generate a rich MarkupContent tooltip for VSCode
     */
    public static generateTooltipMarkdown(content: TooltipContent, options: HighlightOptions = {}): MarkupContent {
        let tooltipContent = '';

        // Apply theme-aware styling
        const theme = ThemeManager.getCurrentTheme();
        const severityColor = content.title.includes('Error') ? theme.colors.error :
                             content.title.includes('Warning') ? theme.colors.warning :
                             theme.colors.info;

        // Header with icon and title
        tooltipContent += this.formatHeader(content.title, content.position, severityColor);

        // Main description
        tooltipContent += `\n\n${content.description}`;

        // Code context with syntax highlighting
        if (content.codeContext) {
            tooltipContent += '\n\n**Code Context:**\n';
            tooltipContent += this.formatCodeBlock(
                content.codeContext.content,
                content.codeContext.language,
                {
                    ...options,
                    highlightErrorToken: content.codeContext.errorToken,
                    showLineNumbers: true
                }
            );
        }

        // Suggestion section
        if (content.suggestion) {
            tooltipContent += '\n\n**Suggestion:**\n';
            tooltipContent += this.formatSuggestion(content.suggestion);
        }

        // Before/After comparison
        if (content.comparison) {
            tooltipContent += '\n\n**Comparison:**\n';
            tooltipContent += this.formatComparison(
                content.comparison.before,
                content.comparison.after,
                content.comparison.language
            );
        }

        // Helpful tip
        if (content.tip) {
            tooltipContent += `\n\n💡 **Tip:** ${content.tip}`;
        }

        // Apply theme styling
        tooltipContent = ThemeManager.applyThemeToMarkdown(tooltipContent);

        return {
            kind: MarkupKind.Markdown,
            value: tooltipContent
        };
    }

    /**
     * Format header with icon and position information
     */
    private static formatHeader(title: string, position?: string, color?: string): string {
        const theme = ThemeManager.getCurrentTheme();
        const icon = theme.type === 'high-contrast' ? '[!]' : '⚠️';
        
        let header = `### ${icon} ${title}`;
        if (position) {
            header += ` **${position}**`;
        }
        return header;
    }

    /**
     * Format a code block with syntax highlighting
     */
    public static formatCodeBlock(
        code: string,
        language: 'java' | 'drools' | 'generic',
        options: HighlightOptions = {}
    ): string {
        const {
            showLineNumbers = false,
            highlightErrorToken,
            maxLines = 10
        } = options;

        let highlighted = code;

        // Apply language-specific highlighting
        switch (language) {
            case 'java':
                highlighted = this.highlightJava(highlighted);
                break;
            case 'drools':
                highlighted = this.highlightDrools(highlighted);
                break;
            default:
                highlighted = this.highlightGeneric(highlighted);
        }

        // Highlight error token if provided
        if (highlightErrorToken) {
            highlighted = this.highlightErrorToken(highlighted, highlightErrorToken);
        }

        // Add line numbers if requested
        if (showLineNumbers) {
            highlighted = this.addLineNumbers(highlighted);
        }

        // Limit lines for performance
        const lines = highlighted.split('\n');
        if (lines.length > maxLines) {
            highlighted = lines.slice(0, maxLines).join('\n') + '\n... (truncated)';
        }

        // Wrap in code block
        return '```' + language + '\n' + highlighted + '\n```';
    }

    /**
     * Highlight Java code with enhanced formatting
     */
    private static highlightJava(code: string): string {
        let highlighted = code;

        // Java keywords with stronger emphasis
        const javaKeywords = [
            'public', 'private', 'protected', 'static', 'final', 'abstract',
            'class', 'interface', 'extends', 'implements', 'import', 'package',
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
            'try', 'catch', 'finally', 'throw', 'throws', 'return', 'break', 'continue',
            'new', 'this', 'super', 'null', 'true', 'false', 'instanceof', 'void'
        ];

        // Highlight keywords with bold formatting
        javaKeywords.forEach(keyword => {
            const regex = new RegExp('\\b' + keyword + '\\b', 'g');
            highlighted = highlighted.replace(regex, `**${keyword}**`);
        });

        // Java built-in types with italic formatting
        const javaTypes = [
            'String', 'Integer', 'Boolean', 'Double', 'Float', 'Long', 'Short',
            'Byte', 'Character', 'Object', 'List', 'Map', 'Set', 'ArrayList',
            'HashMap', 'HashSet', 'System', 'Math', 'Collections'
        ];

        javaTypes.forEach(type => {
            const regex = new RegExp('\\b' + type + '\\b', 'g');
            highlighted = highlighted.replace(regex, `*${type}*`);
        });

        // Method calls with special formatting
        highlighted = highlighted.replace(/\.([a-zA-Z_][a-zA-Z0-9_]*)\(/g, '.**$1**(');

        // String literals with backticks
        highlighted = highlighted.replace(/"([^"]*)"/g, '`"$1"`');
        highlighted = highlighted.replace(/'([^']*)'/g, "`'$1'`");

        // Numbers with backticks
        highlighted = highlighted.replace(/\b\d+(\.\d+)?[fFdDlL]?\b/g, '`$&`');

        // Operators with bold formatting
        highlighted = highlighted.replace(/([=!<>]=?|[+\-*/%]|&&|\|\||!)/g, '**$1**');

        // Comments with italic formatting
        highlighted = highlighted.replace(/\/\/.*$/gm, '*$&*');
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '*$&*');

        return highlighted;
    }

    /**
     * Highlight Drools code with enhanced formatting
     */
    private static highlightDrools(code: string): string {
        let highlighted = code;

        // Drools keywords with bold formatting
        const droolsKeywords = [
            'rule', 'when', 'then', 'end', 'and', 'or', 'not', 'exists',
            'forall', 'collect', 'accumulate', 'eval', 'from', 'in',
            'matches', 'contains', 'memberOf', 'soundslike', 'str',
            'package', 'import', 'global', 'function', 'query', 'declare',
            'salience', 'no-loop', 'ruleflow-group', 'agenda-group'
        ];

        droolsKeywords.forEach(keyword => {
            const regex = new RegExp('\\b' + keyword + '\\b', 'g');
            highlighted = highlighted.replace(regex, `**${keyword}**`);
        });

        // Variables (starting with $) with italic formatting
        highlighted = highlighted.replace(/\$[a-zA-Z_][a-zA-Z0-9_]*/g, '*$&*');

        // Fact types (capitalized words) with italic formatting
        highlighted = highlighted.replace(/\b[A-Z][a-zA-Z0-9_]*(?=\s*\()/g, '*$&*');

        // Operators with bold formatting
        const operators = ['==', '!=', '<=', '>=', '<', '>', '&&', '\\|\\|', '!', ':', '->'];
        operators.forEach(op => {
            const regex = new RegExp(this.escapeRegex(op), 'g');
            highlighted = highlighted.replace(regex, `**${op}**`);
        });

        // String literals with backticks
        highlighted = highlighted.replace(/"([^"]*)"/g, '`"$1"`');
        highlighted = highlighted.replace(/'([^']*)'/g, "`'$1'`");

        // Numbers with backticks
        highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, '`$&`');

        // Comments with italic formatting
        highlighted = highlighted.replace(/\/\/.*$/gm, '*$&*');
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '*$&*');

        return highlighted;
    }

    /**
     * Generic syntax highlighting for unknown languages
     */
    private static highlightGeneric(code: string): string {
        let highlighted = code;

        // String literals
        highlighted = highlighted.replace(/"([^"]*)"/g, '`"$1"`');
        highlighted = highlighted.replace(/'([^']*)'/g, "`'$1'`");

        // Numbers
        highlighted = highlighted.replace(/\b\d+(\.\d+)?\b/g, '`$&`');

        // Common operators
        highlighted = highlighted.replace(/([=!<>]=?|[+\-*/%])/g, '**$1**');

        // Comments
        highlighted = highlighted.replace(/\/\/.*$/gm, '*$&*');
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '*$&*');

        return highlighted;
    }

    /**
     * Highlight error tokens with strikethrough and bold formatting
     */
    private static highlightErrorToken(code: string, errorToken: string): string {
        if (!errorToken) return code;

        const escapedToken = this.escapeRegex(errorToken);
        const regex = new RegExp('\\b' + escapedToken + '\\b', 'g');
        return code.replace(regex, `~~**${errorToken}**~~`);
    }

    /**
     * Add line numbers to code
     */
    private static addLineNumbers(code: string): string {
        const lines = code.split('\n');
        return lines.map((line, index) => {
            const lineNumber = (index + 1).toString().padStart(2, ' ');
            return `${lineNumber}: ${line}`;
        }).join('\n');
    }

    /**
     * Format suggestion with clear before/after indication
     */
    private static formatSuggestion(suggestion: {
        type: 'replacement' | 'addition' | 'removal';
        incorrect: string;
        correct: string;
        explanation: string;
    }): string {
        let formatted = '';

        switch (suggestion.type) {
            case 'replacement':
                formatted = `Replace **\`${suggestion.incorrect}\`** with **\`${suggestion.correct}\`**`;
                break;
            case 'addition':
                formatted = `Add **\`${suggestion.correct}\`**`;
                break;
            case 'removal':
                formatted = `Remove **\`${suggestion.incorrect}\`**`;
                break;
        }

        if (suggestion.explanation) {
            formatted += `\n\n${suggestion.explanation}`;
        }

        return formatted;
    }

    /**
     * Format before/after comparison
     */
    private static formatComparison(
        before: string,
        after: string,
        language: 'java' | 'drools' | 'generic' = 'java'
    ): string {
        const beforeHighlighted = this.formatCodeBlock(before, language, { showLineNumbers: false });
        const afterHighlighted = this.formatCodeBlock(after, language, { showLineNumbers: false });

        return `**Before:**\n${beforeHighlighted}\n\n**After:**\n${afterHighlighted}`;
    }

    /**
     * Extract code context around an error position with enhanced formatting
     */
    public static extractCodeContext(
        lines: string[],
        errorLine: number,
        errorStart: number,
        errorEnd: number,
        contextLines: number = 2,
        language: 'java' | 'drools' | 'generic' = 'java'
    ): string {
        const startLine = Math.max(0, errorLine - contextLines);
        const endLine = Math.min(lines.length - 1, errorLine + contextLines);

        const contextLinesArray = [];

        for (let i = startLine; i <= endLine; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const isErrorLine = i === errorLine;

            if (isErrorLine && errorStart >= 0 && errorEnd > errorStart) {
                // Highlight the error token in the error line
                const beforeError = line.substring(0, errorStart);
                const errorToken = line.substring(errorStart, errorEnd);
                const afterError = line.substring(errorEnd);

                const highlightedLine = `${beforeError}~~**${errorToken}**~~${afterError}`;
                contextLinesArray.push(`${lineNumber}: ${highlightedLine}`);
            } else {
                contextLinesArray.push(`${lineNumber}: ${line}`);
            }
        }

        return contextLinesArray.join('\n');
    }

    /**
     * Create an interactive tooltip with clickable elements
     */
    public static createInteractiveTooltip(
        title: string,
        description: string,
        codeSnippet?: string,
        language: 'java' | 'drools' | 'generic' = 'java',
        actions?: Array<{ label: string; command: string; args?: any[] }>
    ): MarkupContent {
        const theme = ThemeManager.getCurrentTheme();
        const icon = theme.type === 'high-contrast' ? '[!]' : '⚠️';
        
        let content = `### ${icon} ${title}\n\n${description}`;

        if (codeSnippet) {
            content += '\n\n**Code:**\n';
            content += this.formatCodeBlock(codeSnippet, language);
        }

        if (actions && actions.length > 0) {
            content += '\n\n**Actions:**\n';
            actions.forEach(action => {
                const commandUri = `command:${action.command}`;
                content += `- [${action.label}](${commandUri})\n`;
            });
        }

        // Apply theme styling
        content = ThemeManager.applyThemeToMarkdown(content);

        return {
            kind: MarkupKind.Markdown,
            value: content
        };
    }

    /**
     * Escape special regex characters
     */
    private static escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Validate tooltip content size for performance
     */
    public static validateContentSize(content: string, maxSize: number = 5000): string {
        if (content.length > maxSize) {
            return content.substring(0, maxSize) + '\n\n... (content truncated for performance)';
        }
        return content;
    }

    /**
     * Create a quick fix suggestion tooltip
     */
    public static createQuickFixTooltip(
        error: string,
        fixes: Array<{ title: string; description: string; code: string }>
    ): MarkupContent {
        const theme = ThemeManager.getCurrentTheme();
        const icon = theme.type === 'high-contrast' ? '[FIX]' : '🔧';
        
        let content = `### ${icon} Quick Fix: ${error}\n\n`;

        fixes.forEach((fix, index) => {
            content += `**${index + 1}. ${fix.title}**\n`;
            content += `${fix.description}\n\n`;
            if (fix.code) {
                content += this.formatCodeBlock(fix.code, 'java');
                content += '\n';
            }
        });

        // Apply theme styling
        content = ThemeManager.applyThemeToMarkdown(content);

        return {
            kind: MarkupKind.Markdown,
            value: content
        };
    }

    /**
     * Set theme for syntax highlighting
     */
    public static setTheme(themeName: string): void {
        ThemeManager.setTheme(themeName);
    }

    /**
     * Get current theme colors for external use
     */
    public static getThemeColors(): any {
        return ThemeManager.getColors();
    }
}