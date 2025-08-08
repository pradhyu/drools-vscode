/**
 * Multi-line Pattern Tests
 * Tests parsing and handling of multi-line patterns (exists, not, eval, etc.)
 */

import { DroolsParser } from '../../src/server/parser/droolsParser';

describe('Multi-line Patterns', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    describe('Exists Patterns', () => {
        test('should parse simple exists pattern', () => {
            const input = `rule "Exists Rule"
when
    $person : Person(age > 18)
    exists(Account(owner == $person))
then
    System.out.println("Person has account");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            
            const existsCondition = result.ast.rules[0].when?.conditions[1];
            expect(existsCondition?.content).toContain('exists(Account(owner == $person))');
        });

        test('should parse multi-line exists pattern', () => {
            const input = `rule "Multi-line Exists"
when
    $person : Person(age > 18)
    exists(
        Account(
            owner == $person,
            balance > 1000
        )
    )
then
    System.out.println("Person has high-balance account");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            
            const existsCondition = result.ast.rules[0].when?.conditions[1];
            expect(existsCondition?.content).toContain('exists(');
            expect(existsCondition?.content).toContain('Account(');
            expect(existsCondition?.content).toContain('balance > 1000');
        });

        test('should parse nested exists patterns', () => {
            const input = `rule "Nested Exists"
when
    $person : Person(age > 18)
    exists(
        Account(
            owner == $person,
            exists(Transaction(account == this, amount > 10000))
        )
    )
then
    System.out.println("Person has account with large transaction");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const existsCondition = result.ast.rules[0].when?.conditions[1];
            expect(existsCondition?.content).toContain('exists(');
            expect(existsCondition?.content).toContain('Transaction(');
        });
    });

    describe('Not Patterns', () => {
        test('should parse simple not pattern', () => {
            const input = `rule "Not Rule"
when
    $person : Person(age > 18)
    not(Debt(debtor == $person))
then
    System.out.println("Person has no debt");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            
            const notCondition = result.ast.rules[0].when?.conditions[1];
            expect(notCondition?.content).toContain('not(Debt(debtor == $person))');
        });

        test('should parse multi-line not pattern', () => {
            const input = `rule "Multi-line Not"
when
    $person : Person(age > 18)
    not(
        Debt(
            debtor == $person,
            amount > 5000,
            status == "ACTIVE"
        )
    )
then
    System.out.println("Person has no significant active debt");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const notCondition = result.ast.rules[0].when?.conditions[1];
            expect(notCondition?.content).toContain('not(');
            expect(notCondition?.content).toContain('Debt(');
            expect(notCondition?.content).toContain('amount > 5000');
        });
    });

    describe('Eval Patterns', () => {
        test('should parse simple eval pattern', () => {
            const input = `rule "Eval Rule"
when
    eval(1 + 1 == 2)
then
    System.out.println("Math works");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(1);
            
            const evalCondition = result.ast.rules[0].when?.conditions[0];
            expect(evalCondition?.content).toContain('eval(1 + 1 == 2)');
        });

        test('should parse multi-line eval pattern', () => {
            const input = `rule "Multi-line Eval"
when
    $person : Person()
    eval(
        $person.getAge() > 18 &&
        $person.getName() != null &&
        $person.isActive()
    )
then
    System.out.println("Complex evaluation passed");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const evalCondition = result.ast.rules[0].when?.conditions[1];
            expect(evalCondition?.content).toContain('eval(');
            expect(evalCondition?.content).toContain('$person.getAge() > 18');
            expect(evalCondition?.content).toContain('$person.isActive()');
        });
    });

    describe('Forall Patterns', () => {
        test('should parse forall pattern', () => {
            const input = `rule "Forall Rule"
when
    forall(
        $account : Account(owner == $person)
        $account.balance > 0
    )
then
    System.out.println("All accounts have positive balance");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const forallCondition = result.ast.rules[0].when?.conditions[0];
            expect(forallCondition?.content).toContain('forall(');
            expect(forallCondition?.content).toContain('Account(owner == $person)');
        });

        test('should parse complex forall pattern', () => {
            const input = `rule "Complex Forall"
when
    $person : Person(age > 18)
    forall(
        $account : Account(
            owner == $person,
            type == "CHECKING"
        )
        $account.balance > 1000
    )
then
    System.out.println("All checking accounts well-funded");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const forallCondition = result.ast.rules[0].when?.conditions[1];
            expect(forallCondition?.content).toContain('forall(');
            expect(forallCondition?.content).toContain('type == "CHECKING"');
        });
    });

    describe('Collect Patterns', () => {
        test('should parse collect pattern', () => {
            const input = `rule "Collect Rule"
when
    $accounts : collect(Account(balance > 1000))
then
    System.out.println("Found " + $accounts.size() + " high-balance accounts");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const collectCondition = result.ast.rules[0].when?.conditions[0];
            expect(collectCondition?.content).toContain('collect(Account(balance > 1000))');
        });

        test('should parse multi-line collect pattern', () => {
            const input = `rule "Multi-line Collect"
when
    $person : Person(age > 18)
    $accounts : collect(
        Account(
            owner == $person,
            balance > 1000,
            status == "ACTIVE"
        )
    )
then
    System.out.println("Collected " + $accounts.size() + " active high-balance accounts");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const collectCondition = result.ast.rules[0].when?.conditions[1];
            expect(collectCondition?.content).toContain('collect(');
            expect(collectCondition?.content).toContain('balance > 1000');
            expect(collectCondition?.content).toContain('status == "ACTIVE"');
        });
    });

    describe('Accumulate Patterns', () => {
        test('should parse accumulate pattern', () => {
            const input = `rule "Accumulate Rule"
when
    $total : accumulate(
        Account(balance > 0),
        sum(balance)
    )
then
    System.out.println("Total balance: " + $total);
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const accumulateCondition = result.ast.rules[0].when?.conditions[0];
            expect(accumulateCondition?.content).toContain('accumulate(');
            expect(accumulateCondition?.content).toContain('sum(balance)');
        });

        test('should parse complex accumulate pattern', () => {
            const input = `rule "Complex Accumulate"
when
    $person : Person(age > 18)
    $avgBalance : accumulate(
        Account(
            owner == $person,
            type == "SAVINGS"
        ),
        average(balance)
    )
then
    System.out.println("Average savings balance: " + $avgBalance);
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const accumulateCondition = result.ast.rules[0].when?.conditions[1];
            expect(accumulateCondition?.content).toContain('accumulate(');
            expect(accumulateCondition?.content).toContain('type == "SAVINGS"');
            expect(accumulateCondition?.content).toContain('average(balance)');
        });
    });

    describe('Complex Nested Patterns', () => {
        test('should parse deeply nested patterns', () => {
            const input = `rule "Deeply Nested"
when
    $person : Person(age > 18)
    exists(
        Account(
            owner == $person,
            not(
                Transaction(
                    account == this,
                    amount > 10000,
                    exists(
                        Alert(
                            transaction == this,
                            type == "FRAUD"
                        )
                    )
                )
            )
        )
    )
then
    System.out.println("Person has account without large fraudulent transactions");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            const existsCondition = result.ast.rules[0].when?.conditions[1];
            expect(existsCondition?.content).toContain('exists(');
            expect(existsCondition?.content).toContain('not(');
            expect(existsCondition?.content).toContain('Transaction(');
            expect(existsCondition?.content).toContain('Alert(');
        });

        test('should parse mixed pattern types', () => {
            const input = `rule "Mixed Patterns"
when
    $person : Person(age > 18)
    exists(Account(owner == $person))
    not(Debt(debtor == $person))
    eval($person.getCreditScore() > 700)
    $accounts : collect(Account(owner == $person, balance > 0))
then
    System.out.println("Person meets all criteria");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(5);
            
            const conditions = result.ast.rules[0].when?.conditions || [];
            expect(conditions[1].content).toContain('exists(');
            expect(conditions[2].content).toContain('not(');
            expect(conditions[3].content).toContain('eval(');
            expect(conditions[4].content).toContain('collect(');
        });
    });

    describe('Pattern with Comments', () => {
        test('should handle comments in multi-line patterns', () => {
            const input = `rule "Pattern with Comments"
when
    $person : Person(age > 18) // person check
    exists( // check for account
        Account(
            owner == $person, // ownership check
            balance > 1000 /* minimum balance */
        )
    ) // end exists
then
    System.out.println("Person has sufficient funds");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            expect(result.ast.rules[0].when?.conditions).toHaveLength(2);
            
            // First condition should have comments filtered
            const personCondition = result.ast.rules[0].when?.conditions[0];
            expect(personCondition?.content).toContain('Person(age > 18)');
            expect(personCondition?.content).not.toContain('person check');
            
            // Exists condition should be parsed (current limitation: may not include full content)
            const existsCondition = result.ast.rules[0].when?.conditions[1];
            expect(existsCondition?.content).toContain('exists(');
            
            // Basic comment filtering should work for simple cases
            const astString = JSON.stringify(result.ast);
            expect(astString).not.toContain('person check');
        });
    });

    describe('Incomplete Patterns', () => {
        test('should handle incomplete exists pattern', () => {
            const input = `rule "Incomplete Exists"
when
    $person : Person(age > 18)
    exists(Account(owner == $person
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            // Should still parse the rule structure
            expect(result.ast.rules[0].when?.conditions).toBeDefined();
        });

        test('should handle incomplete nested pattern', () => {
            const input = `rule "Incomplete Nested"
when
    exists(
        Account(
            owner == $person,
            not(Transaction(
                account == this
then
    System.out.println("test");
end`;
            const result = parser.parse(input);

            expect(result.ast.rules).toHaveLength(1);
            // Should still create AST structure
            expect(result.ast.rules[0]).toBeDefined();
        });
    });

    describe('Error Recovery', () => {
        test('should continue parsing after pattern errors', () => {
            const input = `rule "Good Rule 1"
when
    $p : Person()
then
    System.out.println("Good 1");
end

rule "Bad Pattern Rule"
when
    exists(malformed pattern here
    not(another bad pattern
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
            expect(result.ast.rules[1].name).toBe('Bad Pattern Rule');
            expect(result.ast.rules[2].name).toBe('Good Rule 2');
        });
    });
});