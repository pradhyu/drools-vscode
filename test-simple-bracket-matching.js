#!/usr/bin/env node

/**
 * Simple test for bracket matching functionality
 */

const fs = require('fs');
const path = require('path');

// Simple test content
const testContent = `rule "Simple test"
when
    exists(
        Person(age > 18)
    )
then
    System.out.println("Test");
end`;

// Write test file
const testFilePath = 'test-simple-bracket.drl';
fs.writeFileSync(testFilePath, testContent);

console.log('✅ Created simple test file:', testFilePath);

async function testSimpleBracketMatching() {
    try {
        console.log('\n🧪 Testing Simple Bracket Matching...');
        
        // Import the required modules
        const { DroolsBracketMatchingProvider } = require('./out/server/providers/bracketMatchingProvider');
        const { TextDocument } = require('vscode-languageserver-textdocument');
        
        // Create a text document
        const document = TextDocument.create(
            'file://' + path.resolve(testFilePath),
            'drools',
            1,
            testContent
        );
        
        // Create a minimal parse result for testing
        const parseResult = {
            ast: {
                type: 'DroolsFile',
                range: { start: { line: 0, character: 0 }, end: { line: 7, character: 3 } },
                packageDeclaration: undefined,
                imports: [],
                globals: [],
                functions: [],
                rules: [],
                queries: [],
                declares: []
            },
            errors: []
        };
        
        // Create bracket matching provider
        const bracketProvider = new DroolsBracketMatchingProvider({
            enableBracketMatching: true,
            enableHoverSupport: true,
            enableVisualIndicators: true,
            maxSearchDistance: 1000
        });
        
        // Test bracket matching at the exists( position
        const testPosition = { line: 2, character: 11 }; // exists(
        
        console.log(`🎯 Testing bracket matching at position (${testPosition.line + 1}, ${testPosition.character + 1})`);
        
        const bracketPair = bracketProvider.findMatchingBracket(document, testPosition, parseResult);
        
        if (bracketPair) {
            console.log('✅ Bracket pair found:');
            console.log(`   Type: ${bracketPair.type}`);
            console.log(`   Multi-line: ${bracketPair.isMultiLine}`);
            console.log(`   Open: (${bracketPair.open.line + 1}, ${bracketPair.open.character + 1})`);
            console.log(`   Close: (${bracketPair.close.line + 1}, ${bracketPair.close.character + 1})`);
        } else {
            console.log('❌ No bracket pair found');
        }
        
        // Test getting all bracket pairs from text
        console.log('\n📋 Getting all bracket pairs from text:');
        const allBracketPairs = bracketProvider.getAllBracketPairs(document, parseResult);
        console.log(`Found ${allBracketPairs.length} bracket pairs total`);
        
        allBracketPairs.forEach((pair, index) => {
            console.log(`  ${index + 1}. ${pair.type} - Lines ${pair.open.line + 1} to ${pair.close.line + 1} (Multi-line: ${pair.isMultiLine})`);
        });
        
        console.log('\n✅ Simple bracket matching test completed');
        
    } catch (error) {
        console.error('❌ Error testing simple bracket matching:', error.message);
        console.error(error.stack);
    }
}

// Test folding with simple content
async function testSimpleFolding() {
    try {
        console.log('\n🧪 Testing Simple Folding...');
        
        const { DroolsFoldingProvider } = require('./out/server/providers/foldingProvider');
        const { TextDocument } = require('vscode-languageserver-textdocument');
        
        // Create a text document
        const document = TextDocument.create(
            'file://' + path.resolve(testFilePath),
            'drools',
            1,
            testContent
        );
        
        // Create a minimal parse result with a rule
        const parseResult = {
            ast: {
                type: 'DroolsFile',
                range: { start: { line: 0, character: 0 }, end: { line: 7, character: 3 } },
                packageDeclaration: undefined,
                imports: [],
                globals: [],
                functions: [],
                rules: [{
                    type: 'Rule',
                    name: 'Simple test',
                    range: { start: { line: 0, character: 0 }, end: { line: 7, character: 3 } },
                    attributes: [],
                    when: {
                        type: 'When',
                        range: { start: { line: 1, character: 0 }, end: { line: 4, character: 5 } },
                        conditions: [{
                            type: 'Condition',
                            conditionType: 'exists',
                            content: 'exists(\n        Person(age > 18)\n    )',
                            range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
                            isMultiLine: true,
                            spanLines: [2, 3, 4],
                            parenthesesRanges: [
                                { start: { line: 2, character: 10 }, end: { line: 2, character: 11 } },
                                { start: { line: 4, character: 4 }, end: { line: 4, character: 5 } }
                            ]
                        }]
                    },
                    then: {
                        type: 'Then',
                        range: { start: { line: 5, character: 0 }, end: { line: 6, character: 27 } },
                        actions: 'System.out.println("Test");'
                    }
                }],
                queries: [],
                declares: []
            },
            errors: []
        };
        
        // Create folding provider
        const foldingProvider = new DroolsFoldingProvider({
            enableRuleFolding: true,
            enableFunctionFolding: true,
            enableCommentFolding: true,
            enableImportFolding: true,
            enableMultiLinePatternFolding: true
        });
        
        // Get folding ranges
        const foldingRanges = foldingProvider.provideFoldingRanges(document, parseResult);
        
        console.log(`📊 Found ${foldingRanges.length} folding ranges:`);
        
        foldingRanges.forEach((range, index) => {
            console.log(`  ${index + 1}. Lines ${range.startLine + 1}-${range.endLine + 1} (${range.kind || 'region'})`);
            if (range.collapsedText) {
                console.log(`     Collapsed: "${range.collapsedText}"`);
            }
        });
        
        console.log('\n✅ Simple folding test completed');
        
    } catch (error) {
        console.error('❌ Error testing simple folding:', error.message);
        console.error(error.stack);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting simple bracket matching and folding tests...\n');
    
    await testSimpleBracketMatching();
    await testSimpleFolding();
    
    console.log('\n🎉 All simple tests completed!');
    
    // Clean up test file
    try {
        fs.unlinkSync(testFilePath);
        console.log('🧹 Cleaned up test file');
    } catch (error) {
        console.log('⚠️  Could not clean up test file:', error.message);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
});