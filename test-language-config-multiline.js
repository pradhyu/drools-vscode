const fs = require('fs');
const path = require('path');

// Test the language configuration for multi-line bracket matching
function testLanguageConfiguration() {
    console.log('Testing language configuration for multi-line bracket matching...\n');
    
    // Read the language configuration
    const configPath = path.join(__dirname, 'language-configuration.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log('✓ Language configuration loaded successfully');
    
    // Test 1: Verify brackets are properly defined
    console.log('\n1. Testing bracket definitions:');
    const expectedBrackets = [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"]
    ];
    
    const bracketsMatch = JSON.stringify(config.brackets) === JSON.stringify(expectedBrackets);
    console.log(`   Brackets defined: ${bracketsMatch ? '✓' : '✗'}`);
    
    // Test 2: Verify auto-closing pairs include all necessary brackets
    console.log('\n2. Testing auto-closing pairs:');
    const hasParentheses = config.autoClosingPairs.some(pair => pair[0] === '(' && pair[1] === ')');
    const hasBraces = config.autoClosingPairs.some(pair => pair[0] === '{' && pair[1] === '}');
    const hasBrackets = config.autoClosingPairs.some(pair => pair[0] === '[' && pair[1] === ']');
    
    console.log(`   Parentheses auto-closing: ${hasParentheses ? '✓' : '✗'}`);
    console.log(`   Braces auto-closing: ${hasBraces ? '✓' : '✗'}`);
    console.log(`   Brackets auto-closing: ${hasBrackets ? '✓' : '✗'}`);
    
    // Test 3: Verify indentation rules support multi-line patterns
    console.log('\n3. Testing indentation rules:');
    const increasePattern = config.indentationRules.increaseIndentPattern;
    const decreasePattern = config.indentationRules.decreaseIndentPattern;
    
    // Test patterns that should increase indentation
    const testIncreasePatterns = [
        'rule "test"',
        'when',
        'then',
        'function test()',
        '    exists(',
        '    not(',
        '    eval(',
        '    forall(',
        '    collect(',
        '    accumulate(',
        '    Person(',
        '    Account('
    ];
    
    console.log('   Testing increase indent patterns:');
    testIncreasePatterns.forEach(pattern => {
        const regex = new RegExp(increasePattern);
        const matches = regex.test(pattern);
        console.log(`     "${pattern}": ${matches ? '✓' : '✗'}`);
    });
    
    // Test patterns that should decrease indentation
    const testDecreasePatterns = [
        'end',
        '    )',
        '    }',
        '    ]'
    ];
    
    console.log('   Testing decrease indent patterns:');
    testDecreasePatterns.forEach(pattern => {
        const regex = new RegExp(decreasePattern);
        const matches = regex.test(pattern);
        console.log(`     "${pattern}": ${matches ? '✓' : '✗'}`);
    });
    
    // Test 4: Verify onEnterRules for multi-line patterns
    console.log('\n4. Testing onEnterRules:');
    const hasOnEnterRules = config.onEnterRules && config.onEnterRules.length > 0;
    console.log(`   onEnterRules defined: ${hasOnEnterRules ? '✓' : '✗'}`);
    
    if (hasOnEnterRules) {
        // Test multi-line pattern keywords
        const multilineKeywordRule = config.onEnterRules.find(rule => 
            rule.beforeText && rule.beforeText.includes('exists|not|eval|forall|collect|accumulate')
        );
        console.log(`   Multi-line keyword rule: ${multilineKeywordRule ? '✓' : '✗'}`);
        
        // Test general parentheses rule
        const parenthesesRule = config.onEnterRules.find(rule => 
            rule.beforeText && rule.beforeText.includes('\\([^)]*$') && 
            rule.afterText && rule.afterText.includes('\\)')
        );
        console.log(`   Parentheses matching rule: ${parenthesesRule ? '✓' : '✗'}`);
        
        // Test when/then rule
        const whenThenRule = config.onEnterRules.find(rule => 
            rule.beforeText && rule.beforeText.includes('when|then')
        );
        console.log(`   When/then indentation rule: ${whenThenRule ? '✓' : '✗'}`);
    }
    
    // Test 5: Verify word pattern supports Drools syntax
    console.log('\n5. Testing word pattern:');
    const wordPattern = new RegExp(config.wordPattern);
    const testWords = [
        'Person',
        'exists',
        'not',
        'eval',
        'forall',
        'collect',
        'accumulate',
        'age',
        'balance',
        'owner',
        '$person',
        'getName',
        'getBalance'
    ];
    
    testWords.forEach(word => {
        const matches = wordPattern.test(word);
        console.log(`   "${word}": ${matches ? '✓' : '✗'}`);
    });
    
    console.log('\n✓ Language configuration testing completed');
}

// Test multi-line pattern scenarios
function testMultiLinePatternScenarios() {
    console.log('\n\nTesting multi-line pattern scenarios...\n');
    
    const config = JSON.parse(fs.readFileSync('language-configuration.json', 'utf8'));
    
    // Test scenarios based on the test file patterns
    const scenarios = [
        {
            name: 'Multi-line exists pattern',
            lines: [
                '    exists(',
                '        Account(',
                '            owner == $person,',
                '            balance > 1000',
                '        )',
                '    )'
            ]
        },
        {
            name: 'Multi-line not pattern',
            lines: [
                '    not(',
                '        Restriction(',
                '            customer == $customer,',
                '            type in ("CREDIT_HOLD", "ACCOUNT_FREEZE")',
                '        )',
                '    )'
            ]
        },
        {
            name: 'Multi-line eval pattern',
            lines: [
                '    eval(',
                '        $account.getBalance() > 1000 &&',
                '        $account.getType().equals("PREMIUM")',
                '    )'
            ]
        }
    ];
    
    const increaseRegex = new RegExp(config.indentationRules.increaseIndentPattern);
    const decreaseRegex = new RegExp(config.indentationRules.decreaseIndentPattern);
    
    scenarios.forEach(scenario => {
        console.log(`Testing ${scenario.name}:`);
        scenario.lines.forEach((line, index) => {
            const shouldIncrease = increaseRegex.test(line);
            const shouldDecrease = decreaseRegex.test(line);
            const indentAction = shouldIncrease ? 'increase' : shouldDecrease ? 'decrease' : 'maintain';
            console.log(`   Line ${index + 1}: "${line.trim()}" -> ${indentAction} indent`);
        });
        console.log('');
    });
}

// Run the tests
try {
    testLanguageConfiguration();
    testMultiLinePatternScenarios();
    console.log('\n🎉 All language configuration tests completed successfully!');
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}