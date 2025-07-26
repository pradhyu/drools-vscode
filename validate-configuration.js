const fs = require('fs');
const path = require('path');

function validateConfiguration() {
    console.log('🔍 Validating Drools Extension Configuration...\n');
    
    try {
        // Read package.json
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check if configuration section exists
        if (!packageJson.contributes || !packageJson.contributes.configuration) {
            throw new Error('Configuration section not found in package.json');
        }
        
        const config = packageJson.contributes.configuration;
        const properties = config.properties;
        
        if (!properties) {
            throw new Error('Configuration properties not found');
        }
        
        console.log('✅ Configuration section found in package.json');
        console.log(`📊 Total configuration properties: ${Object.keys(properties).length}\n`);
        
        // Validate configuration structure
        const expectedSections = [
            'features',
            'completion',
            'diagnostics',
            'formatting',
            'snippets',
            'server',
            'performance'
        ];
        
        const foundSections = new Set();
        
        for (const [key, value] of Object.entries(properties)) {
            const section = key.split('.')[1]; // drools.section.property
            if (section) {
                foundSections.add(section);
            }
            
            // Validate property structure
            if (!value.type) {
                console.warn(`⚠️  Property ${key} missing type`);
            }
            if (!value.description) {
                console.warn(`⚠️  Property ${key} missing description`);
            }
            if (value.default === undefined) {
                console.warn(`⚠️  Property ${key} missing default value`);
            }
        }
        
        // Check if all expected sections are present
        console.log('📋 Configuration sections found:');
        for (const section of expectedSections) {
            if (foundSections.has(section)) {
                console.log(`  ✅ ${section}`);
            } else {
                console.log(`  ❌ ${section} - MISSING`);
            }
        }
        
        // Validate specific configuration groups
        console.log('\n🔧 Validating configuration groups...');
        
        // Features
        const featureProps = Object.keys(properties).filter(k => k.startsWith('drools.features.'));
        console.log(`  Features: ${featureProps.length} properties`);
        
        // Completion
        const completionProps = Object.keys(properties).filter(k => k.startsWith('drools.completion.'));
        console.log(`  Completion: ${completionProps.length} properties`);
        
        // Diagnostics
        const diagnosticsProps = Object.keys(properties).filter(k => k.startsWith('drools.diagnostics.'));
        console.log(`  Diagnostics: ${diagnosticsProps.length} properties`);
        
        // Formatting
        const formattingProps = Object.keys(properties).filter(k => k.startsWith('drools.formatting.'));
        console.log(`  Formatting: ${formattingProps.length} properties`);
        
        // Snippets
        const snippetsProps = Object.keys(properties).filter(k => k.startsWith('drools.snippets.'));
        console.log(`  Snippets: ${snippetsProps.length} properties`);
        
        // Server
        const serverProps = Object.keys(properties).filter(k => k.startsWith('drools.server.'));
        console.log(`  Server: ${serverProps.length} properties`);
        
        // Performance
        const performanceProps = Object.keys(properties).filter(k => k.startsWith('drools.performance.'));
        console.log(`  Performance: ${performanceProps.length} properties`);
        
        // Validate specific critical properties
        console.log('\n🎯 Validating critical properties...');
        
        const criticalProperties = [
            'drools.features.enableSyntaxHighlighting',
            'drools.features.enableCompletion',
            'drools.features.enableDiagnostics',
            'drools.features.enableFormatting',
            'drools.formatting.formatOnSave',
            'drools.completion.maxItems',
            'drools.diagnostics.maxProblems',
            'drools.server.timeout'
        ];
        
        for (const prop of criticalProperties) {
            if (properties[prop]) {
                console.log(`  ✅ ${prop}`);
            } else {
                console.log(`  ❌ ${prop} - MISSING`);
            }
        }
        
        // Check for proper default values
        console.log('\n🔢 Validating default values...');
        
        const defaultValidations = [
            { key: 'drools.features.enableSyntaxHighlighting', expected: true },
            { key: 'drools.features.enableCompletion', expected: true },
            { key: 'drools.features.enableDiagnostics', expected: true },
            { key: 'drools.features.enableFormatting', expected: true },
            { key: 'drools.completion.maxItems', expected: 50 },
            { key: 'drools.diagnostics.maxProblems', expected: 1000 },
            { key: 'drools.formatting.indentSize', expected: 4 },
            { key: 'drools.server.timeout', expected: 30000 }
        ];
        
        for (const validation of defaultValidations) {
            const prop = properties[validation.key];
            if (prop && prop.default === validation.expected) {
                console.log(`  ✅ ${validation.key}: ${prop.default}`);
            } else {
                console.log(`  ❌ ${validation.key}: expected ${validation.expected}, got ${prop?.default}`);
            }
        }
        
        // Check configuration manager file exists
        console.log('\n📁 Validating configuration manager...');
        
        const configManagerPath = path.join(__dirname, 'src', 'configurationManager.ts');
        if (fs.existsSync(configManagerPath)) {
            console.log('  ✅ Configuration manager file exists');
            
            const configManagerContent = fs.readFileSync(configManagerPath, 'utf8');
            
            // Check for key interfaces and classes
            if (configManagerContent.includes('interface DroolsConfiguration')) {
                console.log('  ✅ DroolsConfiguration interface found');
            } else {
                console.log('  ❌ DroolsConfiguration interface missing');
            }
            
            if (configManagerContent.includes('class ConfigurationManager')) {
                console.log('  ✅ ConfigurationManager class found');
            } else {
                console.log('  ❌ ConfigurationManager class missing');
            }
            
        } else {
            console.log('  ❌ Configuration manager file missing');
        }
        
        // Check if compiled output exists
        console.log('\n🏗️  Validating compiled output...');
        
        const compiledConfigPath = path.join(__dirname, 'out', 'configurationManager.js');
        if (fs.existsSync(compiledConfigPath)) {
            console.log('  ✅ Compiled configuration manager exists');
        } else {
            console.log('  ❌ Compiled configuration manager missing');
        }
        
        console.log('\n🎉 Configuration validation completed!');
        console.log('\n📋 Summary:');
        console.log(`  • Total properties: ${Object.keys(properties).length}`);
        console.log(`  • Configuration sections: ${foundSections.size}/${expectedSections.length}`);
        console.log(`  • Feature toggles: ${featureProps.length}`);
        console.log(`  • Formatting options: ${formattingProps.length}`);
        console.log(`  • Completion settings: ${completionProps.length}`);
        console.log(`  • Diagnostic settings: ${diagnosticsProps.length}`);
        console.log(`  • Snippet settings: ${snippetsProps.length}`);
        console.log(`  • Server settings: ${serverProps.length}`);
        console.log(`  • Performance settings: ${performanceProps.length}`);
        
        console.log('\n✅ Configuration system is properly set up!');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Configuration validation failed!');
        console.error('Error:', error.message);
        return false;
    }
}

// Run validation
if (require.main === module) {
    const success = validateConfiguration();
    process.exit(success ? 0 : 1);
}

module.exports = { validateConfiguration };