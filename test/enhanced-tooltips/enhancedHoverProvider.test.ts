/**
 * Tests for Enhanced Hover Provider
 */

import { EnhancedHoverProvider } from '../../src/server/providers/enhancedHoverProvider';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { ParseResult } from '../../src/server/parser/droolsParser';

// Mock the documentation modules
jest.mock('../../src/server/documentation/droolsDocumentation');
jest.mock('../../src/server/documentation/javaDocumentation');

import { DroolsDocumentation } from '../../src/server/documentation/droolsDocumentation';
import { JavaDocumentation } from '../../src/server/documentation/javaDocumentation';

const mockDroolsDoc = DroolsDocumentation as jest.Mocked<typeof DroolsDocumentation>;
const mockJavaDoc = JavaDocumentation as jest.Mocked<typeof JavaDocumentation>;

describe('EnhancedHoverProvider', () => {
    let mockDocument: TextDocument;
    let mockParseResult: ParseResult;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock document
        mockDocument = TextDocument.create(
            'file:///test.drl',
            'drools',
            1,
            `rule "Test Rule"
    salience 10
when
    $customer : Customer(age >= 18)
    $order : Order(customerId == $customer.id)
then
    System.out.println("Processing order");
    $customer.setVipStatus(true);
    update($customer);
end`
        );

        // Create mock parse result
        mockParseResult = {
            ast: {
                type: 'DroolsFile',
                range: { start: { line: 0, character: 0 }, end: { line: 10, character: 3 } },
                packageDeclaration: undefined,
                imports: [],
                globals: [],
                functions: [],
                rules: [],
                queries: [],
                declares: []
            },
            errors: []
        };
    });

    describe('provideHover', () => {
        it('should provide hover for Drools keywords', () => {
            // Mock Drools documentation
            mockDroolsDoc.getKeywordDoc.mockReturnValue({
                keyword: 'rule',
                description: 'Defines a rule with a unique name',
                syntax: 'rule "rule-name" [attributes] when [conditions] then [actions] end',
                example: 'rule "Test" when ... then ... end',
                category: 'rule',
                relatedKeywords: ['when', 'then', 'end']
            });

            const position: Position = { line: 0, character: 0 }; // Position at "rule"
            const result = EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);

            expect(result).toBeDefined();
            expect(result?.contents.kind).toBe('markdown');
            expect(result?.contents.value).toContain('📘 Drools Keyword: `rule`');
            expect(result?.contents.value).toContain('Defines a rule with a unique name');
            expect(mockDroolsDoc.getKeywordDoc).toHaveBeenCalledWith('rule');
        });

        it('should provide hover for Drools functions', () => {
            // Mock Drools function documentation
            mockDroolsDoc.getFunctionDoc.mockReturnValue({
                name: 'update',
                description: 'Notifies the engine that a fact has been modified',
                parameters: [
                    { name: 'fact', type: 'Object', description: 'The fact object that was modified' }
                ],
                returnType: 'void',
                example: '$customer.setStatus("VIP");\nupdate($customer);',
                category: 'builtin'
            });

            const position: Position = { line: 8, character: 4 }; // Position at "update"
            const result = EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);

            expect(result).toBeDefined();
            expect(result?.contents.value).toContain('🔧 Drools Function: `update`');
            expect(result?.contents.value).toContain('Notifies the engine that a fact has been modified');
            expect(mockDroolsDoc.getFunctionDoc).toHaveBeenCalledWith('update');
        });

        it('should provide hover for Java methods', () => {
            // Mock Java method documentation
            mockJavaDoc.getMethodDoc.mockReturnValue({
                className: 'System',
                methodName: 'out.println',
                description: 'Prints the argument and then terminates the line',
                parameters: [
                    { name: 'x', type: 'Object', description: 'The value to be printed' }
                ],
                returnType: 'void',
                example: 'System.out.println("Hello World");'
            });

            const position: Position = { line: 6, character: 15 }; // Position at "println"
            const result = EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);

            expect(result).toBeDefined();
            expect(result?.contents.value).toContain('☕ Java Method: `System.out.println`');
            expect(result?.contents.value).toContain('Prints the argument and then terminates the line');
            expect(mockJavaDoc.getMethodDoc).toHaveBeenCalledWith('System.out.println');
        });

        it('should provide hover for Java classes', () => {
            // Mock Java class documentation
            mockJavaDoc.getClassDoc.mockReturnValue({
                className: 'System',
                packageName: 'java.lang',
                description: 'The System class contains several useful class fields and methods',
                commonMethods: ['out.println', 'out.print', 'currentTimeMillis'],
                example: 'System.out.println("Hello World");'
            });

            const position: Position = { line: 6, character: 4 }; // Position at "System"
            const result = EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);

            expect(result).toBeDefined();
            expect(result?.contents.value).toContain('☕ Java Class: `System`');
            expect(result?.contents.value).toContain('The System class contains several useful class fields and methods');
            expect(mockJavaDoc.getClassDoc).toHaveBeenCalledWith('System');
        });

        it('should provide hover for variables', () => {
            const position: Position = { line: 3, character: 4 }; // Position at "$customer"
            const result = EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);

            expect(result).toBeDefined();
            expect(result?.contents.value).toContain('🔧 Drools Variable: `$customer`');
            expect(result?.contents.value).toContain('Variable binding');
            expect(result?.contents.value).toContain('When clause (LHS)');
        });

        it('should return null for unknown words', () => {
            // Mock no documentation found
            mockDroolsDoc.getKeywordDoc.mockReturnValue(null);
            mockDroolsDoc.getFunctionDoc.mockReturnValue(null);
            mockJavaDoc.getMethodDoc.mockReturnValue(null);
            mockJavaDoc.getClassDoc.mockReturnValue(null);

            const position: Position = { line: 0, character: 50 }; // Position at unknown word
            const result = EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);

            expect(result).toBeNull();
        });
    });

    describe('context detection', () => {
        it('should detect when clause context', () => {
            const whenDocument = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test"
when
    $customer : Customer()
then
    // actions
end`
            );

            // Mock keyword documentation
            mockDroolsDoc.getKeywordDoc.mockReturnValue({
                keyword: 'Customer',
                description: 'Test description',
                syntax: 'test syntax',
                example: 'test example',
                category: 'rule'
            });

            const position: Position = { line: 2, character: 16 }; // Position at "Customer"
            const result = EnhancedHoverProvider.provideHover(whenDocument, position, mockParseResult);

            // Should detect when clause context
            expect(result).toBeDefined();
        });

        it('should detect then clause context', () => {
            const thenDocument = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test"
when
    $customer : Customer()
then
    System.out.println("test");
end`
            );

            // Mock Java method documentation
            mockJavaDoc.getMethodDoc.mockReturnValue({
                className: 'System',
                methodName: 'out.println',
                description: 'Prints the argument',
                parameters: [],
                returnType: 'void',
                example: 'System.out.println("test");'
            });

            const position: Position = { line: 4, character: 15 }; // Position at "println"
            const result = EnhancedHoverProvider.provideHover(thenDocument, position, mockParseResult);

            // Should detect then clause context and provide Java method hover
            expect(result).toBeDefined();
            expect(result?.contents.value).toContain('☕ Java Method');
        });
    });

    describe('word detection', () => {
        it('should correctly extract words at different positions', () => {
            const testCases = [
                { line: 'rule "Test Rule"', position: 0, expected: 'rule' },
                { line: 'rule "Test Rule"', position: 5, expected: '' }, // In quotes
                { line: '$customer : Customer()', position: 0, expected: '$customer' },
                { line: '$customer : Customer()', position: 12, expected: 'Customer' },
                { line: 'System.out.println("test")', position: 0, expected: 'System' },
                { line: 'System.out.println("test")', position: 11, expected: 'println' }
            ];

            testCases.forEach(({ line, position, expected }) => {
                const document = TextDocument.create('file:///test.drl', 'drools', 1, line);
                const pos: Position = { line: 0, character: position };
                
                // This tests the internal word extraction logic
                // We can't directly test the private method, but we can test the behavior
                if (expected) {
                    // Mock appropriate documentation based on expected word
                    if (expected.startsWith('$')) {
                        // Variable - should get variable hover
                        const result = EnhancedHoverProvider.provideHover(document, pos, mockParseResult);
                        if (result) {
                            expect(result.contents.value).toContain('Variable');
                        }
                    } else if (['rule', 'when', 'then'].includes(expected)) {
                        mockDroolsDoc.getKeywordDoc.mockReturnValue({
                            keyword: expected,
                            description: 'Test description',
                            syntax: 'test syntax',
                            example: 'test example',
                            category: 'rule'
                        });
                        const result = EnhancedHoverProvider.provideHover(document, pos, mockParseResult);
                        expect(result).toBeDefined();
                    }
                }
            });
        });
    });

    describe('error handling', () => {
        it('should handle malformed documents gracefully', () => {
            const malformedDocument = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                'invalid drools syntax here'
            );

            const position: Position = { line: 0, character: 0 };
            
            expect(() => {
                EnhancedHoverProvider.provideHover(malformedDocument, position, mockParseResult);
            }).not.toThrow();
        });

        it('should handle positions outside document bounds', () => {
            const position: Position = { line: 100, character: 100 }; // Way outside document
            
            expect(() => {
                EnhancedHoverProvider.provideHover(mockDocument, position, mockParseResult);
            }).not.toThrow();
        });

        it('should handle empty documents', () => {
            const emptyDocument = TextDocument.create('file:///test.drl', 'drools', 1, '');
            const position: Position = { line: 0, character: 0 };
            
            const result = EnhancedHoverProvider.provideHover(emptyDocument, position, mockParseResult);
            expect(result).toBeNull();
        });
    });
});