/**
 * Core Parser Tests
 * Tests basic parsing functionality for top-level Drools constructs
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('Core Parser', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('Package Declaration', () => {
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

        test('should handle package with inline comments', () => {
            const input = 'package com.example.rules // package comment';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example.rules');
            
            // Ensure comment is not included in package name
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('package comment');
        });
    });

    describe('Import Statements', () => {
        test('should parse regular import', () => {
            const input = 'import java.util.List;';
            const result = parser.parse(input);

            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('java.util.List');
        });

        test('should parse static import', () => {
            const input = 'import static java.lang.Math.max;';
            const result = parser.parse(input);

            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('static java.lang.Math.max');
        });

        test('should parse wildcard import', () => {
            const input = 'import com.example.*;';
            const result = parser.parse(input);

            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('com.example.*');
        });

        test('should handle import with inline comments', () => {
            const input = 'import java.util.List /* inline comment */;';
            const result = parser.parse(input);

            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('java.util.List');
            
            // Ensure comment is not included in import path
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('inline comment');
        });

        test('should parse multiple imports', () => {
            const input = `import java.util.List;
import java.util.Map;
import com.example.Model;`;
            const result = parser.parse(input);

            expect(result.ast.imports).toHaveLength(3);
            expect(result.ast.imports[0].path).toBe('java.util.List');
            expect(result.ast.imports[1].path).toBe('java.util.Map');
            expect(result.ast.imports[2].path).toBe('com.example.Model');
        });
    });

    describe('Global Declarations', () => {
        test('should parse simple global declaration', () => {
            const input = 'global java.util.List myList;';
            const result = parser.parse(input);

            expect(result.ast.globals).toHaveLength(1);
            expect(result.ast.globals[0].dataType).toBe('java.util.List');
            expect(result.ast.globals[0].name).toBe('myList');
        });

        test('should parse generic type global', () => {
            const input = 'global List<String> stringList;';
            const result = parser.parse(input);

            expect(result.ast.globals).toHaveLength(1);
            expect(result.ast.globals[0].dataType).toBe('List<String>');
            expect(result.ast.globals[0].name).toBe('stringList');
        });

        test('should handle global with inline comments', () => {
            const input = 'global List<String> stringList // global comment;';
            const result = parser.parse(input);

            expect(result.ast.globals).toHaveLength(1);
            expect(result.ast.globals[0].name).toBe('stringList');
            
            // Ensure comment is not included
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('global comment');
        });

        test('should parse multiple globals', () => {
            const input = `global List<String> messages;
global Logger logger;
global Configuration config;`;
            const result = parser.parse(input);

            expect(result.ast.globals).toHaveLength(3);
            expect(result.ast.globals[0].name).toBe('messages');
            expect(result.ast.globals[1].name).toBe('logger');
            expect(result.ast.globals[2].name).toBe('config');
        });
    });

    describe('Complete File Parsing', () => {
        test('should parse complete Drools file with all elements', () => {
            const input = `package com.example.rules;

import java.util.List;
import static java.lang.Math.max;

global List<String> messages;
global Logger logger;

function int calculateAge(java.util.Date birthDate) {
    return 25;
}

rule "Test Rule"
when
    $person : Person(age > 18)
then
    messages.add("Found adult");
end

query "findAdults"
    $person : Person(age > 18)
end

declare Customer
    name : String
    age : int
end`;

            const result = parser.parse(input);

            expect(result.ast.packageDeclaration?.name).toBe('com.example.rules');
            expect(result.ast.imports).toHaveLength(2);
            expect(result.ast.globals).toHaveLength(2);
            expect(result.ast.functions).toHaveLength(1);
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.queries).toHaveLength(1);
            expect(result.ast.declares).toHaveLength(1);
        });
    });

    describe('Error Handling', () => {
        test('should handle empty input', () => {
            const input = '';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(0);
        });

        test('should handle malformed input gracefully', () => {
            const input = 'this is not valid drools syntax';
            const result = parser.parse(input);

            expect(result.ast).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
        });

        test('should continue parsing after errors', () => {
            const input = `package com.example;
invalid syntax here
rule "Valid Rule"
when
    $p : Person()
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Valid Rule');
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