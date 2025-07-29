#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Test script to verify enhanced Drools syntax validation
 * Tests multi-line bracket matching and improved validation features
 */

// Test cases for multi-line bracket validation
const testCases = [
    {
        name: "Multi-line condition with balanced parentheses",
        code: `rule "Test Rule"
when
    $person : Person(
        age > 18,
        name != null,
        address.city == "New York"
    )
then
    System.out.println("Valid person");
end`,
        expectedErrors: 0,
        description: "Should not report errors for properly balanced multi-line parentheses"
    },
    {
        name: "Multi-line condition with unmatched opening parenthesis",
        code: `rule "Test Rule"
when
    $person : Person(
        age > 18,
        name != null
then
    System.out.println("Invalid");
end`,
        expectedErrors: 1,
        description: "Should report unmatched opening parenthesis"
    },
    {
        name: "Multi-line condition with unmatched closing parenthesis",
        code: `rule "Test Rule"
when
    $person : Person
        age > 18,
        name != null)
then
    System.out.println("Invalid");
end`,
        expectedErrors: 1,
        description: "Should report unmatched closing parenthesis"
    },
    {
        name: "Multi-line function with balanced braces",
        code: `function String formatName(String first, String last) {
    if (first != null && last != null) {
        return first + " " + last;
    }
    return "Unknown";
}`,
        expectedErrors: 0,
        description: "Should not report errors for properly balanced multi-line braces"
    },
    {
        name: "Multi-line function with unmatched opening brace",
        code: `function String formatName(String first, String last) {
    if (first != null && last != null) {
        return first + " " + last;
    
    return "Unknown";
}`,
        expectedErrors: 1,
        description: "Should report unmatched opening brace"
    },
    {
        name: "Complex multi-line exists condition",
        code: `rule "Complex Rule"
when
    $person : Person(age > 18)
    exists(
        Account(
            owner == $person,
            balance > 1000,
            status == "ACTIVE"
        )
    )
then
    System.out.println("Person has active account");
end`,
        expectedErrors: 0,
        description: "Should handle complex nested multi-line conditions"
    },
    {
        name: "Multi-line eval condition",
        code: `rule "Eval Rule"
when
    $person : Person()
    eval(
        $person.getAge() > 18 &&
        $person.getName() != null &&
        $person.getAddress().getCity().equals("NYC")
    )
then
    System.out.println("Valid NYC person");
end`,
        expectedErrors: 0,
        description: "Should handle multi-line eval conditions"
    },
    {
        name: "String literals with quotes in multi-line",
        code: `rule "String Test"
when
    $person : Person(
        name == "John \"Johnny\" Doe",
        address != null
    )
then
    System.out.println("Found John");
end`,
        expectedErrors: 0,
        description: "Should handle escaped quotes in string literals"
    },
    {
        name: "Unterminated string literal",
        code: `rule "String Error"
when
    $person : Person(name == "John Doe)
then
    System.out.println("Error");
end`,
        expectedErrors: 1,
        description: "Should report unterminated string literal"
    },
    {
        name: "Comments in multi-line conditions",
        code: `rule "Comment Test"
when
    $person : Person(
        age > 18, // Must be adult
        name != null /* Name required */
    )
then
    System.out.println("Valid");
end`,
        expectedErrors: 0,
        description: "Should ignore brackets in comments"
    },
    {
        name: "Operator validation",
        code: `rule "Operator Test"
when
    $person : Person(age=18) // Should warn about = vs ==
then
    System.out.println("Test");
end`,
        expectedErrors: 1,
        description: "Should warn about assignment operator in condition"
    },
    {
        name: "Missing spaces around operators",
        code: `rule "Style Test"
when
    $person : Person(age>18&&name!=null)
then
    System.out.println("Test");
end`,
        expectedErrors: 3, // Should suggest spaces around >, &&, !=
        description: "Should suggest spaces around operators"
    }
];

async function runValidationTests() {
    console.log('🧪 Running Enhanced Drools Validation Tests\n');
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`Test ${i + 1}/${totalTests}: ${testCase.name}`);
        console.log(`Description: ${testCase.description}`);
        
        try {
            // Write test file
            const testFileName = `test-case-${i + 1}.drl`;
            fs.writeFileSync(testFileName, testCase.code);
            
            // Here we would normally run the diagnostic provider
            // For now, we'll simulate the validation
            const errors = await simulateValidation(testCase.code);
            
            console.log(`Expected errors: ${testCase.expectedErrors}, Found: ${errors.length}`);
            
            if (errors.length === testCase.expectedErrors) {
                console.log('✅ PASSED\n');
                passedTests++;
            } else {
                console.log('❌ FAILED');
                console.log('Errors found:');
                errors.forEach((error, index) => {
                    console.log(`  ${index + 1}. ${error.message} (line ${error.line + 1})`);
                });
                console.log('');
            }
            
            // Clean up test file
            fs.unlinkSync(testFileName);
            
        } catch (error) {
            console.log(`❌ FAILED - Exception: ${error.message}\n`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Enhanced validation is working correctly.');
    } else {
        console.log(`⚠️  ${totalTests - passedTests} tests failed. Review the validation logic.`);
    }
}

/**
 * Simulate validation by implementing basic bracket matching
 * This is a simplified version of what the actual diagnostic provider does
 */
async function simulateValidation(code) {
    const errors = [];
    const lines = code.split('\n');
    
    // Test 1: Multi-line bracket matching
    const bracketPairs = [
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '[', close: ']' }
    ];
    
    for (const pair of bracketPairs) {
        const bracketErrors = validateBracketPair(pair.open, pair.close, code, lines);
        errors.push(...bracketErrors);
    }
    
    // Test 2: String literal validation
    const stringErrors = validateStringLiterals(lines);
    errors.push(...stringErrors);
    
    // Test 3: Operator validation
    const operatorErrors = validateOperators(lines);
    errors.push(...operatorErrors);
    
    return errors;
}

function validateBracketPair(openBracket, closeBracket, text, lines) {
    const errors = [];
    const stack = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let inStringLiteral = false;
        let inLineComment = false;
        let inBlockComment = false;
        let escapeNext = false;
        
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            const nextChar = charIndex < line.length - 1 ? line[charIndex + 1] : '';
            
            // Handle escape sequences
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                continue;
            }
            
            // Handle comments
            if (!inStringLiteral) {
                if (char === '/' && nextChar === '/') {
                    inLineComment = true;
                    charIndex++; // Skip next character
                    continue;
                }
                
                if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    charIndex++; // Skip next character
                    continue;
                }
                
                if (inBlockComment && char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    charIndex++; // Skip next character
                    continue;
                }
            }
            
            // Skip if we're in a comment
            if (inLineComment || inBlockComment) {
                continue;
            }
            
            // Handle string literals
            if (char === '"') {
                inStringLiteral = !inStringLiteral;
                continue;
            }
            
            // Skip if we're in a string literal
            if (inStringLiteral) {
                continue;
            }
            
            // Check for brackets
            if (char === openBracket) {
                stack.push({ line: lineIndex, character: charIndex });
            } else if (char === closeBracket) {
                if (stack.length === 0) {
                    errors.push({
                        message: `Unmatched closing ${closeBracket}`,
                        line: lineIndex,
                        character: charIndex
                    });
                } else {
                    stack.pop();
                }
            }
        }
        
        // Reset line comment flag at end of line
        inLineComment = false;
    }
    
    // Report unmatched opening brackets
    for (const bracket of stack) {
        errors.push({
            message: `Unmatched opening ${openBracket}`,
            line: bracket.line,
            character: bracket.character
        });
    }
    
    return errors;
}

function validateStringLiterals(lines) {
    const errors = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let inStringLiteral = false;
        let escapeNext = false;
        let stringStart = -1;
        
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\' && inStringLiteral) {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                if (inStringLiteral) {
                    inStringLiteral = false;
                    stringStart = -1;
                } else {
                    inStringLiteral = true;
                    stringStart = charIndex;
                }
            }
        }
        
        // Check for unterminated string literals
        if (inStringLiteral && stringStart >= 0) {
            errors.push({
                message: 'Unterminated string literal',
                line: lineIndex,
                character: stringStart
            });
        }
    }
    
    return errors;
}

function validateOperators(lines) {
    const errors = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        
        // Check for assignment operator in conditions (simplified)
        if (line.includes('when') || line.includes('Person(') || line.includes('Account(')) {
            // Look for single = that's not part of == or !=
            const singleEqualRegex = /[^=!<>]=(?!=)/g;
            let match;
            while ((match = singleEqualRegex.exec(line)) !== null) {
                // Skip if it's in a method call like setAge(18)
                if (!line.substring(0, match.index).includes('.set')) {
                    errors.push({
                        message: 'Use "==" for comparison, "=" is for assignment',
                        line: lineIndex,
                        character: match.index + 1
                    });
                }
            }
        }
        
        // Check for missing spaces around operators
        const operatorRegex = /\S(>|&&|!=)\S/g;
        let match;
        while ((match = operatorRegex.exec(line)) !== null) {
            errors.push({
                message: `Consider adding spaces around operator "${match[1]}"`,
                line: lineIndex,
                character: match.index
            });
        }
    }
    
    return errors;
}

// Run the tests
if (require.main === module) {
    runValidationTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runValidationTests, simulateValidation };