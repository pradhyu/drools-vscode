const fs = require('fs');
const path = require('path');

// Test to validate snippet file structure and content
function validateSnippets() {
    console.log('🧪 Testing Drools snippet system...\n');
    
    try {
        // Test 1: Verify snippets file exists and is valid JSON
        console.log('✅ Test 1: Validating snippets file structure...');
        const snippetsPath = path.join(__dirname, 'snippets', 'drools.json');
        
        if (!fs.existsSync(snippetsPath)) {
            throw new Error('Snippets file does not exist');
        }
        
        const snippetsContent = fs.readFileSync(snippetsPath, 'utf8');
        const snippets = JSON.parse(snippetsContent);
        console.log(`   Found ${Object.keys(snippets).length} snippets`);
        
        // Test 2: Validate snippet structure
        console.log('✅ Test 2: Validating snippet structure...');
        for (const [name, snippet] of Object.entries(snippets)) {
            if (!snippet.prefix) {
                throw new Error(`Snippet "${name}" missing prefix`);
            }
            if (!Array.isArray(snippet.body)) {
                throw new Error(`Snippet "${name}" body is not an array`);
            }
            if (!snippet.description) {
                throw new Error(`Snippet "${name}" missing description`);
            }
        }
        console.log('   All snippets have valid structure');
        
        // Test 3: Check for required snippets based on requirements
        console.log('✅ Test 3: Checking required snippets...');
        const requiredSnippets = [
            'Basic Rule',
            'Conditional Rule', 
            'Function Definition',
            'Import Statement',
            'Package Declaration'
        ];
        
        for (const required of requiredSnippets) {
            if (!snippets[required]) {
                throw new Error(`Required snippet "${required}" not found`);
            }
        }
        console.log('   All required snippets are present');
        
        // Test 4: Validate tab stops and placeholders
        console.log('✅ Test 4: Validating tab stops and placeholders...');
        let tabStopCount = 0;
        let placeholderCount = 0;
        let choiceCount = 0;
        
        for (const [name, snippet] of Object.entries(snippets)) {
            const bodyText = snippet.body.join('\n');
            
            // Count tab stops
            const tabStops = bodyText.match(/\$\{\d+/g);
            if (tabStops) {
                tabStopCount += tabStops.length;
            }
            
            // Count placeholders
            const placeholders = bodyText.match(/\$\{\d+:[^}]+\}/g);
            if (placeholders) {
                placeholderCount += placeholders.length;
            }
            
            // Count choice options
            const choices = bodyText.match(/\$\{\d+\|[^}]+\|\}/g);
            if (choices) {
                choiceCount += choices.length;
            }
        }
        
        console.log(`   Found ${tabStopCount} tab stops, ${placeholderCount} placeholders, ${choiceCount} choice options`);
        
        // Test 5: Validate specific snippet content
        console.log('✅ Test 5: Validating specific snippet content...');
        
        // Check basic rule snippet
        const basicRule = snippets['Basic Rule'];
        const basicRuleText = basicRule.body.join('\n');
        if (!basicRuleText.includes('rule "') || !basicRuleText.includes('when') || 
            !basicRuleText.includes('then') || !basicRuleText.includes('end')) {
            throw new Error('Basic Rule snippet missing required elements');
        }
        
        // Check function definition snippet
        const functionDef = snippets['Function Definition'];
        const functionText = functionDef.body.join('\n');
        if (!functionText.includes('function ') || !functionText.includes('return')) {
            throw new Error('Function Definition snippet missing required elements');
        }
        
        // Check conditional rule snippet
        const conditionalRule = snippets['Conditional Rule'];
        const conditionalText = conditionalRule.body.join('\n');
        if (!conditionalText.includes('${4|==,!=,>,<,>=,<=|}')) {
            throw new Error('Conditional Rule snippet missing operator choices');
        }
        
        console.log('   Specific snippet content validation passed');
        
        // Test 6: Check package.json configuration
        console.log('✅ Test 6: Validating package.json configuration...');
        const packagePath = path.join(__dirname, 'package.json');
        const packageContent = fs.readFileSync(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        // Check snippets contribution
        const snippetsContrib = packageJson.contributes?.snippets;
        if (!snippetsContrib || !Array.isArray(snippetsContrib)) {
            throw new Error('Package.json missing snippets contribution');
        }
        
        const droolsSnippet = snippetsContrib.find(s => s.language === 'drools');
        if (!droolsSnippet || droolsSnippet.path !== './snippets/drools.json') {
            throw new Error('Package.json snippets configuration incorrect');
        }
        
        // Check snippet-related commands
        const commands = packageJson.contributes?.commands || [];
        const snippetCommands = [
            'drools.createCustomSnippet',
            'drools.manageSnippets',
            'drools.exportSnippets',
            'drools.importSnippets'
        ];
        
        for (const cmd of snippetCommands) {
            if (!commands.find(c => c.command === cmd)) {
                throw new Error(`Missing command: ${cmd}`);
            }
        }
        
        // Check snippet-related configuration
        const config = packageJson.contributes?.configuration?.properties;
        if (!config || !config['drools.enableSnippets'] || !config['drools.snippetTriggerCharacters']) {
            throw new Error('Missing snippet configuration properties');
        }
        
        console.log('   Package.json configuration is valid');
        
        // Test 7: Validate extension.ts implementation
        console.log('✅ Test 7: Validating extension implementation...');
        const extensionPath = path.join(__dirname, 'src', 'extension.ts');
        const extensionContent = fs.readFileSync(extensionPath, 'utf8');
        
        // Check for snippet management functions
        const requiredFunctions = [
            'createCustomSnippet',
            'manageSnippets',
            'exportSnippets',
            'importSnippets'
        ];
        
        for (const func of requiredFunctions) {
            if (!extensionContent.includes(func)) {
                throw new Error(`Missing function: ${func}`);
            }
        }
        
        // Check for snippet provider import
        if (!extensionContent.includes('DroolsSnippetProvider')) {
            throw new Error('Missing DroolsSnippetProvider import');
        }
        
        console.log('   Extension implementation is valid');
        
        // Test 8: Validate snippet provider implementation
        console.log('✅ Test 8: Validating snippet provider...');
        const snippetProviderPath = path.join(__dirname, 'src', 'snippetProvider.ts');
        
        if (!fs.existsSync(snippetProviderPath)) {
            throw new Error('Snippet provider file does not exist');
        }
        
        const providerContent = fs.readFileSync(snippetProviderPath, 'utf8');
        
        // Check for required methods and interfaces
        if (!providerContent.includes('DroolsSnippetProvider') ||
            !providerContent.includes('provideCompletionItems') ||
            !providerContent.includes('CompletionItemProvider')) {
            throw new Error('Snippet provider missing required implementation');
        }
        
        console.log('   Snippet provider implementation is valid');
        
        console.log('\n🎉 All snippet system tests passed!');
        console.log('\n📋 Summary:');
        console.log(`   • ${Object.keys(snippets).length} built-in snippets available`);
        console.log(`   • ${tabStopCount} tab stops for easy customization`);
        console.log(`   • ${placeholderCount} placeholders with default values`);
        console.log(`   • ${choiceCount} choice options for common patterns`);
        console.log('   • Custom snippet management UI implemented');
        console.log('   • Import/export functionality available');
        console.log('   • Integration with VSCode completion system');
        
        return true;
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        return false;
    }
}

// Run the validation
if (require.main === module) {
    const success = validateSnippets();
    process.exit(success ? 0 : 1);
}

module.exports = { validateSnippets };