#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Test script to verify extension packaging and installation
 */
class ExtensionInstallationTester {
    constructor() {
        this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        this.extensionName = this.packageJson.name;
        this.extensionVersion = this.packageJson.version;
        this.vsixFile = `${this.extensionName}-${this.extensionVersion}.vsix`;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runCommand(command, description) {
        this.log(`Running: ${description}`);
        try {
            const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
            this.log(`Success: ${description}`, 'success');
            return output;
        } catch (error) {
            this.log(`Failed: ${description} - ${error.message}`, 'error');
            throw error;
        }
    }

    async testPackaging() {
        this.log('=== Testing Extension Packaging ===');
        
        // Clean previous builds
        try {
            await this.runCommand('npm run clean', 'Cleaning previous builds');
        } catch (error) {
            this.log('Clean command failed, continuing...', 'warning');
        }

        // Build the extension
        await this.runCommand('npm run build', 'Building extension');

        // Package the extension
        await this.runCommand('npm run package', 'Packaging extension');

        // Verify VSIX file exists
        if (!fs.existsSync(this.vsixFile)) {
            throw new Error(`VSIX file not found: ${this.vsixFile}`);
        }

        this.log(`VSIX file created successfully: ${this.vsixFile}`, 'success');

        // Check VSIX file size
        const stats = fs.statSync(this.vsixFile);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        this.log(`VSIX file size: ${fileSizeMB} MB`);

        if (stats.size > 50 * 1024 * 1024) { // 50MB
            this.log('Warning: VSIX file is quite large', 'warning');
        }
    }

    async testPackageContents() {
        this.log('=== Testing Package Contents ===');

        // Extract and examine VSIX contents
        const tempDir = 'temp-vsix-extract';
        
        try {
            // Create temp directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true });
            }
            fs.mkdirSync(tempDir);

            // Extract VSIX (it's a ZIP file)
            await this.runCommand(
                `unzip -q "${this.vsixFile}" -d "${tempDir}"`,
                'Extracting VSIX contents'
            );

            // Check required files
            const requiredFiles = [
                'extension.vsixmanifest',
                'extension/package.json',
                'extension/out/extension.js',
                'extension/syntaxes/drools.tmLanguage.json',
                'extension/snippets/drools.json'
            ];

            for (const file of requiredFiles) {
                const filePath = path.join(tempDir, file);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Required file missing in VSIX: ${file}`);
                }
                this.log(`Found required file: ${file}`, 'success');
            }

            // Check manifest
            const manifestPath = path.join(tempDir, 'extension.vsixmanifest');
            const manifest = fs.readFileSync(manifestPath, 'utf8');
            
            if (!manifest.includes(this.extensionName)) {
                throw new Error('Extension name not found in manifest');
            }
            
            if (!manifest.includes(this.extensionVersion)) {
                throw new Error('Extension version not found in manifest');
            }

            this.log('Package contents verified successfully', 'success');

        } finally {
            // Cleanup
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true });
            }
        }
    }

    async testMetadata() {
        this.log('=== Testing Extension Metadata ===');

        // Check package.json completeness
        const requiredFields = [
            'name', 'displayName', 'description', 'version', 'publisher',
            'engines', 'categories', 'keywords', 'activationEvents', 'main',
            'contributes', 'scripts', 'devDependencies', 'dependencies'
        ];

        for (const field of requiredFields) {
            if (!this.packageJson[field]) {
                throw new Error(`Required package.json field missing: ${field}`);
            }
            this.log(`Found required field: ${field}`, 'success');
        }

        // Check contributes section
        const contributes = this.packageJson.contributes;
        const requiredContributes = ['languages', 'grammars', 'snippets', 'commands', 'configuration'];
        
        for (const contrib of requiredContributes) {
            if (!contributes[contrib]) {
                throw new Error(`Required contributes section missing: ${contrib}`);
            }
            this.log(`Found contributes section: ${contrib}`, 'success');
        }

        // Check icon exists
        if (this.packageJson.icon) {
            if (!fs.existsSync(this.packageJson.icon)) {
                throw new Error(`Icon file not found: ${this.packageJson.icon}`);
            }
            this.log(`Icon file found: ${this.packageJson.icon}`, 'success');
        }

        this.log('Extension metadata verified successfully', 'success');
    }

    async testSyntaxFiles() {
        this.log('=== Testing Syntax Files ===');

        // Check TextMate grammar
        const grammarPath = 'syntaxes/drools.tmLanguage.json';
        if (!fs.existsSync(grammarPath)) {
            throw new Error(`Grammar file not found: ${grammarPath}`);
        }

        const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
        const requiredGrammarFields = ['name', 'scopeName', 'patterns', 'repository'];
        
        for (const field of requiredGrammarFields) {
            if (!grammar[field]) {
                throw new Error(`Required grammar field missing: ${field}`);
            }
        }

        this.log('TextMate grammar file verified', 'success');

        // Check language configuration
        const langConfigPath = 'language-configuration.json';
        if (!fs.existsSync(langConfigPath)) {
            throw new Error(`Language configuration not found: ${langConfigPath}`);
        }

        const langConfig = JSON.parse(fs.readFileSync(langConfigPath, 'utf8'));
        if (!langConfig.brackets || !langConfig.comments) {
            throw new Error('Language configuration missing required sections');
        }

        this.log('Language configuration verified', 'success');

        // Check snippets
        const snippetsPath = 'snippets/drools.json';
        if (!fs.existsSync(snippetsPath)) {
            throw new Error(`Snippets file not found: ${snippetsPath}`);
        }

        const snippets = JSON.parse(fs.readFileSync(snippetsPath, 'utf8'));
        if (Object.keys(snippets).length === 0) {
            this.log('Warning: No snippets defined', 'warning');
        } else {
            this.log(`Found ${Object.keys(snippets).length} snippets`, 'success');
        }
    }

    async testBuildOutput() {
        this.log('=== Testing Build Output ===');

        // Check compiled JavaScript files
        const requiredOutputFiles = [
            'out/extension.js',
            'out/server/server.js',
            'out/server/parser/droolsParser.js'
        ];

        for (const file of requiredOutputFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required output file missing: ${file}`);
            }
            
            const content = fs.readFileSync(file, 'utf8');
            if (content.length === 0) {
                throw new Error(`Output file is empty: ${file}`);
            }
            
            this.log(`Build output verified: ${file}`, 'success');
        }
    }

    async simulateInstallation() {
        this.log('=== Simulating Extension Installation ===');

        // This would normally require VS Code CLI, but we'll simulate the checks
        this.log('Simulating installation checks...');

        // Check if VSIX is valid ZIP
        try {
            await this.runCommand(`unzip -t "${this.vsixFile}" > /dev/null`, 'Validating VSIX as ZIP file');
        } catch (error) {
            throw new Error('VSIX file is not a valid ZIP archive');
        }

        // Check file permissions
        const stats = fs.statSync(this.vsixFile);
        if (!(stats.mode & 0o444)) {
            throw new Error('VSIX file is not readable');
        }

        this.log('Extension installation simulation completed', 'success');
    }

    async runAllTests() {
        this.log('🚀 Starting Extension Installation Tests');
        
        try {
            await this.testMetadata();
            await this.testSyntaxFiles();
            await this.testBuildOutput();
            await this.testPackaging();
            await this.testPackageContents();
            await this.simulateInstallation();
            
            this.log('🎉 All tests passed! Extension is ready for distribution', 'success');
            
            // Print summary
            this.log('=== Summary ===');
            this.log(`Extension: ${this.extensionName} v${this.extensionVersion}`);
            this.log(`VSIX File: ${this.vsixFile}`);
            this.log(`File Size: ${(fs.statSync(this.vsixFile).size / (1024 * 1024)).toFixed(2)} MB`);
            
        } catch (error) {
            this.log(`Test failed: ${error.message}`, 'error');
            process.exit(1);
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new ExtensionInstallationTester();
    tester.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = ExtensionInstallationTester;