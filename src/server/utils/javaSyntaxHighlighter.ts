/**
 * Dedicated Java Syntax Highlighter for RHS (then clause) code
 * Provides comprehensive syntax highlighting for modern Java features
 */

export interface JavaHighlightResult {
    highlightedCode: string;
    tokens: JavaToken[];
    errors: JavaSyntaxError[];
}

export interface JavaToken {
    type: 'keyword' | 'literal' | 'primitive' | 'class' | 'method' | 'operator' | 'string' | 'number' | 'comment' | 'annotation' | 'lambda' | 'generic';
    value: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

export interface JavaSyntaxError {
    message: string;
    start: number;
    end: number;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
}

export class JavaSyntaxHighlighter {
    // Modern Java keywords (Java 8-21)
    private static readonly KEYWORDS = new Set([
        // Core keywords
        'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
        'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
        'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
        'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
        'package', 'private', 'protected', 'public', 'return', 'short', 'static',
        'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
        'transient', 'try', 'void', 'volatile', 'while',
        // Modern Java keywords
        'var', 'yield', 'record', 'sealed', 'permits', 'non-sealed'
    ]);

    private static readonly LITERALS = new Set(['null', 'true', 'false']);

    private static readonly PRIMITIVES = new Set([
        'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double', 'void'
    ]);

    // Comprehensive Java built-in classes
    private static readonly BUILTIN_CLASSES = new Set([
        // Core classes
        'String', 'Object', 'Class', 'System', 'Math', 'Objects', 'Arrays',
        'StringBuilder', 'StringBuffer', 'Throwable', 'Exception', 'RuntimeException', 'Error',
        
        // Wrapper classes
        'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character', 'Byte', 'Short',
        'BigDecimal', 'BigInteger', 'Number',
        
        // Collections Framework
        'Collection', 'List', 'Set', 'Map', 'Queue', 'Deque', 'SortedSet', 'SortedMap',
        'ArrayList', 'LinkedList', 'Vector', 'Stack',
        'HashSet', 'LinkedHashSet', 'TreeSet', 'EnumSet',
        'HashMap', 'LinkedHashMap', 'TreeMap', 'EnumMap', 'WeakHashMap', 'IdentityHashMap',
        'ArrayDeque', 'PriorityQueue', 'ConcurrentLinkedQueue',
        'Collections', 'Iterator', 'ListIterator', 'Enumeration', 'Spliterator',
        
        // Java 8+ Functional Programming
        'Optional', 'OptionalInt', 'OptionalLong', 'OptionalDouble',
        'Stream', 'IntStream', 'LongStream', 'DoubleStream',
        'Collectors', 'Collector',
        'Function', 'BiFunction', 'UnaryOperator', 'BinaryOperator',
        'Predicate', 'BiPredicate', 'Consumer', 'BiConsumer', 'Supplier',
        'Comparator', 'ToIntFunction', 'ToLongFunction', 'ToDoubleFunction',
        
        // Time API (Java 8+)
        'LocalDate', 'LocalTime', 'LocalDateTime', 'ZonedDateTime', 'OffsetDateTime',
        'Instant', 'Duration', 'Period', 'ZoneId', 'ZoneOffset', 'Clock',
        'DateTimeFormatter', 'TemporalAdjusters', 'ChronoUnit', 'Month', 'DayOfWeek',
        'Year', 'YearMonth', 'MonthDay', 'OffsetTime',
        
        // Concurrency
        'Thread', 'Runnable', 'Callable', 'Future', 'CompletableFuture', 'CompletionStage',
        'ExecutorService', 'Executors', 'ThreadPoolExecutor', 'ScheduledExecutorService',
        'ThreadLocal', 'InheritableThreadLocal',
        'AtomicBoolean', 'AtomicInteger', 'AtomicLong', 'AtomicReference',
        'CountDownLatch', 'CyclicBarrier', 'Semaphore', 'Phaser',
        'ReentrantLock', 'ReentrantReadWriteLock', 'StampedLock',
        'ConcurrentHashMap', 'ConcurrentLinkedQueue', 'ConcurrentSkipListMap',
        
        // I/O and NIO
        'File', 'Path', 'Paths', 'Files', 'FileSystem', 'FileSystems',
        'InputStream', 'OutputStream', 'Reader', 'Writer',
        'BufferedReader', 'BufferedWriter', 'FileReader', 'FileWriter',
        'FileInputStream', 'FileOutputStream', 'ByteArrayInputStream', 'ByteArrayOutputStream',
        'Scanner', 'PrintWriter', 'PrintStream', 'Console',
        'RandomAccessFile', 'FileChannel', 'ByteBuffer', 'CharBuffer',
        
        // Common Exceptions
        'IllegalArgumentException', 'IllegalStateException', 'NullPointerException',
        'IndexOutOfBoundsException', 'UnsupportedOperationException', 'ClassCastException',
        'NumberFormatException', 'ArithmeticException', 'SecurityException',
        'IOException', 'FileNotFoundException', 'EOFException',
        'InterruptedException', 'ExecutionException', 'TimeoutException',
        
        // Annotations
        'Override', 'Deprecated', 'SuppressWarnings', 'FunctionalInterface', 'SafeVarargs',
        'Retention', 'Target', 'Documented', 'Inherited', 'Repeatable', 'Native',
        
        // Reflection
        'Method', 'Field', 'Constructor', 'Parameter', 'Modifier', 'Annotation',
        'AnnotatedElement', 'Type', 'ParameterizedType', 'GenericArrayType',
        
        // Regular Expressions
        'Pattern', 'Matcher', 'MatchResult',
        
        // Networking
        'URL', 'URI', 'Socket', 'ServerSocket', 'DatagramSocket',
        'HttpURLConnection', 'URLConnection', 'InetAddress',
        
        // Serialization
        'Serializable', 'Externalizable', 'ObjectInputStream', 'ObjectOutputStream',
        
        // Utilities
        'Random', 'UUID', 'Base64', 'Properties', 'ResourceBundle',
        'Locale', 'Currency', 'TimeZone', 'Calendar', 'Date',
        
        // Text Processing
        'Charset', 'CharsetEncoder', 'CharsetDecoder',
        'Collator', 'RuleBasedCollator', 'MessageFormat', 'DecimalFormat'
    ]);

    // Stream and functional programming methods
    private static readonly STREAM_METHODS = new Set([
        'stream', // Add the stream method itself
        'filter', 'map', 'mapToInt', 'mapToLong', 'mapToDouble', 'mapToObj',
        'flatMap', 'flatMapToInt', 'flatMapToLong', 'flatMapToDouble',
        'distinct', 'sorted', 'peek', 'limit', 'skip', 'takeWhile', 'dropWhile',
        'forEach', 'forEachOrdered', 'toArray', 'reduce', 'collect',
        'min', 'max', 'count', 'sum', 'average',
        'anyMatch', 'allMatch', 'noneMatch', 'findFirst', 'findAny',
        'parallel', 'sequential', 'unordered', 'onClose'
    ]);

    /**
     * Highlight Java code with comprehensive syntax support
     */
    public static highlight(code: string): JavaHighlightResult {
        const tokens: JavaToken[] = [];
        const errors: JavaSyntaxError[] = [];
        let highlightedCode = code;

        try {
            // Tokenize the code
            const tokenizedResult = this.tokenize(code);
            tokens.push(...tokenizedResult.tokens);
            errors.push(...tokenizedResult.errors);

            // Apply highlighting based on tokens
            highlightedCode = this.applyHighlighting(code, tokens);

        } catch (error) {
            errors.push({
                message: `Syntax highlighting error: ${error}`,
                start: 0,
                end: code.length,
                line: 0,
                column: 0,
                severity: 'error'
            });
        }

        return {
            highlightedCode,
            tokens,
            errors
        };
    }

    /**
     * Tokenize Java code
     */
    private static tokenize(code: string): { tokens: JavaToken[]; errors: JavaSyntaxError[] } {
        const tokens: JavaToken[] = [];
        const errors: JavaSyntaxError[] = [];
        const lines = code.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let columnIndex = 0;

            while (columnIndex < line.length) {
                const char = line[columnIndex];

                // Skip whitespace
                if (/\s/.test(char)) {
                    columnIndex++;
                    continue;
                }

                // Comments
                if (char === '/' && columnIndex + 1 < line.length) {
                    if (line[columnIndex + 1] === '/') {
                        // Single-line comment
                        tokens.push({
                            type: 'comment',
                            value: line.substring(columnIndex),
                            start: columnIndex,
                            end: line.length,
                            line: lineIndex,
                            column: columnIndex
                        });
                        break;
                    } else if (line[columnIndex + 1] === '*') {
                        // Multi-line comment (simplified - assumes it ends on same line)
                        const endIndex = line.indexOf('*/', columnIndex + 2);
                        if (endIndex !== -1) {
                            tokens.push({
                                type: 'comment',
                                value: line.substring(columnIndex, endIndex + 2),
                                start: columnIndex,
                                end: endIndex + 2,
                                line: lineIndex,
                                column: columnIndex
                            });
                            columnIndex = endIndex + 2;
                            continue;
                        }
                    }
                }

                // String literals
                if (char === '"' || char === "'") {
                    const result = this.parseStringLiteral(line, columnIndex, char);
                    if (result) {
                        tokens.push({
                            type: 'string',
                            value: result.value,
                            start: columnIndex,
                            end: result.endIndex,
                            line: lineIndex,
                            column: columnIndex
                        });
                        columnIndex = result.endIndex;
                        continue;
                    }
                }

                // Numbers
                if (/\d/.test(char)) {
                    const result = this.parseNumber(line, columnIndex);
                    if (result) {
                        tokens.push({
                            type: 'number',
                            value: result.value,
                            start: columnIndex,
                            end: result.endIndex,
                            line: lineIndex,
                            column: columnIndex
                        });
                        columnIndex = result.endIndex;
                        continue;
                    }
                }

                // Identifiers and keywords
                if (/[a-zA-Z_$]/.test(char)) {
                    const result = this.parseIdentifier(line, columnIndex);
                    if (result) {
                        const tokenType = this.getIdentifierType(result.value);
                        tokens.push({
                            type: tokenType,
                            value: result.value,
                            start: columnIndex,
                            end: result.endIndex,
                            line: lineIndex,
                            column: columnIndex
                        });
                        columnIndex = result.endIndex;
                        continue;
                    }
                }

                // Operators and punctuation
                const operatorResult = this.parseOperator(line, columnIndex);
                if (operatorResult) {
                    tokens.push({
                        type: 'operator',
                        value: operatorResult.value,
                        start: columnIndex,
                        end: operatorResult.endIndex,
                        line: lineIndex,
                        column: columnIndex
                    });
                    columnIndex = operatorResult.endIndex;
                    continue;
                }

                // If we get here, we have an unrecognized character
                columnIndex++;
            }
        }

        return { tokens, errors };
    }

    /**
     * Parse string literal
     */
    private static parseStringLiteral(line: string, startIndex: number, quote: string): { value: string; endIndex: number } | null {
        let index = startIndex + 1;
        let value = quote;

        while (index < line.length) {
            const char = line[index];
            value += char;

            if (char === quote) {
                return { value, endIndex: index + 1 };
            }

            if (char === '\\' && index + 1 < line.length) {
                // Escape sequence
                index++;
                value += line[index];
            }

            index++;
        }

        // Unterminated string
        return { value, endIndex: index };
    }

    /**
     * Parse number literal
     */
    private static parseNumber(line: string, startIndex: number): { value: string; endIndex: number } | null {
        let index = startIndex;
        let value = '';

        // Handle different number formats
        if (line[index] === '0' && index + 1 < line.length) {
            const nextChar = line[index + 1].toLowerCase();
            if (nextChar === 'x') {
                // Hexadecimal
                index += 2;
                value = '0x';
                while (index < line.length && /[0-9a-fA-F]/.test(line[index])) {
                    value += line[index];
                    index++;
                }
            } else if (nextChar === 'b') {
                // Binary
                index += 2;
                value = '0b';
                while (index < line.length && /[01]/.test(line[index])) {
                    value += line[index];
                    index++;
                }
            }
        }

        if (value === '') {
            // Decimal number
            while (index < line.length && (/\d/.test(line[index]) || line[index] === '_')) {
                value += line[index];
                index++;
            }

            // Decimal point
            if (index < line.length && line[index] === '.') {
                value += line[index];
                index++;
                while (index < line.length && (/\d/.test(line[index]) || line[index] === '_')) {
                    value += line[index];
                    index++;
                }
            }

            // Exponent
            if (index < line.length && /[eE]/.test(line[index])) {
                value += line[index];
                index++;
                if (index < line.length && /[+-]/.test(line[index])) {
                    value += line[index];
                    index++;
                }
                while (index < line.length && /\d/.test(line[index])) {
                    value += line[index];
                    index++;
                }
            }
        }

        // Suffix
        if (index < line.length && /[fFdDlL]/.test(line[index])) {
            value += line[index];
            index++;
        }

        return value ? { value, endIndex: index } : null;
    }

    /**
     * Parse identifier
     */
    private static parseIdentifier(line: string, startIndex: number): { value: string; endIndex: number } | null {
        let index = startIndex;
        let value = '';

        while (index < line.length && /[a-zA-Z0-9_$]/.test(line[index])) {
            value += line[index];
            index++;
        }

        return value ? { value, endIndex: index } : null;
    }

    /**
     * Parse operator
     */
    private static parseOperator(line: string, startIndex: number): { value: string; endIndex: number } | null {
        const twoCharOps = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '->', '::', '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='];
        const oneCharOps = ['+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':', ';', ',', '.', '(', ')', '[', ']', '{', '}'];

        // Check two-character operators first
        if (startIndex + 1 < line.length) {
            const twoChar = line.substring(startIndex, startIndex + 2);
            if (twoCharOps.includes(twoChar)) {
                return { value: twoChar, endIndex: startIndex + 2 };
            }
        }

        // Check one-character operators
        const oneChar = line[startIndex];
        if (oneCharOps.includes(oneChar)) {
            return { value: oneChar, endIndex: startIndex + 1 };
        }

        return null;
    }

    /**
     * Determine the type of an identifier
     */
    private static getIdentifierType(identifier: string): JavaToken['type'] {
        if (this.KEYWORDS.has(identifier)) {
            return 'keyword';
        }
        if (this.LITERALS.has(identifier)) {
            return 'literal';
        }
        if (this.PRIMITIVES.has(identifier)) {
            return 'primitive';
        }
        if (this.BUILTIN_CLASSES.has(identifier)) {
            return 'class';
        }
        if (identifier.startsWith('@')) {
            return 'annotation';
        }
        
        // Check if it's a method call (followed by parentheses in context)
        // This would require more context analysis
        
        return 'method'; // Default for identifiers
    }

    /**
     * Apply highlighting to code based on tokens
     */
    private static applyHighlighting(code: string, tokens: JavaToken[]): string {
        // Use simple regex-based highlighting instead of token-based to avoid overlaps
        return this.applySimpleHighlighting(code);
    }

    /**
     * Apply simple regex-based highlighting
     */
    private static applySimpleHighlighting(code: string): string {
        let highlighted = code;

        // First, protect strings and comments from being processed
        const protectedStrings: string[] = [];
        const protectedComments: string[] = [];
        
        // Extract and protect strings
        highlighted = highlighted.replace(/"([^"\\]|\\.)*"/g, (match) => {
            const index = protectedStrings.length;
            protectedStrings.push(`\`${match}\``);
            return `__STRING_${index}__`;
        });
        
        highlighted = highlighted.replace(/'([^'\\]|\\.)*'/g, (match) => {
            const index = protectedStrings.length;
            protectedStrings.push(`\`${match}\``);
            return `__STRING_${index}__`;
        });

        // Extract and protect comments
        highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
            const index = protectedComments.length;
            protectedComments.push(`*${match}*`);
            return `__COMMENT_${index}__`;
        });
        
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
            const index = protectedComments.length;
            protectedComments.push(`*${match}*`);
            return `__COMMENT_${index}__`;
        });

        // Highlight numbers
        highlighted = highlighted.replace(/\b\d+(\.\d+)?([eE][+-]?\d+)?[fFdDlL]?\b/g, '`$&`');
        highlighted = highlighted.replace(/\b0[xX][0-9a-fA-F]+[lL]?\b/g, '`$&`');
        highlighted = highlighted.replace(/\b0[bB][01]+[lL]?\b/g, '`$&`');

        // Highlight operators (order matters - longer operators first)
        highlighted = highlighted.replace(/\+=/g, '**+=**');
        highlighted = highlighted.replace(/-=/g, '**-=**');
        highlighted = highlighted.replace(/\*=/g, '***=**');
        highlighted = highlighted.replace(/\/=/g, '**/=**');
        highlighted = highlighted.replace(/<=/g, '**<=**');
        highlighted = highlighted.replace(/>=/g, '**>=**');
        highlighted = highlighted.replace(/==/g, '**==**');
        highlighted = highlighted.replace(/!=/g, '**!=**');
        highlighted = highlighted.replace(/->/g, '**->**');
        highlighted = highlighted.replace(/::/g, '**::**');
        highlighted = highlighted.replace(/&&/g, '**&&**');
        highlighted = highlighted.replace(/\|\|/g, '**||**');

        // Highlight keywords
        for (const keyword of this.KEYWORDS) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `**${keyword}**`);
        }

        // Highlight literals
        for (const literal of this.LITERALS) {
            const regex = new RegExp(`\\b${literal}\\b`, 'g');
            highlighted = highlighted.replace(regex, `***${literal}***`);
        }

        // Highlight primitives
        for (const primitive of this.PRIMITIVES) {
            const regex = new RegExp(`\\b${primitive}\\b`, 'g');
            highlighted = highlighted.replace(regex, `**${primitive}**`);
        }

        // Highlight built-in classes
        for (const className of this.BUILTIN_CLASSES) {
            const regex = new RegExp(`\\b${className}\\b`, 'g');
            highlighted = highlighted.replace(regex, `*${className}*`);
        }

        // Highlight stream methods
        for (const method of this.STREAM_METHODS) {
            const regex = new RegExp(`\\b${method}\\b`, 'g');
            highlighted = highlighted.replace(regex, `*${method}*`);
        }

        // Restore protected strings
        protectedStrings.forEach((str, index) => {
            highlighted = highlighted.replace(`__STRING_${index}__`, str);
        });

        // Restore protected comments
        protectedComments.forEach((comment, index) => {
            highlighted = highlighted.replace(`__COMMENT_${index}__`, comment);
        });

        return highlighted;
    }

    /**
     * Highlight Java code for markdown display
     */
    public static highlightForMarkdown(code: string): string {
        const result = this.highlight(code);
        return result.highlightedCode;
    }

    /**
     * Get syntax errors from Java code
     */
    public static getSyntaxErrors(code: string): JavaSyntaxError[] {
        const result = this.highlight(code);
        return result.errors;
    }

    /**
     * Check if code contains modern Java features
     */
    public static hasModernJavaFeatures(code: string): boolean {
        const modernFeatures = [
            'var ', 'Optional', 'Stream', 'LocalDate', 'LocalTime', 'LocalDateTime',
            '->', '::', 'record ', 'sealed ', 'permits ', 'yield '
        ];
        
        return modernFeatures.some(feature => code.includes(feature));
    }

    /**
     * Extract lambda expressions from code
     */
    public static extractLambdaExpressions(code: string): string[] {
        const matches: string[] = [];
        const lambdaStartRegex = /(\w+|\([^)]*\))\s*->/g;
        let match;
        
        while ((match = lambdaStartRegex.exec(code)) !== null) {
            const startIndex = match.index;
            const arrowIndex = match.index + match[0].length;
            
            // Extract the lambda body using proper bracket/parentheses balancing
            const lambdaBody = this.extractLambdaBody(code, arrowIndex);
            if (lambdaBody) {
                const fullLambda = match[0] + lambdaBody;
                matches.push(fullLambda);
            }
        }
        
        return matches;
    }

    /**
     * Extract lambda body with proper bracket and parentheses balancing
     */
    private static extractLambdaBody(code: string, startIndex: number): string {
        let i = startIndex;
        let body = '';
        let parenCount = 0;
        let braceCount = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;
        
        // Skip initial whitespace but preserve at least one space after ->
        let hasSpace = false;
        while (i < code.length && /\s/.test(code[i])) {
            if (!hasSpace) {
                body += code[i];
                hasSpace = true;
            }
            i++;
        }
        
        // Determine if this is a block lambda or expression lambda
        const isBlockLambda = i < code.length && code[i] === '{';
        
        while (i < code.length) {
            const char = code[i];
            
            // Handle string literals
            if (!escaped && (char === '"' || char === "'")) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            }
            
            // Handle escape sequences
            escaped = !escaped && char === '\\' && inString;
            
            if (!inString) {
                // Track parentheses and braces
                if (char === '(') parenCount++;
                else if (char === ')') {
                    parenCount--;
                    // If we're in an expression lambda and parentheses are balanced,
                    // this closing paren likely ends the lambda
                    if (!isBlockLambda && parenCount < 0) {
                        break; // End of expression lambda
                    }
                }
                else if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                
                // For block lambdas, continue until braces are balanced
                if (isBlockLambda) {
                    body += char;
                    i++;
                    if (braceCount === 0 && body.includes('{')) {
                        break; // Complete block lambda
                    }
                } else {
                    // For expression lambdas, stop at certain delimiters when balanced
                    if (parenCount < 0 || (parenCount === 0 && braceCount === 0)) {
                        if (char === ';' || char === ',' || (char === ')' && parenCount < 0)) {
                            break; // End of expression lambda
                        }
                        // Also stop at newline if not in the middle of a method call
                        if (char === '\n') {
                            // Look back to see if the previous non-whitespace was a continuation operator
                            let k = i - 1;
                            while (k >= 0 && /\s/.test(code[k])) k--;
                            const prevChar = k >= 0 ? code[k] : '';
                            
                            // If previous character suggests continuation, keep going
                            if (!/[&|+\-*/%<>=!,]/.test(prevChar)) {
                                // Look ahead to see if next non-whitespace is a continuation
                                let j = i + 1;
                                while (j < code.length && /\s/.test(code[j]) && code[j] !== '\n') j++;
                                if (j >= code.length || code[j] === '\n' || !/[.&|]/.test(code[j])) {
                                    break; // End of expression
                                }
                            }
                        }
                    }
                    
                    if (parenCount >= 0) { // Only add char if we haven't hit the closing paren
                        body += char;
                    }
                    i++;
                }
            } else {
                body += char;
                i++;
            }
        }
        
        return body;
    }

    /**
     * Extract method references from code
     */
    public static extractMethodReferences(code: string): string[] {
        const methodRefRegex = /[\w.]+::\w+/g;
        const matches = code.match(methodRefRegex);
        return matches || [];
    }
}