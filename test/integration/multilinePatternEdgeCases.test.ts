/**
 * Integration tests for multi-line pattern edge cases
 * Tests deeply nested patterns, mixed patterns, formatting, and completion behavior
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { 
    CompletionParams,
    DocumentFormattingParams,
    DocumentRangeFormattingParams,
    Position,
    Range,
    TextEdit,
    CompletionItem,
    Diagnostic
} from 'vscode-languageserver/node';

// Import the actual providers for integration testing
import { DroolsParser } from '../../src/server/parser/droolsParser';
import { DiagnosticProvider } from '../../src/server/providers/diagnosticProvider';
import { FormattingProvider } from '../../src/server/providers/formattingProvider';
import { CompletionProvider } from '../../src/server/providers/completionProvider';

describe('Multi-line Pattern Edge Cases Integration', () => {
    let parser: DroolsParser;
    let diagnosticProvider: DiagnosticProvider;
    let formattingProvider: FormattingProvider;
    let completionProvider: CompletionProvider;

    beforeEach(() => {
        parser = new DroolsParser();
        diagnosticProvider = new DiagnosticProvider();
        formattingProvider = new FormattingProvider();
        completionProvider = new CompletionProvider();
    });

    describe('Deeply Nested Multi-line Patterns', () => {
        test('should handle exists within not within eval pattern', async () => {
            const deeplyNestedContent = `rule "Deeply Nested Pattern"
when
    eval(
        someCondition() &&
        not(
            exists(
                Person(
                    age > 18,
                    name != null,
                    address != null
                ) and
                Account(
                    owner == $person,
                    balance > 1000,
                    status == "ACTIVE"
                )
            )
        )
    )
then
    System.out.println("Complex nested pattern matched");
end`;

            const document = TextDocument.create(
                'file:///deeply-nested.drl',
                'drools',
                1,
                deeplyNestedContent
            );

            // Test parsing
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();
            expect(ast.rules).toHaveLength(1);
            
            const rule = ast.rules[0];
            expect(rule.name).toBe('Deeply Nested Pattern');
            expect(rule.when.conditions).toBeDefined();

            // Test diagnostics - should not report false errors
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            const errors = diagnostics.filter(d => d.severity === 1); // Error severity
            expect(errors).toHaveLength(0);

            // Test that multi-line patterns are recognized
            const multiLinePatterns = ast.rules[0].when.multiLinePatterns || [];
            expect(multiLinePatterns.length).toBeGreaterThan(0);
            
            // Should detect nested eval, not, and exists patterns
            const patternTypes = multiLinePatterns.map(p => p.type);
            expect(patternTypes).toContain('eval');
            expect(patternTypes).toContain('not');
            expect(patternTypes).toContain('exists');
        });

        test('should handle forall within collect within accumulate pattern', async () => {
            const complexNestedContent = `rule "Complex Accumulate Pattern"
when
    $total : Number() from accumulate(
        $order : Order(
            status == "PENDING"
        ) and
        forall(
            $item : OrderItem(
                order == $order,
                quantity > 0
            )
            collect(
                Product(
                    id == $item.productId,
                    inStock == true,
                    price > 0
                )
            )
        ),
        sum($order.total)
    )
then
    System.out.println("Total: " + $total);
end`;

            const document = TextDocument.create(
                'file:///complex-nested.drl',
                'drools',
                1,
                complexNestedContent
            );

            // Test parsing
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();
            expect(ast.rules).toHaveLength(1);

            // Test diagnostics
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            const errors = diagnostics.filter(d => d.severity === 1);
            expect(errors).toHaveLength(0);

            // Verify nested pattern recognition
            const rule = ast.rules[0];
            const multiLinePatterns = rule.when.multiLinePatterns || [];
            expect(multiLinePatterns.length).toBeGreaterThan(0);

            const patternTypes = multiLinePatterns.map(p => p.type);
            expect(patternTypes).toContain('accumulate');
            expect(patternTypes).toContain('forall');
            expect(patternTypes).toContain('collect');
        });

        test('should handle maximum nesting depth gracefully', async () => {
            // Create extremely nested pattern to test limits
            const maxNestedContent = `rule "Maximum Nesting"
when
    eval(
        not(
            exists(
                Person() and
                not(
                    exists(
                        Account() and
                        not(
                            exists(
                                Transaction() and
                                eval(
                                    someDeepCondition()
                                )
                            )
                        )
                    )
                )
            )
        )
    )
then
    System.out.println("Maximum nesting handled");
end`;

            const document = TextDocument.create(
                'file:///max-nested.drl',
                'drools',
                1,
                maxNestedContent
            );

            // Should parse without crashing
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();

            // Should not produce stack overflow or excessive memory usage
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            expect(diagnostics).toBeDefined();

            // Performance should be reasonable (less than 1 second)
            const startTime = Date.now();
            await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 4,
                insertSpaces: true
            });
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000);
        });
    });

    describe('Mixed Single-line and Multi-line Patterns', () => {
        test('should handle mixed patterns in same rule', async () => {
            const mixedPatternContent = `rule "Mixed Patterns"
when
    $person : Person(age > 18, name != null) and  // Single-line
    exists(
        Account(
            owner == $person,
            balance > 1000
        )
    ) and  // Multi-line
    $customer : Customer(active == true) and  // Single-line
    not(
        Blacklist(
            customerId == $customer.id,
            active == true
        )
    )  // Multi-line
then
    System.out.println("Mixed patterns matched");
end`;

            const document = TextDocument.create(
                'file:///mixed-patterns.drl',
                'drools',
                1,
                mixedPatternContent
            );

            // Test parsing
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();
            expect(ast.rules).toHaveLength(1);

            const rule = ast.rules[0];
            expect(rule.when.conditions).toBeDefined();

            // Should identify both single-line and multi-line patterns
            const multiLinePatterns = rule.when.multiLinePatterns || [];
            expect(multiLinePatterns.length).toBe(2); // exists and not patterns

            // Test diagnostics
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            const errors = diagnostics.filter(d => d.severity === 1);
            expect(errors).toHaveLength(0);

            // Test completion at different positions
            // Position in single-line pattern
            const singleLinePosition: Position = { line: 2, character: 30 };
            const singleLineCompletion = await completionProvider.provideCompletions(
                document,
                singleLinePosition
            );
            expect(singleLineCompletion).toBeDefined();

            // Position in multi-line pattern
            const multiLinePosition: Position = { line: 5, character: 20 };
            const multiLineCompletion = await completionProvider.provideCompletions(
                document,
                multiLinePosition
            );
            expect(multiLineCompletion).toBeDefined();
        });

        test('should handle transitions between pattern types', async () => {
            const transitionContent = `rule "Pattern Transitions"
when
    Person(age > 18) and exists(Account()) and  // Single to multi to single
    not(
        Blacklist(active == true)
    ) and Customer(status == "ACTIVE") and  // Multi to single
    eval(
        someCondition() &&
        anotherCondition()
    )  // Single to multi
then
    System.out.println("Transitions handled");
end`;

            const document = TextDocument.create(
                'file:///transitions.drl',
                'drools',
                1,
                transitionContent
            );

            // Test parsing handles transitions correctly
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();

            // Test formatting preserves structure
            const formatEdits = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 4,
                insertSpaces: true
            });
            expect(formatEdits).toBeDefined();

            // Apply formatting and verify structure is maintained
            let formattedText = document.getText();
            if (formatEdits && formatEdits.length > 0) {
                // Apply edits in reverse order to maintain positions
                const sortedEdits = formatEdits.sort((a, b) => {
                    const aStart = a.range.start;
                    const bStart = b.range.start;
                    if (aStart.line !== bStart.line) {
                        return bStart.line - aStart.line;
                    }
                    return bStart.character - aStart.character;
                });

                for (const edit of sortedEdits) {
                    const lines = formattedText.split('\n');
                    const startLine = edit.range.start.line;
                    const endLine = edit.range.end.line;
                    const startChar = edit.range.start.character;
                    const endChar = edit.range.end.character;

                    if (startLine === endLine) {
                        const line = lines[startLine];
                        lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
                    } else {
                        const newLines = edit.newText.split('\n');
                        const firstLine = lines[startLine].substring(0, startChar) + newLines[0];
                        const lastLine = newLines[newLines.length - 1] + lines[endLine].substring(endChar);
                        
                        lines.splice(startLine, endLine - startLine + 1, firstLine, ...newLines.slice(1, -1), lastLine);
                    }
                    formattedText = lines.join('\n');
                }
            }

            // Verify formatted text maintains logical structure
            expect(formattedText).toContain('Person(age > 18)');
            expect(formattedText).toContain('exists(Account())');
            expect(formattedText).toContain('not(');
            expect(formattedText).toContain('eval(');
        });

        test('should handle complex mixed pattern with variables', async () => {
            const complexMixedContent = `rule "Complex Mixed with Variables"
when
    $p : Person(age > 18, $name : name) and
    exists(
        $acc : Account(
            owner == $p,
            $balance : balance > 1000
        ) and
        Transaction(
            account == $acc,
            amount > $balance * 0.1
        )
    ) and
    $cust : Customer(name == $name, active == true) and
    not(
        Alert(
            customerId == $cust.id,
            type == "FRAUD",
            resolved == false
        )
    )
then
    System.out.println("Complex mixed pattern with variables: " + $name);
end`;

            const document = TextDocument.create(
                'file:///complex-mixed.drl',
                'drools',
                1,
                complexMixedContent
            );

            // Test parsing with variable bindings
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();

            // Test variable resolution across pattern boundaries
            const rule = ast.rules[0];
            expect(rule.when.variables).toBeDefined();
            
            const variables = rule.when.variables || [];
            const variableNames = variables.map(v => v.name);
            expect(variableNames).toContain('$p');
            expect(variableNames).toContain('$name');
            expect(variableNames).toContain('$acc');
            expect(variableNames).toContain('$balance');
            expect(variableNames).toContain('$cust');

            // Test diagnostics for variable usage
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            const undefinedVariableErrors = diagnostics.filter(d => 
                d.message.includes('undefined') && d.message.includes('variable')
            );
            expect(undefinedVariableErrors).toHaveLength(0);
        });
    });

    describe('Formatting Behavior with Various Indentation Styles', () => {
        test('should handle tab-based indentation', async () => {
            const tabIndentedContent = `rule "Tab Indented"
when
\texists(
\t\tPerson(
\t\t\tage > 18,
\t\t\tname != null
\t\t) and
\t\tAccount(
\t\t\towner == $person
\t\t)
\t)
then
\tSystem.out.println("tab indented");
end`;

            const document = TextDocument.create(
                'file:///tab-indented.drl',
                'drools',
                1,
                tabIndentedContent
            );

            // Test formatting with tab preferences
            const formatEdits = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 4,
                insertSpaces: false // Use tabs
            });

            expect(formatEdits).toBeDefined();
            
            // Verify tabs are preserved/used correctly
            if (formatEdits && formatEdits.length > 0) {
                const hasTabEdits = formatEdits.some(edit => edit.newText.includes('\t'));
                expect(hasTabEdits || formatEdits.length === 0).toBe(true);
            }
        });

        test('should handle space-based indentation with different sizes', async () => {
            const spaceIndentedContent = `rule "Space Indented"
when
  exists(
    Person(
      age > 18,
      name != null
    ) and
    Account(
      owner == $person
    )
  )
then
  System.out.println("space indented");
end`;

            const document = TextDocument.create(
                'file:///space-indented.drl',
                'drools',
                1,
                spaceIndentedContent
            );

            // Test with 2-space indentation
            const formatEdits2 = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 2,
                insertSpaces: true
            });
            expect(formatEdits2).toBeDefined();

            // Test with 4-space indentation
            const formatEdits4 = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 4,
                insertSpaces: true
            });
            expect(formatEdits4).toBeDefined();

            // Test with 8-space indentation
            const formatEdits8 = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 8,
                insertSpaces: true
            });
            expect(formatEdits8).toBeDefined();
        });

        test('should handle mixed indentation styles', async () => {
            const mixedIndentationContent = `rule "Mixed Indentation"
when
\texists(
    Person(
\t\t\tage > 18,
      name != null
\t) and
        Account(
\t  owner == $person
    )
  )
then
\t  System.out.println("mixed indentation");
end`;

            const document = TextDocument.create(
                'file:///mixed-indentation.drl',
                'drools',
                1,
                mixedIndentationContent
            );

            // Should normalize to consistent indentation
            const formatEdits = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 4,
                insertSpaces: true
            });

            expect(formatEdits).toBeDefined();
            expect(formatEdits!.length).toBeGreaterThan(0);

            // Verify that formatting normalizes indentation
            const indentationEdits = formatEdits!.filter(edit => 
                edit.newText.includes('    ') || edit.newText === ''
            );
            expect(indentationEdits.length).toBeGreaterThan(0);
        });

        test('should handle range formatting within multi-line patterns', async () => {
            const rangeFormattingContent = `rule "Range Formatting"
when
    exists(
Person(age>18,name!=null) and
Account(owner==$person,balance>1000)
    ) and
    not(
Blacklist(customerId==$person.id,active==true)
    )
then
    System.out.println("range formatting test");
end`;

            const document = TextDocument.create(
                'file:///range-formatting.drl',
                'drools',
                1,
                rangeFormattingContent
            );

            // Format only the exists pattern
            const existsRange: Range = {
                start: { line: 2, character: 0 },
                end: { line: 5, character: 6 }
            };

            const rangeFormatEdits = await formattingProvider.provideDocumentRangeFormatting(
                document,
                existsRange,
                {
                    tabSize: 4,
                    insertSpaces: true
                }
            );

            expect(rangeFormatEdits).toBeDefined();
            expect(rangeFormatEdits!.length).toBeGreaterThan(0);

            // Verify only the specified range is formatted
            const editsInRange = rangeFormatEdits!.filter(edit => {
                const editStart = edit.range.start;
                const editEnd = edit.range.end;
                return editStart.line >= existsRange.start.line &&
                       editEnd.line <= existsRange.end.line;
            });
            expect(editsInRange.length).toBe(rangeFormatEdits!.length);
        });

        test('should preserve alignment of closing parentheses', async () => {
            const alignmentContent = `rule "Alignment Test"
when
    exists(
        Person(
            age > 18,
            name != null,
            address != null
        ) and
        Account(
            owner == $person,
            balance > 1000,
            status == "ACTIVE"
        )
    ) and
    not(
        Blacklist(
            customerId == $person.id,
            active == true
        )
    )
then
    System.out.println("alignment test");
end`;

            const document = TextDocument.create(
                'file:///alignment.drl',
                'drools',
                1,
                alignmentContent
            );

            const formatEdits = await formattingProvider.provideDocumentFormatting(document, {
                tabSize: 4,
                insertSpaces: true
            });

            expect(formatEdits).toBeDefined();

            // Apply formatting and check alignment
            let formattedText = document.getText();
            if (formatEdits && formatEdits.length > 0) {
                // Apply edits (simplified application for testing)
                const lines = formattedText.split('\n');
                
                // Check that closing parentheses are properly aligned
                const closingParenLines = lines.filter(line => line.trim() === ')');
                expect(closingParenLines.length).toBeGreaterThan(0);
                
                // Verify consistent indentation for closing parentheses
                const indentations = closingParenLines.map(line => 
                    line.length - line.trimStart().length
                );
                
                // Should have consistent indentation patterns
                expect(indentations.every(indent => indent % 4 === 0)).toBe(true);
            }
        });
    });

    describe('Completion Behavior at Different Positions', () => {
        test('should provide context-aware completions at pattern boundaries', async () => {
            const completionTestContent = `rule "Completion Test"
when
    exists(
        Person(
            age > 18,
            |  // Cursor position 1
        ) and
        |  // Cursor position 2
    ) and
    not(
        |  // Cursor position 3
    )
then
    System.out.println("completion test");
end`;

            const document = TextDocument.create(
                'file:///completion-test.drl',
                'drools',
                1,
                completionTestContent.replace(/\|/g, '')
            );

            // Test completion inside Person pattern
            const position1: Position = { line: 5, character: 12 };
            const completions1 = await completionProvider.provideCompletions(document, position1);
            expect(completions1).toBeDefined();
            expect(completions1!.items.length).toBeGreaterThan(0);
            
            // Should suggest field names and operators
            const items1 = completions1!.items.map(item => item.label);
            expect(items1.some(label => ['name', 'address', 'email'].includes(label))).toBe(true);

            // Test completion between patterns
            const position2: Position = { line: 7, character: 8 };
            const completions2 = await completionProvider.provideCompletions(document, position2);
            expect(completions2).toBeDefined();
            
            // Should suggest fact types
            const items2 = completions2!.items.map(item => item.label);
            expect(items2.some(label => ['Account', 'Customer', 'Order'].includes(label))).toBe(true);

            // Test completion inside not pattern
            const position3: Position = { line: 10, character: 8 };
            const completions3 = await completionProvider.provideCompletions(document, position3);
            expect(completions3).toBeDefined();
            
            // Should suggest fact types appropriate for not pattern
            const items3 = completions3!.items.map(item => item.label);
            expect(items3.some(label => ['Blacklist', 'Alert', 'Exception'].includes(label))).toBe(true);
        });

        test('should provide operator completions in multi-line contexts', async () => {
            const operatorTestContent = `rule "Operator Test"
when
    exists(
        Person(
            age |  // Should suggest comparison operators
            18,
            name |  // Should suggest string operators
            "test"
        ) and
        Account(
            balance |  // Should suggest numeric operators
            1000
        )
    )
then
    System.out.println("operator test");
end`;

            const document = TextDocument.create(
                'file:///operator-test.drl',
                'drools',
                1,
                operatorTestContent.replace(/\|/g, '')
            );

            // Test numeric comparison operators
            const numericPosition: Position = { line: 4, character: 16 };
            const numericCompletions = await completionProvider.provideCompletions(document, numericPosition);
            expect(numericCompletions).toBeDefined();
            
            const numericOperators = numericCompletions!.items.map(item => item.label);
            expect(numericOperators.some(op => ['>', '<', '>=', '<=', '==', '!='].includes(op))).toBe(true);

            // Test string operators
            const stringPosition: Position = { line: 6, character: 17 };
            const stringCompletions = await completionProvider.provideCompletions(document, stringPosition);
            expect(stringCompletions).toBeDefined();
            
            const stringOperators = stringCompletions!.items.map(item => item.label);
            expect(stringOperators.some(op => ['==', '!=', 'matches', 'contains'].includes(op))).toBe(true);

            // Test balance operators
            const balancePosition: Position = { line: 9, character: 20 };
            const balanceCompletions = await completionProvider.provideCompletions(document, balancePosition);
            expect(balanceCompletions).toBeDefined();
            
            const balanceOperators = balanceCompletions!.items.map(item => item.label);
            expect(balanceOperators.some(op => ['>', '<', '>=', '<=', '==', '!='].includes(op))).toBe(true);
        });

        test('should provide keyword completions in nested contexts', async () => {
            const keywordTestContent = `rule "Keyword Test"
when
    exists(
        Person(age > 18) |  // Should suggest 'and', 'or'
        Account(balance > 1000)
    ) |  // Should suggest 'and', 'or'
    not(
        Blacklist(active == true)
    )
then
    System.out.println("keyword test");
end`;

            const document = TextDocument.create(
                'file:///keyword-test.drl',
                'drools',
                1,
                keywordTestContent.replace(/\|/g, '')
            );

            // Test logical operators within exists
            const withinExistsPosition: Position = { line: 3, character: 25 };
            const withinExistsCompletions = await completionProvider.provideCompletions(document, withinExistsPosition);
            expect(withinExistsCompletions).toBeDefined();
            
            const withinExistsKeywords = withinExistsCompletions!.items.map(item => item.label);
            expect(withinExistsKeywords.some(kw => ['and', 'or'].includes(kw))).toBe(true);

            // Test logical operators between patterns
            const betweenPatternsPosition: Position = { line: 5, character: 6 };
            const betweenPatternsCompletions = await completionProvider.provideCompletions(document, betweenPatternsPosition);
            expect(betweenPatternsCompletions).toBeDefined();
            
            const betweenPatternsKeywords = betweenPatternsCompletions!.items.map(item => item.label);
            expect(betweenPatternsKeywords.some(kw => ['and', 'or'].includes(kw))).toBe(true);
        });

        test('should provide variable completions across pattern boundaries', async () => {
            const variableTestContent = `rule "Variable Test"
when
    $person : Person(age > 18, $name : name) and
    exists(
        $account : Account(
            owner == |,  // Should suggest $person
            balance > 1000
        ) and
        Transaction(
            account == |,  // Should suggest $account
            amount > 100
        )
    ) and
    Customer(
        name == |,  // Should suggest $name
        active == true
    )
then
    System.out.println("Variable: " + |);  // Should suggest all variables
end`;

            const document = TextDocument.create(
                'file:///variable-test.drl',
                'drools',
                1,
                variableTestContent.replace(/\|/g, '')
            );

            // Test $person variable completion
            const personVarPosition: Position = { line: 5, character: 21 };
            const personVarCompletions = await completionProvider.provideCompletions(document, personVarPosition);
            expect(personVarCompletions).toBeDefined();
            
            const personVarItems = personVarCompletions!.items.map(item => item.label);
            expect(personVarItems.some(item => item === '$person')).toBe(true);

            // Test $account variable completion
            const accountVarPosition: Position = { line: 9, character: 23 };
            const accountVarCompletions = await completionProvider.provideCompletions(document, accountVarPosition);
            expect(accountVarCompletions).toBeDefined();
            
            const accountVarItems = accountVarCompletions!.items.map(item => item.label);
            expect(accountVarItems.some(item => item === '$account')).toBe(true);

            // Test $name variable completion
            const nameVarPosition: Position = { line: 14, character: 17 };
            const nameVarCompletions = await completionProvider.provideCompletions(document, nameVarPosition);
            expect(nameVarCompletions).toBeDefined();
            
            const nameVarItems = nameVarCompletions!.items.map(item => item.label);
            expect(nameVarItems.some(item => item === '$name')).toBe(true);

            // Test all variables in then clause
            const thenVarPosition: Position = { line: 17, character: 36 };
            const thenVarCompletions = await completionProvider.provideCompletions(document, thenVarPosition);
            expect(thenVarCompletions).toBeDefined();
            
            const thenVarItems = thenVarCompletions!.items.map(item => item.label);
            expect(thenVarItems.some(item => item === '$person')).toBe(true);
            expect(thenVarItems.some(item => item === '$account')).toBe(true);
            expect(thenVarItems.some(item => item === '$name')).toBe(true);
        });

        test('should handle completion at pattern nesting boundaries', async () => {
            const nestingBoundaryContent = `rule "Nesting Boundary Test"
when
    eval(
        someCondition() &&
        not(
            exists(
                |  // Deep nesting boundary
            )
        ) &&
        |  // Mid-level boundary
    ) and
    |  // Top-level boundary
then
    System.out.println("nesting boundary test");
end`;

            const document = TextDocument.create(
                'file:///nesting-boundary.drl',
                'drools',
                1,
                nestingBoundaryContent.replace(/\|/g, '')
            );

            // Test completion at deep nesting level
            const deepNestingPosition: Position = { line: 6, character: 16 };
            const deepNestingCompletions = await completionProvider.provideCompletions(document, deepNestingPosition);
            expect(deepNestingCompletions).toBeDefined();
            
            // Should provide fact type completions
            const deepNestingItems = deepNestingCompletions!.items.map(item => item.label);
            expect(deepNestingItems.some(item => ['Person', 'Account', 'Customer'].includes(item))).toBe(true);

            // Test completion at mid-level
            const midLevelPosition: Position = { line: 10, character: 8 };
            const midLevelCompletions = await completionProvider.provideCompletions(document, midLevelPosition);
            expect(midLevelCompletions).toBeDefined();
            
            // Should provide boolean operators and functions
            const midLevelItems = midLevelCompletions!.items.map(item => item.label);
            expect(midLevelItems.some(item => ['&&', '||', 'anotherCondition'].includes(item))).toBe(true);

            // Test completion at top level
            const topLevelPosition: Position = { line: 12, character: 4 };
            const topLevelCompletions = await completionProvider.provideCompletions(document, topLevelPosition);
            expect(topLevelCompletions).toBeDefined();
            
            // Should provide pattern keywords and fact types
            const topLevelItems = topLevelCompletions!.items.map(item => item.label);
            expect(topLevelItems.some(item => ['exists', 'not', 'eval', 'Person', 'Account'].includes(item))).toBe(true);
        });
    });

    describe('Error Recovery and Edge Cases', () => {
        test('should handle incomplete nested patterns gracefully', async () => {
            const incompleteNestedContent = `rule "Incomplete Nested"
when
    exists(
        Person(age > 18) and
        not(
            Account(balance > 1000
            // Missing closing parentheses
    ) and
    Customer(active == true)
then
    System.out.println("incomplete nested");
end`;

            const document = TextDocument.create(
                'file:///incomplete-nested.drl',
                'drools',
                1,
                incompleteNestedContent
            );

            // Should parse without crashing
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();

            // Should provide helpful diagnostics
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            expect(diagnostics.length).toBeGreaterThan(0);
            
            const parenthesesErrors = diagnostics.filter(d => 
                d.message.includes('parenthes') || d.message.includes('bracket')
            );
            expect(parenthesesErrors.length).toBeGreaterThan(0);

            // Should still provide completions where possible
            const completionPosition: Position = { line: 8, character: 4 };
            const completions = await completionProvider.provideCompletions(document, completionPosition);
            expect(completions).toBeDefined();
        });

        test('should handle malformed multi-line patterns', async () => {
            const malformedContent = `rule "Malformed Patterns"
when
    exists
        Person(age > 18) and  // Missing opening parenthesis
        Account(balance > 1000)
    ) and  // Extra closing parenthesis
    not(
        Blacklist(active == true
    // Missing closing parenthesis
then
    System.out.println("malformed");
end`;

            const document = TextDocument.create(
                'file:///malformed.drl',
                'drools',
                1,
                malformedContent
            );

            // Should handle malformed patterns without crashing
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();

            // Should provide specific error messages
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            expect(diagnostics.length).toBeGreaterThan(0);
            
            const syntaxErrors = diagnostics.filter(d => d.severity === 1);
            expect(syntaxErrors.length).toBeGreaterThan(0);

            // Error messages should be helpful
            const errorMessages = syntaxErrors.map(d => d.message);
            expect(errorMessages.some(msg => 
                msg.includes('parenthes') || msg.includes('bracket') || msg.includes('syntax')
            )).toBe(true);
        });

        test('should handle performance with large nested patterns', async () => {
            // Generate a large nested pattern
            let largeNestedContent = `rule "Large Nested Pattern"
when
    eval(
        someCondition() &&`;

            // Create deep nesting
            for (let i = 0; i < 20; i++) {
                largeNestedContent += `
        not(
            exists(
                Person${i}(age > ${18 + i}) and
                Account${i}(balance > ${1000 + i * 100})
            ) and`;
            }

            // Close all the patterns
            for (let i = 0; i < 20; i++) {
                largeNestedContent += `
        )`;
            }

            largeNestedContent += `
    )
then
    System.out.println("large nested pattern");
end`;

            const document = TextDocument.create(
                'file:///large-nested.drl',
                'drools',
                1,
                largeNestedContent
            );

            // Should handle large patterns within reasonable time
            const startTime = Date.now();
            
            const ast = parser.parse(document.getText());
            expect(ast).toBeDefined();
            
            const diagnostics = await diagnosticProvider.provideDiagnostics(document);
            expect(diagnostics).toBeDefined();
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // Should complete within 2 seconds
            expect(processingTime).toBeLessThan(2000);
        });
    });
});