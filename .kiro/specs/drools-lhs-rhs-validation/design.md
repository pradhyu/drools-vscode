# Design Document

## Overview

This design enhances the Drools VSCode extension's grammar validation system to properly distinguish between Left Hand Side (LHS) and Right Hand Side (RHS) syntax validation. The current system treats both sides similarly, but they have fundamentally different syntax rules:

- **LHS (when clause)**: Uses Drools-specific pattern matching syntax with $variables, constraints, and operators
- **RHS (then clause)**: Uses pure Java syntax where $variables from LHS are accessible but Drools-specific operators are invalid

## Architecture

### Core Components

1. **LHS Validator**: Validates Drools pattern matching syntax in when clauses
2. **RHS Validator**: Validates Java syntax in then clauses with $variable support
3. **Variable Context Manager**: Tracks $variables declared in LHS for RHS validation
4. **Context-Aware Error Reporter**: Provides appropriate error messages based on LHS/RHS context
5. **Enhanced Completion Provider**: Offers context-specific completions

### Integration Points

- **Grammar Validator**: Enhanced to delegate to LHS/RHS specific validators
- **Diagnostic Provider**: Updated to use context-aware validation
- **Completion Provider**: Modified to provide context-specific suggestions
- **Parser**: Extended to better track variable declarations and usage

## Components and Interfaces

### 1. LHS Validator

```typescript
interface LHSValidator {
    validateWhenClause(whenClause: WhenNode, sourceText: string): ValidationResult;
    validateDroolsOperators(expression: string, position: Position): OperatorValidation[];
    validatePatternSyntax(pattern: string, position: Position): PatternValidation[];
    validateConstraints(constraints: ConstraintNode[], position: Position): ConstraintValidation[];
}

interface DroolsOperator {
    name: string;
    syntax: string;
    description: string;
    validInLHS: boolean;
    validInRHS: boolean;
}

const DROOLS_OPERATORS: DroolsOperator[] = [
    { name: 'matches', syntax: 'field matches "regex"', description: 'Regular expression matching', validInLHS: true, validInRHS: false },
    { name: 'contains', syntax: 'field contains value', description: 'Collection/string contains', validInLHS: true, validInRHS: false },
    { name: 'memberOf', syntax: 'field memberOf collection', description: 'Collection membership', validInLHS: true, validInRHS: false },
    { name: 'soundslike', syntax: 'field soundslike "value"', description: 'Phonetic matching', validInLHS: true, validInRHS: false },
    { name: 'str', syntax: 'str[startsWith] "value"', description: 'String operations', validInLHS: true, validInRHS: false }
];
```

### 2. RHS Validator

```typescript
interface RHSValidator {
    validateThenClause(thenClause: ThenNode, variableContext: VariableContext, sourceText: string): ValidationResult;
    validateJavaSyntax(javaCode: string, position: Position): JavaValidation[];
    validateVariableUsage(variables: string[], declaredVariables: VariableContext): VariableValidation[];
    validateDroolsOperatorsInRHS(expression: string, position: Position): OperatorValidation[];
}

interface JavaSyntaxRule {
    pattern: RegExp;
    description: string;
    errorMessage: string;
    suggestion?: string;
}

const JAVA_SYNTAX_RULES: JavaSyntaxRule[] = [
    {
        pattern: /\bmatches\b/,
        description: 'Drools matches operator not valid in RHS',
        errorMessage: 'Use Java String.matches() method instead of Drools matches operator',
        suggestion: 'variable.matches("regex")'
    },
    {
        pattern: /\bcontains\b/,
        description: 'Drools contains operator not valid in RHS',
        errorMessage: 'Use Java Collection.contains() or String.contains() method',
        suggestion: 'collection.contains(value) or string.contains(substring)'
    }
];
```

### 3. Variable Context Manager

```typescript
interface VariableContext {
    declaredVariables: Map<string, VariableInfo>;
    usedVariables: Set<string>;
    unusedVariables: Set<string>;
    undeclaredVariables: Set<string>;
}

interface VariableInfo {
    name: string;
    factType?: string;
    declarationPosition: Position;
    usagePositions: Position[];
    inferredType?: string;
}

class VariableContextManager {
    extractLHSVariables(whenClause: WhenNode): VariableContext;
    validateRHSVariables(thenClause: ThenNode, context: VariableContext): VariableValidation[];
    trackVariableUsage(expression: string, context: VariableContext, position: Position): void;
    inferVariableTypes(conditions: ConditionNode[]): Map<string, string>;
}
```

### 4. Enhanced Grammar Validator

```typescript
class EnhancedGrammarValidator extends GrammarValidator {
    private lhsValidator: LHSValidator;
    private rhsValidator: RHSValidator;
    private variableContextManager: VariableContextManager;

    validateRule(rule: RuleNode, sourceText: string): GrammarValidationResult {
        const variableContext = this.variableContextManager.extractLHSVariables(rule.when);
        
        const lhsResult = rule.when ? 
            this.lhsValidator.validateWhenClause(rule.when, sourceText) : 
            { isValid: true, violations: [], warnings: [] };
            
        const rhsResult = rule.then ? 
            this.rhsValidator.validateThenClause(rule.then, variableContext, sourceText) : 
            { isValid: true, violations: [], warnings: [] };
            
        const variableResult = this.variableContextManager.validateRHSVariables(rule.then, variableContext);
        
        return this.combineResults([lhsResult, rhsResult, variableResult]);
    }
}
```

## Data Models

### Validation Results

```typescript
interface ValidationResult {
    isValid: boolean;
    violations: GrammarViolation[];
    warnings: GrammarWarning[];
    context: 'LHS' | 'RHS' | 'VARIABLE';
}

interface ContextualGrammarViolation extends GrammarViolation {
    context: 'LHS' | 'RHS' | 'VARIABLE';
    suggestion?: string;
    quickFix?: QuickFix;
}

interface QuickFix {
    title: string;
    edit: TextEdit;
    kind: 'replace' | 'insert' | 'delete';
}
```

### Enhanced AST Nodes

```typescript
interface EnhancedWhenNode extends WhenNode {
    declaredVariables: VariableInfo[];
    droolsOperators: DroolsOperatorUsage[];
}

interface EnhancedThenNode extends ThenNode {
    usedVariables: string[];
    javaStatements: JavaStatement[];
    invalidDroolsOperators: DroolsOperatorUsage[];
}

interface DroolsOperatorUsage {
    operator: string;
    position: Position;
    context: 'LHS' | 'RHS';
    isValid: boolean;
}
```

## Error Handling

### Context-Aware Error Messages

```typescript
class ContextualErrorReporter {
    reportLHSError(violation: GrammarViolation): Diagnostic {
        return {
            ...violation,
            message: `[LHS] ${violation.message}`,
            source: 'drools-lhs-validator'
        };
    }
    
    reportRHSError(violation: GrammarViolation): Diagnostic {
        return {
            ...violation,
            message: `[RHS] ${violation.message}`,
            source: 'drools-rhs-validator'
        };
    }
    
    reportVariableError(violation: VariableValidation): Diagnostic {
        const contextMessage = violation.context === 'undeclared' ? 
            'Variable used in RHS but not declared in LHS' :
            'Variable declared in LHS but never used in RHS';
            
        return {
            range: violation.range,
            message: `[Variable] ${contextMessage}: ${violation.variable}`,
            severity: violation.severity,
            source: 'drools-variable-validator'
        };
    }
}
```

### Error Recovery Strategies

1. **Partial Validation**: Continue validation even when syntax errors are found
2. **Context Preservation**: Maintain LHS/RHS context even with malformed code
3. **Graceful Degradation**: Fall back to basic validation when advanced validation fails
4. **Error Boundaries**: Isolate validation errors to prevent cascading failures

## Testing Strategy

### Unit Tests

1. **LHS Validator Tests**
   - Valid Drools pattern syntax
   - Invalid operators in LHS context
   - Complex constraint validation
   - Multi-line pattern validation

2. **RHS Validator Tests**
   - Valid Java syntax validation
   - Invalid Drools operators in RHS
   - Variable usage validation
   - Java statement parsing

3. **Variable Context Tests**
   - Variable declaration extraction
   - Variable usage tracking
   - Type inference validation
   - Cross-reference validation

### Integration Tests

1. **End-to-End Rule Validation**
   - Complete rule validation with LHS/RHS distinction
   - Variable flow from LHS to RHS
   - Error message accuracy and context

2. **Performance Tests**
   - Large file validation performance
   - Complex rule validation timing
   - Memory usage with extensive variable tracking

### Test Data

```drools
// Valid LHS/RHS distinction
rule "Valid Rule"
when
    $person : Person(age > 18, name matches "John.*")
    $address : Address(city contains "New York")
then
    System.out.println("Person: " + $person.getName());
    $person.setStatus("adult");
end

// Invalid - Drools operators in RHS
rule "Invalid Rule"
when
    $person : Person(age > 18)
then
    if ($person.name matches "John.*") {  // ERROR: matches not valid in RHS
        System.out.println("Found John");
    }
end

// Invalid - Undeclared variable in RHS
rule "Undeclared Variable"
when
    $person : Person(age > 18)
then
    System.out.println($customer.getName());  // ERROR: $customer not declared
end
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Validation**: Only validate changed sections
2. **Caching**: Cache variable contexts and validation results
3. **Incremental Updates**: Update validation incrementally on document changes
4. **Parallel Processing**: Validate LHS and RHS in parallel where possible

### Memory Management

1. **Variable Context Cleanup**: Clean up unused variable contexts
2. **Validation Result Pooling**: Reuse validation result objects
3. **AST Node Optimization**: Minimize memory footprint of enhanced AST nodes

## Migration Strategy

### Phase 1: Core Infrastructure
- Implement LHS/RHS validator interfaces
- Create variable context manager
- Update grammar validator base class

### Phase 2: Validation Logic
- Implement LHS validation rules
- Implement RHS validation rules
- Add variable cross-reference validation

### Phase 3: Integration
- Update diagnostic provider
- Enhance completion provider
- Add context-aware error reporting

### Phase 4: Testing and Optimization
- Comprehensive test suite
- Performance optimization
- Documentation and examples