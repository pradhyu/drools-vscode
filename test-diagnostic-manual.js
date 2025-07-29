/**
 * Manual test for multi-line pattern diagnostic validation
 * Creates AST nodes manually to test the diagnostic provider
 */

const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Create a manual AST with multi-line patterns for testing
function createTestAST() {
    return {
        type: 'DroolsFile',
        range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },
        packageDeclaration: null,
        imports: [],
        globals: [],
        functions: [],
        queries: [],
        declares: [],
        rules: [
            {
                type: 'Rule',
                name: 'Test Rule',
                range: { start: { line: 0, character: 0 }, end: { line: 9, character: 3 } },
                attributes: [],
                when: {
                    type: 'When',
                    range: { start: { line: 1, character: 0 }, end: { line: 6, character: 0 } },
                    conditions: [
                        // Test case 1: Empty eval pattern
                        {
                            type: 'Condition',
                            conditionType: 'eval',
                            content: '',
                            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
                            isMultiLine: false
                        },
                        // Test case 2: Incomplete exists pattern
                        {
                            type: 'Condition',
                            conditionType: 'exists',
                            content: 'exists',
                            range: { start: { line: 3, character: 4 }, end: { line: 3, character: 10 } },
                            isMultiLine: false
                        },
                        // Test case 3: Multi-line pattern with unmatched parentheses
                        {
                            type: 'Condition',
                            conditionType: 'exists',
                            content: 'exists(\n    Person(age > 18,\n           name != null\n    // Missing closing parenthesis',
                            range: { start: { line: 4, character: 4 }, end: { line: 7, character: 30 } },
                            isMultiLine: true
                        },
                        // Test case 4: Assignment in eval pattern
                        {
                            type: 'Condition',
                            conditionType: 'eval',
                            content: 'x = 5',
                            range: { start: { line: 8, character: 4 }, end: { line: 8, character: 9 } },
                            isMultiLine: false
                        }
                    ]
                },
                then: {
                    type: 'Then',
                    range: { start: { line: 7, character: 0 }, end: { line: 9, character: 0 } },
                    actions: 'System.out.println("Action");'
                }
            }
        ]
    };
}

async function runManualTest() {
    console.log('Testing Multi-line Pattern Diagnostic Validation (Manual AST)\n');
    
    const settings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };
    
    const diagnosticProvider = new DroolsDiagnosticProvider(settings);
    
    // Create test content
    const testContent = `rule "Test Rule"
when
    eval()
    exists
    exists(
        Person(age > 18,
               name != null
        // Missing closing parenthesis
    eval(x = 5)
then
    System.out.println("Action");
end`;

    try {
        // Create text document
        const document = TextDocument.create(
            'test://test.drl',
            'drools',
            1,
            testContent
        );
        
        // Create manual AST
        const ast = createTestAST();
        
        console.log('Manual AST created:');
        console.log(JSON.stringify(ast, null, 2));
        
        // Get diagnostics
        console.log('\nGetting diagnostics...');
        const diagnostics = diagnosticProvider.provideDiagnostics(
            document,
            ast,
            [] // No parse errors
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
        console.log(`\nMulti-line specific diagnostics: ${multiLineDiagnostics.length}`);
        multiLineDiagnostics.forEach((diagnostic, index) => {
            const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
            console.log(`  ${index + 1}. [${severity}] ${diagnostic.message}`);
        });
        
    } catch (error) {
        console.log(`Error: ${error.message}`);
        console.log(error.stack);
    }
}

// Run the test
runManualTest().catch(console.error);