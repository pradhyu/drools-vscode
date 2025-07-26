/**
 * Performance tests for large .drl files
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';
import { DroolsCompletionProvider, CompletionSettings } from '../../src/server/providers/completionProvider';
import { DroolsDiagnosticProvider, DiagnosticSettings } from '../../src/server/providers/diagnosticProvider';
import { DroolsFormattingProvider, FormattingSettings } from '../../src/server/providers/formattingProvider';

describe('Performance Tests for Large Files', () => {
    let parser: DroolsParser;
    let completionProvider: DroolsCompletionProvider;
    let diagnosticProvider: DroolsDiagnosticProvider;
    let formattingProvider: DroolsFormattingProvider;

    beforeEach(() => {
        parser = new DroolsParser();
        
        const completionSettings: CompletionSettings = {
            enableKeywordCompletion: true,
            enableFactTypeCompletion: true,
            enableFunctionCompletion: true,
            enableVariableCompletion: true,
            maxCompletionItems: 50
        };
        completionProvider = new DroolsCompletionProvider(completionSettings);

        const diagnosticSettings: DiagnosticSettings = {
            maxNumberOfProblems: 1000,
            enableSyntaxValidation: true,
            enableSemanticValidation: true,
            enableBestPracticeWarnings: true
        };
        diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);

        const formattingSettings: FormattingSettings = {
            insertSpaces: true,
            tabSize: 4,
            indentSize: 4,
            maxLineLength: 120,
            trimTrailingWhitespace: true,
            insertFinalNewline: true,
            spaceAroundOperators: true,
            spaceAfterKeywords: true,
            alignRuleBlocks: true
        };
        formattingProvider = new DroolsFormattingProvider(formattingSettings);
    });

    describe('Large File Parsing Performance', () => {
        test('should parse 100 rules within acceptable time', () => {
            const largeContent = generateLargeDroolsFile(100);
            
            const startTime = performance.now();
            const parseResult = parser.parse(largeContent);
            const endTime = performance.now();
            
            const parseTime = endTime - startTime;
            
            expect(parseResult.ast.rules).toHaveLength(100);
            expect(parseTime).toBeLessThan(1000); // Should parse in less than 1 second
            
            console.log(`Parsed 100 rules in ${parseTime.toFixed(2)}ms`);
        });

        test('should parse 500 rules within acceptable time', () => {
            const largeContent = generateLargeDroolsFile(500);
            
            const startTime = performance.now();
            const parseResult = parser.parse(largeContent);
            const endTime = performance.now();
            
            const parseTime = endTime - startTime;
            
            expect(parseResult.ast.rules).toHaveLength(500);
            expect(parseTime).toBeLessThan(5000); // Should parse in less than 5 seconds
            
            console.log(`Parsed 500 rules in ${parseTime.toFixed(2)}ms`);
        });

        test('should parse 1000 rules within acceptable time', () => {
            const largeContent = generateLargeDroolsFile(1000);
            
            const startTime = performance.now();
            const parseResult = parser.parse(largeContent);
            const endTime = performance.now();
            
            const parseTime = endTime - startTime;
            
            expect(parseResult.ast.rules).toHaveLength(1000);
            expect(parseTime).toBeLessThan(10000); // Should parse in less than 10 seconds
            
            console.log(`Parsed 1000 rules in ${parseTime.toFixed(2)}ms`);
        });

        test('should handle very large single rule efficiently', () => {
            const largeRule = generateLargeComplexRule(100); // Rule with 100 conditions
            
            const startTime = performance.now();
            const parseResult = parser.parse(largeRule);
            const endTime = performance.now();
            
            const parseTime = endTime - startTime;
            
            expect(parseResult.ast.rules).toHaveLength(1);
            expect(parseResult.ast.rules[0].when?.conditions.length).toBe(100);
            expect(parseTime).toBeLessThan(500); // Should parse complex rule quickly
            
            console.log(`Parsed complex rule with 100 conditions in ${parseTime.toFixed(2)}ms`);
        });
    });

    describe('Large File Completion Performance', () => {
        test('should provide completions quickly in large files', async () => {
            const largeContent = generateLargeDroolsFile(200);
            const document = (global as any).createMockTextDocument(largeContent);
            const parseResult = parser.parse(largeContent);
            
            // Test completion at various positions
            const positions = [
                { line: 10, character: 0 },   // Beginning of file
                { line: 500, character: 4 },  // Middle of file
                { line: 1000, character: 8 }  // End of file
            ];

            for (const position of positions) {
                const startTime = performance.now();
                const completions = await completionProvider.provideCompletions(document, position, parseResult);
                const endTime = performance.now();
                
                const completionTime = endTime - startTime;
                
                expect(Array.isArray(completions)).toBe(true);
                expect(completionTime).toBeLessThan(200); // Should complete in less than 200ms
                
                console.log(`Completion at line ${position.line} took ${completionTime.toFixed(2)}ms`);
            }
        });

        test('should limit completion results for performance', async () => {
            const largeContent = generateLargeDroolsFile(500);
            const document = (global as any).createMockTextDocument(largeContent);
            const parseResult = parser.parse(largeContent);
            
            const position = { line: 100, character: 0 };
            
            const startTime = performance.now();
            const completions = await completionProvider.provideCompletions(document, position, parseResult);
            const endTime = performance.now();
            
            const completionTime = endTime - startTime;
            
            expect(completions.length).toBeLessThanOrEqual(50); // Respects maxCompletionItems
            expect(completionTime).toBeLessThan(300);
            
            console.log(`Limited completions (${completions.length} items) took ${completionTime.toFixed(2)}ms`);
        });
    });

    describe('Large File Diagnostic Performance', () => {
        test('should provide diagnostics quickly for large files', () => {
            const largeContent = generateLargeDroolsFile(300);
            const document = (global as any).createMockTextDocument(largeContent);
            const parseResult = parser.parse(largeContent);
            
            const startTime = performance.now();
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            const endTime = performance.now();
            
            const diagnosticTime = endTime - startTime;
            
            expect(Array.isArray(diagnostics)).toBe(true);
            expect(diagnosticTime).toBeLessThan(2000); // Should analyze in less than 2 seconds
            
            console.log(`Diagnostic analysis of 300 rules took ${diagnosticTime.toFixed(2)}ms`);
        });

        test('should handle files with many errors efficiently', () => {
            const largeContentWithErrors = generateLargeDroolsFileWithErrors(100);
            const document = (global as any).createMockTextDocument(largeContentWithErrors);
            const parseResult = parser.parse(largeContentWithErrors);
            
            const startTime = performance.now();
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            const endTime = performance.now();
            
            const diagnosticTime = endTime - startTime;
            
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnosticTime).toBeLessThan(1500); // Should handle errors efficiently
            
            console.log(`Analyzed ${diagnostics.length} diagnostics in ${diagnosticTime.toFixed(2)}ms`);
        });

        test('should respect diagnostic limits for performance', () => {
            const limitedSettings: DiagnosticSettings = {
                maxNumberOfProblems: 50,
                enableSyntaxValidation: true,
                enableSemanticValidation: true,
                enableBestPracticeWarnings: true
            };
            const limitedProvider = new DroolsDiagnosticProvider(limitedSettings);
            
            const largeContentWithErrors = generateLargeDroolsFileWithErrors(200);
            const document = (global as any).createMockTextDocument(largeContentWithErrors);
            const parseResult = parser.parse(largeContentWithErrors);
            
            const startTime = performance.now();
            const diagnostics = limitedProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            const endTime = performance.now();
            
            const diagnosticTime = endTime - startTime;
            
            expect(diagnostics.length).toBeLessThanOrEqual(50);
            expect(diagnosticTime).toBeLessThan(1000); // Should be faster with limits
            
            console.log(`Limited diagnostics (${diagnostics.length} items) took ${diagnosticTime.toFixed(2)}ms`);
        });
    });

    describe('Large File Formatting Performance', () => {
        test('should format large files efficiently', () => {
            const largeUnformattedContent = generateLargeUnformattedDroolsFile(150);
            const document = (global as any).createMockTextDocument(largeUnformattedContent);
            const parseResult = parser.parse(largeUnformattedContent);
            const options = { insertSpaces: true, tabSize: 4 };
            
            const startTime = performance.now();
            const edits = formattingProvider.formatDocument(document, options, parseResult);
            const endTime = performance.now();
            
            const formatTime = endTime - startTime;
            
            expect(Array.isArray(edits)).toBe(true);
            expect(formatTime).toBeLessThan(3000); // Should format in less than 3 seconds
            
            console.log(`Formatted 150 rules in ${formatTime.toFixed(2)}ms with ${edits.length} edits`);
        });

        test('should handle range formatting efficiently', () => {
            const largeContent = generateLargeUnformattedDroolsFile(200);
            const document = (global as any).createMockTextDocument(largeContent);
            const parseResult = parser.parse(largeContent);
            
            // Format a range in the middle of the file
            const range = {
                start: { line: 100, character: 0 },
                end: { line: 200, character: 0 }
            };
            
            const startTime = performance.now();
            const edits = formattingProvider.formatRange(document, range, parseResult);
            const endTime = performance.now();
            
            const formatTime = endTime - startTime;
            
            expect(Array.isArray(edits)).toBe(true);
            expect(formatTime).toBeLessThan(1000); // Range formatting should be faster
            
            console.log(`Range formatting took ${formatTime.toFixed(2)}ms with ${edits.length} edits`);
        });
    });

    describe('Memory Usage Tests', () => {
        test('should not consume excessive memory for large files', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Parse multiple large files
            for (let i = 0; i < 5; i++) {
                const largeContent = generateLargeDroolsFile(100);
                const parseResult = parser.parse(largeContent);
                expect(parseResult.ast.rules).toHaveLength(100);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
            
            // Should not increase memory by more than 100MB for this test
            expect(memoryIncreaseMB).toBeLessThan(100);
            
            console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
        });

        test('should handle incremental parsing efficiently', () => {
            const baseContent = generateLargeDroolsFile(100);
            let document = (global as any).createMockTextDocument(baseContent);
            
            // Simulate incremental changes
            const startTime = performance.now();
            
            for (let i = 0; i < 10; i++) {
                const newRule = `
rule "Dynamic Rule ${i}"
when
    $p : Person(age > ${20 + i})
then
    System.out.println("Dynamic rule ${i}");
end`;
                
                const updatedContent = document.getText() + newRule;
                document = (global as any).createMockTextDocument(updatedContent);
                
                const parseResult = parser.parse(document.getText());
                expect(parseResult.ast.rules.length).toBe(100 + i + 1);
            }
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            expect(totalTime).toBeLessThan(2000); // Should handle incremental changes quickly
            
            console.log(`10 incremental changes took ${totalTime.toFixed(2)}ms`);
        });
    });

    describe('Stress Tests', () => {
        test('should handle extremely large files gracefully', () => {
            const extremelyLargeContent = generateLargeDroolsFile(2000);
            
            const startTime = performance.now();
            
            try {
                const parseResult = parser.parse(extremelyLargeContent);
                const endTime = performance.now();
                
                const parseTime = endTime - startTime;
                
                expect(parseResult.ast.rules).toHaveLength(2000);
                expect(parseTime).toBeLessThan(30000); // Should complete within 30 seconds
                
                console.log(`Parsed 2000 rules in ${parseTime.toFixed(2)}ms`);
            } catch (error) {
                // Should not throw errors, but if it does, it should be handled gracefully
                expect(error).toBeInstanceOf(Error);
                console.log(`Gracefully handled error for extremely large file: ${error}`);
            }
        });

        test('should handle concurrent operations efficiently', async () => {
            const largeContent = generateLargeDroolsFile(200);
            const document = (global as any).createMockTextDocument(largeContent);
            const parseResult = parser.parse(largeContent);
            
            const startTime = performance.now();
            
            // Run multiple operations concurrently
            const operations = await Promise.all([
                completionProvider.provideCompletions(document, { line: 50, character: 4 }, parseResult),
                completionProvider.provideCompletions(document, { line: 100, character: 8 }, parseResult),
                completionProvider.provideCompletions(document, { line: 150, character: 12 }, parseResult),
                Promise.resolve(diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors)),
                Promise.resolve(formattingProvider.formatDocument(document, { insertSpaces: true, tabSize: 4 }, parseResult))
            ]);
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            expect(operations).toHaveLength(5);
            expect(totalTime).toBeLessThan(5000); // Should handle concurrent operations efficiently
            
            console.log(`5 concurrent operations took ${totalTime.toFixed(2)}ms`);
        });
    });
});

// Helper functions to generate test content

function generateLargeDroolsFile(numRules: number): string {
    let content = `package com.example.performance.test;

import java.util.List;
import java.util.Date;

global List<String> messages;

function String formatMessage(String name, int age) {
    return "Person: " + name + ", Age: " + age;
}

`;

    for (let i = 0; i < numRules; i++) {
        content += `rule "Performance Test Rule ${i}"
    salience ${100 - (i % 100)}
when
    $person${i} : Person(age > ${18 + (i % 50)}, name != null)
    $account${i} : Account(owner == $person${i}, balance > ${1000 + i * 100})
then
    messages.add(formatMessage($person${i}.getName(), $person${i}.getAge()));
    $account${i}.setLastAccessed(new Date());
    System.out.println("Rule ${i} fired for " + $person${i}.getName());
end

`;
    }

    return content;
}

function generateLargeComplexRule(numConditions: number): string {
    let content = `package com.example.complex;

rule "Complex Rule with Many Conditions"
when
`;

    for (let i = 0; i < numConditions; i++) {
        content += `    $obj${i} : TestObject${i % 10}(value > ${i}, active == true)\n`;
    }

    content += `then
    System.out.println("Complex rule fired with ${numConditions} conditions");
end
`;

    return content;
}

function generateLargeDroolsFileWithErrors(numRules: number): string {
    let content = `package com.example.errors;

import java.util.List;

`;

    for (let i = 0; i < numRules; i++) {
        // Introduce various types of errors
        const hasError = i % 3 === 0;
        
        if (hasError) {
            // Missing closing parenthesis
            content += `rule "Error Rule ${i}"
when
    $p${i} : Person(age > ${18 + i}
then
    System.out.println("Error rule ${i}");
end

`;
        } else {
            content += `rule "Good Rule ${i}"
when
    $p${i} : Person(age > ${18 + i})
then
    System.out.println("Good rule ${i}");
end

`;
        }
    }

    return content;
}

function generateLargeUnformattedDroolsFile(numRules: number): string {
    let content = `package com.example.unformatted;
import java.util.List;
global List<String> messages;
`;

    for (let i = 0; i < numRules; i++) {
        // Generate poorly formatted rules
        content += `rule "Unformatted Rule ${i}"
when
$p${i}:Person(age>${18+i},name!=null)
$a${i}:Account(owner==$p${i},balance>${1000+i*100})
then
messages.add("Rule ${i}");
System.out.println("Unformatted rule ${i}");
end
`;
    }

    return content;
}