# Drools Language Support for Visual Studio Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/drools-community.drools-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=drools-community.drools-vscode-extension)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/drools-community.drools-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=drools-community.drools-vscode-extension)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/drools-community.drools-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=drools-community.drools-vscode-extension)
[![Build Status](https://github.com/drools-community/drools-vscode-extension/workflows/CI/badge.svg)](https://github.com/drools-community/drools-vscode-extension/actions)

Transform your Drools development experience with comprehensive language support for Visual Studio Code! This extension brings professional-grade tooling to Drools Rule Language (.drl) files, featuring intelligent code completion, real-time error detection, advanced formatting, and much more.

![Drools Extension Overview](images/screenshots/overview.gif)
*Experience the power of intelligent Drools development*

## ✨ Features

### 🎨 Rich Syntax Highlighting

Experience beautiful, semantic syntax highlighting that makes your Drools code easy to read and understand, including full support for multi-line patterns.

![Syntax Highlighting Demo](images/screenshots/syntax-highlighting.gif)
*Rich syntax highlighting with distinct colors for keywords, strings, comments, and operators*

**Key Highlights:**
- **Keywords**: `rule`, `when`, `then`, `end`, `function`, `import`, `package`
- **Operators**: `==`, `!=`, `&&`, `||`, `matches`, `contains`, `memberOf`
- **Fact Patterns**: Variable bindings, constraints, and field access
- **Multi-line Patterns**: `exists()`, `not()`, `eval()`, `forall()`, `collect()`, `accumulate()`
- **Comments**: Single-line (`//`) and multi-line (`/* */`) comments
- **Strings & Numbers**: Proper highlighting for literals and expressions

![Syntax Highlighting Examples](images/screenshots/syntax-examples.png)
*Examples of syntax highlighting across different Drools constructs*

### 🧠 Intelligent Code Completion

Get smart, context-aware suggestions as you type, making Drools development faster and more accurate.

![Code Completion Demo](images/screenshots/completion-demo.gif)
*IntelliSense in action with keyword and context-aware suggestions*

**Completion Features:**
- **Keyword Completion**: Automatic suggestions for Drools keywords based on context
- **Fact Type Completion**: Smart completion for declared fact types and imported classes
- **Function Completion**: Function names with signature hints and parameter information
- **Variable Completion**: Variables from `when` clauses available in `then` sections
- **Import Suggestions**: Auto-complete for Java class imports

![Completion Types](images/screenshots/completion-types.png)
*Different types of completions: keywords, fact types, functions, and variables*

### 🔍 Real-time Error Detection & Validation

Catch errors as you type with comprehensive syntax and semantic validation.

![Error Detection Demo](images/screenshots/error-detection.gif)
*Real-time error detection with helpful error messages and quick fixes*

**Validation Features:**
- **Syntax Errors**: Missing semicolons, unmatched brackets, malformed rules
- **Semantic Errors**: Undefined variables, type mismatches, duplicate rule names
- **Best Practices**: Warnings for unused variables, missing salience, complex conditions
- **Hover Information**: Detailed error descriptions and suggested fixes

![Error Examples](images/screenshots/error-examples.png)
*Examples of different error types with clear, actionable messages*

### ✨ Advanced Code Formatting

Keep your Drools code clean and consistent with powerful formatting capabilities.

![Formatting Demo](images/screenshots/formatting-demo.gif)
*Automatic code formatting with customizable style preferences*

**Formatting Features:**
- **Auto-Format on Save**: Automatically format files when saving
- **Range Formatting**: Format selected code blocks
- **Configurable Indentation**: Spaces or tabs with customizable size
- **Operator Spacing**: Consistent spacing around operators and keywords
- **Rule Block Alignment**: Properly aligned `when` and `then` clauses

![Before After Formatting](images/screenshots/formatting-before-after.png)
*Before and after formatting comparison*

### 📁 Smart Code Navigation

Navigate your Drools codebase efficiently with advanced navigation features.

![Navigation Demo](images/screenshots/navigation-demo.gif)
*Code navigation with outline, folding, and go-to-definition*

**Navigation Features:**
- **Document Outline**: Hierarchical view of rules, functions, and declarations
- **Code Folding**: Collapse rules, functions, and comment blocks
- **Bracket Matching**: Highlight matching brackets and parentheses
- **Go-to-Definition**: Jump to rule and function definitions
- **Symbol Search**: Find symbols across your workspace

![Navigation Features](images/screenshots/navigation-features.png)
*Document outline and symbol navigation in action*

### 📝 Powerful Code Snippets

Accelerate development with pre-built snippets for common Drools patterns.

![Snippets Demo](images/screenshots/snippets-demo.gif)
*Code snippets with tab stops for rapid development*

**Available Snippets:**
- **`rule`** - Complete rule template with placeholders
- **`function`** - Function definition with parameters
- **`import`** - Import statement template
- **`package`** - Package declaration
- **`global`** - Global variable declaration
- **`query`** - Query definition template
- **`when`** - When clause with common patterns
- **`then`** - Then clause with typical actions

![Snippet Gallery](images/screenshots/snippet-gallery.png)
*Gallery of available code snippets*

### 🔧 Comprehensive Configuration

Customize the extension to match your development preferences and team standards.

![Settings Demo](images/screenshots/settings-demo.gif)
*Configurable settings for formatting, completion, and validation*

**Configuration Categories:**
- **Features**: Enable/disable syntax highlighting, completion, diagnostics
- **Completion**: Keyword completion, fact types, functions, max items
- **Diagnostics**: Syntax validation, semantic validation, best practices
- **Formatting**: Format on save, indentation, spacing preferences
- **Snippets**: Built-in snippets, custom snippets, trigger characters
- **Performance**: Caching, debouncing, large file handling

![Settings Panel](images/screenshots/settings-panel.png)
*Extension settings panel with all configuration options*

## 🔄 Multi-line Pattern Support

The extension provides comprehensive support for multi-line condition patterns, allowing you to write complex Drools rules with proper syntax highlighting, validation, and formatting across multiple lines.

### Supported Multi-line Patterns

The extension fully supports all Drools multi-line pattern constructs:

- **`exists()`** - Existential quantification patterns
- **`not()`** - Negation patterns  
- **`eval()`** - Evaluation patterns
- **`forall()`** - Universal quantification patterns
- **`collect()`** - Collection patterns
- **`accumulate()`** - Accumulation patterns

### Multi-line Pattern Examples

#### Basic Multi-line Exists Pattern

```drools
rule "Multi-line Exists Example"
when
    exists(
        Person(
            age > 18,
            name != null,
            address.city == "New York"
        )
    )
then
    // Rule action
end
```

#### Nested Multi-line Patterns

```drools
rule "Complex Nested Pattern"
when
    $customer : Customer(status == "PREMIUM")
    exists(
        Order(
            customer == $customer,
            total > 1000
        ) and
        not(
            Refund(
                order.customer == $customer,
                amount > 100
            )
        )
    )
then
    // Apply premium customer benefits
end
```

#### Multi-line Accumulate Pattern

```drools
rule "Calculate Total Spending"
when
    $customer : Customer()
    $total : Number() from accumulate(
        Order(
            customer == $customer,
            status == "COMPLETED"
        ),
        sum(total)
    )
    eval($total.doubleValue() > 5000)
then
    $customer.setVipStatus(true);
    update($customer);
end
```

#### Multi-line Collect Pattern

```drools
rule "Process Multiple Orders"
when
    $customer : Customer()
    $orders : List() from collect(
        Order(
            customer == $customer,
            status == "PENDING",
            priority == "HIGH"
        )
    )
    eval($orders.size() > 3)
then
    // Process bulk high-priority orders
    for (Object order : $orders) {
        ((Order) order).setStatus("PROCESSING");
        update(order);
    }
end
```

#### Multi-line Forall Pattern

```drools
rule "All Orders Must Be Validated"
when
    $customer : Customer()
    forall(
        Order(
            customer == $customer,
            status == "SUBMITTED"
        )
        Order(
            customer == $customer,
            status == "SUBMITTED",
            validated == true
        )
    )
then
    $customer.setReadyForProcessing(true);
    update($customer);
end
```

### Multi-line Pattern Features

#### ✅ Syntax Highlighting
- Complete syntax highlighting across line boundaries
- Proper keyword highlighting for pattern types
- Bracket matching and nesting visualization
- Consistent coloring for nested patterns

#### ✅ Intelligent Formatting
- Automatic indentation for nested levels
- Proper alignment of closing parentheses
- Consistent spacing within multi-line patterns
- Format-on-save support for multi-line constructs

#### ✅ Error Detection
- Unmatched parentheses detection across lines
- Context-aware error messages
- Validation of nested pattern syntax
- Real-time error highlighting

#### ✅ Code Completion
- Context-aware keyword completion within patterns
- Fact type suggestions in nested conditions
- Operator completions that understand pattern context
- Variable completion across pattern boundaries

#### ✅ Code Navigation
- Bracket matching across multiple lines
- Code folding for multi-line patterns
- Document outline showing pattern structure
- Go-to-definition within nested patterns

### Best Practices for Multi-line Patterns

#### Indentation Style
```drools
// Recommended: Consistent indentation
rule "Well Formatted Pattern"
when
    exists(
        Person(
            age > 21,
            status == "ACTIVE"
        ) and
        Account(
            owner == person,
            balance > 0
        )
    )
then
    // Action
end
```

#### Logical Grouping
```drools
// Group related conditions together
rule "Logical Grouping Example"
when
    $customer : Customer()
    exists(
        // Group 1: Order conditions
        Order(
            customer == $customer,
            status == "ACTIVE",
            total > 100
        ) and
        // Group 2: Payment conditions  
        Payment(
            order.customer == $customer,
            status == "CONFIRMED",
            amount >= order.total
        )
    )
then
    // Process confirmed order
end
```

#### Avoid Deep Nesting
```drools
// Avoid: Too deeply nested
exists(
    Person() and
    not(
        Order() and
        not(
            Payment() and
            exists(Refund())
        )
    )
)

// Better: Break into multiple rules or simplify logic
exists(Person() and Order())
not(exists(Payment() and Refund()))
```

## Installation

### From VS Code Marketplace

1. Open Visual Studio Code
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Drools Language Support"
4. Click Install

![Installation Demo](images/screenshots/installation-demo.gif)
*Installing the extension from VS Code Marketplace*

### From Command Line

```bash
code --install-extension drools-community.drools-vscode-extension
```

### Manual Installation

1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/drools-community/drools-vscode-extension/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Extensions: Install from VSIX"
5. Select the downloaded `.vsix` file

## Usage

### Getting Started

1. Open or create a `.drl` file
2. The extension will automatically activate and provide language support
3. Start typing Drools code to see syntax highlighting and completion suggestions

![Getting Started](images/screenshots/getting-started.gif)
*Quick start guide showing extension activation and first steps*

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

## Multi-line Pattern Resources

- 📖 **[Complete Multi-line Patterns Guide](MULTILINE_PATTERNS_GUIDE.md)** - Comprehensive documentation for all multi-line pattern features
- 📋 **[Complete Examples](examples/multiline-patterns-examples.drl)** - Comprehensive examples of all multi-line pattern types
- 🔧 **[Troubleshooting Guide](MULTILINE_PATTERNS_TROUBLESHOOTING.md)** - Solutions for common multi-line pattern issues
- 📖 **[Pattern Best Practices](#best-practices-for-multi-line-patterns)** - Recommended coding styles and patterns

## Support

- 📖 [Documentation](https://github.com/drools-community/drools-vscode-extension/wiki)
- 🐛 [Report Issues](https://github.com/drools-community/drools-vscode-extension/issues)
- 💬 [Discussions](https://github.com/drools-community/drools-vscode-extension/discussions)
- 🔧 [Multi-line Pattern Troubleshooting](MULTILINE_PATTERNS_TROUBLESHOOTING.md)

## License

This extension is licensed under the [Apache License 2.0](LICENSE).

## Acknowledgments

- Thanks to the Drools community for feedback and contributions
- Built with the VS Code Extension API and Language Server Protocol

---

**Enjoy coding with Drools! 🚀**