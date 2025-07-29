#!/usr/bin/env node

/**
 * Test script for multi-line pattern completion functionality
 */

const { DroolsCompletionProvider } = require('./out/server/providers/completionProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test settings
const completionSettings = {
    enableKeywordCompletion: true,
    enableFactTypeCompletion: true,
    enableFunctionCompletion: true,
    enableVariableCompletion: true,
    maxCompletionItems: 50
};

// Create test instances
const parser = new DroolsParser();
const completionProvider = new DroolsCompletionProvider(completionSettings);

// Test cases for multi-line pattern completion
const testCases = [
    {
        name: "Multi-line exists pattern - keyword completion",
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18) 
    )
then
    // action
end`,
        position: { line: 4, character: 8 }, // After "and" position
        expectedKeywords: ['and', 'or', 'exists', 'not']
    },
    {
        name: "Multi-line not pattern - fact type completion",
        content: `rule "Test Rule"
when
    not(
        Per
    )
then
    // action
end`,
        position: { line: 3, character: 11 }, // After "Per"
        expectedFactTypes: ['Person']
    },
    {
        name: "Nested multi-line pattern - keyword completion",
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18) and
        not(
            
        )
    )
then
    // action
end`,
        position: { line: 5, character: 12 }, // Inside nested not pattern
        expectedKeywords: ['exists', 'not', 'eval']
    },
    {
        name: "Multi-line eval pattern - operator completion",
        content: `rule "Test Rule"
when
    eval(
        person.getAge() 
    )
then
    // action
end`,
        position: { line: 3, character: 24 }, // After getAge()
        expectedOperators: ['>', '<', '==', '!=']
    },
    {
        name: "Multi-line accumulate pattern - keyword completion",
        content: `rule "Test Rule"
when
    accumulate(
        Person(age > 18),
        
    )
then
    // action
end`,
        position: { line: 4, character: 8 }, // After comma in accumulate
        expectedKeywords: ['sum', 'count', 'average', 'min', 'max']
    }
];

async function runTests() {
    console.log('🧪 Testing Multi-line Pattern Completion Functionality\n');
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
        console.log(`📝 Testing: ${testCase.name}`);
        
        try {
            // Create text document
            const document = TextDocument.create(
                'test://test.drl',
                'drools',
                1,
                testCase.content
            );
            
            // Parse the document
            const parseResult = parser.parse(testCase.content);
            
            if (parseResult.errors.length > 0) {
                console.log(`   ⚠️  Parse errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
            }
            
            // Get completions
            const completions = completionProvider.provideCompletions(
                document,
                testCase.position,
                parseResult
            );
            
            console.log(`   📊 Found ${completions.length} completions`);
            
            // Check for expected keywords
            if (testCase.expectedKeywords) {
                const foundKeywords = completions
                    .filter(c => c.kind === 14) // CompletionItemKind.Keyword
                    .map(c => c.label);
                
                console.log(`   🔑 Keywords found: ${foundKeywords.join(', ')}`);
                
                const hasExpectedKeywords = testCase.expectedKeywords.some(keyword => 
                    foundKeywords.includes(keyword)
                );
                
                if (hasExpectedKeywords) {
                    console.log(`   ✅ Expected keywords found`);
                    passedTests++;
                } else {
                    console.log(`   ❌ Expected keywords not found. Expected: ${testCase.expectedKeywords.join(', ')}`);
                }
            }
            
            // Check for expected fact types
            if (testCase.expectedFactTypes) {
                const foundFactTypes = completions
                    .filter(c => c.kind === 7) // CompletionItemKind.Class
                    .map(c => c.label);
                
                console.log(`   🏷️  Fact types found: ${foundFactTypes.join(', ')}`);
                
                const hasExpectedFactTypes = testCase.expectedFactTypes.some(factType => 
                    foundFactTypes.includes(factType)
                );
                
                if (hasExpectedFactTypes) {
                    console.log(`   ✅ Expected fact types found`);
                    passedTests++;
                } else {
                    console.log(`   ❌ Expected fact types not found. Expected: ${testCase.expectedFactTypes.join(', ')}`);
                }
            }
            
            // Check for expected operators
            if (testCase.expectedOperators) {
                const foundOperators = completions
                    .filter(c => c.kind === 24) // CompletionItemKind.Operator
                    .map(c => c.label);
                
                console.log(`   ⚙️  Operators found: ${foundOperators.join(', ')}`);
                
                const hasExpectedOperators = testCase.expectedOperators.some(operator => 
                    foundOperators.includes(operator)
                );
                
                if (hasExpectedOperators) {
                    console.log(`   ✅ Expected operators found`);
                    passedTests++;
                } else {
                    console.log(`   ❌ Expected operators not found. Expected: ${testCase.expectedOperators.join(', ')}`);
                }
            }
            
            // Check if completions contain multi-line pattern context information
            const hasMultiLineContext = completions.some(c => 
                c.detail && c.detail.includes('pattern')
            );
            
            if (hasMultiLineContext) {
                console.log(`   🎯 Multi-line pattern context detected in completions`);
            } else {
                console.log(`   ⚠️  No multi-line pattern context detected in completions`);
            }
            
        } catch (error) {
            console.log(`   ❌ Test failed with error: ${error.message}`);
            console.log(`   📍 Stack: ${error.stack}`);
        }
        
        console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Multi-line pattern completion is working correctly.');
        process.exit(0);
    } else {
        console.log('❌ Some tests failed. Please check the implementation.');
        process.exit(1);
    }
}

// Additional test for context detection
async function testContextDetection() {
    console.log('\n🔍 Testing Multi-line Pattern Context Detection\n');
    
    const testContent = `rule "Complex Multi-line Pattern"
when
    exists(
        Person(age > 18) and
        not(
            Account(balance < 0)
        )
    ) and
    eval(
        someCondition == true
    )
then
    insert(new Result("success"));
end`;
    
    const document = TextDocument.create('test://context.drl', 'drools', 1, testContent);
    const parseResult = parser.parse(testContent);
    
    // Test positions within different multi-line patterns
    const testPositions = [
        { line: 3, character: 20, expected: 'exists' }, // Inside exists pattern
        { line: 5, character: 15, expected: 'not' },    // Inside nested not pattern
        { line: 9, character: 10, expected: 'eval' }    // Inside eval pattern
    ];
    
    for (const testPos of testPositions) {
        console.log(`Testing position line ${testPos.line}, character ${testPos.character}`);
        
        const completions = completionProvider.provideCompletions(
            document,
            testPos,
            parseResult
        );
        
        // Check if context was detected correctly
        const hasContextAwareCompletions = completions.some(c => 
            c.detail && c.detail.includes('pattern')
        );
        
        if (hasContextAwareCompletions) {
            console.log(`   ✅ Context-aware completions found for ${testPos.expected} pattern`);
        } else {
            console.log(`   ⚠️  No context-aware completions found for ${testPos.expected} pattern`);
        }
    }
}

// Run the tests
if (require.main === module) {
    runTests()
        .then(() => testContextDetection())
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runTests, testContextDetection };