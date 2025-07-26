/**
 * Tests for performance manager functionality
 */

import { PerformanceManager, PerformanceSettings } from '../../src/server/performance/performanceManager';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseResult } from '../../src/server/parser/droolsParser';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

describe('PerformanceManager', () => {
    let performanceManager: PerformanceManager;
    let settings: PerformanceSettings;

    beforeEach(() => {
        settings = {
            enableIncrementalParsing: true,
            enableCaching: true,
            debounceDelay: 100,
            maxCacheSize: 1024 * 1024, // 1MB
            maxFileSize: 512 * 1024, // 512KB
            gcInterval: 1000 // 1 second for testing
        };
        performanceManager = new PerformanceManager(settings);
    });

    afterEach(() => {
        performanceManager.dispose();
    });

    describe('Document Caching', () => {
        it('should cache and retrieve parse results', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const parseResult: ParseResult = {
                ast: {
                    type: 'DroolsFile',
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } },
                    packageDeclaration: undefined,
                    imports: [],
                    globals: [],
                    functions: [],
                    rules: [{
                        type: 'Rule',
                        name: 'test',
                        attributes: [],
                        when: undefined,
                        then: undefined,
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } }
                    }],
                    queries: [],
                    declares: []
                },
                errors: []
            };

            // Cache the result
            performanceManager.cacheParseResult('test://test.drl', document, parseResult);

            // Retrieve cached result
            const cached = performanceManager.getCachedParseResult('test://test.drl', document);
            expect(cached).toBeDefined();
            expect(cached?.ast.rules).toHaveLength(1);
            expect(cached?.ast.rules[0].name).toBe('test');
        });

        it('should return null for cache miss', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const cached = performanceManager.getCachedParseResult('test://nonexistent.drl', document);
            expect(cached).toBeNull();
        });

        it('should invalidate cache when document version changes', () => {
            const document1 = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const document2 = TextDocument.create('test://test.drl', 'drools', 2, 'rule "test2" when then end');
            
            const parseResult: ParseResult = {
                ast: {
                    type: 'DroolsFile',
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } },
                    packageDeclaration: undefined,
                    imports: [],
                    globals: [],
                    functions: [],
                    rules: [],
                    queries: [],
                    declares: []
                },
                errors: []
            };

            // Cache with version 1
            performanceManager.cacheParseResult('test://test.drl', document1, parseResult);

            // Try to retrieve with version 2
            const cached = performanceManager.getCachedParseResult('test://test.drl', document2);
            expect(cached).toBeNull();
        });
    });

    describe('Diagnostic Caching', () => {
        it('should cache and retrieve diagnostics', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const diagnostics: Diagnostic[] = [{
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } },
                message: 'Test diagnostic',
                severity: DiagnosticSeverity.Warning,
                source: 'drools'
            }];
            const settingsHash = 'test-hash';

            // Cache diagnostics
            performanceManager.cacheDiagnostics('test://test.drl', document, diagnostics, settingsHash);

            // Retrieve cached diagnostics
            const cached = performanceManager.getCachedDiagnostics('test://test.drl', document, settingsHash);
            expect(cached).toBeDefined();
            expect(cached).toHaveLength(1);
            expect(cached![0].message).toBe('Test diagnostic');
        });

        it('should invalidate diagnostic cache when settings change', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const diagnostics: Diagnostic[] = [];
            const settingsHash1 = 'hash1';
            const settingsHash2 = 'hash2';

            // Cache with hash1
            performanceManager.cacheDiagnostics('test://test.drl', document, diagnostics, settingsHash1);

            // Try to retrieve with hash2
            const cached = performanceManager.getCachedDiagnostics('test://test.drl', document, settingsHash2);
            expect(cached).toBeNull();
        });
    });

    describe('Debouncing', () => {
        it('should debounce operations', async () => {
            let callCount = 0;
            const operation = jest.fn(async () => {
                callCount++;
            });

            // Call multiple times quickly
            performanceManager.debounce('test-key', operation);
            performanceManager.debounce('test-key', operation);
            performanceManager.debounce('test-key', operation);

            // Wait for debounce delay
            await new Promise(resolve => setTimeout(resolve, settings.debounceDelay + 50));

            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should handle different debounce keys separately', async () => {
            const operation1 = jest.fn(async () => {});
            const operation2 = jest.fn(async () => {});

            performanceManager.debounce('key1', operation1);
            performanceManager.debounce('key2', operation2);

            await new Promise(resolve => setTimeout(resolve, settings.debounceDelay + 50));

            expect(operation1).toHaveBeenCalledTimes(1);
            expect(operation2).toHaveBeenCalledTimes(1);
        });
    });

    describe('Large Document Handling', () => {
        it('should detect large documents', () => {
            const largeContent = 'a'.repeat(settings.maxFileSize + 1);
            const document = TextDocument.create('test://large.drl', 'drools', 1, largeContent);

            expect(performanceManager.isDocumentTooLarge(document)).toBe(true);
        });

        it('should not flag normal documents as large', () => {
            const normalContent = 'rule "test" when then end';
            const document = TextDocument.create('test://normal.drl', 'drools', 1, normalContent);

            expect(performanceManager.isDocumentTooLarge(document)).toBe(false);
        });
    });

    describe('Incremental Parsing', () => {
        it('should generate incremental parsing ranges', () => {
            const content = 'rule "test1" when then end\nrule "test2" when then end\nrule "test3" when then end';
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            
            const changes = [{
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 26 }
                },
                text: 'rule "modified" when then end'
            }];

            const ranges = performanceManager.getIncrementalParsingRanges(document, changes);
            expect(ranges).toBeDefined();
            expect(ranges.length).toBeGreaterThan(0);
        });

        it('should return full range when incremental parsing is disabled', () => {
            const content = 'rule "test" when then end';
            const document = TextDocument.create('test://test.drl', 'drools', 1, content);
            
            // Disable incremental parsing
            performanceManager.updateSettings({ enableIncrementalParsing: false });
            
            const ranges = performanceManager.getIncrementalParsingRanges(document, []);
            expect(ranges).toHaveLength(1);
            expect(ranges[0].start).toBe(0);
            expect(ranges[0].end).toBe(content.length);
        });
    });

    describe('Memory Management', () => {
        it('should track cache size', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const parseResult: ParseResult = {
                ast: {
                    type: 'DroolsFile',
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } },
                    packageDeclaration: undefined,
                    imports: [],
                    globals: [],
                    functions: [],
                    rules: [],
                    queries: [],
                    declares: []
                },
                errors: []
            };

            const initialMetrics = performanceManager.getMetrics();
            performanceManager.cacheParseResult('test://test.drl', document, parseResult);
            const afterCacheMetrics = performanceManager.getMetrics();

            expect(afterCacheMetrics.cacheSize).toBeGreaterThan(initialMetrics.cacheSize);
        });

        it('should clear document cache', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const parseResult: ParseResult = {
                ast: {
                    type: 'DroolsFile',
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } },
                    packageDeclaration: undefined,
                    imports: [],
                    globals: [],
                    functions: [],
                    rules: [],
                    queries: [],
                    declares: []
                },
                errors: []
            };

            performanceManager.cacheParseResult('test://test.drl', document, parseResult);
            expect(performanceManager.getCachedParseResult('test://test.drl', document)).toBeDefined();

            performanceManager.clearDocumentCache('test://test.drl');
            expect(performanceManager.getCachedParseResult('test://test.drl', document)).toBeNull();
        });
    });

    describe('Performance Metrics', () => {
        it('should track cache hits and misses', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const parseResult: ParseResult = {
                ast: {
                    type: 'DroolsFile',
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } },
                    packageDeclaration: undefined,
                    imports: [],
                    globals: [],
                    functions: [],
                    rules: [],
                    queries: [],
                    declares: []
                },
                errors: []
            };

            // Cache miss
            performanceManager.getCachedParseResult('test://test.drl', document);
            
            // Cache the result
            performanceManager.cacheParseResult('test://test.drl', document, parseResult);
            
            // Cache hit
            performanceManager.getCachedParseResult('test://test.drl', document);

            const metrics = performanceManager.getMetrics();
            expect(metrics.cacheMisses).toBe(1);
            expect(metrics.cacheHits).toBe(1);
            expect(metrics.cacheHitRatio).toBe(0.5);
        });
    });

    describe('Settings Updates', () => {
        it('should update settings and clear cache when caching is disabled', () => {
            const document = TextDocument.create('test://test.drl', 'drools', 1, 'rule "test" when then end');
            const parseResult: ParseResult = {
                ast: {
                    type: 'DroolsFile',
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 25 } },
                    packageDeclaration: undefined,
                    imports: [],
                    globals: [],
                    functions: [],
                    rules: [],
                    queries: [],
                    declares: []
                },
                errors: []
            };

            // Cache something
            performanceManager.cacheParseResult('test://test.drl', document, parseResult);
            expect(performanceManager.getCachedParseResult('test://test.drl', document)).toBeDefined();

            // Disable caching
            performanceManager.updateSettings({ enableCaching: false });

            // Cache should be cleared
            expect(performanceManager.getCachedParseResult('test://test.drl', document)).toBeNull();
        });
    });
});