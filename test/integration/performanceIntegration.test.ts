/**
 * Integration tests for performance optimizations
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';
import { PerformanceManager, PerformanceSettings } from '../../src/server/performance/performanceManager';
import { DroolsDiagnosticProvider, DiagnosticSettings } from '../../src/server/providers/diagnosticProvider';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe('Performance Integration', () => {
    let parser: DroolsParser;
    let performanceManager: PerformanceManager;
    let diagnosticProvider: DroolsDiagnosticProvider;

    beforeEach(() => {
        parser = new DroolsParser();
        
        const performanceSettings: PerformanceSettings = {
            enableIncrementalParsing: true,
            enableCaching: true,
            debounceDelay: 50,
            maxCacheSize: 1024 * 1024,
            maxFileSize: 512 * 1024,
            gcInterval: 5000,
            maxMultiLinePatternDepth: 10,
            multiLinePatternCacheSize: 100,
            enableParenthesesCaching: true
        };
        performanceManager = new PerformanceManager(performanceSettings);

        const diagnosticSettings: DiagnosticSettings = {
            maxNumberOfProblems: 100,
            enableSyntaxValidation: true,
            enableSemanticValidation: true,
            enableBestPracticeWarnings: true
        };
        diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);
    });

    afterEach(() => {
        performanceManager.dispose();
    });

    it('should demonstrate caching performance benefits', async () => {
        const content = `
package com.example.rules;

import java.util.List;

global Logger logger;

rule "Test Rule 1"
    salience 100
when
    $person : Person(age > 18)
    $account : Account(owner == $person, balance > 1000)
then
    logger.info("Adult with sufficient balance found");
    modify($account) { setStatus("ACTIVE") };
end

rule "Test Rule 2"
when
    $person : Person(age < 18)
then
    logger.info("Minor found");
end
        `.trim();

        const document = TextDocument.create('test://performance.drl', 'drools', 1, content);

        // First parse - should be slow (no cache)
        const startTime1 = Date.now();
        const parseResult1 = parser.parse(content);
        const parseTime1 = Date.now() - startTime1;

        // Cache the result
        performanceManager.cacheParseResult(document.uri, document, parseResult1);

        // Second parse - should be fast (from cache)
        const startTime2 = Date.now();
        const cachedResult = performanceManager.getCachedParseResult(document.uri, document);
        const cacheTime = Date.now() - startTime2;

        expect(cachedResult).toBeDefined();
        expect(cachedResult?.ast.rules).toHaveLength(2);
        expect(cacheTime).toBeLessThan(parseTime1); // Cache should be faster

        // Verify cache hit metrics
        const metrics = performanceManager.getMetrics();
        expect(metrics.cacheHits).toBe(1);
        expect(metrics.cacheHitRatio).toBe(1);
    });

    it('should demonstrate diagnostic caching', async () => {
        const content = `
rule "Test Rule"
when
    $person : Person(age > 18)
then
    System.out.println("Adult found");
end
        `.trim();

        const document = TextDocument.create('test://diagnostics.drl', 'drools', 1, content);
        const parseResult = parser.parse(content);
        const settingsHash = 'test-settings-hash';

        // First diagnostic run
        const startTime1 = Date.now();
        const diagnostics1 = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
        const diagnosticTime1 = Date.now() - startTime1;

        // Cache the diagnostics
        performanceManager.cacheDiagnostics(document.uri, document, diagnostics1, settingsHash);

        // Second diagnostic run - should use cache
        const startTime2 = Date.now();
        const cachedDiagnostics = performanceManager.getCachedDiagnostics(document.uri, document, settingsHash);
        const cacheTime = Date.now() - startTime2;

        expect(cachedDiagnostics).toBeDefined();
        expect(cachedDiagnostics).toEqual(diagnostics1);
        expect(cacheTime).toBeLessThan(diagnosticTime1); // Cache should be faster
    });

    it('should handle incremental parsing for large documents', () => {
        const baseContent = `
package com.example.rules;

rule "Base Rule"
when
    $person : Person(age > 18)
then
    System.out.println("Base rule");
end
        `.trim();

        // Create a large document by repeating rules
        const largeContent = baseContent + '\n\n' + Array(50).fill(0).map((_, i) => `
rule "Generated Rule ${i}"
when
    $item : Item(id == ${i})
then
    System.out.println("Generated rule ${i}");
end
        `).join('\n\n');

        const document = TextDocument.create('test://large.drl', 'drools', 1, largeContent);

        // Simulate a change in the middle of the document
        const changes = [{
            range: {
                start: { line: 10, character: 0 },
                end: { line: 15, character: 0 }
            },
            text: 'rule "Modified Rule"\nwhen\n    $x : X()\nthen\n    System.out.println("Modified");\nend\n'
        }];

        // Get incremental parsing ranges
        const ranges = performanceManager.getIncrementalParsingRanges(document, changes);
        
        expect(ranges).toBeDefined();
        expect(ranges.length).toBeGreaterThan(0);
        
        // Verify that incremental ranges are smaller than full document
        const fullDocumentSize = largeContent.length;
        const incrementalSize = ranges.reduce((sum, range) => sum + (range.end - range.start), 0);
        
        expect(incrementalSize).toBeLessThan(fullDocumentSize);
    });

    it('should handle memory pressure gracefully', () => {
        const performanceSettings: PerformanceSettings = {
            enableIncrementalParsing: true,
            enableCaching: true,
            debounceDelay: 50,
            maxCacheSize: 1024, // Very small cache for testing
            maxFileSize: 512 * 1024,
            gcInterval: 5000,
            maxMultiLinePatternDepth: 10,
            multiLinePatternCacheSize: 100,
            enableParenthesesCaching: true
        };
        
        const smallCacheManager = new PerformanceManager(performanceSettings);

        try {
            // Create multiple documents to exceed cache size
            for (let i = 0; i < 10; i++) {
                const content = `rule "Rule ${i}" when $x : X(id == ${i}) then end`;
                const document = TextDocument.create(`test://doc${i}.drl`, 'drools', 1, content);
                const parseResult = parser.parse(content);
                
                smallCacheManager.cacheParseResult(document.uri, document, parseResult);
            }

            // Verify that cache eviction occurred
            const metrics = smallCacheManager.getMetrics();
            expect(metrics.memoryFreed).toBeGreaterThan(0);
            
        } finally {
            smallCacheManager.dispose();
        }
    });

    it('should demonstrate debouncing benefits', async () => {
        let operationCount = 0;
        const expensiveOperation = jest.fn(async () => {
            operationCount++;
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        // Simulate rapid document changes
        for (let i = 0; i < 5; i++) {
            performanceManager.debounce('validation-key', expensiveOperation);
        }

        // Wait for debounce to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should only execute once due to debouncing
        expect(expensiveOperation).toHaveBeenCalledTimes(1);
    });

    it('should track performance metrics accurately', () => {
        const document = TextDocument.create('test://metrics.drl', 'drools', 1, 'rule "test" when then end');
        const parseResult = parser.parse('rule "test" when then end');

        // Generate some cache activity
        performanceManager.getCachedParseResult(document.uri, document); // miss
        performanceManager.cacheParseResult(document.uri, document, parseResult);
        performanceManager.getCachedParseResult(document.uri, document); // hit
        performanceManager.getCachedParseResult(document.uri, document); // hit

        const metrics = performanceManager.getMetrics();
        
        expect(metrics.cacheMisses).toBe(1);
        expect(metrics.cacheHits).toBe(2);
        expect(metrics.cacheHitRatio).toBeCloseTo(0.67, 2);
        expect(metrics.documentCacheEntries).toBe(1);
        expect(metrics.cacheSize).toBeGreaterThan(0);
    });
});