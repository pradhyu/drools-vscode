/**
 * Simple test to verify the diagnostic provider functionality
 */

const { DroolsParser } = require('./out/server/parser/droolsParser');
const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');

// Mock TextDocument
class MockTextDocument {
    constructor(text) {
        this.text = text;
    }
    
    getText() {
        return this.text;
    }
}

// Test cases
const testCases = [
    {
        name: "Valid rule",
        content: `package com.example.rules

import com.example.Person

rule "Adult Check"
    when
        $person : Person(age >= 18)
    then
        System.out.println("Person is an adult: " + $person.getName());
end`
    },
    {
        name: "Duplicate rule names",
        content: `package com.example.rules

rule "Test Rule"
    when
        $p : Person()
    then
        System.out.println("First rule");
end

rule "Test Rule"
    when
        $p : Person()
    then
        System.out.println("Duplicate rule");
end`
    },
    {
        name: "Missing semicolons",
        content: `package com.example.rules

import com.example.Person

global Logger logger

rule "Test Rule"
    when
        $p : Person()
    then
        System.out.println("Test");
end`
    },
    {
        name: "Undefined variable",
        content: `package com.example.rules

rule "Test Rule"
    when
        $person : Person()
    then
        System.out.println($undefinedVar.getName());
end`
    },
    {
        name: "Unmatched brackets",
        content: `package com.example.rules

rule "Test Rule"
    when
        $person : Person(age >= 18
    then
        System.out.println("Missing closing parenthesis");
end`
    }
];

// Test function
function runTests() {
    const parser = new DroolsParser();
    const diagnosticSettings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };
    
    console.log('Running diagnostic provider tests...\n');
    
    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        console.log('=' .repeat(50));
        
        try {
            // Parse the content
            const parseResult = parser.parse(testCase.content);
            
            // Create diagnostic provider
            const diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);
            const document = new MockTextDocument(testCase.content);
            
            // Get diagnostics
            const diagnostics = diagnosticProvider.provideDiagnostics(
                document,
                parseResult.ast,
                parseResult.errors
            );
            
            console.log(`Found ${diagnostics.length} diagnostic(s):`);
            
            for (const diagnostic of diagnostics) {
                const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
                console.log(`  [${severity}] Line ${diagnostic.range.start.line + 1}: ${diagnostic.message} (${diagnostic.source})`);
            }
            
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
        
        console.log('\n');
    }
}

// Run the tests
runTests();