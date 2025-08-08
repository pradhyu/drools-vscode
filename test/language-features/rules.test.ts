/**
 * Rule Parsing Tests
 * Tests parsing of Drools rules including attributes, conditions, and actions
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('Rule Parsing', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('Basic Rule Structure', () => {
        test('should parse simple rule with quoted name', () => {
            const input = `rule "Simple Rule"
when
    $person : Person(age > 18)
then
    System.out.println("Adult: " + $person.getName());
end`;
            const result = parser.parse(input);

            expect(result.errors).toHaveLength(0);
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Simple Rule');
            expect(result.ast.rules[0].when).toBeDefined();
            expect(result.ast.rules[0].then).toBeDefined();
        });

        test('should parse rule with unquoted name', () => {
            const input = `rule SimpleRule
when
    $person : Person(age > 18)
then
    System.out.println("Adult");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('SimpleRule');
        });

        test('should handle rule without when clause', () => {
            const input = `rule "Always Execute"
then
    System.out.println("Always runs");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when).toBeUndefined();
            expect(result.ast.rules[0].then).toBeDefined();
        });

        test('should handle rule without then clause', () => {
            const input = `rule "Query Only"
when
    $person : Person(age > 18)
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when).toBeDefined();
            expect(result.ast.rules[0].then).toBeUndefined();
        });
    });

    describe('Rule Attributes', () => {
        test('should parse salience attribute', () => {
            const input = `rule "Priority Rule"
    salience 100
when
    $person : Person(age > 18)
then
    System.out.println("High priority rule");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].attributes).toHaveLength(1);
            expect(result.ast.rules[0].attributes[0].name).toBe('salience');
            expect(result.ast.rules[0].attributes[0].value).toBe('100');
        });

        test('should parse no-loop attribute', () => {
            const input = `rule "No Loop Rule"
    no-loop
when
    $person : Person(age > 18)
then
    $person.setProcessed(true);
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].attributes).toHaveLength(1);
            expect(result.ast.rules[0].attributes[0].name).toBe('no-loop');
        });

        test('should parse multiple attributes', () => {
            const input = `rule "Complex Rule"
    salience 100
    no-loop
    lock-on-active
    agenda-group "test-group"
when
    $person : Person(age > 18)
then
    System.out.println("Complex rule executed");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].attributes).toHaveLength(4);
            
            const attributeNames = result.ast.rules[0].attributes.map(attr => attr.name);
            expect(attributeNames).toContain('salience');
            expect(attributeNames).toContain('no-loop');
            expect(attributeNames).toContain('lock-on-active');
            expect(attributeNames).toContain('agenda-group');
            
            const salienceAttr = result.ast.rules[0].attributes.find(attr => attr.name === 'salience');
            expect(salienceAttr?.value).toBe('100');
            
            const agendaAttr = result.ast.rules[0].attributes.find(attr => attr.name === 'agenda-group');
            expect(agendaAttr?.value).toBe('"test-group"');
        });

        test('should handle all standard rule attributes', () => {
            const input = `rule "All Attributes Rule"
    salience 100
    no-loop
    lock-on-active
    agenda-group "test"
    auto-focus
    activation-group "group1"
    ruleflow-group "flow1"
    dialect "mvel"
    date-effective "01-Jan-2024"
    date-expires "31-Dec-2024"
    enabled true
    duration 5000
when
    $person : Person()
then
    System.out.println("All attributes");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].attributes).toHaveLength(12);
            
            const attributeNames = result.ast.rules[0].attributes.map(attr => attr.name);
            const expectedAttributes = [
                'salience', 'no-loop', 'lock-on-active', 'agenda-group',
                'auto-focus', 'activation-group', 'ruleflow-group', 'dialect',
                'date-effective', 'date-expires', 'enabled', 'duration'
            ];
            
            expectedAttributes.forEach(expectedAttr => {
                expect(attributeNames).toContain(expectedAttr);
            });
        });
    });

    describe('When Clause Parsing', () => {
        test('should parse simple condition', () => {
            const input = `rule "Simple Condition"
when
    $person : Person(age > 18)
then
    System.out.println("Adult");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].when?.conditions).toHaveLength(1);
            const condition = result.ast.rules[0].when?.conditions[0];
            expect(condition?.variable).toBe('$person');
            expect(condition?.factType).toBe('Person');
            expect(condition?.content).toContain('age > 18');
        });

        test('should parse multiple conditions', () => {
            const input = `rule "Multiple Conditions"
when
    $person : Person(age > 18, name != null)
    $account : Account(owner == $person, balance > 1000)
then
    System.out.println("Eligible person with account");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            
            const personCondition = result.ast.rules[0].when?.conditions[0];
            expect(personCondition?.variable).toBe('$person');
            expect(personCondition?.factType).toBe('Person');
            
            const accountCondition = result.ast.rules[0].when?.conditions[1];
            expect(accountCondition?.variable).toBe('$account');
            expect(accountCondition?.factType).toBe('Account');
        });

        test('should parse eval condition', () => {
            const input = `rule "Eval Rule"
when
    eval(1 + 1 == 2)
then
    System.out.println("Math works");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].when?.conditions).toHaveLength(1);
            const condition = result.ast.rules[0].when?.conditions[0];
            expect(condition?.content).toContain('eval(1 + 1 == 2)');
        });

        test('should parse exists condition', () => {
            const input = `rule "Exists Rule"
when
    $person : Person(age > 18)
    exists(Account(owner == $person))
then
    System.out.println("Person has account");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            const existsCondition = result.ast.rules[0].when?.conditions[1];
            expect(existsCondition?.content).toContain('exists(Account(owner == $person))');
        });

        test('should parse not condition', () => {
            const input = `rule "Not Rule"
when
    $person : Person(age > 18)
    not(Debt(debtor == $person))
then
    System.out.println("Person has no debt");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            const notCondition = result.ast.rules[0].when?.conditions[1];
            expect(notCondition?.content).toContain('not(Debt(debtor == $person))');
        });
    });

    describe('Then Clause Parsing', () => {
        test('should parse simple action', () => {
            const input = `rule "Simple Action"
when
    $person : Person()
then
    System.out.println("Found person");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules[0].then?.actions).toContain('System.out.println("Found person");');
        });

        test('should parse multiple actions', () => {
            const input = `rule "Multiple Actions"
when
    $person : Person()
then
    System.out.println("Processing person: " + $person.getName());
    $person.setProcessed(true);
    insert(new ProcessingEvent($person));
end`;
            const result = parser.parse(input);

            const actions = result.ast.rules[0].then?.actions;
            expect(actions).toContain('System.out.println');
            expect(actions).toContain('$person.setProcessed(true);');
            expect(actions).toContain('insert(new ProcessingEvent($person));');
        });

        test('should parse complex Java code in then clause', () => {
            const input = `rule "Complex Actions"
when
    $person : Person(age > 18)
then
    if ($person.getAge() > 65) {
        $person.setCategory("SENIOR");
    } else {
        $person.setCategory("ADULT");
    }
    
    for (Account account : $person.getAccounts()) {
        account.setOwnerCategory($person.getCategory());
    }
end`;
            const result = parser.parse(input);

            const actions = result.ast.rules[0].then?.actions;
            expect(actions).toContain('if ($person.getAge() > 65)');
            expect(actions).toContain('for (Account account : $person.getAccounts())');
        });
    });

    describe('Complex Rule Scenarios', () => {
        test('should parse rule with all components', () => {
            const input = `rule "Complete Rule"
    salience 100
    no-loop
    agenda-group "processing"
when
    $person : Person(age > 18, name != null)
    $account : Account(owner == $person, balance > 1000)
    not(Debt(debtor == $person))
    exists(CreditScore(person == $person, score > 700))
then
    System.out.println("Eligible for premium service");
    $person.setEligible(true);
    $account.setPremium(true);
    insert(new EligibilityEvent($person, $account));
end`;
            const result = parser.parse(input);

            const rule = result.ast.rules[0];
            expect(rule.name).toBe('Complete Rule');
            expect(rule.attributes).toHaveLength(3);
            expect(rule.when?.conditions).toHaveLength(4);
            expect(rule.then?.actions).toContain('System.out.println');
            expect(rule.then?.actions).toContain('$person.setEligible(true);');
            expect(rule.then?.actions).toContain('insert(new EligibilityEvent');
        });

        test('should parse multiple rules in same file', () => {
            const input = `rule "Rule One"
when
    $p : Person(age > 18)
then
    System.out.println("Rule 1");
end

rule "Rule Two"
    salience 50
when
    $a : Account(balance > 1000)
then
    System.out.println("Rule 2");
end

rule "Rule Three"
when
    $c : Customer(active == true)
then
    System.out.println("Rule 3");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(3);
            expect(result.ast.rules[0].name).toBe('Rule One');
            expect(result.ast.rules[1].name).toBe('Rule Two');
            expect(result.ast.rules[2].name).toBe('Rule Three');
            
            // Check that Rule Two has salience attribute
            expect(result.ast.rules[1].attributes).toHaveLength(1);
            expect(result.ast.rules[1].attributes[0].name).toBe('salience');
        });
    });

    describe('Error Handling in Rules', () => {
        test('should handle malformed rule gracefully', () => {
            const input = `rule "Bad Rule"
when
    $person : Person(age > 18
    // Missing closing parenthesis
then
    System.out.println("This should still parse");
end`;
            const result = parser.parse(input);

            // Should still create an AST even with errors
            expect(result.ast).toBeDefined();
            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Bad Rule');
        });

        test('should handle missing end keyword', () => {
            const input = `rule "Incomplete Rule"
when
    $p : Person()
then
    System.out.println("test");`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].name).toBe('Incomplete Rule');
        });

        test('should continue parsing after rule errors', () => {
            const input = `rule "Good Rule 1"
when
    $p : Person()
then
    System.out.println("Good 1");
end

rule "Bad Rule"
    invalid-syntax-here
when
    malformed condition
then
    System.out.println("Bad");
end

rule "Good Rule 2"
when
    $a : Account()
then
    System.out.println("Good 2");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(3);
            expect(result.ast.rules[0].name).toBe('Good Rule 1');
            expect(result.ast.rules[1].name).toBe('Bad Rule');
            expect(result.ast.rules[2].name).toBe('Good Rule 2');
        });
    });
});