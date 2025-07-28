# Screenshots and GIFs for Drools VSCode Extension

This directory contains visual assets for the extension README. Below are the required images and GIFs:

## Required GIFs (Animated Demonstrations)

### 1. overview.gif
- **Purpose**: Main hero GIF showing overall extension capabilities
- **Content**: Quick showcase of syntax highlighting, completion, error detection, and formatting
- **Duration**: 10-15 seconds
- **Size**: 800x600px recommended

### 2. syntax-highlighting.gif
- **Purpose**: Demonstrate rich syntax highlighting
- **Content**: Typing a Drools rule showing different syntax elements being highlighted
- **Duration**: 8-10 seconds
- **Size**: 800x500px

### 3. completion-demo.gif
- **Purpose**: Show intelligent code completion in action
- **Content**: Typing and triggering completions for keywords, fact types, functions
- **Duration**: 10-12 seconds
- **Size**: 800x500px

### 4. error-detection.gif
- **Purpose**: Demonstrate real-time error detection
- **Content**: Introducing syntax errors and showing red squiggles, hover messages
- **Duration**: 8-10 seconds
- **Size**: 800x500px

### 5. formatting-demo.gif
- **Purpose**: Show automatic code formatting
- **Content**: Messy code being formatted with Shift+Alt+F or format on save
- **Duration**: 6-8 seconds
- **Size**: 800x500px

### 6. navigation-demo.gif
- **Purpose**: Demonstrate code navigation features
- **Content**: Using outline, folding, go-to-definition, symbol search
- **Duration**: 10-12 seconds
- **Size**: 800x500px

### 7. snippets-demo.gif
- **Purpose**: Show code snippets in action
- **Content**: Typing snippet prefixes and expanding them with tab stops
- **Duration**: 8-10 seconds
- **Size**: 800x500px

### 8. settings-demo.gif
- **Purpose**: Show configuration options
- **Content**: Opening settings, changing configuration values, seeing effects
- **Duration**: 10-12 seconds
- **Size**: 800x600px

### 9. installation-demo.gif
- **Purpose**: Show extension installation process
- **Content**: Opening extensions view, searching, installing the extension
- **Duration**: 8-10 seconds
- **Size**: 800x600px

### 10. getting-started.gif
- **Purpose**: Show first-time user experience
- **Content**: Opening a .drl file, extension activation, basic features
- **Duration**: 10-12 seconds
- **Size**: 800x600px

## Required Static Images (PNG/JPG)

### 1. syntax-examples.png
- **Purpose**: Show different syntax highlighting examples
- **Content**: Side-by-side comparison of different Drools constructs
- **Size**: 1000x600px

### 2. completion-types.png
- **Purpose**: Show different types of completions
- **Content**: Screenshots of keyword, fact type, function, and variable completions
- **Size**: 1000x700px

### 3. error-examples.png
- **Purpose**: Show different error types
- **Content**: Examples of syntax errors, semantic errors, and warnings
- **Size**: 1000x600px

### 4. formatting-before-after.png
- **Purpose**: Before and after formatting comparison
- **Content**: Split view showing unformatted vs formatted code
- **Size**: 1000x500px

### 5. navigation-features.png
- **Purpose**: Show navigation features
- **Content**: Document outline, symbol list, breadcrumbs
- **Size**: 1000x600px

### 6. snippet-gallery.png
- **Purpose**: Gallery of available snippets
- **Content**: Grid or list showing different snippet templates
- **Size**: 1000x700px

### 7. settings-panel.png
- **Purpose**: Extension settings interface
- **Content**: VS Code settings panel with Drools extension options
- **Size**: 1000x800px

## Creation Guidelines

### For GIFs:
- Use a clean VS Code theme (Dark+ or Light+)
- Record at 60fps, export at 30fps
- Use smooth cursor movements
- Include realistic typing speed
- Show clear before/after states
- Optimize file size (keep under 5MB each)

### For Static Images:
- Use high-resolution screenshots
- Ensure text is readable
- Use consistent VS Code theme
- Highlight important UI elements with arrows or boxes if needed
- Optimize for web (PNG for screenshots, JPG for photos)

### Sample Drools Code for Demonstrations:

```drools
package com.example.rules

import com.example.model.Customer
import com.example.model.Order
import java.util.List

global List<String> messages

rule "High Value Customer Discount"
    salience 100
    when
        $customer : Customer(totalSpent > 10000, status == "PREMIUM")
        $order : Order(customer == $customer, total > 500)
        not(Discount(order == $order))
    then
        $order.setDiscount(0.15);
        insert(new Discount($order, 0.15));
        update($order);
        messages.add("Applied 15% discount for " + $customer.getName());
end

rule "Bulk Order Processing"
    when
        $order : Order(quantity >= 100, processed == false)
        exists(Customer(id == $order.customerId, creditRating > 700))
    then
        $order.setProcessed(true);
        $order.setPriority("HIGH");
        update($order);
        System.out.println("Processing bulk order: " + $order.getId());
end

function double calculateTax(double amount, String state) {
    switch(state) {
        case "CA": return amount * 0.0875;
        case "NY": return amount * 0.08;
        case "TX": return amount * 0.0625;
        default: return amount * 0.05;
    }
}

query "findHighValueOrders"
    $order : Order(total > 1000)
    $customer : Customer(id == $order.customerId)
end
```

## Tools for Creation

### Recommended GIF Creation Tools:
- **LICEcap** (Free, cross-platform)
- **ScreenToGif** (Free, Windows)
- **Kap** (Free, macOS)
- **Gifox** (Paid, macOS)

### Recommended Image Editing:
- **VS Code** built-in screenshot tools
- **Snagit** for annotations
- **GIMP** for free editing
- **Photoshop** for professional editing

## File Naming Convention

- Use lowercase with hyphens
- Be descriptive but concise
- Include dimensions in filename if multiple sizes
- Example: `syntax-highlighting-demo-800x500.gif`