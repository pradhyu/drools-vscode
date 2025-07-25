/**
 * Test diagnostic provider with the malformed test file
 */

const fs = require('fs');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');

// Mock TextDocument
class MockTextDocument {
    constructor(text) {
        this.text = text;
    }
    
    getText() {
        return this.text;
    }
}

// Read the malformed test file
const malformedContent = fs.readFileSync('test-malformed.drl', 'utf8');

console.log('Testing diagnostic provider with malformed.drl file...\n');
console.log('File content:');
console.log('=' .repeat(60));
console.log(malformedContent);
console.log('=' .repeat(60));

// Test the diagnostic provider
const parser = new DroolsParser();
const diagnosticSettings = {
    maxNumberOfProblems: 100,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: true
};

try {
    // Parse the content
    const parseResult = parser.parse(malformedContent);
    
    // Create diagnostic provider
    const diagnosticProvider = new DroolsDiagnosticProvider(diagnosticSettings);
    const document = new MockTextDocument(malformedContent);
    
    // Get diagnostics
    const diagnostics = diagnosticProvider.provideDiagnostics(
        document,
        parseResult.ast,
        parseResult.errors
    );
    
    console.log(`\nFound ${diagnostics.length} diagnostic(s):\n`);
    
    // Group diagnostics by severity
    const errorDiagnostics = diagnostics.filter(d => d.severity === 1);
    const warningDiagnostics = diagnostics.filter(d => d.severity === 2);
    const infoDiagnostics = diagnostics.filter(d => d.severity === 3);
    
    if (errorDiagnostics.length > 0) {
        console.log('ERRORS:');
        for (const diagnostic of errorDiagnostics) {
            console.log(`  Line ${diagnostic.range.start.line + 1}: ${diagnostic.message} (${diagnostic.source})`);
        }
        console.log();
    }
    
    if (warningDiagnostics.length > 0) {
        console.log('WARNINGS:');
        for (const diagnostic of warningDiagnostics) {
            console.log(`  Line ${diagnostic.range.start.line + 1}: ${diagnostic.message} (${diagnostic.source})`);
        }
        console.log();
    }
    
    if (infoDiagnostics.length > 0) {
        console.log('INFORMATION:');
        for (const diagnostic of infoDiagnostics) {
            console.log(`  Line ${diagnostic.range.start.line + 1}: ${diagnostic.message} (${diagnostic.source})`);
        }
        console.log();
    }
    
} catch (error) {
    console.log(`Error: ${error.message}`);
    console.log(error.stack);
}