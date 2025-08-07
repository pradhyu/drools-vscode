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

const variableTestContent = `rule "Variable Test"
when
    $person : Person(age > 18, $name : name) and
    exists(
        $account : Account(
            owner == $person,
            balance > 1000
        ) and
        Transaction(
            account == $account,
            amount > 100
        )
    ) and
    Customer(
        name == $name,
        active == true
    )
then
    System.out.println("Variable: " + $name);
end`;

const document = TextDocument.create(
    'file:///variable-test.drl',
    'drools',
    1,
    variableTestContent
);

const parseResult = parser.parse(document.getText());

console.log('Document content:');
console.log(variableTestContent);
console.log('\nParse result:');
console.log('Rules:', parseResult.ast.rules.length);
console.log('Errors:', parseResult.errors.length);

// Debug variable extraction
if (parseResult.ast.rules.length > 0) {
    const rule = parseResult.ast.rules[0];
    console.log('\nVariables found in conditions:');
    rule.when.conditions.forEach((condition, i) => {
        console.log(`Condition ${i}:`);
        console.log(`  Type: ${condition.type}`);
        console.log(`  Variable: ${condition.variable || 'none'}`);
        console.log(`  Content: ${condition.content.substring(0, 50)}...`);
    });
}

// Test $account variable completion at position line 9, character 23
const accountVarPosition = { line: 9, character: 23 };
console.log(`\nTesting variable completion at position ${accountVarPosition.line}:${accountVarPosition.character}`);

const lines = variableTestContent.split('\n');
console.log(`Line ${accountVarPosition.line}: "${lines[accountVarPosition.line]}"`);
console.log(`Character ${accountVarPosition.character}: "${lines[accountVarPosition.line][accountVarPosition.character] || 'EOF'}"`);

const accountVarCompletions = completionProvider.provideCompletions(document, accountVarPosition, parseResult);
console.log('\nVariable completions provided:');
if (accountVarCompletions && accountVarCompletions.length > 0) {
    const variableCompletions = accountVarCompletions.filter(item => item.label.startsWith('$'));
    console.log('Variable completions:');
    variableCompletions.forEach((item, i) => {
        console.log(`${i + 1}. ${item.label} (${item.kind})`);
    });
    
    const accountVarItems = accountVarCompletions.map(item => item.label);
    console.log('\nLooking for: $account');
    console.log('Found $account:', accountVarItems.includes('$account'));
    console.log('All variables found:', accountVarItems.filter(item => item.startsWith('$')));
} else {
    console.log('No completions provided');
}