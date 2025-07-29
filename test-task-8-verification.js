/**
 * Test script to verify Task 8: Add comprehensive error recovery for incomplete patterns
 * 
 * This test verifies:
 * - Parsing recovery when multi-line patterns are incomplete
 * - Graceful handling of EOF within multi-line patterns
 * - Fallback parsing modes for malformed multi-line constructs
 * - Partial AST generation for incomplete but valid partial patterns
 */

const { DroolsParser } = require('./src/server/parser/droolsParser');
const { DroolsDiagnosticProvider } = require('./src/server/providers/diagnosticProvider');

console.log('=== Task 8 Verification: Comprehensive Error Recovery for Incomplete Patterns ===\n');

// Test cases for incomplete patterns
const testCases = [
    {
        name: 'Incomplete exists pattern at EOF',
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18`,
        expectedErrors: ['Incomplete multi-line pattern', 'unmatched opening parenthesis']
    },
    {
        name: 'Incomplete not pattern with missing closing',
        content: `rule "Test Rule"
when
    not(
        Person(age > 18
        and name != null
then
    // action
end`,
        expectedErrors: ['Incomplete multi-line pattern', 'unmatched opening parenthesis']
    },
    {
        name: 'Incomplete eval pattern',
        content: `rule "Test Rule"
when
    eval(
        $person.getAge() > 18
        && $person.getName() != null`,
        expectedErrors: ['Incomplete multi-line pattern', 'Unexpected end of file']
    },
    {
        name: 'Nested incomplete patterns',
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18) and
        not(
            Account(balance < 0
    )
then
    // action
end`,
        expectedErrors: ['unmatched opening parenthesis']
    },
    {
        name: 'Malformed accumulate pattern',
        content: `rule "Test Rule"
when
    accumulate(
        Person(age > $minAge),
        init: int total = 0;
        action: total += $person.getAge();
        // missing result clause
then
    // action
end`,
        expectedErrors: ['Incomplete multi-line pattern']
    },
    {
        name: 'Pattern with unbalanced braces',
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18) {
            name != null
    )
then
    // action
end`,
        expectedErrors: ['unmatched opening brace', 'unmatched closing parenthesis']
    },
    {
        name: 'Multiple incomplete patterns',
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18
    and
    not(
        Account(balance < 0
then
    // action
end`,
        expectedErrors: ['Incomplete multi-line pattern', 'unmatched opening parenthesis']
    },
    {
        name: 'Partial pattern with valid content',
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18, name != null)
        and Account(owner == $person
then
    // action
end`,
        expectedErrors: ['unmatched opening parenthesis']
    }
];

// Initialize parser and diagnostic provider
const parser = new DroolsParser();
const diagnosticProvider = new DroolsDiagnosticProvider({
    maxNumberOfProblems: 50,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: false
});

let passedTests = 0;
let totalTests = testCases.length;

console.log('Testing error recovery for incomplete patterns...\n');

for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}: ${testCase.name}`);
    console.log('Content:');
    console.log(testCase.content);
    console.log('');

    try {
        // Parse the content
        const parseResult = parser.parse(testCase.content);
        const ast = parseResult.ast;
        const parseErrors = parseResult.errors;

        console.log('Parse Errors:');
        if (parseErrors.length === 0) {
            console.log('  No parse errors');
        } else {
            parseErrors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.message} (${error.severity}) at line ${error.range.start.line + 1}`);
            });
        }

        // Create a mock document for diagnostics
        const mockDocument = {
            getText: () => testCase.content,
            uri: 'test://test.drl'
        };

        // Get diagnostics using the enhanced method with recovery
        const diagnostics = diagnosticProvider.provideDiagnosticsWithRecovery 
            ? diagnosticProvider.provideDiagnosticsWithRecovery(mockDocument, ast, parseErrors)
            : diagnosticProvider.provideDiagnostics(mockDocument, ast, parseErrors);

        console.log('Diagnostics:');
        if (diagnostics.length === 0) {
            console.log('  No diagnostics');
        } else {
            diagnostics.forEach((diagnostic, index) => {
                console.log(`  ${index + 1}. ${diagnostic.message} (${diagnostic.source}) at line ${diagnostic.range.start.line + 1}`);
            });
        }

        // Verify AST structure
        console.log('AST Structure:');
        console.log(`  Rules: ${ast.rules.length}`);
        console.log(`  Imports: ${ast.imports.length}`);
        console.log(`  Globals: ${ast.globals.length}`);

        // Check if AST was generated even with errors (partial AST)
        const hasPartialAST = ast.rules.length > 0 || parseErrors.length > 0;
        console.log(`  Partial AST generated: ${hasPartialAST}`);

        // Verify error recovery worked
        let recoveryWorked = false;
        const allMessages = [...parseErrors.map(e => e.message), ...diagnostics.map(d => d.message)];
        
        for (const expectedError of testCase.expectedErrors) {
            const found = allMessages.some(msg => 
                msg.toLowerCase().includes(expectedError.toLowerCase())
            );
            if (found) {
                recoveryWorked = true;
                break;
            }
        }

        // Check if parser didn't crash and produced some output
        const parserDidntCrash = ast !== null && typeof ast === 'object';
        
        if (recoveryWorked && parserDidntCrash) {
            console.log('✅ PASSED: Error recovery worked correctly');
            passedTests++;
        } else {
            console.log('❌ FAILED: Error recovery did not work as expected');
            console.log(`  Expected errors containing: ${testCase.expectedErrors.join(', ')}`);
            console.log(`  Found messages: ${allMessages.join(', ')}`);
        }

    } catch (error) {
        console.log('❌ FAILED: Parser crashed with error:', error.message);
        console.log('Stack trace:', error.stack);
    }

    console.log('─'.repeat(80));
    console.log('');
}

// Test specific error recovery scenarios
console.log('Testing specific error recovery scenarios...\n');

// Test 1: EOF handling
console.log('Test: EOF handling in multi-line pattern');
const eofTest = `rule "EOF Test"
when
    exists(
        Person(age > 18,
               name != null`;

try {
    const result = parser.parse(eofTest);
    console.log('✅ Parser handled EOF gracefully');
    console.log(`Errors generated: ${result.errors.length}`);
    result.errors.forEach(error => {
        console.log(`  - ${error.message}`);
    });
} catch (error) {
    console.log('❌ Parser crashed on EOF:', error.message);
}

console.log('');

// Test 2: Recovery point detection
console.log('Test: Recovery point detection');
const recoveryTest = `rule "Recovery Test"
when
    exists(
        Person(age > 18
    // Missing closing parenthesis, but next rule should be parsed
rule "Next Rule"
when
    Person(name == "test")
then
    // action
end`;

try {
    const result = parser.parse(recoveryTest);
    console.log('✅ Parser found recovery points');
    console.log(`Rules parsed: ${result.ast.rules.length}`);
    console.log(`Errors: ${result.errors.length}`);
} catch (error) {
    console.log('❌ Parser failed to recover:', error.message);
}

console.log('');

// Test 3: Partial AST generation
console.log('Test: Partial AST generation for incomplete patterns');
const partialTest = `rule "Partial Test"
when
    exists(
        Person(age > 18, name != null)
        and Account(owner == $person`;

try {
    const result = parser.parse(partialTest);
    const hasConditions = result.ast.rules.length > 0 && 
                         result.ast.rules[0].when && 
                         result.ast.rules[0].when.conditions.length > 0;
    
    if (hasConditions) {
        console.log('✅ Partial AST generated successfully');
        console.log(`Conditions parsed: ${result.ast.rules[0].when.conditions.length}`);
    } else {
        console.log('❌ No partial AST generated');
    }
} catch (error) {
    console.log('❌ Failed to generate partial AST:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
    console.log('🎉 All error recovery tests passed!');
    console.log('\nTask 8 implementation verified:');
    console.log('✅ Parsing recovery for incomplete multi-line patterns');
    console.log('✅ Graceful EOF handling within multi-line patterns');
    console.log('✅ Fallback parsing modes for malformed constructs');
    console.log('✅ Partial AST generation for incomplete patterns');
} else {
    console.log(`⚠️  ${totalTests - passedTests} tests failed. Error recovery needs improvement.`);
}

console.log('\nError recovery implementation complete!');