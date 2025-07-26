# Contributing to Drools Language Support

Thank you for your interest in contributing to the Drools Language Support extension! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm (version 7 or higher)
- Visual Studio Code
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/drools-vscode-extension.git
   cd drools-vscode-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run compile
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

5. **Launch Extension Development Host**
   - Press `F5` or go to Run > Start Debugging
   - This opens a new VS Code window with the extension loaded
   - Open a `.drl` file to test the extension

## Project Structure

```
drools-vscode-extension/
├── src/                          # Source code
│   ├── extension.ts              # Main extension entry point
│   ├── configurationManager.ts  # Configuration management
│   ├── snippetProvider.ts       # Snippet functionality
│   ├── fallbackProvider.ts      # Fallback when server fails
│   └── server/                   # Language server implementation
│       ├── server.ts             # Main server entry point
│       ├── parser/               # Drools parser implementation
│       ├── providers/            # Language feature providers
│       └── performance/          # Performance optimization
├── test/                         # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── performance/              # Performance tests
├── syntaxes/                     # TextMate grammar files
├── snippets/                     # Code snippet definitions
├── images/                       # Extension icons and images
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
├── webpack.config.js             # Webpack bundling configuration
└── jest.config.js                # Jest testing configuration
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-completion-provider`
- `fix/syntax-highlighting-bug`
- `docs/update-readme`
- `test/add-integration-tests`

### Coding Standards

- **TypeScript**: All code should be written in TypeScript
- **ESLint**: Follow the configured ESLint rules (`npm run lint`)
- **Formatting**: Use consistent formatting (Prettier configuration included)
- **Comments**: Add JSDoc comments for public APIs
- **Error Handling**: Implement proper error handling and logging

### Code Style Guidelines

```typescript
// Good: Use descriptive names and proper typing
interface DroolsCompletionItem {
    label: string;
    kind: CompletionItemKind;
    detail?: string;
    documentation?: string;
}

// Good: Proper error handling
try {
    const ast = this.parser.parse(document.getText());
    return this.generateCompletions(ast, position);
} catch (error) {
    this.logger.error('Failed to parse document', error);
    return [];
}

// Good: Use async/await for promises
async function validateDocument(document: TextDocument): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    // validation logic
    return diagnostics;
}
```

### Adding New Features

1. **Create an Issue**: Discuss the feature before implementing
2. **Write Tests**: Add tests before implementing the feature
3. **Implement**: Follow existing patterns and conventions
4. **Update Documentation**: Update README and other docs as needed
5. **Test Thoroughly**: Ensure all tests pass and manual testing works

### Language Server Development

When working on language server features:

1. **Provider Pattern**: Use the existing provider pattern for new features
2. **AST Integration**: Leverage the Drools parser and AST
3. **Performance**: Consider performance implications for large files
4. **Error Recovery**: Implement graceful error handling
5. **LSP Compliance**: Follow Language Server Protocol specifications

## Testing

### Running Tests

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Writing Tests

#### Unit Tests
```typescript
describe('DroolsParser', () => {
    let parser: DroolsParser;

    beforeEach(() => {
        parser = new DroolsParser();
    });

    it('should parse basic rule structure', () => {
        const source = `
            rule "Test Rule"
            when
                $fact : Fact()
            then
                System.out.println("Rule fired");
            end
        `;
        
        const ast = parser.parse(source);
        expect(ast.rules).toHaveLength(1);
        expect(ast.rules[0].name).toBe('Test Rule');
    });
});
```

#### Integration Tests
```typescript
describe('Language Server Integration', () => {
    it('should provide completions for keywords', async () => {
        const document = await openDocument('test.drl');
        const position = new Position(2, 4);
        
        const completions = await getCompletions(document, position);
        
        expect(completions).toContainEqual(
            expect.objectContaining({
                label: 'when',
                kind: CompletionItemKind.Keyword
            })
        );
    });
});
```

### Test Coverage

Maintain high test coverage:
- Unit tests: >90% coverage
- Integration tests: Cover all major user workflows
- Performance tests: Ensure no regressions

## Submitting Changes

### Pull Request Process

1. **Create Pull Request**
   - Use a descriptive title
   - Reference related issues
   - Provide detailed description of changes

2. **Pull Request Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

3. **Review Process**
   - All PRs require review
   - Address feedback promptly
   - Ensure CI checks pass

### Commit Messages

Use conventional commit format:
```
type(scope): description

feat(completion): add support for fact property completion
fix(parser): handle malformed rule syntax gracefully
docs(readme): update installation instructions
test(integration): add tests for diagnostic provider
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Pre-release**
   - [ ] All tests pass
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] Version bumped in package.json

2. **Release**
   - [ ] Create release tag
   - [ ] Build and package extension
   - [ ] Publish to VS Code Marketplace
   - [ ] Create GitHub release

3. **Post-release**
   - [ ] Verify marketplace listing
   - [ ] Update documentation
   - [ ] Announce release

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Refer to the project wiki
- **Code Review**: Ask for help in pull requests

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for significant contributions
- README.md contributors section
- GitHub contributors page

Thank you for contributing to the Drools Language Support extension! 🎉