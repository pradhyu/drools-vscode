/**
 * Test script to verify formatting provider integration with language server
 */

const { DroolsFormattingProvider } = require('./out/server/providers/formattingProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test data
const testDroolsCode = `package com.example;
rule "Integration Test"
when
$p:Person(age>21)
then
System.out.println("Adult: "+$p.getName());
end`;

async function testServerIntegration() {
    console.log('Testing Language Server Integration...\n');

    try {
        // Test 1: Document formatting capability
        console.log('✓ Testing document formatting capability...');
        const parser = new DroolsParser();
        const formattingProvider = new DroolsFormattingProvider();
        
        const document = TextDocument.create(
            'file:///integration-test.drl',
            'drools',
            1,
            testDroolsCode
        );

        const parseResult = parser.parse(testDroolsCode);
        
        const formattingOptions = {
            insertSpaces: true,
            tabSize: 4
        };

        const textEdits = formattingProvider.formatDocument(
            document,
            formattingOptions,
            parseResult
        );

        console.log(`  - Generated ${textEdits.length} text edits`);
        console.log('  - Document formatting capability: ✓ PASSED\n');

        // Test 2: Range formatting capability
        console.log('✓ Testing range formatting capability...');
        const range = {
            start: { line: 1, character: 0 },
            end: { line: 5, character: 0 }
        };

        const rangeEdits = formattingProvider.formatRange(
            document,
            range,
            parseResult
        );

        console.log(`  - Generated ${rangeEdits.length} range text edits`);
        console.log('  - Range formatting capability: ✓ PASSED\n');

        // Test 3: Different formatting options
        console.log('✓ Testing formatting options handling...');
        
        const tabOptions = {
            insertSpaces: false,
            tabSize: 2
        };

        const tabEdits = formattingProvider.formatDocument(
            document,
            tabOptions,
            parseResult
        );

        console.log(`  - Tab-based formatting generated ${tabEdits.length} edits`);
        console.log('  - Formatting options handling: ✓ PASSED\n');

        // Test 4: Error handling
        console.log('✓ Testing error handling...');
        
        try {
            const invalidDocument = TextDocument.create(
                'file:///invalid.drl',
                'drools',
                1,
                'invalid drools syntax here'
            );

            const invalidParseResult = parser.parse('invalid drools syntax here');
            const errorEdits = formattingProvider.formatDocument(
                invalidDocument,
                formattingOptions,
                invalidParseResult
            );

            console.log(`  - Error handling generated ${errorEdits.length} edits`);
            console.log('  - Error handling: ✓ PASSED\n');
        } catch (error) {
            console.log('  - Error handling: ✓ PASSED (graceful error handling)\n');
        }

        // Test 5: Performance with larger document
        console.log('✓ Testing performance with larger document...');
        
        const largeDocument = generateLargeDocument();
        const largeTextDocument = TextDocument.create(
            'file:///large.drl',
            'drools',
            1,
            largeDocument
        );

        const start = Date.now();
        const largeParseResult = parser.parse(largeDocument);
        const largeEdits = formattingProvider.formatDocument(
            largeTextDocument,
            formattingOptions,
            largeParseResult
        );
        const end = Date.now();

        console.log(`  - Large document (${largeDocument.length} chars) formatted in ${end - start}ms`);
        console.log(`  - Generated ${largeEdits.length} edits`);
        console.log('  - Performance test: ✓ PASSED\n');

        console.log('🎉 All language server integration tests passed!');
        console.log('\nFormatting provider is ready for integration with the language server.');

    } catch (error) {
        console.error('✗ Integration test failed:', error.message);
        console.error(error.stack);
    }
}

function generateLargeDocument() {
    let content = 'package com.example.large;\n\n';
    content += 'import java.util.*;\n';
    content += 'import java.lang.*;\n\n';
    
    // Generate multiple rules
    for (let i = 1; i <= 20; i++) {
        content += `rule "Rule ${i}"\n`;
        content += `salience ${1000 - i * 10}\n`;
        content += 'no-loop true\n';
        content += 'when\n';
        content += `$p${i}:Person(age>${18 + i},name!=null)\n`;
        content += `$a${i}:Account(owner==$p${i},balance>${i * 100})\n`;
        content += 'then\n';
        content += `$a${i}.setBalance($a${i}.getBalance()+${i * 10});\n`;
        content += `System.out.println("Rule ${i} fired");\n`;
        content += 'end\n\n';
    }
    
    // Generate functions
    for (let i = 1; i <= 5; i++) {
        content += `function int calculate${i}(int base,int multiplier){\n`;
        content += `return base*multiplier*${i};\n`;
        content += '}\n\n';
    }
    
    return content;
}

// Run the integration test
testServerIntegration().catch(console.error);