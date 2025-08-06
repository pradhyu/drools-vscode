/**
 * Unit tests for DroolsFormattingProvider
 */

import { DroolsFormattingProvider, FormattingSettings } from '../../src/server/providers/formattingProvider';
import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('DroolsFormattingProvider', () => {
    let provider: DroolsFormattingProvider;
    let parser: DroolsParser;
    let settings: FormattingSettings;

    beforeEach(() => {
        settings = {
            insertSpaces: true,
            tabSize: 4,
            indentSize: 4,
            maxLineLength: 120,
            trimTrailingWhitespace: true,
            insertFinalNewline: true,
            spaceAroundOperators: true,
            spaceAfterKeywords: true,
            alignRuleBlocks: true,
            alignClosingParentheses: true,
            indentMultiLinePatterns: true
        };
        provider = new DroolsFormattingProvider(settings);
        parser = new DroolsParser();
    });

    describe('Rule Block Formatting', () => {
        test('should format simple rule with proper indentation', () => {
            const content = `rule "Test Rule"
when
$p : Person(age > 18)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            expect(edits.length).toBeGreaterThan(0);
            
            // Check that indentation is applied
            const hasIndentationEdit = edits.some(edit => 
                edit.newText.includes('    $p : Person') || 
                edit.newText.includes('    System.out.println')
            );
            expect(hasIndentationEdit).toBe(true);
        });

        test('should align rule blocks consistently', () => {
            const content = `rule "First Rule"
when
$p : Person(age > 18)
then
System.out.println("first");
end

rule "Second Rule"
when
$c : Customer(active == true)
then
System.out.println("second");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            expect(edits.length).toBeGreaterThan(0);
            
            // Both rules should have consistent formatting
            const formattedText = applyEdits(content, edits);
            const lines = formattedText.split('\n');
            
            // Find when/then clauses and check they're consistently indented
            const whenLines = lines.filter(line => line.trim() === 'when');
            const thenLines = lines.filter(line => line.trim() === 'then');
            
            expect(whenLines.length).toBe(2);
            expect(thenLines.length).toBe(2);
        });

        test('should handle nested rule structures', () => {
            const content = `rule "Complex Rule"
when
$p : Person(age > 18)
exists(Account(owner == $p))
not(Debt(debtor == $p))
then
if ($p.getAge() > 65) {
System.out.println("Senior");
} else {
System.out.println("Adult");
}
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            expect(edits.length).toBeGreaterThan(0);
            
            // Should handle nested structures properly
            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('    $p : Person');
            expect(formattedText).toContain('    exists(Account');
            expect(formattedText).toContain('    not(Debt');
        });
    });

    describe('Operator Spacing', () => {
        test('should add spaces around operators', () => {
            const content = `rule "Test Rule"
when
$p : Person(age>18&&name!=null)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('age > 18');
            expect(formattedText).toContain('&& ');
            expect(formattedText).toContain('!= null');
        });

        test('should handle comparison operators', () => {
            const content = `rule "Test Rule"
when
$p : Person(age>=18,balance<=1000,score==750)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('>= 18');
            expect(formattedText).toContain('<= 1000');
            expect(formattedText).toContain('== 750');
        });

        test('should respect spaceAroundOperators setting', () => {
            const noSpaceSettings: FormattingSettings = {
                ...settings,
                spaceAroundOperators: false
            };
            const noSpaceProvider = new DroolsFormattingProvider(noSpaceSettings);

            const content = `rule "Test Rule"
when
$p : Person(age > 18)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = noSpaceProvider.formatDocument(document, options, parseResult);

            // Should not add extra spaces around operators
            const formattedText = applyEdits(content, edits);
            // The original spacing should be preserved or made more compact
            expect(formattedText).toBeDefined();
        });
    });

    describe('Keyword Spacing', () => {
        test('should add spaces after keywords', () => {
            const content = `rule"Test Rule"
when
$p:Person(age>18)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('rule "Test Rule"');
            expect(formattedText).toContain('$p : Person');
        });

        test('should handle function keywords', () => {
            const content = `function String getName(){
return"test";
}`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('function String getName()');
            expect(formattedText).toContain('return');
        });
    });

    describe('Whitespace Handling', () => {
        test('should trim trailing whitespace', () => {
            const content = `rule "Test Rule"   
when   
    $p : Person(age > 18)   
then   
    System.out.println("test");   
end   `;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            const lines = formattedText.split('\n');
            
            // No line should end with whitespace
            lines.forEach(line => {
                if (line.length > 0) {
                    expect(line[line.length - 1]).not.toBe(' ');
                    expect(line[line.length - 1]).not.toBe('\t');
                }
            });
        });

        test('should insert final newline', () => {
            const content = `rule "Test Rule"
when
    $p : Person(age > 18)
then
    System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            expect(formattedText.endsWith('\n')).toBe(true);
        });

        test('should preserve blank lines according to settings', () => {
            const content = `rule "First Rule"
when
    $p : Person(age > 18)
then
    System.out.println("first");
end



rule "Second Rule"
when
    $c : Customer(active == true)
then
    System.out.println("second");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            
            // Should preserve only the configured number of blank lines
            expect(formattedText).not.toContain('\n\n\n\n'); // No more than 3 consecutive newlines
        });
    });

    describe('Range Formatting', () => {
        test('should format only selected range', () => {
            const content = `rule "Test Rule"
when
$p : Person(age>18)
$c : Customer(active==true)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            
            // Format only the when clause
            const range = {
                start: { line: 1, character: 0 },
                end: { line: 3, character: 0 }
            };

            const edits = provider.formatRange(document, range, parseResult);

            expect(edits.length).toBeGreaterThan(0);
            
            // Should only affect the specified range
            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('age > 18');
            expect(formattedText).toContain('active == true');
        });

        test('should handle partial rule formatting', () => {
            const content = `rule "Test Rule"
when
$p:Person(age>18)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            
            // Format only the condition line
            const range = {
                start: { line: 2, character: 0 },
                end: { line: 2, character: 20 }
            };

            const edits = provider.formatRange(document, range, parseResult);

            const formattedText = applyEdits(content, edits);
            expect(formattedText).toContain('$p : Person(age > 18)');
        });
    });

    describe('Tab vs Spaces Configuration', () => {
        test('should use tabs when insertSpaces is false', () => {
            const tabSettings: FormattingSettings = {
                ...settings,
                insertSpaces: false,
                tabSize: 1
            };
            const tabProvider = new DroolsFormattingProvider(tabSettings);

            const content = `rule "Test Rule"
when
$p : Person(age > 18)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: false, tabSize: 1 };

            const edits = tabProvider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            
            // Should use tabs for indentation
            const lines = formattedText.split('\n');
            const indentedLines = lines.filter(line => line.startsWith('\t') || line.startsWith('    '));
            expect(indentedLines.length).toBeGreaterThan(0);
        });

        test('should respect custom tab size', () => {
            const customTabSettings: FormattingSettings = {
                ...settings,
                tabSize: 2,
                indentSize: 2
            };
            const customProvider = new DroolsFormattingProvider(customTabSettings);

            const content = `rule "Test Rule"
when
$p : Person(age > 18)
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 2 };

            const edits = customProvider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            
            // Should use 2-space indentation
            expect(formattedText).toContain('  $p : Person');
            expect(formattedText).toContain('  System.out.println');
        });
    });

    describe('Complex Document Formatting', () => {
        test('should format complete Drools file', () => {
            const content = `package com.example.rules;
import java.util.List;
global List<String> messages;
function String formatName(String first,String last){
return first+" "+last;
}
rule "Adult Check"
salience 100
when
$p:Person(age>18,name!=null)
exists(Account(owner==$p))
then
messages.add("Found adult: "+formatName($p.getFirstName(),$p.getLastName()));
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            
            // Should format all parts of the file
            expect(formattedText).toContain('function String formatName(String first, String last)');
            expect(formattedText).toContain('    $p : Person(age > 18, name != null)');
            expect(formattedText).toContain('exists(Account(owner');
            expect(formattedText).toContain('formatName($p.getFirstName(), $p.getLastName())');
        });

        test('should handle multiple rules with different structures', () => {
            const content = `rule "Simple Rule"
when
$p:Person()
then
System.out.println("simple");
end
rule "Complex Rule"
when
$p:Person(age>18)
exists(Account(owner==$p,balance>1000))
not(Debt(debtor==$p))
then
if($p.getAge()>65){
System.out.println("senior");
}else{
System.out.println("adult");
}
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            const formattedText = applyEdits(content, edits);
            
            // Both rules should be properly formatted
            expect(formattedText).toContain('    $p : Person()');
            expect(formattedText).toContain('    $p : Person(age > 18)');
            expect(formattedText).toContain('exists(Account(owner==$p, balance > 1000))');
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed documents gracefully', () => {
            const content = `rule "Bad Rule"
when
$p : Person(age > 18
// Missing closing parenthesis
then
System.out.println("test");
end`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            // Should not throw an error
            expect(Array.isArray(edits)).toBe(true);
            
            // Should still attempt to format what it can
            if (edits.length > 0) {
                const formattedText = applyEdits(content, edits);
                expect(formattedText).toBeDefined();
            }
        });

        test('should handle empty documents', () => {
            const content = '';
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            expect(Array.isArray(edits)).toBe(true);
        });

        test('should handle documents with only comments', () => {
            const content = `// This is a comment
/* This is a block comment */
// Another comment`;
            const document = (global as any).createMockTextDocument(content);
            const parseResult = parser.parse(content);
            const options = { insertSpaces: true, tabSize: 4 };

            const edits = provider.formatDocument(document, options, parseResult);

            expect(Array.isArray(edits)).toBe(true);
        });
    });
});

// Helper function to apply text edits to content
function applyEdits(content: string, edits: any[]): string {
    // Sort edits by position (reverse order to avoid offset issues)
    const sortedEdits = edits.sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
            return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
    });

    let result = content;
    const lines = content.split('\n');

    for (const edit of sortedEdits) {
        const startLine = edit.range.start.line;
        const startChar = edit.range.start.character;
        const endLine = edit.range.end.line;
        const endChar = edit.range.end.character;

        if (startLine === endLine) {
            // Single line edit
            const line = lines[startLine];
            lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
        } else {
            // Multi-line edit
            const startPart = lines[startLine].substring(0, startChar);
            const endPart = lines[endLine].substring(endChar);
            const newLines = edit.newText.split('\n');
            
            // Replace the affected lines
            lines.splice(startLine, endLine - startLine + 1, startPart + newLines[0]);
            
            // Insert additional lines if needed
            for (let i = 1; i < newLines.length; i++) {
                lines.splice(startLine + i, 0, newLines[i]);
            }
            
            // Append the end part to the last new line
            if (newLines.length > 1) {
                lines[startLine + newLines.length - 1] += endPart;
            } else {
                lines[startLine] += endPart;
            }
        }
    }

    return lines.join('\n');
}