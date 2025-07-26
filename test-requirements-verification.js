const fs = require('fs');
const path = require('path');

/**
 * Test to verify that task 14 requirements are fully implemented
 */
function verifyTask14Requirements() {
    console.log('🔍 Verifying Task 14 Requirements Implementation...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    
    function checkRequirement(description, condition, details = '') {
        if (condition) {
            console.log(`✅ ${description}`);
            results.passed++;
            results.details.push({ status: 'PASS', description, details });
        } else {
            console.log(`❌ ${description}`);
            results.failed++;
            results.details.push({ status: 'FAIL', description, details });
        }
    }
    
    try {
        // Read package.json for configuration validation
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const config = packageJson.contributes?.configuration?.properties || {};
        
        console.log('📋 Requirement 1: Add user settings for enabling/disabling specific features\n');
        
        // Check feature toggle settings
        const featureToggles = [
            'drools.features.enableSyntaxHighlighting',
            'drools.features.enableCompletion',
            'drools.features.enableDiagnostics',
            'drools.features.enableFormatting',
            'drools.features.enableBracketMatching',
            'drools.features.enableSnippets',
            'drools.features.enableSymbolProvider'
        ];
        
        featureToggles.forEach(toggle => {
            checkRequirement(
                `Feature toggle: ${toggle}`,
                config[toggle] && config[toggle].type === 'boolean',
                `Type: ${config[toggle]?.type}, Default: ${config[toggle]?.default}`
            );
        });
        
        console.log('\n📋 Requirement 2: Create workspace-specific configuration options\n');
        
        // Check for resource-scoped settings
        const resourceScopedSettings = Object.entries(config).filter(([key, value]) => 
            value.scope === 'resource'
        );
        
        checkRequirement(
            'Resource-scoped configuration options exist',
            resourceScopedSettings.length > 0,
            `Found ${resourceScopedSettings.length} resource-scoped settings`
        );
        
        // Check specific workspace-configurable settings
        const workspaceSettings = [
            'drools.completion.enableKeywords',
            'drools.completion.enableFactTypes',
            'drools.diagnostics.enableSyntaxValidation',
            'drools.formatting.formatOnSave',
            'drools.snippets.customPath'
        ];
        
        workspaceSettings.forEach(setting => {
            checkRequirement(
                `Workspace setting: ${setting}`,
                config[setting] && config[setting].scope === 'resource',
                `Scope: ${config[setting]?.scope}`
            );
        });
        
        console.log('\n📋 Requirement 3: Implement settings for formatting preferences and style rules\n');
        
        // Check formatting settings
        const formattingSettings = [
            'drools.formatting.formatOnSave',
            'drools.formatting.formatOnType',
            'drools.formatting.indentSize',
            'drools.formatting.insertSpaces',
            'drools.formatting.trimTrailingWhitespace',
            'drools.formatting.insertFinalNewline',
            'drools.formatting.spaceAroundOperators',
            'drools.formatting.spaceAfterCommas',
            'drools.formatting.alignRuleBlocks',
            'drools.formatting.preserveBlankLines'
        ];
        
        formattingSettings.forEach(setting => {
            checkRequirement(
                `Formatting setting: ${setting}`,
                config[setting] !== undefined,
                `Type: ${config[setting]?.type}, Default: ${config[setting]?.default}`
            );
        });
        
        console.log('\n📋 Requirement 4: Add configuration for snippet behavior and custom templates\n');
        
        // Check snippet configuration
        const snippetSettings = [
            'drools.snippets.enableBuiltIn',
            'drools.snippets.enableCustom',
            'drools.snippets.customPath',
            'drools.snippets.triggerCharacters',
            'drools.snippets.showInCompletion',
            'drools.snippets.templates'
        ];
        
        snippetSettings.forEach(setting => {
            checkRequirement(
                `Snippet setting: ${setting}`,
                config[setting] !== undefined,
                `Type: ${config[setting]?.type}, Default: ${JSON.stringify(config[setting]?.default)}`
            );
        });
        
        // Check snippet templates configuration
        const templatesConfig = config['drools.snippets.templates'];
        if (templatesConfig && templatesConfig.properties) {
            const expectedTemplates = [
                'basicRule', 'conditionalRule', 'functionDefinition',
                'importStatement', 'packageDeclaration', 'globalDeclaration', 'queryDefinition'
            ];
            
            expectedTemplates.forEach(template => {
                checkRequirement(
                    `Snippet template: ${template}`,
                    templatesConfig.properties[template] !== undefined,
                    `Available in templates configuration`
                );
            });
        }
        
        console.log('\n📋 Additional Implementation Checks\n');
        
        // Check configuration manager implementation
        checkRequirement(
            'Configuration manager TypeScript file exists',
            fs.existsSync('src/configurationManager.ts'),
            'File: src/configurationManager.ts'
        );
        
        checkRequirement(
            'Configuration manager compiled output exists',
            fs.existsSync('out/configurationManager.js'),
            'File: out/configurationManager.js'
        );
        
        // Check extension integration
        const extensionContent = fs.readFileSync('src/extension.ts', 'utf8');
        checkRequirement(
            'Extension imports configuration manager',
            extensionContent.includes('ConfigurationManager'),
            'ConfigurationManager imported in extension.ts'
        );
        
        checkRequirement(
            'Extension uses configuration utilities',
            extensionContent.includes('isFormattingEnabled') || 
            extensionContent.includes('isCompletionEnabled') ||
            extensionContent.includes('isDiagnosticsEnabled'),
            'Configuration utility functions used'
        );
        
        // Check server integration
        const serverContent = fs.readFileSync('src/server/server.ts', 'utf8');
        checkRequirement(
            'Server uses comprehensive configuration structure',
            serverContent.includes('settings.features.') && 
            serverContent.includes('settings.completion.') &&
            serverContent.includes('settings.diagnostics.'),
            'Server uses new configuration structure'
        );
        
        console.log('\n📊 Requirements Verification Summary\n');
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
        
        if (results.failed === 0) {
            console.log('\n🎉 All Task 14 requirements have been successfully implemented!');
            console.log('\n📋 Implementation Summary:');
            console.log('• ✅ User settings for enabling/disabling specific features');
            console.log('• ✅ Workspace-specific configuration options');
            console.log('• ✅ Settings for formatting preferences and style rules');
            console.log('• ✅ Configuration for snippet behavior and custom templates');
            console.log('• ✅ Comprehensive configuration management system');
            console.log('• ✅ Integration with extension and language server');
            
            console.log('\n🔧 Configuration Features:');
            console.log(`• ${featureToggles.length} feature toggles`);
            console.log(`• ${formattingSettings.length} formatting options`);
            console.log(`• ${snippetSettings.length} snippet settings`);
            console.log(`• ${resourceScopedSettings.length} workspace-specific settings`);
            console.log(`• ${Object.keys(config).length} total configuration properties`);
            
            return true;
        } else {
            console.log('\n⚠️  Some requirements are not fully implemented.');
            console.log('\nFailed Requirements:');
            results.details
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  • ${r.description}`));
            
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Requirements verification failed!');
        console.error('Error:', error.message);
        return false;
    }
}

// Run verification
if (require.main === module) {
    const success = verifyTask14Requirements();
    process.exit(success ? 0 : 1);
}

module.exports = { verifyTask14Requirements };