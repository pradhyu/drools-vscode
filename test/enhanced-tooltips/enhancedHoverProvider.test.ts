import { EnhancedHoverProvider } from '../../src/server/providers/enhancedHoverProvider';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { DroolsAST } from '../../src/server/parser/ast';

describe('EnhancedHoverProvider', () => {
    // Create a minimal mock AST for testing
    const createMockAST = (): DroolsAST => ({
        type: 'DroolsFile',
        range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },
        imports: [],
        globals: [],
        functions: [],
        rules: [],
        queries: [],
        declares: []
    });

    describe('hyphenated keyword support', () => {
        test('should provide hover for no-loop attribute', () => {
            const content = `rule "Test Rule"
    no-loop true
    salience 10
when
    $customer : Customer()
then
    // actions
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            const position: Position = { line: 1, character: 6 }; // Position on "no-loop"
            
            const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
            
            expect(hover).toBeTruthy();
            expect(hover?.contents).toBeTruthy();
            if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                expect(hover.contents.value).toContain('no-loop');
                expect(hover.contents.value).toContain('Prevents a rule from firing again');
            }
        });

        test('should provide hover for lock-on-active attribute', () => {
            const content = `rule "Test Rule"
    agenda-group "test"
    lock-on-active true
when
    $customer : Customer()
then
    // actions
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            const position: Position = { line: 2, character: 10 }; // Position on "lock-on-active"
            
            const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
            
            expect(hover).toBeTruthy();
            expect(hover?.contents).toBeTruthy();
            if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                expect(hover.contents.value).toContain('lock-on-active');
                expect(hover.contents.value).toContain('agenda group is executing');
            }
        });

        test('should provide hover for activation-group attribute', () => {
            const content = `rule "High Priority"
    activation-group "priority-rules"
    salience 10
when
    $customer : Customer()
then
    // actions
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            const position: Position = { line: 1, character: 10 }; // Position on "activation-group"
            
            const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
            
            expect(hover).toBeTruthy();
            expect(hover?.contents).toBeTruthy();
            if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                expect(hover.contents.value).toContain('activation-group');
                expect(hover.contents.value).toContain('only one rule in the group can fire');
            }
        });

        test('should provide hover for agenda-group attribute', () => {
            const content = `rule "Validation Rule"
    agenda-group "validation"
when
    $customer : Customer()
then
    // actions
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            const position: Position = { line: 1, character: 8 }; // Position on "agenda-group"
            
            const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
            
            expect(hover).toBeTruthy();
            expect(hover?.contents).toBeTruthy();
            if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                expect(hover.contents.value).toContain('agenda-group');
                expect(hover.contents.value).toContain('controlled execution');
            }
        });

        test('should provide hover for ruleflow-group attribute', () => {
            const content = `rule "Process Order"
    ruleflow-group "order-processing"
when
    $order : Order()
then
    // actions
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            const position: Position = { line: 1, character: 10 }; // Position on "ruleflow-group"
            
            const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
            
            expect(hover).toBeTruthy();
            expect(hover?.contents).toBeTruthy();
            if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                expect(hover.contents.value).toContain('ruleflow-group');
                expect(hover.contents.value).toContain('process-driven rule execution');
            }
        });

        test('should handle complex rule with multiple hyphenated attributes', () => {
            const content = `rule "Complex Rule"
    no-loop true
    lock-on-active true
    agenda-group "processing"
    activation-group "exclusive-rules"
    salience 100
when
    $order : Order(amount > 500 && amount <= 1000)
then
    $order.setScore(500);
    update($order);
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            
            // Test each hyphenated attribute
            const testCases = [
                { line: 1, character: 6, keyword: 'no-loop' },
                { line: 2, character: 10, keyword: 'lock-on-active' },
                { line: 3, character: 8, keyword: 'agenda-group' },
                { line: 4, character: 10, keyword: 'activation-group' }
            ];
            
            testCases.forEach(testCase => {
                const position: Position = { line: testCase.line, character: testCase.character };
                const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
                
                expect(hover).toBeTruthy();
                expect(hover?.contents).toBeTruthy();
                if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                    expect(hover.contents.value).toContain(testCase.keyword);
                }
            });
        });

        test('should not provide hover for non-existent hyphenated keywords', () => {
            const content = `rule "Test Rule"
    fake-attribute true
when
    $customer : Customer()
then
    // actions
end`;
            
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            const position: Position = { line: 1, character: 8 }; // Position on "fake-attribute"
            
            const hover = EnhancedHoverProvider.provideHover(document, position, { ast: createMockAST(), errors: [] });
            
            // Should return null for unknown attributes
            expect(hover).toBeNull();
        });
    });

    describe('word extraction with hyphens', () => {
        test('should extract hyphenated words correctly', () => {
            // This tests the regex pattern indirectly through the hover functionality
            const content = 'rule "test" no-loop true lock-on-active true agenda-group "test"';
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            
            // Test positions that should extract hyphenated words
            const testPositions = [
                { line: 0, character: 15, expectedKeyword: 'no-loop' },
                { line: 0, character: 30, expectedKeyword: 'lock-on-active' },
                { line: 0, character: 50, expectedKeyword: 'agenda-group' }
            ];
            
            testPositions.forEach(test => {
                const hover = EnhancedHoverProvider.provideHover(document, test, { ast: createMockAST(), errors: [] });
                expect(hover).toBeTruthy();
                if (hover?.contents && typeof hover.contents === 'object' && 'value' in hover.contents) {
                    expect(hover.contents.value).toContain(test.expectedKeyword);
                }
            });
        });
    });
});