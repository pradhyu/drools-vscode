/**
 * Detailed test for multi-line pattern AST generation functionality
 */

const { DroolsParser } = require('./out/server/parser/droolsParser.js');

function testMultiLinePatternDetection() {
    console.log('=== Testing Multi-Line Pattern Detection ===\n');
    
    const parser = new DroolsParser();
    
    const testCases = [
        {
            name: 'Simple exists pattern',
            content: 'exists(\n    Person(age > 18)\n)',
            expectedType: 'exists',
            expectedComplete: true
        },
        {
            name: 'Nested not pattern',
            content: 'not(\n    Account(\n        balance < 0,\n        owner == $person\n    )\n)',
            expectedType: 'not',
            expectedComplete: true
        },
        {
            name: 'Eval with complex expression',
            content: 'eval(\n    $person.getName() != null &&\n    $person.getAge() > 18\n)',
            expectedType: 'eval',
            expectedComplete: true
        },
        {
            name: 'Incomplete pattern',
            content: 'exists(\n    Person(age > 18',
            expectedType: 'exists',
            expectedComplete: false
        },
        {
            name: 'Nested patterns',
            content: 'exists(\n    Person(age > 18) and\n    not(\n        Account(balance < 0)\n    )\n)',
            expectedType: 'exists',
            expectedComplete: true,
            hasNested: true
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.name}`);
        console.log(`Content: "${testCase.content.replace(/\n/g, '\\n')}"`);
        
        const condition = parser.parseConditionWithMultiLineSupport(
            testCase.content,
            { line: 0, character: 0 }
        );
        
        console.log(`✓ Condition type: ${condition.conditionType} (expected: ${testCase.expectedType})`);
        console.log(`✓ Is multi-line: ${condition.isMultiLine}`);
        console.log(`✓ Has multi-line pattern: ${!!condition.multiLinePattern}`);
        
        if (condition.multiLinePattern) {
            const pattern = condition.multiLinePattern;
            console.log(`✓ Pattern type: ${pattern.patternType} (expected: ${testCase.expectedType})`);
            console.log(`✓ Pattern keyword: ${pattern.keyword}`);
            console.log(`✓ Pattern complete: ${pattern.isComplete} (expected: ${testCase.expectedComplete})`);
            console.log(`✓ Pattern depth: ${pattern.depth}`);
            console.log(`✓ Inner conditions: ${pattern.innerConditions.length}`);
            console.log(`✓ Nested patterns: ${pattern.nestedPatterns.length}`);
            console.log(`✓ Parentheses ranges: ${pattern.parenthesesRanges.length}`);
            
            // Test inner conditions
            if (pattern.innerConditions.length > 0) {
                console.log('  Inner conditions:');
                pattern.innerConditions.forEach((innerCondition, i) => {
                    console.log(`    ${i + 1}. Type: ${innerCondition.conditionType}, Content: "${innerCondition.content.substring(0, 30)}..."`);
                    if (innerCondition.factType) {
                        console.log(`       Fact type: ${innerCondition.factType}`);
                    }
                    if (innerCondition.variable) {
                        console.log(`       Variable: ${innerCondition.variable}`);
                    }
                    if (innerCondition.constraints && innerCondition.constraints.length > 0) {
                        console.log(`       Constraints: ${innerCondition.constraints.length}`);
                        innerCondition.constraints.forEach((constraint, j) => {
                            console.log(`         ${j + 1}. ${constraint.field} ${constraint.operator} ${constraint.value}`);
                        });
                    }
                });
            }
            
            // Test nested patterns
            if (pattern.nestedPatterns.length > 0) {
                console.log('  Nested patterns:');
                pattern.nestedPatterns.forEach((nestedPattern, i) => {
                    console.log(`    ${i + 1}. Type: ${nestedPattern.patternType}, Depth: ${nestedPattern.depth}`);
                });
            }
        }
        
        // Verify expectations
        const passed = 
            condition.conditionType === testCase.expectedType &&
            condition.isMultiLine &&
            (condition.multiLinePattern?.isComplete === testCase.expectedComplete) &&
            (!testCase.hasNested || (condition.multiLinePattern?.nestedPatterns.length > 0));
            
        console.log(`${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    });
}

function testConstraintParsing() {
    console.log('=== Testing Constraint Parsing ===\n');
    
    const parser = new DroolsParser();
    
    const testCases = [
        {
            name: 'Simple fact pattern',
            content: 'Person(age > 18, name != null)',
            expectedFactType: 'Person',
            expectedConstraints: 2
        },
        {
            name: 'Variable binding',
            content: '$person : Person(age > 18)',
            expectedVariable: '$person',
            expectedFactType: 'Person',
            expectedConstraints: 1
        },
        {
            name: 'Complex constraints',
            content: 'Account(balance >= 1000, owner == $person, type matches "SAVINGS")',
            expectedFactType: 'Account',
            expectedConstraints: 3
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.name}`);
        console.log(`Content: "${testCase.content}"`);
        
        const condition = parser.parseConditionWithMultiLineSupport(
            testCase.content,
            { line: 0, character: 0 }
        );
        
        console.log(`✓ Fact type: ${condition.factType} (expected: ${testCase.expectedFactType})`);
        console.log(`✓ Variable: ${condition.variable} (expected: ${testCase.expectedVariable || 'none'})`);
        console.log(`✓ Constraints: ${condition.constraints?.length || 0} (expected: ${testCase.expectedConstraints})`);
        
        if (condition.constraints && condition.constraints.length > 0) {
            console.log('  Constraints:');
            condition.constraints.forEach((constraint, i) => {
                console.log(`    ${i + 1}. ${constraint.field} ${constraint.operator} ${constraint.value}`);
            });
        }
        
        const passed = 
            condition.factType === testCase.expectedFactType &&
            condition.variable === testCase.expectedVariable &&
            (condition.constraints?.length || 0) === testCase.expectedConstraints;
            
        console.log(`${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    });
}

function testNestedPatternDetection() {
    console.log('=== Testing Nested Pattern Detection ===\n');
    
    const parser = new DroolsParser();
    
    const complexPattern = `exists(
    Person(age > 18) and
    not(
        Account(
            balance < 0,
            owner == $person
        )
    ) and
    eval(
        $person.getName() != null
    )
)`;
    
    console.log('Testing complex nested pattern:');
    console.log(complexPattern);
    console.log('\n--- Results ---');
    
    const condition = parser.parseConditionWithMultiLineSupport(
        complexPattern,
        { line: 0, character: 0 }
    );
    
    console.log(`✓ Main pattern type: ${condition.conditionType}`);
    console.log(`✓ Is multi-line: ${condition.isMultiLine}`);
    console.log(`✓ Has multi-line pattern: ${!!condition.multiLinePattern}`);
    
    if (condition.multiLinePattern) {
        const pattern = condition.multiLinePattern;
        console.log(`✓ Pattern complete: ${pattern.isComplete}`);
        console.log(`✓ Inner conditions: ${pattern.innerConditions.length}`);
        console.log(`✓ Nested patterns: ${pattern.nestedPatterns.length}`);
        
        // Analyze inner conditions
        pattern.innerConditions.forEach((innerCondition, i) => {
            console.log(`\nInner condition ${i + 1}:`);
            console.log(`  Type: ${innerCondition.conditionType}`);
            console.log(`  Content: "${innerCondition.content.substring(0, 50)}..."`);
            console.log(`  Has nested pattern: ${!!innerCondition.multiLinePattern}`);
            
            if (innerCondition.multiLinePattern) {
                console.log(`  Nested pattern type: ${innerCondition.multiLinePattern.patternType}`);
            }
        });
    }
    
    console.log('\n✅ Nested pattern test completed\n');
}

// Run all tests
console.log('Multi-Line Pattern AST Generation - Detailed Tests\n');
console.log('=' .repeat(60) + '\n');

testMultiLinePatternDetection();
testConstraintParsing();
testNestedPatternDetection();

console.log('All tests completed!');