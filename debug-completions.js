const { DroolsParser } = require('./out/server/parser/droolsParser');
const { DroolsCompletionProvider } = require('./out/server/providers/completionProvider');
const { TextDocument } = require('vscode-languageserver-textdocument');

const parser = new DroolsParser();
const completionProvider = new DroolsCompletionProvider({
    maxCompletionItems: 100,
    enableKeywordCompletion: true,
    enableFactTypeCompletion: true,
    enableVariableCompletion: true,
    enableFunctionCompletion: true
});

const completionTestContent = `rule "Completion Test"
when
    exists(
        Person(
            age > 18,
            name != null
        ) and
        Account(balance > 1000)
    ) and
    not(
        Blacklist(active == true)
    )
then
    System.out.println("completion test");
end`;

const document = TextDocument.create(
    'file:///completion-test.drl',
    'drools',
    1,
    completionTestContent
);

const parseResult = parser.parse(document.getText());

console.log('Document content:');
console.log(completionTestContent);
console.log('\nParse result:');
console.log('Rules:', parseResult.ast.rules.length);
console.log('Errors:', parseResult.errors.length);

// Debug fact type extraction
if (parseResult.ast.rules.length > 0) {
    const rule = parseResult.ast.rules[0];
    console.log('\nConditions in rule:');
    rule.when.conditions.forEach((condition, i) => {
        console.log(`Condition ${i}:`);
        console.log(`  Type: ${condition.type}`);
        console.log(`  Content: ${condition.content.substring(0, 50)}...`);
        
        // Test fact type extraction
        const factTypeMatch = condition.content.match(/(?:\$\w+\s*:\s*)?(\w+)\s*\(/);
        console.log(`  Fact type match: ${factTypeMatch ? factTypeMatch[1] : 'none'}`);
    });
}

// Test completion inside not pattern (line 10, character 8)
const position3 = { line: 10, character: 8 };
console.log(`\nTesting completion at position ${position3.line}:${position3.character}`);

const lines = completionTestContent.split('\n');
console.log(`Line ${position3.line}: "${lines[position3.line]}"`);
console.log(`Character ${position3.character}: "${lines[position3.line][position3.character] || 'EOF'}"`);

const completions3 = completionProvider.provideCompletions(document, position3, parseResult);
console.log('\nCompletions provided:');
if (completions3 && completions3.length > 0) {
    completions3.forEach((item, i) => {
        console.log(`${i + 1}. ${item.label} (${item.kind})`);
    });
    
    const items3 = completions3.map(item => item.label);
    console.log('\nLooking for:', ['Blacklist', 'Alert', 'Exception']);
    console.log('Found Blacklist:', items3.includes('Blacklist'));
    console.log('Found Alert:', items3.includes('Alert'));
    console.log('Found Exception:', items3.includes('Exception'));
    console.log('Any of them found:', items3.some(label => ['Blacklist', 'Alert', 'Exception'].includes(label)));
} else {
    console.log('No completions provided');
}