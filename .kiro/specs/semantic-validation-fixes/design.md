# Design Document

## Overview

This design addresses two critical bugs in the Drools VSCode extension's semantic validation system:

1. **Duplicate Semantic Validation**: The `validateSemantics` method is being called twice in the diagnostic provider - once at line 44 and again at line 1483, causing duplicate error messages.

2. **Incorrect Rule Name Validation**: The rule name validator at line 217 incorrectly flags quoted rule names with spaces as invalid because it only checks if the rule name starts with a quote, but doesn't properly handle the case where the rule name is already properly quoted.

## Architecture

### Current Issues Analysis

#### Issue 1: Duplicate Semantic Validation
```typescript
// In provideDiagnostics method - FIRST CALL (line 42-44)
if (this.settings.enableSemanticValidation) {
    this.validateSemantics(ast, diagnostics);
}

// Later in the same method - SECOND CALL (line 1481-1483)  
if (this.settings.enableSemanticValidation) {
    this.validateSemantics(ast, diagnostics);
}
```

#### Issue 2: Incorrect Rule Name Validation
```typescript
// Current problematic logic (line 217)
if (rule.name && /[\s\-\.]/.test(rule.name) && !rule.name.startsWith('"')) {
    // This fails for: rule "My Rule Name" because rule.name = "My Rule Name" 
    // which DOES start with quote, but the regex still matches the spaces inside
}
```

The issue is that `rule.name` includes the quotes when parsed, so a rule like:
```drools
rule "My Rule Name"
```
Results in `rule.name = "My Rule Name"`, but the validation logic doesn't properly handle this.

## Components and Interfaces

### 1. Validation Coordinator

```typescript
interface ValidationCoordinator {
    coordinateValidation(ast: DroolsAST, diagnostics: Diagnostic[]): void;
    isValidationAlreadyRun(validationType: ValidationType): boolean;
    markValidationComplete(validationType: ValidationType): void;
}

enum ValidationType {
    SYNTAX = 'syntax',
    SEMANTIC = 'semantic', 
    BEST_PRACTICE = 'best-practice',
    PERFORMANCE = 'performance'
}

class ValidationState {
    private completedValidations: Set<ValidationType> = new Set();
    
    reset(): void {
        this.completedValidations.clear();
    }
    
    isComplete(type: ValidationType): boolean {
        return this.completedValidations.has(type);
    }
    
    markComplete(type: ValidationType): void {
        this.completedValidations.add(type);
    }
}
```

### 2. Enhanced Rule Name Validator

```typescript
interface RuleNameValidator {
    validateRuleName(rule: RuleNode): RuleNameValidationResult;
    isQuotedRuleName(ruleName: string): boolean;
    extractUnquotedRuleName(ruleName: string): string;
    validateUnquotedRuleName(ruleName: string): ValidationIssue[];
    validateQuotedRuleName(ruleName: string): ValidationIssue[];
}

interface RuleNameValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    isQuoted: boolean;
    unquotedName: string;
}

interface ValidationIssue {
    severity: DiagnosticSeverity;
    message: string;
    suggestion?: string;
}

class EnhancedRuleNameValidator implements RuleNameValidator {
    validateRuleName(rule: RuleNode): RuleNameValidationResult {
        if (!rule.name || rule.name.trim() === '') {
            return {
                isValid: false,
                issues: [{
                    severity: DiagnosticSeverity.Error,
                    message: 'Rule must have a name'
                }],
                isQuoted: false,
                unquotedName: ''
            };
        }

        const isQuoted = this.isQuotedRuleName(rule.name);
        const unquotedName = this.extractUnquotedRuleName(rule.name);
        
        const issues = isQuoted ? 
            this.validateQuotedRuleName(rule.name) : 
            this.validateUnquotedRuleName(rule.name);

        return {
            isValid: issues.length === 0,
            issues,
            isQuoted,
            unquotedName
        };
    }

    isQuotedRuleName(ruleName: string): boolean {
        return ruleName.startsWith('"') && ruleName.endsWith('"') && ruleName.length >= 2;
    }

    extractUnquotedRuleName(ruleName: string): string {
        if (this.isQuotedRuleName(ruleName)) {
            return ruleName.slice(1, -1); // Remove surrounding quotes
        }
        return ruleName;
    }

    validateUnquotedRuleName(ruleName: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        // Check for spaces or special characters that require quoting
        if (/[\s\-\.]/.test(ruleName)) {
            issues.push({
                severity: DiagnosticSeverity.Warning,
                message: 'Rule names with spaces or special characters should be quoted',
                suggestion: `"${ruleName}"`
            });
        }

        // Check for invalid characters
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(ruleName)) {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: `Rule name "${ruleName}" contains invalid characters`
            });
        }

        return issues;
    }

    validateQuotedRuleName(ruleName: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const unquoted = this.extractUnquotedRuleName(ruleName);

        // Check for empty quoted name
        if (unquoted.trim() === '') {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: 'Quoted rule name cannot be empty'
            });
        }

        // Check for unescaped quotes inside
        if (unquoted.includes('"') && !unquoted.includes('\\"')) {
            issues.push({
                severity: DiagnosticSeverity.Error,
                message: 'Quotes inside rule names must be escaped with backslash'
            });
        }

        // Check for very long names
        if (unquoted.length > 100) {
            issues.push({
                severity: DiagnosticSeverity.Information,
                message: `Rule name is very long (${unquoted.length} characters)`,
                suggestion: 'Consider using a shorter, more concise name'
            });
        }

        return issues;
    }
}
```

### 3. Refactored Diagnostic Provider

```typescript
class RefactoredDiagnosticProvider {
    private validationState: ValidationState = new ValidationState();
    private ruleNameValidator: RuleNameValidator = new EnhancedRuleNameValidator();

    public provideDiagnostics(document: TextDocument, ast: DroolsAST, parseErrors: ParseError[]): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];
        
        // Reset validation state for new validation cycle
        this.validationState.reset();

        // Add parse errors first
        this.addParseErrorDiagnostics(parseErrors, diagnostics);

        // Coordinate all validation types to prevent duplication
        this.coordinateValidation(ast, diagnostics);

        return diagnostics.slice(0, this.settings.maxNumberOfProblems);
    }

    private coordinateValidation(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Syntax validation
        if (this.settings.enableSyntaxValidation && !this.validationState.isComplete(ValidationType.SYNTAX)) {
            this.validateSyntax(ast, diagnostics);
            this.validationState.markComplete(ValidationType.SYNTAX);
        }

        // Semantic validation - ONLY ONCE
        if (this.settings.enableSemanticValidation && !this.validationState.isComplete(ValidationType.SEMANTIC)) {
            this.validateSemantics(ast, diagnostics);
            this.validationState.markComplete(ValidationType.SEMANTIC);
        }

        // Best practice validation
        if (this.settings.enableBestPracticeWarnings && !this.validationState.isComplete(ValidationType.BEST_PRACTICE)) {
            this.validateBestPractices(ast, diagnostics);
            this.validationState.markComplete(ValidationType.BEST_PRACTICE);
        }
    }

    private validateSemantics(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        // Consolidated semantic validation - no duplication
        this.validateRuleStructureEnhanced(ast, diagnostics);
        this.validateDuplicateRuleNames(ast, diagnostics);
        this.validateImportStatements(ast, diagnostics);
        this.validateGlobalDeclarations(ast, diagnostics);
        this.validateFunctionDeclarations(ast, diagnostics);
        this.validateVariableUsage(ast, diagnostics);
        this.validateCrossReferences(ast, diagnostics);
    }

    private validateRuleStructureEnhanced(ast: DroolsAST, diagnostics: Diagnostic[]): void {
        for (const rule of ast.rules) {
            // Use enhanced rule name validator
            const nameValidation = this.ruleNameValidator.validateRuleName(rule);
            
            for (const issue of nameValidation.issues) {
                diagnostics.push({
                    range: rule.range,
                    message: issue.message,
                    severity: issue.severity,
                    source: 'drools-semantic'
                });
            }

            // Other rule structure validations...
            this.validateRuleClauseStructure(rule, diagnostics);
            this.validateRuleAttributes(rule, diagnostics);
        }
    }
}
```

## Data Models

### Validation State Management

```typescript
interface ValidationContext {
    document: TextDocument;
    ast: DroolsAST;
    parseErrors: ParseError[];
    settings: DiagnosticSettings;
    validationState: ValidationState;
}

interface ValidationResult {
    diagnostics: Diagnostic[];
    validationType: ValidationType;
    executionTime: number;
    success: boolean;
}

interface ValidationMetrics {
    totalValidationTime: number;
    validationCounts: Map<ValidationType, number>;
    duplicatePreventionCount: number;
}
```

### Rule Name Validation Models

```typescript
interface RuleNameInfo {
    originalName: string;
    isQuoted: boolean;
    unquotedName: string;
    hasSpaces: boolean;
    hasSpecialChars: boolean;
    length: number;
    containsInvalidChars: boolean;
}

interface RuleNameSuggestion {
    type: 'quote' | 'unquote' | 'rename' | 'escape';
    suggestedName: string;
    reason: string;
}
```

## Error Handling

### Validation Error Recovery

```typescript
class ValidationErrorHandler {
    handleValidationError(error: Error, validationType: ValidationType, context: ValidationContext): void {
        console.error(`Validation error in ${validationType}:`, error);
        
        // Don't let one validation type failure break others
        try {
            this.reportValidationFailure(validationType, error, context);
        } catch (reportingError) {
            console.error('Failed to report validation error:', reportingError);
        }
    }

    private reportValidationFailure(validationType: ValidationType, error: Error, context: ValidationContext): void {
        // Add a diagnostic about the validation failure
        const diagnostic: Diagnostic = {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: `Internal validation error in ${validationType}: ${error.message}`,
            severity: DiagnosticSeverity.Information,
            source: 'drools-internal'
        };
        
        // This would be added to diagnostics in a safe way
    }
}
```

### Graceful Degradation

1. **Partial Validation**: If one validation type fails, others continue
2. **Fallback Logic**: If enhanced validation fails, fall back to basic validation
3. **Error Isolation**: Validation errors don't propagate to other components
4. **Recovery Strategies**: Automatic retry with simpler validation logic

## Testing Strategy

### Unit Tests

1. **Validation Coordination Tests**
   - Test that semantic validation runs exactly once
   - Test validation state management
   - Test coordination between different validation types

2. **Rule Name Validation Tests**
   - Test quoted rule names with spaces (should be valid)
   - Test unquoted rule names with spaces (should warn)
   - Test edge cases: empty names, special characters, Unicode
   - Test escape sequences in quoted names

3. **Error Handling Tests**
   - Test validation error recovery
   - Test graceful degradation scenarios
   - Test partial validation completion

### Integration Tests

1. **End-to-End Validation Tests**
   - Test complete validation cycle without duplication
   - Test performance with large files
   - Test validation coordination across multiple files

2. **Regression Tests**
   - Test that existing valid syntax still works
   - Test that previous bugs don't reappear
   - Test backward compatibility

### Test Cases

```drools
// Valid quoted rule names (should not generate errors)
rule "My Rule With Spaces"
when
    $p : Person()
then
    System.out.println("Valid");
end

rule "Rule-With-Dashes"
when
    $p : Person()
then
    System.out.println("Valid");
end

rule "Rule.With.Dots"
when
    $p : Person()
then
    System.out.println("Valid");
end

// Invalid unquoted rule names (should generate warnings)
rule My Rule With Spaces  // Should warn: needs quotes
when
    $p : Person()
then
    System.out.println("Invalid");
end

// Edge cases
rule ""  // Should error: empty name
when
    $p : Person()
then
    System.out.println("Invalid");
end

rule "Rule with \"unescaped\" quotes"  // Should error: unescaped quotes
when
    $p : Person()
then
    System.out.println("Invalid");
end
```

## Performance Considerations

### Optimization Strategies

1. **Validation Caching**: Cache validation results to avoid redundant work
2. **Lazy Validation**: Only validate changed sections when possible
3. **Validation Batching**: Group similar validations together
4. **Early Exit**: Stop validation early when critical errors are found

### Memory Management

1. **Validation State Cleanup**: Clear validation state after each cycle
2. **Diagnostic Deduplication**: Remove duplicate diagnostics efficiently
3. **Resource Pooling**: Reuse validation objects where possible

### Performance Metrics

```typescript
interface PerformanceMetrics {
    validationDuration: number;
    duplicatesPrevented: number;
    memoryUsage: number;
    cacheHitRate: number;
}
```

## Migration Strategy

### Phase 1: Fix Duplicate Validation
- Remove duplicate `validateSemantics` call
- Add validation state management
- Test that semantic validation runs only once

### Phase 2: Fix Rule Name Validation
- Implement enhanced rule name validator
- Replace existing rule name validation logic
- Add comprehensive test cases

### Phase 3: Integration and Testing
- Integrate both fixes
- Run comprehensive test suite
- Performance testing and optimization

### Phase 4: Monitoring and Maintenance
- Add validation metrics collection
- Monitor for regression issues
- Documentation updates

## Backward Compatibility

### Ensuring Compatibility

1. **API Preservation**: Keep existing diagnostic provider interface
2. **Settings Compatibility**: Maintain existing validation settings
3. **Error Message Consistency**: Keep error messages similar where possible
4. **Gradual Migration**: Allow fallback to old validation logic if needed

### Migration Safety

1. **Feature Flags**: Allow disabling new validation logic
2. **Rollback Plan**: Easy way to revert to previous validation
3. **Monitoring**: Track validation performance and accuracy
4. **User Feedback**: Collect feedback on validation improvements