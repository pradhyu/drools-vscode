/**
 * Test basic formatting functionality to verify the implementation
 */

const { DroolsFormattingProvider } = require('./out/server/providers/formattingProvider');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Simple test input
const testInput = `rule "test"
when
    $person : Person(
        age > 18,
        name != null
    )
then
    System.out.println("test");
end`;

async function testBasicFormatting() {
    console.log('=== Testing Basic Formatting Functionality ===\n');
    
    try {
        // Create formatting provider
        const formatter = new DroolsFormattingProvider({
            insertSpaces: true,
            tabSize: 4,
            indentSize: 4,
            alignClosingParentheses: true,
            indentMultiLinePatterns: true
        });
        
        console.log('1. Created formatting provider successfully');
        
        // Create text document
        const document = TextDocument.create('test://test.drl', 'drools', 1, testInput);
        console.log('2. Created text document successfully');
        
        // Create a mock parse result since the parser might not be fully working
        const mockParseResult = {
            ast: {
                type: 'DroolsFile',
                packageDeclaration: null,
                imports: [],
                globals: [],
                functions: [],
                rules: [],
                queries: [],
                declares: [],
                range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } }
            },
            errors: []
        };
        
        console.log('3. Created mock parse result');
        
        // Test document formatting
        const edits = formatter.formatDocument(document, {
            insertSpaces: true,
            tabSize: 4
        }, mockParseResult);
        
        console.log(`4. Generated ${edits.length} formatting edits`);
        
        if (edits.length > 0) {
            console.log('5. Formatting edits:');
            edits.forEach((edit, index) => {
                console.log(`   Edit ${index + 1}:`);
                console.log(`     Range: Line ${edit.range.start.line + 1}, Col ${edit.range.start.character + 1} to Line ${edit.range.end.line + 1}, Col ${edit.range.end.character + 1}`);
                console.log(`     New text: "${edit.newText.replace(/\n/g, '\\n')}"`);
            });
        }
        
        // Test the multi-line formatting methods directly
        console.log('\n6. Testing multi-line formatting methods directly...');
        
        // Create a mock multi-line pattern
        const mockPattern = {
            type: 'MultiLinePattern',
            patternType: 'exists',
            keyword: 'exists',
            content: 'Person(age > 18, name != null)',
            nestedPatterns: [],
            parenthesesRanges: [
                { start: { line: 2, character: 20 }, end: { line: 2, character: 21 } }, // opening (
                { start: { line: 5, character: 4 }, end: { line: 5, character: 5 } }    // closing )
            ],
            isComplete: true,
            depth: 0,
            innerConditions: [],
            range: { start: { line: 2, character: 4 }, end: { line: 5, character: 5 } }
        };
        
        // Test formatMultiLinePattern
        const patternEdits = formatter.formatMultiLinePattern(mockPattern, document);
        console.log(`   formatMultiLinePattern generated ${patternEdits.length} edits`);
        
        // Test alignClosingParentheses
        const alignEdits = formatter.alignClosingParentheses(mockPattern, document);
        console.log(`   alignClosingParentheses generated ${alignEdits.length} edits`);
        
        // Test indentNestedLevels
        const indentEdits = formatter.indentNestedLevels(mockPattern, document);
        console.log(`   indentNestedLevels generated ${indentEdits.length} edits`);
        
        console.log('\n=== Basic Formatting Test Completed Successfully ===');
        
    } catch (error) {
        console.error('Error during basic formatting test:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Test range formatting
async function testRangeFormatting() {
    console.log('\n=== Testing Range Formatting ===\n');
    
    try {
        const formatter = new DroolsFormattingProvider();
        const document = TextDocument.create('test://test.drl', 'drools', 1, testInput);
        
        const mockParseResult = {
            ast: {
                type: 'DroolsFile',
                packageDeclaration: null,
                imports: [],
                globals: [],
                functions: [],
                rules: [],
                queries: [],
                declares: [],
                range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } }
            },
            errors: []
        };
        
        // Test range formatting
        const range = {
            start: { line: 1, character: 0 },
            end: { line: 6, character: 0 }
        };
        
        const rangeEdits = formatter.formatRange(document, range, mockParseResult);
        console.log(`Range formatting generated ${rangeEdits.length} edits`);
        
        if (rangeEdits.length > 0) {
            rangeEdits.forEach((edit, index) => {
                console.log(`   Range Edit ${index + 1}:`);
                console.log(`     Range: Line ${edit.range.start.line + 1} to Line ${edit.range.end.line + 1}`);
                console.log(`     New text length: ${edit.newText.length} characters`);
            });
        }
        
        console.log('\n=== Range Formatting Test Completed Successfully ===');
        
    } catch (error) {
        console.error('Error during range formatting test:', error);
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    testBasicFormatting()
        .then(() => testRangeFormatting())
        .then(() => {
            console.log('\nAll basic formatting tests completed successfully!');
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = {
    testBasicFormatting,
    testRangeFormatting
};