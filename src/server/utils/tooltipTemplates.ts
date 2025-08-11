/**
 * Tooltip templates for consistent formatting across different error types
 */

import { MarkupContent } from 'vscode-languageserver/node';
import { EnhancedSyntaxHighlighter, TooltipContent } from './enhancedSyntaxHighlighter';

export interface ErrorContext {
    line: number;
    column: number;
    length: number;
    token: string;
    surroundingCode: string[];
}

export interface SuggestionData {
    incorrect: string;
    correct: string;
    explanation?: string;
    example?: string;
}

export class TooltipTemplates {
    /**
     * Template for Java capitalization errors
     */
    public static javaCapitalizationError(
        context: ErrorContext,
        suggestion: SuggestionData,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Java Capitalization Error',
            description: `Incorrect capitalization: "${suggestion.incorrect}" should be "${suggestion.correct}"`,
            position: position,
            codeContext: {
                language: 'java',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    1,
                    'java'
                ),
                errorToken: suggestion.incorrect
            },
            suggestion: {
                type: 'replacement',
                incorrect: suggestion.incorrect,
                correct: suggestion.correct,
                explanation: suggestion.explanation || `Java class names must start with a capital letter. "${suggestion.correct}" is the correct capitalization.`
            },
            comparison: {
                before: context.surroundingCode[context.line] || '',
                after: (context.surroundingCode[context.line] || '').replace(suggestion.incorrect, suggestion.correct),
                language: 'java'
            },
            tip: 'Java follows PascalCase naming convention for class names.'
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for Java method typos
     */
    public static javaMethodTypo(
        context: ErrorContext,
        suggestion: SuggestionData,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Possible Method Typo',
            description: `Possible typo in method name: "${suggestion.incorrect}" should be "${suggestion.correct}"`,
            position: position,
            codeContext: {
                language: 'java',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    1,
                    'java'
                ),
                errorToken: suggestion.incorrect
            },
            suggestion: {
                type: 'replacement',
                incorrect: suggestion.incorrect,
                correct: suggestion.correct,
                explanation: suggestion.explanation || `"${suggestion.correct}" is a standard Java method. Check for typos in method names.`
            },
            comparison: {
                before: context.surroundingCode[context.line] || '',
                after: (context.surroundingCode[context.line] || '').replace(suggestion.incorrect, suggestion.correct),
                language: 'java'
            },
            tip: 'Use IDE auto-completion to avoid method name typos.'
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for undefined Drools variables
     */
    public static undefinedDroolsVariable(
        context: ErrorContext,
        variableName: string,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Undefined Variable',
            description: `Variable ${variableName} is used but not declared in the when clause`,
            position: position,
            codeContext: {
                language: 'drools',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    2,
                    'drools'
                ),
                errorToken: variableName
            },
            suggestion: {
                type: 'addition',
                incorrect: '',
                correct: `${variableName} : FactType()`,
                explanation: `Declare ${variableName} in the when clause before using it in the then clause.`
            },
            tip: `All variables used in the then clause must be declared in the when clause. Add something like: ${variableName} : YourFactType()`
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for missing $ prefix in variables
     */
    public static missingDollarPrefix(
        context: ErrorContext,
        variableName: string,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Missing Variable Prefix',
            description: `Variable "${variableName}" is missing the $ prefix`,
            position: position,
            codeContext: {
                language: 'drools',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    1,
                    'drools'
                ),
                errorToken: variableName
            },
            suggestion: {
                type: 'replacement',
                incorrect: variableName,
                correct: `$${variableName}`,
                explanation: 'Drools variables must be prefixed with $ to distinguish them from fact types and methods.'
            },
            comparison: {
                before: context.surroundingCode[context.line] || '',
                after: (context.surroundingCode[context.line] || '').replace(new RegExp(`\\b${variableName}\\b`), `$${variableName}`),
                language: 'drools'
            },
            tip: 'All Drools variables must start with $ (e.g., $person, $order, $result)'
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for syntax errors
     */
    public static syntaxError(
        context: ErrorContext,
        errorMessage: string,
        position: string,
        language: 'java' | 'drools' | 'generic' = 'generic'
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Syntax Error',
            description: errorMessage,
            position: position,
            codeContext: {
                language: language,
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    2,
                    language
                ),
                errorToken: context.token
            },
            tip: 'Check the syntax around the highlighted area for missing punctuation, brackets, or keywords.'
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for best practice warnings
     */
    public static bestPracticeWarning(
        context: ErrorContext,
        warningMessage: string,
        recommendation: string,
        position: string,
        language: 'java' | 'drools' | 'generic' = 'drools'
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Best Practice Recommendation',
            description: warningMessage,
            position: position,
            codeContext: {
                language: language,
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    1,
                    language
                )
            },
            tip: recommendation
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for semantic validation errors
     */
    public static semanticError(
        context: ErrorContext,
        errorMessage: string,
        suggestion: string,
        position: string,
        language: 'java' | 'drools' | 'generic' = 'drools'
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Semantic Error',
            description: errorMessage,
            position: position,
            codeContext: {
                language: language,
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    2,
                    language
                ),
                errorToken: context.token
            },
            tip: suggestion
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for performance warnings
     */
    public static performanceWarning(
        context: ErrorContext,
        warningMessage: string,
        optimizationTip: string,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: '⚡ Performance Warning',
            description: warningMessage,
            position: position,
            codeContext: {
                language: 'drools',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    1,
                    'drools'
                )
            },
            tip: `**Optimization:** ${optimizationTip}`
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for rule structure errors
     */
    public static ruleStructureError(
        context: ErrorContext,
        errorMessage: string,
        expectedStructure: string,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Rule Structure Error',
            description: errorMessage,
            position: position,
            codeContext: {
                language: 'drools',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    3,
                    'drools'
                )
            },
            tip: `**Expected structure:** ${expectedStructure}`
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Template for import/package errors
     */
    public static importPackageError(
        context: ErrorContext,
        errorMessage: string,
        correctFormat: string,
        position: string
    ): MarkupContent {
        const tooltipContent: TooltipContent = {
            title: 'Import/Package Error',
            description: errorMessage,
            position: position,
            codeContext: {
                language: 'drools',
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    1,
                    'drools'
                ),
                errorToken: context.token
            },
            suggestion: {
                type: 'replacement',
                incorrect: context.token,
                correct: correctFormat,
                explanation: 'Import and package statements must follow proper Java naming conventions.'
            },
            tip: 'Package and import statements should use lowercase with dots as separators (e.g., com.example.package)'
        };

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }

    /**
     * Create a custom tooltip with flexible content
     */
    public static custom(
        title: string,
        description: string,
        context: ErrorContext,
        options: {
            language?: 'java' | 'drools' | 'generic';
            suggestion?: SuggestionData;
            tip?: string;
            comparison?: { before: string; after: string };
            position?: string;
        } = {}
    ): MarkupContent {
        const {
            language = 'generic',
            suggestion,
            tip,
            comparison,
            position
        } = options;

        const tooltipContent: TooltipContent = {
            title,
            description,
            position,
            codeContext: {
                language,
                content: EnhancedSyntaxHighlighter.extractCodeContext(
                    context.surroundingCode,
                    context.line,
                    context.column,
                    context.column + context.length,
                    2,
                    language
                ),
                errorToken: context.token
            },
            tip
        };

        if (suggestion) {
            tooltipContent.suggestion = {
                type: 'replacement',
                incorrect: suggestion.incorrect,
                correct: suggestion.correct,
                explanation: suggestion.explanation || ''
            };
        }

        if (comparison) {
            tooltipContent.comparison = {
                before: comparison.before,
                after: comparison.after,
                language
            };
        }

        return EnhancedSyntaxHighlighter.generateTooltipMarkdown(tooltipContent);
    }
}