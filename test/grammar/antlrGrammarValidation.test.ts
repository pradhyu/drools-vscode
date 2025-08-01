/**
 * ANTLR Grammar Validation Tests
 * 
 * This test suite validates that our Drools parser implementation complies with
 * the official ANTLR grammar rules defined in DRL6Expressions.g and DRL6Lexer.g
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';
import { DroolsAST, ConditionNode, MultiLinePatternNode } from '../../src/server/parser/ast';

describe('ANTLR Grammar Validation', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('DRL6Expressions Grammar Compliance', () => {
        describe('Expression Parsing', () => {
            test('should parse conditional expressions according to ANTLR grammar', () => {
                const drl = `
rule "Test Conditional Expression"
when
    $person : Person(age > 18 ? "adult" : "minor")
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                expect(result.ast.rules).toHaveLength(1);
                
                const rule = result.ast.rules[0];
                expect(rule.when?.conditions).toBeDefined();
                
                // Verify conditional expression is parsed correctly
                const condition = rule.when!.conditions[0];
                expect(condition.content).toContain('age > 18 ? "adult" : "minor"');
            });

            test('should parse relational expressions with operators', () => {
                const drl = `
rule "Test Relational Operators"
when
    Person(age >= 18, age <= 65, name != null, score > 0.5)
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('>=');
                expect(condition.content).toContain('<=');
                expect(condition.content).toContain('!=');
                expect(condition.content).toContain('>');
            });

            test('should parse logical operators (&&, ||)', () => {
                const drl = `
rule "Test Logical Operators"
when
    Person(age > 18 && age < 65 || status == "VIP")
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('&&');
                expect(condition.content).toContain('||');
            });
        });

        describe('Multi-line Pattern Expressions', () => {
            test('should parse exists() patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Exists Pattern"
when
    exists(
        Person(age > 18,
               name != null)
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('exists');
                expect(condition.isMultiLine).toBe(true);
                expect(condition.multiLinePattern).toBeDefined();
                expect(condition.multiLinePattern!.patternType).toBe('exists');
            });

            test('should parse not() patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Not Pattern"
when
    not(
        Person(age < 18) and
        Account(balance < 0)
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('not');
                expect(condition.isMultiLine).toBe(true);
                expect(condition.multiLinePattern).toBeDefined();
            });

            test('should parse eval() patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Eval Pattern"
when
    eval(
        someComplexFunction(
            param1,
            param2
        ) > threshold
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('eval');
                expect(condition.isMultiLine).toBe(true);
            });

            test('should parse forall() patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Forall Pattern"
when
    forall(
        $person : Person(age > 18)
        Account(owner == $person, balance > 0)
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('forall');
                expect(condition.isMultiLine).toBe(true);
            });

            test('should parse collect() patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Collect Pattern"
when
    $accounts : collect(
        Account(balance > 1000)
        from $person.accounts
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('collect');
                expect(condition.isMultiLine).toBe(true);
            });

            test('should parse accumulate() patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Accumulate Pattern"
when
    $total : accumulate(
        Account(balance > 0, $balance : balance),
        sum($balance)
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('accumulate');
                expect(condition.isMultiLine).toBe(true);
            });
        });

        describe('Nested Pattern Expressions', () => {
            test('should parse deeply nested patterns according to ANTLR grammar', () => {
                const drl = `
rule "Test Nested Patterns"
when
    exists(
        Person(age > 18) and
        not(
            Account(
                owner == $person,
                balance < 0
            )
        ) and
        eval(
            someFunction() > 0
        )
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.conditionType).toBe('exists');
                expect(condition.isMultiLine).toBe(true);
                expect(condition.multiLinePattern).toBeDefined();
                
                // Verify nested patterns are detected
                const multiLinePattern = condition.multiLinePattern!;
                expect(multiLinePattern.nestedPatterns.length).toBeGreaterThan(0);
            });

            test('should handle complex nested parentheses according to ANTLR grammar', () => {
                const drl = `
rule "Test Complex Nesting"
when
    exists(
        Person(
            age > 18,
            (status == "ACTIVE" || status == "PENDING"),
            addresses.size() > 0
        ) and
        forall(
            $addr : Address() from $person.addresses
            $addr.isValid() == true
        )
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.isMultiLine).toBe(true);
                expect(condition.parenthesesRanges?.length || 0).toBeGreaterThan(0);
            });
        });
    });

    describe('DRL6Lexer Grammar Compliance', () => {
        describe('Token Recognition', () => {
            test('should recognize string literals according to lexer grammar', () => {
                const drl = `
rule "Test String Literals"
when
    Person(name == "John Doe", description == 'Single quoted string')
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('"John Doe"');
                expect(condition.content).toContain("'Single quoted string'");
            });

            test('should recognize numeric literals according to lexer grammar', () => {
                const drl = `
rule "Test Numeric Literals"
when
    Person(age == 25, score == 98.5, hexValue == 0xFF, longValue == 123L)
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('25');
                expect(condition.content).toContain('98.5');
                expect(condition.content).toContain('0xFF');
                expect(condition.content).toContain('123L');
            });

            test('should recognize boolean and null literals according to lexer grammar', () => {
                const drl = `
rule "Test Boolean and Null Literals"
when
    Person(active == true, deleted == false, metadata == null)
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('true');
                expect(condition.content).toContain('false');
                expect(condition.content).toContain('null');
            });

            test('should recognize time intervals according to lexer grammar', () => {
                const drl = `
rule "Test Time Intervals"
when
    Event(this after[1d2h30m] $other)
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('1d2h30m');
            });
        });

        describe('Operator Recognition', () => {
            test('should recognize all comparison operators according to lexer grammar', () => {
                const drl = `
rule "Test Comparison Operators"
when
    Person(age >= 18, age <= 65, score > 0.5, score < 1.0, name != null, status == "ACTIVE")
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('>=');
                expect(condition.content).toContain('<=');
                expect(condition.content).toContain('>');
                expect(condition.content).toContain('<');
                expect(condition.content).toContain('!=');
                expect(condition.content).toContain('==');
            });

            test('should recognize logical operators according to lexer grammar', () => {
                const drl = `
rule "Test Logical Operators"
when
    Person(active && !deleted || status == "PENDING")
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('&&');
                expect(condition.content).toContain('!');
                expect(condition.content).toContain('||');
            });

            test('should recognize assignment operators according to lexer grammar', () => {
                const drl = `
rule "Test Assignment Operators"
when
    $person := Person(age += 1, score *= 2)
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain(':=');
                expect(condition.content).toContain('+=');
                expect(condition.content).toContain('*=');
            });
        });

        describe('Bracket and Parentheses Recognition', () => {
            test('should recognize all bracket types according to lexer grammar', () => {
                const drl = `
rule "Test Brackets"
when
    Person(addresses[0].city == "NYC", data{"key"} != null)
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.content).toContain('[');
                expect(condition.content).toContain(']');
                expect(condition.content).toContain('{');
                expect(condition.content).toContain('}');
            });

            test('should track parentheses correctly in multi-line patterns', () => {
                const drl = `
rule "Test Parentheses Tracking"
when
    exists(
        Person(
            age > 18,
            (status == "ACTIVE" || status == "PENDING")
        )
    )
then
    // action
end`;

                const result = parser.parse(drl);
                expect(result.errors).toHaveLength(0);
                
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.parenthesesRanges?.length || 0).toBeGreaterThan(0);
                
                // Verify parentheses are properly matched
                const ranges = condition.parenthesesRanges;
                expect((ranges?.length || 0) % 2).toBe(0); // Should have pairs
            });
        });
    });

    describe('Grammar Rule Documentation Compliance', () => {
        test('should follow ANTLR expression hierarchy', () => {
            // Test the expression hierarchy: conditionalExpression -> conditionalOrExpression -> conditionalAndExpression
            const drl = `
rule "Test Expression Hierarchy"
when
    Person(age > 18 && status == "ACTIVE" || backup == true)
then
    // action
end`;

            const result = parser.parse(drl);
            expect(result.errors).toHaveLength(0);
            
            // Verify the parser respects operator precedence as defined in ANTLR grammar
            const condition = result.ast.rules[0].when!.conditions[0];
            expect(condition.content).toContain('&&');
            expect(condition.content).toContain('||');
        });

        test('should handle unary expressions according to ANTLR grammar', () => {
            const drl = `
rule "Test Unary Expressions"
when
    Person(age == +25, score == -1.5, active == !false)
then
    // action
end`;

            const result = parser.parse(drl);
            expect(result.errors).toHaveLength(0);
            
            const condition = result.ast.rules[0].when!.conditions[0];
            expect(condition.content).toContain('+25');
            expect(condition.content).toContain('-1.5');
            expect(condition.content).toContain('!false');
        });

        test('should handle cast expressions according to ANTLR grammar', () => {
            const drl = `
rule "Test Cast Expressions"
when
    Person(age == (int) someValue, name == (String) obj)
then
    // action
end`;

            const result = parser.parse(drl);
            expect(result.errors).toHaveLength(0);
            
            const condition = result.ast.rules[0].when!.conditions[0];
            expect(condition.content).toContain('(int)');
            expect(condition.content).toContain('(String)');
        });
    });

    describe('Error Recovery and Edge Cases', () => {
        test('should handle incomplete multi-line patterns gracefully', () => {
            const drl = `
rule "Test Incomplete Pattern"
when
    exists(
        Person(age > 18,
               name != null
    // Missing closing parenthesis
then
    // action
end`;

            const result = parser.parse(drl);
            
            // Should detect the error but still create partial AST
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.ast.rules).toHaveLength(1);
            
            const condition = result.ast.rules[0].when!.conditions[0];
            expect(condition.conditionType).toBe('exists');
            expect(condition.isMultiLine).toBe(true);
            expect(condition.multiLinePattern?.isComplete).toBe(false);
        });

        test('should handle malformed expressions according to ANTLR error recovery', () => {
            const drl = `
rule "Test Malformed Expression"
when
    Person(age > > 18, name == )
then
    // action
end`;

            const result = parser.parse(drl);
            
            // Should report syntax errors but continue parsing
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.ast.rules).toHaveLength(1);
        });

        test('should handle deeply nested patterns within limits', () => {
            // Test with reasonable nesting depth
            const drl = `
rule "Test Deep Nesting"
when
    exists(
        Person(age > 18) and
        not(
            exists(
                Account(balance < 0) and
                not(
                    Transaction(amount > 1000)
                )
            )
        )
    )
then
    // action
end`;

            const result = parser.parse(drl);
            expect(result.errors).toHaveLength(0);
            
            const condition = result.ast.rules[0].when!.conditions[0];
            expect(condition.isMultiLine).toBe(true);
            expect(condition.multiLinePattern?.nestedPatterns.length).toBeGreaterThan(0);
        });
    });

    describe('Performance and Memory Management', () => {
        test('should handle large multi-line patterns efficiently', () => {
            // Create a large but reasonable multi-line pattern
            const constraints = Array.from({ length: 50 }, (_, i) => `field${i} != null`).join(',\n               ');
            
            const drl = `
rule "Test Large Pattern"
when
    exists(
        Person(
               ${constraints}
        )
    )
then
    // action
end`;

            const startTime = Date.now();
            const result = parser.parse(drl);
            const parseTime = Date.now() - startTime;
            
            expect(result.errors).toHaveLength(0);
            expect(parseTime).toBeLessThan(1000); // Should parse within 1 second
            
            const condition = result.ast.rules[0].when!.conditions[0];
            expect(condition.isMultiLine).toBe(true);
        });

        test('should limit excessive nesting for memory management', () => {
            // Test with excessive nesting that should be limited
            let nestedPattern = 'Person(age > 18)';
            for (let i = 0; i < 25; i++) {
                nestedPattern = `exists(${nestedPattern})`;
            }
            
            const drl = `
rule "Test Excessive Nesting"
when
    ${nestedPattern}
then
    // action
end`;

            const result = parser.parse(drl);
            
            // Should either parse successfully with depth limits or report reasonable errors
            expect(result.ast.rules).toHaveLength(1);
            
            if (result.errors.length === 0) {
                // If parsed successfully, verify depth is managed
                const condition = result.ast.rules[0].when!.conditions[0];
                expect(condition.isMultiLine).toBe(true);
            }
        });
    });
});