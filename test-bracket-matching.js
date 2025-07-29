#!/usr/bin/env node

/**
 * Test script for bracket matching and folding functionality
 */

const fs = require('fs');
const path = require('path');

// Test Drools content with multi-line patterns
const testContent = `package com.example.rules;

import com.example.Person;
import com.example.Account;

rule "Multi-line exists pattern"
when
    exists(
        Person(
            age > 18,
            name != null
        ) and
        not(
            Account(
                owner == $person,
                balance < 0
            )
        )
    )
then
    System.out.println("Valid person found");
end

rule "Nested multi-line patterns"
when
    $person: Person(age > 21)
    exists(
        Account(
            owner == $person
        ) and
        forall(
            Transaction(
                account == $account,
                amount > 0
            )
        )
    )
then
    System.out.println("Person with positive transactions");
end

rule "Complex eval pattern"
when
    eval(
        someComplexFunction(
            parameter1,
            parameter2
        ) && 
        anotherFunction(
            nestedCall(
                value1,
                value2
            )
        )
    )
then
    // Action
end`;

// Write test file
const testFilePath = 'test-multiline-bracket-matching.drl';
fs.writeFileSync(testFilePath, testContent);

console.log('✅ Created test file:', testFilePath);

// Test the bracket matching provider
async function testBracketMatching() {
    try {
        console.log('\n🧪 Testing Bracket Matching Provider...');
        
        // Import the required modules
        const { DroolsParser } = require('./out/server/parser/droolsParser');
        const { DroolsBracketMatchingProvider } = require('./out/server/providers/bracketMatchingProvider');
        const { TextDocument } = require('vscode-languageserver-textdocument');
        
        // Create a text document
        const document = TextDocument.create(
            'file://' + path.resolve(testFilePath),
            'drools',
            1,
            testContent
        );
        
        // Parse the document
        const parser = new DroolsParser();
        const parseResult = parser.parse(testContent);
        
        console.log('📊 Parse result:');
        console.log(`  - Rules found: ${parseResult.ast.rules.length}`);
        console.log(`  - Parse errors: ${parseResult.errors.length}`);
        
        if (parseResult.errors.length > 0) {
            console.log('  - Errors:');
            parseResult.errors.forEach((error, index) => {
                console.log(`    ${index + 1}. ${error.message} at line ${error.range.start.line + 1}`);
            });
        }
        
        // Create bracket matching provider
        const bracketProvider = new DroolsBracketMatchingProvider({
            enableBracketMatching: true,
            enableHoverSupport: true,
            enableVisualIndicators: true,
            maxSearchDistance: 1000
        });
        
        // Test bracket matching at various positions
        const testPositions = [
            { line: 7, character: 11 }, // exists(
            { line: 8, character: 15 }, // Person(
            { line: 12, character: 12 }, // not(
            { line: 13, character: 19 }, // Account(
            { line: 26, character: 11 }, // exists(
            { line: 31, character: 12 }, // forall(
        ];
        
        console.log('\n🎯 Testing bracket matching at specific positions:');
        
        for (const position of testPositions) {
            try {
                const bracketPair = bracketProvider.findMatchingBracket(document, position, parseResult);
                
                if (bracketPair) {
                    console.log(`  ✅ Position (${position.line + 1}, ${position.character + 1}):`);
                    console.log(`     Type: ${bracketPair.type}`);
                    console.log(`     Multi-line: ${bracketPair.isMultiLine}`);
                    console.log(`     Pattern: ${bracketPair.patternType || 'N/A'}`);
                    console.log(`     Open: (${bracketPair.open.line + 1}, ${bracketPair.open.character + 1})`);
                    console.log(`     Close: (${bracketPair.close.line + 1}, ${bracketPair.close.character + 1})`);
                } else {
                    console.log(`  ❌ Position (${position.line + 1}, ${position.character + 1}): No bracket pair found`);
                }
            } catch (error) {
                console.log(`  ❌ Position (${position.line + 1}, ${position.character + 1}): Error - ${error.message}`);
            }
        }
        
        // Test getting all bracket pairs
        console.log('\n📋 Getting all bracket pairs:');
        try {
            const allBracketPairs = bracketProvider.getAllBracketPairs(document, parseResult);
            console.log(`  Found ${allBracketPairs.length} bracket pairs total`);
            
            const multiLinePairs = allBracketPairs.filter(pair => pair.isMultiLine);
            console.log(`  Multi-line pairs: ${multiLinePairs.length}`);
            
            multiLinePairs.forEach((pair, index) => {
                console.log(`    ${index + 1}. ${pair.type} (${pair.patternType || 'unknown'}) - Lines ${pair.open.line + 1} to ${pair.close.line + 1}`);
            });
        } catch (error) {
            console.log(`  ❌ Error getting all bracket pairs: ${error.message}`);
        }
        
        // Test hover functionality
        console.log('\n🖱️  Testing hover functionality:');
        for (const position of testPositions.slice(0, 3)) { // Test first 3 positions
            try {
                const hover = bracketProvider.provideBracketHover(document, position, parseResult);
                
                if (hover) {
                    console.log(`  ✅ Position (${position.line + 1}, ${position.character + 1}): Hover available`);
                    console.log(`     Content length: ${hover.contents.value.length} chars`);
                } else {
                    console.log(`  ❌ Position (${position.line + 1}, ${position.character + 1}): No hover content`);
                }
            } catch (error) {
                console.log(`  ❌ Position (${position.line + 1}, ${position.character + 1}): Hover error - ${error.message}`);
            }
        }
        
        console.log('\n✅ Bracket matching tests completed');
        
    } catch (error) {
        console.error('❌ Error testing bracket matching:', error.message);
        console.error(error.stack);
    }
}

// Test the folding provider
async function testFoldingProvider() {
    try {
        console.log('\n🧪 Testing Folding Provider...');
        
        // Import the required modules
        const { DroolsParser } = require('./out/server/parser/droolsParser');
        const { DroolsFoldingProvider } = require('./out/server/providers/foldingProvider');
        const { TextDocument } = require('vscode-languageserver-textdocument');
        
        // Create a text document
        const document = TextDocument.create(
            'file://' + path.resolve(testFilePath),
            'drools',
            1,
            testContent
        );
        
        // Parse the document
        const parser = new DroolsParser();
        const parseResult = parser.parse(testContent);
        
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
        
        // Categorize folding ranges
        const ruleRanges = foldingRanges.filter(r => r.collapsedText && r.collapsedText.startsWith('rule'));
        const patternRanges = foldingRanges.filter(r => r.collapsedText && (
            r.collapsedText.includes('exists') || 
            r.collapsedText.includes('not') || 
            r.collapsedText.includes('forall') ||
            r.collapsedText.includes('eval')
        ));
        const importRanges = foldingRanges.filter(r => r.kind === 'imports');
        
        console.log(`\n📈 Folding range breakdown:`);
        console.log(`  - Rule ranges: ${ruleRanges.length}`);
        console.log(`  - Pattern ranges: ${patternRanges.length}`);
        console.log(`  - Import ranges: ${importRanges.length}`);
        console.log(`  - Other ranges: ${foldingRanges.length - ruleRanges.length - patternRanges.length - importRanges.length}`);
        
        console.log('\n✅ Folding provider tests completed');
        
    } catch (error) {
        console.error('❌ Error testing folding provider:', error.message);
        console.error(error.stack);
    }
}

// Test multi-line pattern detection
async function testMultiLinePatternDetection() {
    try {
        console.log('\n🧪 Testing Multi-line Pattern Detection...');
        
        const { DroolsParser } = require('./out/server/parser/droolsParser');
        
        // Parse the document
        const parser = new DroolsParser();
        const parseResult = parser.parse(testContent);
        
        console.log('🔍 Analyzing parsed AST for multi-line patterns...');
        
        let totalMultiLinePatterns = 0;
        let totalConditions = 0;
        
        parseResult.ast.rules.forEach((rule, ruleIndex) => {
            console.log(`\n📋 Rule ${ruleIndex + 1}: "${rule.name}"`);
            
            if (rule.when && rule.when.conditions) {
                rule.when.conditions.forEach((condition, condIndex) => {
                    totalConditions++;
                    console.log(`  Condition ${condIndex + 1}: ${condition.conditionType || 'pattern'}`);
                    console.log(`    Multi-line: ${condition.isMultiLine || false}`);
                    console.log(`    Content preview: "${condition.content.substring(0, 50)}${condition.content.length > 50 ? '...' : ''}"`);
                    
                    if (condition.isMultiLine) {
                        totalMultiLinePatterns++;
                        console.log(`    Spans lines: ${condition.spanLines ? condition.spanLines.join(', ') : 'N/A'}`);
                        console.log(`    Parentheses ranges: ${condition.parenthesesRanges ? condition.parenthesesRanges.length : 0}`);
                    }
                    
                    if (condition.multiLinePattern) {
                        console.log(`    Multi-line pattern: ${condition.multiLinePattern.patternType}`);
                        console.log(`    Pattern complete: ${condition.multiLinePattern.isComplete}`);
                        console.log(`    Nested patterns: ${condition.multiLinePattern.nestedPatterns.length}`);
                    }
                    
                    if (condition.nestedConditions && condition.nestedConditions.length > 0) {
                        console.log(`    Nested conditions: ${condition.nestedConditions.length}`);
                    }
                });
            }
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`  - Total conditions: ${totalConditions}`);
        console.log(`  - Multi-line patterns: ${totalMultiLinePatterns}`);
        console.log(`  - Multi-line percentage: ${totalConditions > 0 ? Math.round((totalMultiLinePatterns / totalConditions) * 100) : 0}%`);
        
        console.log('\n✅ Multi-line pattern detection tests completed');
        
    } catch (error) {
        console.error('❌ Error testing multi-line pattern detection:', error.message);
        console.error(error.stack);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting bracket matching and folding tests...\n');
    
    await testMultiLinePatternDetection();
    await testBracketMatching();
    await testFoldingProvider();
    
    console.log('\n🎉 All tests completed!');
    
    // Clean up test file
    try {
        fs.unlinkSync(testFilePath);
        console.log('🧹 Cleaned up test file');
    } catch (error) {
        console.log('⚠️  Could not clean up test file:', error.message);
    }
}

// Run the tests
runAllTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
});