/**
 * Tests for Java validation fixes in diagnostic provider
 * Ensures no false positives for proper Java code
 */

import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DroolsDiagnosticProvider, DiagnosticSettings } from '../../../src/server/providers/diagnosticProvider';
import { DroolsParser } from '../../../src/server/parser/droolsParser';

// Mock text document helper
function createMockDocument(content: string): TextDocument {
    return TextDocument.create('test://test.drl', 'drools', 1, content);
}

describe('Java Validation Fixes', () => {
    let diagnosticProvider: DroolsDiagnosticProvider;
    let parser: DroolsParser;
    
    const settings: DiagnosticSettings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };

    beforeEach(() => {
        diagnosticProvider = new DroolsDiagnosticProvider(settings);
        parser = new DroolsParser();
    });

    describe('Capitalization False Positives', () => {
        test('should NOT flag correctly capitalized Integer', () => {
            const content = `
rule "test"
when
    $integer : Integer(this.me > 100)
then
    Integer x = 1;
    int y = 1;
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have any capitalization warnings for "Integer"
            const capitalizationErrors = diagnostics.filter(d => 
                d.code === 'java-capitalization' && d.message.includes('Integer')
            );
            
            expect(capitalizationErrors).toHaveLength(0);
        });

        test('should NOT flag correctly capitalized String', () => {
            const content = `
rule "test"
when
    $string : String(length > 0)
then
    String name = "test";
    System.out.println(name);
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have any capitalization warnings for "String"
            const capitalizationErrors = diagnostics.filter(d => 
                d.code === 'java-capitalization' && d.message.includes('String')
            );
            
            expect(capitalizationErrors).toHaveLength(0);
        });

        test('should flag lowercase java types', () => {
            const content = `
rule "test"
when
then
    string name = "test";
    integer count = 5;
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should flag lowercase "string" and "integer"
            const capitalizationErrors = diagnostics.filter(d => d.code === 'java-capitalization');
            
            expect(capitalizationErrors.length).toBeGreaterThan(0);
            expect(capitalizationErrors.some(d => d.message.includes('string'))).toBe(true);
            expect(capitalizationErrors.some(d => d.message.includes('integer'))).toBe(true);
        });
    });

    describe('Multi-line Java Statement Fixes', () => {
        test('should NOT flag multi-line stream operations', () => {
            const content = `
rule "test"
when
then
    List<String> list = new ArrayList<>();
    List<String> filtered = list.stream()
        .filter(item -> condition)
        .collect(Collectors.toList());
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have semicolon errors for stream operations
            const semicolonErrors = diagnostics.filter(d => d.code === 'missing-semicolon');
            
            expect(semicolonErrors).toHaveLength(0);
        });

        test('should NOT flag lambda expressions', () => {
            const content = `
rule "test"
when
then
    list.forEach(item -> {
        System.out.println(item);
    });
    
    Optional<String> result = list.stream()
        .filter(s -> s.length() > 0)
        .findFirst();
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have semicolon errors for lambda expressions
            const semicolonErrors = diagnostics.filter(d => d.code === 'missing-semicolon');
            
            expect(semicolonErrors).toHaveLength(0);
        });

        test('should NOT flag method chaining', () => {
            const content = `
rule "test"
when
then
    String result = Optional.ofNullable(getValue())
        .map(String::toUpperCase)
        .orElse("default");
        
    list.stream()
        .map(item -> item.toString())
        .forEach(System.out::println);
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have semicolon errors for method chaining
            const semicolonErrors = diagnostics.filter(d => d.code === 'missing-semicolon');
            
            expect(semicolonErrors).toHaveLength(0);
        });

        test('should NOT flag generic type declarations', () => {
            const content = `
rule "test"
when
then
    List<String> list = new ArrayList<>();
    Map<String, Integer> map = new HashMap<>();
    Optional<String> opt = Optional.empty();
    Stream<Integer> stream = Stream.of(1, 2, 3);
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have semicolon errors for generic declarations
            const semicolonErrors = diagnostics.filter(d => d.code === 'missing-semicolon');
            
            expect(semicolonErrors).toHaveLength(0);
        });

        test('should NOT flag complex expressions', () => {
            const content = `
rule "test"
when
then
    BigDecimal result = BigDecimal.valueOf(100.0)
        .multiply(BigDecimal.valueOf(1.5))
        .setScale(2, RoundingMode.HALF_UP);
        
    LocalDate date = LocalDate.now()
        .plusDays(30)
        .withDayOfMonth(1);
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have semicolon errors for complex expressions
            const semicolonErrors = diagnostics.filter(d => d.code === 'missing-semicolon');
            
            expect(semicolonErrors).toHaveLength(0);
        });
    });

    describe('Valid Semicolon Warnings', () => {
        test('should still flag obviously missing semicolons', () => {
            const content = `
rule "test"
when
then
    int x = 5
    String name = "test"
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should flag missing semicolons for simple statements
            const semicolonErrors = diagnostics.filter(d => d.code === 'missing-semicolon');
            
            expect(semicolonErrors.length).toBeGreaterThan(0);
        });
    });

    describe('Real-world Examples', () => {
        test('should handle the reported multi-line example correctly', () => {
            const content = `
rule "testing this new thing n"
when
    $string : string($me : this.me, $you : this.you)
    for w Transaction;
    $integer : Integer(this.me > 100) from channel.getRealNumbers()
then
    System.out.println($string);
    List<String> list = new ArrayList<>();
    list.stream();
    List<Type> filtered = list.stream();
    List<String> filtered = list.stream()
        .filter(item -> condition)
        .collect(Collectors.toList());
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not have false positive semicolon errors for multi-line statements
            const semicolonErrors = diagnostics.filter(d => 
                d.code === 'missing-semicolon' && 
                (d.message.includes('stream') || d.message.includes('filter') || d.message.includes('collect'))
            );
            
            expect(semicolonErrors).toHaveLength(0);
            
            // Should not have false positive capitalization errors for "Integer"
            const capitalizationErrors = diagnostics.filter(d => 
                d.code === 'java-capitalization' && d.message.includes('Integer')
            );
            
            expect(capitalizationErrors).toHaveLength(0);
        });

        test('should handle the reported Integer example correctly', () => {
            const content = `
rule "testing this new thing n"
when
    $string : string($me : this.me, $you : this.you)
    for w Transaction;
    $integer : Integer(this.me > 100) from channel.getRealNumbers()
then
    System.out.println($string);
    List<String> list = new ArrayList<>();
    list = list.stream();
    Integer x = 1;
    int y = 1;
end`;
            
            const document = createMockDocument(content);
            const parseResult = parser.parse(content);
            const diagnostics = diagnosticProvider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
            
            // Should not flag "Integer" as needing capitalization (it's already correct)
            const integerCapitalizationErrors = diagnostics.filter(d => 
                d.code === 'java-capitalization' && 
                d.message.includes('Integer') &&
                d.message.includes('should be')
            );
            
            expect(integerCapitalizationErrors).toHaveLength(0);
        });
    });
});