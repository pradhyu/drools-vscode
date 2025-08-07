const fs = require('fs');

const filePath = 'test/integration/multilinePatternEdgeCasesEnhanced.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing async patterns in enhanced test file...');

// Fix the problematic expect(async () => {}).not.toThrow() patterns
// Pattern 1: Single variable assignment in for loops
content = content.replace(
    /(\s+)let (\w+): any;\s+expect\(async \(\) => \{\s+(\w+) = await completionProvider\.provideCompletions\(([^)]+)\);\s+\}\)\.not\.toThrow\(\);\s+expect\(\3\)\.toBeDefined\(\);/g,
    '$1const $2 = await completionProvider.provideCompletions($4);\n$1expect($2).toBeDefined();'
);

// Pattern 2: Variable assignment outside for loops
content = content.replace(
    /(\s+)let (\w+): any;\s+expect\(async \(\) => \{\s+(\w+) = await completionProvider\.provideCompletions\(([^)]+)\);\s+\}\)\.not\.toThrow\(\);/g,
    '$1const $2 = await completionProvider.provideCompletions($4);'
);

// Pattern 3: Generic completion calls in for loops
content = content.replace(
    /(\s+)let completion: any;\s+expect\(async \(\) => \{\s+completion = await completionProvider\.provideCompletions\(([^)]+)\);\s+\}\)\.not\.toThrow\(\);\s+expect\(completion\)\.toBeDefined\(\);/g,
    '$1const completion = await completionProvider.provideCompletions($2);\n$1expect(completion).toBeDefined();'
);

// Pattern 4: Generic completions calls in for loops
content = content.replace(
    /(\s+)let completions: any;\s+expect\(async \(\) => \{\s+completions = await completionProvider\.provideCompletions\(([^)]+)\);\s+\}\)\.not\.toThrow\(\);\s+expect\(completions\)\.toBeDefined\(\);/g,
    '$1const completions = await completionProvider.provideCompletions($2);\n$1expect(completions).toBeDefined();'
);

fs.writeFileSync(filePath, content);
console.log('Fixed async patterns in enhanced test file');