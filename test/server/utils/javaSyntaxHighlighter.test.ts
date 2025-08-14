/**
 * Unit tests for Java Syntax Highlighter
 */

import { JavaSyntaxHighlighter } from '../../../src/server/utils/javaSyntaxHighlighter';

describe('JavaSyntaxHighlighter', () => {
    describe('Basic Highlighting', () => {
        test('should highlight Java keywords', () => {
            const code = 'public static void main(String[] args) { if (true) return; }';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**public**');
            expect(result.highlightedCode).toContain('**static**');
            expect(result.highlightedCode).toContain('**void**');
            expect(result.highlightedCode).toContain('**if**');
            expect(result.highlightedCode).toContain('**return**');
        });

        test('should highlight Java literals', () => {
            const code = 'boolean flag = true; Object obj = null; boolean other = false;';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('***true***');
            expect(result.highlightedCode).toContain('***null***');
            expect(result.highlightedCode).toContain('***false***');
        });

        test('should highlight primitive types', () => {
            const code = 'int x = 5; double y = 3.14; boolean flag = true; char c = \'a\';';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**int**');
            expect(result.highlightedCode).toContain('**double**');
            expect(result.highlightedCode).toContain('**boolean**');
            expect(result.highlightedCode).toContain('**char**');
        });

        test('should highlight built-in classes', () => {
            const code = 'String str = "hello"; List<Integer> list = new ArrayList<>();';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*String*');
            expect(result.highlightedCode).toContain('*List*');
            expect(result.highlightedCode).toContain('*Integer*');
            expect(result.highlightedCode).toContain('*ArrayList*');
        });
    });

    describe('String and Number Highlighting', () => {
        test('should highlight string literals', () => {
            const code = 'String str = "hello world"; char c = \'x\';';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('`"hello world"`');
            expect(result.highlightedCode).toContain("`'x'`");
        });

        test('should highlight different number formats', () => {
            const code = 'int dec = 42; int hex = 0xFF; int bin = 0b1010; long big = 123L;';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('`42`');
            expect(result.highlightedCode).toContain('`0xFF`');
            expect(result.highlightedCode).toContain('`0b1010`');
            expect(result.highlightedCode).toContain('`123L`');
        });

        test('should highlight floating point numbers', () => {
            const code = 'double pi = 3.14159; float f = 2.5f; double exp = 1.23e-4;';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('`3.14159`');
            expect(result.highlightedCode).toContain('`2.5f`');
            expect(result.highlightedCode).toContain('`1.23e-4`');
        });
    });

    describe('Modern Java Features', () => {
        test('should highlight lambda expressions', () => {
            const code = 'list.stream().filter(x -> x > 0).map(x -> x * 2)';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**->**');
        });

        test('should highlight method references', () => {
            const code = 'list.stream().map(String::toUpperCase).forEach(System.out::println)';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**::**');
        });

        test('should highlight var keyword', () => {
            const code = 'var list = new ArrayList<String>(); var map = new HashMap<>();';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**var**');
        });

        test('should highlight Optional usage', () => {
            const code = 'Optional<String> opt = Optional.of("test"); opt.ifPresent(System.out::println);';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*Optional*');
        });

        test('should highlight Stream operations', () => {
            const code = 'stream.filter(x -> x > 0).map(String::valueOf).collect(Collectors.toList())';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*stream*');
            expect(result.highlightedCode).toContain('*Collectors*');
        });

        test('should highlight time API classes', () => {
            const code = 'LocalDate date = LocalDate.now(); LocalDateTime dt = LocalDateTime.of(2023, 12, 25, 10, 30);';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*LocalDate*');
            expect(result.highlightedCode).toContain('*LocalDateTime*');
        });
    });

    describe('Comments', () => {
        test('should highlight single-line comments', () => {
            const code = 'int x = 5; // This is a comment';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*// This is a comment*');
        });

        test('should highlight multi-line comments', () => {
            const code = 'int x = 5; /* This is a comment */ int y = 10;';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*/* This is a comment */*');
        });
    });

    describe('Operators', () => {
        test('should highlight comparison operators', () => {
            const code = 'if (x == y && a != b || c <= d && e >= f) return true;';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**==**');
            expect(result.highlightedCode).toContain('**!=**');
            expect(result.highlightedCode).toContain('**<=**');
            expect(result.highlightedCode).toContain('**>=**');
            expect(result.highlightedCode).toContain('**&&**');
            expect(result.highlightedCode).toContain('**||**');
        });

        test('should highlight assignment operators', () => {
            const code = 'x += 5; y -= 3; z *= 2; w /= 4;';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**+=**');
            expect(result.highlightedCode).toContain('**-=**');
            expect(result.highlightedCode).toContain('***=**');
            expect(result.highlightedCode).toContain('**/=**');
        });
    });

    describe('Collections Framework', () => {
        test('should highlight collection classes', () => {
            const code = 'List<String> list = new ArrayList<>(); Map<String, Integer> map = new HashMap<>();';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*List*');
            expect(result.highlightedCode).toContain('*ArrayList*');
            expect(result.highlightedCode).toContain('*Map*');
            expect(result.highlightedCode).toContain('*HashMap*');
        });

        test('should highlight Collections utility class', () => {
            const code = 'Collections.sort(list); Collections.reverse(list);';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*Collections*');
        });
    });

    describe('Exception Handling', () => {
        test('should highlight exception handling keywords', () => {
            const code = 'try { doSomething(); } catch (Exception e) { throw new RuntimeException(e); } finally { cleanup(); }';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('**try**');
            expect(result.highlightedCode).toContain('**catch**');
            expect(result.highlightedCode).toContain('**throw**');
            expect(result.highlightedCode).toContain('**finally**');
        });

        test('should highlight exception classes', () => {
            const code = 'catch (IOException | IllegalArgumentException e) { }';
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*IOException*');
            expect(result.highlightedCode).toContain('*IllegalArgumentException*');
        });
    });

    describe('Utility Methods', () => {
        test('should detect modern Java features', () => {
            const modernCode = 'var list = List.of("a", "b"); Optional<String> opt = Optional.empty();';
            const classicCode = 'List<String> list = new ArrayList<String>();';
            
            expect(JavaSyntaxHighlighter.hasModernJavaFeatures(modernCode)).toBe(true);
            expect(JavaSyntaxHighlighter.hasModernJavaFeatures(classicCode)).toBe(false);
        });

        test('should extract lambda expressions', () => {
            const code = 'list.stream().filter(x -> x > 0).map(item -> item.toString())';
            const lambdas = JavaSyntaxHighlighter.extractLambdaExpressions(code);
            
            expect(lambdas).toHaveLength(2);
            expect(lambdas[0]).toContain('x -> x > 0');
            expect(lambdas[1]).toContain('item -> item.toString()');
        });

        test('should extract multi-line lambda expressions', () => {
            const multiLineCode = `list.stream()
                .filter(item -> item.getValue() > 0 &&
                               item.getName() != null)
                .map(item -> {
                    return item.toString();
                })`;
            const lambdas = JavaSyntaxHighlighter.extractLambdaExpressions(multiLineCode);
            
            expect(lambdas).toHaveLength(2);
            expect(lambdas[0]).toContain('item.getValue() > 0 &&');
            expect(lambdas[0]).toContain('getName() != null');
            expect(lambdas[1]).toContain('item -> {');
            expect(lambdas[1]).toContain('return item.toString();');
        });

        test('should extract method references', () => {
            const code = 'list.stream().map(String::toUpperCase).forEach(System.out::println)';
            const methodRefs = JavaSyntaxHighlighter.extractMethodReferences(code);
            
            expect(methodRefs).toHaveLength(2);
            expect(methodRefs).toContain('String::toUpperCase');
            expect(methodRefs).toContain('System.out::println');
        });

        test('should highlight for markdown', () => {
            const code = 'String str = "hello"; int x = 42;';
            const highlighted = JavaSyntaxHighlighter.highlightForMarkdown(code);
            
            expect(highlighted).toContain('*String*');
            expect(highlighted).toContain('`"hello"`');
            expect(highlighted).toContain('**int**');
            expect(highlighted).toContain('`42`');
        });
    });

    describe('Complex Code Examples', () => {
        test('should highlight complex stream operations', () => {
            const code = `
                list.stream()
                    .filter(item -> item.getValue() > 0)
                    .map(Item::getName)
                    .collect(Collectors.toList())
                    .forEach(System.out::println);
            `;
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*stream*');
            expect(result.highlightedCode).toContain('**->**');
            expect(result.highlightedCode).toContain('**::**');
            expect(result.highlightedCode).toContain('*Collectors*');
        });

        test('should highlight Optional chaining', () => {
            const code = `
                Optional.ofNullable(getValue())
                    .filter(v -> v > 0)
                    .map(v -> v * 2)
                    .orElse(defaultValue);
            `;
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*Optional*');
            expect(result.highlightedCode).toContain('**->**');
        });

        test('should highlight time API usage', () => {
            const code = `
                LocalDate today = LocalDate.now();
                LocalDate tomorrow = today.plusDays(1);
                String formatted = tomorrow.format(DateTimeFormatter.ISO_LOCAL_DATE);
            `;
            const result = JavaSyntaxHighlighter.highlight(code);
            
            expect(result.highlightedCode).toContain('*LocalDate*');
            expect(result.highlightedCode).toContain('*DateTimeFormatter*');
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed code gracefully', () => {
            const malformedCode = 'String str = "unclosed string';
            const result = JavaSyntaxHighlighter.highlight(malformedCode);
            
            // Should not throw an error
            expect(result.highlightedCode).toBeDefined();
            expect(result.tokens).toBeDefined();
            expect(result.errors).toBeDefined();
        });

        test('should handle empty code', () => {
            const result = JavaSyntaxHighlighter.highlight('');
            
            expect(result.highlightedCode).toBe('');
            expect(result.tokens).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        test('should handle code with only whitespace', () => {
            const result = JavaSyntaxHighlighter.highlight('   \n\t  \n  ');
            
            expect(result.highlightedCode).toBe('   \n\t  \n  ');
            expect(result.tokens).toHaveLength(0);
        });
    });
});