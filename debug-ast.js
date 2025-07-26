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

const parser = new DroolsParser();
const parseResult = parser.parse(testContent);

console.log('Functions found in AST:');
parseResult.ast.functions.forEach(func => {
    console.log(`- ${func.name} (${func.returnType}) at line ${func.range.start.line}`);
});

console.log('\nRules found in AST:');
parseResult.ast.rules.forEach(rule => {
    console.log(`- ${rule.name} at line ${rule.range.start.line}`);
    if (rule.then) {
        console.log(`  Then clause: "${rule.then.actions.substring(0, 100)}..."`);
    }
});