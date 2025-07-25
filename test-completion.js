/**
 * Test script for Drools completion provider
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

// Test completion provider
function testCompletionProvider() {
    console.log('Testing Drools Completion Provider...\n');

    const parser = new DroolsParser();
    const completionSettings = {
        enableKeywordCompletion: true,
        enableFactTypeCompletion: true,
        enableFunctionCompletion: true,
        enableVariableCompletion: true,
        maxCompletionItems: 50
    };
    
    const completionProvider = new DroolsCompletionProvider(completionSettings);

    // Test 1: Global scope keyword completion
    console.log('Test 1: Global scope keyword completion');
    const globalText = `package com.example
import java.util.List

ru`;
    
    const globalDoc = new MockTextDocument(globalText);
    const globalParseResult = parser.parse(globalText);
    const globalPosition = { line: 2, character: 2 }; // After "ru"
    
    const globalCompletions = completionProvider.provideCompletions(
        globalDoc, 
        globalPosition, 
        globalParseResult
    );
    
    console.log('Global completions:', globalCompletions.map(c => c.label));
    console.log('');

    // Test 2: Rule context completion
    console.log('Test 2: Rule context completion');
    const ruleText = `package com.example

rule "Test Rule"
    wh`;
    
    const ruleDoc = new MockTextDocument(ruleText);
    const ruleParseResult = parser.parse(ruleText);
    const rulePosition = { line: 3, character: 6 }; // After "wh"
    
    const ruleCompletions = completionProvider.provideCompletions(
        ruleDoc, 
        rulePosition, 
        ruleParseResult
    );
    
    console.log('Rule completions:', ruleCompletions.map(c => c.label));
    console.log('');

    // Test 3: When clause completion
    console.log('Test 3: When clause completion');
    const whenText = `package com.example

rule "Test Rule"
when
    ex`;
    
    const whenDoc = new MockTextDocument(whenText);
    const whenParseResult = parser.parse(whenText);
    const whenPosition = { line: 4, character: 6 }; // After "ex"
    
    const whenCompletions = completionProvider.provideCompletions(
        whenDoc, 
        whenPosition, 
        whenParseResult
    );
    
    console.log('When completions:', whenCompletions.map(c => c.label));
    console.log('');

    // Test 4: Then clause completion
    console.log('Test 4: Then clause completion');
    const thenText = `package com.example

rule "Test Rule"
when
    $person : Person()
then
    ins`;
    
    const thenDoc = new MockTextDocument(thenText);
    const thenParseResult = parser.parse(thenText);
    const thenPosition = { line: 6, character: 7 }; // After "ins"
    
    const thenCompletions = completionProvider.provideCompletions(
        thenDoc, 
        thenPosition, 
        thenParseResult
    );
    
    console.log('Then completions:', thenCompletions.map(c => c.label));
    console.log('');

    // Test 5: Variable completion
    console.log('Test 5: Variable completion');
    const varText = `package com.example

global Logger logger

rule "Test Rule"
when
    $person : Person()
then
    $p`;
    
    const varDoc = new MockTextDocument(varText);
    const varParseResult = parser.parse(varText);
    const varPosition = { line: 8, character: 6 }; // After "$p"
    
    const varCompletions = completionProvider.provideCompletions(
        varDoc, 
        varPosition, 
        varParseResult
    );
    
    console.log('Variable completions:', varCompletions.map(c => c.label));
    console.log('');

    console.log('Completion provider tests completed!');
}

// Run tests
try {
    testCompletionProvider();
} catch (error) {
    console.error('Test failed:', error);
}