/**
 * Test script for multi-line pattern AST generation
 */

const { DroolsParser } = require('./out/server/parser/droolsParser.js');

// Test cases for multi-line patterns
const testCases = [
    {
        name: 'Simple exists pattern',
        content: `rule "Test exists"
when
    exists(
        Person(age > 18)
    )
then
    // action
end`
    },
    {
        name: 'Nested multi-line pattern',
        content: `rule "Test nested"
when
    exists(
        Person(age > 18) and
        not(
            Account(balance < 0)
        )
    )
then
    // action
end`
    },
    {
        name: 'Multiple pattern types',
        content: `rule "Test multiple"
when
    exists(Person(age > 18))
    not(
        Account(
            owner == $person,
            balance < 0
        )
    )
    eval(
        $person.getName() != null
    )
then
    // action
end`
    }
];

function runTests() {
    console.log('Testing Multi-line Pattern AST Generation...\n');
    
    const parser = new DroolsParser();
    
    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.name}`);
        console.log('Content:');
        console.log(testCase.content);
        console.log('\n--- Parsing Results ---');
        
        try {
            const result = parser.parse(testCase.content);
            
            console.log('Errors:', result.errors.length);
            if (result.errors.length > 0) {
                result.errors.forEach(error => {
                    console.log(`  - ${error.severity}: ${error.message}`);
                });
            }
            
            // Test the new multi-line pattern functionality
            const multiLinePatterns = parser.getMultiLinePatterns();
            console.log('Multi-line patterns detected:', multiLinePatterns.length);
            
            multiLinePatterns.forEach((pattern, i) => {
                console.log(`  Pattern ${i + 1}:`);
                console.log(`    Type: ${pattern.patternType}`);
                console.log(`    Keyword: ${pattern.keyword}`);
                console.log(`    Complete: ${pattern.isComplete}`);
                console.log(`    Depth: ${pattern.depth}`);
                console.log(`    Inner conditions: ${pattern.innerConditions.length}`);
                console.log(`    Nested patterns: ${pattern.nestedPatterns.length}`);
                
                if (pattern.innerConditions.length > 0) {
                    pattern.innerConditions.forEach((condition, j) => {
                        console.log(`      Condition ${j + 1}: ${condition.conditionType} - "${condition.content.substring(0, 50)}..."`);
                    });
                }
            });
            
            // Test parsing individual conditions with multi-line support
            console.log('\n--- Testing Individual Condition Parsing ---');
            const testConditions = [
                'exists(\n    Person(age > 18)\n)',
                'not(\n    Account(balance < 0)\n)',
                'eval(\n    $person.getName() != null\n)'
            ];
            
            testConditions.forEach((conditionText, i) => {
                console.log(`Condition ${i + 1}: "${conditionText.replace(/\n/g, '\\n')}"`);
                const condition = parser.parseConditionWithMultiLineSupport(
                    conditionText, 
                    { line: 0, character: 0 }
                );
                
                console.log(`  Type: ${condition.conditionType}`);
                console.log(`  Multi-line: ${condition.isMultiLine}`);
                console.log(`  Has multi-line pattern: ${!!condition.multiLinePattern}`);
                
                if (condition.multiLinePattern) {
                    console.log(`  Pattern type: ${condition.multiLinePattern.patternType}`);
                    console.log(`  Pattern complete: ${condition.multiLinePattern.isComplete}`);
                }
            });
            
        } catch (error) {
            console.log('Parse error:', error.message);
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
    });
}

// Run the tests
runTests();