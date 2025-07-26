import { DroolsParser } from './src/server/parser/droolsParser';

const testContent = `function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}`;

console.log('Test content lines:');
const lines = testContent.split('\n');
lines.forEach((line, index) => {
    console.log(`${index}: "${line}"`);
});

const parser = new DroolsParser();
const parseResult = parser.parse(testContent);

console.log('\nParsed functions:');
parseResult.ast.functions.forEach((func, index) => {
    console.log(`${index}: ${func.name} (${func.returnType})`);
    console.log(`  Range: ${func.range.start.line}-${func.range.end.line}`);
    console.log(`  Body: "${func.body}"`);
    console.log('');
});