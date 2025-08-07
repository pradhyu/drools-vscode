const { DroolsParser } = require('./out/server/parser/droolsParser');

const content = `function int calculateAge(Date birthDate) {
    return 25;
}

rule "Test Rule"
when
    $p : Person()
then
    int age = `;

const parser = new DroolsParser();
const result = parser.parse(content);

console.log('Parse result:', JSON.stringify(result, null, 2));
console.log('Functions found:', result.ast.functions?.length || 0);
if (result.ast.functions) {
    result.ast.functions.forEach(func => {
        console.log('Function:', func.name, func.returnType);
    });
}