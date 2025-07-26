/**
 * Performance manager for optimizing language server operations
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseResult } from '../parser/droolsParser';
import { Diagnostic } from 'vscode-languageserver/node';

export interface PerformanceSettings {
    enableIncrementalParsing: boolean;
    enableCaching: boolean;
    debounceDelay: number;
    maxCacheSize: number;
    maxFileSize: number;
    gcInterval: number;
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

export class PerformanceManager {
    private settings: PerformanceSettings;
    
    // Document parsing cache
    private documentCache = new Map<string, DocumentCacheEntry>();
    
    // Diagnostic cache
    private diagnosticCache = new Map<string, DiagnosticCacheEntry>();
    
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
        memoryFreed: 0
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
        this.totalCacheSize = 0;
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