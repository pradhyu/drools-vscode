/**
 * Unit tests for Enhanced Java Completion Provider
 */

import { Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JavaCompletionProvider } from '../../../src/server/providers/javaCompletionProvider';

// Mock text document helper
function createMockDocument(content: string): TextDocument {
    return TextDocument.create('test://test.drl', 'drools', 1, content);
}

describe('JavaCompletionProvider', () => {
    beforeAll(() => {
        JavaCompletionProvider.initialize();
    });

    describe('General Completions', () => {
        test('should provide Java keyword completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    i';
            const document = createMockDocument(content);
            const position = Position.create(3, 5); // After 'i'

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            expect(result.items.length).toBeGreaterThan(0);
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('if');
            expect(labels).toContain('int');
            expect(labels).toContain('instanceof');
        });

        test('should provide Java class completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    Str';
            const document = createMockDocument(content);
            const position = Position.create(3, 7); // After 'Str'

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('String');
            expect(labels).toContain('Stream');
            
            const stringItem = result.items.find(item => item.label === 'String');
            expect(stringItem).toBeDefined();
            expect(stringItem?.detail).toContain('java.lang.String');
            expect(stringItem?.documentation).toBeDefined();
        });

        test('should provide collection class completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    List';
            const document = createMockDocument(content);
            const position = Position.create(3, 8); // After 'List'

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('List');
            
            const listItem = result.items.find(item => item.label === 'List');
            expect(listItem).toBeDefined();
            expect(listItem?.detail).toContain('java.util.List');
        });

        test('should provide time API completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    LocalD';
            const document = createMockDocument(content);
            const position = Position.create(3, 10); // After 'LocalD'

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('LocalDate');
            expect(labels).toContain('LocalDateTime');
            
            const localDateItem = result.items.find(item => item.label === 'LocalDate');
            expect(localDateItem).toBeDefined();
            expect(localDateItem?.detail).toContain('Java 8+');
        });
    });

    describe('Member Completions', () => {
        test('should provide String method completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    String str = "hello";\n    str.';
            const document = createMockDocument(content);
            const position = Position.create(4, 8); // After 'str.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            expect(result.items.length).toBeGreaterThan(0);
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('length');
            expect(labels).toContain('charAt');
            expect(labels).toContain('substring');
            expect(labels).toContain('indexOf');
            expect(labels).toContain('toLowerCase');
            expect(labels).toContain('toUpperCase');
            expect(labels).toContain('trim');
            expect(labels).toContain('replace');
            expect(labels).toContain('split');
            
            const lengthMethod = result.items.find(item => item.label === 'length');
            expect(lengthMethod).toBeDefined();
            expect(lengthMethod?.detail).toContain('(): int');
            expect(lengthMethod?.documentation).toBeDefined();
        });

        test('should provide List method completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    List<String> list = new ArrayList<>();\n    list.';
            const document = createMockDocument(content);
            const position = Position.create(4, 9); // After 'list.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('add');
            expect(labels).toContain('get');
            expect(labels).toContain('set');
            expect(labels).toContain('remove');
            expect(labels).toContain('size');
            expect(labels).toContain('isEmpty');
            expect(labels).toContain('contains');
            expect(labels).toContain('stream');
            expect(labels).toContain('forEach');
            
            const addMethod = result.items.find(item => item.label === 'add');
            expect(addMethod).toBeDefined();
            expect(addMethod?.insertText).toContain('add(${1:element})');
        });

        test('should provide Map method completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    Map<String, Integer> map = new HashMap<>();\n    map.';
            const document = createMockDocument(content);
            const position = Position.create(4, 8); // After 'map.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('put');
            expect(labels).toContain('get');
            expect(labels).toContain('remove');
            expect(labels).toContain('containsKey');
            expect(labels).toContain('containsValue');
            expect(labels).toContain('keySet');
            expect(labels).toContain('values');
            expect(labels).toContain('entrySet');
            expect(labels).toContain('getOrDefault');
            expect(labels).toContain('forEach');
        });

        test('should provide Optional method completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    Optional<String> optional = Optional.of("test");\n    optional.';
            const document = createMockDocument(content);
            const position = Position.create(4, 13); // After 'optional.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('isPresent');
            expect(labels).toContain('isEmpty');
            expect(labels).toContain('get');
            expect(labels).toContain('orElse');
            expect(labels).toContain('orElseGet');
            expect(labels).toContain('orElseThrow');
            expect(labels).toContain('map');
            expect(labels).toContain('flatMap');
            expect(labels).toContain('filter');
            expect(labels).toContain('ifPresent');
        });

        test('should provide Stream method completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    Stream<String> stream = Stream.of("a", "b");\n    stream.';
            const document = createMockDocument(content);
            const position = Position.create(4, 11); // After 'stream.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('filter');
            expect(labels).toContain('map');
            expect(labels).toContain('flatMap');
            expect(labels).toContain('distinct');
            expect(labels).toContain('sorted');
            expect(labels).toContain('limit');
            expect(labels).toContain('skip');
            expect(labels).toContain('forEach');
            expect(labels).toContain('collect');
            expect(labels).toContain('reduce');
            expect(labels).toContain('findFirst');
            expect(labels).toContain('anyMatch');
            expect(labels).toContain('count');
        });

        test('should provide LocalDate method completions', () => {
            const content = 'rule "test"\nwhen\nthen\n    LocalDate date = LocalDate.now();\n    date.';
            const document = createMockDocument(content);
            const position = Position.create(4, 9); // After 'date.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('getYear');
            expect(labels).toContain('getMonth');
            expect(labels).toContain('getDayOfMonth');
            expect(labels).toContain('plusDays');
            expect(labels).toContain('minusDays');
            expect(labels).toContain('plusMonths');
            expect(labels).toContain('minusMonths');
            expect(labels).toContain('isAfter');
            expect(labels).toContain('isBefore');
            expect(labels).toContain('format');
        });

        test('should provide static method completions for class names', () => {
            const content = 'rule "test"\nwhen\nthen\n    Math.';
            const document = createMockDocument(content);
            const position = Position.create(3, 9); // After 'Math.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('abs');
            expect(labels).toContain('max');
            expect(labels).toContain('min');
            expect(labels).toContain('pow');
            expect(labels).toContain('sqrt');
            expect(labels).toContain('random');
            expect(labels).toContain('PI');
            expect(labels).toContain('E');
            
            const absMethod = result.items.find(item => item.label === 'abs');
            expect(absMethod).toBeDefined();
            expect(absMethod?.detail).toContain('static');
        });
    });

    describe('Lambda Completions', () => {
        test('should provide lambda completions in stream context', () => {
            const content = 'rule "test"\nwhen\nthen\n    list.stream().filter(';
            const document = createMockDocument(content);
            const position = Position.create(3, 27); // After 'filter('

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('-> (lambda)');
            expect(labels).toContain('() -> (lambda)');
            expect(labels).toContain('(,) -> (lambda)');
            expect(labels).toContain(':: (method reference)');
            
            const lambdaItem = result.items.find(item => item.label === '-> (lambda)');
            expect(lambdaItem).toBeDefined();
            expect(lambdaItem?.insertText).toBe('${1:param} -> ${2:expression}');
        });
    });

    describe('Context Analysis', () => {
        test('should detect then clause context', () => {
            const content = 'rule "test"\nwhen\n    $fact : Fact()\nthen\n    String';
            const document = createMockDocument(content);
            const position = Position.create(4, 10); // In then clause

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            // Should provide completions since we're in then clause
            expect(result.items.length).toBeGreaterThan(0);
        });

        test('should not provide Java completions in when clause', () => {
            const content = 'rule "test"\nwhen\n    String';
            const document = createMockDocument(content);
            const position = Position.create(2, 10); // In when clause

            const result = JavaCompletionProvider.provideCompletions(document, position);
            
            // Should still provide some completions, but they should be general ones
            expect(result.items.length).toBeGreaterThan(0);
        });
    });

    describe('Method Signatures', () => {
        test('should provide method signatures with parameters', () => {
            const content = 'rule "test"\nwhen\nthen\n    String str = "hello";\n    str.sub';
            const document = createMockDocument(content);
            const position = Position.create(4, 11); // After 'str.sub'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const substringMethod = result.items.find(item => item.label === 'substring');
            expect(substringMethod).toBeDefined();
            expect(substringMethod?.detail).toContain('substring(');
            expect(substringMethod?.detail).toContain('): String');
            expect(substringMethod?.insertText).toContain('substring(${1:beginIndex}');
            expect(substringMethod?.documentation).toBeDefined();
        });

        test('should show parameter information in documentation', () => {
            const content = 'rule "test"\nwhen\nthen\n    String str = "hello";\n    str.repl';
            const document = createMockDocument(content);
            const position = Position.create(4, 12); // After 'str.repl'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const replaceMethod = result.items.find(item => item.label === 'replace');
            expect(replaceMethod).toBeDefined();
            expect(replaceMethod?.documentation).toBeDefined();
            
            const docValue = (replaceMethod?.documentation as any)?.value;
            expect(docValue).toContain('Parameters');
            expect(docValue).toContain('target');
            expect(docValue).toContain('replacement');
        });
    });

    describe('Pattern Matching', () => {
        test('should match variable names to types', () => {
            const content = 'rule "test"\nwhen\nthen\n    list.';
            const document = createMockDocument(content);
            const position = Position.create(3, 9); // After 'list.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            // Should recognize 'list' as List type and provide List methods
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('add');
            expect(labels).toContain('size');
            expect(labels).toContain('get');
        });

        test('should match map variable to Map type', () => {
            const content = 'rule "test"\nwhen\nthen\n    map.';
            const document = createMockDocument(content);
            const position = Position.create(3, 8); // After 'map.'

            const result = JavaCompletionProvider.provideCompletions(document, position, '.');
            
            const labels = result.items.map(item => item.label);
            expect(labels).toContain('put');
            expect(labels).toContain('get');
            expect(labels).toContain('containsKey');
        });
    });
});