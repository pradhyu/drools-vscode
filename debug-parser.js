const { DroolsParser } = require('./out/server/parser/droolsParser');

const testContent = `
package com.example.rules;

import java.util.List;

global Logger logger;

function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}

rule "High Value Customer"
when
    $customer : Customer(totalPurchases > 1000)
then
    int score = calculateScore($customer, 100);
    logMessage("Customer score: " + score);
end
`;

console.log('Lines in test content:');
const lines = testContent.split('\n');
lines.forEach((line, index) => {
    console.log(`${index}: ${line}`);
});

console.log('\nParsing...');
const parser = new DroolsParser();
const parseResult = parser.parse(testContent);

console.log('\nParse errors:', parseResult.errors.length);
parseResult.errors.forEach(error => {
    console.log(`  - ${error.message} at line ${error.range.start.line}`);
});

console.log('\nAST structure:');
console.log('Package:', parseResult.ast.packageDeclaration?.name);
console.log('Imports:', parseResult.ast.imports.length);
console.log('Globals:', parseResult.ast.globals.length);
console.log('Functions:', parseResult.ast.functions.length);
console.log('Rules:', parseResult.ast.rules.length);

console.log('\nFunction details:');
parseResult.ast.functions.forEach((func, index) => {
    console.log(`${index}: ${func.name} (${func.returnType}) at line ${func.range.start.line}-${func.range.end.line}`);
    console.log(`  Body: ${func.body.substring(0, 50)}...`);
});