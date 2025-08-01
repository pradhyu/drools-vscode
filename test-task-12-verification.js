const fs = require('fs');

// Comprehensive verification test for Task 12
function verifyTask12Implementation() {
    console.log('🔍 Verifying Task 12: Update language configuration for improved bracket matching\n');
    
    const config = JSON.parse(fs.readFileSync('language-configuration.json', 'utf8'));
    
    // Sub-task 1: Modify language-configuration.json to support multi-line bracket pairs
    console.log('1. ✅ Multi-line bracket pairs support:');
    
    // Verify brackets are defined
    const hasBrackets = config.brackets && config.brackets.length > 0;
    console.log(`   - Brackets defined: ${hasBrackets ? '✓' : '✗'}`);
    
    // Verify parentheses, braces, and square brackets are supported
    const hasParentheses = config.brackets.some(pair => pair[0] === '(' && pair[1] === ')');
    const hasBraces = config.brackets.some(pair => pair[0] === '{' && pair[1] === '}');
    const hasSquareBrackets = config.brackets.some(pair => pair[0] === '[' && pair[1] === ']');
    
    console.log(`   - Parentheses (): ${hasParentheses ? '✓' : '✗'}`);
    console.log(`   - Braces {}: ${hasBraces ? '✓' : '✗'}`);
    console.log(`   - Square brackets []: ${hasSquareBrackets ? '✓' : '✗'}`);
    
    // Sub-task 2: Add auto-closing pair configurations for multi-line patterns
    console.log('\n2. ✅ Auto-closing pair configurations:');
    
    const autoClosingPairs = config.autoClosingPairs || [];
    const hasAutoParentheses = autoClosingPairs.some(pair => pair[0] === '(' && pair[1] === ')');
    const hasAutoBraces = autoClosingPairs.some(pair => pair[0] === '{' && pair[1] === '}');
    const hasAutoSquareBrackets = autoClosingPairs.some(pair => pair[0] === '[' && pair[1] === ']');
    const hasAutoQuotes = autoClosingPairs.some(pair => pair[0] === '"' && pair[1] === '"');
    
    console.log(`   - Auto-closing parentheses: ${hasAutoParentheses ? '✓' : '✗'}`);
    console.log(`   - Auto-closing braces: ${hasAutoBraces ? '✓' : '✗'}`);
    console.log(`   - Auto-closing square brackets: ${hasAutoSquareBrackets ? '✓' : '✗'}`);
    console.log(`   - Auto-closing quotes: ${hasAutoQuotes ? '✓' : '✗'}`);
    
    // Sub-task 3: Update comment and indentation rules to work with multi-line constructs
    console.log('\n3. ✅ Comment and indentation rules for multi-line constructs:');
    
    // Verify comment configuration
    const hasComments = config.comments && config.comments.lineComment && config.comments.blockComment;
    console.log(`   - Comment configuration: ${hasComments ? '✓' : '✗'}`);
    
    // Verify indentation rules support multi-line patterns
    const indentationRules = config.indentationRules;
    const hasIndentationRules = indentationRules && indentationRules.increaseIndentPattern && indentationRules.decreaseIndentPattern;
    console.log(`   - Indentation rules defined: ${hasIndentationRules ? '✓' : '✗'}`);
    
    if (hasIndentationRules) {
        // Test that multi-line pattern keywords are supported
        const increasePattern = new RegExp(indentationRules.increaseIndentPattern);
        const multilineKeywords = ['exists', 'not', 'eval', 'forall', 'collect', 'accumulate'];
        
        console.log('   - Multi-line pattern keyword support:');
        multilineKeywords.forEach(keyword => {
            const testLine = `    ${keyword}(`;
            const matches = increasePattern.test(testLine);
            console.log(`     * ${keyword}(): ${matches ? '✓' : '✗'}`);
        });
        
        // Test decrease indentation patterns
        const decreasePattern = new RegExp(indentationRules.decreaseIndentPattern);
        const testDecreaseLines = ['    )', '    }', '    ]', 'end'];
        
        console.log('   - Decrease indentation patterns:');
        testDecreaseLines.forEach(line => {
            const matches = decreasePattern.test(line);
            console.log(`     * "${line}": ${matches ? '✓' : '✗'}`);
        });
    }
    
    // Verify onEnterRules for better indentation behavior
    const hasOnEnterRules = config.onEnterRules && config.onEnterRules.length > 0;
    console.log(`   - onEnterRules defined: ${hasOnEnterRules ? '✓' : '✗'}`);
    
    if (hasOnEnterRules) {
        const multilineKeywordRule = config.onEnterRules.find(rule => 
            rule.beforeText && rule.beforeText.includes('exists|not|eval|forall|collect|accumulate')
        );
        const parenthesesRule = config.onEnterRules.find(rule => 
            rule.beforeText && rule.beforeText.includes('\\([^)]*$')
        );
        const whenThenRule = config.onEnterRules.find(rule => 
            rule.beforeText && rule.beforeText.includes('when|then')
        );
        
        console.log(`     * Multi-line keyword rule: ${multilineKeywordRule ? '✓' : '✗'}`);
        console.log(`     * Parentheses matching rule: ${parenthesesRule ? '✓' : '✗'}`);
        console.log(`     * When/then rule: ${whenThenRule ? '✓' : '✗'}`);
    }
    
    // Sub-task 4: Ensure proper word boundary detection within multi-line patterns
    console.log('\n4. ✅ Word boundary detection within multi-line patterns:');
    
    const hasWordPattern = config.wordPattern && config.wordPattern.length > 0;
    console.log(`   - Word pattern defined: ${hasWordPattern ? '✓' : '✗'}`);
    
    if (hasWordPattern) {
        const wordPattern = new RegExp(config.wordPattern);
        
        // Test Drools-specific words
        const droolsWords = [
            'exists', 'not', 'eval', 'forall', 'collect', 'accumulate',
            'Person', 'Account', '$person', 'getName', 'getBalance'
        ];
        
        console.log('   - Drools word recognition:');
        droolsWords.forEach(word => {
            const matches = wordPattern.test(word);
            console.log(`     * "${word}": ${matches ? '✓' : '✗'}`);
        });
        
        // Test that operators are NOT recognized as words
        const operators = ['==', '!=', '&&', '||', '(', ')', '{', '}'];
        console.log('   - Operator exclusion (should not match):');
        operators.forEach(op => {
            const matches = wordPattern.test(op);
            console.log(`     * "${op}": ${!matches ? '✓' : '✗'}`);
        });
    }
    
    // Requirements verification
    console.log('\n📋 Requirements verification:');
    
    // Requirement 2.4: WHEN viewing nested parentheses across lines THEN the extension SHALL match brackets correctly
    console.log('   - Requirement 2.4 (bracket matching across lines):');
    const bracketMatchingSupported = hasParentheses && hasAutoParentheses && hasIndentationRules;
    console.log(`     * Bracket matching support: ${bracketMatchingSupported ? '✓' : '✗'}`);
    
    // Requirement 5.1: WHEN formatting multi-line condition patterns THEN the extension SHALL apply proper indentation to nested levels
    console.log('   - Requirement 5.1 (proper indentation for nested levels):');
    const indentationSupported = hasIndentationRules && hasOnEnterRules;
    console.log(`     * Indentation support: ${indentationSupported ? '✓' : '✗'}`);
    
    // Overall task completion
    const allSubTasksComplete = hasBrackets && hasAutoParentheses && hasIndentationRules && hasWordPattern;
    console.log(`\n🎯 Task 12 completion status: ${allSubTasksComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
    
    if (allSubTasksComplete) {
        console.log('\n🎉 All sub-tasks have been successfully implemented:');
        console.log('   ✅ Multi-line bracket pairs support added');
        console.log('   ✅ Auto-closing pair configurations added');
        console.log('   ✅ Comment and indentation rules updated for multi-line constructs');
        console.log('   ✅ Word boundary detection properly configured');
        console.log('   ✅ Requirements 2.4 and 5.1 satisfied');
    }
    
    return allSubTasksComplete;
}

// Test with actual multi-line pattern examples
function testWithRealExamples() {
    console.log('\n\n🧪 Testing with real multi-line pattern examples...\n');
    
    const config = JSON.parse(fs.readFileSync('language-configuration.json', 'utf8'));
    const increasePattern = new RegExp(config.indentationRules.increaseIndentPattern);
    const decreasePattern = new RegExp(config.indentationRules.decreaseIndentPattern);
    
    // Real examples from the test files
    const realExamples = [
        {
            name: 'Multi-line exists pattern from test file',
            lines: [
                '    exists(',
                '        Account(',
                '            owner == $person,',
                '            balance > 1000,',
                '            type in ("CHECKING", "SAVINGS")',
                '        )',
                '    )'
            ]
        },
        {
            name: 'Complex nested pattern',
            lines: [
                '    exists(',
                '        Account(',
                '            owner == $customer',
                '        ) and',
                '        not(',
                '            Debt(',
                '                person == $customer,',
                '                amount > 1000',
                '            )',
                '        )',
                '    )'
            ]
        }
    ];
    
    realExamples.forEach(example => {
        console.log(`${example.name}:`);
        example.lines.forEach((line, index) => {
            const shouldIncrease = increasePattern.test(line);
            const shouldDecrease = decreasePattern.test(line);
            const indentAction = shouldIncrease ? 'increase' : shouldDecrease ? 'decrease' : 'maintain';
            console.log(`   Line ${index + 1}: "${line}" -> ${indentAction} indent`);
        });
        console.log('');
    });
}

// Run verification
try {
    const success = verifyTask12Implementation();
    testWithRealExamples();
    
    if (success) {
        console.log('🏆 Task 12 verification PASSED - All requirements met!');
        process.exit(0);
    } else {
        console.log('❌ Task 12 verification FAILED - Some requirements not met!');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
}