/**
 * Java completion provider for RHS (then clause) auto-completion
 * Provides comprehensive Java API completion including collections, streams, etc.
 */

import {
    CompletionItem,
    CompletionItemKind,
    Position,
    InsertTextFormat,
    MarkupKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface JavaCompletionContext {
    isInThenClause: boolean;
    currentWord: string;
    beforeCursor: string;
    afterCursor: string;
    line: string;
    position: Position;
}

export class JavaCompletionProvider {
    private static readonly JAVA_KEYWORDS = [
        'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
        'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
        'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
        'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
        'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
        'volatile', 'while', 'var', 'yield', 'record', 'sealed', 'permits'
    ];

    private static readonly JAVA_PRIMITIVES = [
        'boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short'
    ];

    /**
     * Provide Java completions for RHS context
     */
    public static provideJavaCompletions(
        document: TextDocument,
        position: Position,
        context: JavaCompletionContext
    ): CompletionItem[] {
        if (!context.isInThenClause) {
            return [];
        }

        const completions: CompletionItem[] = [];

        // Add different types of completions based on context
        completions.push(...this.getJavaKeywordCompletions(context));
        completions.push(...this.getJavaClassCompletions(context));
        completions.push(...this.getCollectionCompletions(context));
        completions.push(...this.getStreamCompletions(context));
        completions.push(...this.getTimeApiCompletions(context));
        completions.push(...this.getUtilityCompletions(context));
        completions.push(...this.getMethodCompletions(context));

        return completions;
    }

    /**
     * Get Java keyword completions
     */
    private static getJavaKeywordCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Add Java keywords
        this.JAVA_KEYWORDS.forEach(keyword => {
            if (keyword.startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: keyword,
                    kind: CompletionItemKind.Keyword,
                    detail: `Java keyword`,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `Java language keyword: \`${keyword}\``
                    },
                    insertText: keyword,
                    sortText: `1_${keyword}`
                });
            }
        });

        // Add primitives
        this.JAVA_PRIMITIVES.forEach(primitive => {
            if (primitive.startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: primitive,
                    kind: CompletionItemKind.TypeParameter,
                    detail: `Java primitive type`,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `Java primitive data type: \`${primitive}\``
                    },
                    insertText: primitive,
                    sortText: `1_${primitive}`
                });
            }
        });

        return completions;
    }

    /**
     * Get Java class completions
     */
    private static getJavaClassCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        const javaClasses = [
            // Core classes
            { name: 'String', detail: 'Immutable character sequence', methods: ['length', 'charAt', 'substring', 'indexOf', 'replace', 'split', 'trim', 'toLowerCase', 'toUpperCase'] },
            { name: 'Object', detail: 'Root class of all Java classes', methods: ['toString', 'equals', 'hashCode', 'getClass'] },
            { name: 'System', detail: 'System utilities and resources', methods: ['out', 'err', 'in', 'currentTimeMillis', 'nanoTime'] },
            { name: 'Math', detail: 'Mathematical functions', methods: ['abs', 'max', 'min', 'sqrt', 'pow', 'random', 'round', 'ceil', 'floor'] },
            
            // Wrapper classes
            { name: 'Integer', detail: 'Integer wrapper class', methods: ['valueOf', 'parseInt', 'toString', 'intValue'] },
            { name: 'Long', detail: 'Long wrapper class', methods: ['valueOf', 'parseLong', 'toString', 'longValue'] },
            { name: 'Double', detail: 'Double wrapper class', methods: ['valueOf', 'parseDouble', 'toString', 'doubleValue'] },
            { name: 'Boolean', detail: 'Boolean wrapper class', methods: ['valueOf', 'parseBoolean', 'toString', 'booleanValue'] },
            
            // Utility classes
            { name: 'Objects', detail: 'Object utility methods', methods: ['equals', 'hash', 'toString', 'requireNonNull', 'isNull', 'nonNull'] },
            { name: 'Arrays', detail: 'Array utility methods', methods: ['sort', 'binarySearch', 'fill', 'copyOf', 'toString', 'asList'] },
            { name: 'Collections', detail: 'Collection utility methods', methods: ['sort', 'reverse', 'shuffle', 'min', 'max', 'emptyList', 'singletonList'] },
            
            // StringBuilder
            { name: 'StringBuilder', detail: 'Mutable character sequence', methods: ['append', 'insert', 'delete', 'toString', 'length', 'setLength'] },
            
            // BigDecimal for precision
            { name: 'BigDecimal', detail: 'Arbitrary precision decimal', methods: ['add', 'subtract', 'multiply', 'divide', 'compareTo', 'toString'] }
        ];

        javaClasses.forEach(javaClass => {
            if (javaClass.name.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: javaClass.name,
                    kind: CompletionItemKind.Class,
                    detail: javaClass.detail,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${javaClass.name}**: ${javaClass.detail}\n\nCommon methods: ${javaClass.methods.map(m => `\`${m}()\``).join(', ')}`
                    },
                    insertText: javaClass.name,
                    sortText: `2_${javaClass.name}`
                });
            }
        });

        return completions;
    }

    /**
     * Get Collection framework completions
     */
    private static getCollectionCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        const collections = [
            // Interfaces
            { name: 'List', detail: 'Ordered collection interface', snippet: 'List<${1:Type}> ${2:list} = new ArrayList<>();', methods: ['add', 'get', 'set', 'remove', 'size', 'isEmpty', 'contains', 'indexOf'] },
            { name: 'Set', detail: 'No duplicates collection interface', snippet: 'Set<${1:Type}> ${2:set} = new HashSet<>();', methods: ['add', 'remove', 'contains', 'size', 'isEmpty'] },
            { name: 'Map', detail: 'Key-value pairs interface', snippet: 'Map<${1:KeyType}, ${2:ValueType}> ${3:map} = new HashMap<>();', methods: ['put', 'get', 'remove', 'containsKey', 'containsValue', 'keySet', 'values'] },
            
            // Implementations
            { name: 'ArrayList', detail: 'Resizable array implementation', snippet: 'ArrayList<${1:Type}> ${2:list} = new ArrayList<>();', methods: ['add', 'get', 'set', 'remove', 'size', 'isEmpty'] },
            { name: 'LinkedList', detail: 'Doubly-linked list implementation', snippet: 'LinkedList<${1:Type}> ${2:list} = new LinkedList<>();', methods: ['add', 'addFirst', 'addLast', 'removeFirst', 'removeLast'] },
            { name: 'HashSet', detail: 'Hash table set implementation', snippet: 'HashSet<${1:Type}> ${2:set} = new HashSet<>();', methods: ['add', 'remove', 'contains', 'size'] },
            { name: 'TreeSet', detail: 'Sorted set implementation', snippet: 'TreeSet<${1:Type}> ${2:set} = new TreeSet<>();', methods: ['add', 'remove', 'first', 'last', 'higher', 'lower'] },
            { name: 'HashMap', detail: 'Hash table map implementation', snippet: 'HashMap<${1:KeyType}, ${2:ValueType}> ${3:map} = new HashMap<>();', methods: ['put', 'get', 'remove', 'containsKey'] },
            { name: 'TreeMap', detail: 'Sorted map implementation', snippet: 'TreeMap<${1:KeyType}, ${2:ValueType}> ${3:map} = new TreeMap<>();', methods: ['put', 'get', 'firstKey', 'lastKey'] }
        ];

        collections.forEach(collection => {
            if (collection.name.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: collection.name,
                    kind: collection.name.endsWith('List') || collection.name.endsWith('Set') || collection.name.endsWith('Map') ? 
                          CompletionItemKind.Class : CompletionItemKind.Interface,
                    detail: collection.detail,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${collection.name}**: ${collection.detail}\n\nCommon methods: ${collection.methods.map(m => `\`${m}()\``).join(', ')}\n\n**Usage:**\n\`\`\`java\n${collection.snippet}\n\`\`\``
                    },
                    insertText: collection.snippet,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `2_${collection.name}`
                });
            }
        });

        return completions;
    }

    /**
     * Get Stream API completions
     */
    private static getStreamCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Check if we're in a stream context
        const isStreamContext = context.beforeCursor.includes('.stream()') || 
                               context.beforeCursor.includes('Stream.');

        const streamOperations = [
            { name: 'filter', detail: 'Filter elements', snippet: 'filter(${1:element} -> ${2:condition})', type: 'intermediate' },
            { name: 'map', detail: 'Transform elements', snippet: 'map(${1:element} -> ${2:transformation})', type: 'intermediate' },
            { name: 'flatMap', detail: 'Flatten nested streams', snippet: 'flatMap(${1:element} -> ${2:stream})', type: 'intermediate' },
            { name: 'distinct', detail: 'Remove duplicates', snippet: 'distinct()', type: 'intermediate' },
            { name: 'sorted', detail: 'Sort elements', snippet: 'sorted()', type: 'intermediate' },
            { name: 'peek', detail: 'Perform action without consuming', snippet: 'peek(${1:element} -> ${2:action})', type: 'intermediate' },
            { name: 'limit', detail: 'Limit number of elements', snippet: 'limit(${1:maxSize})', type: 'intermediate' },
            { name: 'skip', detail: 'Skip first n elements', snippet: 'skip(${1:n})', type: 'intermediate' },
            
            // Terminal operations
            { name: 'collect', detail: 'Collect to collection', snippet: 'collect(Collectors.${1|toList,toSet,toMap|}())', type: 'terminal' },
            { name: 'forEach', detail: 'Perform action on each element', snippet: 'forEach(${1:element} -> ${2:action})', type: 'terminal' },
            { name: 'reduce', detail: 'Reduce to single value', snippet: 'reduce(${1:identity}, (${2:a}, ${3:b}) -> ${4:operation})', type: 'terminal' },
            { name: 'findFirst', detail: 'Find first element', snippet: 'findFirst()', type: 'terminal' },
            { name: 'findAny', detail: 'Find any element', snippet: 'findAny()', type: 'terminal' },
            { name: 'anyMatch', detail: 'Check if any element matches', snippet: 'anyMatch(${1:element} -> ${2:condition})', type: 'terminal' },
            { name: 'allMatch', detail: 'Check if all elements match', snippet: 'allMatch(${1:element} -> ${2:condition})', type: 'terminal' },
            { name: 'noneMatch', detail: 'Check if no elements match', snippet: 'noneMatch(${1:element} -> ${2:condition})', type: 'terminal' },
            { name: 'count', detail: 'Count elements', snippet: 'count()', type: 'terminal' },
            { name: 'min', detail: 'Find minimum element', snippet: 'min(${1:comparator})', type: 'terminal' },
            { name: 'max', detail: 'Find maximum element', snippet: 'max(${1:comparator})', type: 'terminal' }
        ];

        // Add Stream class itself
        if ('Stream'.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
            completions.push({
                label: 'Stream',
                kind: CompletionItemKind.Interface,
                detail: 'Stream of elements for functional operations',
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `**Stream**: Sequence of elements supporting sequential and parallel aggregate operations.\n\n**Common operations**: filter, map, collect, forEach, reduce`
                },
                insertText: 'Stream',
                sortText: `2_Stream`
            });
        }

        // Add stream operations if in stream context
        if (isStreamContext) {
            streamOperations.forEach(operation => {
                if (operation.name.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
                    completions.push({
                        label: operation.name,
                        kind: CompletionItemKind.Method,
                        detail: `${operation.detail} (${operation.type})`,
                        documentation: {
                            kind: MarkupKind.Markdown,
                            value: `**${operation.name}**: ${operation.detail}\n\nType: ${operation.type} operation\n\n**Usage:**\n\`\`\`java\n.${operation.snippet}\n\`\`\``
                        },
                        insertText: operation.snippet,
                        insertTextFormat: InsertTextFormat.Snippet,
                        sortText: `1_${operation.name}`
                    });
                }
            });
        }

        return completions;
    }    /**

     * Get Time API completions
     */
    private static getTimeApiCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        const timeClasses = [
            { 
                name: 'LocalDate', 
                detail: 'Date without time zone (Java 8+)', 
                snippet: 'LocalDate ${1:date} = LocalDate.${2|now,of,parse|}(${3});',
                methods: ['now', 'of', 'parse', 'plusDays', 'minusDays', 'plusMonths', 'minusMonths', 'plusYears', 'minusYears', 'format', 'isAfter', 'isBefore']
            },
            { 
                name: 'LocalTime', 
                detail: 'Time without date or time zone (Java 8+)', 
                snippet: 'LocalTime ${1:time} = LocalTime.${2|now,of,parse|}(${3});',
                methods: ['now', 'of', 'parse', 'plusHours', 'minusHours', 'plusMinutes', 'minusMinutes', 'format', 'isAfter', 'isBefore']
            },
            { 
                name: 'LocalDateTime', 
                detail: 'Date and time without time zone (Java 8+)', 
                snippet: 'LocalDateTime ${1:dateTime} = LocalDateTime.${2|now,of,parse|}(${3});',
                methods: ['now', 'of', 'parse', 'plusDays', 'minusDays', 'plusHours', 'minusHours', 'format', 'toLocalDate', 'toLocalTime']
            },
            { 
                name: 'ZonedDateTime', 
                detail: 'Date and time with time zone (Java 8+)', 
                snippet: 'ZonedDateTime ${1:zdt} = ZonedDateTime.${2|now,of,parse|}(${3});',
                methods: ['now', 'of', 'parse', 'withZoneSameInstant', 'format', 'toLocalDateTime', 'getZone']
            },
            { 
                name: 'Instant', 
                detail: 'Point in time (Java 8+)', 
                snippet: 'Instant ${1:instant} = Instant.${2|now,ofEpochMilli,parse|}(${3});',
                methods: ['now', 'ofEpochMilli', 'ofEpochSecond', 'parse', 'plusSeconds', 'minusSeconds', 'toEpochMilli']
            },
            { 
                name: 'Duration', 
                detail: 'Time-based amount of time (Java 8+)', 
                snippet: 'Duration ${1:duration} = Duration.${2|ofHours,ofMinutes,ofSeconds,between|}(${3});',
                methods: ['ofHours', 'ofMinutes', 'ofSeconds', 'ofMillis', 'between', 'plus', 'minus', 'toHours', 'toMinutes']
            },
            { 
                name: 'Period', 
                detail: 'Date-based amount of time (Java 8+)', 
                snippet: 'Period ${1:period} = Period.${2|ofDays,ofMonths,ofYears,between|}(${3});',
                methods: ['ofDays', 'ofMonths', 'ofYears', 'between', 'plus', 'minus', 'getDays', 'getMonths', 'getYears']
            },
            { 
                name: 'DateTimeFormatter', 
                detail: 'Formatter for date-time objects (Java 8+)', 
                snippet: 'DateTimeFormatter ${1:formatter} = DateTimeFormatter.${2|ofPattern,ISO_LOCAL_DATE,ISO_LOCAL_TIME|}(${3});',
                methods: ['ofPattern', 'format', 'parse', 'ISO_LOCAL_DATE', 'ISO_LOCAL_TIME', 'ISO_LOCAL_DATE_TIME']
            }
        ];

        timeClasses.forEach(timeClass => {
            if (timeClass.name.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: timeClass.name,
                    kind: CompletionItemKind.Class,
                    detail: timeClass.detail,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${timeClass.name}**: ${timeClass.detail}\n\nCommon methods: ${timeClass.methods.map(m => `\`${m}()\``).join(', ')}\n\n**Usage:**\n\`\`\`java\n${timeClass.snippet}\n\`\`\``
                    },
                    insertText: timeClass.snippet,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `2_${timeClass.name}`
                });
            }
        });

        return completions;
    }

    /**
     * Get utility completions (Optional, etc.)
     */
    private static getUtilityCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        const utilities = [
            {
                name: 'Optional',
                detail: 'Container for nullable values (Java 8+)',
                snippet: 'Optional<${1:Type}> ${2:optional} = Optional.${3|ofNullable,of,empty|}(${4});',
                methods: ['of', 'ofNullable', 'empty', 'isPresent', 'isEmpty', 'get', 'orElse', 'orElseGet', 'orElseThrow', 'map', 'flatMap', 'filter']
            },
            {
                name: 'Collectors',
                detail: 'Utility class for stream collectors (Java 8+)',
                snippet: 'Collectors.${1|toList,toSet,toMap,groupingBy,joining|}(${2})',
                methods: ['toList', 'toSet', 'toMap', 'groupingBy', 'partitioningBy', 'joining', 'counting', 'summingInt', 'averagingDouble']
            },
            {
                name: 'Comparator',
                detail: 'Comparison function interface (Java 8+)',
                snippet: 'Comparator.${1|comparing,naturalOrder,reverseOrder|}(${2})',
                methods: ['comparing', 'comparingInt', 'comparingLong', 'comparingDouble', 'naturalOrder', 'reverseOrder', 'nullsFirst', 'nullsLast']
            }
        ];

        utilities.forEach(utility => {
            if (utility.name.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: utility.name,
                    kind: CompletionItemKind.Class,
                    detail: utility.detail,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${utility.name}**: ${utility.detail}\n\nCommon methods: ${utility.methods.map(m => `\`${m}()\``).join(', ')}\n\n**Usage:**\n\`\`\`java\n${utility.snippet}\n\`\`\``
                    },
                    insertText: utility.snippet,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `2_${utility.name}`
                });
            }
        });

        return completions;
    }

    /**
     * Get method completions based on context
     */
    private static getMethodCompletions(context: JavaCompletionContext): CompletionItem[] {
        const completions: CompletionItem[] = [];

        // Detect method call context (e.g., "list." or "string.")
        const methodCallMatch = context.beforeCursor.match(/(\w+)\.$/);
        if (!methodCallMatch) {
            return completions;
        }

        const objectName = methodCallMatch[1].toLowerCase();
        
        // Common method completions based on object type patterns
        const methodCompletions = this.getMethodsForType(objectName);
        
        methodCompletions.forEach(method => {
            if (method.name.toLowerCase().startsWith(context.currentWord.toLowerCase())) {
                completions.push({
                    label: method.name,
                    kind: CompletionItemKind.Method,
                    detail: method.detail,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${method.name}**: ${method.detail}\n\n**Usage:**\n\`\`\`java\n${method.snippet}\n\`\`\``
                    },
                    insertText: method.snippet,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: `1_${method.name}`
                });
            }
        });

        return completions;
    }

    /**
     * Get methods for specific type patterns
     */
    private static getMethodsForType(typeName: string): Array<{name: string, detail: string, snippet: string}> {
        const methods: Array<{name: string, detail: string, snippet: string}> = [];

        // String methods
        if (typeName.includes('string') || typeName.includes('str')) {
            methods.push(
                { name: 'length', detail: 'Returns string length', snippet: 'length()' },
                { name: 'charAt', detail: 'Returns character at index', snippet: 'charAt(${1:index})' },
                { name: 'substring', detail: 'Returns substring', snippet: 'substring(${1:beginIndex}${2:, ${3:endIndex}})' },
                { name: 'indexOf', detail: 'Returns index of substring', snippet: 'indexOf(${1:str})' },
                { name: 'replace', detail: 'Replace characters', snippet: 'replace(${1:oldChar}, ${2:newChar})' },
                { name: 'split', detail: 'Split string by delimiter', snippet: 'split(${1:regex})' },
                { name: 'trim', detail: 'Remove leading/trailing whitespace', snippet: 'trim()' },
                { name: 'toLowerCase', detail: 'Convert to lowercase', snippet: 'toLowerCase()' },
                { name: 'toUpperCase', detail: 'Convert to uppercase', snippet: 'toUpperCase()' },
                { name: 'startsWith', detail: 'Check if starts with prefix', snippet: 'startsWith(${1:prefix})' },
                { name: 'endsWith', detail: 'Check if ends with suffix', snippet: 'endsWith(${1:suffix})' },
                { name: 'contains', detail: 'Check if contains substring', snippet: 'contains(${1:sequence})' }
            );
        }

        // List methods
        if (typeName.includes('list') || typeName.includes('array')) {
            methods.push(
                { name: 'add', detail: 'Add element to list', snippet: 'add(${1:element})' },
                { name: 'get', detail: 'Get element at index', snippet: 'get(${1:index})' },
                { name: 'set', detail: 'Set element at index', snippet: 'set(${1:index}, ${2:element})' },
                { name: 'remove', detail: 'Remove element', snippet: 'remove(${1:index})' },
                { name: 'size', detail: 'Get list size', snippet: 'size()' },
                { name: 'isEmpty', detail: 'Check if list is empty', snippet: 'isEmpty()' },
                { name: 'contains', detail: 'Check if contains element', snippet: 'contains(${1:element})' },
                { name: 'indexOf', detail: 'Get index of element', snippet: 'indexOf(${1:element})' },
                { name: 'clear', detail: 'Remove all elements', snippet: 'clear()' },
                { name: 'stream', detail: 'Get stream of elements', snippet: 'stream()' },
                { name: 'forEach', detail: 'Perform action on each element', snippet: 'forEach(${1:element} -> ${2:action})' }
            );
        }

        // Map methods
        if (typeName.includes('map')) {
            methods.push(
                { name: 'put', detail: 'Put key-value pair', snippet: 'put(${1:key}, ${2:value})' },
                { name: 'get', detail: 'Get value by key', snippet: 'get(${1:key})' },
                { name: 'remove', detail: 'Remove by key', snippet: 'remove(${1:key})' },
                { name: 'containsKey', detail: 'Check if contains key', snippet: 'containsKey(${1:key})' },
                { name: 'containsValue', detail: 'Check if contains value', snippet: 'containsValue(${1:value})' },
                { name: 'keySet', detail: 'Get set of keys', snippet: 'keySet()' },
                { name: 'values', detail: 'Get collection of values', snippet: 'values()' },
                { name: 'entrySet', detail: 'Get set of entries', snippet: 'entrySet()' },
                { name: 'size', detail: 'Get map size', snippet: 'size()' },
                { name: 'isEmpty', detail: 'Check if map is empty', snippet: 'isEmpty()' },
                { name: 'clear', detail: 'Remove all entries', snippet: 'clear()' }
            );
        }

        // Set methods
        if (typeName.includes('set')) {
            methods.push(
                { name: 'add', detail: 'Add element to set', snippet: 'add(${1:element})' },
                { name: 'remove', detail: 'Remove element from set', snippet: 'remove(${1:element})' },
                { name: 'contains', detail: 'Check if contains element', snippet: 'contains(${1:element})' },
                { name: 'size', detail: 'Get set size', snippet: 'size()' },
                { name: 'isEmpty', detail: 'Check if set is empty', snippet: 'isEmpty()' },
                { name: 'clear', detail: 'Remove all elements', snippet: 'clear()' },
                { name: 'stream', detail: 'Get stream of elements', snippet: 'stream()' }
            );
        }

        // Optional methods
        if (typeName.includes('optional')) {
            methods.push(
                { name: 'isPresent', detail: 'Check if value is present', snippet: 'isPresent()' },
                { name: 'isEmpty', detail: 'Check if value is absent', snippet: 'isEmpty()' },
                { name: 'get', detail: 'Get the value (unsafe)', snippet: 'get()' },
                { name: 'orElse', detail: 'Get value or default', snippet: 'orElse(${1:defaultValue})' },
                { name: 'orElseGet', detail: 'Get value or compute default', snippet: 'orElseGet(() -> ${1:supplier})' },
                { name: 'orElseThrow', detail: 'Get value or throw exception', snippet: 'orElseThrow(() -> ${1:exception})' },
                { name: 'map', detail: 'Transform value if present', snippet: 'map(${1:value} -> ${2:transformation})' },
                { name: 'flatMap', detail: 'Transform to Optional if present', snippet: 'flatMap(${1:value} -> ${2:optionalTransformation})' },
                { name: 'filter', detail: 'Filter value by predicate', snippet: 'filter(${1:value} -> ${2:condition})' }
            );
        }

        // LocalDate/Time methods
        if (typeName.includes('date') || typeName.includes('time')) {
            methods.push(
                { name: 'now', detail: 'Get current date/time', snippet: 'now()' },
                { name: 'of', detail: 'Create from components', snippet: 'of(${1:year}, ${2:month}, ${3:day})' },
                { name: 'parse', detail: 'Parse from string', snippet: 'parse(${1:text})' },
                { name: 'format', detail: 'Format to string', snippet: 'format(${1:formatter})' },
                { name: 'plusDays', detail: 'Add days', snippet: 'plusDays(${1:days})' },
                { name: 'minusDays', detail: 'Subtract days', snippet: 'minusDays(${1:days})' },
                { name: 'plusMonths', detail: 'Add months', snippet: 'plusMonths(${1:months})' },
                { name: 'minusMonths', detail: 'Subtract months', snippet: 'minusMonths(${1:months})' },
                { name: 'isAfter', detail: 'Check if after another date', snippet: 'isAfter(${1:other})' },
                { name: 'isBefore', detail: 'Check if before another date', snippet: 'isBefore(${1:other})' }
            );
        }

        return methods;
    }
}