import { ContextAnalyzer, RuleContext } from '../src/contextAnalyzer';
import * as vscode from 'vscode';

// Mock VSCode API
const mockDocument = (text: string): vscode.TextDocument => ({
    getText: () => text,
    offsetAt: (position: vscode.Position) => {
        const lines = text.split('\n');
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        return offset + position.character;
    },
    lineAt: (line: number) => ({
        text: text.split('\n')[line] || '',
        lineNumber: line,
        range: {} as vscode.Range,
        rangeIncludingLineBreak: {} as vscode.Range,
        firstNonWhitespaceCharacterIndex: 0,
        isEmptyOrWhitespace: false
    })
} as vscode.TextDocument);

describe('ContextAnalyzer', () => {
    let analyzer: ContextAnalyzer;

    beforeEach(() => {
        analyzer = new ContextAnalyzer();
    });

    describe('analyzeContext', () => {
        test('should detect package context', () => {
            const text = `package com.example.rules

import com.example.Customer`;
            const document = mockDocument(text);
            const position = { line: 0, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.PACKAGE);
        });

        test('should detect import context', () => {
            const text = `package com.example.rules

import com.example.Customer
import com.example.Order`;
            const document = mockDocument(text);
            const position = { line: 2, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.IMPORT);
        });

        test('should detect global context', () => {
            const text = `package com.example.rules

global java.util.List results`;
            const document = mockDocument(text);
            const position = { line: 2, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.GLOBAL);
        });

        test('should detect rule header context', () => {
            const text = `rule "Test Rule"
    salience 10
    no-loop true
when`;
            const document = mockDocument(text);
            const position = { line: 1, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.RULE_HEADER);
        });

        test('should detect when clause context', () => {
            const text = `rule "Test Rule"
when
    $customer : Customer(age > 18)
    $order : Order(customerId == $customer.id)
then`;
            const document = mockDocument(text);
            const position = { line: 2, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.WHEN_CLAUSE);
        });

        test('should detect then clause context', () => {
            const text = `rule "Test Rule"
when
    $customer : Customer(age > 18)
then
    System.out.println("Customer is adult");
    $customer.setStatus("VERIFIED");
    update($customer);
end`;
            const document = mockDocument(text);
            const position = { line: 4, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.THEN_CLAUSE);
        });

        test('should detect function context', () => {
            const text = `function boolean isEligible(Customer customer) {
    return customer.getAge() >= 18;
}`;
            const document = mockDocument(text);
            const position = { line: 0, character: 20 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.FUNCTION);
        });

        test('should detect query context', () => {
            const text = `query "findCustomersByAge"(int minAge)
    $customer : Customer(age >= minAge)
end`;
            const document = mockDocument(text);
            const position = { line: 0, character: 10 } as vscode.Position;
            
            const context = analyzer.analyzeContext(document, position);
            expect(context).toBe(RuleContext.QUERY);
        });
    });

    describe('isInThenClause', () => {
        test('should return true when in then clause', () => {
            const text = `rule "Test Rule"
when
    $customer : Customer(age > 18)
then
    System.out.println("Processing customer");
end`;
            const document = mockDocument(text);
            const position = { line: 4, character: 10 } as vscode.Position;
            
            const result = analyzer.isInThenClause(document, position);
            expect(result).toBe(true);
        });

        test('should return false when not in then clause', () => {
            const text = `rule "Test Rule"
when
    $customer : Customer(age > 18)
then
    System.out.println("Processing customer");
end`;
            const document = mockDocument(text);
            const position = { line: 2, character: 10 } as vscode.Position;
            
            const result = analyzer.isInThenClause(document, position);
            expect(result).toBe(false);
        });
    });

    describe('getIndentationLevel', () => {
        test('should calculate indentation with spaces', () => {
            const text = `rule "Test Rule"
    when
        $customer : Customer()
    then
        System.out.println("test");`;
            const document = mockDocument(text);
            const position = { line: 2, character: 8 } as vscode.Position;
            
            const indentation = analyzer.getIndentationLevel(document, position);
            expect(indentation).toBe(8); // 8 spaces
        });

        test('should calculate indentation with tabs', () => {
            const text = `rule "Test Rule"
\twhen
\t\t$customer : Customer()`;
            const document = mockDocument(text);
            const position = { line: 2, character: 2 } as vscode.Position;
            
            const indentation = analyzer.getIndentationLevel(document, position);
            expect(indentation).toBe(8); // 2 tabs = 8 spaces
        });
    });

    describe('findRuleStructure', () => {
        test('should find complete rule structure', () => {
            const text = `package com.example

rule "Test Rule"
    salience 10
when
    $customer : Customer(age > 18)
then
    System.out.println("test");
end

rule "Another Rule"
when
    $order : Order()
then
    // process order
end`;
            const document = mockDocument(text);
            
            // Test first rule
            const structure1 = analyzer.findRuleStructure(text, 50); // Position in first rule
            expect(structure1).toBeTruthy();
            expect(structure1?.ruleName).toBe('Test Rule');
            expect(structure1?.ruleStart).toBeGreaterThan(0);
            expect(structure1?.whenStart).toBeGreaterThan(structure1?.ruleStart || 0);
            expect(structure1?.thenStart).toBeGreaterThan(structure1?.whenStart || 0);
            expect(structure1?.ruleEnd).toBeGreaterThan(structure1?.thenStart || 0);
        });

        test('should handle rule without quotes in name', () => {
            const text = `rule TestRule
when
    $customer : Customer()
then
    // action
end`;
            const document = mockDocument(text);
            
            const structure = analyzer.findRuleStructure(text, 20);
            expect(structure).toBeTruthy();
            expect(structure?.ruleName).toBe('TestRule');
        });
    });

    describe('isInContextWithValidation', () => {
        test('should validate then clause context and reject comments', () => {
            const text = `rule "Test Rule"
when
    $customer : Customer()
then
    System.out.println("test"); // This is a comment
end`;
            const document = mockDocument(text);
            
            // Position in code - should be valid
            const codePosition = { line: 4, character: 10 } as vscode.Position;
            const isValidCode = analyzer.isInContextWithValidation(document, codePosition, RuleContext.THEN_CLAUSE);
            expect(isValidCode).toBe(true);
            
            // Position in comment - should be invalid
            const commentPosition = { line: 4, character: 40 } as vscode.Position;
            const isValidComment = analyzer.isInContextWithValidation(document, commentPosition, RuleContext.THEN_CLAUSE);
            expect(isValidComment).toBe(false);
        });

        test('should validate then clause context and reject string literals', () => {
            const text = `rule "Test Rule"
when
    $customer : Customer()
then
    String message = "Hello World";
end`;
            const document = mockDocument(text);
            
            // Position outside string - should be valid
            const outsideString = { line: 4, character: 10 } as vscode.Position;
            const isValidOutside = analyzer.isInContextWithValidation(document, outsideString, RuleContext.THEN_CLAUSE);
            expect(isValidOutside).toBe(true);
            
            // Position inside string - should be invalid
            const insideString = { line: 4, character: 25 } as vscode.Position;
            const isValidInside = analyzer.isInContextWithValidation(document, insideString, RuleContext.THEN_CLAUSE);
            expect(isValidInside).toBe(false);
        });
    });

    describe('getAllRuleStructures', () => {
        test('should find all rules in document', () => {
            const text = `package com.example

rule "First Rule"
when
    $customer : Customer()
then
    // action 1
end

rule "Second Rule"
    salience 5
when
    $order : Order()
then
    // action 2
end

rule "Third Rule"
when
    $product : Product()
then
    // action 3
end`;
            const document = mockDocument(text);
            
            const structures = analyzer.getAllRuleStructures(document);
            expect(structures).toHaveLength(3);
            expect(structures[0].ruleName).toBe('First Rule');
            expect(structures[1].ruleName).toBe('Second Rule');
            expect(structures[2].ruleName).toBe('Third Rule');
        });
    });

    describe('complex scenarios', () => {
        test('should handle nested parentheses and braces correctly', () => {
            const text = `rule "Complex Rule"
when
    $customer : Customer(
        age > 18,
        orders.size() > 0,
        address.country in ("US", "CA", "UK")
    )
    $order : Order(
        customer == $customer,
        items.stream().anyMatch(item -> item.getPrice() > 100)
    )
then
    if ($customer.isVip()) {
        $order.setDiscount(0.15);
    } else {
        $order.setDiscount(0.05);
    }
    update($order);
end`;
            const document = mockDocument(text);
            
            // Test various positions
            const whenPosition = { line: 3, character: 10 } as vscode.Position;
            const whenContext = analyzer.analyzeContext(document, whenPosition);
            expect(whenContext).toBe(RuleContext.WHEN_CLAUSE);
            
            const thenPosition = { line: 12, character: 10 } as vscode.Position;
            const thenContext = analyzer.analyzeContext(document, thenPosition);
            expect(thenContext).toBe(RuleContext.THEN_CLAUSE);
        });

        test('should handle multiple rules with complex structures', () => {
            const text = `package com.example.rules

import com.example.Customer
import com.example.Order

global java.util.List results

rule "VIP Customer Processing"
    salience 100
    no-loop true
when
    $customer : Customer(vipStatus == true)
    $order : Order(customerId == $customer.id, status == "PENDING")
then
    System.out.println("Processing VIP order: " + $order.getId());
    $order.setStatus("PRIORITY");
    update($order);
    results.add("VIP order processed");
end

rule "Regular Customer Processing"
    salience 50
when
    $customer : Customer(vipStatus == false)
    $order : Order(customerId == $customer.id, status == "PENDING")
then
    System.out.println("Processing regular order: " + $order.getId());
    $order.setStatus("NORMAL");
    update($order);
end

function boolean isEligibleForDiscount(Customer customer, Order order) {
    return customer.getAge() > 65 || order.getTotal() > 1000;
}`;
            const document = mockDocument(text);
            
            // Test package context
            const packagePos = { line: 0, character: 10 } as vscode.Position;
            expect(analyzer.analyzeContext(document, packagePos)).toBe(RuleContext.PACKAGE);
            
            // Test import context
            const importPos = { line: 2, character: 10 } as vscode.Position;
            expect(analyzer.analyzeContext(document, importPos)).toBe(RuleContext.IMPORT);
            
            // Test global context
            const globalPos = { line: 5, character: 10 } as vscode.Position;
            expect(analyzer.analyzeContext(document, globalPos)).toBe(RuleContext.GLOBAL);
            
            // Test first rule then clause
            const firstRuleThen = { line: 14, character: 10 } as vscode.Position;
            expect(analyzer.analyzeContext(document, firstRuleThen)).toBe(RuleContext.THEN_CLAUSE);
            
            // Test second rule then clause
            const secondRuleThen = { line: 26, character: 10 } as vscode.Position;
            expect(analyzer.analyzeContext(document, secondRuleThen)).toBe(RuleContext.THEN_CLAUSE);
            
            // Test function context
            const functionPos = { line: 31, character: 10 } as vscode.Position;
            expect(analyzer.analyzeContext(document, functionPos)).toBe(RuleContext.FUNCTION);
        });
    });
});