# Test Structure

This directory contains tests organized by feature categories to make them easier to find and manage.

## 📁 **Feature-Based Organization**

### **Core** (`test/core/`)
Basic parsing and AST functionality:
- `parser.test.ts` - Package, import, global, function parsing
- `comments.test.ts` - Comment filtering and handling
- `ast.test.ts` - AST node creation and structure

### **Language Features** (`test/language-features/`)
Drools language constructs:
- `rules.test.ts` - Rule parsing, attributes, conditions, actions
- `queries.test.ts` - Query parsing and validation
- `functions.test.ts` - Function definitions and parsing
- `declarations.test.ts` - Declare statements
- `attributes.test.ts` - Rule attributes (salience, no-loop, etc.)

### **Patterns** (`test/patterns/`)
Pattern matching functionality:
- `basic-patterns.test.ts` - Simple pattern matching
- `multiline-patterns.test.ts` - Multi-line patterns (exists, not, eval, etc.)
- `parentheses.test.ts` - Parentheses matching and validation
- `constraints.test.ts` - Constraint parsing and validation

### **Validation** (`test/validation/`)
Error detection and diagnostics:
- `syntax-validation.test.ts` - Syntax error detection
- `semantic-validation.test.ts` - Semantic error detection
- `grammar-validation.test.ts` - ANTLR grammar compliance
- `best-practices.test.ts` - Best practice warnings

### **IDE Features** (`test/ide-features/`)
IDE functionality:
- `completion.test.ts` - Code completion
- `formatting.test.ts` - Code formatting
- `symbols.test.ts` - Symbol provider and navigation
- `navigation.test.ts` - Go-to-definition, find references

### **Performance** (`test/performance/`)
Performance and optimization:
- `large-files.test.ts` - Large file handling
- `incremental-parsing.test.ts` - Incremental updates
- `memory-usage.test.ts` - Memory management

### **Integration** (`test/integration/`)
Integration and end-to-end tests:
- `language-server.test.ts` - Language server integration
- `vscode-extension.test.ts` - VS Code extension integration
- `end-to-end.test.ts` - Complete workflows

## 🚀 **Running Tests**

### **By Category**
```bash
# Run core parsing tests
node test/run-tests.js core

# Run language feature tests
node test/run-tests.js language-features

# Run pattern matching tests
node test/run-tests.js patterns

# Run validation tests
node test/run-tests.js validation

# Run IDE feature tests
node test/run-tests.js ide-features

# Run performance tests
node test/run-tests.js performance

# Run integration tests
node test/run-tests.js integration

# Run all tests
node test/run-tests.js all
```

### **With Options**
```bash
# Verbose output
node test/run-tests.js core --verbose

# Watch mode
node test/run-tests.js patterns --watch

# Coverage report
node test/run-tests.js all --coverage
```

### **Direct Jest Commands**
```bash
# Run specific test file
npx jest test/core/parser.test.ts

# Run tests matching pattern
npx jest --testPathPattern="multiline"

# Run with coverage
npx jest --coverage
```

## 📋 **Test Categories Overview**

| Category | Focus | Example Tests |
|----------|-------|---------------|
| **Core** | Basic parsing | Package declarations, imports, comment filtering |
| **Language Features** | Drools constructs | Rules, queries, functions, attributes |
| **Patterns** | Pattern matching | Multi-line patterns, constraints, parentheses |
| **Validation** | Error detection | Syntax errors, semantic validation, best practices |
| **IDE Features** | Editor support | Completion, formatting, navigation |
| **Performance** | Optimization | Large files, memory usage, incremental parsing |
| **Integration** | End-to-end | Language server, VS Code integration |

## 🎯 **Benefits of This Structure**

1. **Easy to Find**: Tests are organized by the feature they test
2. **Focused Testing**: Each category has a specific purpose
3. **Parallel Development**: Teams can work on different features independently
4. **Selective Running**: Run only the tests relevant to your changes
5. **Clear Ownership**: Easy to identify which tests cover which functionality

## 🔧 **Adding New Tests**

When adding new tests:

1. **Identify the category** - Which feature area does your test cover?
2. **Choose the right file** - Add to existing file or create new one
3. **Follow naming conventions** - Use descriptive test names
4. **Include edge cases** - Test both happy path and error scenarios
5. **Update documentation** - Add to this README if needed

## 📝 **Test Naming Conventions**

- **Files**: `feature-name.test.ts`
- **Describe blocks**: Feature or component name
- **Test cases**: "should [expected behavior] when [condition]"

Example:
```typescript
describe('Rule Parsing', () => {
    describe('Basic Rule Structure', () => {
        test('should parse simple rule with quoted name', () => {
            // Test implementation
        });
    });
});
```

## 🧪 **Test Utilities**

Common test utilities are available in:
- `testHelpers.ts` - Shared helper functions
- `setup.ts` - Test environment setup
- `types.d.ts` - TypeScript type definitions for tests

## 📊 **Coverage Goals**

- **Core**: 95%+ coverage (critical parsing functionality)
- **Language Features**: 90%+ coverage (main Drools features)
- **Patterns**: 85%+ coverage (complex pattern matching)
- **Validation**: 90%+ coverage (error detection is critical)
- **IDE Features**: 80%+ coverage (user experience features)
- **Performance**: 70%+ coverage (optimization focused)
- **Integration**: 75%+ coverage (end-to-end workflows)