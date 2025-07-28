# Drools Language Support for Visual Studio Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/drools-community.drools-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=drools-community.drools-vscode-extension)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/drools-community.drools-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=drools-community.drools-vscode-extension)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/drools-community.drools-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=drools-community.drools-vscode-extension)

A comprehensive Visual Studio Code extension that provides full language support for Drools Rule Language (.drl) files. This extension enhances your development experience with syntax highlighting, IntelliSense, error detection, formatting, and many other productivity features.

## Features

### 🎨 Syntax Highlighting
- Rich syntax highlighting for all Drools language constructs
- Distinct colors for keywords, strings, comments, and operators
- Support for rule declarations, conditions, and actions
- Highlighting for package declarations, imports, and function definitions

### 🧠 IntelliSense & Code Completion
- Smart keyword completion for Drools language constructs
- Context-aware suggestions based on cursor position
- Fact type and property completion
- Function signature help and parameter hints
- Import statement suggestions

### 🔍 Error Detection & Validation
- Real-time syntax error detection with red squiggles
- Missing semicolon and bracket validation
- Undefined variable and fact warnings
- Helpful error messages on hover
- Best practice violation warnings

### ✨ Code Formatting
- Automatic document formatting with proper indentation
- Format-on-save functionality
- Range formatting for selected text
- Consistent spacing around operators and keywords
- Configurable formatting preferences

### 📁 Code Navigation
- Bracket matching and highlighting
- Code folding for rules, functions, and comment blocks
- Document outline with symbol navigation
- Go-to-definition for rules and functions
- Workspace-wide symbol search

### 📝 Code Snippets
- Pre-built snippets for common Drools patterns
- Basic rule templates with tab stops
- Function definition templates
- Import and package declaration snippets
- Custom snippet management

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Drools Language Support"
4. Click Install

Alternatively, you can install from the command line:
```bash
code --install-extension drools-community.drools-vscode-extension
```

## Usage

### Getting Started

1. Open or create a `.drl` file
2. The extension will automatically activate and provide language support
3. Start typing Drools code to see syntax highlighting and completion suggestions

### Example Drools File

```drools
package com.example.rules

import com.example.model.Customer
import com.example.model.Order

rule "High Value Customer Discount"
    when
        $customer : Customer(totalSpent > 10000)
        $order : Order(customer == $customer, total > 500)
    then
        $order.setDiscount(0.15);
        update($order);
        System.out.println("Applied 15% discount for high value customer: " + $customer.getName());
end

rule "Bulk Order Discount"
    when
        $order : Order(quantity >= 100, discount == 0)
    then
        $order.setDiscount(0.10);
        update($order);
        System.out.println("Applied 10% bulk discount for order: " + $order.getId());
end

function double calculateTax(double amount, String state) {
    if ("CA".equals(state)) {
        return amount * 0.0875;
    } else if ("NY".equals(state)) {
        return amount * 0.08;
    }
    return amount * 0.05;
}
```

### Using Code Snippets

Type any of these prefixes and press `Tab` to insert a snippet:

- `rule` - Basic rule template
- `function` - Function definition template
- `import` - Import statement
- `package` - Package declaration
- `global` - Global variable declaration
- `query` - Query definition

### Formatting Your Code

- **Format Document**: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)
- **Format Selection**: `Ctrl+K Ctrl+F` (Windows/Linux) or `Cmd+K Cmd+F` (Mac)
- **Format on Save**: Enabled by default (configurable in settings)

## Configuration

The extension provides many configuration options. Access them via:
`File > Preferences > Settings` and search for "Drools"

### Key Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `drools.formatting.formatOnSave` | `true` | Automatically format files when saving |
| `drools.completion.enableKeywords` | `true` | Enable keyword completion |
| `drools.diagnostics.enableSyntaxValidation` | `true` | Enable syntax error detection |
| `drools.features.enableSnippets` | `true` | Enable code snippets |
| `drools.formatting.indentSize` | `4` | Number of spaces for indentation |

### Example Configuration

```json
{
    "drools.formatting.formatOnSave": true,
    "drools.formatting.indentSize": 2,
    "drools.completion.maxItems": 100,
    "drools.diagnostics.enableBestPracticeWarnings": true,
    "drools.server.logLevel": "info"
}
```

## Commands

The extension provides several commands accessible via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Drools: Set Language to Drools** - Manually set file language to Drools
- **Drools: Create Custom Snippet** - Create a new custom code snippet
- **Drools: Manage Snippets** - Open snippet management interface
- **Drools: Export Snippets** - Export custom snippets to file
- **Drools: Import Snippets** - Import snippets from file

## Supported File Types

- `.drl` - Drools Rule Language files
- Files with MIME type `text/x-drools`

## Requirements

- Visual Studio Code 1.74.0 or higher
- No additional dependencies required

## Known Issues

- Large files (>5MB) may experience slower performance
- Complex nested rule structures might have limited folding support
- Some advanced Drools features may not be fully supported in syntax highlighting

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Open in VS Code and press `F5` to launch a new Extension Development Host
4. Make changes and test in the development environment

### Running Tests

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Release Notes

### 1.0.0

Initial release with comprehensive Drools language support:

- ✅ Complete syntax highlighting for .drl files
- ✅ IntelliSense with keyword and context completion
- ✅ Real-time error detection and validation
- ✅ Document formatting with format-on-save
- ✅ Code navigation with bracket matching and folding
- ✅ Built-in code snippets for common patterns
- ✅ Symbol provider for outline and navigation
- ✅ Comprehensive configuration options
- ✅ Performance optimizations for large files

## Roadmap

- 🔄 Enhanced semantic analysis
- 🔄 Refactoring support
- 🔄 Debug adapter integration
- 🔄 Rule testing framework integration
- 🔄 Advanced code completion with fact model awareness

## Support

- 📖 [Documentation](https://github.com/drools-community/drools-vscode-extension/wiki)
- 🐛 [Report Issues](https://github.com/drools-community/drools-vscode-extension/issues)
- 💬 [Discussions](https://github.com/drools-community/drools-vscode-extension/discussions)

## License

This extension is licensed under the [Apache License 2.0](LICENSE).

## Acknowledgments

- Thanks to the Drools community for feedback and contributions
- Built with the VS Code Extension API and Language Server Protocol

---

**Enjoy coding with Drools! 🚀**