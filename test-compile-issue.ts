// Test file to isolate compilation issue
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { RuleNode } from '../src/server/parser/ast';

class TestClass {
    private validateVariableUsageBetweenClauses(rule: RuleNode, diagnostics: Diagnostic[]): void {
        if (!rule.when || !rule.then) {
            return; // Can't validate if either clause is missing
        }
        
        console.log('Test method');
    }
}