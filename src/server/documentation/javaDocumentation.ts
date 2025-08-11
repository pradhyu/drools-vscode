/**
 * Static Java 24 API documentation for offline hover support
 * Based on Java 24 API documentation
 */

export interface JavaMethodDoc {
    className: string;
    methodName: string;
    description: string;
    parameters: Array<{
        name: string;
        type: string;
        description: string;
    }>;
    returnType: string;
    example: string;
    since?: string;
    deprecated?: boolean;
    exceptions?: string[];
}

export interface JavaClassDoc {
    className: string;
    packageName: string;
    description: string;
    since?: string;
    deprecated?: boolean;
    commonMethods: string[];
    example: string;
}

export class JavaDocumentation {
    private static readonly CLASSES: Map<string, JavaClassDoc> = new Map([
        ['System', {
            className: 'System',
            packageName: 'java.lang',
            description: 'The System class contains several useful class fields and methods. It cannot be instantiated.',
            since: '1.0',
            commonMethods: ['out.println', 'out.print', 'currentTimeMillis', 'getProperty'],
            example: `System.out.println("Hello World");
long time = System.currentTimeMillis();
String javaVersion = System.getProperty("java.version");`
        }],
        
        ['String', {
            className: 'String',
            packageName: 'java.lang',
            description: 'The String class represents character strings. All string literals are instances of this class.',
            since: '1.0',
            commonMethods: ['length', 'charAt', 'substring', 'indexOf', 'equals', 'toLowerCase', 'toUpperCase'],
            example: `String text = "Hello World";
int length = text.length();
String upper = text.toUpperCase();
boolean equals = text.equals("Hello World");`
        }],
        
        ['Integer', {
            className: 'Integer',
            packageName: 'java.lang',
            description: 'The Integer class wraps a value of the primitive type int in an object.',
            since: '1.0',
            commonMethods: ['valueOf', 'parseInt', 'toString', 'intValue'],
            example: `Integer num = Integer.valueOf(42);
int parsed = Integer.parseInt("123");
String str = Integer.toString(456);`
        }],
        
        ['Double', {
            className: 'Double',
            packageName: 'java.lang',
            description: 'The Double class wraps a value of the primitive type double in an object.',
            since: '1.0',
            commonMethods: ['valueOf', 'parseDouble', 'toString', 'doubleValue'],
            example: `Double num = Double.valueOf(3.14);
double parsed = Double.parseDouble("2.71");
String str = Double.toString(1.41);`
        }],
        
        ['Boolean', {
            className: 'Boolean',
            packageName: 'java.lang',
            description: 'The Boolean class wraps a value of the primitive type boolean in an object.',
            since: '1.0',
            commonMethods: ['valueOf', 'parseBoolean', 'toString', 'booleanValue'],
            example: `Boolean bool = Boolean.valueOf(true);
boolean parsed = Boolean.parseBoolean("false");
String str = Boolean.toString(true);`
        }],
        
        ['List', {
            className: 'List',
            packageName: 'java.util',
            description: 'An ordered collection (also known as a sequence). Lists may contain duplicate elements.',
            since: '1.2',
            commonMethods: ['add', 'get', 'size', 'remove', 'contains', 'isEmpty'],
            example: `List<String> list = new ArrayList<>();
list.add("item1");
String item = list.get(0);
int size = list.size();`
        }],
        
        ['ArrayList', {
            className: 'ArrayList',
            packageName: 'java.util',
            description: 'Resizable-array implementation of the List interface. Not synchronized.',
            since: '1.2',
            commonMethods: ['add', 'get', 'size', 'remove', 'contains', 'clear'],
            example: `ArrayList<String> list = new ArrayList<>();
list.add("Hello");
list.add("World");
String first = list.get(0);`
        }],
        
        ['Map', {
            className: 'Map',
            packageName: 'java.util',
            description: 'An object that maps keys to values. Cannot contain duplicate keys.',
            since: '1.2',
            commonMethods: ['put', 'get', 'containsKey', 'containsValue', 'size', 'keySet'],
            example: `Map<String, Integer> map = new HashMap<>();
map.put("key1", 100);
Integer value = map.get("key1");
boolean hasKey = map.containsKey("key1");`
        }],
        
        ['HashMap', {
            className: 'HashMap',
            packageName: 'java.util',
            description: 'Hash table based implementation of the Map interface. Not synchronized.',
            since: '1.2',
            commonMethods: ['put', 'get', 'containsKey', 'remove', 'size', 'clear'],
            example: `HashMap<String, String> map = new HashMap<>();
map.put("name", "John");
String name = map.get("name");`
        }],
        
        ['Date', {
            className: 'Date',
            packageName: 'java.util',
            description: 'The class Date represents a specific instant in time, with millisecond precision.',
            since: '1.0',
            commonMethods: ['getTime', 'setTime', 'before', 'after', 'equals'],
            example: `Date now = new Date();
long timestamp = now.getTime();
Date other = new Date(timestamp);
boolean isBefore = now.before(other);`
        }],
        
        ['Math', {
            className: 'Math',
            packageName: 'java.lang',
            description: 'The class Math contains methods for performing basic numeric operations.',
            since: '1.0',
            commonMethods: ['abs', 'max', 'min', 'round', 'sqrt', 'pow'],
            example: `int abs = Math.abs(-5);
double max = Math.max(3.14, 2.71);
double sqrt = Math.sqrt(16);
double power = Math.pow(2, 3);`
        }]
    ]);

    private static readonly METHODS: Map<string, JavaMethodDoc> = new Map([
        ['System.out.println', {
            className: 'System',
            methodName: 'out.println',
            description: 'Prints the argument and then terminates the line.',
            parameters: [
                { name: 'x', type: 'Object', description: 'The value to be printed' }
            ],
            returnType: 'void',
            example: `System.out.println("Hello World");
System.out.println(42);
System.out.println(customer.getName());`
        }],
        
        ['System.out.print', {
            className: 'System',
            methodName: 'out.print',
            description: 'Prints the argument without terminating the line.',
            parameters: [
                { name: 'x', type: 'Object', description: 'The value to be printed' }
            ],
            returnType: 'void',
            example: `System.out.print("Hello ");
System.out.print("World");
// Output: Hello World`
        }],
        
        ['System.currentTimeMillis', {
            className: 'System',
            methodName: 'currentTimeMillis',
            description: 'Returns the current time in milliseconds since January 1, 1970 UTC.',
            parameters: [],
            returnType: 'long',
            example: `long startTime = System.currentTimeMillis();
// ... some operation ...
long endTime = System.currentTimeMillis();
long duration = endTime - startTime;`
        }],
        
        ['String.length', {
            className: 'String',
            methodName: 'length',
            description: 'Returns the length of this string.',
            parameters: [],
            returnType: 'int',
            example: `String text = "Hello World";
int length = text.length(); // returns 11`
        }],
        
        ['String.substring', {
            className: 'String',
            methodName: 'substring',
            description: 'Returns a substring of this string.',
            parameters: [
                { name: 'beginIndex', type: 'int', description: 'The beginning index, inclusive' },
                { name: 'endIndex', type: 'int', description: 'The ending index, exclusive' }
            ],
            returnType: 'String',
            example: `String text = "Hello World";
String sub1 = text.substring(6); // "World"
String sub2 = text.substring(0, 5); // "Hello"`
        }],
        
        ['String.equals', {
            className: 'String',
            methodName: 'equals',
            description: 'Compares this string to the specified object for equality.',
            parameters: [
                { name: 'anObject', type: 'Object', description: 'The object to compare this String against' }
            ],
            returnType: 'boolean',
            example: `String str1 = "Hello";
String str2 = "Hello";
boolean isEqual = str1.equals(str2); // true
boolean isEqual2 = str1.equals("World"); // false`
        }],
        
        ['String.indexOf', {
            className: 'String',
            methodName: 'indexOf',
            description: 'Returns the index of the first occurrence of the specified character.',
            parameters: [
                { name: 'ch', type: 'int', description: 'A character (Unicode code point)' }
            ],
            returnType: 'int',
            example: `String text = "Hello World";
int index = text.indexOf('o'); // returns 4
int index2 = text.indexOf('x'); // returns -1 (not found)`
        }],
        
        ['String.toLowerCase', {
            className: 'String',
            methodName: 'toLowerCase',
            description: 'Returns a string with all characters converted to lowercase.',
            parameters: [],
            returnType: 'String',
            example: `String text = "Hello World";
String lower = text.toLowerCase(); // "hello world"`
        }],
        
        ['String.toUpperCase', {
            className: 'String',
            methodName: 'toUpperCase',
            description: 'Returns a string with all characters converted to uppercase.',
            parameters: [],
            returnType: 'String',
            example: `String text = "Hello World";
String upper = text.toUpperCase(); // "HELLO WORLD"`
        }],
        
        ['Integer.parseInt', {
            className: 'Integer',
            methodName: 'parseInt',
            description: 'Parses the string argument as a signed decimal integer.',
            parameters: [
                { name: 's', type: 'String', description: 'A String containing the int representation to be parsed' }
            ],
            returnType: 'int',
            example: `int num = Integer.parseInt("123"); // returns 123
int hex = Integer.parseInt("FF", 16); // returns 255`,
            exceptions: ['NumberFormatException']
        }],
        
        ['Integer.valueOf', {
            className: 'Integer',
            methodName: 'valueOf',
            description: 'Returns an Integer instance representing the specified int value.',
            parameters: [
                { name: 'i', type: 'int', description: 'An int value' }
            ],
            returnType: 'Integer',
            example: `Integer num = Integer.valueOf(42);
Integer parsed = Integer.valueOf("123");`
        }],
        
        ['List.add', {
            className: 'List',
            methodName: 'add',
            description: 'Appends the specified element to the end of this list.',
            parameters: [
                { name: 'e', type: 'E', description: 'Element to be appended to this list' }
            ],
            returnType: 'boolean',
            example: `List<String> list = new ArrayList<>();
list.add("Hello");
list.add("World");`
        }],
        
        ['List.get', {
            className: 'List',
            methodName: 'get',
            description: 'Returns the element at the specified position in this list.',
            parameters: [
                { name: 'index', type: 'int', description: 'Index of the element to return' }
            ],
            returnType: 'E',
            example: `List<String> list = Arrays.asList("A", "B", "C");
String first = list.get(0); // returns "A"`,
            exceptions: ['IndexOutOfBoundsException']
        }],
        
        ['List.size', {
            className: 'List',
            methodName: 'size',
            description: 'Returns the number of elements in this list.',
            parameters: [],
            returnType: 'int',
            example: `List<String> list = Arrays.asList("A", "B", "C");
int size = list.size(); // returns 3`
        }],
        
        ['Map.put', {
            className: 'Map',
            methodName: 'put',
            description: 'Associates the specified value with the specified key in this map.',
            parameters: [
                { name: 'key', type: 'K', description: 'Key with which the specified value is to be associated' },
                { name: 'value', type: 'V', description: 'Value to be associated with the specified key' }
            ],
            returnType: 'V',
            example: `Map<String, Integer> map = new HashMap<>();
map.put("age", 25);
map.put("score", 100);`
        }],
        
        ['Map.get', {
            className: 'Map',
            methodName: 'get',
            description: 'Returns the value to which the specified key is mapped.',
            parameters: [
                { name: 'key', type: 'Object', description: 'The key whose associated value is to be returned' }
            ],
            returnType: 'V',
            example: `Map<String, Integer> map = new HashMap<>();
map.put("age", 25);
Integer age = map.get("age"); // returns 25
Integer missing = map.get("height"); // returns null`
        }],
        
        ['Math.abs', {
            className: 'Math',
            methodName: 'abs',
            description: 'Returns the absolute value of the argument.',
            parameters: [
                { name: 'a', type: 'int|long|float|double', description: 'The argument whose absolute value is to be determined' }
            ],
            returnType: 'int|long|float|double',
            example: `int abs1 = Math.abs(-5); // returns 5
double abs2 = Math.abs(-3.14); // returns 3.14`
        }],
        
        ['Math.max', {
            className: 'Math',
            methodName: 'max',
            description: 'Returns the greater of two values.',
            parameters: [
                { name: 'a', type: 'int|long|float|double', description: 'An argument' },
                { name: 'b', type: 'int|long|float|double', description: 'Another argument' }
            ],
            returnType: 'int|long|float|double',
            example: `int max1 = Math.max(5, 10); // returns 10
double max2 = Math.max(3.14, 2.71); // returns 3.14`
        }],
        
        ['Math.min', {
            className: 'Math',
            methodName: 'min',
            description: 'Returns the smaller of two values.',
            parameters: [
                { name: 'a', type: 'int|long|float|double', description: 'An argument' },
                { name: 'b', type: 'int|long|float|double', description: 'Another argument' }
            ],
            returnType: 'int|long|float|double',
            example: `int min1 = Math.min(5, 10); // returns 5
double min2 = Math.min(3.14, 2.71); // returns 2.71`
        }]
    ]);

    /**
     * Get documentation for a Java class
     */
    public static getClassDoc(className: string): JavaClassDoc | null {
        return this.CLASSES.get(className) || null;
    }

    /**
     * Get documentation for a Java method
     */
    public static getMethodDoc(methodSignature: string): JavaMethodDoc | null {
        return this.METHODS.get(methodSignature) || null;
    }

    /**
     * Search for method documentation by class and method name
     */
    public static findMethodDoc(className: string, methodName: string): JavaMethodDoc | null {
        const key = `${className}.${methodName}`;
        return this.getMethodDoc(key);
    }

    /**
     * Get all methods for a class
     */
    public static getClassMethods(className: string): JavaMethodDoc[] {
        return Array.from(this.METHODS.values()).filter(method => method.className === className);
    }

    /**
     * Check if a class is documented
     */
    public static isKnownClass(className: string): boolean {
        return this.CLASSES.has(className);
    }

    /**
     * Check if a method is documented
     */
    public static isKnownMethod(methodSignature: string): boolean {
        return this.METHODS.has(methodSignature);
    }

    /**
     * Search classes and methods by query
     */
    public static search(query: string): { classes: JavaClassDoc[], methods: JavaMethodDoc[] } {
        const lowerQuery = query.toLowerCase();
        
        const classes = Array.from(this.CLASSES.values()).filter(cls =>
            cls.className.toLowerCase().includes(lowerQuery) ||
            cls.description.toLowerCase().includes(lowerQuery)
        );
        
        const methods = Array.from(this.METHODS.values()).filter(method =>
            method.methodName.toLowerCase().includes(lowerQuery) ||
            method.description.toLowerCase().includes(lowerQuery)
        );
        
        return { classes, methods };
    }

    /**
     * Get all available classes
     */
    public static getAllClasses(): string[] {
        return Array.from(this.CLASSES.keys());
    }

    /**
     * Get all available methods
     */
    public static getAllMethods(): string[] {
        return Array.from(this.METHODS.keys());
    }
}