const vscode = require('vscode');
const assert = require('assert');

async function testConfigurationSystem() {
    console.log('Testing Drools Extension Configuration System...');
    
    try {
        // Test 1: Verify configuration structure exists
        console.log('\n1. Testing configuration structure...');
        const config = vscode.workspace.getConfiguration('drools');
        
        // Test feature flags
        const features = [
            'features.enableSyntaxHighlighting',
            'features.enableCompletion',
            'features.enableDiagnostics',
            'features.enableFormatting',
            'features.enableBracketMatching',
            'features.enableSnippets',
            'features.enableSymbolProvider'
        ];
        
        for (const feature of features) {
            const value = config.get(feature);
            console.log(`  ${feature}: ${value} (${typeof value})`);
            assert(typeof value === 'boolean', `${feature} should be boolean`);
        }
        
        // Test completion settings
        console.log('\n2. Testing completion configuration...');
        const completionSettings = [
            'completion.enableKeywords',
            'completion.enableFactTypes',
            'completion.enableFunctions',
            'completion.enableVariables',
            'completion.maxItems',
            'completion.triggerCharacters'
        ];
        
        for (const setting of completionSettings) {
            const value = config.get(setting);
            console.log(`  ${setting}: ${JSON.stringify(value)} (${typeof value})`);
            
            if (setting === 'completion.maxItems') {
                assert(typeof value === 'number', `${setting} should be number`);
                assert(value > 0, `${setting} should be positive`);
            } else if (setting === 'completion.triggerCharacters') {
                assert(Array.isArray(value), `${setting} should be array`);
            } else {
                assert(typeof value === 'boolean', `${setting} should be boolean`);
            }
        }
        
        // Test diagnostics settings
        console.log('\n3. Testing diagnostics configuration...');
        const diagnosticsSettings = [
            'diagnostics.enableSyntaxValidation',
            'diagnostics.enableSemanticValidation',
            'diagnostics.enableBestPracticeWarnings',
            'diagnostics.maxProblems',
            'diagnostics.severity'
        ];
        
        for (const setting of diagnosticsSettings) {
            const value = config.get(setting);
            console.log(`  ${setting}: ${JSON.stringify(value)} (${typeof value})`);
            
            if (setting === 'diagnostics.maxProblems') {
                assert(typeof value === 'number', `${setting} should be number`);
                assert(value > 0, `${setting} should be positive`);
            } else if (setting === 'diagnostics.severity') {
                assert(typeof value === 'object', `${setting} should be object`);
                assert(value.syntaxErrors, `${setting} should have syntaxErrors`);
                assert(value.semanticErrors, `${setting} should have semanticErrors`);
                assert(value.bestPracticeViolations, `${setting} should have bestPracticeViolations`);
            } else {
                assert(typeof value === 'boolean', `${setting} should be boolean`);
            }
        }
        
        // Test formatting settings
        console.log('\n4. Testing formatting configuration...');
        const formattingSettings = [
            'formatting.formatOnSave',
            'formatting.formatOnType',
            'formatting.indentSize',
            'formatting.insertSpaces',
            'formatting.trimTrailingWhitespace',
            'formatting.insertFinalNewline',
            'formatting.spaceAroundOperators',
            'formatting.spaceAfterCommas',
            'formatting.alignRuleBlocks',
            'formatting.preserveBlankLines'
        ];
        
        for (const setting of formattingSettings) {
            const value = config.get(setting);
            console.log(`  ${setting}: ${value} (${typeof value})`);
            
            if (setting === 'formatting.indentSize' || setting === 'formatting.preserveBlankLines') {
                assert(typeof value === 'number', `${setting} should be number`);
                assert(value >= 0, `${setting} should be non-negative`);
            } else {
                assert(typeof value === 'boolean', `${setting} should be boolean`);
            }
        }
        
        // Test snippets settings
        console.log('\n5. Testing snippets configuration...');
        const snippetsSettings = [
            'snippets.enableBuiltIn',
            'snippets.enableCustom',
            'snippets.customPath',
            'snippets.triggerCharacters',
            'snippets.showInCompletion',
            'snippets.templates'
        ];
        
        for (const setting of snippetsSettings) {
            const value = config.get(setting);
            console.log(`  ${setting}: ${JSON.stringify(value)} (${typeof value})`);
            
            if (setting === 'snippets.customPath') {
                assert(typeof value === 'string', `${setting} should be string`);
            } else if (setting === 'snippets.triggerCharacters') {
                assert(Array.isArray(value), `${setting} should be array`);
            } else if (setting === 'snippets.templates') {
                assert(typeof value === 'object', `${setting} should be object`);
                const expectedTemplates = [
                    'basicRule', 'conditionalRule', 'functionDefinition',
                    'importStatement', 'packageDeclaration', 'globalDeclaration', 'queryDefinition'
                ];
                for (const template of expectedTemplates) {
                    assert(typeof value[template] === 'boolean', `${setting}.${template} should be boolean`);
                }
            } else {
                assert(typeof value === 'boolean', `${setting} should be boolean`);
            }
        }
        
        // Test server settings
        console.log('\n6. Testing server configuration...');
        const serverSettings = [
            'server.maxFileSize',
            'server.timeout',
            'server.logLevel'
        ];
        
        for (const setting of serverSettings) {
            const value = config.get(setting);
            console.log(`  ${setting}: ${value} (${typeof value})`);
            
            if (setting === 'server.maxFileSize' || setting === 'server.timeout') {
                assert(typeof value === 'number', `${setting} should be number`);
                assert(value > 0, `${setting} should be positive`);
            } else if (setting === 'server.logLevel') {
                assert(typeof value === 'string', `${setting} should be string`);
                const validLevels = ['off', 'error', 'warn', 'info', 'debug', 'trace'];
                assert(validLevels.includes(value), `${setting} should be valid log level`);
            }
        }
        
        // Test performance settings
        console.log('\n7. Testing performance configuration...');
        const performanceSettings = [
            'performance.enableIncrementalParsing',
            'performance.enableCaching',
            'performance.debounceDelay'
        ];
        
        for (const setting of performanceSettings) {
            const value = config.get(setting);
            console.log(`  ${setting}: ${value} (${typeof value})`);
            
            if (setting === 'performance.debounceDelay') {
                assert(typeof value === 'number', `${setting} should be number`);
                assert(value >= 0, `${setting} should be non-negative`);
            } else {
                assert(typeof value === 'boolean', `${setting} should be boolean`);
            }
        }
        
        console.log('\n✅ All configuration tests passed!');
        
        // Test 2: Test configuration manager if available
        console.log('\n8. Testing configuration manager integration...');
        
        // Check if extension is active
        const extension = vscode.extensions.getExtension('drools-community.drools-vscode-extension');
        if (extension && extension.isActive) {
            console.log('  Extension is active, configuration manager should be available');
        } else {
            console.log('  Extension not active, skipping configuration manager tests');
        }
        
        console.log('\n🎉 Configuration system test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Configuration test failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Test configuration scopes
async function testConfigurationScopes() {
    console.log('\n9. Testing configuration scopes...');
    
    try {
        // Test workspace vs user settings
        const workspaceConfig = vscode.workspace.getConfiguration('drools');
        
        // Test that we can get configuration for specific resources
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const resourceConfig = vscode.workspace.getConfiguration('drools', workspaceFolders[0].uri);
            console.log('  Resource-specific configuration retrieved successfully');
        }
        
        // Test configuration inspection
        const formatOnSaveInspect = workspaceConfig.inspect('formatting.formatOnSave');
        if (formatOnSaveInspect) {
            console.log('  Configuration inspection:');
            console.log(`    Default: ${formatOnSaveInspect.defaultValue}`);
            console.log(`    Global: ${formatOnSaveInspect.globalValue}`);
            console.log(`    Workspace: ${formatOnSaveInspect.workspaceValue}`);
            console.log(`    WorkspaceFolder: ${formatOnSaveInspect.workspaceFolderValue}`);
        }
        
        console.log('  ✅ Configuration scopes test passed!');
        
    } catch (error) {
        console.error('  ❌ Configuration scopes test failed:', error.message);
        throw error;
    }
}

// Test default values
async function testDefaultValues() {
    console.log('\n10. Testing default values...');
    
    try {
        const config = vscode.workspace.getConfiguration('drools');
        
        // Test that all settings have reasonable defaults
        const defaultTests = [
            { key: 'features.enableSyntaxHighlighting', expected: true },
            { key: 'features.enableCompletion', expected: true },
            { key: 'features.enableDiagnostics', expected: true },
            { key: 'features.enableFormatting', expected: true },
            { key: 'completion.maxItems', expected: 50 },
            { key: 'diagnostics.maxProblems', expected: 1000 },
            { key: 'formatting.indentSize', expected: 4 },
            { key: 'formatting.insertSpaces', expected: true },
            { key: 'server.timeout', expected: 30000 },
            { key: 'performance.debounceDelay', expected: 300 }
        ];
        
        for (const test of defaultTests) {
            const value = config.get(test.key);
            console.log(`  ${test.key}: ${value} (expected: ${test.expected})`);
            assert.strictEqual(value, test.expected, `${test.key} should have correct default value`);
        }
        
        console.log('  ✅ Default values test passed!');
        
    } catch (error) {
        console.error('  ❌ Default values test failed:', error.message);
        throw error;
    }
}

// Run all tests
async function runAllTests() {
    try {
        await testConfigurationSystem();
        await testConfigurationScopes();
        await testDefaultValues();
        
        console.log('\n🎉 All configuration tests completed successfully!');
        console.log('\nConfiguration system is working correctly with:');
        console.log('- ✅ Comprehensive feature toggles');
        console.log('- ✅ Detailed completion settings');
        console.log('- ✅ Flexible diagnostics configuration');
        console.log('- ✅ Extensive formatting options');
        console.log('- ✅ Customizable snippet behavior');
        console.log('- ✅ Server and performance tuning');
        console.log('- ✅ Proper configuration scopes');
        console.log('- ✅ Sensible default values');
        
    } catch (error) {
        console.error('\n💥 Configuration test suite failed!');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Export for use in other test files
module.exports = {
    testConfigurationSystem,
    testConfigurationScopes,
    testDefaultValues,
    runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}