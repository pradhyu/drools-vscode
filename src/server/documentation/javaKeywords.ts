/**
 * Java Keywords and Language Constructs
 * Comprehensive collection of Java keywords, operators, and language features
 */

export class JavaKeywords {
    private static initialized = false;

    // Core Java keywords
    public static readonly KEYWORDS = [
        // Control flow
        'if', 'else', 'switch', 'case', 'default', 'break', 'continue',
        'for', 'while', 'do', 'return',
        
        // Exception handling
        'try', 'catch', 'finally', 'throw', 'throws',
        
        // Class and method modifiers
        'public', 'private', 'protected', 'static', 'final', 'abstract',
        'synchronized', 'volatile', 'transient', 'native', 'strictfp',
        
        // Class definition
        'class', 'interface', 'enum', 'extends', 'implements',
        
        // Variable declaration
        'var', 'const', 'goto', // var is Java 10+, const/goto are reserved
        
        // Data types
        'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double', 'void',
        
        // Object operations
        'new', 'instanceof', 'this', 'super',
        
        // Package and import
        'package', 'import',
        
        // Modern Java keywords (Java 14+)
        'record', 'sealed', 'permits', 'non-sealed', 'yield'
    ];

    // Java literals
    public static readonly LITERALS = [
        'true', 'false', 'null'
    ];

    // Java operators
    public static readonly OPERATORS = [
        // Arithmetic
        '+', '-', '*', '/', '%',
        
        // Assignment
        '=', '+=', '-=', '*=', '/=', '%=',
        
        // Comparison
        '==', '!=', '<', '>', '<=', '>=',
        
        // Logical
        '&&', '||', '!',
        
        // Bitwise
        '&', '|', '^', '~', '<<', '>>', '>>>',
        
        // Ternary
        '?', ':',
        
        // Lambda and method reference
        '->', '::'
    ];

    // Built-in annotations
    public static readonly ANNOTATIONS = [
        '@Override', '@Deprecated', '@SuppressWarnings', '@FunctionalInterface',
        '@SafeVarargs', '@Retention', '@Target', '@Documented', '@Inherited',
        '@Repeatable', '@Native'
    ];

    public static initialize(): void {
        if (this.initialized) return;
        this.initialized = true;
    }

    public static isKeyword(word: string): boolean {
        return this.KEYWORDS.includes(word);
    }

    public static isLiteral(word: string): boolean {
        return this.LITERALS.includes(word);
    }

    public static isOperator(symbol: string): boolean {
        return this.OPERATORS.includes(symbol);
    }

    public static isAnnotation(text: string): boolean {
        return this.ANNOTATIONS.includes(text);
    }
}