/**
 * Final comprehensive test of both fixes
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

// Test both issues together
const testContent = `rule "testing this new thing n"
when
    $string : String()
then
    System.out.println($string);
    System.out.println($tring);  // $tring is undefined (typo)
end

rule "Rule with @#$%^&*()+=<>?/|\\\\~\` special chars"
when
    $obj : Object()
then
    System.out.println("Special chars in rule name should be allowed");
end

rule "Another-Rule.with:various_chars123"
when
    $test : Test()
then
    System.out.println("More special chars should be allowed");
end`;

console.log('=== FINAL COMPREHENSIVE TEST ===\n');
console.log('Testing both fixes:');
console.log('1. Precise undefined variable positioning');
console.log('2. Lenient rule name validation for special characters');
console.log('\nContent:');
console.log(testContent);
console.log('\n' + '='.repeat(70) + '\n');

const settings = {
    maxNumberOfProblems: 100,
    enableSyntaxValidation: true,
    enableSemanticValidation: true,
    enableBestPracticeWarnings: false
};

const provider = new DroolsDiagnosticProvider(settings);
const parser = new DroolsParser();

console.log('ANALYSIS:');
const document = createMockTextDocument(testContent);
const parseResult = parser.parse(testContent);
const diagnostics = provider.provideDiagnostics(document, parseResult.ast, parseResult.errors);

console.log(`- Rules parsed: ${parseResult.ast.rules.length}`);
console.log(`- Total diagnostics: ${diagnostics.length}`);

if (parseResult.ast.rules.length > 0) {
    console.log('\nRule names parsed:');
    parseResult.ast.rules.forEach((rule, i) => {
        console.log(`  ${i + 1}. "${rule.name}"`);
    });
}

console.log('\nDiagnostics:');
if (diagnostics.length === 0) {
    console.log('  No diagnostics found');
} else {
    diagnostics.forEach((d, i) => {
        const severity = d.severity === 1 ? 'ERROR' : d.severity === 2 ? 'WARNING' : 'INFO';
        console.log(`  ${i + 1}. [${severity}] ${d.message}`);
        console.log(`     Source: ${d.source}`);
        console.log(`     Position: Line ${d.range.start.line + 1}, Column ${d.range.start.character}-${d.range.end.character}`);
        
        // Show the specific line content
        const lineContent = testContent.split('\n')[d.range.start.line];
        if (lineContent) {
            console.log(`     Line: "${lineContent.trim()}"`);
            const highlightedPart = lineContent.substring(d.range.start.character, d.range.end.character);
            console.log(`     Highlighted: "${highlightedPart}"`);
        }
        console.log('');
    });
}

console.log('EXPECTED RESULTS:');
console.log('✅ Should find exactly 1 error: undefined variable $tring');
console.log('✅ Should highlight only the specific occurrence of $tring');
console.log('✅ Should accept all rule names with special characters');
console.log('✅ Should not generate false positive rule name errors');

const hasUndefinedVarError = diagnostics.some(d => 
    d.message.includes('Undefined variable') && d.message.includes('$tring')
);

const hasRuleNameErrors = diagnostics.some(d => 
    d.message.includes('rule') && d.message.includes('name')
);

const precisePositioning = diagnostics.some(d => 
    d.message.includes('$tring') && 
    d.range.start.character > 0 && 
    (d.range.end.character - d.range.start.character) === 6 // length of "$tring"
);

console.log('\n' + '='.repeat(70));
console.log('RESULTS SUMMARY:');
console.log(`✅ Undefined variable detected: ${hasUndefinedVarError ? 'YES' : 'NO'}`);
console.log(`✅ Precise positioning: ${precisePositioning ? 'YES' : 'NO'}`);
console.log(`✅ No false rule name errors: ${!hasRuleNameErrors ? 'YES' : 'NO'}`);
console.log(`✅ Total diagnostics: ${diagnostics.length} (expected: 1)`);

if (hasUndefinedVarError && precisePositioning && !hasRuleNameErrors && diagnostics.length === 1) {
    console.log('\n🎉 ALL TESTS PASSED! Both fixes are working correctly.');
} else {
    console.log('\n⚠️  Some issues remain. Check the results above.');
}

console.log('='.repeat(70));