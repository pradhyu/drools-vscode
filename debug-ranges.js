const { DroolsParser } = require('./out/server/parser/droolsParser');

const testContent = `function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}`;

const parser = new DroolsParser();
const parseResult = parser.parse(testContent);

console.log('Functions with ranges:');
parseResult.ast.functions.forEach((func, index) => {
    console.log(`${index}: ${func.name} (${func.returnType})`);
    console.log(`  Range: ${func.range.start.line}:${func.range.start.character} - ${func.range.end.line}:${func.range.end.character}`);
    console.log(`  Body length: ${func.body.length}`);
    console.log(`  Body preview: "${func.body.substring(0, 50)}${func.body.length > 50 ? '...' : ''}"`);
    console.log('');
});

console.log('Lines in content:');
const lines = testContent.split('\n');
lines.forEach((line, index) => {
    console.log(`${index}: "${line}"`);
});