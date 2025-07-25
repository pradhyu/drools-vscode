/**
 * Unit test for format-on-save functionality
 * Tests the formatting provider directly without VSCode API dependencies
 */

const assert = require('assert');
const fs = require('fs');

// Mock TextDocument for testing
class MockTextDocument {
    constructor(content) {
        this.content = content;
        this.lines = content.split('\n');
        this.lineCount = this.lines.length;
    }

    getText(range) {
        if (!range) {
            return this.content;
        }
        
        const startLine = range.start.line;
        const endLine = range.end.line;
        const startChar = range.start.character;
        const endChar = range.end.character;
        
        if (startLine === endLine) {
            return this.lines[startLine].substring(startChar, endChar);
        }
        
        let result = this.lines[startLine].substring(startChar);
        for (let i = startLine + 1; i < endLine; i++) {
            result += '\n' + this.lines[i];
        }
        result += '\n' + this.lines[endLine].substring(0, endChar);
        
        return result;
    }
}

// Mock parser and AST for testing
const mockParseResult = {
    ast: {
        packageDeclaration: null,
        imports: [],
        rules: [],
        functions: [],
        globals: []
    },
    errors: []
};

// Import the formatting provider
let DroolsFormattingProvider;
try {
    const formattingModule = require('./out/server/providers/formattingProvider.js');
    DroolsFormattingProvider = formattingModule.DroolsFormattingProvider;
} catch (error) {
    console.error('Could not load formatting provider. Make sure to run "npm run compile" first.');
    process.exit(1);
}

// Format-on-Save Unit Tests

// Run the tests
console.log('Running Format-on-Save Unit Tests...');

// Simple test runner
function runTests() {
    const tests = [
        {
            name: 'Basic Rule Formatting - Simple Rule',
            test: function() {
                const formattingProvider = new DroolsFormattingProvider();
                const unformattedContent = `rule "Simple Rule"
when
$person:Person(age>18)
then
System.out.println("Adult person found");
end`;

                const document = new MockTextDocument(unformattedContent);
                const fullRange = {
                    start: { line: 0, character: 0 },
                    end: { line: document.lineCount - 1, character: document.lines[document.lineCount - 1].length }
                };

                const edits = formattingProvider.formatRange(document, fullRange, mockParseResult);
                
                assert(edits.length > 0, 'Should return formatting edits');
                
                const formattedContent = edits[0].newText;
                
                // Debug: Print the formatted content
                console.log('Formatted content:');
                console.log(formattedContent);
                console.log('---');
                
                // Verify proper indentation and spacing
                assert(formattedContent.includes('$person : Person(age > 18)'), 'Should format condition with proper spacing');
                
                return true;
            }
        },
        {
            name: 'Operator Spacing Test',
            test: function() {
                const formattingProvider = new DroolsFormattingProvider();
                const unformattedContent = `rule "Operator Test"
when
$person:Person(age>=18&&name!=null)
then
System.out.println("Test");
end`;

                const document = new MockTextDocument(unformattedContent);
                const fullRange = {
                    start: { line: 0, character: 0 },
                    end: { line: document.lineCount - 1, character: document.lines[document.lineCount - 1].length }
                };

                const edits = formattingProvider.formatRange(document, fullRange, mockParseResult);
                const formattedContent = edits[0].newText;

                // Verify operator spacing
                assert(formattedContent.includes('age >= 18'), 'Should space >= operator');
                assert(formattedContent.includes('name != null'), 'Should space != operator');
                
                return true;
            }
        },
        {
            name: 'Function Formatting Test',
            test: function() {
                const formattingProvider = new DroolsFormattingProvider();
                const unformattedContent = `function boolean isAdult(int age){
if(age>=18){
return true;
}
}`;

                const document = new MockTextDocument(unformattedContent);
                const fullRange = {
                    start: { line: 0, character: 0 },
                    end: { line: document.lineCount - 1, character: document.lines[document.lineCount - 1].length }
                };

                const edits = formattingProvider.formatRange(document, fullRange, mockParseResult);
                const formattedContent = edits[0].newText;

                // Verify function formatting
                assert(formattedContent.includes('function boolean isAdult(int age) {'), 'Should format function signature');
                assert(formattedContent.includes('if(age >= 18) {'), 'Should format if condition');
                
                return true;
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
        try {
            console.log(`Running: ${test.name}`);
            test.test();
            console.log(`✓ ${test.name}`);
            passed++;
        } catch (error) {
            console.log(`✗ ${test.name}: ${error.message}`);
            failed++;
        }
    });

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('All tests passed!');
    }
}

runTests();