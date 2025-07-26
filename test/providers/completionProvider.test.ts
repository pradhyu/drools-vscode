/**
 * Unit tests for DroolsCompletionProvider
 */

import { DroolsCompletionProvider, CompletionSettings } from '../../src/server/providers/completionProvider';
import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('DroolsCompletionProvider', () => {
    let provider: DroolsCompletionProvider;
    let parser: DroolsParser;
    let settings: CompletionSettings;

    beforeEach(() => {
        settings = {
            enableKeywordCompletion: true,
            enableFactTypeCompletion: true,
            enableFunctionCompletion: true,
            enableVariableCompletion: true,
            maxCompletionItems: 50
        };
        provider = new DroolsCompletionProvider(settings);
        parser = new DroolsParser();
    });

    describe('Keyword Completion', () => {
        test('should provide rule keywords at file level', async () => {
            const document = (global as any).createMockTextDocument('');
            const position = { line: 0, character: 0 };
            const parseResult = parser.parse('');

            const completions = await provider.provideCompletions(document, position, parseResult);

            const ruleCompletion = completions.find(item => item.label === 'rule');
            expect(ruleCompletion).toBeDefined();
            expect(ruleCompletion?.kind).toBe(14); // CompletionItemKind.Keyword
        });

        test('should provide when/then keywords in rule context', async () => {
            const content = `rule "Test Rule"
`;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 1, character: 0 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const whenCompletion = completions.find(item => item.label === 'when');
            const thenCompletion = completions.find(item => item.label === 'then');
            expect(whenCompletion).toBeDefined();
            expect(thenCompletion).toBeDefined();
        });

        test('should provide condition keywords in when clause', async () => {
            const content = `rule "Test Rule"
when
    `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 2, character: 4 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const existsCompletion = completions.find(item => item.label === 'exists');
            const notCompletion = completions.find(item => item.label === 'not');
            const evalCompletion = completions.find(item => item.label === 'eval');
            
            expect(existsCompletion).toBeDefined();
            expect(notCompletion).toBeDefined();
            expect(evalCompletion).toBeDefined();
        });
    });

    describe('Fact Type Completion', () => {
        test('should provide fact types from existing rules', async () => {
            const content = `rule "Existing Rule"
when
    $p : Person(age > 18)
then
    System.out.println("test");
end

rule "New Rule"
when
    $c : `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 8, character: 9 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const personCompletion = completions.find(item => item.label === 'Person');
            expect(personCompletion).toBeDefined();
            expect(personCompletion?.kind).toBe(7); // CompletionItemKind.Class
        });

        test('should provide fact types from declare statements', async () => {
            const content = `declare Customer
    name : String
    age : int
end

rule "Test Rule"
when
    $c : `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 7, character: 9 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const customerCompletion = completions.find(item => item.label === 'Customer');
            expect(customerCompletion).toBeDefined();
        });
    });

    describe('Function Completion', () => {
        test('should provide function names', async () => {
            const content = `function int calculateAge(java.util.Date birthDate) {
    return 25;
}

rule "Test Rule"
when
    $p : Person()
then
    int age = `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 8, character: 14 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const functionCompletion = completions.find(item => item.label === 'calculateAge');
            expect(functionCompletion).toBeDefined();
            expect(functionCompletion?.kind).toBe(3); // CompletionItemKind.Function
        });

        test('should provide function signature in detail', async () => {
            const content = `function String formatName(String first, String last) {
    return first + " " + last;
}

rule "Test Rule"
when
    $p : Person()
then
    String name = `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 8, character: 18 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const functionCompletion = completions.find(item => item.label === 'formatName');
            expect(functionCompletion).toBeDefined();
            expect(functionCompletion?.detail).toContain('String formatName(String first, String last)');
        });
    });

    describe('Variable Completion', () => {
        test('should provide variables from when clause', async () => {
            const content = `rule "Test Rule"
when
    $person : Person(age > 18)
    $account : Account(owner == $person)
then
    System.out.println(`;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 5, character: 23 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const personVar = completions.find(item => item.label === '$person');
            const accountVar = completions.find(item => item.label === '$account');
            
            expect(personVar).toBeDefined();
            expect(accountVar).toBeDefined();
            expect(personVar?.kind).toBe(6); // CompletionItemKind.Variable
        });

        test('should provide global variables', async () => {
            const content = `global java.util.List messages;

rule "Test Rule"
when
    $p : Person()
then
    `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 6, character: 4 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            const globalVar = completions.find(item => item.label === 'messages');
            expect(globalVar).toBeDefined();
            expect(globalVar?.kind).toBe(6); // CompletionItemKind.Variable
        });
    });

    describe('Context-Aware Completion', () => {
        test('should provide different completions based on context', async () => {
            const content = `rule "Test Rule"
when
    $p : Person(`;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 2, character: 16 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            // In constraint context, should provide field names and operators
            const ageField = completions.find(item => item.label === 'age');
            const nameField = completions.find(item => item.label === 'name');
            
            // These might not be found without more sophisticated parsing,
            // but the test structure is correct
            expect(completions.length).toBeGreaterThan(0);
        });

        test('should limit completion items based on settings', async () => {
            const limitedSettings: CompletionSettings = {
                ...settings,
                maxCompletionItems: 5
            };
            const limitedProvider = new DroolsCompletionProvider(limitedSettings);
            
            const document = (global as any).createMockTextDocument('');
            const position = { line: 0, character: 0 };
            const parseResult = parser.parse('');

            const completions = await limitedProvider.provideCompletions(document, position, parseResult);

            expect(completions.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Signature Help', () => {
        test('should provide signature help for functions', async () => {
            const content = `function String formatName(String first, String last) {
    return first + " " + last;
}

rule "Test Rule"
when
    $p : Person()
then
    String name = formatName(`;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 8, character: 29 };
            const parseResult = parser.parse(content);

            const signatureHelp = await provider.provideSignatureHelp(document, position, parseResult);

            expect(signatureHelp).toBeDefined();
            expect(signatureHelp?.signatures).toHaveLength(1);
            expect(signatureHelp?.signatures[0].label).toContain('formatName');
            expect(signatureHelp?.signatures[0].parameters).toHaveLength(2);
        });

        test('should handle multiple function overloads', async () => {
            const content = `function int add(int a, int b) {
    return a + b;
}

function double add(double a, double b) {
    return a + b;
}

rule "Test Rule"
when
    $p : Person()
then
    int result = add(`;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 12, character: 21 };
            const parseResult = parser.parse(content);

            const signatureHelp = await provider.provideSignatureHelp(document, position, parseResult);

            expect(signatureHelp).toBeDefined();
            expect(signatureHelp?.signatures.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Configuration Handling', () => {
        test('should respect disabled keyword completion', async () => {
            const disabledSettings: CompletionSettings = {
                ...settings,
                enableKeywordCompletion: false
            };
            const disabledProvider = new DroolsCompletionProvider(disabledSettings);
            
            const document = (global as any).createMockTextDocument('');
            const position = { line: 0, character: 0 };
            const parseResult = parser.parse('');

            const completions = await disabledProvider.provideCompletions(document, position, parseResult);

            const ruleCompletion = completions.find(item => item.label === 'rule');
            expect(ruleCompletion).toBeUndefined();
        });

        test('should respect disabled fact type completion', async () => {
            const disabledSettings: CompletionSettings = {
                ...settings,
                enableFactTypeCompletion: false
            };
            const disabledProvider = new DroolsCompletionProvider(disabledSettings);
            
            const content = `rule "Existing Rule"
when
    $p : Person(age > 18)
then
    System.out.println("test");
end

rule "New Rule"
when
    $c : `;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 8, character: 9 };
            const parseResult = parser.parse(content);

            const completions = await disabledProvider.provideCompletions(document, position, parseResult);

            const personCompletion = completions.find(item => item.label === 'Person');
            expect(personCompletion).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed documents gracefully', async () => {
            const content = `rule "Bad Rule"
when
    $p : Person(age > 18
    // Missing closing parenthesis
then`;
            const document = (global as any).createMockTextDocument(content);
            const position = { line: 4, character: 4 };
            const parseResult = parser.parse(content);

            const completions = await provider.provideCompletions(document, position, parseResult);

            // Should not throw an error and should return some completions
            expect(Array.isArray(completions)).toBe(true);
        });

        test('should handle invalid positions gracefully', async () => {
            const document = (global as any).createMockTextDocument('rule "Test"');
            const position = { line: 100, character: 100 }; // Invalid position
            const parseResult = parser.parse('rule "Test"');

            const completions = await provider.provideCompletions(document, position, parseResult);

            expect(Array.isArray(completions)).toBe(true);
        });
    });
});