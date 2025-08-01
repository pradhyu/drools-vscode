# Multi-line Patterns Troubleshooting Guide

This guide helps you resolve common issues when working with multi-line patterns in Drools using the VSCode extension.

## Common Issues and Solutions

### 1. Syntax Highlighting Not Working Across Lines

**Problem**: Multi-line patterns lose syntax highlighting after the first line.

**Symptoms**:
- Keywords like `exists`, `not`, `eval` are highlighted on the first line but not within the pattern
- Parentheses matching doesn't work across lines
- Code appears as plain text after line breaks

**Solution**:
```drools
// ❌ Incorrect: Missing proper structure
rule "Bad Example"
when
    exists(Person(age > 18
    name != null))
then
    // action
end

// ✅ Correct: Proper multi-line structure
rule "Good Example"
when
    exists(
        Person(
            age > 18,
            name != null
        )
    )
then
    // action
end
```

**Troubleshooting Steps**:
1. Ensure parentheses are properly balanced
2. Check that each condition ends with a comma (except the last one)
3. Verify proper indentation alignment
4. Restart the language server: `Ctrl+Shift+P` → "Developer: Reload Window"

### 2. Unmatched Parentheses Errors

**Problem**: Extension reports parentheses mismatch errors even when they appear balanced.

**Symptoms**:
- Red squiggly lines under parentheses
- Error message: "Unmatched opening/closing parenthesis"
- Incorrect bracket matching highlights

**Common Causes and Solutions**:

#### Missing Comma in Conditions
```drools
// ❌ Missing comma causes parsing issues
exists(
    Person(age > 18
           name != null)  // Missing comma after age > 18
)

// ✅ Proper comma placement
exists(
    Person(
        age > 18,
        name != null
    )
)
```

#### Incorrect Nesting
```drools
// ❌ Improper nesting structure
exists(
    Person(age > 18) and
    not(Account(balance < 0)  // Missing closing parenthesis
)

// ✅ Proper nesting with balanced parentheses
exists(
    Person(age > 18) and
    not(
        Account(balance < 0)
    )
)
```

#### String Literals with Parentheses
```drools
// ❌ Parentheses in strings can confuse parser
Person(description == "Account (active)")

// ✅ Use proper escaping or different quotes
Person(description == "Account \\(active\\)")
// or
Person(description == 'Account (active)')
```

### 3. Formatting Issues

**Problem**: Auto-formatting doesn't work correctly with multi-line patterns.

**Symptoms**:
- Inconsistent indentation after formatting
- Closing parentheses not aligned properly
- Code becomes less readable after format-on-save

**Solutions**:

#### Configure Indentation Settings
```json
// In VS Code settings.json
{
    "drools.formatting.indentSize": 4,
    "drools.formatting.formatOnSave": true,
    "drools.formatting.alignClosingParentheses": true
}
```

#### Manual Formatting Best Practices
```drools
// ✅ Recommended formatting style
rule "Well Formatted Multi-line"
when
    exists(
        Person(
            age > 18,
            status == "ACTIVE"
        ) and
        Account(
            owner == person,
            balance > 1000
        )
    )
then
    // action
end
```

### 4. Code Completion Not Working in Multi-line Patterns

**Problem**: IntelliSense doesn't provide suggestions within multi-line patterns.

**Symptoms**:
- No keyword completions inside `exists()`, `not()`, etc.
- Missing fact type suggestions
- No operator completions

**Solutions**:

#### Check Cursor Position
```drools
rule "Completion Example"
when
    exists(
        Person(
            age > 18,
            |  // Place cursor here for field completions
        )
    )
then
    // action
end
```

#### Enable Completion Settings
```json
{
    "drools.completion.enableKeywords": true,
    "drools.completion.enableFactTypes": true,
    "drools.completion.maxItems": 50
}
```

#### Trigger Completion Manually
- Use `Ctrl+Space` (Windows/Linux) or `Cmd+Space` (Mac) to trigger completion
- Wait for the parser to process multi-line context (may take a moment)

### 5. Performance Issues with Large Multi-line Patterns

**Problem**: Extension becomes slow or unresponsive with complex multi-line patterns.

**Symptoms**:
- Delayed syntax highlighting
- Slow typing response
- High CPU usage
- Extension timeouts

**Solutions**:

#### Optimize Pattern Complexity
```drools
// ❌ Overly complex nested pattern
exists(
    Person() and
    not(
        Order() and
        not(
            Payment() and
            exists(
                Refund() and
                not(Approval())
            )
        )
    )
)

// ✅ Break into simpler patterns
exists(Person() and Order())
not(exists(Payment() and Refund()))
```

#### Adjust Performance Settings
```json
{
    "drools.performance.enableCaching": true,
    "drools.performance.debounceMs": 300,
    "drools.performance.maxPatternDepth": 5
}
```

### 6. Error Recovery Issues

**Problem**: Extension doesn't recover well from syntax errors in multi-line patterns.

**Symptoms**:
- Entire file shows as invalid after one error
- Syntax highlighting breaks completely
- No completions available anywhere in file

**Solutions**:

#### Fix Syntax Errors Incrementally
1. Start with the innermost pattern and work outward
2. Ensure each level has balanced parentheses
3. Check for missing commas between conditions
4. Verify proper keyword usage

#### Use Temporary Comments
```drools
rule "Debug Multi-line Pattern"
when
    exists(
        Person(age > 18)
        // TODO: Add more conditions here
    )
then
    // action
end
```

### 7. Mixed Single-line and Multi-line Patterns

**Problem**: Issues when mixing single-line and multi-line patterns in the same rule.

**Example Problem**:
```drools
// ❌ Inconsistent pattern styles
rule "Mixed Patterns"
when
    Person(age > 18) and exists(
        Account(
            balance > 0
        )
    ) and Order(status == "ACTIVE")
then
    // action
end
```

**Solution**:
```drools
// ✅ Consistent multi-line style
rule "Consistent Patterns"
when
    Person(age > 18) and
    exists(
        Account(balance > 0)
    ) and
    Order(status == "ACTIVE")
then
    // action
end
```

## Diagnostic Commands

### Check Extension Status
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Developer: Show Running Extensions"
3. Verify "Drools Language Support" is active

### Restart Language Server
1. Command Palette → "Developer: Reload Window"
2. Or restart VS Code completely

### View Extension Logs
1. View → Output
2. Select "Drools Language Server" from dropdown
3. Check for error messages

### Validate Grammar Compliance
```bash
# If you have the extension source code
npm run test:grammar
npm run test:multiline-patterns
```

## Best Practices Summary

### ✅ Do's
- Use consistent indentation (4 spaces recommended)
- Balance all parentheses carefully
- Add commas between conditions
- Keep nesting levels reasonable (max 3-4 levels)
- Use meaningful variable names
- Group related conditions logically

### ❌ Don'ts
- Don't mix tabs and spaces for indentation
- Don't create overly deep nesting (>4 levels)
- Don't forget commas between conditions
- Don't use parentheses in string literals without escaping
- Don't ignore syntax error indicators

## Getting Help

If you continue to experience issues:

1. **Check the GitHub Issues**: [Extension Issues](https://github.com/drools-community/drools-vscode-extension/issues)
2. **Create a Minimal Example**: Reduce your code to the smallest example that reproduces the issue
3. **Include Environment Details**:
   - VS Code version
   - Extension version
   - Operating system
   - Sample code that demonstrates the problem

## Advanced Debugging

### Enable Debug Logging
```json
{
    "drools.server.logLevel": "debug",
    "drools.diagnostics.enableVerboseLogging": true
}
```

### Test with Minimal Configuration
Create a test workspace with minimal settings to isolate configuration issues:

```json
// .vscode/settings.json in test workspace
{
    "drools.formatting.formatOnSave": false,
    "drools.completion.enableKeywords": true,
    "drools.diagnostics.enableSyntaxValidation": true
}
```

### Performance Profiling
Monitor extension performance:
1. Help → Toggle Developer Tools
2. Go to Performance tab
3. Record while editing multi-line patterns
4. Analyze for bottlenecks

---

For additional support, visit the [extension documentation](https://github.com/drools-community/drools-vscode-extension/wiki) or join the [community discussions](https://github.com/drools-community/drools-vscode-extension/discussions).