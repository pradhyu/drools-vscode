// Let's create a minimal parser test to debug the state

class SimpleParser {
    constructor(text) {
        this.lines = text.split('\n');
        this.currentLine = 0;
    }
    
    getCurrentLine() {
        return this.currentLine < this.lines.length ? this.lines[this.currentLine] : '';
    }
    
    nextLine() {
        this.currentLine++;
    }
    
    parseFunction() {
        const line = this.getCurrentLine().trim();
        console.log(`Parsing function at line ${this.currentLine}: "${line}"`);
        
        const match = line.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*\{?$/);
        if (!match) {
            console.log('No match found');
            return null;
        }
        
        const name = match[2];
        const hasOpenBrace = line.includes('{');
        
        console.log(`Function name: ${name}, has open brace: ${hasOpenBrace}`);
        
        this.nextLine(); // Move to body
        const body = this.parseFunctionBody(hasOpenBrace);
        
        console.log(`Function body: "${body}"`);
        console.log(`After parsing function, current line: ${this.currentLine}`);
        
        return { name, body };
    }
    
    parseFunctionBody(hasOpenBraceOnSameLine = false) {
        let body = '';
        let braceCount = hasOpenBraceOnSameLine ? 1 : 0;
        let foundOpenBrace = hasOpenBraceOnSameLine;
        
        console.log(`Starting body parsing at line ${this.currentLine}, braceCount: ${braceCount}`);
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine();
            console.log(`  Processing line ${this.currentLine}: "${line}"`);
            
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpenBrace = true;
                } else if (char === '}') {
                    braceCount--;
                }
            }
            
            console.log(`    After processing, braceCount: ${braceCount}`);
            
            body += line + '\n';
            this.nextLine();
            
            if (foundOpenBrace && braceCount === 0) {
                console.log(`  Body parsing complete at line ${this.currentLine}`);
                break;
            }
        }
        
        return body.trim();
    }
    
    skipWhitespaceAndComments() {
        console.log(`Skipping whitespace from line ${this.currentLine}`);
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === '') {
                console.log(`  Skipping empty line ${this.currentLine}`);
                this.nextLine();
                continue;
            }
            break;
        }
        console.log(`After skipping whitespace, at line ${this.currentLine}`);
    }
    
    parse() {
        const functions = [];
        
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            console.log(`\nMain loop at line ${this.currentLine}: "${line}"`);
            
            if (line === '') {
                this.nextLine();
                continue;
            }
            
            if (line.startsWith('function ')) {
                const func = this.parseFunction();
                if (func) {
                    functions.push(func);
                }
            } else {
                this.nextLine();
            }
            
            this.skipWhitespaceAndComments();
        }
        
        return functions;
    }
}

const testContent = `function int calculateScore(Person person, int baseScore) {
    return baseScore + person.getAge();
}

function void logMessage(String message) {
    System.out.println(message);
}`;

const parser = new SimpleParser(testContent);
const functions = parser.parse();

console.log('\n=== FINAL RESULT ===');
console.log(`Found ${functions.length} functions:`);
functions.forEach((func, index) => {
    console.log(`${index}: ${func.name}`);
});