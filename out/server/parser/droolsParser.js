"use strict";
/**
 * Drools language parser implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DroolsParser = void 0;
class DroolsParser {
    constructor() {
        this.text = '';
        this.lines = [];
        this.currentLine = 0;
        this.currentChar = 0;
        this.errors = [];
    }
    parse(text) {
        this.text = text;
        this.lines = text.split('\n');
        this.currentLine = 0;
        this.currentChar = 0;
        this.errors = [];
        const ast = this.parseFile();
        return {
            ast,
            errors: this.errors
        };
    }
    parseFile() {
        const start = this.getCurrentPosition();
        const ast = {
            type: 'DroolsFile',
            range: { start, end: start },
            packageDeclaration: undefined,
            imports: [],
            globals: [],
            functions: [],
            rules: [],
            queries: [],
            declares: []
        };
        // Skip initial whitespace and comments
        this.skipWhitespaceAndComments();
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === '') {
                this.nextLine();
                continue;
            }
            if (line.startsWith('package ')) {
                ast.packageDeclaration = this.parsePackage();
            }
            else if (line.startsWith('import ')) {
                ast.imports.push(this.parseImport());
            }
            else if (line.startsWith('global ')) {
                ast.globals.push(this.parseGlobal());
            }
            else if (line.startsWith('function ')) {
                ast.functions.push(this.parseFunction());
            }
            else if (line.startsWith('rule ')) {
                ast.rules.push(this.parseRule());
            }
            else if (line.startsWith('query ')) {
                ast.queries.push(this.parseQuery());
            }
            else if (line.startsWith('declare ')) {
                ast.declares.push(this.parseDeclare());
            }
            else {
                // Skip unknown lines or comments
                this.nextLine();
            }
            this.skipWhitespaceAndComments();
        }
        ast.range.end = this.getCurrentPosition();
        return ast;
    }
    parsePackage() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        const match = line.match(/^package\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;?$/);
        if (!match) {
            this.addError('Invalid package declaration', start);
            this.nextLine();
            return {
                type: 'Package',
                name: '',
                range: { start, end: this.getCurrentPosition() }
            };
        }
        const packageName = match[1];
        this.nextLine();
        return {
            type: 'Package',
            name: packageName,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseImport() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        const staticMatch = line.match(/^import\s+static\s+([a-zA-Z_][a-zA-Z0-9_.*]*)\s*;?$/);
        const regularMatch = line.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_.*]*)\s*;?$/);
        let importPath = '';
        let isStatic = false;
        if (staticMatch) {
            importPath = staticMatch[1];
            isStatic = true;
        }
        else if (regularMatch) {
            importPath = regularMatch[1];
        }
        else {
            this.addError('Invalid import declaration', start);
        }
        this.nextLine();
        return {
            type: 'Import',
            path: importPath,
            isStatic,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseGlobal() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        const match = line.match(/^global\s+([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;?$/);
        if (!match) {
            this.addError('Invalid global declaration', start);
            this.nextLine();
            return {
                type: 'Global',
                dataType: '',
                name: '',
                range: { start, end: this.getCurrentPosition() }
            };
        }
        const dataType = match[1];
        const name = match[2];
        this.nextLine();
        return {
            type: 'Global',
            dataType,
            name,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseFunction() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        // Parse function signature: function ReturnType functionName(params)
        const match = line.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*\{?$/);
        if (!match) {
            this.addError('Invalid function declaration', start);
            this.nextLine();
            return {
                type: 'Function',
                returnType: '',
                name: '',
                parameters: [],
                body: '',
                range: { start, end: this.getCurrentPosition() }
            };
        }
        const returnType = match[1];
        const name = match[2];
        const paramString = match[3];
        // Parse parameters
        const parameters = this.parseParameters(paramString);
        // Parse function body
        this.nextLine();
        const body = this.parseFunctionBody();
        return {
            type: 'Function',
            returnType,
            name,
            parameters,
            body,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseParameters(paramString) {
        const parameters = [];
        if (paramString.trim() === '') {
            return parameters;
        }
        const params = paramString.split(',');
        for (const param of params) {
            const trimmed = param.trim();
            const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_.<>]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
            if (match) {
                parameters.push({
                    type: 'Parameter',
                    dataType: match[1],
                    name: match[2],
                    range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
                });
            }
        }
        return parameters;
    }
    parseFunctionBody() {
        let body = '';
        let braceCount = 0;
        let foundOpenBrace = false;
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine();
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpenBrace = true;
                }
                else if (char === '}') {
                    braceCount--;
                }
            }
            body += line + '\n';
            this.nextLine();
            if (foundOpenBrace && braceCount === 0) {
                break;
            }
        }
        return body.trim();
    }
    parseRule() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        // Parse rule name: rule "Rule Name" or rule RuleName
        const quotedMatch = line.match(/^rule\s+"([^"]+)"\s*$/);
        const unquotedMatch = line.match(/^rule\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        let ruleName = '';
        if (quotedMatch) {
            ruleName = quotedMatch[1];
        }
        else if (unquotedMatch) {
            ruleName = unquotedMatch[1];
        }
        else {
            this.addError('Invalid rule declaration', start);
        }
        this.nextLine();
        // Parse rule attributes (salience, no-loop, etc.)
        const attributes = this.parseRuleAttributes();
        // Parse when clause
        let whenClause;
        if (this.currentLine < this.lines.length && this.getCurrentLine().trim() === 'when') {
            whenClause = this.parseWhen();
        }
        // Parse then clause
        let thenClause;
        if (this.currentLine < this.lines.length && this.getCurrentLine().trim() === 'then') {
            thenClause = this.parseThen();
        }
        // Expect 'end' keyword
        if (this.currentLine < this.lines.length && this.getCurrentLine().trim() === 'end') {
            this.nextLine();
        }
        else {
            this.addError('Expected "end" keyword to close rule', this.getCurrentPosition());
        }
        return {
            type: 'Rule',
            name: ruleName,
            attributes,
            when: whenClause,
            then: thenClause,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseRuleAttributes() {
        const attributes = [];
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === 'when' || line === 'then' || line === 'end' || line === '') {
                break;
            }
            // Parse attributes like "salience 100", "no-loop true", etc.
            const match = line.match(/^([a-zA-Z-]+)(?:\s+(.+))?\s*$/);
            if (match) {
                const name = match[1];
                let value = match[2];
                // Try to parse value as number or boolean
                if (value) {
                    if (value === 'true') {
                        value = true;
                    }
                    else if (value === 'false') {
                        value = false;
                    }
                    else if (!isNaN(Number(value))) {
                        value = Number(value);
                    }
                }
                attributes.push({
                    type: 'RuleAttribute',
                    name,
                    value,
                    range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
                });
            }
            this.nextLine();
        }
        return attributes;
    }
    parseWhen() {
        const start = this.getCurrentPosition();
        this.nextLine(); // Skip 'when' line
        const conditions = [];
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === 'then' || line === 'end' || line === '') {
                break;
            }
            const condition = this.parseCondition();
            if (condition) {
                conditions.push(condition);
            }
            this.nextLine();
        }
        return {
            type: 'When',
            conditions,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseCondition() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        if (line === '') {
            return null;
        }
        // Parse different condition types
        let conditionType = 'pattern';
        let content = line;
        let variable;
        let factType;
        if (line.startsWith('exists(')) {
            conditionType = 'exists';
            content = line.substring(7, line.length - 1); // Remove exists( and )
        }
        else if (line.startsWith('not(')) {
            conditionType = 'not';
            content = line.substring(4, line.length - 1); // Remove not( and )
        }
        else if (line.startsWith('eval(')) {
            conditionType = 'eval';
            content = line.substring(5, line.length - 1); // Remove eval( and )
        }
        else {
            // Parse pattern: $var : FactType(constraints)
            const patternMatch = line.match(/^(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)\s*$/);
            if (patternMatch) {
                variable = patternMatch[1];
                factType = patternMatch[2];
                content = patternMatch[3];
            }
        }
        return {
            type: 'Condition',
            conditionType,
            content,
            variable,
            factType,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseThen() {
        const start = this.getCurrentPosition();
        this.nextLine(); // Skip 'then' line
        let actions = '';
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === 'end') {
                break;
            }
            actions += this.getCurrentLine() + '\n';
            this.nextLine();
        }
        return {
            type: 'Then',
            actions: actions.trim(),
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseQuery() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        // Parse query: query "queryName"(params)
        const match = line.match(/^query\s+"([^"]+)"\s*(?:\((.*?)\))?\s*$/);
        if (!match) {
            this.addError('Invalid query declaration', start);
            this.nextLine();
            return {
                type: 'Query',
                name: '',
                parameters: [],
                conditions: [],
                range: { start, end: this.getCurrentPosition() }
            };
        }
        const name = match[1];
        const paramString = match[2] || '';
        const parameters = this.parseParameters(paramString);
        this.nextLine();
        // Parse query conditions (similar to rule when clause)
        const conditions = [];
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === 'end') {
                this.nextLine();
                break;
            }
            if (line !== '') {
                const condition = this.parseCondition();
                if (condition) {
                    conditions.push(condition);
                }
            }
            this.nextLine();
        }
        return {
            type: 'Query',
            name,
            parameters,
            conditions,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    parseDeclare() {
        const start = this.getCurrentPosition();
        const line = this.getCurrentLine().trim();
        // Parse declare: declare TypeName
        const match = line.match(/^declare\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        if (!match) {
            this.addError('Invalid declare statement', start);
            this.nextLine();
            return {
                type: 'Declare',
                name: '',
                fields: [],
                range: { start, end: this.getCurrentPosition() }
            };
        }
        const name = match[1];
        this.nextLine();
        // Parse fields
        const fields = [];
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            if (line === 'end') {
                this.nextLine();
                break;
            }
            if (line !== '') {
                const fieldMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_.<>]*)\s*$/);
                if (fieldMatch) {
                    fields.push({
                        type: 'Field',
                        name: fieldMatch[1],
                        dataType: fieldMatch[2],
                        range: { start: this.getCurrentPosition(), end: this.getCurrentPosition() }
                    });
                }
            }
            this.nextLine();
        }
        return {
            type: 'Declare',
            name,
            fields,
            range: { start, end: this.getCurrentPosition() }
        };
    }
    // Utility methods
    getCurrentPosition() {
        return {
            line: this.currentLine,
            character: this.currentChar
        };
    }
    getCurrentLine() {
        return this.currentLine < this.lines.length ? this.lines[this.currentLine] : '';
    }
    nextLine() {
        this.currentLine++;
        this.currentChar = 0;
    }
    skipWhitespaceAndComments() {
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine().trim();
            // Skip empty lines
            if (line === '') {
                this.nextLine();
                continue;
            }
            // Skip line comments
            if (line.startsWith('//')) {
                this.nextLine();
                continue;
            }
            // Skip block comments
            if (line.startsWith('/*')) {
                this.skipBlockComment();
                continue;
            }
            break;
        }
    }
    skipBlockComment() {
        while (this.currentLine < this.lines.length) {
            const line = this.getCurrentLine();
            if (line.includes('*/')) {
                this.nextLine();
                break;
            }
            this.nextLine();
        }
    }
    addError(message, position, severity = 'error') {
        this.errors.push({
            message,
            range: { start: position, end: position },
            severity
        });
    }
}
exports.DroolsParser = DroolsParser;
//# sourceMappingURL=droolsParser.js.map