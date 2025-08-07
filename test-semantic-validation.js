const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');

const settings = {
    maxNumberOfProblems: 100,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: true
};

const provider = new DroolsDiagnosticProvider(settings);
const parser = new DroolsParser();

const content = `rule "Test Rule"
    salience 100
    no-loop
    lock-on-active
when
    $p : Person(age > 18)
then
    System.out.println("test");
end`;

const document = {
    uri: 'file:///test.drl',
    languageId: 'drools',
    version: 1,
    getText: () => content,
    positionAt: (offset) => ({ line: 0, character: offset }),
    offsetAt: (position) => position.character,
    lineCount: content.split('\n').length
};

const parseResult = parser.parse(content);
console.log('Parse result:');
console.log('- Rules:', parseResult.ast.rules.length);
console.log('- Rule attributes:', parseResult.ast.rules[0]?.attributes?.length || 0);
console.log('- Attributes:', parseResult.ast.rules[0]?.attributes?.map(a => a.name) || []);

const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);
console.log('\nDiagnostics:');
diagnostics.forEach(d => {
    console.log(`- ${d.severity === 1 ? 'ERROR' : d.severity === 2 ? 'WARNING' : 'INFO'}: ${d.message}`);
});

// Check specifically for no-loop and lock-on-active errors
const attributeErrors = diagnostics.filter(d => 
    d.message.includes('no-loop') || d.message.includes('lock-on-active')
);
console.log('\nAttribute-specific errors:', attributeErrors.length);
attributeErrors.forEach(e => console.log(`- ${e.message}`));