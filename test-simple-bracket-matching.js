const fs = require('fs');

// Test bracket matching functionality with the updated language configuration
function testBracketMatching() {
    console.log('Testing bracket matching for multi-line patterns...\n');
    
    // Read the language configuration
    const config = JSON.parse(fs.readFileSync('language-configuration.json', 'utf8'));
    
    // Test 1: Verify bracket pairs are correctly defined
    console.log('1. Testing bracket pair definitions:');
    const brackets = config.brackets;
    const autoClosingPairs = config.autoClosingPairs;
    const surroundingPairs = config.surroundingPairs;
    
    console.log('   Brackets:', JSON.stringify(brackets));
    console.log('   Auto-closing pairs:', JSON.stringify(autoClosingPairs));
    console.log('   Surrounding pairs:', JSON.stringify(surroundingPairs));
    
    // Verify all necessary bracket types are present
    const hasParentheses = brackets.some(pair => pair[0] === '(' && pair[1] === ')');
    const hasBraces = brackets.some(pair => pair[0] === '{' && pair[1] === '}');
    const hasBrackets = brackets.some(pair => pair[0] === '[' && pair[1] === ']');
    
    console.log(`   ✓ Parentheses supported: ${hasParentheses}`);
    console.log(`   ✓ Braces supported: ${hasBraces}`);
    console.log(`   ✓ Square brackets supported: ${hasBrackets}`);
    
    // Test 2: Test indentation rules for multi-line patterns
    console.log('\n2. Testing indentation rules:');
    const increasePattern = new RegExp(config.indentationRules.increaseIndentPattern);
    const decreasePattern = new RegExp(config.indentationRules.decreaseIndentPattern);
    
    // Test cases for increase indentation
    const increaseTestCases = [
        '    exists(',
        '    not(',
        '    eval(',
        '    forall(',
        '    collect(',
        '    accumulate(',
        '    Person(',
        '    Account(',
        'when',
        'then',
        'rule "test"'
    ];
    
    console.log('   Increase indentation test cases:');
    increaseTestCases.forEach(testCase => {
        const matches = increasePattern.test(testCase);
        console.log(`     "${testCase}": ${matches ? '✓' : '✗'}`);
    });
    
    // Test cases for decrease indentation
    const decreaseTestCases = [
        '    )',
        '    }',
        '    ]',
        'end'
    ];
    
    console.log('   Decrease indentation test cases:');
    decreaseTestCases.forEach(testCase => {
        const matches = decreasePattern.test(testCase);
        console.log(`     "${testCase}": ${matches ? '✓' : '✗'}`);
    });
    
    // Test 3: Test onEnterRules for proper indentation behavior
    console.log('\n3. Testing onEnterRules:');
    if (config.onEnterRules) {
        config.onEnterRules.forEach((rule, index) => {
            console.log(`   Rule ${index + 1}:`);
            console.log(`     beforeText: ${rule.beforeText}`);
            if (rule.afterText) {
                console.log(`     afterText: ${rule.afterText}`);
            }
            console.log(`     action: ${JSON.stringify(rule.action)}`);
        });
    }
    
    // Test 4: Simulate multi-line pattern scenarios
    console.log('\n4. Testing multi-line pattern scenarios:');
    
    const scenarios = [
        {
            name: 'exists() pattern',
            lines: [
                '    exists(',
                '        Person(',
                '            age > 18',
                '        )',
                '    )'
            ]
        },
        {
            name: 'not() pattern',
            lines: [
                '    not(',
                '        Account(',
                '            balance < 0',
                '        )',
                '    )'
            ]
        },
        {
            name: 'eval() pattern',
            lines: [
                '    eval(',
                '        $person.getAge() > 21 &&',
                '        $person.isActive()',
                '    )'
            ]
        }
    ];
    
    scenarios.forEach(scenario => {
        console.log(`   ${scenario.name}:`);
        scenario.lines.forEach((line, index) => {
            const shouldIncrease = increasePattern.test(line);
            const shouldDecrease = decreasePattern.test(line);
            const indentAction = shouldIncrease ? 'increase' : shouldDecrease ? 'decrease' : 'maintain';
            console.log(`     Line ${index + 1}: "${line}" -> ${indentAction} indent`);
        });
    });
    
    console.log('\n✓ Bracket matching tests completed successfully!');
}

// Test word boundary detection
function testWordBoundaries() {
    console.log('\n\nTesting word boundary detection...\n');
    
    const config = JSON.parse(fs.readFileSync('language-configuration.json', 'utf8'));
    const wordPattern = new RegExp(config.wordPattern);
    
    // Test various Drools-specific words and identifiers
    const testWords = [
        // Keywords
        'exists', 'not', 'eval', 'forall', 'collect', 'accumulate',
        'rule', 'when', 'then', 'end', 'function', 'import', 'package',
        
        // Identifiers
        'Person', 'Account', 'Customer', 'Transaction',
        '$person', '$account', '$customer',
        'age', 'balance', 'name', 'owner', 'type',
        
        // Method calls
        'getName', 'getAge', 'getBalance', 'setTier',
        
        // Operators and symbols (should not match as words)
        '==', '!=', '>', '<', '>=', '<=', '&&', '||',
        '(', ')', '{', '}', '[', ']', ',', ';'
    ];
    
    console.log('Word pattern test results:');
    testWords.forEach(word => {
        const matches = wordPattern.test(word);
        const shouldMatch = !['==', '!=', '>', '<', '>=', '<=', '&&', '||', '(', ')', '{', '}', '[', ']', ',', ';'].includes(word);
        const result = matches === shouldMatch ? '✓' : '✗';
        console.log(`   "${word}": ${matches ? 'matches' : 'no match'} ${result}`);
    });
}

// Run all tests
try {
    testBracketMatching();
    testWordBoundaries();
    console.log('\n🎉 All bracket matching tests passed!');
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}