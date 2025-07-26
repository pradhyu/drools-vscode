const fs = require('fs');

// Read the parser source and add debug output
const parserSource = fs.readFileSync('./src/server/parser/droolsParser.ts', 'utf8');

// Create a modified version with debug output
const debugParserSource = parserSource.replace(
    'while (this.currentLine < this.lines.length) {',
    `while (this.currentLine < this.lines.length) {
            console.log(\`Parsing line \${this.currentLine}: "\${this.getCurrentLine()}"\`);`
).replace(
    'ast.functions.push(this.parseFunction());',
    `console.log('Parsing function...');
                ast.functions.push(this.parseFunction());
                console.log(\`After parsing function, current line: \${this.currentLine}\`);`
);

// Write the debug version
fs.writeFileSync('./debug-parser.ts', debugParserSource);

console.log('Debug parser created. Compiling...');

const { execSync } = require('child_process');
try {
    execSync('npx tsc debug-parser.ts --outDir debug-out --target es2020 --module commonjs --lib es2020 --moduleResolution node', { stdio: 'inherit' });
    console.log('Compilation successful. Running test...');
    
    const { DroolsParser } = require('./debug-out/debug-parser');
    
    const testContent = `
package com.example.rules;

function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}
`;

    const parser = new DroolsParser();
    const parseResult = parser.parse(testContent);
    
    console.log('\nFinal result:');
    console.log('Functions found:', parseResult.ast.functions.length);
    parseResult.ast.functions.forEach((func, index) => {
        console.log(`${index}: ${func.name} (${func.returnType})`);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}