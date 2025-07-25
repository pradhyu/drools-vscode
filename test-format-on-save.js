/**
 * Test format-on-save functionality for Drools VSCode Extension
 * This test verifies that format-on-save works correctly with various rule structures
 */

const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

describe('Format-on-Save Tests', function() {
    this.timeout(30000);

    let testWorkspaceFolder;
    let testDocument;

    before(async function() {
        // Get the test workspace folder
        testWorkspaceFolder = vscode.workspace.workspaceFolders[0];
        
        // Ensure the extension is activated
        const extension = vscode.extensions.getExtension('drools-community.drools-vscode-extension');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    afterEach(async function() {
        // Close any open editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        
        // Clean up test files
        if (testDocument) {
            try {
                const filePath = testDocument.uri.fsPath;
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                console.warn('Failed to clean up test file:', error);
            }
        }
    });

    async function createTestFile(filename, content) {
        const filePath = path.join(testWorkspaceFolder.uri.fsPath, filename);
        fs.writeFileSync(filePath, content);
        
        const uri = vscode.Uri.file(filePath);
        testDocument = await vscode.workspace.openTextDocument(uri);
        
        // Set language to drools
        await vscode.languages.setTextDocumentLanguage(testDocument, 'drools');
        
        return testDocument;
    }

    async function saveDocumentAndGetContent(document) {
        const editor = await vscode.window.showTextDocument(document);
        await document.save();
        
        // Wait a bit for format-on-save to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return document.getText();
    }

    describe('Basic Rule Formatting', function() {
        it('should format a simple rule with proper indentation', async function() {
            const unformattedContent = `package com.example.rules

rule "Simple Rule"
when
$person:Person(age>18)
then
System.out.println("Adult person found");
end`;

            const document = await createTestFile('simple-rule.drl', unformattedContent);
            const formattedContent = await saveDocumentAndGetContent(document);

            // Verify proper indentation and spacing
            assert(formattedContent.includes('rule "Simple Rule"'));
            assert(formattedContent.includes('when'));
            assert(formattedContent.includes('    $person : Person(age > 18)'));
            assert(formattedContent.includes('then'));
            assert(formattedContent.includes('    System.out.println("Adult person found");'));
            assert(formattedContent.includes('end'));
        });

        it('should format complex rule with multiple conditions', async function() {
            const unformattedContent = `package com.example.rules

rule "Complex Rule"
salience 100
when
$person:Person(age>=18,name!=null)
$account:Account(owner==$person,balance>1000)
not(Debt(person==$person))
then
$account.setStatus("PREMIUM");
update($account);
System.out.println("Premium status granted");
end`;

            const document = await createTestFile('complex-rule.drl', unformattedContent);
            const formattedContent = await saveDocumentAndGetContent(document);

            // Verify proper formatting of complex conditions
            assert(formattedContent.includes('rule "Complex Rule"'));
            assert(formattedContent.includes('salience 100'));
            assert(formattedContent.includes('    $person : Person(age >= 18, name != null)'));
            assert(formattedContent.includes('    $account : Account(owner == $person, balance > 1000)'));
            assert(formattedContent.includes('    not(Debt(person == $person))'));
            assert(formattedContent.includes('    $account.setStatus("PREMIUM");'));
            assert(formattedContent.includes('    update($account);'));
        });
    });

    describe('Function Formatting', function() {
        it('should format function definitions correctly', async function() {
            const unformattedContent = `package com.example.rules

function boolean isAdult(int age){
if(age>=18){
return true;
}else{
return false;
}
}

rule "Use Function"
when
$person:Person(isAdult(age)==true)
then
System.out.println("Adult found");
end`;

            const document = await createTestFile('function-rule.drl', unformattedContent);
            const formattedContent = await saveDocumentAndGetContent(document);

            // Verify function formatting
            assert(formattedContent.includes('function boolean isAdult(int age) {'));
            assert(formattedContent.includes('    if(age >= 18) {'));
            assert(formattedContent.includes('        return true;'));
            assert(formattedContent.includes('    } else {'));
            assert(formattedContent.includes('        return false;'));
            assert(formattedContent.includes('    }'));
            assert(formattedContent.includes('}'));
            
            // Verify rule formatting
            assert(formattedContent.includes('    $person : Person(isAdult(age) == true)'));
        });
    });

    describe('Import and Package Formatting', function() {
        it('should format imports and package declarations', async function() {
            const unformattedContent = `package   com.example.rules

import java.util.List
import   java.util.Map
import com.example.Person

rule "Import Test"
when
$list:List()
then
System.out.println("List found");
end`;

            const document = await createTestFile('import-rule.drl', unformattedContent);
            const formattedContent = await saveDocumentAndGetContent(document);

            // Verify package and import formatting
            assert(formattedContent.includes('package com.example.rules'));
            assert(formattedContent.includes('import java.util.List'));
            assert(formattedContent.includes('import java.util.Map'));
            assert(formattedContent.includes('import com.example.Person'));
        });
    });

    describe('Configuration Tests', function() {
        it('should respect format-on-save configuration setting', async function() {
            // Disable format-on-save
            const config = vscode.workspace.getConfiguration('drools');
            await config.update('formatOnSave', false, vscode.ConfigurationTarget.Workspace);

            const unformattedContent = `rule "No Format"
when
$person:Person(age>18)
then
System.out.println("Should not be formatted");
end`;

            const document = await createTestFile('no-format.drl', unformattedContent);
            const contentAfterSave = await saveDocumentAndGetContent(document);

            // Content should remain unformatted
            assert(contentAfterSave.includes('$person:Person(age>18)'));
            assert(!contentAfterSave.includes('$person : Person(age > 18)'));

            // Re-enable format-on-save for other tests
            await config.update('formatOnSave', true, vscode.ConfigurationTarget.Workspace);
        });

        it('should format when format-on-save is enabled', async function() {
            // Ensure format-on-save is enabled
            const config = vscode.workspace.getConfiguration('drools');
            await config.update('formatOnSave', true, vscode.ConfigurationTarget.Workspace);

            const unformattedContent = `rule "Should Format"
when
$person:Person(age>18)
then
System.out.println("Should be formatted");
end`;

            const document = await createTestFile('should-format.drl', unformattedContent);
            const contentAfterSave = await saveDocumentAndGetContent(document);

            // Content should be formatted
            assert(contentAfterSave.includes('$person : Person(age > 18)'));
            assert(!contentAfterSave.includes('$person:Person(age>18)'));
        });
    });

    describe('Edge Cases', function() {
        it('should handle empty files gracefully', async function() {
            const document = await createTestFile('empty.drl', '');
            const contentAfterSave = await saveDocumentAndGetContent(document);
            
            // Should not crash and should remain empty or have minimal content
            assert(typeof contentAfterSave === 'string');
        });

        it('should handle files with only comments', async function() {
            const unformattedContent = `// This is a comment
/* Multi-line
   comment */
// Another comment`;

            const document = await createTestFile('comments-only.drl', unformattedContent);
            const contentAfterSave = await saveDocumentAndGetContent(document);

            // Comments should be preserved
            assert(contentAfterSave.includes('// This is a comment'));
            assert(contentAfterSave.includes('/* Multi-line'));
            assert(contentAfterSave.includes('// Another comment'));
        });

        it('should handle malformed rules gracefully', async function() {
            const malformedContent = `package com.example

rule "Malformed Rule"
when
$person:Person(age>
then
System.out.println("Incomplete");
// Missing end`;

            const document = await createTestFile('malformed.drl', malformedContent);
            
            // Should not crash during format-on-save
            try {
                const contentAfterSave = await saveDocumentAndGetContent(document);
                assert(typeof contentAfterSave === 'string');
            } catch (error) {
                // If formatting fails, it should fail gracefully
                assert(error.message.includes('format') || error.message.includes('parse'));
            }
        });
    });

    describe('Performance Tests', function() {
        it('should handle large files efficiently', async function() {
            // Create a large file with many rules
            let largeContent = 'package com.example.large\n\n';
            
            for (let i = 0; i < 100; i++) {
                largeContent += `rule "Rule ${i}"
when
$person${i}:Person(age>${i})
then
System.out.println("Rule ${i} fired");
end

`;
            }

            const document = await createTestFile('large-file.drl', largeContent);
            
            const startTime = Date.now();
            const contentAfterSave = await saveDocumentAndGetContent(document);
            const endTime = Date.now();
            
            // Should complete within reasonable time (less than 5 seconds)
            const formatTime = endTime - startTime;
            assert(formatTime < 5000, `Formatting took too long: ${formatTime}ms`);
            
            // Should still format correctly
            assert(contentAfterSave.includes('$person0 : Person(age > 0)'));
            assert(contentAfterSave.includes('$person99 : Person(age > 99)'));
        });
    });
});