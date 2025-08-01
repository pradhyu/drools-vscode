const fs = require('fs');
const path = require('path');

// Mock the required modules for testing
const mockDocument = {
    getText: () => fs.readFileSync('test-variable-validation.drl', 'utf8'),
    uri: 'file:///test-variable-validation.drl'
};

// Simple test to verify variable validation
function testVariableValidation() {
    console.log('Testing variable validation...');
    
    const content = mockDocument.getText();
    console.log('File content:');
    console.log(content);
    
    // Test the regex patterns we're using
    const variableDeclarationRegex = /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
    const matches = [];
    let match;
    
    while ((match = variableDeclarationRegex.exec(content)) !== null) {
        matches.push('$' + match[1]);
    }
    
    console.log('\nFound variables:');
    matches.forEach(variable => console.log('  -', variable));
    
    // Test variable usage detection
    const variableUsageRegex = /\$[a-zA-Z_][a-zA-Z0-9_]*/g;
    const usedVariables = content.match(variableUsageRegex) || [];
    
    console.log('\nUsed variables:');
    [...new Set(usedVariables)].forEach(variable => console.log('  -', variable));
    
    // Check for undefined variables
    const declaredVariables = new Set(matches);
    const undefinedVariables = [];
    
    for (const usedVar of usedVariables) {
        if (!declaredVariables.has(usedVar)) {
            undefinedVariables.push(usedVar);
        }
    }
    
    console.log('\nUndefined variables:');
    if (undefinedVariables.length === 0) {
        console.log('  None - All variables are properly defined!');
    } else {
        undefinedVariables.forEach(variable => console.log('  -', variable));
    }
}

testVariableValidation();