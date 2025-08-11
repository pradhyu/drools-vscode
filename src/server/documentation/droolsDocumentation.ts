/**
 * Static Drools documentation for offline hover support
 * Based on Drools 7.74.1.Final documentation
 */

export interface DroolsKeywordDoc {
    keyword: string;
    description: string;
    syntax: string;
    example: string;
    category: 'rule' | 'condition' | 'action' | 'attribute' | 'function' | 'operator';
    relatedKeywords?: string[];
}

export interface DroolsFunctionDoc {
    name: string;
    description: string;
    parameters: Array<{
        name: string;
        type: string;
        description: string;
        optional?: boolean;
    }>;
    returnType: string;
    example: string;
    category: 'builtin' | 'collection' | 'string' | 'math' | 'date';
}

export class DroolsDocumentation {
    private static readonly KEYWORDS: Map<string, DroolsKeywordDoc> = new Map([
        ['rule', {
            keyword: 'rule',
            description: 'Defines a rule with a unique name. Rules are the basic unit of logic in Drools.',
            syntax: 'rule "rule-name" [attributes] when [conditions] then [actions] end',
            example: `rule "Customer Discount"
    salience 10
when
    $customer : Customer(age >= 65)
then
    $customer.setDiscount(0.15);
end`,
            category: 'rule',
            relatedKeywords: ['when', 'then', 'end', 'salience']
        }],
        
        ['when', {
            keyword: 'when',
            description: 'Defines the condition part (LHS) of a rule. Contains patterns that must match for the rule to fire.',
            syntax: 'when [pattern1] [pattern2] ... [patternN]',
            example: `when
    $customer : Customer(age >= 18, status == "ACTIVE")
    $order : Order(customerId == $customer.id, total > 100)`,
            category: 'condition',
            relatedKeywords: ['then', 'and', 'or', 'not', 'exists']
        }],
        
        ['then', {
            keyword: 'then',
            description: 'Defines the action part (RHS) of a rule. Contains Java code that executes when the rule fires.',
            syntax: 'then [java-statements]',
            example: `then
    $customer.setVipStatus(true);
    System.out.println("Customer upgraded to VIP");
    update($customer);`,
            category: 'action',
            relatedKeywords: ['when', 'end', 'update', 'insert', 'delete']
        }],
        
        ['end', {
            keyword: 'end',
            description: 'Marks the end of a rule definition. Required to close every rule.',
            syntax: 'end',
            example: `rule "Example"
when
    // conditions
then
    // actions
end`,
            category: 'rule',
            relatedKeywords: ['rule', 'when', 'then']
        }],
        
        ['and', {
            keyword: 'and',
            description: 'Logical AND operator. All connected patterns must match for the rule to fire.',
            syntax: 'pattern1 and pattern2',
            example: `when
    $customer : Customer(age >= 18) and
    $order : Order(customerId == $customer.id)`,
            category: 'operator',
            relatedKeywords: ['or', 'not', 'when']
        }],
        
        ['or', {
            keyword: 'or',
            description: 'Logical OR operator. At least one of the connected patterns must match.',
            syntax: 'pattern1 or pattern2',
            example: `when
    $customer : Customer(status == "VIP" or status == "PREMIUM")`,
            category: 'operator',
            relatedKeywords: ['and', 'not', 'when']
        }],
        
        ['not', {
            keyword: 'not',
            description: 'Logical NOT operator. The pattern must NOT match for the condition to be true.',
            syntax: 'not(pattern)',
            example: `when
    $customer : Customer()
    not(Order(customerId == $customer.id))`,
            category: 'operator',
            relatedKeywords: ['and', 'or', 'exists']
        }],
        
        ['exists', {
            keyword: 'exists',
            description: 'Checks if at least one fact matching the pattern exists, without binding it to a variable.',
            syntax: 'exists(pattern)',
            example: `when
    $customer : Customer()
    exists(Order(customerId == $customer.id, status == "PENDING"))`,
            category: 'operator',
            relatedKeywords: ['not', 'forall']
        }],
        
        ['forall', {
            keyword: 'forall',
            description: 'Universal quantifier. All facts matching the first pattern must also match the second pattern.',
            syntax: 'forall(pattern1 pattern2)',
            example: `when
    forall($order : Order(customerId == 123)
           Order(this == $order, status == "COMPLETED"))`,
            category: 'operator',
            relatedKeywords: ['exists', 'not']
        }],
        
        ['collect', {
            keyword: 'collect',
            description: 'Collects all facts matching a pattern into a Collection.',
            syntax: 'collect(pattern)',
            example: `when
    $orders : collect(Order(customerId == 123))
then
    System.out.println("Found " + $orders.size() + " orders");`,
            category: 'function',
            relatedKeywords: ['accumulate', 'from']
        }],
        
        ['accumulate', {
            keyword: 'accumulate',
            description: 'Performs calculations over a collection of facts matching a pattern.',
            syntax: 'accumulate(pattern, init(code), action(code), result(expression))',
            example: `when
    $total : accumulate(Order(customerId == 123, $amount : total),
                       init(double sum = 0;),
                       action(sum += $amount;),
                       result(sum))`,
            category: 'function',
            relatedKeywords: ['collect', 'from']
        }],
        
        ['from', {
            keyword: 'from',
            description: 'Allows pattern matching against objects from external sources or collections.',
            syntax: 'pattern from source',
            example: `when
    $customer : Customer()
    $address : Address() from $customer.getAddresses()`,
            category: 'operator',
            relatedKeywords: ['collect', 'accumulate']
        }],
        
        ['eval', {
            keyword: 'eval',
            description: 'Evaluates a Java expression as a condition. Use sparingly for performance reasons.',
            syntax: 'eval(boolean-expression)',
            example: `when
    $customer : Customer()
    eval($customer.getAge() > 18 && $customer.getStatus().equals("ACTIVE"))`,
            category: 'function',
            relatedKeywords: ['when']
        }],
        
        ['salience', {
            keyword: 'salience',
            description: 'Sets rule priority. Higher values execute first. Default is 0.',
            syntax: 'salience integer-value',
            example: `rule "High Priority Rule"
    salience 100
when
    // conditions
then
    // actions
end`,
            category: 'attribute',
            relatedKeywords: ['no-loop', 'agenda-group']
        }],
        
        ['no-loop', {
            keyword: 'no-loop',
            description: 'Prevents a rule from firing again due to its own actions.',
            syntax: 'no-loop [true|false]',
            example: `rule "Update Customer"
    no-loop true
when
    $customer : Customer(needsUpdate == true)
then
    $customer.setLastUpdated(new Date());
    update($customer);
end`,
            category: 'attribute',
            relatedKeywords: ['salience', 'agenda-group']
        }],
        
        ['agenda-group', {
            keyword: 'agenda-group',
            description: 'Groups rules for controlled execution. Only rules in the focus group can fire.',
            syntax: 'agenda-group "group-name"',
            example: `rule "Validation Rule"
    agenda-group "validation"
when
    $customer : Customer()
then
    // validation logic
end`,
            category: 'attribute',
            relatedKeywords: ['ruleflow-group', 'salience']
        }],
        
        ['ruleflow-group', {
            keyword: 'ruleflow-group',
            description: 'Associates a rule with a ruleflow group for process-driven rule execution.',
            syntax: 'ruleflow-group "group-name"',
            example: `rule "Process Order"
    ruleflow-group "order-processing"
when
    $order : Order(status == "NEW")
then
    $order.setStatus("PROCESSING");
end`,
            category: 'attribute',
            relatedKeywords: ['agenda-group', 'salience']
        }],
        
        ['lock-on-active', {
            keyword: 'lock-on-active',
            description: 'Prevents a rule from firing again while any rule in the same agenda group is executing.',
            syntax: 'lock-on-active [true|false]',
            example: `rule "Process Order"
    agenda-group "order-processing"
    lock-on-active true
when
    $order : Order(status == "NEW")
then
    $order.setStatus("PROCESSING");
    update($order);
end`,
            category: 'attribute',
            relatedKeywords: ['agenda-group', 'no-loop', 'salience']
        }],
        
        ['activation-group', {
            keyword: 'activation-group',
            description: 'Groups rules so that only one rule in the group can fire. Once one rule fires, all other rules in the group are cancelled.',
            syntax: 'activation-group "group-name"',
            example: `rule "High Value Customer"
    activation-group "customer-classification"
    salience 10
when
    $customer : Customer(totalPurchases > 10000)
then
    $customer.setCategory("PREMIUM");
end

rule "Regular Customer"
    activation-group "customer-classification"
    salience 5
when
    $customer : Customer(totalPurchases <= 10000)
then
    $customer.setCategory("REGULAR");
end`,
            category: 'attribute',
            relatedKeywords: ['agenda-group', 'salience']
        }],
        
        ['global', {
            keyword: 'global',
            description: 'Declares a global variable accessible to all rules.',
            syntax: 'global Type variableName',
            example: `global java.util.List results;

rule "Add Result"
when
    $customer : Customer(vip == true)
then
    results.add($customer.getName());
end`,
            category: 'rule',
            relatedKeywords: ['import', 'declare']
        }],
        
        ['import', {
            keyword: 'import',
            description: 'Imports Java classes for use in rules.',
            syntax: 'import fully.qualified.ClassName',
            example: `import java.util.Date;
import com.example.Customer;

rule "Check Date"
when
    $customer : Customer(birthDate before new Date())
then
    // actions
end`,
            category: 'rule',
            relatedKeywords: ['global', 'package']
        }],
        
        ['package', {
            keyword: 'package',
            description: 'Declares the package namespace for the rules file.',
            syntax: 'package package.name',
            example: `package com.example.rules;

rule "Example Rule"
when
    // conditions
then
    // actions
end`,
            category: 'rule',
            relatedKeywords: ['import', 'global']
        }],
        
        ['function', {
            keyword: 'function',
            description: 'Defines a custom function that can be called from rules.',
            syntax: 'function ReturnType functionName(parameters) { body }',
            example: `function boolean isEligible(Customer customer) {
    return customer.getAge() >= 18 && customer.getStatus().equals("ACTIVE");
}

rule "Check Eligibility"
when
    $customer : Customer(isEligible(this) == true)
then
    // actions
end`,
            category: 'function',
            relatedKeywords: ['global', 'import']
        }],
        
        ['query', {
            keyword: 'query',
            description: 'Defines a query to retrieve facts from working memory.',
            syntax: 'query queryName(parameters) pattern end',
            example: `query "customers by age"(int minAge)
    $customer : Customer(age >= minAge)
end`,
            category: 'rule',
            relatedKeywords: ['rule', 'end']
        }],
        
        ['declare', {
            keyword: 'declare',
            description: 'Declares a new fact type or modifies an existing one.',
            syntax: 'declare TypeName field1 : Type1 field2 : Type2 end',
            example: `declare Person
    name : String
    age : int
    email : String
end`,
            category: 'rule',
            relatedKeywords: ['end', 'global']
        }]
    ]);

    private static readonly FUNCTIONS: Map<string, DroolsFunctionDoc> = new Map([
        ['update', {
            name: 'update',
            description: 'Notifies the engine that a fact has been modified and should be re-evaluated.',
            parameters: [
                { name: 'fact', type: 'Object', description: 'The fact object that was modified' }
            ],
            returnType: 'void',
            example: `$customer.setStatus("VIP");
update($customer);`,
            category: 'builtin'
        }],
        
        ['insert', {
            name: 'insert',
            description: 'Inserts a new fact into working memory.',
            parameters: [
                { name: 'fact', type: 'Object', description: 'The fact object to insert' }
            ],
            returnType: 'FactHandle',
            example: `Customer newCustomer = new Customer("John", 25);
insert(newCustomer);`,
            category: 'builtin'
        }],
        
        ['delete', {
            name: 'delete',
            description: 'Removes a fact from working memory. Also known as retract.',
            parameters: [
                { name: 'fact', type: 'Object', description: 'The fact object to remove' }
            ],
            returnType: 'void',
            example: `delete($customer);`,
            category: 'builtin'
        }],
        
        ['retract', {
            name: 'retract',
            description: 'Removes a fact from working memory. Alias for delete.',
            parameters: [
                { name: 'fact', type: 'Object', description: 'The fact object to remove' }
            ],
            returnType: 'void',
            example: `retract($customer);`,
            category: 'builtin'
        }],
        
        ['modify', {
            name: 'modify',
            description: 'Modifies a fact and automatically calls update.',
            parameters: [
                { name: 'fact', type: 'Object', description: 'The fact object to modify' }
            ],
            returnType: 'void',
            example: `modify($customer) {
    setStatus("VIP"),
    setDiscount(0.15)
}`,
            category: 'builtin'
        }]
    ]);

    /**
     * Get documentation for a Drools keyword
     */
    public static getKeywordDoc(keyword: string): DroolsKeywordDoc | null {
        return this.KEYWORDS.get(keyword.toLowerCase()) || null;
    }

    /**
     * Get documentation for a Drools function
     */
    public static getFunctionDoc(functionName: string): DroolsFunctionDoc | null {
        return this.FUNCTIONS.get(functionName.toLowerCase()) || null;
    }

    /**
     * Get all keywords in a category
     */
    public static getKeywordsByCategory(category: DroolsKeywordDoc['category']): DroolsKeywordDoc[] {
        return Array.from(this.KEYWORDS.values()).filter(doc => doc.category === category);
    }

    /**
     * Search keywords by partial name
     */
    public static searchKeywords(query: string): DroolsKeywordDoc[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.KEYWORDS.values()).filter(doc => 
            doc.keyword.includes(lowerQuery) || 
            doc.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get related keywords for a given keyword
     */
    public static getRelatedKeywords(keyword: string): DroolsKeywordDoc[] {
        const doc = this.getKeywordDoc(keyword);
        if (!doc || !doc.relatedKeywords) return [];
        
        return doc.relatedKeywords
            .map(k => this.getKeywordDoc(k))
            .filter(d => d !== null) as DroolsKeywordDoc[];
    }

    /**
     * Check if a word is a Drools keyword
     */
    public static isKeyword(word: string): boolean {
        return this.KEYWORDS.has(word.toLowerCase());
    }

    /**
     * Check if a word is a Drools function
     */
    public static isFunction(word: string): boolean {
        return this.FUNCTIONS.has(word.toLowerCase());
    }

    /**
     * Get all available keywords
     */
    public static getAllKeywords(): string[] {
        return Array.from(this.KEYWORDS.keys());
    }

    /**
     * Get all available functions
     */
    public static getAllFunctions(): string[] {
        return Array.from(this.FUNCTIONS.keys());
    }
}