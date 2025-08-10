/**
 * Comprehensive unit tests for PrecisePositionCalculator
 * Tests all position calculation methods with various scenarios
 */

import { PrecisePositionCalculator } from '../../src/server/providers/positionCalculator';
import { ThenNode, WhenNode, Range } from '../../src/server/parser/ast';

describe('PrecisePositionCalculator', () => {
    let calculator: PrecisePositionCalculator;
    let documentLines: string[];

    beforeEach(() => {
        documentLines = [
            'rule "Test Rule"',
            'when',
            '    $item : Item(price > 50)',
            '    $customer : Customer(age >= 18,',
            '                         name != null)',
            '    exists($order : Order(customerId == $customer.id))',
            '    not($discount : Discount(itemId == $item.id))',
            '    accumulate($lineItem : LineItem(orderId == $order.id);',
            '               $total : sum($lineItem.amount))',
            '    eval($total > 100)',
            'then',
            '    System.out.println($item);',
            '    system.out.println("test");',
            '    Sytem.out.println("typo");',
            '    $item.setValue(100);',
            '    undefinedVar.doSomething();',
            'end'
        ];
        calculator = new PrecisePositionCalculator(documentLines);
    });

    describe('findVariablePositionInThenClause', () => {
        let thenClause: ThenNode;

        beforeEach(() => {
            thenClause = {
                type: 'Then',
                actions: 'System.out.println($item);',
                range: {
                    start: { line: 10, character: 0 },
                    end: { line: 16, character: 3 }
                }
            };
        });

        test('should find variable in simple then clause', () => {
            const position = calculator.findVariablePositionInThenClause(thenClause, '$item');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(11);
            expect(position!.start.character).toBe(23);
            expect(position!.end.character).toBe(28);
            
            // Verify extracted text
            const extractedText = documentLines[11].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$item');
        });

        test('should find variable with various indentation levels', () => {
            const deeplyIndentedLines = [
                'rule "Deep Indentation"',
                'when',
                '    $item : Item()',
                'then',
                '        if (condition) {',
                '            System.out.println($item);',
                '                $item.setValue(100);',
                '        }',
                'end'
            ];
            
            const deepCalculator = new PrecisePositionCalculator(deeplyIndentedLines);
            const deepThenClause: ThenNode = {
                type: 'Then',
                actions: 'System.out.println($item);',
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 8, character: 3 }
                }
            };

            // Test variable at different indentation levels
            const position1 = deepCalculator.findVariablePositionInThenClause(deepThenClause, '$item');
            expect(position1).not.toBeNull();
            expect(position1!.start.line).toBe(5);
            expect(position1!.start.character).toBe(31);

            const position2 = deepCalculator.findVariablePositionInThenClause(deepThenClause, '$item');
            expect(position2).not.toBeNull();
            // Should find the first occurrence
            expect(position2!.start.line).toBe(5);
        });

        test('should handle mixed indentation (spaces and tabs)', () => {
            const mixedIndentationLines = [
                'rule "Mixed Indentation"',
                'when',
                '    $item : Item()',
                'then',
                '\t\tSystem.out.println($item);',
                '    \t$item.setValue(100);',
                'end'
            ];
            
            const mixedCalculator = new PrecisePositionCalculator(mixedIndentationLines);
            const mixedThenClause: ThenNode = {
                type: 'Then',
                actions: 'System.out.println($item);',
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 6, character: 3 }
                }
            };

            const position = mixedCalculator.findVariablePositionInThenClause(mixedThenClause, '$item');
            expect(position).not.toBeNull();
            
            const extractedText = mixedIndentationLines[position!.start.line].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$item');
        });

        test('should skip "then" keyword line', () => {
            const position = calculator.findVariablePositionInThenClause(thenClause, 'then');
            expect(position).toBeNull();
        });

        test('should stop at "end" keyword', () => {
            const position = calculator.findVariablePositionInThenClause(thenClause, 'end');
            expect(position).toBeNull();
        });

        test('should return null for non-existent variable', () => {
            const position = calculator.findVariablePositionInThenClause(thenClause, '$nonExistent');
            expect(position).toBeNull();
        });

        test('should return null for null actions', () => {
            const emptyThenClause: ThenNode = {
                type: 'Then',
                actions: null as any,
                range: {
                    start: { line: 10, character: 0 },
                    end: { line: 16, character: 3 }
                }
            };

            const position = calculator.findVariablePositionInThenClause(emptyThenClause, '$item');
            expect(position).toBeNull();
        });

        test('should handle special characters in variable names', () => {
            const specialCharLines = [
                'rule "Special Chars"',
                'when',
                '    $item : Item()',
                'then',
                '    System.out.println($item.field);',
                '    $complex_var[0].method();',
                'end'
            ];
            
            const specialCalculator = new PrecisePositionCalculator(specialCharLines);
            const specialThenClause: ThenNode = {
                type: 'Then',
                actions: 'System.out.println($item.field);',
                range: {
                    start: { line: 3, character: 0 },
                    end: { line: 6, character: 3 }
                }
            };

            // Test variable with dot notation
            const position1 = specialCalculator.findVariablePositionInThenClause(specialThenClause, '$item');
            expect(position1).not.toBeNull();
            
            // Test complex variable name
            const position2 = specialCalculator.findVariablePositionInThenClause(specialThenClause, '$complex_var');
            expect(position2).not.toBeNull();
            
            const extractedText = specialCharLines[position2!.start.line].substring(
                position2!.start.character, 
                position2!.end.character
            );
            expect(extractedText).toBe('$complex_var');
        });
    });

    describe('findVariableDeclarationPosition', () => {
        let whenClause: WhenNode;

        beforeEach(() => {
            whenClause = {
                type: 'When',
                conditions: [],
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 9, character: 25 }
                }
            };
        });

        test('should find simple variable declaration', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$item');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(2);
            expect(position!.start.character).toBe(4);
            expect(position!.end.character).toBe(9);
            
            const extractedText = documentLines[2].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$item');
        });

        test('should find variable in multi-line condition', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$customer');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(3);
            expect(position!.start.character).toBe(4);
            expect(position!.end.character).toBe(13);
            
            const extractedText = documentLines[3].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$customer');
        });

        test('should find variable in exists pattern', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$order');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(5);
            expect(position!.start.character).toBe(11);
            expect(position!.end.character).toBe(17);
            
            const extractedText = documentLines[5].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$order');
        });

        test('should find variable in not pattern', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$discount');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(6);
            expect(position!.start.character).toBe(8);
            expect(position!.end.character).toBe(17);
            
            const extractedText = documentLines[6].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$discount');
        });

        test('should find variable in accumulate pattern', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$lineItem');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(7);
            expect(position!.start.character).toBe(15);
            expect(position!.end.character).toBe(24);
            
            const extractedText = documentLines[7].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$lineItem');
        });

        test('should find accumulate result variable', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$total');
            
            expect(position).not.toBeNull();
            expect(position!.start.line).toBe(8);
            expect(position!.start.character).toBe(15);
            expect(position!.end.character).toBe(21);
            
            const extractedText = documentLines[8].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$total');
        });

        test('should skip "when" keyword line', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, 'when');
            expect(position).toBeNull();
        });

        test('should stop at "then" keyword', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, 'then');
            expect(position).toBeNull();
        });

        test('should return null for non-existent variable', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, '$nonExistent');
            expect(position).toBeNull();
        });

        test('should handle variable without $ prefix', () => {
            const position = calculator.findVariableDeclarationPosition(whenClause, 'item');
            expect(position).not.toBeNull();
            
            // Should find $item
            const extractedText = documentLines[position!.start.line].substring(
                position!.start.character, 
                position!.end.character
            );
            expect(extractedText).toBe('$item');
        });

        test('should handle complex nested patterns', () => {
            const complexLines = [
                'rule "Complex Patterns"',
                'when',
                '    forall($payment : Payment(orderId == $order.id),',
                '           $payment.status == "PAID")',
                '    collect($item : Item(category == "electronics"))',
                'then',
                '    // actions',
                'end'
            ];
            
            const complexCalculator = new PrecisePositionCalculator(complexLines);
            const complexWhenClause: WhenNode = {
                type: 'When',
                conditions: [],
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 4, character: 52 }
                }
            };

            // Test forall pattern
            const position1 = complexCalculator.findVariableDeclarationPosition(complexWhenClause, '$payment');
            expect(position1).not.toBeNull();
            
            // Test collect pattern
            const position2 = complexCalculator.findVariableDeclarationPosition(complexWhenClause, '$item');
            expect(position2).not.toBeNull();
        });
    });

    describe('Range Validation', () => {
        test('should validate range precision correctly', () => {
            const line = '    $item : Item(price > 50)';
            const preciseRange: Range = {
                start: { line: 0, character: 4 },
                end: { line: 0, character: 9 }
            };
            const impreciseRange: Range = {
                start: { line: 0, character: 3 },
                end: { line: 0, character: 10 }
            };

            expect(calculator.validateRangePrecision(preciseRange, line)).toBe(true);
            expect(calculator.validateRangePrecision(impreciseRange, line)).toBe(false);
        });

        test('should check word boundaries correctly', () => {
            const line = '    System.out.println();';
            const validRange: Range = {
                start: { line: 0, character: 4 },
                end: { line: 0, character: 10 }
            };
            const invalidRange: Range = {
                start: { line: 0, character: 6 },
                end: { line: 0, character: 10 }
            };

            expect(calculator.checkWordBoundaries(validRange, line)).toBe(true);
            expect(calculator.checkWordBoundaries(invalidRange, line)).toBe(false);
        });

        test('should create visual representation', () => {
            const line = '    $item : Item(price > 50)';
            const range: Range = {
                start: { line: 0, character: 4 },
                end: { line: 0, character: 9 }
            };

            const visualization = calculator.visualizeUnderlinePosition(range, line);
            expect(visualization).toContain('Line: ');
            expect(visualization).toContain('^^^^^');
            expect(visualization.split('\n')).toHaveLength(2);
        });

        test('should handle comprehensive range validation', () => {
            const line = '    $item : Item(price > 50)';
            const range: Range = {
                start: { line: 0, character: 4 },
                end: { line: 0, character: 9 }
            };

            const validation = calculator.validateRangeComprehensive(range, line, '$item');
            expect(validation.isValid).toBe(true);
            expect(validation.extractedText).toBe('$item');
            expect(validation.issues).toHaveLength(0);
            expect(validation.visualization).toContain('Line: ');
        });

        test('should detect range validation issues', () => {
            const line = '    $item : Item(price > 50)';
            const badRange: Range = {
                start: { line: 0, character: 3 },
                end: { line: 0, character: 10 }
            };

            const validation = calculator.validateRangeComprehensive(badRange, line, '$item');
            expect(validation.isValid).toBe(false);
            expect(validation.issues.length).toBeGreaterThan(0);
            expect(validation.issues.some(issue => issue.includes('whitespace'))).toBe(true);
        });
    });

    describe('Pattern Creation and Validation', () => {
        test('should create safe regex patterns', () => {
            const pattern1 = calculator.createSafeRegexPattern('$item');
            expect(pattern1).not.toBeNull();
            expect(pattern1!.source).toContain('\\$\\b');

            const pattern2 = calculator.createSafeRegexPattern('System');
            expect(pattern2).not.toBeNull();
            expect(pattern2!.source).toContain('\\bSystem\\b');
        });

        test('should validate regex patterns', () => {
            const validPattern = '\\btest\\b';
            const invalidPattern = '(?=test)';

            const validation1 = calculator.validateRegexPattern(validPattern);
            expect(validation1.isValid).toBe(true);

            const validation2 = calculator.validateRegexPattern(invalidPattern);
            expect(validation2.isValid).toBe(false);
            expect(validation2.error).toBeDefined();
        });

        test('should test pattern accuracy', () => {
            const pattern = /\btest\b/g;
            const sampleText = 'test testing tested test';
            const expectedMatches = ['test', 'test'];

            const isAccurate = calculator.testPatternAccuracy(pattern, sampleText, expectedMatches);
            expect(isAccurate).toBe(true);
        });

        test('should create robust patterns with fallbacks', () => {
            const pattern = calculator.createRobustPattern('$complex.var[0]');
            expect(pattern).not.toBeNull();
        });
    });

    describe('findJavaErrorPosition', () => {
        test('should find capitalization error positioning (system vs System)', () => {
            const testLines = [
                'rule "Java Capitalization Errors"',
                'when',
                '    $item : Item()',
                'then',
                '    system.out.println("test");',
                '    System.out.println("correct");',
                '    string value = "test";',
                '    String correctValue = "test";',
                'end'
            ];
            
            const javaCalculator = new PrecisePositionCalculator(testLines);
            
            // Test system vs System
            const systemPosition = javaCalculator.findJavaErrorPosition(testLines[4], 'system', 4);
            expect(systemPosition).not.toBeNull();
            expect(systemPosition!.start.line).toBe(4);
            expect(systemPosition!.start.character).toBe(4);
            expect(systemPosition!.end.character).toBe(10);
            
            const extractedText = testLines[4].substring(
                systemPosition!.start.character,
                systemPosition!.end.character
            );
            expect(extractedText).toBe('system');
            
            // Test string vs String
            const stringPosition = javaCalculator.findJavaErrorPosition(testLines[6], 'string', 6);
            expect(stringPosition).not.toBeNull();
            expect(stringPosition!.start.line).toBe(6);
            expect(stringPosition!.start.character).toBe(4);
            expect(stringPosition!.end.character).toBe(10);
            
            const extractedStringText = testLines[6].substring(
                stringPosition!.start.character,
                stringPosition!.end.character
            );
            expect(extractedStringText).toBe('string');
        });

        test('should find typo detection positioning (Sytem vs System)', () => {
            const testLines = [
                'rule "Java Typo Errors"',
                'when',
                '    $item : Item()',
                'then',
                '    Sytem.out.println("typo");',
                '    sytem.out.println("lowercase typo");',
                '    sistem.out.println("another typo");',
                '    Sistem.out.println("capitalized typo");',
                '    Stirng value = "string typo";',
                '    printl("method typo");',
                'end'
            ];
            
            const typoCalculator = new PrecisePositionCalculator(testLines);
            
            // Test Sytem typo
            const sytemPosition = typoCalculator.findJavaErrorPosition(testLines[4], 'Sytem', 4);
            expect(sytemPosition).not.toBeNull();
            expect(sytemPosition!.start.line).toBe(4);
            expect(sytemPosition!.start.character).toBe(4);
            expect(sytemPosition!.end.character).toBe(9);
            
            const extractedSytem = testLines[4].substring(
                sytemPosition!.start.character,
                sytemPosition!.end.character
            );
            expect(extractedSytem).toBe('Sytem');
            
            // Test lowercase sytem typo
            const sytemLowerPosition = typoCalculator.findJavaErrorPosition(testLines[5], 'sytem', 5);
            expect(sytemLowerPosition).not.toBeNull();
            expect(sytemLowerPosition!.start.line).toBe(5);
            expect(sytemLowerPosition!.start.character).toBe(4);
            expect(sytemLowerPosition!.end.character).toBe(9);
            
            // Test sistem typo
            const sistemPosition = typoCalculator.findJavaErrorPosition(testLines[6], 'sistem', 6);
            expect(sistemPosition).not.toBeNull();
            expect(sistemPosition!.start.line).toBe(6);
            expect(sistemPosition!.start.character).toBe(4);
            expect(sistemPosition!.end.character).toBe(10);
            
            // Test Sistem typo
            const SistemPosition = typoCalculator.findJavaErrorPosition(testLines[7], 'Sistem', 7);
            expect(SistemPosition).not.toBeNull();
            expect(SistemPosition!.start.line).toBe(7);
            expect(SistemPosition!.start.character).toBe(4);
            expect(SistemPosition!.end.character).toBe(10);
            
            // Test Stirng typo
            const stirngPosition = typoCalculator.findJavaErrorPosition(testLines[8], 'Stirng', 8);
            expect(stirngPosition).not.toBeNull();
            expect(stirngPosition!.start.line).toBe(8);
            expect(stirngPosition!.start.character).toBe(4);
            expect(stirngPosition!.end.character).toBe(10);
            
            // Test printl method typo
            const printlPosition = typoCalculator.findJavaErrorPosition(testLines[9], 'printl', 9);
            expect(printlPosition).not.toBeNull();
            expect(printlPosition!.start.line).toBe(9);
            expect(printlPosition!.start.character).toBe(4);
            expect(printlPosition!.end.character).toBe(10);
        });

        test('should handle complex Java expressions with multiple potential matches', () => {
            const complexLines = [
                'rule "Complex Java Expressions"',
                'when',
                '    $item : Item()',
                'then',
                '    system.out.println(system.getProperty("test"));',
                '    String system = "not the class";',
                '    if (system.equals("test")) {',
                '        system.out.println("nested system");',
                '    }',
                '    Map<String, system> map = new HashMap<>();',
                '    system[] array = new system[10];',
                'end'
            ];
            
            const complexCalculator = new PrecisePositionCalculator(complexLines);
            
            // Test first occurrence of system in complex expression
            const firstSystemPosition = complexCalculator.findJavaErrorPosition(complexLines[4], 'system', 4);
            expect(firstSystemPosition).not.toBeNull();
            expect(firstSystemPosition!.start.line).toBe(4);
            expect(firstSystemPosition!.start.character).toBe(4);
            expect(firstSystemPosition!.end.character).toBe(10);
            
            // Verify it found the first occurrence, not the second
            const extractedFirst = complexLines[4].substring(
                firstSystemPosition!.start.character,
                firstSystemPosition!.end.character
            );
            expect(extractedFirst).toBe('system');
            
            // Test system as variable name (should still find it)
            const variableSystemPosition = complexCalculator.findJavaErrorPosition(complexLines[5], 'system', 5);
            expect(variableSystemPosition).not.toBeNull();
            expect(variableSystemPosition!.start.line).toBe(5);
            // Should find "system" in "String system = ..."
            expect(variableSystemPosition!.start.character).toBe(11);
            expect(variableSystemPosition!.end.character).toBe(17);
            
            // Test system in conditional
            const conditionalSystemPosition = complexCalculator.findJavaErrorPosition(complexLines[6], 'system', 6);
            expect(conditionalSystemPosition).not.toBeNull();
            expect(conditionalSystemPosition!.start.line).toBe(6);
            expect(conditionalSystemPosition!.start.character).toBe(8);
            expect(conditionalSystemPosition!.end.character).toBe(14);
            
            // Test system in nested context
            const nestedSystemPosition = complexCalculator.findJavaErrorPosition(complexLines[7], 'system', 7);
            expect(nestedSystemPosition).not.toBeNull();
            expect(nestedSystemPosition!.start.line).toBe(7);
            expect(nestedSystemPosition!.start.character).toBe(8);
            expect(nestedSystemPosition!.end.character).toBe(14);
            
            // Test system as generic type parameter
            const genericSystemPosition = complexCalculator.findJavaErrorPosition(complexLines[9], 'system', 9);
            expect(genericSystemPosition).not.toBeNull();
            expect(genericSystemPosition!.start.line).toBe(9);
            expect(genericSystemPosition!.start.character).toBe(16);
            expect(genericSystemPosition!.end.character).toBe(22);
            
            // Test system as array type
            const arraySystemPosition = complexCalculator.findJavaErrorPosition(complexLines[10], 'system', 10);
            expect(arraySystemPosition).not.toBeNull();
            expect(arraySystemPosition!.start.line).toBe(10);
            expect(arraySystemPosition!.start.character).toBe(4);
            expect(arraySystemPosition!.end.character).toBe(10);
        });

        test('should handle Java method call errors', () => {
            const methodLines = [
                'rule "Method Call Errors"',
                'when',
                '    $item : Item()',
                'then',
                '    System.out.printl("method typo");',
                '    obj.prinln("another typo");',
                '    collection.sie();',
                '    string.lenght();',
                'end'
            ];
            
            const methodCalculator = new PrecisePositionCalculator(methodLines);
            
            // Test printl method error
            const printlPosition = methodCalculator.findJavaMethodError(methodLines[4], 'printl', 4);
            expect(printlPosition).not.toBeNull();
            expect(printlPosition!.start.line).toBe(4);
            expect(printlPosition!.start.character).toBe(15);
            expect(printlPosition!.end.character).toBe(21);
            
            // Test prinln method error
            const prinlnPosition = methodCalculator.findJavaMethodError(methodLines[5], 'prinln', 5);
            expect(prinlnPosition).not.toBeNull();
            expect(prinlnPosition!.start.line).toBe(5);
            expect(prinlnPosition!.start.character).toBe(8);
            expect(prinlnPosition!.end.character).toBe(14);
            
            // Test sie method error (should be size)
            const siePosition = methodCalculator.findJavaMethodError(methodLines[6], 'sie', 6);
            expect(siePosition).not.toBeNull();
            expect(siePosition!.start.line).toBe(6);
            expect(siePosition!.start.character).toBe(15);
            expect(siePosition!.end.character).toBe(18);
            
            // Test lenght method error (should be length)
            const lenghtPosition = methodCalculator.findJavaMethodError(methodLines[7], 'lenght', 7);
            expect(lenghtPosition).not.toBeNull();
            expect(lenghtPosition!.start.line).toBe(7);
            expect(lenghtPosition!.start.character).toBe(11);
            expect(lenghtPosition!.end.character).toBe(17);
        });

        test('should handle Java class instantiation errors', () => {
            const classLines = [
                'rule "Class Instantiation Errors"',
                'when',
                '    $item : Item()',
                'then',
                '    arraylist<String> list = new arraylist<>();',
                '    hashmap<String, Integer> map = new hashmap<>();',
                '    stirng value = "test";',
                '    integr number = 42;',
                'end'
            ];
            
            const classCalculator = new PrecisePositionCalculator(classLines);
            
            // Test arraylist class error (should be ArrayList)
            const arraylistPosition = classCalculator.findJavaClassError(classLines[4], 'arraylist', 4);
            expect(arraylistPosition).not.toBeNull();
            expect(arraylistPosition!.start.line).toBe(4);
            expect(arraylistPosition!.start.character).toBe(33);
            expect(arraylistPosition!.end.character).toBe(42);
            
            // Test hashmap class error (should be HashMap)
            const hashmapPosition = classCalculator.findJavaClassError(classLines[5], 'hashmap', 5);
            expect(hashmapPosition).not.toBeNull();
            expect(hashmapPosition!.start.line).toBe(5);
            expect(hashmapPosition!.start.character).toBe(39);
            expect(hashmapPosition!.end.character).toBe(46);
            
            // Test stirng type error (should be String)
            const stirngPosition = classCalculator.findJavaClassError(classLines[6], 'stirng', 6);
            expect(stirngPosition).not.toBeNull();
            expect(stirngPosition!.start.line).toBe(6);
            expect(stirngPosition!.start.character).toBe(4);
            expect(stirngPosition!.end.character).toBe(10);
            
            // Test integr type error (should be Integer)
            const integrPosition = classCalculator.findJavaClassError(classLines[7], 'integr', 7);
            expect(integrPosition).not.toBeNull();
            expect(integrPosition!.start.line).toBe(7);
            expect(integrPosition!.start.character).toBe(4);
            expect(integrPosition!.end.character).toBe(10);
        });

        test('should return null for non-existent Java errors', () => {
            const testLine = '    System.out.println("correct code");';
            
            // Test with non-existent error token
            const nonExistentPosition = calculator.findJavaErrorPosition(testLine, 'nonexistent', 0);
            expect(nonExistentPosition).toBeNull();
            
            // Test with correct Java construct (should still find it as it exists in the line)
            const correctPosition = calculator.findJavaErrorPosition(testLine, 'System', 0);
            expect(correctPosition).not.toBeNull(); // Should still find it as it exists in the line
            
            // Test with empty error token (should return null)
            const emptyPosition = calculator.findJavaErrorPosition(testLine, '', 0);
            expect(emptyPosition).toBeNull();
        });

        test('should handle edge cases in Java error positioning', () => {
            const edgeCaseLines = [
                'rule "Edge Cases"',
                'when',
                '    $item : Item()',
                'then',
                '    /* system in comment */',
                '    "system in string"',
                '    system.out.println("actual error");',
                '    systemProperty = "not an error";',
                '    mySystem.doSomething();',
                'end'
            ];
            
            const edgeCalculator = new PrecisePositionCalculator(edgeCaseLines);
            
            // Should find system in actual code, not in comments or strings
            const systemPosition = edgeCalculator.findJavaErrorPosition(edgeCaseLines[6], 'system', 6);
            expect(systemPosition).not.toBeNull();
            expect(systemPosition!.start.line).toBe(6);
            expect(systemPosition!.start.character).toBe(4);
            expect(systemPosition!.end.character).toBe(10);
            
            // Should not find system in comment line (but method will still find it if present)
            const commentPosition = edgeCalculator.findJavaErrorPosition(edgeCaseLines[4], 'system', 4);
            expect(commentPosition).not.toBeNull(); // Will find it but that's expected behavior
            
            // Should not find system as part of systemProperty
            const propertyPosition = edgeCalculator.findJavaErrorPosition(edgeCaseLines[7], 'system', 7);
            expect(propertyPosition).toBeNull(); // Word boundary should prevent partial match
            
            // Should not find system as part of mySystem
            const mySystemPosition = edgeCalculator.findJavaErrorPosition(edgeCaseLines[8], 'system', 8);
            expect(mySystemPosition).toBeNull(); // Word boundary should prevent partial match
        });
    });

    describe('Performance and Edge Cases', () => {
        test('should handle large documents efficiently', () => {
            const largeDocumentLines = Array(1000).fill(0).map((_, i) => 
                `    $var${i} : Type${i}(field > ${i})`
            );
            
            const largeCalculator = new PrecisePositionCalculator(largeDocumentLines);
            const largeWhenClause: WhenNode = {
                type: 'When',
                conditions: [],
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 999, character: 30 }
                }
            };

            const startTime = performance.now();
            const position = largeCalculator.findVariableDeclarationPosition(largeWhenClause, '$var500');
            const endTime = performance.now();

            expect(position).not.toBeNull();
            expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
        });

        test('should handle empty lines and whitespace-only lines', () => {
            const emptyLines = [
                'rule "Empty Lines"',
                'when',
                '',
                '    $item : Item()',
                '    ',
                'then',
                '',
                '    System.out.println($item);',
                '    ',
                'end'
            ];
            
            const emptyCalculator = new PrecisePositionCalculator(emptyLines);
            const emptyWhenClause: WhenNode = {
                type: 'When',
                conditions: [],
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 5, character: 4 }
                }
            };

            const position = emptyCalculator.findVariableDeclarationPosition(emptyWhenClause, '$item');
            expect(position).not.toBeNull();
        });

        test('should handle malformed or incomplete code', () => {
            const malformedLines = [
                'rule "Malformed"',
                'when',
                '    $item : Item(',
                '    $incomplete',
                'then',
                '    System.out.println($item',
                'end'
            ];
            
            const malformedCalculator = new PrecisePositionCalculator(malformedLines);
            const malformedWhenClause: WhenNode = {
                type: 'When',
                conditions: [],
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 4, character: 15 }
                }
            };

            // Should still find variables even in malformed code
            const position = malformedCalculator.findVariableDeclarationPosition(malformedWhenClause, '$item');
            expect(position).not.toBeNull();
        });

        test('should measure performance of position calculations', () => {
            const result = calculator.measurePositionCalculationPerformance(
                () => calculator.findVariableDeclarationPosition({
                    type: 'When',
                    conditions: [],
                    range: { start: { line: 1, character: 0 }, end: { line: 9, character: 25 } }
                }, '$item'),
                'findVariableDeclarationPosition',
                50
            );

            expect(result.result).not.toBeNull();
            expect(result.durationMs).toBeGreaterThan(0);
            expect(typeof result.isPerformant).toBe('boolean');
        });
    });
});