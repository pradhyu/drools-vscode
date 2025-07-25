/**
 * Comprehensive test for Drools document formatting provider
 * Tests edge cases and complex formatting scenarios
 */

const { DroolsFormattingProvider } = require('./out/server/providers/formattingProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test data with various edge cases
const complexDroolsCode = `package com.example.complex;

import java.util.*;
import static java.lang.Math.*;

global List<String>results;
global int counter;

function boolean isValid(Person p,int minAge){
if(p==null||p.getAge()<minAge){
return false;
}
return true;
}

rule "Complex Rule"
salience 1000
no-loop true
lock-on-active true
when
$p:Person(age>=18,name!=null,status=="ACTIVE")
$acc:Account(owner==$p,balance>0)
exists(Transaction(account==$acc,amount>100))
not(Blacklist(person==$p))
eval($p.getAge()-18>=5)
then
$acc.setBalance($acc.getBalance()+50);
results.add($p.getName());
System.out.println("Processed: "+$p.getName());
insert(new Reward($p,50));
end

query "Complex Query"(int minAge,String status)
$person:Person(age>=minAge,status==status)
$account:Account(owner==$person,balance>1000)
end

declare ComplexType
name:String
values:List<Integer>
metadata:Map<String,Object>
end`;

async function testComprehensiveFormatting() {
    console.log('Testing Comprehensive Drools Document Formatting...\n');

    try {
        // Create parser and formatting provider
        const parser = new DroolsParser();
        const formattingProvider = new DroolsFormattingProvider();

        // Create text document
        const document = TextDocument.create(
            'file:///complex.drl',
            'drools',
            1,
            complexDroolsCode
        );

        // Parse the document
        const parseResult = parser.parse(complexDroolsCode);
        console.log('✓ Complex document parsed successfully');
        console.log(`  - Parse errors: ${parseResult.errors.length}`);

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

        console.log('✓ Complex document formatting completed');
        console.log(`  - Generated ${textEdits.length} text edits\n`);

        if (textEdits.length > 0) {
            const formattedText = textEdits[0].newText;
            
            console.log('Original complex code:');
            console.log('─'.repeat(60));
            console.log(complexDroolsCode);
            console.log('─'.repeat(60));
            
            console.log('\nFormatted complex code:');
            console.log('─'.repeat(60));
            console.log(formattedText);
            console.log('─'.repeat(60));

            // Test comprehensive formatting requirements
            testComprehensiveRequirements(formattedText);
        }

        // Test range formatting with different ranges
        await testRangeFormatting(document, formattingProvider, parseResult);

        // Test different formatting options
        await testFormattingOptions(document, formattingProvider, parseResult);

    } catch (error) {
        console.error('✗ Comprehensive test failed:', error.message);
        console.error(error.stack);
    }
}

function testComprehensiveRequirements(formattedText) {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Comprehensive Formatting Requirements...');
    console.log('='.repeat(60));

    const lines = formattedText.split('\n');
    let passed = 0;
    let total = 0;

    // Test 1: Generic type formatting
    total++;
    const genericTypes = formattedText.includes('List<String>') && 
                        formattedText.includes('List<Integer>') &&
                        formattedText.includes('Map<String, Object>');
    if (genericTypes) {
        console.log('✓ Generic type formatting is correct');
        passed++;
    } else {
        console.log('✗ Generic type formatting failed');
    }

    // Test 2: Complex operator spacing
    total++;
    const complexOperators = formattedText.includes('age >= 18') && 
                            formattedText.includes('status == "ACTIVE"') &&
                            formattedText.includes('owner == $p') &&
                            formattedText.includes('amount > 100');
    if (complexOperators) {
        console.log('✓ Complex operator spacing is correct');
        passed++;
    } else {
        console.log('✗ Complex operator spacing failed');
    }

    // Test 3: Function parameter formatting
    total++;
    const functionParams = formattedText.includes('isValid(Person p, int minAge)') &&
                          formattedText.includes('p == null || p.getAge() < minAge');
    if (functionParams) {
        console.log('✓ Function parameter formatting is correct');
        passed++;
    } else {
        console.log('✗ Function parameter formatting failed');
    }

    // Test 4: Complex rule attributes
    total++;
    const ruleAttributes = formattedText.includes('no-loop true') &&
                          formattedText.includes('lock-on-active true');
    if (ruleAttributes) {
        console.log('✓ Complex rule attributes formatting is correct');
        passed++;
    } else {
        console.log('✗ Complex rule attributes formatting failed');
    }

    // Test 5: Nested conditions formatting
    total++;
    const nestedConditions = formattedText.includes('exists(Transaction(account == $acc, amount > 100))') &&
                            formattedText.includes('not(Blacklist(person == $p))');
    if (nestedConditions) {
        console.log('✓ Nested conditions formatting is correct');
        passed++;
    } else {
        console.log('✗ Nested conditions formatting failed');
    }

    // Test 6: String concatenation formatting
    total++;
    const stringConcat = formattedText.includes('"Processed: "+$p.getName()');
    if (stringConcat) {
        console.log('✓ String concatenation formatting is correct');
        passed++;
    } else {
        console.log('✗ String concatenation formatting failed');
    }

    // Test 7: Method chaining formatting
    total++;
    const methodChaining = formattedText.includes('$acc.getBalance() + 50');
    if (methodChaining) {
        console.log('✓ Method chaining formatting is correct');
        passed++;
    } else {
        console.log('✗ Method chaining formatting failed');
    }

    console.log(`\nComprehensive Formatting Requirements: ${passed}/${total} passed`);
    
    if (passed === total) {
        console.log('🎉 All comprehensive formatting requirements met!');
    } else {
        console.log('⚠️  Some comprehensive formatting requirements need attention');
    }
}

async function testRangeFormatting(document, formattingProvider, parseResult) {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Range Formatting Scenarios...');
    console.log('='.repeat(60));

    // Test range formatting for function only
    const functionRange = {
        start: { line: 7, character: 0 },
        end: { line: 12, character: 0 }
    };

    const functionEdits = formattingProvider.formatRange(
        document,
        functionRange,
        parseResult
    );

    console.log('✓ Function range formatting completed');
    console.log(`  - Generated ${functionEdits.length} text edits`);

    // Test range formatting for rule only
    const ruleRange = {
        start: { line: 14, character: 0 },
        end: { line: 26, character: 0 }
    };

    const ruleEdits = formattingProvider.formatRange(
        document,
        ruleRange,
        parseResult
    );

    console.log('✓ Rule range formatting completed');
    console.log(`  - Generated ${ruleEdits.length} text edits`);
}

async function testFormattingOptions(document, formattingProvider, parseResult) {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Different Formatting Options...');
    console.log('='.repeat(60));

    // Test with tabs instead of spaces
    const tabOptions = {
        insertSpaces: false,
        tabSize: 4
    };

    const tabEdits = formattingProvider.formatDocument(
        document,
        tabOptions,
        parseResult
    );

    console.log('✓ Tab-based formatting completed');
    console.log(`  - Generated ${tabEdits.length} text edits`);

    // Test with different tab size
    const smallTabOptions = {
        insertSpaces: true,
        tabSize: 2
    };

    const smallTabEdits = formattingProvider.formatDocument(
        document,
        smallTabOptions,
        parseResult
    );

    console.log('✓ Small tab formatting completed');
    console.log(`  - Generated ${smallTabEdits.length} text edits`);
}

// Run the comprehensive test
testComprehensiveFormatting().catch(console.error);