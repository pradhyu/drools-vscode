const fs = require('fs');

// Files to fix
const testFiles = [
    'test/integration/multilinePatternEdgeCases.test.ts',
    'test/integration/multilinePatternEdgeCasesEnhanced.test.ts'
];

testFiles.forEach(filePath => {
    console.log(`Fixing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix expect(() => { blocks that contain await calls
    content = content.replace(
        /expect\(\(\) => \{([^}]*await[^}]*)\}\)/gs,
        'await (async () => {$1})()'
    );
    
    // Fix remaining expect blocks with await
    content = content.replace(
        /expect\(\(\) => \{([^}]*await[^}]*)\}\)/gs,
        'await (async () => {$1})()'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
});

console.log('All files fixed!');