/**
 * Performance manager for optimizing language server operations
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseResult } from '../parser/droolsParser';
import { Diagnostic } from 'vscode-languageserver/node';
import { MultiLinePatternMetadata, ParenthesesTracker, Position, Range } from '../parser/ast';

export interface PerformanceSettings {
    enableIncrementalParsing: boolean;
    enableCaching: boolean;
    debounceDelay: number;
    maxCacheSize: number;
    maxFileSize: number;
    gcInterval: number;
    maxMultiLinePatternDepth: number;
    multiLinePatternCacheSize: number;
    enableParenthesesCaching: boolean;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
    size: number;
}

export interface DocumentCacheEntry extends CacheEntry<ParseResult> {
    version: number;
    contentHash: string;
}

export interface DiagnosticCacheEntry extends CacheEntry<Diagnostic[]> {
    version: number;
    settingsHash: string;
}

export interface MultiLinePatternCacheEntry extends CacheEntry<MultiLinePatternMetadata[]> {
    version: number;
    contentHash: string;
    lineRanges: { start: number; end: number }[];
}

export interface ParenthesesCacheEntry extends CacheEntry<ParenthesesTracker> {
    version: number;
    contentHash: string;
    affectedLines: number[];
}

export class PerformanceManager {
    private settings: PerformanceSettings;
    
    // Document parsing cache
    private documentCache = new Map<string, DocumentCacheEntry>();
    
    // Diagnostic cache
    private diagnosticCache = new Map<string, DiagnosticCacheEntry>();
    
    // Multi-line pattern specific caches
    private multiLinePatternCache = new Map<string, MultiLinePatternCacheEntry>();
    private parenthesesCache = new Map<string, ParenthesesCacheEntry>();
    
    // Debounce timers
    private debounceTimers = new Map<string, NodeJS.Timeout>();
    
    // Memory usage tracking
    private totalCacheSize = 0;
    private gcTimer: NodeJS.Timeout | null = null;
    
    // Performance metrics
    private metrics = {
        cacheHits: 0,
        cacheMisses: 0,
        parseTime: 0,
        diagnosticTime: 0,
        gcRuns: 0,
        memoryFreed: 0,
        multiLinePatternCacheHits: 0,
        multiLinePatternCacheMisses: 0,
        parenthesesCacheHits: 0,
        parenthesesCacheMisses: 0
    };

    constructor(settings: PerformanceSettings) {
        this.settings = settings;
        this.startGarbageCollector();
    }

    /**
     * Get cached parse result or indicate cache miss
     */
    public getCachedParseResult(uri: string, document: TextDocument): ParseResult | null {
        if (!this.settings.enableCaching) {
            return null;
        }

        const cached = this.documentCache.get(uri);
        if (!cached) {
            this.metrics.cacheMisses++;
            return null;
        }

        // Check version and content hash
        const contentHash = this.calculateContentHash(document.getText());
        if (cached.version !== document.version || cached.contentHash !== contentHash) {
            this.documentCache.delete(uri);
            this.totalCacheSize -= cached.size;
            this.metrics.cacheMisses++;
            return null;
        }

        // Update access statistics
        cached.lastAccessed = Date.now();
        cached.accessCount++;
        this.metrics.cacheHits++;
        
        return cached.data;
    }

    /**
     * Cache parse result with memory management
     */
    public cacheParseResult(uri: string, document: TextDocument, parseResult: ParseResult): void {
        if (!this.settings.enableCaching) {
            return;
        }

        const contentHash = this.calculateContentHash(document.getText());
        const size = this.estimateParseResultSize(parseResult);
        
        // Check if we need to free memory before caching
        if (this.totalCacheSize + size > this.settings.maxCacheSize) {
            this.evictLeastRecentlyUsed(size);
        }

        const cacheEntry: DocumentCacheEntry = {
            data: parseResult,
            version: document.version,
            contentHash,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now(),
            size
        };

        this.documentCache.set(uri, cacheEntry);
        this.totalCacheSize += size;
    }

    /**
     * Get cached diagnostic result
     */
    public getCachedDiagnostics(uri: string, document: TextDocument, settingsHash: string): Diagnostic[] | null {
        if (!this.settings.enableCaching) {
            return null;
        }

        const cached = this.diagnosticCache.get(uri);
        if (!cached) {
            this.metrics.cacheMisses++;
            return null;
        }

        // Check version and settings hash
        if (cached.version !== document.version || cached.settingsHash !== settingsHash) {
            this.diagnosticCache.delete(uri);
            this.totalCacheSize -= cached.size;
            this.metrics.cacheMisses++;
            return null;
        }

        // Update access statistics
        cached.lastAccessed = Date.now();
        cached.accessCount++;
        this.metrics.cacheHits++;
        
        return cached.data;
    }

    /**
     * Cache diagnostic result
     */
    public cacheDiagnostics(uri: string, document: TextDocument, diagnostics: Diagnostic[], settingsHash: string): void {
        if (!this.settings.enableCaching) {
            return;
        }

        const size = this.estimateDiagnosticsSize(diagnostics);
        
        // Check if we need to free memory before caching
        if (this.totalCacheSize + size > this.settings.maxCacheSize) {
            this.evictLeastRecentlyUsed(size);
        }

        const cacheEntry: DiagnosticCacheEntry = {
            data: diagnostics,
            version: document.version,
            settingsHash,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now(),
            size
        };

        this.diagnosticCache.set(uri, cacheEntry);
        this.totalCacheSize += size;
    }

    /**
     * Debounce expensive operations
     */
    public debounce<T extends any[]>(
        key: string,
        operation: (...args: T) => Promise<void>,
        ...args: T
    ): Promise<void> {
        return new Promise((resolve) => {
            // Clear existing timer
            const existingTimer = this.debounceTimers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            // Set new timer
            const timer = setTimeout(async () => {
                this.debounceTimers.delete(key);
                await operation(...args);
                resolve();
            }, this.settings.debounceDelay);

            this.debounceTimers.set(key, timer);
        });
    }

    /**
     * Check if document is too large for full processing
     */
    public isDocumentTooLarge(document: TextDocument): boolean {
        return document.getText().length > this.settings.maxFileSize;
    }

    /**
     * Get incremental parsing ranges for large documents
     */
    public getIncrementalParsingRanges(document: TextDocument, changes: any[]): { start: number; end: number }[] {
        if (!this.settings.enableIncrementalParsing || !changes || changes.length === 0) {
            return [{ start: 0, end: document.getText().length }];
        }

        const ranges: { start: number; end: number }[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (const change of changes) {
            // Calculate affected range with some buffer
            const startLine = Math.max(0, change.range.start.line - 5);
            const endLine = Math.min(lines.length - 1, change.range.end.line + 5);
            
            const startOffset = this.getOffsetFromPosition(text, { line: startLine, character: 0 });
            const endOffset = this.getOffsetFromPosition(text, { line: endLine, character: lines[endLine]?.length || 0 });
            
            ranges.push({ start: startOffset, end: endOffset });
        }

        return this.mergeOverlappingRanges(ranges);
    }

    /**
     * Get cached multi-line patterns for incremental parsing
     * Requirement: Add caching for multi-line pattern boundaries and metadata
     */
    public getCachedMultiLinePatterns(uri: string, document: TextDocument, lineRanges: { start: number; end: number }[]): MultiLinePatternMetadata[] | null {
        if (!this.settings.enableCaching) {
            return null;
        }

        const cached = this.multiLinePatternCache.get(uri);
        if (!cached) {
            this.metrics.multiLinePatternCacheMisses++;
            return null;
        }

        // Check version and content hash
        const contentHash = this.calculateContentHash(document.getText());
        if (cached.version !== document.version || cached.contentHash !== contentHash) {
            this.multiLinePatternCache.delete(uri);
            this.totalCacheSize -= cached.size;
            this.metrics.multiLinePatternCacheMisses++;
            return null;
        }

        // Check if requested line ranges overlap with cached ranges
        if (!this.rangesOverlap(lineRanges, cached.lineRanges)) {
            this.metrics.multiLinePatternCacheMisses++;
            return null;
        }

        // Update access statistics
        cached.lastAccessed = Date.now();
        cached.accessCount++;
        this.metrics.multiLinePatternCacheHits++;
        
        return cached.data;
    }

    /**
     * Cache multi-line pattern metadata for performance optimization
     * Requirement: Add caching for multi-line pattern boundaries and metadata
     */
    public cacheMultiLinePatterns(
        uri: string, 
        document: TextDocument, 
        patterns: MultiLinePatternMetadata[], 
        lineRanges: { start: number; end: number }[]
    ): void {
        if (!this.settings.enableCaching) {
            return;
        }

        const contentHash = this.calculateContentHash(document.getText());
        const size = this.estimateMultiLinePatternSize(patterns);
        
        // Check if we need to free memory before caching
        if (this.totalCacheSize + size > this.settings.multiLinePatternCacheSize) {
            this.evictMultiLinePatternCache(size);
        }

        const cacheEntry: MultiLinePatternCacheEntry = {
            data: patterns,
            version: document.version,
            contentHash,
            lineRanges: [...lineRanges],
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now(),
            size
        };

        this.multiLinePatternCache.set(uri, cacheEntry);
        this.totalCacheSize += size;
    }

    /**
     * Get cached parentheses tracker for optimized bracket matching
     * Requirement: Optimize parentheses matching algorithms for better performance
     */
    public getCachedParenthesesTracker(uri: string, document: TextDocument, affectedLines: number[]): ParenthesesTracker | null {
        if (!this.settings.enableParenthesesCaching) {
            return null;
        }

        const cached = this.parenthesesCache.get(uri);
        if (!cached) {
            this.metrics.parenthesesCacheMisses++;
            return null;
        }

        // Check version and content hash
        const contentHash = this.calculateContentHash(document.getText());
        if (cached.version !== document.version || cached.contentHash !== contentHash) {
            this.parenthesesCache.delete(uri);
            this.totalCacheSize -= cached.size;
            this.metrics.parenthesesCacheMisses++;
            return null;
        }

        // Check if affected lines overlap with cached lines
        if (!this.linesOverlap(affectedLines, cached.affectedLines)) {
            this.metrics.parenthesesCacheMisses++;
            return null;
        }

        // Update access statistics
        cached.lastAccessed = Date.now();
        cached.accessCount++;
        this.metrics.parenthesesCacheHits++;
        
        return cached.data;
    }

    /**
     * Cache parentheses tracker for optimized bracket matching
     * Requirement: Optimize parentheses matching algorithms for better performance
     */
    public cacheParenthesesTracker(
        uri: string, 
        document: TextDocument, 
        tracker: ParenthesesTracker, 
        affectedLines: number[]
    ): void {
        if (!this.settings.enableParenthesesCaching) {
            return;
        }

        const contentHash = this.calculateContentHash(document.getText());
        const size = this.estimateParenthesesTrackerSize(tracker);
        
        // Check if we need to free memory before caching
        if (this.totalCacheSize + size > this.settings.maxCacheSize) {
            this.evictLeastRecentlyUsed(size);
        }

        const cacheEntry: ParenthesesCacheEntry = {
            data: tracker,
            version: document.version,
            contentHash,
            affectedLines: [...affectedLines],
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now(),
            size
        };

        this.parenthesesCache.set(uri, cacheEntry);
        this.totalCacheSize += size;
    }

    /**
     * Get optimized incremental parsing ranges for multi-line patterns
     * Requirement: Implement incremental parsing for modified multi-line patterns only
     */
    public getMultiLinePatternIncrementalRanges(
        document: TextDocument, 
        changes: any[], 
        existingPatterns: MultiLinePatternMetadata[]
    ): { start: number; end: number }[] {
        if (!this.settings.enableIncrementalParsing || !changes || changes.length === 0) {
            return [{ start: 0, end: document.getText().length }];
        }

        const ranges: { start: number; end: number }[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (const change of changes) {
            // Find multi-line patterns that might be affected by this change
            const affectedPatterns = this.findAffectedMultiLinePatterns(change, existingPatterns);
            
            if (affectedPatterns.length > 0) {
                // Expand range to include entire affected patterns
                for (const pattern of affectedPatterns) {
                    const startLine = Math.max(0, pattern.startLine - 2);
                    const endLine = Math.min(lines.length - 1, pattern.endLine + 2);
                    
                    const startOffset = this.getOffsetFromPosition(text, { line: startLine, character: 0 });
                    const endOffset = this.getOffsetFromPosition(text, { line: endLine, character: lines[endLine]?.length || 0 });
                    
                    ranges.push({ start: startOffset, end: endOffset });
                }
            } else {
                // Standard incremental range with buffer for potential multi-line patterns
                const startLine = Math.max(0, change.range.start.line - 10);
                const endLine = Math.min(lines.length - 1, change.range.end.line + 10);
                
                const startOffset = this.getOffsetFromPosition(text, { line: startLine, character: 0 });
                const endOffset = this.getOffsetFromPosition(text, { line: endLine, character: lines[endLine]?.length || 0 });
                
                ranges.push({ start: startOffset, end: endOffset });
            }
        }

        return this.mergeOverlappingRanges(ranges);
    }

    /**
     * Check if multi-line pattern complexity exceeds limits for memory management
     * Requirement: Create memory management strategies for complex nested patterns
     */
    public isMultiLinePatternTooComplex(pattern: MultiLinePatternMetadata): boolean {
        // Check nesting depth
        const depth = this.calculatePatternDepth(pattern);
        if (depth > this.settings.maxMultiLinePatternDepth) {
            return true;
        }

        // Check content size
        const contentSize = pattern.content.length;
        if (contentSize > this.settings.maxFileSize / 10) { // 10% of max file size
            return true;
        }

        // Check number of nested patterns
        const nestedCount = this.countNestedPatterns(pattern);
        if (nestedCount > 50) { // Arbitrary limit for nested patterns
            return true;
        }

        return false;
    }

    /**
     * Clear cache for a specific document
     */
    public clearDocumentCache(uri: string): void {
        const parseCache = this.documentCache.get(uri);
        if (parseCache) {
            this.totalCacheSize -= parseCache.size;
            this.documentCache.delete(uri);
        }

        const diagnosticCache = this.diagnosticCache.get(uri);
        if (diagnosticCache) {
            this.totalCacheSize -= diagnosticCache.size;
            this.diagnosticCache.delete(uri);
        }

        const multiLinePatternCache = this.multiLinePatternCache.get(uri);
        if (multiLinePatternCache) {
            this.totalCacheSize -= multiLinePatternCache.size;
            this.multiLinePatternCache.delete(uri);
        }

        const parenthesesCache = this.parenthesesCache.get(uri);
        if (parenthesesCache) {
            this.totalCacheSize -= parenthesesCache.size;
            this.parenthesesCache.delete(uri);
        }
    }

    /**
     * Get performance metrics
     */
    public getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.totalCacheSize,
            documentCacheEntries: this.documentCache.size,
            diagnosticCacheEntries: this.diagnosticCache.size,
            cacheHitRatio: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        };
    }

    /**
     * Update settings
     */
    public updateSettings(settings: Partial<PerformanceSettings>): void {
        this.settings = { ...this.settings, ...settings };
        
        // Clear cache if caching is disabled
        if (!this.settings.enableCaching) {
            this.clearAllCaches();
        }
        
        // Restart GC with new interval
        if (settings.gcInterval !== undefined) {
            this.stopGarbageCollector();
            this.startGarbageCollector();
        }
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.stopGarbageCollector();
        this.clearAllDebounceTimers();
        this.clearAllCaches();
    }

    // Private methods

    private calculateContentHash(content: string): string {
        // Simple hash function for content comparison
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private estimateParseResultSize(parseResult: ParseResult): number {
        // Rough estimation of memory usage
        const astSize = JSON.stringify(parseResult.ast).length;
        const errorsSize = JSON.stringify(parseResult.errors).length;
        return (astSize + errorsSize) * 2; // Factor for object overhead
    }

    private estimateDiagnosticsSize(diagnostics: Diagnostic[]): number {
        return JSON.stringify(diagnostics).length * 2;
    }

    private evictLeastRecentlyUsed(requiredSize: number): void {
        const allEntries: Array<{ uri: string; entry: CacheEntry<any>; type: 'document' | 'diagnostic' }> = [];
        
        // Collect all cache entries
        for (const [uri, entry] of this.documentCache) {
            allEntries.push({ uri, entry, type: 'document' });
        }
        for (const [uri, entry] of this.diagnosticCache) {
            allEntries.push({ uri, entry, type: 'diagnostic' });
        }

        // Sort by last accessed time (oldest first)
        allEntries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

        let freedSize = 0;
        for (const { uri, entry, type } of allEntries) {
            if (type === 'document') {
                this.documentCache.delete(uri);
            } else {
                this.diagnosticCache.delete(uri);
            }
            
            freedSize += entry.size;
            this.totalCacheSize -= entry.size;
            this.metrics.memoryFreed += entry.size;

            if (freedSize >= requiredSize) {
                break;
            }
        }
    }

    private startGarbageCollector(): void {
        if (this.gcTimer) {
            return;
        }

        this.gcTimer = setInterval(() => {
            this.runGarbageCollection();
        }, this.settings.gcInterval);
    }

    private stopGarbageCollector(): void {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
            this.gcTimer = null;
        }
    }

    private runGarbageCollection(): void {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        let freedSize = 0;

        // Clean up old document cache entries
        for (const [uri, entry] of this.documentCache) {
            if (now - entry.lastAccessed > maxAge) {
                this.documentCache.delete(uri);
                freedSize += entry.size;
                this.totalCacheSize -= entry.size;
            }
        }

        // Clean up old diagnostic cache entries
        for (const [uri, entry] of this.diagnosticCache) {
            if (now - entry.lastAccessed > maxAge) {
                this.diagnosticCache.delete(uri);
                freedSize += entry.size;
                this.totalCacheSize -= entry.size;
            }
        }

        this.metrics.gcRuns++;
        this.metrics.memoryFreed += freedSize;

        // Force Node.js garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    private clearAllCaches(): void {
        this.documentCache.clear();
        this.diagnosticCache.clear();
        this.multiLinePatternCache.clear();
        this.parenthesesCache.clear();
        this.totalCacheSize = 0;
    }

    /**
     * Estimate memory size of multi-line pattern metadata
     */
    private estimateMultiLinePatternSize(patterns: MultiLinePatternMetadata[]): number {
        return JSON.stringify(patterns).length * 2; // Factor for object overhead
    }

    /**
     * Estimate memory size of parentheses tracker
     */
    private estimateParenthesesTrackerSize(tracker: ParenthesesTracker): number {
        return JSON.stringify(tracker).length * 2; // Factor for object overhead
    }

    /**
     * Check if line ranges overlap
     */
    private rangesOverlap(ranges1: { start: number; end: number }[], ranges2: { start: number; end: number }[]): boolean {
        for (const range1 of ranges1) {
            for (const range2 of ranges2) {
                if (!(range1.end < range2.start || range2.end < range1.start)) {
                    return true; // Ranges overlap
                }
            }
        }
        return false;
    }

    /**
     * Check if line arrays overlap
     */
    private linesOverlap(lines1: number[], lines2: number[]): boolean {
        const set1 = new Set(lines1);
        return lines2.some(line => set1.has(line));
    }

    /**
     * Find multi-line patterns affected by a change
     */
    private findAffectedMultiLinePatterns(change: any, patterns: MultiLinePatternMetadata[]): MultiLinePatternMetadata[] {
        const affected: MultiLinePatternMetadata[] = [];
        
        for (const pattern of patterns) {
            // Check if change overlaps with pattern range
            if (change.range.start.line <= pattern.endLine && change.range.end.line >= pattern.startLine) {
                affected.push(pattern);
            }
        }
        
        return affected;
    }

    /**
     * Calculate the depth of nested patterns
     */
    private calculatePatternDepth(pattern: MultiLinePatternMetadata): number {
        let maxDepth = 1;
        
        for (const nested of pattern.nestedPatterns) {
            const nestedDepth = this.calculatePatternDepth(nested) + 1;
            maxDepth = Math.max(maxDepth, nestedDepth);
        }
        
        return maxDepth;
    }

    /**
     * Count total number of nested patterns
     */
    private countNestedPatterns(pattern: MultiLinePatternMetadata): number {
        let count = pattern.nestedPatterns.length;
        
        for (const nested of pattern.nestedPatterns) {
            count += this.countNestedPatterns(nested);
        }
        
        return count;
    }

    /**
     * Evict multi-line pattern cache entries to free memory
     */
    private evictMultiLinePatternCache(requiredSize: number): void {
        const entries = Array.from(this.multiLinePatternCache.entries());
        
        // Sort by last accessed time (oldest first)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        let freedSize = 0;
        for (const [uri, entry] of entries) {
            this.multiLinePatternCache.delete(uri);
            freedSize += entry.size;
            this.totalCacheSize -= entry.size;
            this.metrics.memoryFreed += entry.size;
            
            if (freedSize >= requiredSize) {
                break;
            }
        }
    }

    private clearAllDebounceTimers(): void {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
    }

    private getOffsetFromPosition(text: string, position: { line: number; character: number }): number {
        const lines = text.split('\n');
        let offset = 0;
        
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        
        return offset + Math.min(position.character, lines[position.line]?.length || 0);
    }

    private mergeOverlappingRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
        if (ranges.length <= 1) {
            return ranges;
        }

        // Sort ranges by start position
        ranges.sort((a, b) => a.start - b.start);

        const merged: { start: number; end: number }[] = [ranges[0]];

        for (let i = 1; i < ranges.length; i++) {
            const current = ranges[i];
            const last = merged[merged.length - 1];

            if (current.start <= last.end) {
                // Overlapping ranges, merge them
                last.end = Math.max(last.end, current.end);
            } else {
                // Non-overlapping range, add it
                merged.push(current);
            }
        }

        return merged;
    }
}