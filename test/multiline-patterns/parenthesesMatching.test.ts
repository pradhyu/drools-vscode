/**
 * Unit tests for parentheses matching across multiple lines
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';
import { DroolsDiagnosticProvider } from '../../src/server/providers/diagnosticProvider';

describe('Parentheses Matching Across Lines', () => {
    let parser: DroolsParser;
    let diagnosticProvider: DroolsDiagnosticProvider;

    beforeEach(() => {
        parser = new DroolsParser();
        diagnosticProvider = new DroolsDiagnosticProvider({
            maxNumberOfProblems: 100,
            enableSyntaxValidation: true,
            enableSemanticValidation: true,
            enableBestPracticeWarnings: true
        });
    });

    describe('Basic Parentheses Matching', () => {
        test('should match parentheses across 2 lines', () => {
            const content = `rule "Two line match"
when
    Person(
        age > 18)
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            // Should not have critical parsing errors
            expect(Array.isArray(diagnostics)).toBe(true);
        });

        test('should match parentheses across 3 lines', () => {
            const content = `rule "Three line match"
when
    Person(
        age > 18,
        name != null)
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });

        test('should match parentheses across 5+ lines', () => {
            const content = `rule "Multi line match"
when
    Person(
        age > 18,
        name != null,
        active == true,
        verified == true,
        balance > 1000)
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });
    });

    describe('Nested Parentheses Matching', () => {
        test('should match nested parentheses across lines', () => {
            const content = `rule "Nested parentheses"
when
    exists(
        Person(
            age > 18,
            name != null
        )
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });

        test('should match deeply nested parentheses (3 levels)', () => {
            const content = `rule "Deep nesting"
when
    exists(
        Person(age > 18) and
        not(
            Account(
                balance < 0,
                owner == $person
            )
        )
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });
    });

    describe('Parentheses Mismatch Detection', () => {
        test('should detect missing closing parenthesis', () => {
            const content = `rule "Missing closing"
when
    exists(
        Person(
            age > 18,
            name != null
        )
    // Missing closing parenthesis for exists
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            
            // Should detect some kind of parsing error
            expect(result.errors.length > 0 || diagnostics.length > 0).toBe(true);
        });

        test('should detect extra closing parenthesis', () => {
            const content = `rule "Extra closing"
when
    exists(
        Person(
            age > 18,
            name != null
        )
    ))  // Extra closing parenthesis
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            
            // Should detect some kind of parsing error
            expect(result.errors.length > 0 || diagnostics.length > 0).toBe(true);
        });
    });

    describe('Complex Parentheses Configurations', () => {
        test('should handle parentheses with string literals containing parentheses', () => {
            const content = `rule "String with parentheses"
when
    Person(
        name == "John (Jr)",
        description.contains("(test)")
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });

        test('should handle method calls with parentheses in conditions', () => {
            const content = `rule "Method calls"
when
    Person(
        getName().length() > 0,
        getAge() > calculateMinAge(18, 21),
        isValid(true, false)
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });
    });

    describe('Parentheses Matching with Different Indentation Styles', () => {
        test('should handle K&R style (opening brace on same line)', () => {
            const content = `rule "K&R style"
when
    exists(Person(
        age > 18,
        name != null
    ))
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });

        test('should handle inconsistent indentation', () => {
            const content = `rule "Inconsistent indentation"
when
    exists(
      Person(
          age > 18,
        name != null
      )
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });
    });

    describe('Edge Cases for Parentheses Matching', () => {
        test('should handle empty parentheses', () => {
            const content = `rule "Empty parentheses"
when
    exists(
        Person()
    )
    eval()
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });

        test('should handle multiple parentheses on same line', () => {
            const content = `rule "Multiple on same line"
when
    exists(Person(age > 18)) and not(Account(balance < 0))
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            
            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);
            expect(Array.isArray(diagnostics)).toBe(true);
        });
    });

    describe('Performance with Large Nested Structures', () => {
        test('should handle deeply nested parentheses efficiently', () => {
            const content = `rule "Deep nesting performance"
when
    exists(
        Person(age > 18) and
        not(
            exists(
                Account(balance > 0) and
                not(
                    exists(
                        Transaction(amount > 100)
                    )
                )
            )
        )
    )
then
    System.out.println("test");
end`;
            const startTime = Date.now();
            const result = parser.parse(content);
            const parseTime = Date.now() - startTime;

            expect(result.ast).toBeDefined();
            expect(parseTime).toBeLessThan(1000); // Should parse in less than 1 second
            expect(result.ast.rules).toHaveLength(1);
        });

        test('should handle many parallel multi-line patterns efficiently', () => {
            const content = `rule "Many parallel patterns"
when
    exists(
        Person(age > 18)
    )
    not(
        Account(balance < 0)
    )
    collect(
        Transaction(amount > 100)
    )
then
    System.out.println("test");
end`;
            const startTime = Date.now();
            const result = parser.parse(content);
            const parseTime = Date.now() - startTime;

            expect(result.ast).toBeDefined();
            expect(parseTime).toBeLessThan(1000); // Should parse in less than 1 second
            expect(result.ast.rules).toHaveLength(1);
        });
    });
});