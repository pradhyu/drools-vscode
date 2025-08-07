const fs = require('fs');
const path = require('path');

// Files to fix
const testFiles = [
    'test/integration/multilinePatternEdgeCases.test.ts',
    'test/integration/multilinePatternEdgeCasesEnhanced.test.ts'
];

testFiles.forEach(filePath => {
    console.log(`Fixing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix completion provider calls - change parseResult to parseResult.ast and add await
    content = content.replace(
        /(\s+)(const \w+ = )completionProvider\.provideCompletions\(([^,]+), ([^,]+), parseResult\);/g,
        '$1$2await completionProvider.provideCompletions($3, $4, parseResult.ast);'
    );
    
    // Fix completion provider calls in assignments
    content = content.replace(
        /(\s+)(\w+ = )completionProvider\.provideCompletions\(([^,]+), ([^,]+), parseResult\);/g,
        '$1$2await completionProvider.provideCompletions($3, $4, parseResult.ast);'
    );
    
    // Make sure test functions are async
    content = content.replace(
        /test\('([^']+)', \(\) => \{/g,
        "test('$1', async () => {"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
});

console.log('All files fixed!');