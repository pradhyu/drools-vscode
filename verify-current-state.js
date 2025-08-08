/**
 * Comprehensive verification of current semantic validation and formatting
 */

const { DroolsDiagnosticProvider } = require('./out/server/providers/diagnosticProvider');
const { DroolsParser } = require('./out/server/parser/droolsParser');

function createMockTextDocument(content) {
    return {
        getText: () => content,
        uri: 'file:///test.drl',
        languageId: 'drools',
        version: 1,
        lineCount: content.split('\n').length
    };
}

// Test with proper Drools formatting
const properDroolsContent = `package com.example.rules

import com.example.model.Person
import com.example.model.Account

global java.util.List results

rule "Person Age Validation"
    salience 100
    no-loop true
when
    $person : Person(age > 18, name != null)
    $account : Account(owner == $person, balance > 1000)
then
    System.out.println("Valid person: " + $person.getName());
    results.add($person);
    modify($person) { setStatus("validated") }
end

rule "Invalid Rule With Spaces"
when
    $person : Person(age > 21)
then
    System.out.println("This should warn about unquoted name");
end`;

console.log('=== COMPREHENSIVE VERIFICATION ===\n');
console.log('Testing content:');
console.log(properDroolsContent);
console.log('\n' + '='.repeat(50) + '\n');

const settings = {
    maxNumberOfProblems: 100,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: true
};

const provider = new DroolsDiagnosticProvider(settings);
const parser = new DroolsParser();

console.log('1. PARSING ANALYSIS:');
const document = createMockTextDocument(properDroolsContent);
const parseResult = parser.parse(properDroolsContent);

console.log(`   - Package: ${parseResult.ast.packageDeclaration?.name || 'None'}`);
console.log(`   - Imports: ${parseResult.ast.imports.length}`);
console.log(`   - Globals: ${parseResult.ast.globals.length}`);
console.log(`   - Rules: ${parseResult.ast.rules.length}`);
console.log(`   - Parse Errors: ${parseResult.errors.length}`);

if (parseResult.ast.rules.length > 0) {
    console.log('\n   Rules found:');
    parseResult.ast.rules.forEach((rule, i) => {
        console.log(`     ${i + 1}. "${rule.name}" (attributes: ${rule.attributes.length})`);
    });
}

console.log('\n2. SEMANTIC VALIDATION ANALYSIS:');
const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

console.log(`   - Total diagnostics: ${diagnostics.length}`);

// Group diagnostics by source
const diagnosticsBySource = {};
diagnostics.forEach(d => {
    if (!diagnosticsBySource[d.source]) {
        diagnosticsBySource[d.source] = [];
    }
    diagnosticsBySource[d.source].push(d);
});

console.log('\n   Diagnostics by source:');
Object.keys(diagnosticsBySource).forEach(source => {
    console.log(`     ${source}: ${diagnosticsBySource[source].length} issues`);
});

console.log('\n3. DETAILED DIAGNOSTIC ANALYSIS:');
if (diagnostics.length === 0) {
    console.log('   ✅ No diagnostics found');
} else {
    diagnostics.forEach((d, i) => {
        const severity = d.severity === 1 ? 'ERROR' : d.severity === 2 ? 'WARNING' : 'INFO';
        console.log(`   ${i + 1}. [${severity}] ${d.message}`);
        console.log(`      Source: ${d.source}`);
        console.log(`      Line: ${d.range.start.line + 1}`);
        console.log('');
    });
}

console.log('4. DUPLICATE SEMANTIC VALIDATION CHECK:');
// Check for duplicate messages
const messageCount = {};
diagnostics.forEach(d => {
    const key = `${d.message}|${d.source}`;
    messageCount[key] = (messageCount[key] || 0) + 1;
});

const duplicates = Object.keys(messageCount).filter(key => messageCount[key] > 1);
if (duplicates.length === 0) {
    console.log('   ✅ No duplicate diagnostics found');
} else {
    console.log('   ❌ DUPLICATE DIAGNOSTICS DETECTED:');
    duplicates.forEach(key => {
        const [message, source] = key.split('|');
        console.log(`      "${message}" (${source}) - appears ${messageCount[key]} times`);
    });
}

console.log('\n5. RULE NAME VALIDATION CHECK:');
const ruleNameWarnings = diagnostics.filter(d => 
    d.message.includes('Rule names with spaces or special characters should be quoted')
);

console.log(`   - Rule name warnings: ${ruleNameWarnings.length}`);
ruleNameWarnings.forEach(warning => {
    console.log(`     - ${warning.message}`);
});

// Check if the quoted rule is incorrectly flagged
const quotedRuleWarnings = ruleNameWarnings.filter(w => 
    properDroolsContent.includes('rule "Person Age Validation"')
);
if (quotedRuleWarnings.length > 0) {
    console.log('   ❌ ISSUE: Quoted rule incorrectly flagged');
} else {
    console.log('   ✅ Quoted rules correctly handled');
}

console.log('\n6. FORMATTING ANALYSIS:');
// Check if the content follows proper Drools formatting
const lines = properDroolsContent.split('\n');
let formattingIssues = [];

lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('rule ') && !trimmed.includes('"')) {
        if (trimmed.includes(' ') && !trimmed.match(/rule\s+\w+$/)) {
            formattingIssues.push(`Line ${i + 1}: Unquoted rule name with spaces`);
        }
    }
});

if (formattingIssues.length === 0) {
    console.log('   ✅ No obvious formatting issues detected');
} else {
    console.log('   ❌ FORMATTING ISSUES:');
    formattingIssues.forEach(issue => {
        console.log(`     - ${issue}`);
    });
}

console.log('\n' + '='.repeat(50));
console.log('SUMMARY:');
console.log(`- Parse successful: ${parseResult.errors.length === 0 ? '✅' : '❌'}`);
console.log(`- No duplicate semantics: ${duplicates.length === 0 ? '✅' : '❌'}`);
console.log(`- Rule name validation working: ${quotedRuleWarnings.length === 0 ? '✅' : '❌'}`);
console.log(`- Proper formatting: ${formattingIssues.length === 0 ? '✅' : '❌'}`);
console.log('='.repeat(50));