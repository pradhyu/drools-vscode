/**
 * Comment Filtering Tests
 * Tests that all types of comments are properly ignored during parsing
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('Comment Filtering', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('Single-line Comments', () => {
        test('should ignore single-line comments at start of line', () => {
            const input = `// This is a comment
package com.example;`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('This is a comment');
        });

        test('should ignore inline single-line comments', () => {
            const input = 'package com.example; // inline comment';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('inline comment');
        });

        test('should preserve content before single-line comments', () => {
            const input = `rule "Test Rule"
    salience 100 // priority comment
when
    $p : Person(age > 18) // age check
then
    System.out.println("Adult"); // output comment
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Test Rule');
            expect(result.ast.rules[0].attributes[0].value).toBe('100');
            expect(result.ast.rules[0].then?.actions).toContain('System.out.println("Adult");');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('priority comment');
            expect(astString).not.toContain('age check');
            expect(astString).not.toContain('output comment');
        });
    });

    describe('Multi-line Comments', () => {
        test('should ignore multi-line comments', () => {
            const input = `/* This is a
multi-line comment */
package com.example;`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('This is a');
            expect(astString).not.toContain('multi-line comment');
        });

        test('should ignore inline multi-line comments', () => {
            const input = 'package com.example /* inline multi-line */;';
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('inline multi-line');
        });

        test('should handle nested multi-line comment patterns', () => {
            const input = `/* Outer comment
/* This looks like nested but isn't */
Still in outer comment */
package com.example;`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('Outer comment');
            expect(astString).not.toContain('nested');
            expect(astString).not.toContain('Still in outer');
        });
    });

    describe('Copyright Headers', () => {
        test('should ignore copyright headers', () => {
            const input = `/** Copyright 2010 Red Hat, Inc. and/or its affiliates.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.example.test;

rule "Test Rule"
when
    $p : Person()
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.errors.filter(e => !e.message.includes('Grammar violation'))).toHaveLength(0);
            expect(result.ast.packageDeclaration?.name).toBe('com.example.test');
            expect(result.ast.rules).toHaveLength(1);
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('Copyright 2010 Red Hat');
            expect(astString).not.toContain('Licensed under the Apache License');
            expect(astString).not.toContain('WITHOUT WARRANTIES OR CONDITIONS');
        });
    });

    describe('Comments in Different Contexts', () => {
        test('should ignore comments in rule attributes', () => {
            const input = `rule "Test Rule"
    salience 100 /* high priority */
    no-loop // prevent infinite loops
when
    $p : Person()
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const rule = result.ast.rules[0];
            expect(rule.attributes).toHaveLength(2);
            expect(rule.attributes[0].name).toBe('salience');
            expect(rule.attributes[0].value).toBe('100');
            expect(rule.attributes[1].name).toBe('no-loop');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('high priority');
            expect(astString).not.toContain('prevent infinite loops');
        });

        test('should ignore comments in when clauses', () => {
            const input = `rule "Test Rule"
when
    // Check person age
    $p : Person(age > 18) /* adult check */
    // Additional conditions
    and $a : Account(owner == $p) // account ownership
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const rule = result.ast.rules[0];
            expect(rule.when?.conditions).toBeDefined();
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('Check person age');
            expect(astString).not.toContain('adult check');
            expect(astString).not.toContain('Additional conditions');
            expect(astString).not.toContain('account ownership');
        });

        test('should ignore comments in then clauses', () => {
            const input = `rule "Test Rule"
when
    $p : Person()
then
    // Log the action
    System.out.println("Found person"); /* debug output */
    // Update the person
    $p.setProcessed(true); // mark as processed
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const rule = result.ast.rules[0];
            expect(rule.then?.actions).toContain('System.out.println("Found person");');
            expect(rule.then?.actions).toContain('$p.setProcessed(true);');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('Log the action');
            expect(astString).not.toContain('debug output');
            expect(astString).not.toContain('Update the person');
            expect(astString).not.toContain('mark as processed');
        });
    });

    describe('Comments with String Literals', () => {
        test('should not treat comment markers inside strings as comments', () => {
            const input = `rule "Test Rule"
when
    $p : Person(name == "John // Not a comment")
then
    System.out.println("Message /* also not a comment */");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const rule = result.ast.rules[0];
            expect(rule.when?.conditions[0].content).toContain('John // Not a comment');
            expect(rule.then?.actions).toContain('Message /* also not a comment */');
        });

        test('should handle escaped quotes in strings with comments', () => {
            const input = `rule "Test Rule"
when
    $p : Person(name == "John \\"The Great\\"") // real comment
then
    System.out.println("He said: \\"Hello\\""); /* another comment */
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const rule = result.ast.rules[0];
            expect(rule.when?.conditions[0].content).toContain('John \\"The Great\\"');
            expect(rule.then?.actions).toContain('He said: \\"Hello\\"');
            
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('real comment');
            expect(astString).not.toContain('another comment');
        });
    });

    describe('Comment-only Input', () => {
        test('should handle input with only comments', () => {
            const input = `// This is a comment
/* This is a block comment */
// Another comment`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules).toHaveLength(0);
            expect(result.ast.imports).toHaveLength(0);
            expect(result.ast.globals).toHaveLength(0);
        });

        test('should handle mixed empty lines and comments', () => {
            const input = `
// Comment 1

/* Multi-line
   comment */

// Comment 2

`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules).toHaveLength(0);
        });
    });

    describe('Complex Comment Scenarios', () => {
        test('should handle comprehensive comment filtering', () => {
            const input = `/** Copyright header comment */
package com.example // inline comment

// Single line comment
import java.util.List /* inline multi-line comment */

/* Multi-line comment
   spanning multiple lines */
global String globalVar // global comment

rule "Test Rule" // rule comment
    salience 100 /* salience comment */
    no-loop // no-loop comment
when
    $p : Person(age > 18) // condition comment
    /* multi-line comment in when clause */
then
    System.out.println("Hello"); // action comment
    /* multi-line comment in then clause */
end

// Final comment`;

            const result = parser.parse(input);

            // Verify structure is parsed correctly
            expect(result.ast.packageDeclaration?.name).toBe('com.example');
            expect(result.ast.imports).toHaveLength(1);
            expect(result.ast.imports[0].path).toBe('java.util.List');
            expect(result.ast.globals).toHaveLength(1);
            expect(result.ast.globals[0].name).toBe('globalVar');
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Test Rule');

            // Verify no comment content leaked into AST
            const astString = JSON.stringify(result.ast);
            const commentPatterns = [
                'Copyright header',
                'inline comment',
                'Single line comment',
                'inline multi-line comment',
                'Multi-line comment',
                'global comment',
                'rule comment',
                'salience comment',
                'no-loop comment',
                'condition comment',
                'multi-line comment in when clause',
                'action comment',
                'multi-line comment in then clause',
                'Final comment'
            ];

            commentPatterns.forEach(pattern => {
                expect(astString).not.toContain(pattern);
            });
        });
    });
});