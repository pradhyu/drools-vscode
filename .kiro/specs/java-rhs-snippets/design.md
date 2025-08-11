# Design Document

## Overview

The Java RHS Snippets feature will extend the existing Drools VSCode extension to provide comprehensive code snippets specifically tailored for the RHS (then clause) portion of Drools rules. This feature will include both general Java programming snippets and Drools-specific operation snippets, with intelligent context-aware completion that prioritizes relevant snippets based on the user's current location in the rule.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension Host                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Snippet       │  │   Context       │  │  Completion  │ │
│  │   Provider      │  │   Analyzer      │  │   Manager    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Snippet Registry                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │    Java     │ │   Drools    │ │   Documentation │   │ │
│  │  │  Snippets   │ │  Snippets   │ │     System      │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Integration

The feature will integrate with the existing extension architecture by:
- Extending the current `DroolsSnippetProvider` class
- Leveraging existing context analysis from the language server
- Integrating with VSCode's completion item provider system
- Utilizing the existing document parsing capabilities

## Components and Interfaces

### 1. Enhanced Snippet Provider

**File:** `src/snippetProvider.ts`

```typescript
export interface DroolsSnippet {
    label: string;
    insertText: string | vscode.SnippetString;
    detail: string;
    documentation: string;
    kind: vscode.CompletionItemKind;
    category: 'rule' | 'condition' | 'action' | 'attribute' | 'java' | 'drools' | 'function';
    priority?: number;
    contextRelevance?: string[];
}

export class EnhancedDroolsSnippetProvider implements vscode.CompletionItemProvider {
    private javaSnippets: DroolsSnippet[];
    private droolsSnippets: DroolsSnippet[];
    private contextAnalyzer: ContextAnalyzer;
    
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList>;
    
    private getContextAwareSnippets(context: RuleContext): DroolsSnippet[];
    private createCompletionItem(snippet: DroolsSnippet, context: RuleContext): vscode.CompletionItem;
}
```

### 2. Context Analyzer

**File:** `src/contextAnalyzer.ts`

```typescript
export enum RuleContext {
    RULE_HEADER = 'rule-header',
    WHEN_CLAUSE = 'when-clause',
    THEN_CLAUSE = 'then-clause',
    GLOBAL = 'global',
    FUNCTION = 'function',
    UNKNOWN = 'unknown'
}

export class ContextAnalyzer {
    public analyzeContext(document: vscode.TextDocument, position: vscode.Position): RuleContext;
    public isInThenClause(document: vscode.TextDocument, position: vscode.Position): boolean;
    public getIndentationLevel(document: vscode.TextDocument, position: vscode.Position): number;
    private findRuleStructure(document: vscode.TextDocument, position: vscode.Position): RuleStructure;
}

interface RuleStructure {
    ruleStart: number;
    whenStart: number;
    thenStart: number;
    ruleEnd: number;
}
```

### 3. Snippet Registry

**File:** `src/snippetRegistry.ts`

```typescript
export class SnippetRegistry {
    private static javaSnippets: DroolsSnippet[] = [
        // Control flow snippets
        // Collection snippets  
        // Utility snippets
        // etc.
    ];
    
    private static droolsSnippets: DroolsSnippet[] = [
        // Fact manipulation snippets
        // Knowledge context snippets
        // Working memory snippets
        // etc.
    ];
    
    public static getAllSnippets(): DroolsSnippet[];
    public static getJavaSnippets(): DroolsSnippet[];
    public static getDroolsSnippets(): DroolsSnippet[];
    public static getSnippetsByCategory(category: string): DroolsSnippet[];
}
```

## Data Models

### Snippet Categories

1. **Java Core Snippets**
   - Control Flow: if, if-else, switch, for, while, try-catch
   - Collections: ArrayList, HashMap, operations
   - Utilities: String operations, Date handling, Math functions
   - Safety: null checks, instanceof, Optional

2. **Drools Specific Snippets**
   - Fact Operations: update, insert, retract, modify
   - Context Access: kcontext, working memory, rule name
   - Advanced: agenda focus, halt, query execution
   - Globals: global variable access patterns

### Snippet Structure

```typescript
interface SnippetDefinition {
    // Basic properties
    label: string;           // Trigger text (e.g., "java-if")
    insertText: SnippetString; // Template with placeholders
    detail: string;          // Short description
    documentation: string;   // Detailed explanation
    
    // Categorization
    category: SnippetCategory;
    priority: number;        // Sort order
    
    // Context awareness
    contextRelevance: RuleContext[];
    requiredContext?: string; // Optional context requirement
    
    // Metadata
    tags: string[];          // For filtering/searching
    examples?: string[];     // Usage examples
}
```

## Error Handling

### Snippet Loading Errors
- Graceful degradation if snippet definitions are malformed
- Logging of snippet registration failures
- Fallback to basic snippets if enhanced snippets fail

### Context Analysis Errors
- Default to showing all snippets if context cannot be determined
- Robust parsing that handles malformed Drools syntax
- Performance safeguards for large documents

### Completion Provider Errors
- Error boundaries around snippet expansion
- Fallback completion items if snippet processing fails
- User-friendly error messages for snippet failures

## Testing Strategy

### Unit Tests
1. **Snippet Registry Tests**
   - Verify all snippets are properly formatted
   - Test snippet categorization and filtering
   - Validate placeholder syntax

2. **Context Analyzer Tests**
   - Test rule structure detection
   - Verify then clause identification
   - Test edge cases (malformed rules, nested structures)

3. **Completion Provider Tests**
   - Test snippet filtering by context
   - Verify completion item creation
   - Test priority sorting

### Integration Tests
1. **End-to-End Snippet Expansion**
   - Test snippet expansion in actual .drl files
   - Verify placeholder navigation works correctly
   - Test indentation preservation

2. **Context-Aware Completion**
   - Test that Java snippets appear in then clauses
   - Verify Drools snippets work correctly
   - Test snippet priority in different contexts

### Performance Tests
1. **Large File Handling**
   - Test completion performance with large .drl files
   - Verify context analysis doesn't block UI
   - Test memory usage with many snippets

2. **Snippet Loading Performance**
   - Test extension activation time with snippet loading
   - Verify snippet registry initialization performance

## Implementation Phases

### Phase 1: Core Infrastructure
- Extend existing snippet provider
- Implement context analyzer
- Create snippet registry structure

### Phase 2: Java Snippets
- Implement comprehensive Java snippet collection
- Add control flow, collections, and utility snippets
- Test Java snippet expansion and navigation

### Phase 3: Drools Snippets
- Implement Drools-specific snippets
- Add fact manipulation and context access snippets
- Test Drools snippet integration

### Phase 4: Context Awareness
- Implement intelligent snippet filtering
- Add priority-based sorting
- Test context-aware completion

### Phase 5: Documentation and Polish
- Add comprehensive snippet documentation
- Implement snippet examples and help
- Performance optimization and testing

## Configuration Options

### Extension Settings

```json
{
    "drools.snippets.enableJavaSnippets": {
        "type": "boolean",
        "default": true,
        "description": "Enable Java code snippets in then clauses"
    },
    "drools.snippets.enableDroolsSnippets": {
        "type": "boolean", 
        "default": true,
        "description": "Enable Drools-specific snippets"
    },
    "drools.snippets.contextAwarePriority": {
        "type": "boolean",
        "default": true,
        "description": "Prioritize relevant snippets based on context"
    },
    "drools.snippets.showDocumentation": {
        "type": "boolean",
        "default": true,
        "description": "Show detailed documentation for snippets"
    }
}
```

## Performance Considerations

### Snippet Loading
- Lazy loading of snippet definitions
- Caching of parsed snippet templates
- Efficient snippet filtering algorithms

### Context Analysis
- Incremental parsing for context detection
- Caching of rule structure analysis
- Debounced context updates

### Memory Management
- Efficient storage of snippet definitions
- Cleanup of unused completion items
- Bounded caches for context analysis

## Security Considerations

### Code Injection Prevention
- Sanitization of snippet templates
- Validation of placeholder syntax
- Safe expansion of user-provided content

### Extension Security
- No external network requests for snippets
- All snippets defined statically in extension
- No dynamic code execution in snippets

This design provides a comprehensive foundation for implementing Java and Drools snippets that will significantly enhance the developer experience when writing Drools rules.