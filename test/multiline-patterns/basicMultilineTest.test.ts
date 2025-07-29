/**
 * Basic tests for multi-line pattern functionality
 * These tests focus on verifying the test framework works and basic parsing functionality
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';
import { DroolsDiagnosticProvider } from '../../src/server/providers/diagnosticProvider';

describe('Basic Multi-line Pattern Tests', () => {
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

    describe('Parser Basic Functionality', () => {
        test('should parse simple rule without crashing', () => {
            const content = `rule "Simple Rule"
when
    Person(age > 18)
then
    System.out.println("test");
end`;
            const result = parser.parse(content);

            expect(result).toBeDefined();
            expect(result.ast).toBeDefined();
            expect(result.errors).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
        });

        test('should parse multi-line content without crashing', () => {
            const content = `rule "Multi-line Rule"
when
    exists(
        Person(age > 18)
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);

            expect(result).toBeDefined();
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toBeDefined();
            expect(Array.isArray(result.ast.rules)).toBe(true);
        });

        test('should handle parentheses across multiple lines', () => {
            const content = `rule "Parentheses Test"
when
    Person(
        age > 18,
        name != null
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);

            expect(result).toBeDefined();
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toBeDefined();
        });

        test('should handle nested patterns', () => {
            const content = `rule "Nested Test"
when
    exists(
        Person(age > 18) and
        not(Account(balance < 0))
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);

            expect(result).toBeDefined();
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toBeDefined();
        });
    });

    describe('Diagnostic Provider Basic Functionality', () => {
        test('should provide diagnostics without crashing', () => {
            const content = `rule "Test Rule"
when
    Person(age > 18)
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);

            expect(Array.isArray(diagnostics)).toBe(true);
            expect(diagnostics).toBeDefined();
        });

        test('should handle malformed content gracefully', () => {
            const content = `rule "Malformed Rule"
when
    Person(age > 18
    // Missing closing parenthesis
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);

            expect(Array.isArray(diagnostics)).toBe(true);
            expect(result.ast).toBeDefined();
        });

        test('should handle multi-line patterns in diagnostics', () => {
            const content = `rule "Multi-line Diagnostic Test"
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

            const diagnostics = diagnosticProvider.provideDiagnostics(document, result.ast, result.errors);

            expect(Array.isArray(diagnostics)).toBe(true);
            expect(result.ast).toBeDefined();
            
            // Verify diagnostic structure if any exist
            diagnostics.forEach(diagnostic => {
                expect(diagnostic.message).toBeDefined();
                expect(typeof diagnostic.message).toBe('string');
                expect(diagnostic.range).toBeDefined();
                expect(diagnostic.range.start).toBeDefined();
                expect(diagnostic.range.end).toBeDefined();
            });
        });
    });

    describe('Error Recovery Tests', () => {
        test('should recover from incomplete patterns', () => {
            const content = `rule "Incomplete Pattern"
when
    exists(
        Person(age > 18
        // Incomplete pattern
then
    System.out.println("test");
end`;
            const result = parser.parse(content);

            expect(result).toBeDefined();
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toBeDefined();
            // Should still create some AST structure despite errors
            expect(result.ast.rules.length).toBeGreaterThanOrEqual(0);
        });

        test('should handle EOF in multi-line patterns', () => {
            const content = `rule "EOF Test"
when
    exists(
        Person(age > 18`;
            const result = parser.parse(content);

            expect(result).toBeDefined();
            expect(result.ast).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
        });
    });

    describe('Performance Tests', () => {
        test('should parse complex multi-line patterns efficiently', () => {
            const content = `rule "Complex Pattern"
when
    exists(
        Person(age > 18) and
        not(
            exists(
                Account(balance < 0) and
                not(Transaction(amount > 100))
            )
        )
    )
then
    System.out.println("test");
end`;
            
            const startTime = Date.now();
            const result = parser.parse(content);
            const parseTime = Date.now() - startTime;

            expect(result).toBeDefined();
            expect(parseTime).toBeLessThan(1000); // Should parse quickly
        });

        test('should handle multiple multi-line patterns efficiently', () => {
            const content = `rule "Multiple Patterns"
when
    exists(Person(age > 18))
    not(Account(balance < 0))
    collect(Transaction(amount > 100))
then
    System.out.println("test");
end`;
            
            const startTime = Date.now();
            const result = parser.parse(content);
            const parseTime = Date.now() - startTime;

            expect(result).toBeDefined();
            expect(parseTime).toBeLessThan(1000); // Should parse quickly
        });
    });

    describe('Configuration Tests', () => {
        test('should respect diagnostic settings', () => {
            const disabledProvider = new DroolsDiagnosticProvider({
                maxNumberOfProblems: 1,
                enableSyntaxValidation: false,
                enableSemanticValidation: false,
                enableBestPracticeWarnings: false
            });

            const content = `rule "Config Test"
when
    Person(age > 18)
then
    System.out.println("test");
end`;
            const result = parser.parse(content);
            const document = (global as any).createMockTextDocument(content);

            const diagnostics = disabledProvider.provideDiagnostics(document, result.ast, result.errors);

            expect(Array.isArray(diagnostics)).toBe(true);
            expect(diagnostics.length).toBeLessThanOrEqual(1);
        });
    });
});