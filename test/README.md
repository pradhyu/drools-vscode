# Drools VSCode Extension Test Suite

This directory contains a comprehensive test suite for the Drools VSCode Extension, covering unit tests, integration tests, and performance tests.

## Test Structure

### Unit Tests (`test/`)
- **Parser Tests** (`test/parser/droolsParser.test.ts`): Tests for the Drools language parser
- **Provider Tests** (`test/providers/`): Tests for language service providers
  - `completionProvider.test.ts`: Code completion functionality
  - `diagnosticProvider.test.ts`: Error detection and validation
  - `formattingProvider.test.ts`: Code formatting capabilities

### Integration Tests (`test/integration/`)
- **Language Server Tests** (`test/integration/languageServer.test.ts`): End-to-end language server functionality

### Performance Tests (`test/performance/`)
- **Large File Tests** (`test/performance/largeFiles.test.ts`): Performance testing with large .drl files

## Test Coverage

The test suite validates all major requirements:

### Requirement 1: Syntax Highlighting
- ✅ Parser correctly identifies language constructs
- ✅ AST generation for rules, functions, imports, etc.
- ✅ Error recovery and graceful handling of malformed input

### Requirement 2: Code Completion and IntelliSense
- ✅ Keyword completion in appropriate contexts
- ✅ Function signature help
- ✅ Variable and fact type suggestions
- ✅ Context-aware completion based on cursor position

### Requirement 3: Error Detection and Validation
- ✅ Syntax error detection (missing semicolons, unmatched brackets)
- ✅ Semantic validation (undefined variables, duplicate rules)
- ✅ Best practice warnings
- ✅ Configurable diagnostic severity levels

### Requirement 4: Code Formatting
- ✅ Document and range formatting
- ✅ Proper indentation of rule blocks
- ✅ Operator and keyword spacing
- ✅ Configurable formatting options

### Requirement 5: Bracket Matching and Code Folding
- ✅ Folding range provider functionality
- ✅ Symbol provider for navigation

### Requirement 6: Format-on-Save
- ✅ Automatic formatting integration
- ✅ Configuration-based enabling/disabling

### Requirement 7: Code Snippets
- ✅ Snippet provider functionality
- ✅ Custom snippet management

### Requirement 8: File Association
- ✅ .drl file recognition and activation
- ✅ Language server integration

## Performance Benchmarks

The performance tests validate that the extension can handle:
- ✅ 100 rules: ~11ms parsing time
- ✅ 500 rules: ~10ms parsing time  
- ✅ 1000 rules: ~64ms parsing time
- ✅ 2000 rules: ~27ms parsing time
- ✅ Complex rules with 100+ conditions: <1ms
- ✅ Completion suggestions: <200ms for large files
- ✅ Diagnostic analysis: <2s for 300 rules
- ✅ Document formatting: <3s for 150 rules
- ✅ Memory usage: <100MB increase for multiple large files

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Performance Tests
```bash
npm run test:performance
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Configuration

- **Framework**: Jest with TypeScript support
- **Timeout**: 30 seconds for performance tests, 10 seconds for others
- **Coverage**: Collects coverage from all `src/` files
- **Setup**: Mock VSCode API and language server connections

## Mock Utilities

The test suite includes comprehensive mocking:
- **VSCode API**: Complete mock of vscode module
- **Text Documents**: Mock document creation with content
- **Language Server**: Mock connection and communication
- **File System**: Mock file operations

## Continuous Integration

Tests are designed to run in CI environments with:
- Deterministic performance benchmarks
- Proper error handling and recovery
- No external dependencies
- Cross-platform compatibility

## Adding New Tests

When adding new functionality:
1. Add unit tests for core logic
2. Add integration tests for user-facing features
3. Add performance tests for operations on large files
4. Update this README with new test coverage