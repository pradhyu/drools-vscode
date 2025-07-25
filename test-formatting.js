/**
 * Test script for Drools document formatting provider
 */

const { DroolsFormattingProvider } = require('./out/server/providers/formattingProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test data - unformatted Drools code
const unformattedDroolsCode = `package com.example.rules;

import java.util.List;
import static java.lang.Math.max;

global java.util.List results;

function int calculateScore(int base,int multiplier){
return base*multiplier;
}

rule "Test Rule"
salience 100
no-loop true
when
$person:Person(age>18,name!=null)
$account:Account(balance>=1000)
eval(calculateScore($person.getAge(),2)>50)
then
$account.setBalance($account.getBalance()+100);
results.add($person.getName());
System.out.println("Rule fired for: "+$person.getName());
end

query "Find Adults"(String namePattern)
$person:Person(age>=18,name matches namePattern)
end

declare PersonScore
name:String
score:int
end`;

// Expected formatted output
const expectedFormattedCode = `package com.example.rules;

import java.util.List;
import static java.lang.Math.max;

global java.util.List results;

function int calculateScore(int base, int multiplier) {
    return base * multiplier;
}

rule "Test Rule"
    salience 100
    no-loop true
when
    $person : Person(age > 18, name != null)
    $account : Account(balance >= 1000)
    eval(calculateScore($person.getAge(), 2) > 50)
then
    $account.setBalance($account.getBalance() + 100);
    results.add($person.getName());
    System.out.println("Rule fired for: " + $person.getName());
end

query "Find Adults"(String namePattern)
    $person : Person(age >= 18, name matches namePattern)
end

declare PersonScore
    name : String
    score : int
end
`;

async function testDocumentFormatting() {
    console.log('Testing Drools Document Formatting Provider...\n');

    try {
        // Create parser and formatting provider
        const parser = new DroolsParser();
        const formattingProvider = new DroolsFormattingProvider();

        // Create text document
        const document = TextDocument.create(
            'file:///test.drl',
            'drools',
            1,
            unformattedDroolsCode
        );

        // Parse the document
        const parseResult = parser.parse(unformattedDroolsCode);
        console.log('✓ Document parsed successfully');
        console.log(`  - Found ${parseResult.ast.rules.length} rules`);
        console.log(`  - Found ${parseResult.ast.functions.length} functions`);
        console.log(`  - Found ${parseResult.ast.queries.length} queries`);
        console.log(`  - Found ${parseResult.ast.declares.length} declare statements`);
        console.log(`  - Parse errors: ${parseResult.errors.length}\n`);

        // Test document formatting
        const formattingOptions = {
            insertSpaces: true,
            tabSize: 4
        };

        const textEdits = formattingProvider.formatDocument(
            document,
            formattingOptions,
            parseResult
        );

        console.log('✓ Document formatting completed');
        console.log(`  - Generated ${textEdits.length} text edits\n`);

        if (textEdits.length > 0) {
            const formattedText = textEdits[0].newText;
            
            console.log('Original code:');
            console.log('─'.repeat(50));
            console.log(unformattedDroolsCode);
            console.log('─'.repeat(50));
            
            console.log('\nFormatted code:');
            console.log('─'.repeat(50));
            console.log(formattedText);
            console.log('─'.repeat(50));

            // Test specific formatting requirements
            testFormattingRequirements(formattedText);
        }

        // Test range formatting
        console.log('\n' + '='.repeat(60));
        console.log('Testing Range Formatting...');
        console.log('='.repeat(60));

        const range = {
            start: { line: 8, character: 0 },
            end: { line: 16, character: 0 }
        };

        const rangeEdits = formattingProvider.formatRange(
            document,
            range,
            parseResult
        );

        console.log('✓ Range formatting completed');
        console.log(`  - Generated ${rangeEdits.length} text edits for range`);

        if (rangeEdits.length > 0) {
            console.log('\nRange formatted code:');
            console.log('─'.repeat(30));
            console.log(rangeEdits[0].newText);
            console.log('─'.repeat(30));
        }

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        console.error(error.stack);
    }
}

function testFormattingRequirements(formattedText) {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Formatting Requirements...');
    console.log('='.repeat(60));

    const lines = formattedText.split('\n');
    let passed = 0;
    let total = 0;

    // Requirement 4.1: Proper rule block indentation
    total++;
    const ruleBlockIndented = lines.some(line => 
        line.match(/^\s{4}(when|then|salience|no-loop)/) || 
        line.match(/^\s{4}\$\w+\s*:/)
    );
    if (ruleBlockIndented) {
        console.log('✓ Rule block indentation is correct');
        passed++;
    } else {
        console.log('✗ Rule block indentation failed');
    }

    // Requirement 4.2: Proper spacing around operators
    total++;
    const operatorSpacing = formattedText.includes(' > ') && 
                           formattedText.includes(' != ') && 
                           formattedText.includes(' >= ') &&
                           formattedText.includes(' + ');
    if (operatorSpacing) {
        console.log('✓ Operator spacing is correct');
        passed++;
    } else {
        console.log('✗ Operator spacing failed');
    }

    // Requirement 4.3: Proper spacing around keywords
    total++;
    const keywordSpacing = formattedText.includes('rule ') && 
                          formattedText.includes('function ') &&
                          formattedText.includes('import ') &&
                          formattedText.includes('package ');
    if (keywordSpacing) {
        console.log('✓ Keyword spacing is correct');
        passed++;
    } else {
        console.log('✗ Keyword spacing failed');
    }

    // Requirement 4.4: Logic preservation (check that rule structure is maintained)
    total++;
    const logicPreserved = formattedText.includes('rule "Test Rule"') &&
                          formattedText.includes('when') &&
                          formattedText.includes('then') &&
                          formattedText.includes('end') &&
                          formattedText.includes('$person : Person') &&
                          formattedText.includes('$account : Account');
    if (logicPreserved) {
        console.log('✓ Rule logic is preserved');
        passed++;
    } else {
        console.log('✗ Rule logic preservation failed');
    }

    // Additional checks
    total++;
    const functionFormatted = formattedText.includes('function int calculateScore(int base, int multiplier) {') &&
                             formattedText.includes('    return base * multiplier;');
    if (functionFormatted) {
        console.log('✓ Function formatting is correct');
        passed++;
    } else {
        console.log('✗ Function formatting failed');
    }

    total++;
    const colonSpacing = formattedText.includes('$person : Person') &&
                        formattedText.includes('name : String');
    if (colonSpacing) {
        console.log('✓ Colon spacing in patterns is correct');
        passed++;
    } else {
        console.log('✗ Colon spacing in patterns failed');
    }

    console.log(`\nFormatting Requirements: ${passed}/${total} passed`);
    
    if (passed === total) {
        console.log('🎉 All formatting requirements met!');
    } else {
        console.log('⚠️  Some formatting requirements need attention');
    }
}

// Run the test
testDocumentFormatting().catch(console.error);