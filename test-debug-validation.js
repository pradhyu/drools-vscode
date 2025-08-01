// Debug script to test variable validation
const testRule = `rule "ExampleOfBackwardChainingRules"
dialect "java"
when
    $m : Message( status == Message.GOODBYE, message : message )
then
    System.out.println( message );
    System.out.println( $m );
end`;

console.log('Testing variable validation with rule:');
console.log(testRule);
console.log('\n--- Variable Detection Test ---');

// Test the regex patterns
const variableDeclarationRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
const declaredVariables = new Set();
let match;

while ((match = variableDeclarationRegex.exec(testRule)) !== null) {
    const variable = '$' + match[1];
    declaredVariables.add(variable);
    console.log('Found declared variable:', variable);
}

console.log('\nDeclared variables:', Array.from(declaredVariables));

// Test variable usage detection
const variableUsageRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*/g;
const usedVariables = testRule.match(variableUsageRegex) || [];
console.log('Used variables:', usedVariables);

// Check for undefined variables
const undefinedVariables = [];
for (const usedVar of usedVariables) {
    if (!declaredVariables.has(usedVar)) {
        undefinedVariables.push(usedVar);
    }
}

console.log('Undefined variables:', undefinedVariables);

if (undefinedVariables.length === 0) {
    console.log('✅ All variables are properly defined!');
} else {
    console.log('❌ Found undefined variables:', undefinedVariables);
}

// Test the when clause extraction
const whenMatch = testRule.match(/when\s+([\s\S]*?)\s+then/);
if (whenMatch) {
    const whenContent = whenMatch[1];
    console.log('\nWhen clause content:');
    console.log(whenContent);
    
    // Test variable extraction from when clause
    const whenVariables = new Set();
    let whenVarMatch;
    const whenVarRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
    
    while ((whenVarMatch = whenVarRegex.exec(whenContent)) !== null) {
        whenVariables.add('$' + whenVarMatch[1]);
    }
    
    console.log('Variables from when clause:', Array.from(whenVariables));
}