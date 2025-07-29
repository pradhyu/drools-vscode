/**
 * Comprehensive test for all multi-line pattern validation features
 */

const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test cases for different multi-line pattern scenarios
const testCases = [
    {
        name: "Empty eval pattern",
        condition: {
            type: 'Condition',
            conditionType: 'eval',
            content: 'eval()',
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
            isMultiLine: false
        },
        expectedDiagnostics: ['eval pattern must contain a valid boolean expression']
    },
    {
        name: "Assignment in eval pattern",
        condition: {
            type: 'Condition',
            conditionType: 'eval',
            content: 'x = 5',
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 9 } },
            isMultiLine: false
        },
        expectedDiagnostics: ['assignment (=) instead of comparison (==)']
    },
    {
        name: "Incomplete exists pattern",
        condition: {
            type: 'Condition',
            conditionType: 'exists',
            content: 'exists',
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
            isMultiLine: false
        },
        expectedDiagnostics: ['Incomplete exists pattern: missing opening parenthesis']
    },
    {
        name: "Empty exists pattern with parentheses",
        condition: {
            type: 'Condition',
            conditionType: 'exists',
            content: 'exists(\n)',
            range: { start: { line: 2, character: 4 }, end: { line: 3, character: 1 } },
            isMultiLine: true
        },
        expectedDiagnostics: ['Empty exists pattern: missing content within parentheses']
    },
    {
        name: "Unmatched parentheses in multi-line pattern",
        condition: {
            type: 'Condition',
            conditionType: 'exists',
            content: 'exists(\n    Person(age > 18\n    // Missing closing parenthesis',
            range: { start: { line: 2, character: 4 }, end: { line: 4, character: 30 } },
            isMultiLine: true
        },
        expectedDiagnostics: ['Unmatched opening parenthesis in multi-line pattern']
    },
    {
        name: "Incomplete multi-line pattern with comma",
        condition: {
            type: 'Condition',
            conditionType: 'exists',
            content: 'exists(\n    Person(age > 18),\n)',
            range: { start: { line: 2, character: 4 }, end: { line: 4, character: 1 } },
            isMultiLine: true
        },
        expectedDiagnostics: ['Multi-line pattern appears to be incomplete']
    },
    {
        name: "Forall pattern without multiple conditions",
        condition: {
            type: 'Condition',
            conditionType: 'forall',
            content: 'forall(Person(age > 18))',
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 28 } },
            isMultiLine: false
        },
        expectedDiagnostics: ['forall pattern typically requires multiple conditions']
    },
    {
        name: "Accumulate pattern without required clauses",
        condition: {
            type: 'Condition',
            conditionType: 'accumulate',
            content: 'accumulate(Person(age > 18))',
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 32 } },
            isMultiLine: false
        },
        expectedDiagnostics: ['accumulate pattern should contain init, action, and result clauses']
    }
];

function createTestASTWithCondition(condition) {
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
                    conditions: [condition]
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

async function runComprehensiveTest() {
    console.log('Comprehensive Multi-line Pattern Diagnostic Validation Test\n');
    
    const settings = {
        maxNumberOfProblems: 100,
        enableSyntaxValidation: true,
        enableSemanticValidation: true,
        enableBestPracticeWarnings: true
    };
    
    const diagnosticProvider = new DroolsDiagnosticProvider(settings);
    
    for (const testCase of testCases) {
        console.log(`\n=== ${testCase.name} ===`);
        
        try {
            // Create text document
            const document = TextDocument.create(
                'test://test.drl',
                'drools',
                1,
                'rule "Test Rule"\nwhen\n    // test condition\nthen\n    System.out.println("Action");\nend'
            );
            
            // Create AST with the test condition
            const ast = createTestASTWithCondition(testCase.condition);
            
            // Get diagnostics
            const diagnostics = diagnosticProvider.provideDiagnostics(
                document,
                ast,
                []
            );
            
            // Filter for multi-line specific diagnostics
            const multiLineDiagnostics = diagnostics.filter(d => d.source === 'drools-multiline');
            
            console.log(`Found ${multiLineDiagnostics.length} multi-line diagnostics:`);
            multiLineDiagnostics.forEach((diagnostic, index) => {
                const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
                console.log(`  ${index + 1}. [${severity}] ${diagnostic.message}`);
            });
            
            // Check if expected diagnostics are present
            let foundExpected = false;
            for (const expectedMsg of testCase.expectedDiagnostics) {
                const found = multiLineDiagnostics.some(d => d.message.includes(expectedMsg));
                if (found) {
                    console.log(`✓ Expected diagnostic found: "${expectedMsg}"`);
                    foundExpected = true;
                } else {
                    console.log(`✗ Expected diagnostic NOT found: "${expectedMsg}"`);
                }
            }
            
            if (!foundExpected && testCase.expectedDiagnostics.length > 0) {
                console.log('⚠️  No expected diagnostics were found');
            }
            
        } catch (error) {
            console.log(`Error processing test case: ${error.message}`);
        }
        
        console.log('─'.repeat(50));
    }
    
    // Test deeply nested patterns
    console.log('\n=== Deep Nesting Test ===');
    const deepNestedCondition = {
        type: 'Condition',
        conditionType: 'exists',
        content: 'exists(not(exists(not(Person(age > 18)))))',
        range: { start: { line: 2, character: 4 }, end: { line: 2, character: 45 } },
        isMultiLine: false,
        multiLinePattern: {
            type: 'MultiLinePattern',
            patternType: 'exists',
            keyword: 'exists',
            content: 'not(exists(not(Person(age > 18))))',
            nestedPatterns: [],
            parenthesesRanges: [],
            isComplete: true,
            depth: 4,
            innerConditions: [],
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 45 } }
        }
    };
    
    const deepAst = createTestASTWithCondition(deepNestedCondition);
    const document = TextDocument.create('test://test.drl', 'drools', 1, 'test content');
    const deepDiagnostics = diagnosticProvider.provideDiagnostics(document, deepAst, []);
    const deepMultiLineDiagnostics = deepDiagnostics.filter(d => d.source === 'drools-multiline');
    
    console.log(`Deep nesting diagnostics: ${deepMultiLineDiagnostics.length}`);
    deepMultiLineDiagnostics.forEach((diagnostic, index) => {
        const severity = ['Error', 'Warning', 'Information', 'Hint'][diagnostic.severity - 1];
        console.log(`  ${index + 1}. [${severity}] ${diagnostic.message}`);
    });
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);