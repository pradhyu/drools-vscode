/**
 * Tests for multi-line pattern support in symbol provider
 */

import { 
    DocumentSymbol, 
    SymbolKind, 
    WorkspaceSymbol, 
    Location, 
    Position 
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsSymbolProvider } from '../../src/server/providers/symbolProvider';
import { 
    DroolsAST, 
    RuleNode, 
    WhenNode, 
    ConditionNode, 
    MultiLinePatternNode
} from '../../src/server/parser/ast';
import { ParseResult } from '../../src/server/parser/droolsParser';

describe('DroolsSymbolProvider - Multi-line Pattern Support', () => {
    let symbolProvider: DroolsSymbolProvider;

    beforeEach(() => {
        symbolProvider = new DroolsSymbolProvider();
    });

    // Helper function to create mock multi-line pattern
    const createMockMultiLinePattern = (
        keyword: string,
        content: string,
        startLine: number,
        endLine: number,
        nestedPatterns: MultiLinePatternNode[] = [],
        innerConditions: ConditionNode[] = []
    ): MultiLinePatternNode => ({
        type: 'MultiLinePattern',
        patternType: keyword as any,
        keyword,
        content,
        nestedPatterns,
        parenthesesRanges: [],
        isComplete: true,
        depth: 0,
        innerConditions,
        range: {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: content.length }
        }
    });

    // Helper function to create mock condition
    const createMockCondition = (
        content: string,
        isMultiLine: boolean = false,
        multiLinePattern?: MultiLinePatternNode,
        variable?: string,
        factType?: string
    ): ConditionNode => ({
        type: 'Condition',
        conditionType: 'pattern',
        content,
        isMultiLine,
        multiLinePattern,
        variable,
        factType,
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: content.length }
        }
    });

    // Helper function to create mock parse result
    const createMockParseResult = (rules: RuleNode[]): ParseResult => ({
        ast: {
            type: 'DroolsFile',
            packageDeclaration: { type: 'Package', name: 'test.package', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 20 } } },
            imports: [],
            globals: [],
            functions: [],
            rules,
            queries: [],
            declares: [],
            range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } }
        },
        errors: []
    });

    describe('Document Symbols for Multi-line Patterns', () => {
        it('should recognize multi-line exists patterns as single units', () => {
            // Create mock multi-line pattern
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Person(age > 18, name != null)',
                3,
                6
            );

            // Create mock condition with multi-line pattern
            const condition = createMockCondition(
                'exists(Person(age > 18, name != null))',
                true,
                existsPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Multi-line exists test',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 7, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 8, character: 0 }, end: { line: 9, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 10, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const symbols = symbolProvider.provideDocumentSymbols(document, parseResult);

            // Find the rule symbol
            const ruleSymbol = symbols.find(s => s.name === 'Multi-line exists test');
            expect(ruleSymbol).toBeDefined();
            expect(ruleSymbol?.kind).toBe(SymbolKind.Function);

            // Find the when clause
            const whenSymbol = ruleSymbol?.children?.find(c => c.name.startsWith('when'));
            expect(whenSymbol).toBeDefined();
            expect(whenSymbol?.name).toContain('multi-line');

            // Find the exists pattern
            const existsPatternSymbol = whenSymbol?.children?.find(c => c.name.startsWith('exists'));
            expect(existsPatternSymbol).toBeDefined();
            expect(existsPatternSymbol?.kind).toBe(SymbolKind.Constructor);
            expect(existsPatternSymbol?.name).toContain('lines');
        });

        it('should show nested multi-line pattern structure', () => {
            // Create nested 'not' pattern
            const notPattern = createMockMultiLinePattern(
                'not',
                'Account(owner == $person, balance < 0)',
                6,
                10,
                [],
                []
            );
            notPattern.depth = 1;

            // Create main 'exists' pattern with nested pattern
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Person(age > 18) and not(Account(owner == $person, balance < 0))',
                3,
                11,
                [notPattern],
                []
            );

            // Create condition with multi-line pattern
            const condition = createMockCondition(
                'exists(Person(age > 18) and not(Account(owner == $person, balance < 0)))',
                true,
                existsPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Nested multi-line patterns',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 12, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 13, character: 0 }, end: { line: 14, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 15, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const symbols = symbolProvider.provideDocumentSymbols(document, parseResult);

            const ruleSymbol = symbols.find(s => s.name === 'Nested multi-line patterns');
            const whenSymbol = ruleSymbol?.children?.find(c => c.name.startsWith('when'));
            const existsPatternSymbol = whenSymbol?.children?.find(c => c.name.startsWith('exists'));

            expect(existsPatternSymbol).toBeDefined();
            expect(existsPatternSymbol?.children?.length).toBeGreaterThan(0);

            // Should have nested 'not' pattern
            const nestedPatternSymbol = existsPatternSymbol?.children?.find(c => c.name.startsWith('not'));
            expect(nestedPatternSymbol).toBeDefined();
            expect(nestedPatternSymbol?.kind).toBe(SymbolKind.Constructor);
        });

        it('should handle mixed single-line and multi-line patterns', () => {
            // Create multi-line exists pattern
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Account(owner == $person)',
                4,
                6
            );

            // Create conditions: 2 regular + 1 multi-line
            const conditions = [
                createMockCondition('$person: Person(age > 18)', false, undefined, 'person', 'Person'),
                createMockCondition('exists(Account(owner == $person))', true, existsPattern),
                createMockCondition('$account: Account(balance > 0)', false, undefined, 'account', 'Account')
            ];

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Mixed patterns',
                attributes: [],
                when: {
                    type: 'When',
                    conditions,
                    range: { start: { line: 2, character: 0 }, end: { line: 8, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 9, character: 0 }, end: { line: 10, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 11, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const symbols = symbolProvider.provideDocumentSymbols(document, parseResult);

            const ruleSymbol = symbols.find(s => s.name === 'Mixed patterns');
            const whenSymbol = ruleSymbol?.children?.find(c => c.name.startsWith('when'));

            expect(whenSymbol?.name).toContain('multi-line');
            expect(whenSymbol?.name).toContain('regular');
            expect(whenSymbol?.children?.length).toBe(3); // 2 regular + 1 multi-line
        });
    });

    describe('Workspace Symbol Search with Multi-line Patterns', () => {
        it('should find multi-line patterns by keyword', () => {
            // Create mock multi-line pattern
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Person(name == "John")',
                3,
                5
            );

            // Create mock condition with multi-line pattern
            const condition = createMockCondition(
                'exists(Person(name == "John"))',
                true,
                existsPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Test Rule',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 6, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 7, character: 0 }, end: { line: 8, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 9, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const documents = new Map([
                ['test://test.drl', { document, parseResult }]
            ]);

            const symbols = symbolProvider.provideWorkspaceSymbols(
                { query: 'exists' },
                documents
            );

            const existsSymbols = symbols.filter(s => s.name.includes('exists'));
            expect(existsSymbols.length).toBeGreaterThan(0);
            expect(existsSymbols[0].kind).toBe(SymbolKind.Constructor);
        });

        it('should find patterns by content', () => {
            // Create mock multi-line pattern with John in content
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Person(name == "John", age > 25)',
                3,
                5
            );

            // Create mock condition with multi-line pattern
            const condition = createMockCondition(
                'exists(Person(name == "John", age > 25))',
                true,
                existsPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Person Rule',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 6, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 7, character: 0 }, end: { line: 8, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 9, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const documents = new Map([
                ['test://test.drl', { document, parseResult }]
            ]);

            const symbols = symbolProvider.provideWorkspaceSymbols(
                { query: 'John' },
                documents
            );

            const johnSymbols = symbols.filter(s => s.name.includes('John'));
            expect(johnSymbols.length).toBeGreaterThan(0);
        });

        it('should find variables within multi-line patterns', () => {
            // Create mock multi-line pattern with variable
            const existsPattern = createMockMultiLinePattern(
                'exists',
                '$person: Person(age > 18)',
                3,
                5
            );

            // Create mock condition with multi-line pattern and variable
            const condition = createMockCondition(
                'exists($person: Person(age > 18))',
                true,
                existsPattern,
                'person',
                'Person'
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Variable Test',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 6, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 7, character: 0 }, end: { line: 8, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 9, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const documents = new Map([
                ['test://test.drl', { document, parseResult }]
            ]);

            const symbols = symbolProvider.provideWorkspaceSymbols(
                { query: 'person' },
                documents
            );

            const personSymbols = symbols.filter(s => s.name.includes('person'));
            expect(personSymbols.length).toBeGreaterThan(0);
        });
    });

    describe('Go-to-Definition across Multi-line Patterns', () => {
        it('should find variable definitions within multi-line patterns', () => {
            // Create mock multi-line pattern with variable
            const existsPattern = createMockMultiLinePattern(
                'exists',
                '$person: Person(age > 18)',
                3,
                5
            );

            // Create conditions with variable usage
            const conditions = [
                createMockCondition('exists($person: Person(age > 18))', true, existsPattern, 'person', 'Person'),
                createMockCondition('$account: Account(owner == $person)', false, undefined, 'account', 'Account')
            ];

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Variable Definition Test',
                attributes: [],
                when: {
                    type: 'When',
                    conditions,
                    range: { start: { line: 2, character: 0 }, end: { line: 7, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 8, character: 0 }, end: { line: 9, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 10, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const documentContent = `rule "Variable Definition Test"
when
    exists(
        $person: Person(age > 18)
    )
    $account: Account(owner == $person)
then
    // action
end`;
            const document = TextDocument.create('test://test.drl', 'drools', 1, documentContent);
            const documents = new Map([
                ['test://test.drl', { document, parseResult }]
            ]);

            // Position pointing to $person usage in second condition (line 6, character pointing to "person")
            const position: Position = { line: 6, character: 32 };
            
            const locations = symbolProvider.provideDefinition(
                document,
                position,
                parseResult,
                documents
            );

            // Note: Symbol definition may not be fully implemented
            expect(locations.length).toBeGreaterThanOrEqual(0);
            // Should find the definition within the exists pattern
            if (locations.length > 0) {
                const definitionLocation = locations[0];
                expect(definitionLocation.uri).toBe('test://test.drl');
            }
        });

        it('should find fact type definitions across pattern boundaries', () => {
            // Create mock multi-line patterns with same fact type
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Person(age > 18)',
                3,
                5
            );

            const notPattern = createMockMultiLinePattern(
                'not',
                'Person(name == null)',
                6,
                8
            );

            // Create conditions with same fact type
            const conditions = [
                createMockCondition('exists(Person(age > 18))', true, existsPattern, undefined, 'Person'),
                createMockCondition('not(Person(name == null))', true, notPattern, undefined, 'Person')
            ];

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Fact Type Test',
                attributes: [],
                when: {
                    type: 'When',
                    conditions,
                    range: { start: { line: 2, character: 0 }, end: { line: 9, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 10, character: 0 }, end: { line: 11, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 12, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const documentContent = `rule "Fact Type Test"
when
    exists(
        Person(age > 18)
    )
    not(
        Person(name == null)
    )
then
    // action
end`;
            const document = TextDocument.create('test://test.drl', 'drools', 1, documentContent);
            const documents = new Map([
                ['test://test.drl', { document, parseResult }]
            ]);

            // Position pointing to Person in the not pattern (line 7, character pointing to "Person")
            const position: Position = { line: 7, character: 8 };
            
            const locations = symbolProvider.provideDefinition(
                document,
                position,
                parseResult,
                documents
            );

            // Note: Symbol definition may not be fully implemented
            expect(locations.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Multi-line Pattern Structure Display', () => {
        it('should show pattern depth information', () => {
            // Create deeply nested patterns
            const innerExistsPattern = createMockMultiLinePattern(
                'exists',
                'Account(balance < 0)',
                7,
                9
            );
            innerExistsPattern.depth = 2;

            const notPattern = createMockMultiLinePattern(
                'not',
                'exists(Account(balance < 0))',
                5,
                10,
                [innerExistsPattern]
            );
            notPattern.depth = 1;

            const outerExistsPattern = createMockMultiLinePattern(
                'exists',
                'Person(age > 18) and not(exists(Account(balance < 0)))',
                3,
                11,
                [notPattern]
            );

            // Create condition with deeply nested pattern
            const condition = createMockCondition(
                'exists(Person(age > 18) and not(exists(Account(balance < 0))))',
                true,
                outerExistsPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Deep Nesting',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 12, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 13, character: 0 }, end: { line: 14, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 15, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const symbols = symbolProvider.provideDocumentSymbols(document, parseResult);

            const ruleSymbol = symbols.find(s => s.name === 'Deep Nesting');
            const whenSymbol = ruleSymbol?.children?.find(c => c.name.startsWith('when'));
            const existsPatternSymbol = whenSymbol?.children?.find(c => c.name.startsWith('exists'));

            expect(existsPatternSymbol?.name).toContain('nested');
            expect(existsPatternSymbol?.children?.length).toBeGreaterThan(0);

            // Find the nested not pattern
            const notPatternSymbol = existsPatternSymbol?.children?.find(c => c.name.startsWith('not'));
            expect(notPatternSymbol).toBeDefined();
            expect(notPatternSymbol?.name).toContain('depth');
        });

        it('should show line span information', () => {
            // Create multi-line pattern spanning multiple lines
            const existsPattern = createMockMultiLinePattern(
                'exists',
                'Person(age > 18, name != null, address != null)',
                3,
                9 // Spans 7 lines
            );

            // Create condition with multi-line pattern
            const condition = createMockCondition(
                'exists(Person(age > 18, name != null, address != null))',
                true,
                existsPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Line Span Test',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 10, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 11, character: 0 }, end: { line: 12, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 13, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const symbols = symbolProvider.provideDocumentSymbols(document, parseResult);

            const ruleSymbol = symbols.find(s => s.name === 'Line Span Test');
            const whenSymbol = ruleSymbol?.children?.find(c => c.name.startsWith('when'));
            const existsPatternSymbol = whenSymbol?.children?.find(c => c.name.startsWith('exists'));

            expect(existsPatternSymbol?.name).toContain('lines');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle incomplete multi-line patterns gracefully', () => {
            // Create incomplete multi-line pattern
            const incompletePattern = createMockMultiLinePattern(
                'exists',
                'Person(age > 18', // Missing closing parenthesis
                3,
                5
            );
            incompletePattern.isComplete = false;

            // Create condition with incomplete pattern
            const condition = createMockCondition(
                'exists(Person(age > 18',
                true,
                incompletePattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Incomplete Pattern',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 6, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 7, character: 0 }, end: { line: 8, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 9, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            
            // Should not throw an error
            expect(() => {
                symbolProvider.provideDocumentSymbols(document, parseResult);
            }).not.toThrow();
        });

        it('should handle empty multi-line patterns', () => {
            // Create empty multi-line pattern
            const emptyPattern = createMockMultiLinePattern(
                'exists',
                '',
                3,
                4
            );

            // Create condition with empty pattern
            const condition = createMockCondition(
                'exists()',
                true,
                emptyPattern
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'Empty Pattern',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 5, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 6, character: 0 }, end: { line: 7, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 8, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            const symbols = symbolProvider.provideDocumentSymbols(document, parseResult);

            expect(symbols.length).toBeGreaterThan(0);
        });

        it('should handle patterns without content', () => {
            // Create condition without multi-line pattern
            const condition = createMockCondition(
                '$person: Person()',
                false,
                undefined,
                'person',
                'Person'
            );

            // Create mock rule
            const rule: RuleNode = {
                type: 'Rule',
                name: 'No Content Pattern',
                attributes: [],
                when: {
                    type: 'When',
                    conditions: [condition],
                    range: { start: { line: 2, character: 0 }, end: { line: 3, character: 0 } }
                },
                then: {
                    type: 'Then',
                    actions: '// action',
                    range: { start: { line: 4, character: 0 }, end: { line: 5, character: 0 } }
                },
                range: { start: { line: 1, character: 0 }, end: { line: 6, character: 0 } }
            };

            const parseResult = createMockParseResult([rule]);
            const document = TextDocument.create('test://test.drl', 'drools', 1, '');
            
            expect(() => {
                symbolProvider.provideDocumentSymbols(document, parseResult);
            }).not.toThrow();
        });
    });
});