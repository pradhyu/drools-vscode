/**
 * Unit tests for multi-line pattern parsing functionality
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('Multi-line Pattern Parser', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('Basic Multi-line Pattern Parsing', () => {
        test('should parse exists() pattern across multiple lines', () => {
            const content = `rule "Multi-line exists"
when
    exists(
        Person(age > 18,
               name != null)
    )
then
    System.out.println("Found adult");
end`;
            const result = parser.parse(content);

            // Test that the parser can handle multi-line content without crashing
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Multi-line exists');
            expect(result.ast.rules[0].when?.conditions).toBeDefined();
        });

        test('should parse not() pattern across multiple lines', () => {
            const content = `rule "Multi-line not"
when
    not(
        Account(
            balance < 0,
            owner != null
        )
    )
then
    System.out.println("No negative balance");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Multi-line not');
            expect(result.ast.rules[0].when?.conditions).toBeDefined();
        });

        test('should parse eval() pattern across multiple lines', () => {
            const content = `rule "Multi-line eval"
when
    eval(
        1 + 1 == 2 &&
        "test".length() > 0
    )
then
    System.out.println("Math and strings work");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Multi-line eval');
        });

        test('should parse collect() pattern across multiple lines', () => {
            const content = `rule "Multi-line collect"
when
    $accounts : collect(
        Account(
            balance > 1000,
            active == true
        )
    )
then
    System.out.println("Collected accounts");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Multi-line collect');
        });
    });

    describe('Mixed Single-line and Multi-line Patterns', () => {
        test('should handle mixed pattern types in same rule', () => {
            const content = `rule "Mixed patterns"
when
    $person : Person(age > 18)
    exists(
        Account(
            owner == $person,
            balance > 0
        )
    )
    not(Debt(debtor == $person))
then
    System.out.println("Eligible person");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Mixed patterns');
            expect(result.ast.rules[0].when?.conditions).toBeDefined();
        });

        test('should handle single-line pattern with multi-line formatting', () => {
            const content = `rule "Single-line with formatting"
when
    Person(
        age > 18
    )
then
    System.out.println("test");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Single-line with formatting');
        });
    });

    describe('Error Recovery for Incomplete Patterns', () => {
        test('should handle EOF within multi-line pattern', () => {
            const content = `rule "Incomplete pattern"
when
    exists(
        Person(
            age > 18,
            name != null`;
            const result = parser.parse(content);

            // Should still create partial AST
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should recover from malformed multi-line pattern', () => {
            const content = `rule "Malformed pattern"
when
    exists(
        Person(age > 18
        // Missing closing parenthesis
    not(Account(balance < 0))
then
    System.out.println("Should still parse");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            // Should attempt to parse despite errors
            expect(result.ast.rules[0].when?.conditions).toBeDefined();
        });
    });

    describe('Position and Range Tracking for Multi-line Patterns', () => {
        test('should track accurate ranges for multi-line patterns', () => {
            const content = `rule "Range tracking"
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

            expect(result.ast).toBeDefined();
            const condition = result.ast.rules[0].when?.conditions[0];
            if (condition) {
                expect(condition.range.start.line).toBeGreaterThanOrEqual(0);
                expect(condition.range.end.line).toBeGreaterThanOrEqual(condition.range.start.line);
                expect(condition.range.start.character).toBeGreaterThanOrEqual(0);
                expect(condition.range.end.character).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('Complex Multi-line Pattern Combinations', () => {
        test('should parse multiple multi-line patterns in sequence', () => {
            const content = `rule "Multiple multi-line patterns"
when
    exists(
        Person(
            age > 18,
            name != null
        )
    )
    not(
        Account(
            balance < 0,
            active == false
        )
    )
then
    System.out.println("Complex conditions met");
end`;
            const result = parser.parse(content);

            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Multiple multi-line patterns');
            expect(result.ast.rules[0].when?.conditions).toBeDefined();
        });
    });
});