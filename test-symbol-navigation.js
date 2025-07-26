/**
 * Test file for Drools Symbol Provider navigation functionality
 */

const { DroolsSymbolProvider } = require('./out/server/providers/symbolProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test Drools content with function calls and rule references
const testDroolsContent = `
package com.example.rules;

import java.util.List;

global Logger logger;

function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}

rule "High Value Customer"
when
    $customer : Customer(totalPurchases > 1000)
then
    int score = calculateScore($customer, 100);
    logMessage("Customer score: " + score);
end

rule "Process Order"
when
    $order : Order(amount > 500)
then
    logMessage("Processing large order");
end
`;

async function testSymbolNavigation() {
    console.log('Testing Drools Symbol Navigation...\n');

    // Create parser and parse the test content
    const parser = new DroolsParser();
    const parseResult = parser.parse(testDroolsContent);
    
    console.log('Parse errors:', parseResult.errors.length);
    console.log('');

    // Create a mock text document
    const document = TextDocument.create(
        'file:///test.drl',
        'drools',
        1,
        testDroolsContent
    );

    // Create symbol provider
    const symbolProvider = new DroolsSymbolProvider();
    const documentsMap = new Map();
    documentsMap.set(document.uri, { document, parseResult });

    // Test go-to-definition for function names
    console.log('=== Testing Go-to-Definition ===');
    
    // Find line numbers for function calls
    const lines = testDroolsContent.split('\n');
    let calculateScoreCallLine = -1;
    let logMessageCallLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('calculateScore(') && !lines[i].includes('function')) {
            calculateScoreCallLine = i;
        }
        if (lines[i].includes('logMessage(') && !lines[i].includes('function') && logMessageCallLine === -1) {
            logMessageCallLine = i;
        }
    }
    
    console.log(`calculateScore call found at line: ${calculateScoreCallLine}`);
    console.log(`logMessage call found at line: ${logMessageCallLine}`);
    console.log('');

    // Test 1: Go to calculateScore function definition
    if (calculateScoreCallLine >= 0) {
        const position = { line: calculateScoreCallLine, character: 15 }; // Position in "calculateScore"
        const definitions = symbolProvider.provideDefinition(
            document,
            position,
            parseResult,
            documentsMap
        );
        
        console.log(`Go-to-definition for "calculateScore" at ${position.line}:${position.character}:`);
        console.log(`Found ${definitions.length} definitions:`);
        definitions.forEach(def => {
            console.log(`  - Location: line ${def.range.start.line}, char ${def.range.start.character}-${def.range.end.character}`);
        });
        console.log('');
    }

    // Test 2: Go to logMessage function definition
    if (logMessageCallLine >= 0) {
        const position = { line: logMessageCallLine, character: 5 }; // Position in "logMessage"
        const definitions = symbolProvider.provideDefinition(
            document,
            position,
            parseResult,
            documentsMap
        );
        
        console.log(`Go-to-definition for "logMessage" at ${position.line}:${position.character}:`);
        console.log(`Found ${definitions.length} definitions:`);
        definitions.forEach(def => {
            console.log(`  - Location: line ${def.range.start.line}, char ${def.range.start.character}-${def.range.end.character}`);
        });
        console.log('');
    }

    // Test 3: Test word extraction at different positions
    console.log('=== Testing Word Extraction ===');
    const testPositions = [
        { line: 7, character: 15, expected: 'calculateScore' },
        { line: 11, character: 15, expected: 'logMessage' },
        { line: 15, character: 8, expected: 'High' },
        { line: 20, character: 20, expected: 'calculateScore' }
    ];
    
    for (const testPos of testPositions) {
        // We need to access the private method, so let's test the public interface instead
        const definitions = symbolProvider.provideDefinition(
            document,
            testPos,
            parseResult,
            documentsMap
        );
        
        console.log(`Position ${testPos.line}:${testPos.character} (expected: ${testPos.expected}): ${definitions.length} definitions found`);
    }
    console.log('');

    // Test 4: Document symbols with detailed structure
    console.log('=== Document Structure Analysis ===');
    const documentSymbols = symbolProvider.provideDocumentSymbols(document, parseResult);
    
    function printSymbolTree(symbols, indent = '') {
        for (const symbol of symbols) {
            console.log(`${indent}${symbol.name} (${getSymbolKindName(symbol.kind)}) [${symbol.range.start.line}:${symbol.range.start.character}-${symbol.range.end.line}:${symbol.range.end.character}]`);
            if (symbol.children && symbol.children.length > 0) {
                printSymbolTree(symbol.children, indent + '  ');
            }
        }
    }
    
    printSymbolTree(documentSymbols);
    console.log('');

    console.log('Symbol navigation tests completed!');
}

function getSymbolKindName(kind) {
    const kindNames = {
        1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
        6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
        11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant',
        15: 'String', 16: 'Number', 17: 'Boolean', 18: 'Array', 19: 'Object',
        20: 'Key', 21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
        25: 'Operator', 26: 'TypeParameter'
    };
    return kindNames[kind] || `Unknown(${kind})`;
}

// Run the test
testSymbolNavigation().catch(console.error);