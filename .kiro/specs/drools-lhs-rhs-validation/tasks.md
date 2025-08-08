# Implementation Plan

- [ ] 1. Create core validation interfaces and data structures
  - Define LHSValidator, RHSValidator, and VariableContextManager interfaces
  - Create VariableContext, VariableInfo, and ValidationResult data structures
  - Implement DroolsOperator and JavaSyntaxRule configuration objects
  - Add enhanced AST node interfaces for context-aware validation
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 2. Implement Variable Context Manager
  - Create VariableContextManager class with variable extraction from LHS
  - Implement extractLHSVariables method to parse $variable declarations from when clauses
  - Add variable usage tracking functionality for RHS validation
  - Implement type inference for variables based on fact type patterns
  - Create variable cross-reference validation between LHS and RHS
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Implement LHS Validator for Drools-specific syntax
  - Create LHSValidator class with validateWhenClause method
  - Add validation for Drools operators (matches, contains, memberOf, soundslike, str[])
  - Implement pattern syntax validation for fact type constraints
  - Add constraint expression validation within pattern matching
  - Validate Drools keywords (exists, not, eval, forall, collect, accumulate) in LHS context
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Implement RHS Validator for Java syntax
  - Create RHSValidator class with validateThenClause method
  - Add Java syntax validation rules and pattern matching
  - Implement detection of invalid Drools operators in RHS context
  - Add validation for Java method calls and control structures
  - Create validation for $variable usage in Java expressions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Create context-aware error reporting system
  - Implement ContextualErrorReporter class with LHS/RHS specific error messages
  - Add error message formatting that distinguishes between LHS and RHS contexts
  - Create suggestion system for common LHS/RHS syntax errors
  - Implement QuickFix functionality for automatic error correction
  - Add error recovery strategies for partial validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Enhance Grammar Validator with LHS/RHS distinction
  - Extend existing GrammarValidator class to use new LHS/RHS validators
  - Update validateRule method to delegate to appropriate context validators
  - Integrate variable context management into rule validation flow
  - Add result combination logic for LHS, RHS, and variable validation results
  - Ensure backward compatibility with existing validation functionality
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 7. Update Diagnostic Provider for context-aware validation
  - Modify DroolsDiagnosticProvider to use enhanced grammar validator
  - Update diagnostic generation to include context information (LHS/RHS)
  - Add variable-specific diagnostic messages and severity levels
  - Implement diagnostic filtering based on validation context
  - Ensure proper diagnostic positioning and range calculation
  - _Requirements: 3.1, 3.2, 3.3, 4.2, 4.3_

- [ ] 8. Enhance Completion Provider with context-specific suggestions
  - Update CompletionProvider to detect LHS vs RHS context more accurately
  - Implement LHS-specific completions (Drools operators, pattern syntax)
  - Add RHS-specific completions (Java syntax, method calls)
  - Create $variable completions that show variables declared in LHS when in RHS
  - Add context-aware operator and keyword suggestions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Create comprehensive test suite for LHS/RHS validation
  - Write unit tests for LHSValidator with various Drools syntax patterns
  - Add unit tests for RHSValidator with Java syntax validation
  - Create tests for VariableContextManager variable tracking and validation
  - Implement integration tests for complete rule validation with LHS/RHS distinction
  - Add test cases for error reporting and context-aware messages
  - _Requirements: All requirements validation_

- [ ] 10. Add performance optimization for context-aware validation
  - Implement caching for variable contexts and validation results
  - Add incremental validation updates for document changes
  - Optimize validation performance for large files with many rules
  - Create memory management strategies for variable context tracking
  - Add performance benchmarks and monitoring for validation speed
  - _Requirements: Performance aspects of all requirements_

- [ ] 11. Create test cases for edge cases and error scenarios
  - Test complex nested patterns with variable declarations
  - Validate handling of malformed LHS/RHS syntax
  - Test variable scope and shadowing scenarios
  - Add tests for mixed valid/invalid syntax within same rule
  - Validate error recovery and partial validation functionality
  - _Requirements: 3.2, 4.4, error handling aspects_

- [ ] 12. Update language server integration for context-aware features
  - Integrate enhanced validation into language server diagnostic flow
  - Add context-aware hover information for variables and operators
  - Implement go-to-definition that works across LHS/RHS boundaries
  - Update document symbol provider to show variable declarations and usage
  - Ensure proper language server protocol compliance for new features
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_