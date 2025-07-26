const vscode = require('vscode');
const assert = require('assert');
const path = require('path');

// Test suite for snippet management functionality
suite('Drools Snippet Management Tests', () => {
    let extension;
    let context;

    suiteSetup(async () => {
        // Activate the extension
        extension = vscode.extensions.getExtension('drools-community.drools-vscode-extension');
        if (extension) {
            await extension.activate();
            context = extension.exports;
        }
    });

    test('Built-in snippets should be available', async () => {
        // Create a test .drl file
        const testUri = vscode.Uri.file(path.join(__dirname, 'test-snippets.drl'));
        const document = await vscode.workspace.openTextDocument(testUri);
        const editor = await vscode.window.showTextDocument(document);

        // Set language to drools
        await vscode.languages.setTextDocumentLanguage(document, 'drools');

        // Test that basic rule snippet is available
        const position = new vscode.Position(0, 0);
        const completions = await vscode.commands.executeCommand(
            'vscode.executeCompletionItemProvider',
            testUri,
            position
        );

        assert(completions, 'Completions should be available');
        
        // Look for built-in snippets
        const snippetItems = completions.items.filter(item => 
            item.kind === vscode.CompletionItemKind.Snippet
        );
        
        assert(snippetItems.length > 0, 'Should have snippet completion items');
        
        // Check for specific built-in snippets
        const ruleSnippet = snippetItems.find(item => 
            item.insertText && item.insertText.value && item.insertText.value.includes('rule "')
        );
        
        assert(ruleSnippet, 'Should have basic rule snippet');
    });

    test('Custom snippet creation command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert(commands.includes('drools.createCustomSnippet'), 'Create custom snippet command should be registered');
        assert(commands.includes('drools.manageSnippets'), 'Manage snippets command should be registered');
        assert(commands.includes('drools.exportSnippets'), 'Export snippets command should be registered');
        assert(commands.includes('drools.importSnippets'), 'Import snippets command should be registered');
    });

    test('Snippet configuration should be available', () => {
        const config = vscode.workspace.getConfiguration('drools');
        
        // Test default configuration values
        assert.strictEqual(config.get('enableSnippets'), true, 'Snippets should be enabled by default');
        assert(config.get('snippetTriggerCharacters'), 'Snippet trigger characters should be configured');
        
        const triggerChars = config.get('snippetTriggerCharacters');
        assert(Array.isArray(triggerChars), 'Trigger characters should be an array');
        assert(triggerChars.includes('r'), 'Should include "r" as trigger character for rules');
        assert(triggerChars.includes('f'), 'Should include "f" as trigger character for functions');
    });

    test('Built-in snippet structure should be valid', async () => {
        // Read the built-in snippets file
        const snippetsPath = path.join(__dirname, 'snippets', 'drools.json');
        const fs = require('fs');
        
        try {
            const snippetsContent = fs.readFileSync(snippetsPath, 'utf8');
            const snippets = JSON.parse(snippetsContent);
            
            // Verify snippet structure
            for (const [name, snippet] of Object.entries(snippets)) {
                assert(snippet.prefix, `Snippet "${name}" should have a prefix`);
                assert(Array.isArray(snippet.body), `Snippet "${name}" should have a body array`);
                assert(snippet.description, `Snippet "${name}" should have a description`);
                
                // Verify tab stops in snippet body
                const bodyText = snippet.body.join('\n');
                if (bodyText.includes('${')) {
                    // Should have proper tab stop format
                    const tabStopRegex = /\$\{\d+(?::[^}]*)?\}/g;
                    const matches = bodyText.match(tabStopRegex);
                    assert(matches && matches.length > 0, `Snippet "${name}" should have valid tab stops`);
                }
            }
            
            // Check for required snippets based on requirements
            assert(snippets['Basic Rule'], 'Should have basic rule snippet');
            assert(snippets['Conditional Rule'], 'Should have conditional rule snippet');
            assert(snippets['Function Definition'], 'Should have function definition snippet');
            assert(snippets['Import Statement'], 'Should have import statement snippet');
            assert(snippets['Package Declaration'], 'Should have package declaration snippet');
            
        } catch (error) {
            assert.fail(`Failed to read or parse snippets file: ${error.message}`);
        }
    });

    test('Snippet tab stops should be properly formatted', async () => {
        const snippetsPath = path.join(__dirname, 'snippets', 'drools.json');
        const fs = require('fs');
        
        const snippetsContent = fs.readFileSync(snippetsPath, 'utf8');
        const snippets = JSON.parse(snippetsContent);
        
        // Test specific snippets for proper tab stop usage
        const basicRule = snippets['Basic Rule'];
        const bodyText = basicRule.body.join('\n');
        
        // Should have numbered tab stops
        assert(bodyText.includes('${1:'), 'Should have first tab stop with placeholder');
        assert(bodyText.includes('${2:'), 'Should have second tab stop');
        assert(bodyText.includes('${3:'), 'Should have third tab stop');
        
        // Test conditional rule for choice options
        const conditionalRule = snippets['Conditional Rule'];
        const conditionalText = conditionalRule.body.join('\n');
        
        // Should have choice options for operators
        assert(conditionalText.includes('${4|==,!=,>,<,>=,<=|}'), 'Should have choice options for operators');
    });

    test('Snippet descriptions should be meaningful', async () => {
        const snippetsPath = path.join(__dirname, 'snippets', 'drools.json');
        const fs = require('fs');
        
        const snippetsContent = fs.readFileSync(snippetsPath, 'utf8');
        const snippets = JSON.parse(snippetsContent);
        
        for (const [name, snippet] of Object.entries(snippets)) {
            assert(snippet.description.length > 10, `Snippet "${name}" should have a meaningful description`);
            assert(!snippet.description.toLowerCase().includes('todo'), `Snippet "${name}" description should not contain TODO`);
        }
    });

    suiteTeardown(async () => {
        // Clean up test files
        try {
            const testUri = vscode.Uri.file(path.join(__dirname, 'test-snippets.drl'));
            await vscode.workspace.fs.delete(testUri);
        } catch (error) {
            // Ignore cleanup errors
        }
    });
});

// Additional integration tests for snippet functionality
suite('Drools Snippet Integration Tests', () => {
    test('Snippets should work in .drl files', async () => {
        // Create a temporary .drl file
        const testContent = '';
        const testUri = vscode.Uri.file(path.join(__dirname, 'test-integration.drl'));
        
        await vscode.workspace.fs.writeFile(testUri, Buffer.from(testContent));
        const document = await vscode.workspace.openTextDocument(testUri);
        const editor = await vscode.window.showTextDocument(document);
        
        // Ensure language is set to drools
        await vscode.languages.setTextDocumentLanguage(document, 'drools');
        
        // Test snippet insertion
        const position = new vscode.Position(0, 0);
        const snippet = new vscode.SnippetString('rule "${1:TestRule}"\nwhen\n\t${2:condition}\nthen\n\t${3:action}\nend');
        
        await editor.insertSnippet(snippet, position);
        
        const insertedText = document.getText();
        assert(insertedText.includes('rule "'), 'Should insert rule snippet');
        assert(insertedText.includes('when'), 'Should include when clause');
        assert(insertedText.includes('then'), 'Should include then clause');
        assert(insertedText.includes('end'), 'Should include end keyword');
        
        // Clean up
        await vscode.workspace.fs.delete(testUri);
    });

    test('Snippet trigger characters should work', async () => {
        const config = vscode.workspace.getConfiguration('drools');
        const triggerChars = config.get('snippetTriggerCharacters');
        
        // Create a test document
        const testUri = vscode.Uri.file(path.join(__dirname, 'test-triggers.drl'));
        await vscode.workspace.fs.writeFile(testUri, Buffer.from(''));
        const document = await vscode.workspace.openTextDocument(testUri);
        await vscode.window.showTextDocument(document);
        await vscode.languages.setTextDocumentLanguage(document, 'drools');
        
        // Test each trigger character
        for (const char of triggerChars) {
            const position = new vscode.Position(0, 0);
            const completions = await vscode.commands.executeCommand(
                'vscode.executeCompletionItemProvider',
                testUri,
                position,
                char
            );
            
            // Should get some completions when typing trigger characters
            assert(completions, `Should get completions for trigger character "${char}"`);
        }
        
        // Clean up
        await vscode.workspace.fs.delete(testUri);
    });
});