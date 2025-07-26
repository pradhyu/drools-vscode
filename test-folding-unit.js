const assert = require('assert');

// Mock the VSCode language server types
const mockFoldingRangeKind = {
    Comment: 1,
    Imports: 2,
    Region: 3
};

// Mock TextDocument
class MockTextDocument {
    constructor(content) {
        this.content = content;
        this.lines = content.split('\n');
    }

    getText() {
        return this.content;
    }

    lineAt(line) {
        return {
            text: this.lines[line] || ''
        };
    }
}

// Mock the folding provider (simplified version for testing)
class TestFoldingProvider {
    provideFoldingRanges(document, parseResult) {
        const foldingRanges = [];
        
        // Add folding ranges for rules
        if (parseResult.ast && parseResult.ast.rules) {
            parseResult.ast.rules.forEach(rule => {
                if (rule.range.end.line > rule.range.start.line) {
                    foldingRanges.push({
                        startLine: rule.range.start.line,
                        endLine: rule.range.end.line,
                        kind: mockFoldingRangeKind.Region,
                        collapsedText: `rule "${rule.name}"`
                    });
                }
            });
        }

        // Add folding ranges for functions
        if (parseResult.ast && parseResult.ast.functions) {
            parseResult.ast.functions.forEach(func => {
                if (func.range.end.line > func.range.start.line) {
                    foldingRanges.push({
                        startLine: func.range.start.line,
                        endLine: func.range.end.line,
                        kind: mockFoldingRangeKind.Region,
                        collapsedText: `function ${func.returnType} ${func.name}(...)`
                    });
                }
            });
        }

        // Add folding ranges for comments
        this.addCommentFoldingRanges(foldingRanges, document);

        return foldingRanges;
    }

    addCommentFoldingRanges(foldingRanges, document) {
        const lines = document.getText().split('\n');
        let blockCommentStart = null;
        let lineCommentStart = null;
        let consecutiveLineComments = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Handle block comments
            if (line.includes('/*') && !blockCommentStart) {
                blockCommentStart = i;
            }
            if (line.includes('*/') && blockCommentStart !== null) {
                if (i > blockCommentStart) {
                    foldingRanges.push({
                        startLine: blockCommentStart,
                        endLine: i,
                        kind: mockFoldingRangeKind.Comment,
                        collapsedText: '/* ... */'
                    });
                }
                blockCommentStart = null;
            }

            // Handle line comments
            if (line.startsWith('//')) {
                if (lineCommentStart === null) {
                    lineCommentStart = i;
                    consecutiveLineComments = 1;
                } else {
                    consecutiveLineComments++;
                }
            } else {
                if (lineCommentStart !== null && consecutiveLineComments >= 3) {
                    foldingRanges.push({
                        startLine: lineCommentStart,
                        endLine: i - 1,
                        kind: mockFoldingRangeKind.Comment,
                        collapsedText: `// ... (${consecutiveLineComments} lines)`
                    });
                }
                lineCommentStart = null;
                consecutiveLineComments = 0;
            }
        }

        // Handle case where file ends with consecutive line comments
        if (lineCommentStart !== null && consecutiveLineComments >= 3) {
            foldingRanges.push({
                startLine: lineCommentStart,
                endLine: lines.length - 1,
                kind: mockFoldingRangeKind.Comment,
                collapsedText: `// ... (${consecutiveLineComments} lines)`
            });
        }
    }
}

// Test data
const testContent = `package com.example.rules;

import java.util.List;
import java.util.Map;

/*
 * This is a multi-line
 * block comment
 */

// Line comment 1
// Line comment 2  
// Line comment 3
// Line comment 4

function String processData(String input) {
    return input.toUpperCase();
}

rule "Test Rule"
when
    $person : Person(age > 18)
then
    $person.setActive(true);
end`;

const mockParseResult = {
    ast: {
        rules: [{
            name: "Test Rule",
            range: {
                start: { line: 18, character: 0 },
                end: { line: 22, character: 3 }
            }
        }],
        functions: [{
            name: "processData",
            returnType: "String",
            range: {
                start: { line: 15, character: 0 },
                end: { line: 17, character: 1 }
            }
        }]
    }
};

// Run tests
console.log('Running Drools Folding Provider Unit Tests...');

const provider = new TestFoldingProvider();
const document = new MockTextDocument(testContent);
const foldingRanges = provider.provideFoldingRanges(document, mockParseResult);

// Test 1: Should provide folding ranges
assert(Array.isArray(foldingRanges), 'Should return an array of folding ranges');
assert(foldingRanges.length > 0, 'Should return at least one folding range');

// Test 2: Should have rule folding range
const ruleFoldingRanges = foldingRanges.filter(range => 
    range.kind === mockFoldingRangeKind.Region && 
    range.collapsedText && range.collapsedText.includes('rule')
);
assert(ruleFoldingRanges.length === 1, 'Should have exactly one rule folding range');
assert(ruleFoldingRanges[0].collapsedText === 'rule "Test Rule"', 'Rule folding range should have correct collapsed text');

// Test 3: Should have function folding range
const functionFoldingRanges = foldingRanges.filter(range => 
    range.kind === mockFoldingRangeKind.Region && 
    range.collapsedText && range.collapsedText.includes('function')
);
assert(functionFoldingRanges.length === 1, 'Should have exactly one function folding range');
assert(functionFoldingRanges[0].collapsedText.includes('function String processData'), 'Function folding range should have correct collapsed text');

// Test 4: Should have comment folding ranges
const commentFoldingRanges = foldingRanges.filter(range => 
    range.kind === mockFoldingRangeKind.Comment
);
assert(commentFoldingRanges.length >= 2, 'Should have at least two comment folding ranges (block and line comments)');

// Test 5: Should have block comment folding range
const blockCommentRange = commentFoldingRanges.find(range => 
    range.collapsedText === '/* ... */'
);
assert(blockCommentRange, 'Should have block comment folding range');

// Test 6: Should have line comment folding range
const lineCommentRange = commentFoldingRanges.find(range => 
    range.collapsedText && range.collapsedText.includes('// ...')
);
assert(lineCommentRange, 'Should have line comment folding range');

// Test 7: Folding ranges should have correct line numbers
foldingRanges.forEach(range => {
    assert(typeof range.startLine === 'number', 'Start line should be a number');
    assert(typeof range.endLine === 'number', 'End line should be a number');
    assert(range.endLine >= range.startLine, 'End line should be >= start line');
});

console.log('✅ All folding provider unit tests passed!');
console.log(`Total folding ranges created: ${foldingRanges.length}`);
console.log('Folding ranges:');
foldingRanges.forEach((range, index) => {
    console.log(`  ${index + 1}. Lines ${range.startLine}-${range.endLine} (${range.kind === mockFoldingRangeKind.Region ? 'Region' : 'Comment'}): ${range.collapsedText}`);
});