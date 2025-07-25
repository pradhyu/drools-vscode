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

// Condition node within when clause
export interface ConditionNode extends ASTNode {
    type: 'Condition';
    conditionType: 'pattern' | 'eval' | 'exists' | 'not' | 'and' | 'or';
    content: string;
    variable?: string;
    factType?: string;
    constraints?: ConstraintNode[];
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
    | QueryNode
    | DeclareNode
    | FieldNode;