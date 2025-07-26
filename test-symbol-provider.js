/**
 * Test file for Drools Symbol Provider functionality
 */

const { DroolsSymbolProvider } = require('./out/server/providers/symbolProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test Drools content with various symbols
const testDroolsContent = `
package com.example.rules;

import java.util.List;
import static java.lang.Math.max;

global Logger logger;
global Configuration config;

function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}

rule "High Value Customer"
    salience 100
    no-loop true
when
    $customer : Customer(totalPurchases > 1000)
    $order : Order(customerId == $customer.id, amount > 500)
then
    $customer.setVipStatus(true);
    logMessage("Customer " + $customer.getName() + " is now VIP");
end

rule "Discount Eligibility"
when
    $customer : Customer(age >= 65)
    not Order(customerId == $customer.id, date after "2023-01-01")
then
    $customer.setDiscountEligible(true);
end

query "findCustomersByAge"(int minAge, int maxAge)
    $customer : Customer(age >= minAge, age <= maxAge)
end

declare CustomerEvent
    customerId : String
    eventType : String
    timestamp : long
end
`;

async function testSymbolProvider() {
    console.log('Testing Drools Symbol Provider...\n');

    // Create parser and parse the test content
    const parser = new DroolsParser();
    const parseResult = parser.parse(testDroolsContent);
    
    console.log('Parse errors:', parseResult.errors.length);
    if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
            console.log(`  - ${error.message} at line ${error.range.start.line}`);
        });
    }
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

    // Test 1: Document symbols (outline view)
    console.log('=== Test 1: Document Symbols ===');
    const documentSymbols = symbolProvider.provideDocumentSymbols(document, parseResult);
    
    console.log(`Found ${documentSymbols.length} top-level symbols:`);
    documentSymbols.forEach(symbol => {
        console.log(`  - ${symbol.name} (${getSymbolKindName(symbol.kind)})`);
        if (symbol.children && symbol.children.length > 0) {
            symbol.children.forEach(child => {
                console.log(`    - ${child.name} (${getSymbolKindName(child.kind)})`);
            });
        }
    });
    console.log('');

    // Test 2: Workspace symbols
    console.log('=== Test 2: Workspace Symbols ===');
    const documentsMap = new Map();
    documentsMap.set(document.uri, { document, parseResult });
    
    const workspaceSymbols = symbolProvider.provideWorkspaceSymbols(
        { query: 'customer' },
        documentsMap
    );
    
    console.log(`Found ${workspaceSymbols.length} workspace symbols matching 'customer':`);
    workspaceSymbols.forEach(symbol => {
        console.log(`  - ${symbol.name} (${getSymbolKindName(symbol.kind)}) in ${symbol.containerName || 'global'}`);
    });
    console.log('');

    // Test 3: Go-to-definition
    console.log('=== Test 3: Go-to-Definition ===');
    
    // Test finding definition of "calculateScore" function
    const position = { line: 20, character: 25 }; // Approximate position where function might be called
    const definitions = symbolProvider.provideDefinition(
        document,
        position,
        parseResult,
        documentsMap
    );
    
    console.log(`Found ${definitions.length} definitions at position ${position.line}:${position.character}:`);
    definitions.forEach(def => {
        console.log(`  - Location: ${def.uri} at line ${def.range.start.line}`);
    });
    console.log('');

    // Test 4: Symbol search with different queries
    console.log('=== Test 4: Symbol Search Tests ===');
    const searchQueries = ['rule', 'function', 'High', 'Customer'];
    
    for (const query of searchQueries) {
        const results = symbolProvider.provideWorkspaceSymbols(
            { query },
            documentsMap
        );
        console.log(`Query "${query}": ${results.length} results`);
        results.forEach(result => {
            console.log(`  - ${result.name} (${getSymbolKindName(result.kind)})`);
        });
        console.log('');
    }

    console.log('Symbol provider tests completed!');
}

function getSymbolKindName(kind) {
    const kindNames = {
        1: 'File',
        2: 'Module',
        3: 'Namespace',
        4: 'Package',
        5: 'Class',
        6: 'Method',
        7: 'Property',
        8: 'Field',
        9: 'Constructor',
        10: 'Enum',
        11: 'Interface',
        12: 'Function',
        13: 'Variable',
        14: 'Constant',
        15: 'String',
        16: 'Number',
        17: 'Boolean',
        18: 'Array',
        19: 'Object',
        20: 'Key',
        21: 'Null',
        22: 'EnumMember',
        23: 'Struct',
        24: 'Event',
        25: 'Operator',
        26: 'TypeParameter'
    };
    return kindNames[kind] || `Unknown(${kind})`;
}

// Run the test
testSymbolProvider().catch(console.error);