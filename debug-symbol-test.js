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

rule "Process Order"
when
    $order : Order(amount > 500)
then
    logMessage("Processing large order");
end
`;

const lines = testContent.split('\n');
console.log('Line analysis:');
lines.forEach((line, index) => {
    if (line.includes('calculateScore') || line.includes('logMessage')) {
        console.log(`Line ${index}: ${line.trim()}`);
    }
});

console.log('\nFunction definitions:');
lines.forEach((line, index) => {
    if (line.includes('function')) {
        console.log(`Line ${index}: ${line.trim()}`);
    }
});