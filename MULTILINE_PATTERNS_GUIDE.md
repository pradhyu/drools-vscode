# Multi-line Patterns Guide

This comprehensive guide covers all aspects of multi-line pattern support in the Drools VSCode extension, including syntax, features, best practices, and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Supported Pattern Types](#supported-pattern-types)
3. [Extension Features](#extension-features)
4. [Syntax Examples](#syntax-examples)
5. [Best Practices](#best-practices)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)
8. [Performance Considerations](#performance-considerations)

## Overview

Multi-line patterns in Drools allow you to write complex condition expressions that span multiple lines, making your rules more readable and maintainable. The VSCode extension provides comprehensive support for all multi-line pattern types with intelligent parsing, syntax highlighting, error detection, and formatting.

### What are Multi-line Patterns?

Multi-line patterns are Drools condition expressions where the opening and closing parentheses are on different lines, allowing for better code organization and readability:

```drools
// Single-line pattern (traditional)
exists(Person(age > 18, name != null))

// Multi-line pattern (improved readability)
exists(
    Person(
        age > 18,
        name != null
    )
)
```

## Supported Pattern Types

The extension supports all standard Drools multi-line pattern constructs:

### 1. Exists Patterns

Check if at least one fact matches the specified conditions.

```drools
rule "Adult Person Exists"
when
    exists(
        Person(
            age >= 18,
            status == "ACTIVE"
        )
    )
then
    // Action when at least one adult person exists
end
```

### 2. Not Patterns

Ensure no facts match the specified conditions.

```drools
rule "No Suspended Accounts"
when
    $person : Person()
    not(
        Account(
            owner == $person,
            status == "SUSPENDED"
        )
    )
then
    // Action when person has no suspended accounts
end
```

### 3. Eval Patterns

Execute complex boolean expressions.

```drools
rule "Complex Evaluation"
when
    $person : Person()
    eval(
        $person.getAge() > 21 &&
        $person.getName() != null &&
        $person.getName().length() > 2
    )
then
    // Action when evaluation is true
end
```

### 4. Forall Patterns

Universal quantification - all facts matching the first pattern must also match the second.

```drools
rule "All Orders Validated"
when
    $customer : Customer()
    forall(
        Order(
            customer == $customer,
            status == "SUBMITTED"
        )
        Order(
            customer == $customer,
            status == "SUBMITTED",
            validated == true
        )
    )
then
    // Action when all submitted orders are validated
end
```

### 5. Collect Patterns

Collect matching facts into a collection.

```drools
rule "High Priority Orders"
when
    $customer : Customer()
    $orders : List() from collect(
        Order(
            customer == $customer,
            priority == "HIGH",
            status == "PENDING"
        )
    )
    eval($orders.size() >= 3)
then
    // Process collected high-priority orders
end
```

### 6. Accumulate Patterns

Perform calculations on matching facts.

```drools
rule "Total Customer Spending"
when
    $customer : Customer()
    $total : Number() from accumulate(
        Order(
            customer == $customer,
            status == "COMPLETED"
        ),
        sum(total)
    )
    eval($total.doubleValue() > 10000)
then
    // Action for high-spending customers
end
```

## Extension Features

### Syntax Highlighting

- **Pattern Keywords**: `exists`, `not`, `eval`, `forall`, `collect`, `accumulate`
- **Bracket Matching**: Visual matching of parentheses across lines
- **Nested Highlighting**: Consistent coloring for nested patterns
- **Context Awareness**: Different highlighting based on pattern context

### Error Detection

- **Unmatched Parentheses**: Real-time detection of bracket mismatches
- **Incomplete Patterns**: Validation of pattern completeness
- **Context Errors**: Semantic validation within pattern contexts
- **Helpful Messages**: Clear error descriptions with suggested fixes

### Code Completion

- **Keyword Completion**: Smart suggestions for pattern keywords
- **Fact Type Completion**: Available fact types within patterns
- **Operator Completion**: Context-appropriate operators
- **Variable Completion**: Variables from outer scopes

### Formatting

- **Auto-Indentation**: Proper nesting indentation
- **Bracket Alignment**: Aligned closing parentheses
- **Consistent Spacing**: Uniform spacing within patterns
- **Format-on-Save**: Automatic formatting when saving files

### Code Navigation

- **Bracket Matching**: Jump between matching brackets
- **Code Folding**: Collapse multi-line patterns
- **Document Outline**: Pattern structure in outline view
- **Go-to-Definition**: Navigate to referenced elements

## Syntax Examples

### Basic Multi-line Structure

```drools
rule "Basic Multi-line Example"
when
    // Pattern keyword followed by opening parenthesis
    exists(
        // Fact pattern with conditions
        Person(
            field1 == value1,
            field2 > value2,
            field3 != null
        )
    )
then
    // Rule action
end
```

### Nested Patterns

```drools
rule "Nested Pattern Example"
when
    $customer : Customer()
    exists(
        Order(
            customer == $customer,
            total > 500
        ) and
        not(
            Payment(
                order.customer == $customer,
                status == "FAILED"
            )
        )
    )
then
    // Action for customers with successful high-value orders
end
```

### Complex Mixed Patterns

```drools
rule "Complex Business Logic"
when
    $customer : Customer(status == "ACTIVE")
    
    // Check for recent orders
    exists(
        Order(
            customer == $customer,
            timestamp > (System.currentTimeMillis() - 2592000000L)
        )
    )
    
    // Calculate spending
    $spending : Number() from accumulate(
        Order(
            customer == $customer,
            status == "COMPLETED"
        ),
        sum(total)
    )
    
    // Collect pending orders
    $pendingOrders : List() from collect(
        Order(
            customer == $customer,
            status == "PENDING"
        )
    )
    
    // Final validation
    eval(
        $spending.doubleValue() > 1000 &&
        $pendingOrders.size() <= 2
    )
then
    // Complex business action
end
```

## Best Practices

### 1. Consistent Indentation

Use consistent indentation (4 spaces recommended) for better readability:

```drools
// ✅ Good: Consistent 4-space indentation
exists(
    Person(
        age > 18,
        name != null
    )
)

// ❌ Bad: Inconsistent indentation
exists(
  Person(
      age > 18,
    name != null
  )
)
```

### 2. Logical Grouping

Group related conditions together:

```drools
// ✅ Good: Logical grouping
exists(
    // Personal information
    Person(
        age > 18,
        name != null,
        email != null
    ) and
    // Account information
    Account(
        owner == person,
        status == "ACTIVE",
        balance > 0
    )
)
```

### 3. Avoid Deep Nesting

Limit nesting depth to maintain readability:

```drools
// ❌ Bad: Too deeply nested
exists(
    Person() and
    not(
        Order() and
        not(
            Payment() and
            exists(Refund())
        )
    )
)

// ✅ Better: Simplified logic
exists(Person() and Order())
not(exists(Payment() and Refund()))
```

### 4. Use Meaningful Variable Names

```drools
// ✅ Good: Descriptive variable names
rule "Process Premium Customer Orders"
when
    $premiumCustomer : Customer(tier == "PREMIUM")
    $highValueOrders : List() from collect(
        Order(
            customer == $premiumCustomer,
            total > 1000
        )
    )
then
    // Process orders
end
```

### 5. Comment Complex Logic

```drools
rule "Complex Customer Analysis"
when
    $customer : Customer()
    
    // Check for recent high-value activity
    exists(
        Order(
            customer == $customer,
            total > 500,
            timestamp > (System.currentTimeMillis() - 2592000000L) // 30 days
        )
    )
    
    // Ensure no payment issues
    not(
        Payment(
            customer == $customer,
            status == "FAILED",
            timestamp > (System.currentTimeMillis() - 604800000L) // 7 days
        )
    )
then
    // Apply customer benefits
end
```

## Configuration

### Extension Settings

Configure multi-line pattern behavior in VS Code settings:

```json
{
    // Formatting settings
    "drools.formatting.formatOnSave": true,
    "drools.formatting.indentSize": 4,
    "drools.formatting.alignClosingParentheses": true,
    
    // Completion settings
    "drools.completion.enableKeywords": true,
    "drools.completion.enableFactTypes": true,
    "drools.completion.maxItems": 50,
    
    // Diagnostic settings
    "drools.diagnostics.enableSyntaxValidation": true,
    "drools.diagnostics.enableBestPracticeWarnings": true,
    
    // Performance settings
    "drools.performance.enableCaching": true,
    "drools.performance.maxPatternDepth": 5
}
```

### Language Configuration

The extension automatically configures bracket pairs for multi-line patterns:

```json
{
    "brackets": [
        ["(", ")"],
        ["{", "}"],
        ["[", "]"]
    ],
    "autoClosingPairs": [
        {"open": "(", "close": ")"},
        {"open": "{", "close": "}"},
        {"open": "[", "close": "]"}
    ]
}
```

## Troubleshooting

### Common Issues

1. **Syntax Highlighting Not Working**
   - Check parentheses balance
   - Verify proper indentation
   - Restart language server

2. **Unmatched Parentheses Errors**
   - Check for missing commas between conditions
   - Verify proper nesting structure
   - Look for parentheses in string literals

3. **Formatting Issues**
   - Configure indentation settings
   - Check for mixed tabs and spaces
   - Use manual formatting commands

4. **Performance Problems**
   - Limit pattern nesting depth
   - Enable caching in settings
   - Break complex patterns into simpler ones

For detailed troubleshooting, see [MULTILINE_PATTERNS_TROUBLESHOOTING.md](MULTILINE_PATTERNS_TROUBLESHOOTING.md).

## Performance Considerations

### Optimization Tips

1. **Limit Nesting Depth**: Keep patterns under 4-5 levels deep
2. **Use Caching**: Enable performance caching in settings
3. **Break Complex Patterns**: Split very complex patterns into multiple rules
4. **Optimize Conditions**: Place most selective conditions first

### Performance Settings

```json
{
    "drools.performance.enableCaching": true,
    "drools.performance.debounceMs": 300,
    "drools.performance.maxPatternDepth": 5,
    "drools.performance.enableIncrementalParsing": true
}
```

## Additional Resources

- **[Complete Examples](examples/multiline-patterns-examples.drl)** - Comprehensive pattern examples
- **[Troubleshooting Guide](MULTILINE_PATTERNS_TROUBLESHOOTING.md)** - Detailed problem solutions
- **[Extension Documentation](README.md)** - Full extension documentation
- **[GitHub Issues](https://github.com/drools-community/drools-vscode-extension/issues)** - Report problems or request features

---

This guide covers the essential aspects of multi-line pattern support in the Drools VSCode extension. For additional help or to report issues, please visit our [GitHub repository](https://github.com/drools-community/drools-vscode-extension).