/**
 * Simple test for multi-line pattern detection
 */

const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Simple test case
const testContent = `rule "Test Rule"
when
    eval()
then
    System.out.println("Action");
end`;

console.log('Testing simple multi-line pattern detection\n');

const settings = {
    maxNumberOfProblems: 100,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: true
};

const diagnosticProvider = new DroolsDiagnosticProvider(settings);
const parser = new DroolsParser();

try {
    // Create text document
    const document = TextDocument.create(
        'test://test.drl',
        'drools',
        1,
        testContent
    );
    
    // Parse the content
    console.log('Parsing content...');
    const parseResult = parser.parse(testContent);
    console.log('Parse result:', JSON.stringify(parseResult, null, 2));
    
    // Get diagnostics
    console.log('\nGetting diagnostics...');
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
    
} catch (error) {
    console.log(`Error: ${error.message}`);
    console.log(error.stack);
}