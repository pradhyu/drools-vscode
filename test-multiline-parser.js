const { DroolsParser } = require('./out/server/parser/droolsParser');

// Test multi-line pattern parsing
const parser = new DroolsParser();

const testCode = `
rule "Test Multi-line Pattern"
when
    exists(
        Person(age > 18,
               name != null)
    )
    not(
        Account(
            owner == $person,
            balance < 0
        )
    )
then
    // action
end
`;

console.log('Testing multi-line pattern parsing...');
const result = parser.parse(testCode);

console.log('Parse result:');
console.log('- Errors:', result.errors.length);
console.log('- Parse time:', parser.getParseTime(), 'ms');

if (result.errors.length > 0) {
    console.log('Errors found:');
    result.errors.forEach(error => {
        console.log(`  - ${error.severity}: ${error.message} at line ${error.range.start.line}`);
    });
}

console.log('AST structure:', JSON.stringify(result.ast, null, 2));