/**
 * Performance monitoring for validation operations
 * Tracks timing, memory usage, and efficiency metrics for semantic validation
 */

export interface ValidationMetrics {
    totalValidationTime: number;
    validationCounts: Map<ValidationType, number>;
    duplicatePreventionCount: number;
    memoryUsage: number;
    cacheHitRate: number;
    errorCount: number;
    warningCount: number;
}

export interface ValidationPhaseMetrics {
    phase: ValidationType;
    startTime: number;
    endTime: number;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
    errorsFound: number;
    warningsFound: number;
    duplicatesPrevented: number;
}

export enum ValidationType {
    SYNTAX = 'syntax',
    SEMANTIC = 'semantic',
    BEST_PRACTICE = 'best-practice',
    MULTILINE_PATTERNS = 'multiline-patterns'
}

export interface PerformanceBenchmark {
    fileSize: number;
    ruleCount: number;
    validationTime: number;
    memoryUsage: number;
    timestamp: number;
}

/**
 * Manages performance metrics collection for validation operations
 */
export class ValidationMetricsCollector {
    private metrics: ValidationMetrics = {
        totalValidationTime: 0,
        validationCounts: new Map<ValidationType, number>(),
        duplicatePreventionCount: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        errorCount: 0,
        warningCount: 0
    };
    private phaseMetrics: ValidationPhaseMetrics[] = [];
    private benchmarks: PerformanceBenchmark[] = [];
    private cacheHits: number = 0;
    private cacheMisses: number = 0;
    private startTime: number = 0;

    constructor() {
        this.resetMetrics();
    }

    /**
     * Reset all metrics for a new validation cycle
     */
    public resetMetrics(): void {
        this.metrics = {
            totalValidationTime: 0,
            validationCounts: new Map<ValidationType, number>(),
            duplicatePreventionCount: 0,
            memoryUsage: 0,
            cacheHitRate: 0,
            errorCount: 0,
            warningCount: 0
        };
        this.phaseMetrics = [];
        this.startTime = performance.now();
    }

    /**
     * Start timing a validation phase
     */
    public startPhase(phase: ValidationType): void {
        const phaseMetric: ValidationPhaseMetrics = {
            phase,
            startTime: performance.now(),
            endTime: 0,
            duration: 0,
            memoryBefore: this.getMemoryUsage(),
            memoryAfter: 0,
            errorsFound: 0,
            warningsFound: 0,
            duplicatesPrevented: 0
        };
        this.phaseMetrics.push(phaseMetric);
        
        // Update validation count
        const currentCount = this.metrics.validationCounts.get(phase) || 0;
        this.metrics.validationCounts.set(phase, currentCount + 1);
    }

    /**
     * End timing a validation phase and record results
     */
    public endPhase(phase: ValidationType, errorsFound: number = 0, warningsFound: number = 0, duplicatesPrevented: number = 0): void {
        const phaseMetric = this.phaseMetrics.find(p => p.phase === phase && p.endTime === 0);
        if (phaseMetric) {
            phaseMetric.endTime = performance.now();
            phaseMetric.duration = phaseMetric.endTime - phaseMetric.startTime;
            phaseMetric.memoryAfter = this.getMemoryUsage();
            phaseMetric.errorsFound = errorsFound;
            phaseMetric.warningsFound = warningsFound;
            phaseMetric.duplicatesPrevented = duplicatesPrevented;

            // Update overall metrics
            this.metrics.errorCount += errorsFound;
            this.metrics.warningCount += warningsFound;
            this.metrics.duplicatePreventionCount += duplicatesPrevented;
        }
    }

    /**
     * Record a cache hit for performance tracking
     */
    public recordCacheHit(): void {
        this.cacheHits++;
    }

    /**
     * Record a cache miss for performance tracking
     */
    public recordCacheMiss(): void {
        this.cacheMisses++;
    }

    /**
     * Finalize metrics collection for the current validation cycle
     */
    public finalizeMetrics(): ValidationMetrics {
        this.metrics.totalValidationTime = performance.now() - this.startTime;
        this.metrics.memoryUsage = this.getMemoryUsage();
        this.metrics.cacheHitRate = this.calculateCacheHitRate();
        
        return { ...this.metrics };
    }

    /**
     * Add a performance benchmark for the current validation
     */
    public addBenchmark(fileSize: number, ruleCount: number): void {
        const benchmark: PerformanceBenchmark = {
            fileSize,
            ruleCount,
            validationTime: this.metrics.totalValidationTime,
            memoryUsage: this.metrics.memoryUsage,
            timestamp: Date.now()
        };
        this.benchmarks.push(benchmark);
        
        // Keep only the last 100 benchmarks to prevent memory leaks
        if (this.benchmarks.length > 100) {
            this.benchmarks.shift();
        }
    }

    /**
     * Get detailed phase metrics for analysis
     */
    public getPhaseMetrics(): ValidationPhaseMetrics[] {
        return [...this.phaseMetrics];
    }

    /**
     * Get performance benchmarks for analysis
     */
    public getBenchmarks(): PerformanceBenchmark[] {
        return [...this.benchmarks];
    }

    /**
     * Get average validation time for similar file sizes
     */
    public getAverageValidationTime(fileSize: number, tolerance: number = 0.2): number {
        const similarBenchmarks = this.benchmarks.filter(b => 
            Math.abs(b.fileSize - fileSize) / fileSize <= tolerance
        );
        
        if (similarBenchmarks.length === 0) {
            return 0;
        }
        
        const totalTime = similarBenchmarks.reduce((sum, b) => sum + b.validationTime, 0);
        return totalTime / similarBenchmarks.length;
    }

    /**
     * Check if current validation is performing slower than expected
     */
    public isPerformanceDegraded(fileSize: number, ruleCount: number): boolean {
        const averageTime = this.getAverageValidationTime(fileSize);
        if (averageTime === 0) {
            return false; // No baseline to compare against
        }
        
        // Consider performance degraded if current time is 50% slower than average
        return this.metrics.totalValidationTime > averageTime * 1.5;
    }

    /**
     * Get memory usage in MB (approximation)
     */
    private getMemoryUsage(): number {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapUsed / 1024 / 1024;
        }
        return 0; // Fallback for environments without process.memoryUsage
    }

    /**
     * Calculate cache hit rate as a percentage
     */
    private calculateCacheHitRate(): number {
        const totalRequests = this.cacheHits + this.cacheMisses;
        if (totalRequests === 0) {
            return 0;
        }
        return (this.cacheHits / totalRequests) * 100;
    }

    /**
     * Generate a performance report for debugging
     */
    public generatePerformanceReport(): string {
        const report = [];
        report.push('=== VALIDATION PERFORMANCE REPORT ===');
        report.push(`Total Validation Time: ${this.metrics.totalValidationTime.toFixed(2)}ms`);
        report.push(`Memory Usage: ${this.metrics.memoryUsage.toFixed(2)}MB`);
        report.push(`Cache Hit Rate: ${this.metrics.cacheHitRate.toFixed(1)}%`);
        report.push(`Errors Found: ${this.metrics.errorCount}`);
        report.push(`Warnings Found: ${this.metrics.warningCount}`);
        report.push(`Duplicates Prevented: ${this.metrics.duplicatePreventionCount}`);
        report.push('');
        
        report.push('=== PHASE BREAKDOWN ===');
        for (const phase of this.phaseMetrics) {
            report.push(`${phase.phase.toUpperCase()}:`);
            report.push(`  Duration: ${phase.duration.toFixed(2)}ms`);
            report.push(`  Memory Delta: ${(phase.memoryAfter - phase.memoryBefore).toFixed(2)}MB`);
            report.push(`  Errors: ${phase.errorsFound}, Warnings: ${phase.warningsFound}`);
            report.push(`  Duplicates Prevented: ${phase.duplicatesPrevented}`);
            report.push('');
        }
        
        if (this.benchmarks.length > 0) {
            report.push('=== RECENT BENCHMARKS ===');
            const recentBenchmarks = this.benchmarks.slice(-5);
            for (const benchmark of recentBenchmarks) {
                report.push(`File Size: ${benchmark.fileSize} bytes, Rules: ${benchmark.ruleCount}`);
                report.push(`  Time: ${benchmark.validationTime.toFixed(2)}ms, Memory: ${benchmark.memoryUsage.toFixed(2)}MB`);
            }
        }
        
        return report.join('\n');
    }

    /**
     * Check if validation performance is within acceptable limits
     */
    public isPerformanceAcceptable(maxTimeMs: number = 1000, maxMemoryMB: number = 50): boolean {
        return this.metrics.totalValidationTime <= maxTimeMs && 
               this.metrics.memoryUsage <= maxMemoryMB;
    }

    /**
     * Get performance optimization suggestions
     */
    public getOptimizationSuggestions(): string[] {
        const suggestions: string[] = [];
        
        if (this.metrics.totalValidationTime > 500) {
            suggestions.push('Consider implementing validation caching for large files');
        }
        
        if (this.metrics.cacheHitRate < 50 && this.cacheHits + this.cacheMisses > 10) {
            suggestions.push('Cache hit rate is low - review caching strategy');
        }
        
        if (this.metrics.memoryUsage > 30) {
            suggestions.push('High memory usage detected - consider memory optimization');
        }
        
        if (this.metrics.duplicatePreventionCount > 10) {
            suggestions.push('High duplicate prevention count - validation coordination is working well');
        }
        
        const semanticPhase = this.phaseMetrics.find(p => p.phase === ValidationType.SEMANTIC);
        if (semanticPhase && semanticPhase.duration > 200) {
            suggestions.push('Semantic validation is slow - consider optimizing rule validation logic');
        }
        
        return suggestions;
    }
}