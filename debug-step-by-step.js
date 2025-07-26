// Let's manually trace through what should happen

const testContent = `function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}`;

const lines = testContent.split('\n');
console.log('Lines:');
lines.forEach((line, index) => {
    console.log(`${index}: "${line}"`);
});

console.log('\nManual parsing simulation:');

let currentLine = 0;

// First function
console.log(`\nParsing first function at line ${currentLine}: "${lines[currentLine]}"`);
const hasOpenBrace1 = lines[currentLine].includes('{');
console.log(`Has open brace on same line: ${hasOpenBrace1}`);

currentLine++; // Move to next line for body parsing
console.log(`Starting body parsing at line ${currentLine}`);

let braceCount = hasOpenBrace1 ? 1 : 0;
let body1 = '';

while (currentLine < lines.length && braceCount > 0) {
    const line = lines[currentLine];
    console.log(`  Processing line ${currentLine}: "${line}"`);
    
    for (const char of line) {
        if (char === '{') {
            braceCount++;
            console.log(`    Found {, braceCount: ${braceCount}`);
        } else if (char === '}') {
            braceCount--;
            console.log(`    Found }, braceCount: ${braceCount}`);
        }
    }
    
    body1 += line + '\n';
    currentLine++;
    
    if (braceCount === 0) {
        console.log(`  Function body complete at line ${currentLine}`);
        break;
    }
}

console.log(`First function body: "${body1.trim()}"`);
console.log(`Current line after first function: ${currentLine}`);

// Skip empty lines
while (currentLine < lines.length && lines[currentLine].trim() === '') {
    console.log(`Skipping empty line ${currentLine}`);
    currentLine++;
}

if (currentLine < lines.length) {
    console.log(`\nParsing second function at line ${currentLine}: "${lines[currentLine]}"`);
} else {
    console.log('\nNo more lines to parse');
}