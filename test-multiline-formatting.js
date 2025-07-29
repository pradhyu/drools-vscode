/**
 * Test multi-line pattern formatting functionality
 * Tests Requirements 5.1, 5.2, 5.3, 5.4
 */

const { DroolsFormattingProvider } = require('./out/server/providers/formattingProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test input with poorly formatted multi-line patterns
const testInput = `package com.example.test;

rule "Test multi-line formatting"
when
$person : Person(
age > 18,
name != null
)
exists(
Account(
owner == $person,
balance > 1000,
type in ("CHECKING", "SAVINGS")
)
)
not(
Restriction(
customer == $person,
type in ("CREDIT_HOLD", "ACCOUNT_FREEZE"),
active == true
)
)
then
System.out.println("Test");
end

rule "Nested multi-line test"
when
$customer : Customer(
status == "ACTIVE"
)
exists(
Account(
owner == $customer,
balance > 5000
) and
not(
Debt(
person == $customer,
amount > 1000
)
)
)
then
System.out.println("Nested test");
end`;

async function testMultiLineFormatting() {
    console.log('=== Testing Multi-Line Pattern Formatting ===\n');
    
    try {
        // Create parser and formatting provider
        const parser = new DroolsParser();
        const formatter = new DroolsFormattingProvider({
            insertSpaces: true,
            tabSize: 4,
            indentSize: 4,
            alignClosingParentheses: true,
            indentMultiLinePatterns: true
        });
        
        // Parse the test input
        console.log('1. Parsing test input...');
        const parseResult = parser.parse(testInput);
        
        if (parseResult.errors.length > 0) {
            console.log('Parse errors found:');
            parseResult.errors.forEach(error => {
                console.log(`  - ${error.message} at line ${error.range.start.line + 1}`);
            });
        }
        
        console.log(`   Found ${parseResult.ast.rules.length} rules`);
        
        // Create text document
        const document = TextDocument.create('test://test.drl', 'drools', 1, testInput);
        
        // Test full document formatting
        console.log('\n2. Testing full document formatting...');
        const fullFormatEdits = formatter.formatDocument(document, {
            insertSpaces: true,
            tabSize: 4
        }, parseResult);
        
        console.log(`   Generated ${fullFormatEdits.length} formatting edits`);
        
        // Apply edits and show result
        if (fullFormatEdits.length > 0) {
            let formattedText = testInput;
            
            // Apply edits in reverse order to maintain positions
            const sortedEdits = fullFormatEdits.sort((a, b) => {
                if (a.range.start.line !== b.range.start.line) {
                    return b.range.start.line - a.range.start.line;
                }
                return b.range.start.character - a.range.start.character;
            });
            
            for (const edit of sortedEdits) {
                const lines = formattedText.split('\n');
                const startLine = edit.range.start.line;
                const endLine = edit.range.end.line;
                const startChar = edit.range.start.character;
                const endChar = edit.range.end.character;
                
                if (startLine === endLine) {
                    // Single line edit
                    const line = lines[startLine];
                    lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
                } else {
                    // Multi-line edit
                    const newLines = edit.newText.split('\n');
                    const beforeLines = lines.slice(0, startLine);
                    const afterLines = lines.slice(endLine + 1);
                    const firstLine = lines[startLine].substring(0, startChar) + newLines[0];
                    const lastLine = newLines[newLines.length - 1] + lines[endLine].substring(endChar);
                    
                    const middleLines = newLines.slice(1, -1);
                    lines.splice(0, lines.length, ...beforeLines, firstLine, ...middleLines, lastLine, ...afterLines);
                }
                
                formattedText = lines.join('\n');
            }
            
            console.log('\n3. Formatted result:');
            console.log('---');
            console.log(formattedText);
            console.log('---');
        }
        
        // Test range formatting on specific multi-line patterns
        console.log('\n4. Testing range formatting...');
        
        // Find multi-line patterns in the AST
        const multiLinePatterns = [];
        for (const rule of parseResult.ast.rules) {
            if (rule.when) {
                for (const condition of rule.when.conditions) {
                    if (condition.multiLinePattern) {
                        multiLinePatterns.push(condition.multiLinePattern);
                    }
                }
            }
        }
        
        console.log(`   Found ${multiLinePatterns.length} multi-line patterns`);
        
        for (let i = 0; i < multiLinePatterns.length; i++) {
            const pattern = multiLinePatterns[i];
            console.log(`   Pattern ${i + 1}: ${pattern.patternType} (lines ${pattern.range.start.line + 1}-${pattern.range.end.line + 1})`);
            
            // Test individual pattern formatting
            const patternEdits = formatter.formatMultiLinePattern(pattern, document);
            console.log(`     Generated ${patternEdits.length} edits for this pattern`);
            
            // Test alignment of closing parentheses
            const alignmentEdits = formatter.alignClosingParentheses(pattern, document);
            console.log(`     Generated ${alignmentEdits.length} alignment edits`);
            
            // Test nested level indentation
            const indentEdits = formatter.indentNestedLevels(pattern, document);
            console.log(`     Generated ${indentEdits.length} indentation edits`);
        }
        
        // Test partial range formatting
        console.log('\n5. Testing partial range formatting...');
        const partialRange = {
            start: { line: 10, character: 0 },
            end: { line: 20, character: 0 }
        };
        
        const rangeEdits = formatter.formatRange(document, partialRange, parseResult);
        console.log(`   Generated ${rangeEdits.length} edits for partial range`);
        
        console.log('\n=== Multi-Line Formatting Test Completed Successfully ===');
        
    } catch (error) {
        console.error('Error during multi-line formatting test:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Test specific formatting scenarios
async function testSpecificScenarios() {
    console.log('\n=== Testing Specific Formatting Scenarios ===\n');
    
    const scenarios = [
        {
            name: 'Simple exists pattern',
            input: `rule "test"
when
exists(
Person(age > 18)
)
then
end`
        },
        {
            name: 'Nested patterns',
            input: `rule "test"
when
exists(
Person(age > 18) and
not(
Account(balance < 0)
)
)
then
end`
        },
        {
            name: 'Complex nesting',
            input: `rule "test"
when
exists(
Person(age > 18) and
forall(
Account(owner == $person)
Transaction(account.owner == $person, approved == true)
)
)
then
end`
        }
    ];
    
    const parser = new DroolsParser();
    const formatter = new DroolsFormattingProvider();
    
    for (const scenario of scenarios) {
        console.log(`Testing: ${scenario.name}`);
        console.log('Input:');
        console.log(scenario.input);
        
        try {
            const parseResult = parser.parse(scenario.input);
            const document = TextDocument.create('test://test.drl', 'drools', 1, scenario.input);
            
            const edits = formatter.formatDocument(document, {
                insertSpaces: true,
                tabSize: 4
            }, parseResult);
            
            console.log(`Generated ${edits.length} formatting edits`);
            console.log('---\n');
            
        } catch (error) {
            console.error(`Error in scenario "${scenario.name}":`, error.message);
        }
    }
}

// Run the tests
if (require.main === module) {
    testMultiLineFormatting()
        .then(() => testSpecificScenarios())
        .then(() => {
            console.log('\nAll tests completed!');
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = {
    testMultiLineFormatting,
    testSpecificScenarios
};