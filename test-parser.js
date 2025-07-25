const fs = require('fs');
const path = require('path');

// Import the compiled parser
const { DroolsParser } = require('./out/server/parser/droolsParser');

// Test the parser with our test files
const parser = new DroolsParser();

function testFile(filename) {
    console.log(`\n=== Testing ${filename} ===`);
    
    try {
        const content = fs.readFileSync(filename, 'utf8');
        const result = parser.parse(content);
        
        console.log('AST Structure:');
        console.log(`- Package: ${result.ast.packageDeclaration?.name || 'none'}`);
        console.log(`- Imports: ${result.ast.imports.length}`);
        console.log(`- Globals: ${result.ast.globals.length}`);
        console.log(`- Functions: ${result.ast.functions.length}`);
        console.log(`- Rules: ${result.ast.rules.length}`);
        console.log(`- Queries: ${result.ast.queries.length}`);
        console.log(`- Declares: ${result.ast.declares.length}`);
        
        if (result.ast.rules.length > 0) {
            console.log('\nRules found:');
            result.ast.rules.forEach((rule, i) => {
                console.log(`  ${i + 1}. "${rule.name}"`);
                console.log(`     - Attributes: ${rule.attributes.length}`);
                console.log(`     - Has when: ${rule.when ? 'yes' : 'no'}`);
                console.log(`     - Has then: ${rule.then ? 'yes' : 'no'}`);
            });
        }
        
        if (result.ast.functions.length > 0) {
            console.log('\nFunctions found:');
            result.ast.functions.forEach((func, i) => {
                console.log(`  ${i + 1}. ${func.returnType} ${func.name}(${func.parameters.length} params)`);
            });
        }
        
        if (result.errors.length > 0) {
            console.log('\nErrors found:');
            result.errors.forEach((error, i) => {
                console.log(`  ${i + 1}. [${error.severity}] ${error.message} at line ${error.range.start.line + 1}`);
            });
        } else {
            console.log('\nNo parsing errors found!');
        }
        
    } catch (error) {
        console.error(`Error testing ${filename}:`, error.message);
    }
}

// Test all our sample files
const testFiles = ['test.drl', 'test-comprehensive.drl', 'test-edge-cases.drl', 'test-malformed.drl'];

testFiles.forEach(testFile);