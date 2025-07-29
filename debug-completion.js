#!/usr/bin/env node

/**
 * Debug script for completion provider issues
 */

const { DroolsCompletionProvider } = require('./out/server/providers/completionProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Test settings
const completionSettings = {
    enableKeywordCompletion: true,
    enableFactTypeCompletion: true,
    enableFunctionCompletion: true,
    enableVariableCompletion: true,
    maxCompletionItems: 50
};

// Create test instances
const parser = new DroolsParser();
const completionProvider = new DroolsCompletionProvider(completionSettings);

async function debugCompletion() {
    console.log('🔍 Debugging Completion Provider\n');
    
    const testContent = `rule "Test Rule"
when
    exists(
        Person(age > 18)
    )
then
    // action
end`;
    
    console.log('📄 Test content:');
    console.log(testContent);
    console.log('\n📍 Testing position: line 3, character 8 (inside exists pattern)');
    
    // Create text document
    const document = TextDocument.create(
        'test://test.drl',
        'drools',
        1,
        testContent
    );
    
    // Parse the document
    console.log('\n🔧 Parsing document...');
    const parseResult = parser.parse(testContent);
    
    console.log(`📊 Parse result: ${parseResult.errors.length} errors`);
    if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
            console.log(`   ❌ ${error.message} at line ${error.range.start.line + 1}`);
        });
    }
    
    console.log(`📋 AST structure:`);
    console.log(`   - Package: ${parseResult.ast.packageDeclaration?.name || 'none'}`);
    console.log(`   - Imports: ${parseResult.ast.imports.length}`);
    console.log(`   - Rules: ${parseResult.ast.rules.length}`);
    
    if (parseResult.ast.rules.length > 0) {
        const rule = parseResult.ast.rules[0];
        console.log(`   - Rule name: ${rule.name}`);
        console.log(`   - Has when clause: ${!!rule.when}`);
        if (rule.when) {
            console.log(`   - Conditions: ${rule.when.conditions.length}`);
            rule.when.conditions.forEach((condition, i) => {
                console.log(`     - Condition ${i}: type=${condition.conditionType}, content="${condition.content}"`);
                if (condition.multiLinePattern) {
                    console.log(`       - Multi-line pattern: ${condition.multiLinePattern.patternType}`);
                }
            });
        }
    }
    
    // Test position
    const position = { line: 3, character: 8 };
    
    console.log('\n🎯 Getting completions...');
    const completions = completionProvider.provideCompletions(
        document,
        position,
        parseResult
    );
    
    console.log(`📊 Found ${completions.length} completions`);
    
    // Group completions by kind
    const completionsByKind = {};
    completions.forEach(completion => {
        const kindName = getCompletionKindName(completion.kind);
        if (!completionsByKind[kindName]) {
            completionsByKind[kindName] = [];
        }
        completionsByKind[kindName].push(completion.label);
    });
    
    Object.keys(completionsByKind).forEach(kind => {
        console.log(`   ${kind}: ${completionsByKind[kind].join(', ')}`);
    });
    
    // Test scope detection manually
    console.log('\n🔍 Manual scope detection test...');
    
    // Check if position is within rule
    if (parseResult.ast.rules.length > 0) {
        const rule = parseResult.ast.rules[0];
        console.log(`Rule range: ${JSON.stringify(rule.range)}`);
        console.log(`Position: ${JSON.stringify(position)}`);
        
        const isInRule = isPositionInRange(position, rule.range);
        console.log(`Position is in rule: ${isInRule}`);
        
        if (rule.when) {
            console.log(`When clause range: ${JSON.stringify(rule.when.range)}`);
            const isInWhen = isPositionInRange(position, rule.when.range);
            console.log(`Position is in when clause: ${isInWhen}`);
        }
    }
}

function getCompletionKindName(kind) {
    const kinds = {
        1: 'Text',
        2: 'Method',
        3: 'Function',
        4: 'Constructor',
        5: 'Field',
        6: 'Variable',
        7: 'Class',
        8: 'Interface',
        9: 'Module',
        10: 'Property',
        11: 'Unit',
        12: 'Value',
        13: 'Enum',
        14: 'Keyword',
        15: 'Snippet',
        16: 'Color',
        17: 'File',
        18: 'Reference',
        19: 'Folder',
        20: 'EnumMember',
        21: 'Constant',
        22: 'Struct',
        23: 'Event',
        24: 'Operator',
        25: 'TypeParameter'
    };
    return kinds[kind] || `Unknown(${kind})`;
}

function isPositionInRange(position, range) {
    if (position.line < range.start.line || position.line > range.end.line) {
        return false;
    }
    if (position.line === range.start.line && position.character < range.start.character) {
        return false;
    }
    if (position.line === range.end.line && position.character > range.end.character) {
        return false;
    }
    return true;
}

// Run the debug
if (require.main === module) {
    debugCompletion().catch(error => {
        console.error('Debug failed:', error);
        process.exit(1);
    });
}