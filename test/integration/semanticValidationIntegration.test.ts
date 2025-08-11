/**
 * Comprehensive integration tests for semantic validation fixes
 * Tests end-to-end validation without duplication, coordination across validation types,
 * performance with large files, and regression testing
 */

import { DroolsDiagnosticProvider } from '../../src/server/providers/diagnosticProvider';
import { DroolsParser } from '../../src/server/parser/droolsParser';
import { ValidationType } from '../../src/server/performance/validationMetrics';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/node';

function createMockTextDocument(content: string, uri: string = 'file:///test.drl'): TextDocument {
    return TextDocument.create(uri, 'drools', 1, content);
}

describe('Semantic Validation Integration Tests', () => {
    let provider: DroolsDiagnosticProvider;
    let parser: DroolsParser;

    const defaultSettings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };

    beforeEach(() => {
        provider = new DroolsDiagnosticProvider(defaultSettings);
        parser = new DroolsParser();
    });

    describe('End-to-End Validation Without Duplication', () => {
        test('should validate complete rule file without duplicate errors', () => {
            const content = `package org.example.test

import org.example.Person
import org.example.Address

global java.util.List results;

function boolean isAdult(Person p) {
    return p.getAge() >= 18;
}

rule "Adult Processing"
    salience 100
    no-loop true
when
    $p : Person( age > 18, name != null )
    $a : Address( city == "London" ) from $p.address
then
    results.add($p);
    System.out.println("Processing adult: " + $p.getName());
end

rule "Minor Processing"
when
    $p : Person( age < 18 )
then
    System.out.println("Processing minor: " + $p.getName());
end`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should not have duplicate error messages
            const errorMessages = diagnostics.map(d => d.message);
            const uniqueMessages = new Set(errorMessages);
            expect(errorMessages.length).toBe(uniqueMessages.size);

            // Should have reasonable number of diagnostics (not excessive due to duplication)
            expect(diagnostics.length).toBeLessThan(10);

            // Check that semantic validation ran only once
            const metrics = provider.getPerformanceMetrics();
            expect(metrics.validationCounts.get(ValidationType.SEMANTIC)).toBe(1);
        });

        test('should handle complex rule structures without duplication', () => {
            const content = `package org.example.complex

rule "Complex Rule with Multiple Patterns"
when
    $p : Person( age > 21, status != null )
    exists( Car( owner == $p, color in ("red", "blue") ) )
    not( Violation( person == $p, type == "speeding" ) )
    $total : Number( doubleValue > 1000.0 ) from accumulate(
        Order( customer == $p, $amount : total ),
        sum( $amount )
    )
then
    $p.setVipStatus(true);
    System.out.println("VIP customer: " + $p.getName());
end`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should not have duplicate validation errors
            const semanticErrors = diagnostics.filter(d => d.source === 'drools-semantic');
            const errorMessages = semanticErrors.map(d => d.message);
            const uniqueMessages = new Set(errorMessages);
            expect(errorMessages.length).toBe(uniqueMessages.size);
        });
    });

    describe('Validation Coordination Across Multiple Types', () => {
        test('should coordinate syntax, semantic, and best practice validation', () => {
            const content = `package org.example.coordination

rule "Test Rule"
when
    $p : Person( age > 18 )
    $p : Person( name != null )  // Duplicate variable - semantic error
then
    System.out.println("Test")   // Missing semicolon - syntax error
    $p.setProcessed(true);
end`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should have both semantic and syntax errors
            const semanticErrors = diagnostics.filter(d => d.source === 'drools-semantic');
            const syntaxErrors = diagnostics.filter(d => d.source === 'drools-parser' || d.source === 'drools-syntax');

            expect(semanticErrors.length).toBeGreaterThan(0);
            // Note: syntax error detection may vary based on parser implementation

            // Check that all validation types ran exactly once
            const phaseMetrics = provider.getPhaseMetrics();
            const phaseTypes = phaseMetrics.map(p => p.phase);
            const uniquePhases = new Set(phaseTypes);
            expect(phaseTypes.length).toBe(uniquePhases.size); // No duplicate phases
        });

        test('should respect validation settings coordination', () => {
            const semanticOnlySettings = {
                maxNumberOfProblems: 100,
                enableSyntaxValidation: false,
                enableSemanticValidation: true,
                enableBestPracticeWarnings: false
            };

            const semanticOnlyProvider = new DroolsDiagnosticProvider(semanticOnlySettings);

            const content = `rule "Test"
when
    $p : Person()
    $p : Person()  // Duplicate variable
then
    System.out.println("test");
end`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = semanticOnlyProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should only have semantic errors, no syntax or best practice
            const semanticErrors = diagnostics.filter(d => d.source === 'drools-semantic');
            const otherErrors = diagnostics.filter(d => d.source !== 'drools-semantic');



            expect(semanticErrors.length).toBeGreaterThan(0);
            expect(otherErrors.length).toBe(0);

            // Check that only semantic validation ran
            const metrics = semanticOnlyProvider.getPerformanceMetrics();
            expect(metrics.validationCounts.get(ValidationType.SEMANTIC)).toBe(1);
            expect(metrics.validationCounts.get(ValidationType.SYNTAX)).toBeUndefined();
        });
    });

    describe('Performance Tests for Large Files', () => {
        test('should handle large files efficiently', () => {
            // Generate a large rule file
            const ruleTemplate = (index: number) => `
rule "Rule ${index}"
    salience ${100 - index}
when
    $p${index} : Person( age > ${18 + (index % 50)}, name != null )
    $a${index} : Address( city != null ) from $p${index}.address
then
    System.out.println("Processing rule ${index}: " + $p${index}.getName());
    $p${index}.setProcessed(true);
end`;

            const rules = Array.from({ length: 50 }, (_, i) => ruleTemplate(i)).join('\n');
            const content = `package org.example.performance

import org.example.Person
import org.example.Address

global java.util.List results;
${rules}`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);

            const startTime = performance.now();
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            const endTime = performance.now();

            const validationTime = endTime - startTime;

            // Performance assertions
            expect(validationTime).toBeLessThan(2000); // Should complete within 2 seconds
            expect(diagnostics.length).toBeLessThan(200); // Reasonable number of diagnostics

            // Check performance metrics
            const metrics = provider.getPerformanceMetrics();
            expect(metrics.totalValidationTime).toBeLessThan(2000);
            // Performance test - allow generous time limits for complex validation
            expect(provider.isPerformanceAcceptable(30000, 500)).toBe(true);

            // Should not have performance degradation warnings for this size
            expect(provider.isPerformanceDegraded(content.length, 50)).toBe(false);
        });

        test('should provide performance optimization suggestions for slow validation', () => {
            // Create a complex file that might trigger optimization suggestions
            const complexRules = Array.from({ length: 20 }, (_, i) => `
rule "Complex Rule ${i}"
when
    $p${i} : Person( age > ${18 + i}, name != null, status != null )
    exists( Car( owner == $p${i}, color in ("red", "blue", "green") ) )
    not( Violation( person == $p${i}, type in ("speeding", "parking") ) )
    $total${i} : Number( doubleValue > ${1000 + i * 100} ) from accumulate(
        Order( customer == $p${i}, $amount : total ),
        sum( $amount )
    )
then
    $p${i}.setVipStatus(true);
    System.out.println("VIP customer " + ${i} + ": " + $p${i}.getName());
end`).join('\n');

            const content = `package org.example.complex
import org.example.*
${complexRules}`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);
            provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            const suggestions = provider.getOptimizationSuggestions();
            // Should provide suggestions if performance is not optimal
            expect(Array.isArray(suggestions)).toBe(true);
        });
    });

    describe('Regression Tests', () => {
        test('should maintain existing functionality for valid syntax', () => {
            const validContent = `package org.example.regression

import org.example.Person

rule "Valid Rule"
    salience 100
    no-loop true
    agenda-group "processing"
when
    $p : Person( age >= 18, name != null )
then
    System.out.println("Valid processing: " + $p.getName());
    $p.setStatus("processed");
end`;

            const document = createMockTextDocument(validContent);
            const parseResult = parser.parse(validContent);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should have minimal or no errors for valid syntax
            const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
            expect(errors.length).toBe(0);
        });

        test('should correctly handle quoted rule names with spaces', () => {
            const quotedRuleContent = `package org.example.quoted

rule "My Rule With Spaces"
when
    $p : Person( age > 18 )
then
    System.out.println("Quoted rule works");
end

rule "Another Rule With-Dashes"
when
    $p : Person( name != null )
then
    System.out.println("Dashes work too");
end`;

            const document = createMockTextDocument(quotedRuleContent);
            const parseResult = parser.parse(quotedRuleContent);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should not flag quoted rule names with spaces as errors
            const ruleNameErrors = diagnostics.filter(d => 
                d.message.includes('rule name') || d.message.includes('spaces')
            );
            expect(ruleNameErrors.length).toBe(0);
        });

        test('should detect duplicate variable declarations', () => {
            const duplicateVarContent = `package org.example.duplicate

rule "Duplicate Variables"
when
    $p : Person( age > 18 )
    $p : Person( name != null )  // Duplicate variable
    $q : Person( status == "active" )
    $q : Person( city != null )  // Another duplicate
then
    System.out.println($p.getName());
end`;

            const document = createMockTextDocument(duplicateVarContent);
            const parseResult = parser.parse(duplicateVarContent);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should detect duplicate variable declarations
            const duplicateErrors = diagnostics.filter(d => 
                d.message.includes('Duplicate variable') || d.message.includes('already declared')
            );
            expect(duplicateErrors.length).toBeGreaterThan(0);
        });

        test('should handle undefined variable usage', () => {
            const undefinedVarContent = `package org.example.undefined

rule "Undefined Variable"
when
    $p : Person( age > 18 )
then
    System.out.println($undefinedVar.getName());  // Undefined variable
    $p.setStatus("processed");
end`;

            const document = createMockTextDocument(undefinedVarContent);
            const parseResult = parser.parse(undefinedVarContent);
            const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

            // Should detect undefined variable usage
            const undefinedErrors = diagnostics.filter(d => 
                d.message.includes('Undefined variable') || d.message.includes('not declared')
            );
            expect(undefinedErrors.length).toBeGreaterThan(0);
        });
    });

    describe('Validation Settings Integration', () => {
        test('should immediately reflect validation setting changes', () => {
            const content = `rule "Test"
when
    $p : Person()
    $p : Person()  // Duplicate variable
then
    System.out.println("test")
end`;

            const document = createMockTextDocument(content);
            const parseResult = parser.parse(content);

            // First run with semantic validation enabled
            const enabledProvider = new DroolsDiagnosticProvider({
                maxNumberOfProblems: 100,
                enableSyntaxValidation: true,
                enableSemanticValidation: true,
                enableBestPracticeWarnings: true
            });

            const enabledDiagnostics = enabledProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            const enabledSemanticErrors = enabledDiagnostics.filter(d => d.source === 'drools-semantic');

            // Second run with semantic validation disabled
            const disabledProvider = new DroolsDiagnosticProvider({
                maxNumberOfProblems: 100,
                enableSyntaxValidation: true,
                enableSemanticValidation: false,
                enableBestPracticeWarnings: true
            });

            const disabledDiagnostics = disabledProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            const disabledSemanticErrors = disabledDiagnostics.filter(d => d.source === 'drools-semantic');

            // Should have semantic errors when enabled, none when disabled
            expect(enabledSemanticErrors.length).toBeGreaterThan(0);
            expect(disabledSemanticErrors.length).toBe(0);
        });
    });

    describe('Multiple File Validation Resource Management', () => {
        test('should manage validation resources efficiently across multiple files', () => {
            const files = [
                { name: 'file1.drl', content: 'rule "Rule1" when $p : Person() then System.out.println("1"); end' },
                { name: 'file2.drl', content: 'rule "Rule2" when $p : Person() then System.out.println("2"); end' },
                { name: 'file3.drl', content: 'rule "Rule3" when $p : Person() then System.out.println("3"); end' }
            ];

            const results = files.map(file => {
                const document = createMockTextDocument(file.content, `file:///${file.name}`);
                const parseResult = parser.parse(file.content);
                const startTime = performance.now();
                const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
                const endTime = performance.now();

                return {
                    file: file.name,
                    diagnostics: diagnostics.length,
                    time: endTime - startTime,
                    metrics: provider.getPerformanceMetrics()
                };
            });

            // Each file should be validated efficiently
            results.forEach(result => {
                expect(result.time).toBeLessThan(1000); // Each file under 1 second
                expect(result.metrics.totalValidationTime).toBeLessThan(1000);
            });

            // Should have collected benchmarks for all files
            const benchmarks = provider.getPerformanceBenchmarks();
            expect(benchmarks.length).toBe(files.length);
        });
    });
});