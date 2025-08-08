# Requirements Document

## Introduction

This feature enhances the Drools VSCode extension's grammar validation to properly distinguish between Left Hand Side (LHS) and Right Hand Side (RHS) syntax rules. The LHS (when clause) should allow Drools-specific syntax including $variables, pattern matching, and constraint expressions, while the RHS (then clause) should be validated as pure Java code where $variables are allowed but other Drools-specific syntax should be handled differently.

## Requirements

### Requirement 1

**User Story:** As a Drools developer, I want the extension to validate LHS syntax according to Drools pattern matching rules, so that I can write correct condition expressions with proper error detection.

#### Acceptance Criteria

1. WHEN parsing a when clause THEN the system SHALL allow $variable declarations and references
2. WHEN parsing a when clause THEN the system SHALL validate Drools-specific operators (matches, contains, memberOf, etc.)
3. WHEN parsing a when clause THEN the system SHALL allow pattern matching syntax like Person(age > 18, name matches ".*John.*")
4. WHEN parsing a when clause THEN the system SHALL validate constraint expressions within fact patterns
5. WHEN parsing a when clause THEN the system SHALL allow Drools keywords (exists, not, eval, forall, collect, accumulate)

### Requirement 2

**User Story:** As a Drools developer, I want the extension to validate RHS syntax as Java code with $variable support, so that I can write correct action code with appropriate error detection.

#### Acceptance Criteria

1. WHEN parsing a then clause THEN the system SHALL validate Java syntax rules
2. WHEN parsing a then clause THEN the system SHALL allow $variable references from the LHS
3. WHEN parsing a then clause THEN the system SHALL flag Drools-specific operators as invalid in RHS context
4. WHEN parsing a then clause THEN the system SHALL validate Java method calls and expressions
5. WHEN parsing a then clause THEN the system SHALL allow standard Java control structures (if, for, while, etc.)

### Requirement 3

**User Story:** As a Drools developer, I want context-aware error messages that distinguish between LHS and RHS validation errors, so that I can quickly understand and fix syntax issues.

#### Acceptance Criteria

1. WHEN a validation error occurs in LHS THEN the system SHALL provide Drools-specific error messages
2. WHEN a validation error occurs in RHS THEN the system SHALL provide Java-specific error messages
3. WHEN $variables are used incorrectly THEN the system SHALL provide context-specific guidance
4. WHEN Drools operators are used in RHS THEN the system SHALL suggest Java alternatives
5. WHEN Java syntax is used incorrectly in LHS THEN the system SHALL suggest Drools pattern syntax

### Requirement 4

**User Story:** As a Drools developer, I want the extension to validate $variable consistency between LHS and RHS, so that I can ensure variables declared in conditions are properly used in actions.

#### Acceptance Criteria

1. WHEN a $variable is declared in LHS THEN the system SHALL track it for RHS validation
2. WHEN a $variable is used in RHS THEN the system SHALL verify it was declared in LHS
3. WHEN a $variable is declared but not used THEN the system SHALL provide a warning
4. WHEN a $variable is used but not declared THEN the system SHALL provide an error
5. WHEN $variable types can be inferred THEN the system SHALL validate type-appropriate usage

### Requirement 5

**User Story:** As a Drools developer, I want the extension to provide appropriate completions based on LHS vs RHS context, so that I can efficiently write correct code with IDE assistance.

#### Acceptance Criteria

1. WHEN in LHS context THEN the system SHALL provide Drools-specific completions
2. WHEN in RHS context THEN the system SHALL provide Java-specific completions
3. WHEN typing $variables THEN the system SHALL provide context-appropriate variable completions
4. WHEN in RHS context THEN the system SHALL provide $variables declared in LHS
5. WHEN in LHS context THEN the system SHALL provide fact types and constraint operators