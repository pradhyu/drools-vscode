const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

describe('Drools Folding Provider Tests', function() {
    this.timeout(30000);

    let document;
    let extension;

    before(async function() {
        // Activate the extension
        extension = vscode.extensions.getExtension('drools-community.drools-vscode-extension');
        if (extension && !extension.isActive) {
            await extension.activate();
        }

        // Create a test document with folding content
        const testContent = `package com.example.rules;

import java.util.List;
import java.util.Map;
import java.util.Set;

global java.util.List globalList;

/*
 * This is a multi-line
 * block comment that should
 * be foldable
 */

// This is line comment 1
// This is line comment 2  
// This is line comment 3
// This is line comment 4

function String processData(String input, int count) {
    if (input != null) {
        return input.toUpperCase() + count;
    }
    return "default";
}

rule "Simple Rule"
    salience 100
    no-loop true
when
    $person : Person(age > 18, name != null)
    $account : Account(owner == $person, balance > 1000)
then
    $account.setStatus("ACTIVE");
    $person.setVerified(true);
    insert(new Notification($person, "Account activated"));
end

rule "Complex Rule with Nested Conditions"
    salience 50
when
    $customer : Customer(
        age >= 21,
        status == "ACTIVE",
        creditScore > 700
    )
    exists(
        Account(
            owner == $customer,
            type == "PREMIUM",
            balance > 10000
        )
    )
    not(
        Restriction(
            customer == $customer,
            type == "CREDIT_HOLD"
        )
    )
then
    // Complex action block
    $customer.setTier("PLATINUM");
    insert(new Benefit($customer, "PLATINUM_REWARDS"));
    
    // Additional processing
    for (Account acc : $customer.getAccounts()) {
        acc.applyPlatinumBenefits();
    }
end

query "findActiveCustomers"(String status)
    $customer : Customer(status == status, verified == true)
    $account : Account(owner == $customer, balance > 0)
end

declare CustomerEvent
    customer : Customer
    eventType : String
    timestamp : java.util.Date
end`;

        document = await vscode.workspace.openTextDocument({
            content: testContent,
            language: 'drools'
        });
    });

    after(async function() {
        if (document) {
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });

    it('should provide folding ranges for rules', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        assert(Array.isArray(foldingRanges), 'Should return an array of folding ranges');
        
        // Find rule folding ranges
        const ruleFoldingRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Region &&
            document.getText(new vscode.Range(range.start, range.start + 1)).includes('rule')
        );

        assert(ruleFoldingRanges.length >= 2, 'Should have folding ranges for both rules');
        
        // Check that rule folding ranges have appropriate collapsed text
        for (const range of ruleFoldingRanges) {
            const startLine = document.lineAt(range.start);
            assert(startLine.text.includes('rule'), 'Rule folding range should start with rule keyword');
        }
    });

    it('should provide folding ranges for functions', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find function folding ranges
        const functionFoldingRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Region &&
            document.getText(new vscode.Range(range.start, range.start + 1)).includes('function')
        );

        assert(functionFoldingRanges.length >= 1, 'Should have folding range for function');
        
        // Check function folding range
        const functionRange = functionFoldingRanges[0];
        const startLine = document.lineAt(functionRange.start);
        assert(startLine.text.includes('function'), 'Function folding range should start with function keyword');
    });

    it('should provide folding ranges for block comments', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find comment folding ranges
        const commentFoldingRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Comment
        );

        assert(commentFoldingRanges.length >= 1, 'Should have folding ranges for comments');
        
        // Check block comment folding
        const blockCommentRange = commentFoldingRanges.find(range => {
            const startLine = document.lineAt(range.start);
            return startLine.text.includes('/*');
        });
        
        assert(blockCommentRange, 'Should have folding range for block comment');
    });

    it('should provide folding ranges for consecutive line comments', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find line comment folding ranges
        const lineCommentRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Comment &&
            document.getText(new vscode.Range(range.start, range.start + 1)).includes('//')
        );

        assert(lineCommentRanges.length >= 1, 'Should have folding range for consecutive line comments');
    });

    it('should provide folding ranges for import blocks', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find import folding ranges
        const importFoldingRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Imports
        );

        assert(importFoldingRanges.length >= 1, 'Should have folding range for import block');
        
        // Check import folding range
        const importRange = importFoldingRanges[0];
        const startLine = document.lineAt(importRange.start);
        assert(startLine.text.includes('import'), 'Import folding range should start with import keyword');
    });

    it('should provide folding ranges for when and then blocks', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find when/then folding ranges
        const whenThenRanges = foldingRanges.filter(range => {
            const startLine = document.lineAt(range.start);
            return startLine.text.includes('when') || startLine.text.includes('then');
        });

        assert(whenThenRanges.length >= 2, 'Should have folding ranges for when and then blocks');
    });

    it('should provide folding ranges for query definitions', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find query folding ranges
        const queryFoldingRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Region &&
            document.getText(new vscode.Range(range.start, range.start + 1)).includes('query')
        );

        assert(queryFoldingRanges.length >= 1, 'Should have folding range for query');
        
        // Check query folding range
        const queryRange = queryFoldingRanges[0];
        const startLine = document.lineAt(queryRange.start);
        assert(startLine.text.includes('query'), 'Query folding range should start with query keyword');
    });

    it('should provide folding ranges for declare statements', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find declare folding ranges
        const declareFoldingRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Region &&
            document.getText(new vscode.Range(range.start, range.start + 1)).includes('declare')
        );

        assert(declareFoldingRanges.length >= 1, 'Should have folding range for declare statement');
        
        // Check declare folding range
        const declareRange = declareFoldingRanges[0];
        const startLine = document.lineAt(declareRange.start);
        assert(startLine.text.includes('declare'), 'Declare folding range should start with declare keyword');
    });

    it('should handle nested rule structures correctly', async function() {
        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            document.uri
        );

        // Find the complex rule with nested conditions
        const complexRuleRange = foldingRanges.find(range => {
            const startLine = document.lineAt(range.start);
            return startLine.text.includes('Complex Rule with Nested Conditions');
        });

        assert(complexRuleRange, 'Should have folding range for complex rule');
        
        // Check that nested structures within the rule are also foldable
        const nestedRanges = foldingRanges.filter(range => 
            range.start >= complexRuleRange.start && 
            range.end <= complexRuleRange.end &&
            range !== complexRuleRange
        );

        assert(nestedRanges.length >= 1, 'Should have nested folding ranges within complex rule');
    });

    it('should not create folding ranges for single-line constructs', async function() {
        // Create a document with single-line constructs
        const singleLineContent = `package com.example;
import java.util.List;
global String singleGlobal;
rule "SingleLineRule" when $p : Person() then modify($p) { setActive(true) }; end`;

        const singleLineDoc = await vscode.workspace.openTextDocument({
            content: singleLineContent,
            language: 'drools'
        });

        const foldingRanges = await vscode.commands.executeCommand(
            'vscode.executeFoldingRangeProvider',
            singleLineDoc.uri
        );

        // Should have minimal or no folding ranges for single-line constructs
        const regionRanges = foldingRanges.filter(range => 
            range.kind === vscode.FoldingRangeKind.Region
        );

        // Single-line rule should not have folding range
        assert(regionRanges.length === 0, 'Should not create folding ranges for single-line constructs');

        await vscode.window.showTextDocument(singleLineDoc);
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
});