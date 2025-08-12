/**
 * Java API Knowledge Base
 * Comprehensive definitions of Java classes, methods, and their signatures
 */

export interface ParameterInfo {
    name: string;
    type: string;
    description?: string;
    optional?: boolean;
}

export interface MethodDefinition {
    name: string;
    returnType: string;
    parameters: ParameterInfo[];
    documentation: string;
    examples?: string[];
    deprecated?: boolean;
    since?: string;
    isStatic?: boolean;
}

export interface FieldDefinition {
    name: string;
    type: string;
    documentation: string;
    isStatic?: boolean;
    isFinal?: boolean;
}

export interface ClassDefinition {
    name: string;
    package: string;
    methods: MethodDefinition[];
    staticMethods: MethodDefinition[];
    fields: FieldDefinition[];
    documentation: string;
    since?: string;
    isInterface?: boolean;
    isAbstract?: boolean;
}

export class JavaAPIKnowledge {
    private static classes: Map<string, ClassDefinition> = new Map();
    private static initialized = false;

    public static initialize(): void {
        if (this.initialized) return;
        
        this.initializeCoreClasses();
        this.initializeCollectionClasses();
        this.initializeTimeClasses();
        this.initializeFunctionalClasses();
        this.initializeUtilityClasses();
        this.initializeMathClasses();
        this.initializeIOClasses();
        
        this.initialized = true;
    }

    public static getClass(name: string): ClassDefinition | undefined {
        this.initialize();
        return this.classes.get(name);
    }

    public static getMethodsForClass(className: string): MethodDefinition[] {
        const classInfo = this.getClass(className);
        return classInfo ? classInfo.methods : [];
    }

    public static getStaticMethodsForClass(className: string): MethodDefinition[] {
        const classInfo = this.getClass(className);
        return classInfo ? classInfo.staticMethods : [];
    }

    public static searchMethods(query: string): MethodDefinition[] {
        this.initialize();
        const results: MethodDefinition[] = [];
        
        for (const classInfo of this.classes.values()) {
            const matchingMethods = classInfo.methods.filter(method => 
                method.name.toLowerCase().includes(query.toLowerCase())
            );
            const matchingStaticMethods = classInfo.staticMethods.filter(method => 
                method.name.toLowerCase().includes(query.toLowerCase())
            );
            results.push(...matchingMethods, ...matchingStaticMethods);
        }
        
        return results;
    }

    public static getAllClasses(): ClassDefinition[] {
        this.initialize();
        return Array.from(this.classes.values());
    }

    private static initializeCoreClasses(): void {
        // String class
        this.classes.set('String', {
            name: 'String',
            package: 'java.lang',
            documentation: 'Immutable sequence of characters',
            methods: [
                {
                    name: 'length',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Returns the length of this string',
                    examples: ['str.length()']
                },
                {
                    name: 'charAt',
                    returnType: 'char',
                    parameters: [{ name: 'index', type: 'int', description: 'Index of character to return' }],
                    documentation: 'Returns the character at the specified index',
                    examples: ['str.charAt(0)']
                },
                {
                    name: 'substring',
                    returnType: 'String',
                    parameters: [
                        { name: 'beginIndex', type: 'int', description: 'Beginning index, inclusive' },
                        { name: 'endIndex', type: 'int', description: 'Ending index, exclusive', optional: true }
                    ],
                    documentation: 'Returns a substring of this string',
                    examples: ['str.substring(1)', 'str.substring(1, 5)']
                },
                {
                    name: 'indexOf',
                    returnType: 'int',
                    parameters: [{ name: 'str', type: 'String', description: 'Substring to search for' }],
                    documentation: 'Returns the index of the first occurrence of the specified substring',
                    examples: ['str.indexOf("hello")']
                },
                {
                    name: 'toLowerCase',
                    returnType: 'String',
                    parameters: [],
                    documentation: 'Converts all characters to lowercase',
                    examples: ['str.toLowerCase()']
                },
                {
                    name: 'toUpperCase',
                    returnType: 'String',
                    parameters: [],
                    documentation: 'Converts all characters to uppercase',
                    examples: ['str.toUpperCase()']
                },
                {
                    name: 'trim',
                    returnType: 'String',
                    parameters: [],
                    documentation: 'Returns a string with leading and trailing whitespace removed',
                    examples: ['str.trim()']
                },
                {
                    name: 'replace',
                    returnType: 'String',
                    parameters: [
                        { name: 'target', type: 'CharSequence', description: 'Sequence to be replaced' },
                        { name: 'replacement', type: 'CharSequence', description: 'Replacement sequence' }
                    ],
                    documentation: 'Replaces each substring that matches the target with the replacement',
                    examples: ['str.replace("old", "new")']
                },
                {
                    name: 'split',
                    returnType: 'String[]',
                    parameters: [{ name: 'regex', type: 'String', description: 'Delimiting regular expression' }],
                    documentation: 'Splits this string around matches of the given regular expression',
                    examples: ['str.split(",")']
                },
                {
                    name: 'equals',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Object to compare with' }],
                    documentation: 'Compares this string to the specified object',
                    examples: ['str.equals("other")']
                },
                {
                    name: 'equalsIgnoreCase',
                    returnType: 'boolean',
                    parameters: [{ name: 'anotherString', type: 'String', description: 'String to compare with' }],
                    documentation: 'Compares this string to another string, ignoring case considerations',
                    examples: ['str.equalsIgnoreCase("OTHER")']
                },
                {
                    name: 'startsWith',
                    returnType: 'boolean',
                    parameters: [{ name: 'prefix', type: 'String', description: 'Prefix to test' }],
                    documentation: 'Tests if this string starts with the specified prefix',
                    examples: ['str.startsWith("Hello")']
                },
                {
                    name: 'endsWith',
                    returnType: 'boolean',
                    parameters: [{ name: 'suffix', type: 'String', description: 'Suffix to test' }],
                    documentation: 'Tests if this string ends with the specified suffix',
                    examples: ['str.endsWith(".txt")']
                },
                {
                    name: 'contains',
                    returnType: 'boolean',
                    parameters: [{ name: 'sequence', type: 'CharSequence', description: 'Sequence to search for' }],
                    documentation: 'Returns true if this string contains the specified sequence',
                    examples: ['str.contains("substring")']
                },
                {
                    name: 'isEmpty',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if the length is 0',
                    examples: ['str.isEmpty()']
                },
                {
                    name: 'isBlank',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if the string is empty or contains only whitespace (Java 11+)',
                    examples: ['str.isBlank()'],
                    since: '11'
                }
            ],
            staticMethods: [
                {
                    name: 'valueOf',
                    returnType: 'String',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Object to convert to string' }],
                    documentation: 'Returns the string representation of the Object argument',
                    examples: ['String.valueOf(123)'],
                    isStatic: true
                },
                {
                    name: 'format',
                    returnType: 'String',
                    parameters: [
                        { name: 'format', type: 'String', description: 'Format string' },
                        { name: 'args', type: 'Object...', description: 'Arguments to format' }
                    ],
                    documentation: 'Returns a formatted string using the specified format string and arguments',
                    examples: ['String.format("Hello %s", name)'],
                    isStatic: true
                },
                {
                    name: 'join',
                    returnType: 'String',
                    parameters: [
                        { name: 'delimiter', type: 'CharSequence', description: 'Delimiter to use' },
                        { name: 'elements', type: 'CharSequence...', description: 'Elements to join' }
                    ],
                    documentation: 'Returns a new String composed of elements joined together with delimiter',
                    examples: ['String.join(",", "a", "b", "c")'],
                    isStatic: true,
                    since: '8'
                }
            ],
            fields: []
        });

        // Object class
        this.classes.set('Object', {
            name: 'Object',
            package: 'java.lang',
            documentation: 'The root class of the class hierarchy',
            methods: [
                {
                    name: 'toString',
                    returnType: 'String',
                    parameters: [],
                    documentation: 'Returns a string representation of the object',
                    examples: ['obj.toString()']
                },
                {
                    name: 'equals',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Object to compare with' }],
                    documentation: 'Indicates whether some other object is "equal to" this one',
                    examples: ['obj.equals(other)']
                },
                {
                    name: 'hashCode',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Returns a hash code value for the object',
                    examples: ['obj.hashCode()']
                },
                {
                    name: 'getClass',
                    returnType: 'Class<?>',
                    parameters: [],
                    documentation: 'Returns the runtime class of this Object',
                    examples: ['obj.getClass()']
                }
            ],
            staticMethods: [],
            fields: []
        });

        // System class
        this.classes.set('System', {
            name: 'System',
            package: 'java.lang',
            documentation: 'System-related utilities and properties',
            methods: [],
            staticMethods: [
                {
                    name: 'currentTimeMillis',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Returns the current time in milliseconds',
                    examples: ['System.currentTimeMillis()'],
                    isStatic: true
                },
                {
                    name: 'nanoTime',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Returns the current value of the running JVM\'s high-resolution time source',
                    examples: ['System.nanoTime()'],
                    isStatic: true
                },
                {
                    name: 'getProperty',
                    returnType: 'String',
                    parameters: [{ name: 'key', type: 'String', description: 'System property key' }],
                    documentation: 'Gets the system property indicated by the specified key',
                    examples: ['System.getProperty("java.version")'],
                    isStatic: true
                },
                {
                    name: 'setProperty',
                    returnType: 'String',
                    parameters: [
                        { name: 'key', type: 'String', description: 'System property key' },
                        { name: 'value', type: 'String', description: 'System property value' }
                    ],
                    documentation: 'Sets the system property indicated by the specified key',
                    examples: ['System.setProperty("key", "value")'],
                    isStatic: true
                }
            ],
            fields: [
                {
                    name: 'out',
                    type: 'PrintStream',
                    documentation: 'The "standard" output stream',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'err',
                    type: 'PrintStream',
                    documentation: 'The "standard" error output stream',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'in',
                    type: 'InputStream',
                    documentation: 'The "standard" input stream',
                    isStatic: true,
                    isFinal: true
                }
            ]
        });
    }    pr
ivate static initializeCollectionClasses(): void {
        // List interface
        this.classes.set('List', {
            name: 'List',
            package: 'java.util',
            documentation: 'An ordered collection (sequence)',
            isInterface: true,
            methods: [
                {
                    name: 'add',
                    returnType: 'boolean',
                    parameters: [{ name: 'element', type: 'E', description: 'Element to add' }],
                    documentation: 'Appends the specified element to the end of this list',
                    examples: ['list.add(element)']
                },
                {
                    name: 'add',
                    returnType: 'void',
                    parameters: [
                        { name: 'index', type: 'int', description: 'Index at which to insert' },
                        { name: 'element', type: 'E', description: 'Element to add' }
                    ],
                    documentation: 'Inserts the specified element at the specified position',
                    examples: ['list.add(0, element)']
                },
                {
                    name: 'get',
                    returnType: 'E',
                    parameters: [{ name: 'index', type: 'int', description: 'Index of element to return' }],
                    documentation: 'Returns the element at the specified position',
                    examples: ['list.get(0)']
                },
                {
                    name: 'set',
                    returnType: 'E',
                    parameters: [
                        { name: 'index', type: 'int', description: 'Index of element to replace' },
                        { name: 'element', type: 'E', description: 'Element to store' }
                    ],
                    documentation: 'Replaces the element at the specified position',
                    examples: ['list.set(0, newElement)']
                },
                {
                    name: 'remove',
                    returnType: 'E',
                    parameters: [{ name: 'index', type: 'int', description: 'Index of element to remove' }],
                    documentation: 'Removes the element at the specified position',
                    examples: ['list.remove(0)']
                },
                {
                    name: 'remove',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Element to remove' }],
                    documentation: 'Removes the first occurrence of the specified element',
                    examples: ['list.remove(element)']
                },
                {
                    name: 'size',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Returns the number of elements in this list',
                    examples: ['list.size()']
                },
                {
                    name: 'isEmpty',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if this list contains no elements',
                    examples: ['list.isEmpty()']
                },
                {
                    name: 'contains',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Element to check' }],
                    documentation: 'Returns true if this list contains the specified element',
                    examples: ['list.contains(element)']
                },
                {
                    name: 'indexOf',
                    returnType: 'int',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Element to search for' }],
                    documentation: 'Returns the index of the first occurrence of the specified element',
                    examples: ['list.indexOf(element)']
                },
                {
                    name: 'clear',
                    returnType: 'void',
                    parameters: [],
                    documentation: 'Removes all elements from this list',
                    examples: ['list.clear()']
                },
                {
                    name: 'stream',
                    returnType: 'Stream<E>',
                    parameters: [],
                    documentation: 'Returns a sequential Stream with this collection as its source',
                    examples: ['list.stream()'],
                    since: '8'
                },
                {
                    name: 'forEach',
                    returnType: 'void',
                    parameters: [{ name: 'action', type: 'Consumer<? super E>', description: 'Action to perform' }],
                    documentation: 'Performs the given action for each element',
                    examples: ['list.forEach(System.out::println)'],
                    since: '8'
                }
            ],
            staticMethods: [
                {
                    name: 'of',
                    returnType: 'List<E>',
                    parameters: [{ name: 'elements', type: 'E...', description: 'Elements to include' }],
                    documentation: 'Returns an unmodifiable list containing the specified elements',
                    examples: ['List.of("a", "b", "c")'],
                    isStatic: true,
                    since: '9'
                }
            ],
            fields: []
        });

        // ArrayList class
        this.classes.set('ArrayList', {
            name: 'ArrayList',
            package: 'java.util',
            documentation: 'Resizable-array implementation of the List interface',
            methods: [
                // Inherits all List methods plus:
                {
                    name: 'ensureCapacity',
                    returnType: 'void',
                    parameters: [{ name: 'minCapacity', type: 'int', description: 'Desired minimum capacity' }],
                    documentation: 'Increases the capacity if necessary to ensure it can hold at least the specified number of elements',
                    examples: ['arrayList.ensureCapacity(100)']
                },
                {
                    name: 'trimToSize',
                    returnType: 'void',
                    parameters: [],
                    documentation: 'Trims the capacity to be the list\'s current size',
                    examples: ['arrayList.trimToSize()']
                }
            ],
            staticMethods: [],
            fields: []
        });

        // Map interface
        this.classes.set('Map', {
            name: 'Map',
            package: 'java.util',
            documentation: 'An object that maps keys to values',
            isInterface: true,
            methods: [
                {
                    name: 'put',
                    returnType: 'V',
                    parameters: [
                        { name: 'key', type: 'K', description: 'Key with which the value is to be associated' },
                        { name: 'value', type: 'V', description: 'Value to be associated with the key' }
                    ],
                    documentation: 'Associates the specified value with the specified key',
                    examples: ['map.put(key, value)']
                },
                {
                    name: 'get',
                    returnType: 'V',
                    parameters: [{ name: 'key', type: 'Object', description: 'Key whose associated value is to be returned' }],
                    documentation: 'Returns the value to which the specified key is mapped',
                    examples: ['map.get(key)']
                },
                {
                    name: 'remove',
                    returnType: 'V',
                    parameters: [{ name: 'key', type: 'Object', description: 'Key whose mapping is to be removed' }],
                    documentation: 'Removes the mapping for a key from this map if it is present',
                    examples: ['map.remove(key)']
                },
                {
                    name: 'containsKey',
                    returnType: 'boolean',
                    parameters: [{ name: 'key', type: 'Object', description: 'Key to check' }],
                    documentation: 'Returns true if this map contains a mapping for the specified key',
                    examples: ['map.containsKey(key)']
                },
                {
                    name: 'containsValue',
                    returnType: 'boolean',
                    parameters: [{ name: 'value', type: 'Object', description: 'Value to check' }],
                    documentation: 'Returns true if this map maps one or more keys to the specified value',
                    examples: ['map.containsValue(value)']
                },
                {
                    name: 'size',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Returns the number of key-value mappings in this map',
                    examples: ['map.size()']
                },
                {
                    name: 'isEmpty',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if this map contains no key-value mappings',
                    examples: ['map.isEmpty()']
                },
                {
                    name: 'clear',
                    returnType: 'void',
                    parameters: [],
                    documentation: 'Removes all mappings from this map',
                    examples: ['map.clear()']
                },
                {
                    name: 'keySet',
                    returnType: 'Set<K>',
                    parameters: [],
                    documentation: 'Returns a Set view of the keys contained in this map',
                    examples: ['map.keySet()']
                },
                {
                    name: 'values',
                    returnType: 'Collection<V>',
                    parameters: [],
                    documentation: 'Returns a Collection view of the values contained in this map',
                    examples: ['map.values()']
                },
                {
                    name: 'entrySet',
                    returnType: 'Set<Map.Entry<K,V>>',
                    parameters: [],
                    documentation: 'Returns a Set view of the mappings contained in this map',
                    examples: ['map.entrySet()']
                },
                {
                    name: 'getOrDefault',
                    returnType: 'V',
                    parameters: [
                        { name: 'key', type: 'Object', description: 'Key to look up' },
                        { name: 'defaultValue', type: 'V', description: 'Default value to return' }
                    ],
                    documentation: 'Returns the value mapped to key, or defaultValue if no mapping exists',
                    examples: ['map.getOrDefault(key, defaultValue)'],
                    since: '8'
                },
                {
                    name: 'putIfAbsent',
                    returnType: 'V',
                    parameters: [
                        { name: 'key', type: 'K', description: 'Key to associate value with' },
                        { name: 'value', type: 'V', description: 'Value to associate with key' }
                    ],
                    documentation: 'Associates value with key only if key is not already associated with a value',
                    examples: ['map.putIfAbsent(key, value)'],
                    since: '8'
                },
                {
                    name: 'forEach',
                    returnType: 'void',
                    parameters: [{ name: 'action', type: 'BiConsumer<? super K,? super V>', description: 'Action to perform' }],
                    documentation: 'Performs the given action for each entry in this map',
                    examples: ['map.forEach((k, v) -> System.out.println(k + "=" + v))'],
                    since: '8'
                }
            ],
            staticMethods: [
                {
                    name: 'of',
                    returnType: 'Map<K,V>',
                    parameters: [],
                    documentation: 'Returns an unmodifiable empty map',
                    examples: ['Map.of()'],
                    isStatic: true,
                    since: '9'
                }
            ],
            fields: []
        });

        // HashMap class
        this.classes.set('HashMap', {
            name: 'HashMap',
            package: 'java.util',
            documentation: 'Hash table based implementation of the Map interface',
            methods: [], // Inherits all Map methods
            staticMethods: [],
            fields: []
        });

        // Set interface
        this.classes.set('Set', {
            name: 'Set',
            package: 'java.util',
            documentation: 'A collection that contains no duplicate elements',
            isInterface: true,
            methods: [
                {
                    name: 'add',
                    returnType: 'boolean',
                    parameters: [{ name: 'element', type: 'E', description: 'Element to add' }],
                    documentation: 'Adds the specified element to this set if it is not already present',
                    examples: ['set.add(element)']
                },
                {
                    name: 'remove',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Element to remove' }],
                    documentation: 'Removes the specified element from this set if it is present',
                    examples: ['set.remove(element)']
                },
                {
                    name: 'contains',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Element to check' }],
                    documentation: 'Returns true if this set contains the specified element',
                    examples: ['set.contains(element)']
                },
                {
                    name: 'size',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Returns the number of elements in this set',
                    examples: ['set.size()']
                },
                {
                    name: 'isEmpty',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if this set contains no elements',
                    examples: ['set.isEmpty()']
                },
                {
                    name: 'clear',
                    returnType: 'void',
                    parameters: [],
                    documentation: 'Removes all elements from this set',
                    examples: ['set.clear()']
                }
            ],
            staticMethods: [
                {
                    name: 'of',
                    returnType: 'Set<E>',
                    parameters: [{ name: 'elements', type: 'E...', description: 'Elements to include' }],
                    documentation: 'Returns an unmodifiable set containing the specified elements',
                    examples: ['Set.of("a", "b", "c")'],
                    isStatic: true,
                    since: '9'
                }
            ],
            fields: []
        });

        // Collections utility class
        this.classes.set('Collections', {
            name: 'Collections',
            package: 'java.util',
            documentation: 'Utility methods for operating on collections',
            methods: [],
            staticMethods: [
                {
                    name: 'sort',
                    returnType: 'void',
                    parameters: [{ name: 'list', type: 'List<T>', description: 'List to sort' }],
                    documentation: 'Sorts the specified list into ascending order',
                    examples: ['Collections.sort(list)'],
                    isStatic: true
                },
                {
                    name: 'reverse',
                    returnType: 'void',
                    parameters: [{ name: 'list', type: 'List<?>', description: 'List to reverse' }],
                    documentation: 'Reverses the order of the elements in the specified list',
                    examples: ['Collections.reverse(list)'],
                    isStatic: true
                },
                {
                    name: 'shuffle',
                    returnType: 'void',
                    parameters: [{ name: 'list', type: 'List<?>', description: 'List to shuffle' }],
                    documentation: 'Randomly permutes the specified list using a default source of randomness',
                    examples: ['Collections.shuffle(list)'],
                    isStatic: true
                },
                {
                    name: 'min',
                    returnType: 'T',
                    parameters: [{ name: 'coll', type: 'Collection<? extends T>', description: 'Collection to search' }],
                    documentation: 'Returns the minimum element of the given collection',
                    examples: ['Collections.min(collection)'],
                    isStatic: true
                },
                {
                    name: 'max',
                    returnType: 'T',
                    parameters: [{ name: 'coll', type: 'Collection<? extends T>', description: 'Collection to search' }],
                    documentation: 'Returns the maximum element of the given collection',
                    examples: ['Collections.max(collection)'],
                    isStatic: true
                },
                {
                    name: 'frequency',
                    returnType: 'int',
                    parameters: [
                        { name: 'c', type: 'Collection<?>', description: 'Collection to search' },
                        { name: 'o', type: 'Object', description: 'Object to count' }
                    ],
                    documentation: 'Returns the number of elements equal to the specified object',
                    examples: ['Collections.frequency(collection, element)'],
                    isStatic: true
                },
                {
                    name: 'emptyList',
                    returnType: 'List<T>',
                    parameters: [],
                    documentation: 'Returns an empty list (immutable)',
                    examples: ['Collections.emptyList()'],
                    isStatic: true
                },
                {
                    name: 'emptySet',
                    returnType: 'Set<T>',
                    parameters: [],
                    documentation: 'Returns an empty set (immutable)',
                    examples: ['Collections.emptySet()'],
                    isStatic: true
                },
                {
                    name: 'emptyMap',
                    returnType: 'Map<K,V>',
                    parameters: [],
                    documentation: 'Returns an empty map (immutable)',
                    examples: ['Collections.emptyMap()'],
                    isStatic: true
                }
            ],
            fields: []
        });
    }    p
rivate static initializeTimeClasses(): void {
        // LocalDate class
        this.classes.set('LocalDate', {
            name: 'LocalDate',
            package: 'java.time',
            documentation: 'A date without a time-zone in the ISO-8601 calendar system',
            since: '8',
            methods: [
                {
                    name: 'getYear',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Gets the year field',
                    examples: ['date.getYear()']
                },
                {
                    name: 'getMonth',
                    returnType: 'Month',
                    parameters: [],
                    documentation: 'Gets the month-of-year field using the Month enum',
                    examples: ['date.getMonth()']
                },
                {
                    name: 'getMonthValue',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Gets the month-of-year field from 1 to 12',
                    examples: ['date.getMonthValue()']
                },
                {
                    name: 'getDayOfMonth',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Gets the day-of-month field',
                    examples: ['date.getDayOfMonth()']
                },
                {
                    name: 'getDayOfWeek',
                    returnType: 'DayOfWeek',
                    parameters: [],
                    documentation: 'Gets the day-of-week field',
                    examples: ['date.getDayOfWeek()']
                },
                {
                    name: 'plusDays',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'daysToAdd', type: 'long', description: 'Days to add' }],
                    documentation: 'Returns a copy of this date with the specified number of days added',
                    examples: ['date.plusDays(7)']
                },
                {
                    name: 'plusWeeks',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'weeksToAdd', type: 'long', description: 'Weeks to add' }],
                    documentation: 'Returns a copy of this date with the specified number of weeks added',
                    examples: ['date.plusWeeks(2)']
                },
                {
                    name: 'plusMonths',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'monthsToAdd', type: 'long', description: 'Months to add' }],
                    documentation: 'Returns a copy of this date with the specified number of months added',
                    examples: ['date.plusMonths(3)']
                },
                {
                    name: 'plusYears',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'yearsToAdd', type: 'long', description: 'Years to add' }],
                    documentation: 'Returns a copy of this date with the specified number of years added',
                    examples: ['date.plusYears(1)']
                },
                {
                    name: 'minusDays',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'daysToSubtract', type: 'long', description: 'Days to subtract' }],
                    documentation: 'Returns a copy of this date with the specified number of days subtracted',
                    examples: ['date.minusDays(7)']
                },
                {
                    name: 'minusWeeks',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'weeksToSubtract', type: 'long', description: 'Weeks to subtract' }],
                    documentation: 'Returns a copy of this date with the specified number of weeks subtracted',
                    examples: ['date.minusWeeks(2)']
                },
                {
                    name: 'minusMonths',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'monthsToSubtract', type: 'long', description: 'Months to subtract' }],
                    documentation: 'Returns a copy of this date with the specified number of months subtracted',
                    examples: ['date.minusMonths(3)']
                },
                {
                    name: 'minusYears',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'yearsToSubtract', type: 'long', description: 'Years to subtract' }],
                    documentation: 'Returns a copy of this date with the specified number of years subtracted',
                    examples: ['date.minusYears(1)']
                },
                {
                    name: 'isAfter',
                    returnType: 'boolean',
                    parameters: [{ name: 'other', type: 'ChronoLocalDate', description: 'Date to compare to' }],
                    documentation: 'Checks if this date is after the specified date',
                    examples: ['date.isAfter(otherDate)']
                },
                {
                    name: 'isBefore',
                    returnType: 'boolean',
                    parameters: [{ name: 'other', type: 'ChronoLocalDate', description: 'Date to compare to' }],
                    documentation: 'Checks if this date is before the specified date',
                    examples: ['date.isBefore(otherDate)']
                },
                {
                    name: 'isEqual',
                    returnType: 'boolean',
                    parameters: [{ name: 'other', type: 'ChronoLocalDate', description: 'Date to compare to' }],
                    documentation: 'Checks if this date is equal to the specified date',
                    examples: ['date.isEqual(otherDate)']
                },
                {
                    name: 'format',
                    returnType: 'String',
                    parameters: [{ name: 'formatter', type: 'DateTimeFormatter', description: 'Formatter to use' }],
                    documentation: 'Formats this date using the specified formatter',
                    examples: ['date.format(DateTimeFormatter.ISO_LOCAL_DATE)']
                }
            ],
            staticMethods: [
                {
                    name: 'now',
                    returnType: 'LocalDate',
                    parameters: [],
                    documentation: 'Obtains the current date from the system clock in the default time-zone',
                    examples: ['LocalDate.now()'],
                    isStatic: true
                },
                {
                    name: 'of',
                    returnType: 'LocalDate',
                    parameters: [
                        { name: 'year', type: 'int', description: 'Year to represent' },
                        { name: 'month', type: 'int', description: 'Month-of-year to represent' },
                        { name: 'dayOfMonth', type: 'int', description: 'Day-of-month to represent' }
                    ],
                    documentation: 'Obtains an instance of LocalDate from a year, month and day',
                    examples: ['LocalDate.of(2023, 12, 25)'],
                    isStatic: true
                },
                {
                    name: 'parse',
                    returnType: 'LocalDate',
                    parameters: [{ name: 'text', type: 'CharSequence', description: 'Text to parse' }],
                    documentation: 'Obtains an instance of LocalDate from a text string such as 2007-12-03',
                    examples: ['LocalDate.parse("2023-12-25")'],
                    isStatic: true
                }
            ],
            fields: []
        });

        // LocalDateTime class
        this.classes.set('LocalDateTime', {
            name: 'LocalDateTime',
            package: 'java.time',
            documentation: 'A date-time without a time-zone in the ISO-8601 calendar system',
            since: '8',
            methods: [
                {
                    name: 'toLocalDate',
                    returnType: 'LocalDate',
                    parameters: [],
                    documentation: 'Gets the LocalDate part of this date-time',
                    examples: ['dateTime.toLocalDate()']
                },
                {
                    name: 'toLocalTime',
                    returnType: 'LocalTime',
                    parameters: [],
                    documentation: 'Gets the LocalTime part of this date-time',
                    examples: ['dateTime.toLocalTime()']
                },
                {
                    name: 'getHour',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Gets the hour-of-day field',
                    examples: ['dateTime.getHour()']
                },
                {
                    name: 'getMinute',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Gets the minute-of-hour field',
                    examples: ['dateTime.getMinute()']
                },
                {
                    name: 'getSecond',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Gets the second-of-minute field',
                    examples: ['dateTime.getSecond()']
                }
            ],
            staticMethods: [
                {
                    name: 'now',
                    returnType: 'LocalDateTime',
                    parameters: [],
                    documentation: 'Obtains the current date-time from the system clock in the default time-zone',
                    examples: ['LocalDateTime.now()'],
                    isStatic: true
                },
                {
                    name: 'of',
                    returnType: 'LocalDateTime',
                    parameters: [
                        { name: 'year', type: 'int', description: 'Year to represent' },
                        { name: 'month', type: 'int', description: 'Month-of-year to represent' },
                        { name: 'dayOfMonth', type: 'int', description: 'Day-of-month to represent' },
                        { name: 'hour', type: 'int', description: 'Hour-of-day to represent' },
                        { name: 'minute', type: 'int', description: 'Minute-of-hour to represent' }
                    ],
                    documentation: 'Obtains an instance of LocalDateTime from year, month, day, hour and minute',
                    examples: ['LocalDateTime.of(2023, 12, 25, 10, 30)'],
                    isStatic: true
                }
            ],
            fields: []
        });

        // DateTimeFormatter class
        this.classes.set('DateTimeFormatter', {
            name: 'DateTimeFormatter',
            package: 'java.time.format',
            documentation: 'Formatter for printing and parsing date-time objects',
            since: '8',
            methods: [
                {
                    name: 'format',
                    returnType: 'String',
                    parameters: [{ name: 'temporal', type: 'TemporalAccessor', description: 'Temporal object to format' }],
                    documentation: 'Formats a date-time object using this formatter',
                    examples: ['formatter.format(LocalDate.now())']
                }
            ],
            staticMethods: [
                {
                    name: 'ofPattern',
                    returnType: 'DateTimeFormatter',
                    parameters: [{ name: 'pattern', type: 'String', description: 'Pattern to use' }],
                    documentation: 'Creates a formatter using the specified pattern',
                    examples: ['DateTimeFormatter.ofPattern("yyyy-MM-dd")'],
                    isStatic: true
                }
            ],
            fields: [
                {
                    name: 'ISO_LOCAL_DATE',
                    type: 'DateTimeFormatter',
                    documentation: 'ISO Local Date format like 2011-12-03',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'ISO_LOCAL_TIME',
                    type: 'DateTimeFormatter',
                    documentation: 'ISO Local Time format like 10:15:30',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'ISO_LOCAL_DATE_TIME',
                    type: 'DateTimeFormatter',
                    documentation: 'ISO Local Date Time format like 2011-12-03T10:15:30',
                    isStatic: true,
                    isFinal: true
                }
            ]
        });

        // Duration class
        this.classes.set('Duration', {
            name: 'Duration',
            package: 'java.time',
            documentation: 'A time-based amount of time, such as 34.5 seconds',
            since: '8',
            methods: [
                {
                    name: 'toDays',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Gets the number of days in this duration',
                    examples: ['duration.toDays()']
                },
                {
                    name: 'toHours',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Gets the number of hours in this duration',
                    examples: ['duration.toHours()']
                },
                {
                    name: 'toMinutes',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Gets the number of minutes in this duration',
                    examples: ['duration.toMinutes()']
                },
                {
                    name: 'getSeconds',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Gets the number of seconds in this duration',
                    examples: ['duration.getSeconds()']
                }
            ],
            staticMethods: [
                {
                    name: 'ofDays',
                    returnType: 'Duration',
                    parameters: [{ name: 'days', type: 'long', description: 'Number of days' }],
                    documentation: 'Obtains a Duration representing a number of standard 24 hour days',
                    examples: ['Duration.ofDays(7)'],
                    isStatic: true
                },
                {
                    name: 'ofHours',
                    returnType: 'Duration',
                    parameters: [{ name: 'hours', type: 'long', description: 'Number of hours' }],
                    documentation: 'Obtains a Duration representing a number of standard hours',
                    examples: ['Duration.ofHours(24)'],
                    isStatic: true
                },
                {
                    name: 'ofMinutes',
                    returnType: 'Duration',
                    parameters: [{ name: 'minutes', type: 'long', description: 'Number of minutes' }],
                    documentation: 'Obtains a Duration representing a number of standard minutes',
                    examples: ['Duration.ofMinutes(60)'],
                    isStatic: true
                },
                {
                    name: 'between',
                    returnType: 'Duration',
                    parameters: [
                        { name: 'startInclusive', type: 'Temporal', description: 'Start instant' },
                        { name: 'endExclusive', type: 'Temporal', description: 'End instant' }
                    ],
                    documentation: 'Obtains a Duration representing the duration between two temporal objects',
                    examples: ['Duration.between(start, end)'],
                    isStatic: true
                }
            ],
            fields: []
        });
    }    pr
ivate static initializeFunctionalClasses(): void {
        // Optional class
        this.classes.set('Optional', {
            name: 'Optional',
            package: 'java.util',
            documentation: 'A container object which may or may not contain a non-null value',
            since: '8',
            methods: [
                {
                    name: 'isPresent',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if there is a value present, otherwise false',
                    examples: ['optional.isPresent()']
                },
                {
                    name: 'isEmpty',
                    returnType: 'boolean',
                    parameters: [],
                    documentation: 'Returns true if there is no value present, otherwise false',
                    examples: ['optional.isEmpty()'],
                    since: '11'
                },
                {
                    name: 'get',
                    returnType: 'T',
                    parameters: [],
                    documentation: 'Returns the value if present, otherwise throws NoSuchElementException',
                    examples: ['optional.get()']
                },
                {
                    name: 'orElse',
                    returnType: 'T',
                    parameters: [{ name: 'other', type: 'T', description: 'Value to return if no value is present' }],
                    documentation: 'Returns the value if present, otherwise returns other',
                    examples: ['optional.orElse(defaultValue)']
                },
                {
                    name: 'orElseGet',
                    returnType: 'T',
                    parameters: [{ name: 'other', type: 'Supplier<? extends T>', description: 'Supplier to invoke if no value is present' }],
                    documentation: 'Returns the value if present, otherwise invokes other and returns the result',
                    examples: ['optional.orElseGet(() -> computeDefault())']
                },
                {
                    name: 'orElseThrow',
                    returnType: 'T',
                    parameters: [],
                    documentation: 'Returns the contained value, if present, otherwise throws an exception',
                    examples: ['optional.orElseThrow()'],
                    since: '10'
                },
                {
                    name: 'ifPresent',
                    returnType: 'void',
                    parameters: [{ name: 'consumer', type: 'Consumer<? super T>', description: 'Block to execute if a value is present' }],
                    documentation: 'If a value is present, invoke the specified consumer with the value',
                    examples: ['optional.ifPresent(System.out::println)']
                },
                {
                    name: 'ifPresentOrElse',
                    returnType: 'void',
                    parameters: [
                        { name: 'action', type: 'Consumer<? super T>', description: 'Action to execute if value is present' },
                        { name: 'emptyAction', type: 'Runnable', description: 'Action to execute if no value is present' }
                    ],
                    documentation: 'If a value is present, performs the given action, otherwise performs the given empty-based action',
                    examples: ['optional.ifPresentOrElse(System.out::println, () -> System.out.println("Empty"))'],
                    since: '9'
                },
                {
                    name: 'filter',
                    returnType: 'Optional<T>',
                    parameters: [{ name: 'predicate', type: 'Predicate<? super T>', description: 'Predicate to apply to the value' }],
                    documentation: 'If a value is present and matches the given predicate, returns an Optional describing the value',
                    examples: ['optional.filter(x -> x > 0)']
                },
                {
                    name: 'map',
                    returnType: 'Optional<U>',
                    parameters: [{ name: 'mapper', type: 'Function<? super T,? extends U>', description: 'Mapping function to apply to the value' }],
                    documentation: 'If a value is present, apply the provided mapping function to it',
                    examples: ['optional.map(String::toUpperCase)']
                },
                {
                    name: 'flatMap',
                    returnType: 'Optional<U>',
                    parameters: [{ name: 'mapper', type: 'Function<? super T,Optional<U>>', description: 'Mapping function to apply to the value' }],
                    documentation: 'If a value is present, apply the provided Optional-bearing mapping function to it',
                    examples: ['optional.flatMap(this::findById)']
                }
            ],
            staticMethods: [
                {
                    name: 'empty',
                    returnType: 'Optional<T>',
                    parameters: [],
                    documentation: 'Returns an empty Optional instance',
                    examples: ['Optional.empty()'],
                    isStatic: true
                },
                {
                    name: 'of',
                    returnType: 'Optional<T>',
                    parameters: [{ name: 'value', type: 'T', description: 'Non-null value to describe' }],
                    documentation: 'Returns an Optional with the specified present non-null value',
                    examples: ['Optional.of(value)'],
                    isStatic: true
                },
                {
                    name: 'ofNullable',
                    returnType: 'Optional<T>',
                    parameters: [{ name: 'value', type: 'T', description: 'Value to describe, which may be null' }],
                    documentation: 'Returns an Optional describing the specified value, if non-null, otherwise returns an empty Optional',
                    examples: ['Optional.ofNullable(nullableValue)'],
                    isStatic: true
                }
            ],
            fields: []
        });

        // Stream interface
        this.classes.set('Stream', {
            name: 'Stream',
            package: 'java.util.stream',
            documentation: 'A sequence of elements supporting sequential and parallel aggregate operations',
            since: '8',
            isInterface: true,
            methods: [
                {
                    name: 'filter',
                    returnType: 'Stream<T>',
                    parameters: [{ name: 'predicate', type: 'Predicate<? super T>', description: 'Predicate to apply to each element' }],
                    documentation: 'Returns a stream consisting of the elements that match the given predicate',
                    examples: ['stream.filter(x -> x > 0)']
                },
                {
                    name: 'map',
                    returnType: 'Stream<R>',
                    parameters: [{ name: 'mapper', type: 'Function<? super T,? extends R>', description: 'Function to apply to each element' }],
                    documentation: 'Returns a stream consisting of the results of applying the given function',
                    examples: ['stream.map(String::toUpperCase)']
                },
                {
                    name: 'flatMap',
                    returnType: 'Stream<R>',
                    parameters: [{ name: 'mapper', type: 'Function<? super T,? extends Stream<? extends R>>', description: 'Function to apply to each element' }],
                    documentation: 'Returns a stream consisting of the results of replacing each element with the contents of a mapped stream',
                    examples: ['stream.flatMap(Collection::stream)']
                },
                {
                    name: 'distinct',
                    returnType: 'Stream<T>',
                    parameters: [],
                    documentation: 'Returns a stream consisting of the distinct elements',
                    examples: ['stream.distinct()']
                },
                {
                    name: 'sorted',
                    returnType: 'Stream<T>',
                    parameters: [],
                    documentation: 'Returns a stream consisting of the elements sorted according to natural order',
                    examples: ['stream.sorted()']
                },
                {
                    name: 'peek',
                    returnType: 'Stream<T>',
                    parameters: [{ name: 'action', type: 'Consumer<? super T>', description: 'Action to perform on each element' }],
                    documentation: 'Returns a stream consisting of the elements, additionally performing the provided action',
                    examples: ['stream.peek(System.out::println)']
                },
                {
                    name: 'limit',
                    returnType: 'Stream<T>',
                    parameters: [{ name: 'maxSize', type: 'long', description: 'Maximum number of elements' }],
                    documentation: 'Returns a stream consisting of the elements, truncated to be no longer than maxSize',
                    examples: ['stream.limit(10)']
                },
                {
                    name: 'skip',
                    returnType: 'Stream<T>',
                    parameters: [{ name: 'n', type: 'long', description: 'Number of leading elements to skip' }],
                    documentation: 'Returns a stream consisting of the remaining elements after discarding the first n elements',
                    examples: ['stream.skip(5)']
                },
                {
                    name: 'forEach',
                    returnType: 'void',
                    parameters: [{ name: 'action', type: 'Consumer<? super T>', description: 'Action to perform on each element' }],
                    documentation: 'Performs an action for each element of this stream',
                    examples: ['stream.forEach(System.out::println)']
                },
                {
                    name: 'collect',
                    returnType: 'R',
                    parameters: [{ name: 'collector', type: 'Collector<? super T,A,R>', description: 'Collector to use' }],
                    documentation: 'Performs a mutable reduction operation on the elements using a Collector',
                    examples: ['stream.collect(Collectors.toList())']
                },
                {
                    name: 'reduce',
                    returnType: 'Optional<T>',
                    parameters: [{ name: 'accumulator', type: 'BinaryOperator<T>', description: 'Associative accumulation function' }],
                    documentation: 'Performs a reduction on the elements using an associative accumulation function',
                    examples: ['stream.reduce((a, b) -> a + b)']
                },
                {
                    name: 'findFirst',
                    returnType: 'Optional<T>',
                    parameters: [],
                    documentation: 'Returns an Optional describing the first element of this stream',
                    examples: ['stream.findFirst()']
                },
                {
                    name: 'findAny',
                    returnType: 'Optional<T>',
                    parameters: [],
                    documentation: 'Returns an Optional describing some element of the stream',
                    examples: ['stream.findAny()']
                },
                {
                    name: 'anyMatch',
                    returnType: 'boolean',
                    parameters: [{ name: 'predicate', type: 'Predicate<? super T>', description: 'Predicate to apply to elements' }],
                    documentation: 'Returns whether any elements match the provided predicate',
                    examples: ['stream.anyMatch(x -> x > 0)']
                },
                {
                    name: 'allMatch',
                    returnType: 'boolean',
                    parameters: [{ name: 'predicate', type: 'Predicate<? super T>', description: 'Predicate to apply to elements' }],
                    documentation: 'Returns whether all elements match the provided predicate',
                    examples: ['stream.allMatch(x -> x > 0)']
                },
                {
                    name: 'noneMatch',
                    returnType: 'boolean',
                    parameters: [{ name: 'predicate', type: 'Predicate<? super T>', description: 'Predicate to apply to elements' }],
                    documentation: 'Returns whether no elements match the provided predicate',
                    examples: ['stream.noneMatch(x -> x < 0)']
                },
                {
                    name: 'count',
                    returnType: 'long',
                    parameters: [],
                    documentation: 'Returns the count of elements in this stream',
                    examples: ['stream.count()']
                }
            ],
            staticMethods: [
                {
                    name: 'of',
                    returnType: 'Stream<T>',
                    parameters: [{ name: 'values', type: 'T...', description: 'Elements of the new stream' }],
                    documentation: 'Returns a sequential ordered stream whose elements are the specified values',
                    examples: ['Stream.of("a", "b", "c")'],
                    isStatic: true
                },
                {
                    name: 'empty',
                    returnType: 'Stream<T>',
                    parameters: [],
                    documentation: 'Returns an empty sequential Stream',
                    examples: ['Stream.empty()'],
                    isStatic: true
                }
            ],
            fields: []
        });

        // Collectors utility class
        this.classes.set('Collectors', {
            name: 'Collectors',
            package: 'java.util.stream',
            documentation: 'Implementations of Collector that implement various useful reduction operations',
            since: '8',
            methods: [],
            staticMethods: [
                {
                    name: 'toList',
                    returnType: 'Collector<T,?,List<T>>',
                    parameters: [],
                    documentation: 'Returns a Collector that accumulates the input elements into a new List',
                    examples: ['stream.collect(Collectors.toList())'],
                    isStatic: true
                },
                {
                    name: 'toSet',
                    returnType: 'Collector<T,?,Set<T>>',
                    parameters: [],
                    documentation: 'Returns a Collector that accumulates the input elements into a new Set',
                    examples: ['stream.collect(Collectors.toSet())'],
                    isStatic: true
                },
                {
                    name: 'toMap',
                    returnType: 'Collector<T,?,Map<K,U>>',
                    parameters: [
                        { name: 'keyMapper', type: 'Function<? super T,? extends K>', description: 'Mapping function to produce keys' },
                        { name: 'valueMapper', type: 'Function<? super T,? extends U>', description: 'Mapping function to produce values' }
                    ],
                    documentation: 'Returns a Collector that accumulates elements into a Map',
                    examples: ['stream.collect(Collectors.toMap(Person::getName, Person::getAge))'],
                    isStatic: true
                },
                {
                    name: 'joining',
                    returnType: 'Collector<CharSequence,?,String>',
                    parameters: [{ name: 'delimiter', type: 'CharSequence', description: 'Delimiter to use between elements', optional: true }],
                    documentation: 'Returns a Collector that concatenates the input elements into a String',
                    examples: ['stream.collect(Collectors.joining(", "))'],
                    isStatic: true
                },
                {
                    name: 'groupingBy',
                    returnType: 'Collector<T,?,Map<K,List<T>>>',
                    parameters: [{ name: 'classifier', type: 'Function<? super T,? extends K>', description: 'Classifier function mapping input elements to keys' }],
                    documentation: 'Returns a Collector implementing a "group by" operation on input elements',
                    examples: ['stream.collect(Collectors.groupingBy(Person::getCity))'],
                    isStatic: true
                },
                {
                    name: 'counting',
                    returnType: 'Collector<T,?,Long>',
                    parameters: [],
                    documentation: 'Returns a Collector accepting elements that counts the number of input elements',
                    examples: ['stream.collect(Collectors.counting())'],
                    isStatic: true
                },
                {
                    name: 'summingInt',
                    returnType: 'Collector<T,?,Integer>',
                    parameters: [{ name: 'mapper', type: 'ToIntFunction<? super T>', description: 'Function extracting the property to be summed' }],
                    documentation: 'Returns a Collector that produces the sum of an integer-valued function',
                    examples: ['stream.collect(Collectors.summingInt(Person::getAge))'],
                    isStatic: true
                },
                {
                    name: 'averagingInt',
                    returnType: 'Collector<T,?,Double>',
                    parameters: [{ name: 'mapper', type: 'ToIntFunction<? super T>', description: 'Function extracting the property to be averaged' }],
                    documentation: 'Returns a Collector that produces the arithmetic mean of an integer-valued function',
                    examples: ['stream.collect(Collectors.averagingInt(Person::getAge))'],
                    isStatic: true
                }
            ],
            fields: []
        });
    }    pri
vate static initializeUtilityClasses(): void {
        // Arrays utility class
        this.classes.set('Arrays', {
            name: 'Arrays',
            package: 'java.util',
            documentation: 'Utility methods for manipulating arrays',
            methods: [],
            staticMethods: [
                {
                    name: 'asList',
                    returnType: 'List<T>',
                    parameters: [{ name: 'a', type: 'T...', description: 'Array to convert to list' }],
                    documentation: 'Returns a fixed-size list backed by the specified array',
                    examples: ['Arrays.asList("a", "b", "c")'],
                    isStatic: true
                },
                {
                    name: 'sort',
                    returnType: 'void',
                    parameters: [{ name: 'a', type: 'Object[]', description: 'Array to sort' }],
                    documentation: 'Sorts the specified array into ascending order',
                    examples: ['Arrays.sort(array)'],
                    isStatic: true
                },
                {
                    name: 'binarySearch',
                    returnType: 'int',
                    parameters: [
                        { name: 'a', type: 'Object[]', description: 'Array to search' },
                        { name: 'key', type: 'Object', description: 'Value to search for' }
                    ],
                    documentation: 'Searches the specified array for the specified object using binary search',
                    examples: ['Arrays.binarySearch(array, key)'],
                    isStatic: true
                },
                {
                    name: 'copyOf',
                    returnType: 'T[]',
                    parameters: [
                        { name: 'original', type: 'T[]', description: 'Array to copy' },
                        { name: 'newLength', type: 'int', description: 'Length of the copy' }
                    ],
                    documentation: 'Copies the specified array, truncating or padding with nulls',
                    examples: ['Arrays.copyOf(original, newLength)'],
                    isStatic: true
                },
                {
                    name: 'copyOfRange',
                    returnType: 'T[]',
                    parameters: [
                        { name: 'original', type: 'T[]', description: 'Array to copy' },
                        { name: 'from', type: 'int', description: 'Initial index of range to copy' },
                        { name: 'to', type: 'int', description: 'Final index of range to copy' }
                    ],
                    documentation: 'Copies the specified range of the specified array into a new array',
                    examples: ['Arrays.copyOfRange(original, 0, 5)'],
                    isStatic: true
                },
                {
                    name: 'equals',
                    returnType: 'boolean',
                    parameters: [
                        { name: 'a', type: 'Object[]', description: 'First array to compare' },
                        { name: 'a2', type: 'Object[]', description: 'Second array to compare' }
                    ],
                    documentation: 'Returns true if the two specified arrays are equal to one another',
                    examples: ['Arrays.equals(array1, array2)'],
                    isStatic: true
                },
                {
                    name: 'fill',
                    returnType: 'void',
                    parameters: [
                        { name: 'a', type: 'Object[]', description: 'Array to fill' },
                        { name: 'val', type: 'Object', description: 'Value to store in all elements' }
                    ],
                    documentation: 'Assigns the specified value to each element of the specified array',
                    examples: ['Arrays.fill(array, value)'],
                    isStatic: true
                },
                {
                    name: 'toString',
                    returnType: 'String',
                    parameters: [{ name: 'a', type: 'Object[]', description: 'Array to convert to string' }],
                    documentation: 'Returns a string representation of the contents of the specified array',
                    examples: ['Arrays.toString(array)'],
                    isStatic: true
                },
                {
                    name: 'stream',
                    returnType: 'Stream<T>',
                    parameters: [{ name: 'array', type: 'T[]', description: 'Array to create stream from' }],
                    documentation: 'Returns a sequential Stream with the specified array as its source',
                    examples: ['Arrays.stream(array)'],
                    isStatic: true,
                    since: '8'
                }
            ],
            fields: []
        });

        // Objects utility class
        this.classes.set('Objects', {
            name: 'Objects',
            package: 'java.util',
            documentation: 'Utility methods for operating on objects',
            since: '7',
            methods: [],
            staticMethods: [
                {
                    name: 'equals',
                    returnType: 'boolean',
                    parameters: [
                        { name: 'a', type: 'Object', description: 'First object to compare' },
                        { name: 'b', type: 'Object', description: 'Second object to compare' }
                    ],
                    documentation: 'Returns true if the arguments are equal to each other and false otherwise',
                    examples: ['Objects.equals(obj1, obj2)'],
                    isStatic: true
                },
                {
                    name: 'hash',
                    returnType: 'int',
                    parameters: [{ name: 'values', type: 'Object...', description: 'Values to compute hash of' }],
                    documentation: 'Generates a hash code for a sequence of input values',
                    examples: ['Objects.hash(field1, field2, field3)'],
                    isStatic: true
                },
                {
                    name: 'hashCode',
                    returnType: 'int',
                    parameters: [{ name: 'o', type: 'Object', description: 'Object to compute hash code for' }],
                    documentation: 'Returns the hash code of a non-null argument and 0 for a null argument',
                    examples: ['Objects.hashCode(obj)'],
                    isStatic: true
                },
                {
                    name: 'isNull',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Object to check' }],
                    documentation: 'Returns true if the provided reference is null otherwise returns false',
                    examples: ['Objects.isNull(obj)'],
                    isStatic: true,
                    since: '8'
                },
                {
                    name: 'nonNull',
                    returnType: 'boolean',
                    parameters: [{ name: 'obj', type: 'Object', description: 'Object to check' }],
                    documentation: 'Returns true if the provided reference is non-null otherwise returns false',
                    examples: ['Objects.nonNull(obj)'],
                    isStatic: true,
                    since: '8'
                },
                {
                    name: 'requireNonNull',
                    returnType: 'T',
                    parameters: [{ name: 'obj', type: 'T', description: 'Object to check for nullity' }],
                    documentation: 'Checks that the specified object reference is not null',
                    examples: ['Objects.requireNonNull(obj)'],
                    isStatic: true
                },
                {
                    name: 'toString',
                    returnType: 'String',
                    parameters: [
                        { name: 'o', type: 'Object', description: 'Object to convert to string' },
                        { name: 'nullDefault', type: 'String', description: 'String to return if object is null', optional: true }
                    ],
                    documentation: 'Returns the result of calling toString on the first argument if not null',
                    examples: ['Objects.toString(obj, "null")'],
                    isStatic: true
                }
            ],
            fields: []
        });
    }

    private static initializeMathClasses(): void {
        // Math class
        this.classes.set('Math', {
            name: 'Math',
            package: 'java.lang',
            documentation: 'Mathematical functions and constants',
            methods: [],
            staticMethods: [
                {
                    name: 'abs',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Value whose absolute value is to be returned' }],
                    documentation: 'Returns the absolute value of a double value',
                    examples: ['Math.abs(-5.5)'],
                    isStatic: true
                },
                {
                    name: 'max',
                    returnType: 'double',
                    parameters: [
                        { name: 'a', type: 'double', description: 'First value' },
                        { name: 'b', type: 'double', description: 'Second value' }
                    ],
                    documentation: 'Returns the greater of two double values',
                    examples: ['Math.max(10.5, 20.3)'],
                    isStatic: true
                },
                {
                    name: 'min',
                    returnType: 'double',
                    parameters: [
                        { name: 'a', type: 'double', description: 'First value' },
                        { name: 'b', type: 'double', description: 'Second value' }
                    ],
                    documentation: 'Returns the smaller of two double values',
                    examples: ['Math.min(10.5, 20.3)'],
                    isStatic: true
                },
                {
                    name: 'pow',
                    returnType: 'double',
                    parameters: [
                        { name: 'a', type: 'double', description: 'Base' },
                        { name: 'b', type: 'double', description: 'Exponent' }
                    ],
                    documentation: 'Returns the value of the first argument raised to the power of the second argument',
                    examples: ['Math.pow(2, 3)'],
                    isStatic: true
                },
                {
                    name: 'sqrt',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Value to compute square root of' }],
                    documentation: 'Returns the correctly rounded positive square root of a double value',
                    examples: ['Math.sqrt(16)'],
                    isStatic: true
                },
                {
                    name: 'ceil',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Value to round up' }],
                    documentation: 'Returns the smallest double value that is greater than or equal to the argument',
                    examples: ['Math.ceil(4.3)'],
                    isStatic: true
                },
                {
                    name: 'floor',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Value to round down' }],
                    documentation: 'Returns the largest double value that is less than or equal to the argument',
                    examples: ['Math.floor(4.7)'],
                    isStatic: true
                },
                {
                    name: 'round',
                    returnType: 'long',
                    parameters: [{ name: 'a', type: 'double', description: 'Value to round' }],
                    documentation: 'Returns the closest long to the argument',
                    examples: ['Math.round(4.6)'],
                    isStatic: true
                },
                {
                    name: 'random',
                    returnType: 'double',
                    parameters: [],
                    documentation: 'Returns a double value with a positive sign, greater than or equal to 0.0 and less than 1.0',
                    examples: ['Math.random()'],
                    isStatic: true
                },
                {
                    name: 'sin',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Angle in radians' }],
                    documentation: 'Returns the trigonometric sine of an angle',
                    examples: ['Math.sin(Math.PI / 2)'],
                    isStatic: true
                },
                {
                    name: 'cos',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Angle in radians' }],
                    documentation: 'Returns the trigonometric cosine of an angle',
                    examples: ['Math.cos(0)'],
                    isStatic: true
                },
                {
                    name: 'tan',
                    returnType: 'double',
                    parameters: [{ name: 'a', type: 'double', description: 'Angle in radians' }],
                    documentation: 'Returns the trigonometric tangent of an angle',
                    examples: ['Math.tan(Math.PI / 4)'],
                    isStatic: true
                }
            ],
            fields: [
                {
                    name: 'PI',
                    type: 'double',
                    documentation: 'The double value that is closer than any other to pi, the ratio of the circumference of a circle to its diameter',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'E',
                    type: 'double',
                    documentation: 'The double value that is closer than any other to e, the base of the natural logarithms',
                    isStatic: true,
                    isFinal: true
                }
            ]
        });

        // BigDecimal class
        this.classes.set('BigDecimal', {
            name: 'BigDecimal',
            package: 'java.math',
            documentation: 'Immutable, arbitrary-precision signed decimal numbers',
            methods: [
                {
                    name: 'add',
                    returnType: 'BigDecimal',
                    parameters: [{ name: 'augend', type: 'BigDecimal', description: 'Value to add to this BigDecimal' }],
                    documentation: 'Returns a BigDecimal whose value is (this + augend)',
                    examples: ['decimal.add(other)']
                },
                {
                    name: 'subtract',
                    returnType: 'BigDecimal',
                    parameters: [{ name: 'subtrahend', type: 'BigDecimal', description: 'Value to subtract from this BigDecimal' }],
                    documentation: 'Returns a BigDecimal whose value is (this - subtrahend)',
                    examples: ['decimal.subtract(other)']
                },
                {
                    name: 'multiply',
                    returnType: 'BigDecimal',
                    parameters: [{ name: 'multiplicand', type: 'BigDecimal', description: 'Value to multiply by this BigDecimal' }],
                    documentation: 'Returns a BigDecimal whose value is (this × multiplicand)',
                    examples: ['decimal.multiply(other)']
                },
                {
                    name: 'divide',
                    returnType: 'BigDecimal',
                    parameters: [{ name: 'divisor', type: 'BigDecimal', description: 'Value by which this BigDecimal is to be divided' }],
                    documentation: 'Returns a BigDecimal whose value is (this / divisor)',
                    examples: ['decimal.divide(other)']
                },
                {
                    name: 'compareTo',
                    returnType: 'int',
                    parameters: [{ name: 'val', type: 'BigDecimal', description: 'BigDecimal to compare with' }],
                    documentation: 'Compares this BigDecimal with the specified BigDecimal',
                    examples: ['decimal.compareTo(other)']
                },
                {
                    name: 'equals',
                    returnType: 'boolean',
                    parameters: [{ name: 'x', type: 'Object', description: 'Object to compare with' }],
                    documentation: 'Compares this BigDecimal with the specified Object for equality',
                    examples: ['decimal.equals(other)']
                },
                {
                    name: 'doubleValue',
                    returnType: 'double',
                    parameters: [],
                    documentation: 'Converts this BigDecimal to a double',
                    examples: ['decimal.doubleValue()']
                },
                {
                    name: 'intValue',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Converts this BigDecimal to an int',
                    examples: ['decimal.intValue()']
                },
                {
                    name: 'toString',
                    returnType: 'String',
                    parameters: [],
                    documentation: 'Returns the string representation of this BigDecimal',
                    examples: ['decimal.toString()']
                }
            ],
            staticMethods: [
                {
                    name: 'valueOf',
                    returnType: 'BigDecimal',
                    parameters: [{ name: 'val', type: 'double', description: 'Double value to convert' }],
                    documentation: 'Translates a double into a BigDecimal',
                    examples: ['BigDecimal.valueOf(123.45)'],
                    isStatic: true
                }
            ],
            fields: [
                {
                    name: 'ZERO',
                    type: 'BigDecimal',
                    documentation: 'The value 0, with a scale of 0',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'ONE',
                    type: 'BigDecimal',
                    documentation: 'The value 1, with a scale of 0',
                    isStatic: true,
                    isFinal: true
                },
                {
                    name: 'TEN',
                    type: 'BigDecimal',
                    documentation: 'The value 10, with a scale of 0',
                    isStatic: true,
                    isFinal: true
                }
            ]
        });
    }

    private static initializeIOClasses(): void {
        // StringBuilder class
        this.classes.set('StringBuilder', {
            name: 'StringBuilder',
            package: 'java.lang',
            documentation: 'A mutable sequence of characters',
            methods: [
                {
                    name: 'append',
                    returnType: 'StringBuilder',
                    parameters: [{ name: 'str', type: 'String', description: 'String to append' }],
                    documentation: 'Appends the specified string to this character sequence',
                    examples: ['sb.append("text")']
                },
                {
                    name: 'insert',
                    returnType: 'StringBuilder',
                    parameters: [
                        { name: 'offset', type: 'int', description: 'Offset at which to insert' },
                        { name: 'str', type: 'String', description: 'String to insert' }
                    ],
                    documentation: 'Inserts the string into this character sequence',
                    examples: ['sb.insert(0, "prefix")']
                },
                {
                    name: 'delete',
                    returnType: 'StringBuilder',
                    parameters: [
                        { name: 'start', type: 'int', description: 'Starting index' },
                        { name: 'end', type: 'int', description: 'Ending index' }
                    ],
                    documentation: 'Removes the characters in a substring of this sequence',
                    examples: ['sb.delete(0, 5)']
                },
                {
                    name: 'reverse',
                    returnType: 'StringBuilder',
                    parameters: [],
                    documentation: 'Causes this character sequence to be replaced by the reverse of the sequence',
                    examples: ['sb.reverse()']
                },
                {
                    name: 'toString',
                    returnType: 'String',
                    parameters: [],
                    documentation: 'Returns a string representing the data in this sequence',
                    examples: ['sb.toString()']
                },
                {
                    name: 'length',
                    returnType: 'int',
                    parameters: [],
                    documentation: 'Returns the length (character count)',
                    examples: ['sb.length()']
                },
                {
                    name: 'setLength',
                    returnType: 'void',
                    parameters: [{ name: 'newLength', type: 'int', description: 'New length' }],
                    documentation: 'Sets the length of the character sequence',
                    examples: ['sb.setLength(10)']
                }
            ],
            staticMethods: [],
            fields: []
        });
    }
}