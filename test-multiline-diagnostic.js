/**
 * Test script for multi-line pattern diagnostic validation
 */

const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test cases for multi-line pattern validation
const testCases = [
    {
        name: "Valid multi-line exists pattern",
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18,
               name != null)
    )
then
    System.out.println("Valid person found");
end`
    },
    {
        name: "Unmatched opening parenthesis in exists",
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18,
               name != null
    // Missing closing parenthesis
then
    System.out.println("Action");
end`
    },
    {
        name: "Unmatched closing parenthesis",
        content: `rule "Test Rule"
when
    exists
        Person(age > 18))
    )
then
    System.out.println("Action");
end`
    },
    {
        name: "Empty eval pattern",
        content: `rule "Test Rule"
when
    eval()
then
    System.out.println("Action");
end`
    },
    {
        name: "Incomplete not pattern",
        content: `rule "Test Rule"
when
    not
then
    System.out.println("Action");
end`
    },
    {
        name: "Nested multi-line patterns",
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18) and
        not(
            Account(
                owner == $person,
                balance < 0
            )
        )
    )
then
    System.out.println("Valid person with positive balance");
end`
    },
    {
        name: "Deep nesting warning",
        content: `rule "Test Rule"
when
    exists(
        not(
            exists(
                not(
                    Person(age > 18)
                )
            )
        )
    )
then
    System.out.println("Deeply nested pattern");
end`
    },
    {
        name: "Assignment in eval pattern",
        content: `rule "Test Rule"
when
    eval(x = 5)
then
    System.out.println("Action");
end`
    },
    {
        name: "Incomplete multi-line pattern with comma",
        content: `rule "Test Rule"
when
    exists(
        Person(age > 18),
    )
then
    System.out.println("Action");
end`
    }
];

async function runTests() {
    console.log('Testing Multi-line Pattern Diagnostic Validation\n');
    
    const settings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };
    
    const diagnosticProvider = new DroolsDiagnosticProvider(settings);
    const parser = new DroolsParser();
    
    for (const testCase of testCases) {
        console.log(`\n=== ${testCase.name} ===`);
        console.log('Content:');
        console.log(testCase.content);
        
        try {
            // Create text document
            const document = TextDocument.create(
                'test://test.drl',
                'drools',
                1,
                testCase.content
            );
            
            // Parse the content
            const parseResult = parser.parse(testCase.content);
            
            // Get diagnostics
            const diagnostics = diagnosticProvider.provideDiagnostics(
                document,
                parseResult.ast,
                parseResult.errors
            );
            
            console.log('\nDiagnostics:');
            if (diagnostics.length === 0) {
                console.log('  No diagnostics found');
            } else {
                diagnostics.forEach((diagnostic, index) => {
                    const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
                    console.log(`  ${index + 1}. [${severity}] Line ${diagnostic.range.start.line + 1}: ${diagnostic.message}`);
                    console.log(`     Source: ${diagnostic.source}`);
                });
            }
            
            // Check for multi-line specific diagnostics
            const multiLineDiagnostics = diagnostics.filter(d => d.source === 'drools-multiline');
            if (multiLineDiagnostics.length > 0) {
                console.log('\nMulti-line specific diagnostics:');
                multiLineDiagnostics.forEach((diagnostic, index) => {
                    const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
                    console.log(`  ${index + 1}. [${severity}] ${diagnostic.message}`);
                });
            }
            
        } catch (error) {
            console.log(`Error processing test case: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(50));
    }
}

// Run the tests
runTests().catch(console.error);