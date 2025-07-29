/**
 * Debug test for incomplete multi-line pattern
 */

const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { TextDocument } = require('vscode-languageserver-textdocument');

function createIncompleteTestAST() {
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
                        {
                            type: 'Condition',
                            conditionType: 'exists',
                            content: 'exists(\n    Person(age > 18),\n)',
                            range: { start: { line: 2, character: 4 }, end: { line: 4, character: 1 } },
                            isMultiLine: true
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

async function debugIncomplete() {
    console.log('Debug Incomplete Multi-line Pattern Validation\n');
    
    const settings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };
    
    const diagnosticProvider = new DroolsDiagnosticProvider(settings);
    
    try {
        const document = TextDocument.create(
            'test://test.drl',
            'drools',
            1,
            'rule "Test Rule"\nwhen\n    exists(\n        Person(age > 18),\n    )\nthen\n    System.out.println("Action");\nend'
        );
        
        const ast = createIncompleteTestAST();
        
        console.log('AST condition:');
        console.log(JSON.stringify(ast.rules[0].when.conditions[0], null, 2));
        
        const diagnostics = diagnosticProvider.provideDiagnostics(document, ast, []);
        
        console.log('\nAll diagnostics:');
        diagnostics.forEach((diagnostic, index) => {
            const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
            console.log(`  ${index + 1}. [${severity}] ${diagnostic.message} (Source: ${diagnostic.source})`);
        });
        
        const multiLineDiagnostics = diagnostics.filter(d => d.source === 'drools-multiline');
        console.log(`\nMulti-line diagnostics: ${multiLineDiagnostics.length}`);
        
    } catch (error) {
        console.log(`Error: ${error.message}`);
        console.log(error.stack);
    }
}

debugIncomplete().catch(console.error);