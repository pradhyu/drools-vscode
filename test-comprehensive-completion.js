/**
 * Comprehensive test for Drools completion provider
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

function testComprehensiveCompletion() {
    console.log('Testing Comprehensive Drools Completion Provider...\n');

    const parser = new DroolsParser();
    const completionSettings = {
        enableKeywordCompletion: true,
        enableFactTypeCompletion: true,
        enableFunctionCompletion: true,
        enableVariableCompletion: true,
        maxCompletionItems: 50
    };
    
    const completionProvider = new DroolsCompletionProvider(completionSettings);

    // Test with a comprehensive Drools file
    const comprehensiveText = `package com.example.rules

import java.util.List
import java.util.Date

global Logger logger
global String applicationName

function String formatMessage(String msg) {
    return "[" + applicationName + "] " + msg;
}

rule "Person Age Validation"
    salience 100
    no-loop true
when
    $person : Person(age < 18, name != null)
    $parent : Person(children contains $person)
then
    logger.info(formatMessage("Minor person found: " + $person.getName()));
    modify($person) {
        setValidated(true)
    }
end

rule "Adult Processing"
when
    $adult : Person(age >= 18)
then
    `;

    console.log('=== Testing Variable Completion in Then Clause ===');
    const doc = new MockTextDocument(comprehensiveText);
    const parseResult = parser.parse(comprehensiveText);
    
    // Test variable completion after "$" in then clause
    const position = { line: 26, character: 4 }; // After "    " in then clause
    const completions = completionProvider.provideCompletions(doc, position, parseResult);
    
    console.log('Available completions:');
    completions.forEach(completion => {
        console.log(`  - ${completion.label} (${completion.kind}) - ${completion.detail || 'No detail'}`);
    });
    
    console.log('\n=== Testing Function Completion ===');
    const functionText = comprehensiveText + 'formatM';
    const funcDoc = new MockTextDocument(functionText);
    const funcParseResult = parser.parse(functionText);
    const funcPosition = { line: 26, character: 11 }; // After "formatM"
    
    const funcCompletions = completionProvider.provideCompletions(funcDoc, funcPosition, funcParseResult);
    console.log('Function completions:');
    funcCompletions.forEach(completion => {
        console.log(`  - ${completion.label} (${completion.kind}) - ${completion.detail || 'No detail'}`);
        if (completion.insertText && completion.insertText !== completion.label) {
            console.log(`    Insert: ${completion.insertText}`);
        }
    });

    console.log('\n=== Testing Fact Type Completion ===');
    const factText = `package com.example

rule "Test"
when
    $p : Per`;
    
    const factDoc = new MockTextDocument(factText);
    const factParseResult = parser.parse(factText);
    const factPosition = { line: 4, character: 10 }; // After "Per"
    
    const factCompletions = completionProvider.provideCompletions(factDoc, factPosition, factParseResult);
    console.log('Fact type completions:');
    factCompletions.forEach(completion => {
        console.log(`  - ${completion.label} (${completion.kind}) - ${completion.detail || 'No detail'}`);
    });

    console.log('\n=== Testing Keyword Completion in Different Contexts ===');
    
    // Test in global context
    const globalKeywordText = `package com.example

glo`;
    const globalKeywordDoc = new MockTextDocument(globalKeywordText);
    const globalKeywordParseResult = parser.parse(globalKeywordText);
    const globalKeywordPosition = { line: 2, character: 3 }; // After "glo"
    
    const globalKeywordCompletions = completionProvider.provideCompletions(
        globalKeywordDoc, 
        globalKeywordPosition, 
        globalKeywordParseResult
    );
    console.log('Global context keyword completions:');
    globalKeywordCompletions.forEach(completion => {
        console.log(`  - ${completion.label} (${completion.kind})`);
    });

    // Test in when context
    const whenKeywordText = `package com.example

rule "Test"
when
    ex`;
    const whenKeywordDoc = new MockTextDocument(whenKeywordText);
    const whenKeywordParseResult = parser.parse(whenKeywordText);
    const whenKeywordPosition = { line: 4, character: 6 }; // After "ex"
    
    const whenKeywordCompletions = completionProvider.provideCompletions(
        whenKeywordDoc, 
        whenKeywordPosition, 
        whenKeywordParseResult
    );
    console.log('\nWhen context keyword completions:');
    whenKeywordCompletions.forEach(completion => {
        console.log(`  - ${completion.label} (${completion.kind})`);
    });

    console.log('\n=== Testing Snippet Completions ===');
    
    // Test rule snippet
    const ruleSnippetText = `package com.example

ru`;
    const ruleSnippetDoc = new MockTextDocument(ruleSnippetText);
    const ruleSnippetParseResult = parser.parse(ruleSnippetText);
    const ruleSnippetPosition = { line: 2, character: 2 }; // After "ru"
    
    const ruleSnippetCompletions = completionProvider.provideCompletions(
        ruleSnippetDoc, 
        ruleSnippetPosition, 
        ruleSnippetParseResult
    );
    
    const snippets = ruleSnippetCompletions.filter(c => c.kind === 15); // CompletionItemKind.Snippet
    console.log('Snippet completions:');
    snippets.forEach(completion => {
        console.log(`  - ${completion.label} (${completion.kind})`);
        if (completion.insertText) {
            console.log(`    Insert: ${completion.insertText.substring(0, 50)}...`);
        }
    });

    console.log('\nComprehensive completion provider tests completed!');
}

// Run tests
try {
    testComprehensiveCompletion();
} catch (error) {
    console.error('Test failed:', error);
    console.error(error.stack);
}