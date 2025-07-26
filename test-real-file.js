const { DroolsSymbolProvider } = require('./out/server/providers/symbolProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');
const fs = require('fs');

// Read the real Drools file
const realContent = fs.readFileSync('snippet-demo.drl', 'utf8');

console.log('Testing with real Drools file...\n');

// Create parser and parse the content
const parser = new DroolsParser();
const parseResult = parser.parse(realContent);

console.log('Parse errors:', parseResult.errors.length);
if (parseResult.errors.length > 0) {
    parseResult.errors.forEach(error => {
        console.log(`  - ${error.message} at line ${error.range.start.line}`);
    });
}
console.log('');

// Create a mock text document
const document = TextDocument.create(
    'file:///snippet-demo.drl',
    'drools',
    1,
    realContent
);

// Create symbol provider
const symbolProvider = new DroolsSymbolProvider();
const documentsMap = new Map();
documentsMap.set(document.uri, { document, parseResult });

// Test document symbols
console.log('=== Document Symbols ===');
const documentSymbols = symbolProvider.provideDocumentSymbols(document, parseResult);

function printSymbolTree(symbols, indent = '') {
    for (const symbol of symbols) {
        console.log(`${indent}${symbol.name} (${getSymbolKindName(symbol.kind)}) [${symbol.range.start.line}:${symbol.range.start.character}-${symbol.range.end.line}:${symbol.range.end.character}]`);
        if (symbol.children && symbol.children.length > 0) {
            printSymbolTree(symbol.children, indent + '  ');
        }
    }
}

printSymbolTree(documentSymbols);
console.log('');

// Test workspace symbols
console.log('=== Workspace Symbol Search ===');
const searchQueries = ['Person', 'rule', 'isEligible', 'Example'];

for (const query of searchQueries) {
    const results = symbolProvider.provideWorkspaceSymbols(
        { query },
        documentsMap
    );
    console.log(`Query "${query}": ${results.length} results`);
    results.forEach(result => {
        console.log(`  - ${result.name} (${getSymbolKindName(result.kind)})`);
    });
    console.log('');
}

// Test go-to-definition for function call
console.log('=== Go-to-Definition Test ===');
// Look for "isEligible" function call (if any)
const lines = realContent.split('\n');
let functionCallLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('isEligible(') && !lines[i].includes('function')) {
        functionCallLine = i;
        break;
    }
}

if (functionCallLine >= 0) {
    const position = { line: functionCallLine, character: 10 };
    const definitions = symbolProvider.provideDefinition(
        document,
        position,
        parseResult,
        documentsMap
    );
    
    console.log(`Go-to-definition for function call at line ${functionCallLine}:`);
    console.log(`Found ${definitions.length} definitions:`);
    definitions.forEach(def => {
        console.log(`  - Location: line ${def.range.start.line}, char ${def.range.start.character}-${def.range.end.character}`);
    });
} else {
    console.log('No function calls found in the file');
}

function getSymbolKindName(kind) {
    const kindNames = {
        1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
        6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
        11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant',
        15: 'String', 16: 'Number', 17: 'Boolean', 18: 'Array', 19: 'Object',
        20: 'Key', 21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
        25: 'Operator', 26: 'TypeParameter'
    };
    return kindNames[kind] || `Unknown(${kind})`;
}

console.log('Real file test completed!');