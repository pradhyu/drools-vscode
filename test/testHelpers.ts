/**
 * Test helpers for creating providers with default settings
 */

import { DiagnosticSettings } from '../src/server/providers/diagnosticProvider';
import { CompletionSettings } from '../src/server/providers/completionProvider';
import { FormattingSettings } from '../src/server/providers/formattingProvider';

export function createDefaultDiagnosticSettings(): DiagnosticSettings {
    return {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };
}

export function createDefaultCompletionSettings(): CompletionSettings {
    return {
        enableKeywordCompletion: true,
        enableFactTypeCompletion: true,
        enableFunctionCompletion: true,
        enableVariableCompletion: true,
        enableGlobalCompletion: true,
        maxCompletionItems: 50,
        enableSnippets: true,
        enableSignatureHelp: true
    };
}

export function createDefaultFormattingSettings(): Partial<FormattingSettings> {
    return {
        insertSpaces: true,
        tabSize: 4,
        indentSize: 4,
        maxLineLength: 120,
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
        spaceAroundOperators: true,
        spaceAfterKeywords: true,
        alignRuleBlocks: true,
        alignClosingParentheses: true,
        indentMultiLinePatterns: true
    };
}

// Helper function to create a mock document
export function createMockDocument(content: string, uri: string = 'file:///test.drl'): any {
    return {
        uri,
        languageId: 'drools',
        version: 1,
        getText: () => content,
        positionAt: (offset: number) => ({ line: 0, character: offset }),
        offsetAt: (position: any) => position.character,
        lineCount: content.split('\n').length
    };
}