# Implementation Plan

- [x] 1. Implement core position calculation methods
  - Create enhanced `findVariablePositionInThenClause` method with document line access
  - Implement word boundary regex matching for precise token identification
  - Add special character escaping for variable names with regex metacharacters
  - _Requirements: FR-1, FR-3, FR-4_

- [x] 2. Implement LHS variable declaration positioning
  - Create enhanced `findVariableDeclarationPosition` method for when clause variables
  - Add multi-line condition support for complex variable declarations
  - Implement regex-based word boundary detection for LHS variables
  - _Requirements: FR-1, FR-3, FR-4_

- [x] 3. Implement Java error positioning for RHS validation
  - Create `findJavaErrorPosition` method for capitalization and typo errors
  - Add word boundary detection for Java keywords and method names
  - Implement precise positioning for system/System and other Java constructs
  - _Requirements: FR-2, FR-3, FR-4_

- [x] 4. Add regex pattern creation utilities
  - Create `createWordBoundaryPattern` method for generating precise regex patterns
  - Implement `escapeSpecialCharacters` method for safe regex pattern creation
  - Add pattern validation and error handling for complex variable names
  - _Requirements: FR-4_

- [x] 5. Implement range validation and precision checking
  - Create `validateRangePrecision` method to ensure no whitespace inclusion
  - Add `checkWordBoundaries` method to verify token alignment
  - Implement visual validation helpers for debugging underline accuracy
  - _Requirements: FR-5_

- [x] 6. Add comprehensive unit tests for position calculation
  - Write tests for `findVariablePositionInThenClause` with various indentation levels
  - Create tests for `findVariableDeclarationPosition` with multi-line conditions
  - Add tests for special character handling in variable names
  - _Requirements: FR-1, FR-3, FR-4_

- [x] 7. Add unit tests for Java error positioning
  - Write tests for capitalization error positioning (system vs System)
  - Create tests for typo detection positioning (Sytem vs System)
  - Add tests for complex Java expressions with multiple potential matches
  - _Requirements: FR-2, FR-4_

- [ ] 8. Add integration tests for precision validation
  - Create comprehensive test suite that validates no leading/trailing whitespace
  - Write tests that verify visual alignment of underlines with problematic text
  - Add performance tests for positioning accuracy with large files
  - _Requirements: FR-5_

- [ ] 9. Add edge case handling and error recovery
  - Implement fallback positioning when regex matching fails
  - Add handling for documents with mixed indentation (spaces/tabs)
  - Create error recovery for malformed or incomplete code structures
  - _Requirements: FR-3, FR-4_

- [x] 10. Integrate positioning improvements into diagnostic provider
  - Update existing diagnostic creation to use new positioning methods
  - Replace old `indexOf` based positioning with regex-based precision methods
  - Ensure backward compatibility with existing error reporting
  - _Requirements: FR-1, FR-2, FR-3_

- [ ] 11. Add debugging and validation utilities
  - Create test utilities to visualize underline positioning accuracy
  - Implement logging for position calculation debugging
  - Add validation helpers to verify range precision in development
  - _Requirements: FR-5_

- [ ] 12. Create comprehensive end-to-end validation tests
  - Write integration tests that validate complete positioning pipeline
  - Create tests with real-world Drools code samples
  - Add regression tests to prevent positioning accuracy degradation
  - _Requirements: FR-1, FR-2, FR-3, FR-4, FR-5_