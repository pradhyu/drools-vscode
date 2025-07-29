/**
 * Abstract Syntax Tree (AST) node definitions for Drools language constructs
 */

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface ASTNode {
    type: string;
    range: Range;
}

// Root AST node representing a complete Drools file
export interface DroolsAST extends ASTNode {
    type: 'DroolsFile';
    packageDeclaration?: PackageNode;
    imports: ImportNode[];
    globals: GlobalNode[];
    functions: FunctionNode[];
    rules: RuleNode[];
    queries: QueryNode[];
    declares: DeclareNode[];
}

// Package declaration node
export interface PackageNode extends ASTNode {
    type: 'Package';
    name: string;
}

// Import statement node
export interface ImportNode extends ASTNode {
    type: 'Import';
    path: string;
    isStatic?: boolean;
}

// Global variable declaration node
export interface GlobalNode extends ASTNode {
    type: 'Global';
    dataType: string;
    name: string;
}

// Function definition node
export interface FunctionNode extends ASTNode {
    type: 'Function';
    returnType: string;
    name: string;
    parameters: ParameterNode[];
    body: string;
}

// Function parameter node
export interface ParameterNode extends ASTNode {
    type: 'Parameter';
    dataType: string;
    name: string;
}

// Rule definition node
export interface RuleNode extends ASTNode {
    type: 'Rule';
    name: string;
    attributes: RuleAttributeNode[];
    when?: WhenNode;
    then?: ThenNode;
}

// Rule attribute node (salience, no-loop, etc.)
export interface RuleAttributeNode extends ASTNode {
    type: 'RuleAttribute';
    name: string;
    value?: string | number | boolean;
}

// When clause node (rule conditions)
export interface WhenNode extends ASTNode {
    type: 'When';
    conditions: ConditionNode[];
}

// Then clause node (rule actions)
export interface ThenNode extends ASTNode {
    type: 'Then';
    actions: string; // Raw action code for now
}

// Multi-line pattern node interface
export interface MultiLinePatternNode extends ASTNode {
    type: 'MultiLinePattern';
    patternType: 'exists' | 'not' | 'eval' | 'forall' | 'collect' | 'accumulate';
    keyword: string;
    content: string;
    nestedPatterns: MultiLinePatternNode[];
    parenthesesRanges: Range[];
    isComplete: boolean;
    depth: number;
    innerConditions: ConditionNode[];
}

// Multi-line pattern metadata for parsing context
export interface MultiLinePatternMetadata {
    type: 'exists' | 'not' | 'eval' | 'forall' | 'collect' | 'accumulate';
    keyword: string;
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
    content: string;
    nestedPatterns: MultiLinePatternMetadata[];
    parenthesesRanges: Range[];
    isComplete: boolean;
}

// Parentheses tracking information
export interface ParenthesesTracker {
    openPositions: Position[];
    closePositions: Position[];
    matchedPairs: Array<{open: Position, close: Position}>;
    unmatchedOpen: Position[];
    unmatchedClose: Position[];
}

// Parsing context for multi-line patterns
export interface ParsingContext {
    parenthesesDepth: number;
    currentPattern?: MultiLinePatternMetadata;
    lineStart: number;
    columnStart: number;
    inMultiLinePattern: boolean;
    patternStack: MultiLinePatternMetadata[];
}

// Enhanced condition node with multi-line support
export interface ConditionNode extends ASTNode {
    type: 'Condition';
    conditionType: 'pattern' | 'eval' | 'exists' | 'not' | 'and' | 'or' | 'forall' | 'collect' | 'accumulate';
    content: string;
    variable?: string;
    factType?: string;
    constraints?: ConstraintNode[];
    isMultiLine?: boolean;
    spanLines?: number[];
    parenthesesRanges?: Range[];
    multiLinePattern?: MultiLinePatternNode;
    nestedConditions?: ConditionNode[];
}

// Constraint node within conditions
export interface ConstraintNode extends ASTNode {
    type: 'Constraint';
    field: string;
    operator: string;
    value: string;
}

// Query definition node
export interface QueryNode extends ASTNode {
    type: 'Query';
    name: string;
    parameters: ParameterNode[];
    conditions: ConditionNode[];
}

// Declare statement node
export interface DeclareNode extends ASTNode {
    type: 'Declare';
    name: string;
    fields: FieldNode[];
}

// Field node within declare statements
export interface FieldNode extends ASTNode {
    type: 'Field';
    name: string;
    dataType: string;
}

// Utility type for any AST node
export type AnyASTNode = 
    | DroolsAST
    | PackageNode
    | ImportNode
    | GlobalNode
    | FunctionNode
    | ParameterNode
    | RuleNode
    | RuleAttributeNode
    | WhenNode
    | ThenNode
    | ConditionNode
    | ConstraintNode
    | MultiLinePatternNode
    | QueryNode
    | DeclareNode
    | FieldNode;