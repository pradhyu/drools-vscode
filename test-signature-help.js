/**
 * Test script for Drools signature help functionality
 */

const { DroolsCompletionProvider } = require('./out/server/providers/completionProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');

// Mock TextDocument
class MockTextDocument {
    constructor(text) {
        this.text = text;
        this.lines = text.split('\n');
    }

    getText(range) {
        if (!range) {
            return this.text;
        }
        
        if (range.start.line === range.end.line) {
            return this.lines[range.start.line].substring(range.start.character, range.end.character);
        }
        
        let result = this.lines[range.start.line].substring(range.start.character);
        for (let i = range.start.line + 1; i < range.end.line; i++) {
            result += '\n' + this.lines[i];
        }
        result += '\n' + this.lines[range.end.line].substring(0, range.end.character);
        return result;
    }
}

function testSignatureHelp() {
    console.log('Testing Drools Signature Help...\n');

    const parser = new DroolsParser();
    const completionSettings = {
        enableKeywordCompletion: true,
        enableFactTypeCompletion: true,
        enableFunctionCompletion: true,
        enableVariableCompletion: true,
        maxCompletionItems: 50
    };
    
    const completionProvider = new DroolsCompletionProvider(completionSettings);

    // Test 1: Built-in function signature help
    console.log('Test 1: Built-in function signature help');
    const builtInText = `package com.example

rule "Test Rule"
when
    $person : Person()
then
    insert(`;
    
    const builtInDoc = new MockTextDocument(builtInText);
    const builtInParseResult = parser.parse(builtInText);
    const builtInPosition = { line: 6, character: 11 }; // After "insert("
    
    const builtInSignatureHelp = completionProvider.provideSignatureHelp(
        builtInDoc, 
        builtInPosition, 
        builtInParseResult
    );
    
    if (builtInSignatureHelp) {
        console.log('Built-in function signature help:');
        builtInSignatureHelp.signatures.forEach((sig, index) => {
            console.log(`  Signature ${index}: ${sig.label}`);
            console.log(`  Documentation: ${sig.documentation}`);
            if (sig.parameters) {
                sig.parameters.forEach((param, paramIndex) => {
                    const isActive = paramIndex === builtInSignatureHelp.activeParameter;
                    console.log(`    ${isActive ? '>' : ' '} Parameter ${paramIndex}: ${param.label}`);
                    if (param.documentation) {
                        console.log(`      ${param.documentation}`);
                    }
                });
            }
        });
        console.log(`  Active signature: ${builtInSignatureHelp.activeSignature}`);
        console.log(`  Active parameter: ${builtInSignatureHelp.activeParameter}`);
    } else {
        console.log('No signature help found for built-in function');
    }
    console.log('');

    // Test 2: User-defined function signature help
    console.log('Test 2: User-defined function signature help');
    const userFunctionText = `package com.example

function String formatMessage(String msg, int level) {
    return "[" + level + "] " + msg;
}

rule "Test Rule"
when
    $person : Person()
then
    formatMessage("Hello", `;
    
    const userFunctionDoc = new MockTextDocument(userFunctionText);
    const userFunctionParseResult = parser.parse(userFunctionText);
    const userFunctionPosition = { line: 10, character: 26 }; // After 'formatMessage("Hello", '
    
    const userFunctionSignatureHelp = completionProvider.provideSignatureHelp(
        userFunctionDoc, 
        userFunctionPosition, 
        userFunctionParseResult
    );
    
    if (userFunctionSignatureHelp) {
        console.log('User-defined function signature help:');
        userFunctionSignatureHelp.signatures.forEach((sig, index) => {
            console.log(`  Signature ${index}: ${sig.label}`);
            console.log(`  Documentation: ${sig.documentation}`);
            if (sig.parameters) {
                sig.parameters.forEach((param, paramIndex) => {
                    const isActive = paramIndex === userFunctionSignatureHelp.activeParameter;
                    console.log(`    ${isActive ? '>' : ' '} Parameter ${paramIndex}: ${param.label}`);
                    if (param.documentation) {
                        console.log(`      ${param.documentation}`);
                    }
                });
            }
        });
        console.log(`  Active signature: ${userFunctionSignatureHelp.activeSignature}`);
        console.log(`  Active parameter: ${userFunctionSignatureHelp.activeParameter}`);
    } else {
        console.log('No signature help found for user-defined function');
    }
    console.log('');

    // Test 3: Multiple parameter function
    console.log('Test 3: Multiple parameter function with modify');
    const modifyText = `package com.example

rule "Test Rule"
when
    $person : Person()
then
    modify(`;
    
    const modifyDoc = new MockTextDocument(modifyText);
    const modifyParseResult = parser.parse(modifyText);
    const modifyPosition = { line: 6, character: 11 }; // After "modify("
    
    const modifySignatureHelp = completionProvider.provideSignatureHelp(
        modifyDoc, 
        modifyPosition, 
        modifyParseResult
    );
    
    if (modifySignatureHelp) {
        console.log('Modify function signature help:');
        modifySignatureHelp.signatures.forEach((sig, index) => {
            console.log(`  Signature ${index}: ${sig.label}`);
            console.log(`  Documentation: ${sig.documentation}`);
            if (sig.parameters) {
                sig.parameters.forEach((param, paramIndex) => {
                    const isActive = paramIndex === modifySignatureHelp.activeParameter;
                    console.log(`    ${isActive ? '>' : ' '} Parameter ${paramIndex}: ${param.label}`);
                    if (param.documentation) {
                        console.log(`      ${param.documentation}`);
                    }
                });
            }
        });
        console.log(`  Active signature: ${modifySignatureHelp.activeSignature}`);
        console.log(`  Active parameter: ${modifySignatureHelp.activeParameter}`);
    } else {
        console.log('No signature help found for modify function');
    }
    console.log('');

    // Test 4: No signature help case
    console.log('Test 4: No signature help case (not in function call)');
    const noHelpText = `package com.example

rule "Test Rule"
when
    $person : Person()
then
    String message = "Hello";`;
    
    const noHelpDoc = new MockTextDocument(noHelpText);
    const noHelpParseResult = parser.parse(noHelpText);
    const noHelpPosition = { line: 6, character: 26 }; // After 'String message = "Hello";'
    
    const noHelpSignatureHelp = completionProvider.provideSignatureHelp(
        noHelpDoc, 
        noHelpPosition, 
        noHelpParseResult
    );
    
    if (noHelpSignatureHelp) {
        console.log('Unexpected signature help found');
    } else {
        console.log('Correctly returned no signature help');
    }

    console.log('\nSignature help tests completed!');
}

// Run tests
try {
    testSignatureHelp();
} catch (error) {
    console.error('Test failed:', error);
    console.error(error.stack);
}