/**
 * Unit tests for DroolsParser
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('DroolsParser', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('Package Declaration Parsing', () => {
        test('should parse simple package declaration', () => {
            const input = 'package com.example.rules;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration).toBeDefined();
            expect(result.ast.packageDeclaration?.name).toBe('com.example.rules');
        });

        test('should parse package declaration without semicolon', () => {
            const input = 'package com.example.rules';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example.rules');
        });

        test('should handle invalid package declaration', () => {
            const input = 'package 123invalid;';
            const result = parser.parse(input);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].message).toContain('Invalid package declaration');
        });
    });

    describe('Import Statement Parsing', () => {
        test('should parse regular import', () => {
            const input = 'import java.util.List;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('java.util.List');
            expect(result.ast.imports[0].isStatic).toBe(false);
        });

        test('should parse static import', () => {
            const input = 'import static java.lang.Math.max;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('java.lang.Math.max');
            expect(result.ast.imports[0].isStatic).toBe(true);
        });

        test('should parse wildcard import', () => {
            const input = 'import com.example.*;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.imports[0].path).toBe('com.example.*');
        });
    });

    describe('Global Declaration Parsing', () => {
        test('should parse global declaration', () => {
            const input = 'global java.util.List myList;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.globals).toHaveLength(1);
            expect(result.ast.globals[0].dataType).toBe('java.util.List');
            expect(result.ast.globals[0].name).toBe('myList');
        });

        test('should parse generic type global', () => {
            const input = 'global List<String> stringList;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.globals[0].dataType).toBe('List<String>');
        });
    });

    describe('Function Declaration Parsing', () => {
        test('should parse simple function', () => {
            const input = `function String getName() {
    return "test";
}`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.functions).toHaveLength(1);
            expect(result.ast.functions[0].name).toBe('getName');
            expect(result.ast.functions[0].returnType).toBe('String');
            expect(result.ast.functions[0].parameters).toHaveLength(0);
            expect(result.ast.functions[0].body).toContain('return "test";');
        });

        test('should parse function with parameters', () => {
            const input = `function int add(int a, int b) {
    return a + b;
}`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.functions[0].parameters).toHaveLength(2);
            expect(result.ast.functions[0].parameters[0].name).toBe('a');
            expect(result.ast.functions[0].parameters[0].dataType).toBe('int');
            expect(result.ast.functions[0].parameters[1].name).toBe('b');
            expect(result.ast.functions[0].parameters[1].dataType).toBe('int');
        });

        test('should parse function with opening brace on same line', () => {
            const input = `function void doSomething() {
    System.out.println("Hello");
}`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.functions[0].body).toContain('System.out.println("Hello");');
        });
    });

    describe('Rule Declaration Parsing', () => {
        test('should parse simple rule with quoted name', () => {
            const input = `rule "Simple Rule"
when
    $person : Person(age > 18)
then
    System.out.println("Adult: " + $person.getName());
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Simple Rule');
            expect(result.ast.rules[0].when).toBeDefined();
            expect(result.ast.rules[0].then).toBeDefined();
        });

        test('should parse rule with unquoted name', () => {
            const input = `rule SimpleRule
when
    $person : Person(age > 18)
then
    System.out.println("Adult");
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules[0].name).toBe('SimpleRule');
        });

        test('should parse rule with attributes', () => {
            const input = `rule "Priority Rule"
salience 100
no-loop true
when
    $person : Person(age > 18)
then
    System.out.println("High priority rule");
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules[0].attributes).toHaveLength(2);
            expect(result.ast.rules[0].attributes[0].name).toBe('salience');
            expect(result.ast.rules[0].attributes[0].value).toBe(100);
            expect(result.ast.rules[0].attributes[1].name).toBe('no-loop');
            expect(result.ast.rules[0].attributes[1].value).toBe(true);
        });

        test('should parse rule with complex when conditions', () => {
            const input = `rule "Complex Rule"
when
    $person : Person(age > 18, name != null)
    exists(Account(owner == $person))
    not(Debt(debtor == $person))
then
    System.out.println("Eligible person");
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(3);
            expect(result.ast.rules[0].when?.conditions[0].conditionType).toBe('pattern');
            expect(result.ast.rules[0].when?.conditions[1].conditionType).toBe('exists');
            expect(result.ast.rules[0].when?.conditions[2].conditionType).toBe('not');
        });

        test('should parse rule with eval condition', () => {
            const input = `rule "Eval Rule"
when
    eval(1 + 1 == 2)
then
    System.out.println("Math works");
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules[0].when?.conditions[0].conditionType).toBe('eval');
            expect(result.ast.rules[0].when?.conditions[0].content).toBe('1 + 1 == 2');
        });
    });

    describe('Query Declaration Parsing', () => {
        test('should parse simple query', () => {
            const input = `query "findAdults"
    $person : Person(age > 18)
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.queries).toHaveLength(1);
            expect(result.ast.queries[0].name).toBe('findAdults');
            expect(result.ast.queries[0].conditions).toHaveLength(1);
        });

        test('should parse query with parameters', () => {
            const input = `query "findPersonByAge"(int minAge)
    $person : Person(age > minAge)
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.queries[0].parameters).toHaveLength(1);
            expect(result.ast.queries[0].parameters[0].name).toBe('minAge');
            expect(result.ast.queries[0].parameters[0].dataType).toBe('int');
        });
    });

    describe('Declare Statement Parsing', () => {
        test('should parse declare statement', () => {
            const input = `declare Person
    name : String
    age : int
    active : boolean
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.declares).toHaveLength(1);
            expect(result.ast.declares[0].name).toBe('Person');
            expect(result.ast.declares[0].fields).toHaveLength(3);
            expect(result.ast.declares[0].fields[0].name).toBe('name');
            expect(result.ast.declares[0].fields[0].dataType).toBe('String');
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle syntax errors gracefully', () => {
            const input = `rule "Bad Rule"
when
    $person : Person(age > 18
    // Missing closing parenthesis
then
    System.out.println("This should still parse");
end`;
            const result = parser.parse(input);

            // Should still create an AST even with errors
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            // May have errors but should not crash
        });

        test('should handle completely malformed input', () => {
            const input = `this is not valid drools syntax at all
random text here
more invalid stuff`;
            const result = parser.parse(input);

            expect(result.ast).toBeDefined();
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should handle empty input', () => {
            const input = '';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(0);
        });

        test('should handle input with only comments', () => {
            const input = `// This is a comment
/* This is a block comment */
// Another comment`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules).toHaveLength(0);
        });
    });

    describe('Complex File Parsing', () => {
        test('should parse complete Drools file', () => {
            const input = `package com.example.rules;

import java.util.List;
import static java.lang.Math.max;

global List<String> messages;

function int calculateAge(java.util.Date birthDate) {
    // Implementation here
    return 25;
}

rule "Adult Check"
salience 100
when
    $person : Person(age > 18, name != null)
    exists(Account(owner == $person))
then
    messages.add("Found adult: " + $person.getName());
end

query "findAdults"
    $person : Person(age > 18)
end

declare Customer
    name : String
    age : int
    premium : boolean
end`;

            const result = parser.parse(input);

            expect(result.ast.packageDeclaration?.name).toBe('com.example.rules');
            expect(result.ast.imports).toHaveLength(2);
            expect(result.ast.globals).toHaveLength(1);
            expect(result.ast.functions).toHaveLength(1);
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.queries).toHaveLength(1);
            expect(result.ast.declares).toHaveLength(1);
        });
    });

    describe('Position and Range Tracking', () => {
        test('should track positions correctly', () => {
            const input = `package com.example;

rule "Test"
when
    $p : Person()
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.ast.packageDeclaration?.range).toBeDefined();
            expect(result.ast.rules[0].range).toBeDefined();
            expect(result.ast.rules[0].range.start.line).toBeGreaterThanOrEqual(0);
            expect(result.ast.rules[0].range.end.line).toBeGreaterThan(result.ast.rules[0].range.start.line);
        });
    });
});