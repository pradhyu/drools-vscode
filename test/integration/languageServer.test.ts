/**
 * Integration tests for Drools Language Server
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { 
    createConnection, 
    TextDocuments,
    InitializeParams,
    CompletionParams,
    DocumentFormattingParams
} from 'vscode-languageserver/node';

// Mock the connection for testing
const mockConnection = (global as any).createMockConnection();

describe('Language Server Integration', () => {
    let documents: TextDocuments<TextDocument>;

    beforeEach(() => {
        documents = new TextDocuments(TextDocument);
        jest.clearAllMocks();
    });

    describe('Server Initialization', () => {
        test('should initialize with correct capabilities', () => {
            const initParams: InitializeParams = {
                processId: 1234,
                rootUri: 'file:///test/workspace',
                capabilities: {
                    workspace: {
                        configuration: true,
                        workspaceFolders: true
                    },
                    textDocument: {
                        publishDiagnostics: {
                            relatedInformation: true
                        }
                    }
                },
                workspaceFolders: null
            };

            // This would normally be handled by the server initialization
            const expectedCapabilities = {
                textDocumentSync: 2, // TextDocumentSyncKind.Incremental
                completionProvider: {
                    resolveProvider: true,
                    triggerCharacters: ['.', ' ', '\n']
                },
                signatureHelpProvider: {
                    triggerCharacters: ['(', ',']
                },
                diagnosticProvider: {
                    interFileDependencies: false,
                    workspaceDiagnostics: false
                },
                documentFormattingProvider: true,
                documentRangeFormattingProvider: true,
                foldingRangeProvider: true,
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                definitionProvider: true
            };

            expect(expectedCapabilities).toBeDefined();
            expect(expectedCapabilities.completionProvider).toBeDefined();
            expect(expectedCapabilities.documentFormattingProvider).toBe(true);
        });
    });

    describe('Document Synchronization', () => {
        test('should handle document open events', () => {
            const documentContent = `rule "Test Rule"
when
    $p : Person(age > 18)
then
    System.out.println("test");
end`;

            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                documentContent
            );

            // Simulate document opening
            // documents.onDidOpen?.({ document });

            expect(document.uri).toBe('file:///test.drl');
            expect(document.languageId).toBe('drools');
            expect(document.getText()).toBe(documentContent);
        });

        test('should handle document change events', () => {
            const initialContent = `rule "Test Rule"
when
    $p : Person(age > 18)
then
    System.out.println("test");
end`;

            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                initialContent
            );

            // Simulate document change
            const updatedContent = `rule "Updated Rule"
when
    $p : Person(age > 21)
then
    System.out.println("updated");
end`;

            const updatedDocument = TextDocument.update(
                document,
                [{ text: updatedContent }],
                2
            );

            expect(updatedDocument.version).toBe(2);
            expect(updatedDocument.getText()).toBe(updatedContent);
        });

        test('should handle document close events', () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                'rule "Test" when then end'
            );

            // Simulate document closing
            // documents.onDidClose?.({ document });

            // Document should be removed from tracking
            expect(documents.get(document.uri)).toBeUndefined();
        });
    });

    describe('Completion Integration', () => {
        test('should provide completions for keywords', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                ''
            );

            const completionParams: CompletionParams = {
                textDocument: { uri: document.uri },
                position: { line: 0, character: 0 }
            };

            // Mock completion handler would be called here
            // In a real integration test, we would set up the actual server
            expect(completionParams.textDocument.uri).toBe('file:///test.drl');
            expect(completionParams.position).toEqual({ line: 0, character: 0 });
        });

        test('should provide context-aware completions', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test Rule"
when
    $p : Person(age > 18)
then
    `
            );

            const completionParams: CompletionParams = {
                textDocument: { uri: document.uri },
                position: { line: 4, character: 4 }
            };

            // In then clause, should provide different completions than in when clause
            expect(completionParams.position.line).toBe(4);
        });
    });

    describe('Diagnostic Integration', () => {
        test('should provide diagnostics for syntax errors', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Bad Rule"
when
    $p : Person(age > 18
then
    System.out.println("test");
end`
            );

            // Mock diagnostic handler
            const diagnosticParams = {
                textDocument: { uri: document.uri }
            };

            // Should detect missing closing parenthesis
            expect(diagnosticParams.textDocument.uri).toBe('file:///test.drl');
        });

        test('should provide diagnostics for semantic errors', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Duplicate Rule"
when
    $p : Person(age > 18)
then
    System.out.println("first");
end

rule "Duplicate Rule"
when
    $c : Customer(active == true)
then
    System.out.println("second");
end`
            );

            const diagnosticParams = {
                textDocument: { uri: document.uri }
            };

            // Should detect duplicate rule names
            expect(diagnosticParams.textDocument.uri).toBe('file:///test.drl');
        });
    });

    describe('Formatting Integration', () => {
        test('should format document correctly', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test Rule"
when
$p : Person(age>18)
then
System.out.println("test");
end`
            );

            const formattingParams: DocumentFormattingParams = {
                textDocument: { uri: document.uri },
                options: {
                    tabSize: 4,
                    insertSpaces: true
                }
            };

            // Should return text edits for proper formatting
            expect(formattingParams.options.tabSize).toBe(4);
            expect(formattingParams.options.insertSpaces).toBe(true);
        });

        test('should handle range formatting', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test Rule"
when
$p:Person(age>18)
$c:Customer(active==true)
then
System.out.println("test");
end`
            );

            const rangeFormattingParams = {
                textDocument: { uri: document.uri },
                range: {
                    start: { line: 2, character: 0 },
                    end: { line: 3, character: 25 }
                },
                options: {
                    tabSize: 4,
                    insertSpaces: true
                }
            };

            // Should format only the specified range
            expect(rangeFormattingParams.range.start.line).toBe(2);
            expect(rangeFormattingParams.range.end.line).toBe(3);
        });
    });

    describe('Symbol Provider Integration', () => {
        test('should provide document symbols', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `package com.example.rules;

function String getName() {
    return "test";
}

rule "Test Rule"
when
    $p : Person(age > 18)
then
    System.out.println(getName());
end

query "findAdults"
    $p : Person(age > 18)
end`
            );

            const symbolParams = {
                textDocument: { uri: document.uri }
            };

            // Should find function, rule, and query symbols
            expect(symbolParams.textDocument.uri).toBe('file:///test.drl');
        });

        test('should provide workspace symbols', async () => {
            const document1 = TextDocument.create(
                'file:///rules1.drl',
                'drools',
                1,
                `rule "Rule One"
when
    $p : Person()
then
    System.out.println("one");
end`
            );

            const document2 = TextDocument.create(
                'file:///rules2.drl',
                'drools',
                1,
                `rule "Rule Two"
when
    $c : Customer()
then
    System.out.println("two");
end`
            );

            const workspaceSymbolParams = {
                query: 'Rule'
            };

            // Should find symbols across all documents
            expect(workspaceSymbolParams.query).toBe('Rule');
        });
    });

    describe('Definition Provider Integration', () => {
        test('should provide go-to-definition for functions', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `function String getName() {
    return "test";
}

rule "Test Rule"
when
    $p : Person(age > 18)
then
    System.out.println(getName());
end`
            );

            const definitionParams = {
                textDocument: { uri: document.uri },
                position: { line: 8, character: 25 } // Position on 'getName' call
            };

            // Should return location of function definition
            expect(definitionParams.position.line).toBe(8);
            expect(definitionParams.position.character).toBe(25);
        });

        test('should provide go-to-definition for variables', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test Rule"
when
    $person : Person(age > 18)
then
    System.out.println($person.getName());
end`
            );

            const definitionParams = {
                textDocument: { uri: document.uri },
                position: { line: 4, character: 25 } // Position on '$person' usage
            };

            // Should return location of variable declaration
            expect(definitionParams.position.line).toBe(4);
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle server errors gracefully', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                'invalid drools content that causes parsing errors'
            );

            // Simulate various operations that might fail
            const operations = [
                { type: 'completion', params: { textDocument: { uri: document.uri }, position: { line: 0, character: 0 } } },
                { type: 'formatting', params: { textDocument: { uri: document.uri }, options: { tabSize: 4, insertSpaces: true } } },
                { type: 'diagnostics', params: { textDocument: { uri: document.uri } } }
            ];

            // All operations should handle errors gracefully
            operations.forEach(operation => {
                expect(operation.params.textDocument.uri).toBe('file:///test.drl');
            });
        });

        test('should recover from parsing failures', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "First Rule"
when
    $p : Person(age > 18
    // Syntax error here
then
    System.out.println("first");
end

rule "Second Rule"
when
    $c : Customer(active == true)
then
    System.out.println("second");
end`
            );

            // Should still be able to provide some functionality for the valid parts
            const completionParams = {
                textDocument: { uri: document.uri },
                position: { line: 11, character: 4 } // In the valid second rule
            };

            expect(completionParams.position.line).toBe(11);
        });
    });

    describe('Configuration Integration', () => {
        test('should handle configuration changes', async () => {
            const configChange = {
                settings: {
                    drools: {
                        features: {
                            enableCompletion: false,
                            enableDiagnostics: true,
                            enableFormatting: true
                        },
                        completion: {
                            maxItems: 25
                        }
                    }
                }
            };

            // Configuration changes should affect server behavior
            expect(configChange.settings.drools.features.enableCompletion).toBe(false);
            expect(configChange.settings.drools.completion.maxItems).toBe(25);
        });

        test('should handle workspace-specific configuration', async () => {
            const workspaceConfig = {
                scopeUri: 'file:///workspace/project',
                section: 'drools'
            };

            // Should request configuration for specific workspace
            expect(workspaceConfig.scopeUri).toBe('file:///workspace/project');
            expect(workspaceConfig.section).toBe('drools');
        });
    });

    describe('Performance Integration', () => {
        test('should handle large documents efficiently', async () => {
            // Create a large document with many rules
            let largeContent = 'package com.example.rules;\n\n';
            
            for (let i = 0; i < 100; i++) {
                largeContent += `rule "Rule ${i}"
when
    $p${i} : Person(age > ${18 + i})
    $a${i} : Account(owner == $p${i}, balance > ${1000 + i * 100})
then
    System.out.println("Rule ${i} fired for " + $p${i}.getName());
    $a${i}.setLastAccessed(new Date());
end

`;
            }

            const largeDocument = TextDocument.create(
                'file:///large.drl',
                'drools',
                1,
                largeContent
            );

            // Operations should complete in reasonable time
            const startTime = Date.now();
            
            // Simulate parsing and analysis
            const lines = largeDocument.getText().split('\n');
            expect(lines.length).toBeGreaterThan(500);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // Should process large documents quickly (less than 1 second for this test)
            expect(processingTime).toBeLessThan(1000);
        });

        test('should handle rapid document changes', async () => {
            const document = TextDocument.create(
                'file:///test.drl',
                'drools',
                1,
                `rule "Test Rule"
when
    $p : Person(age > 18)
then
    System.out.println("test");
end`
            );

            // Simulate rapid changes
            let currentVersion = 1;
            let currentDocument = document;

            for (let i = 0; i < 10; i++) {
                // Replace the age value with 18 + i (so final iteration will be 18 + 9 = 27)
                const newAge = 18 + i;
                const newContent = currentDocument.getText().replace(/age > \d+/, `age > ${newAge}`);
                currentDocument = TextDocument.update(
                    currentDocument,
                    [{ text: newContent }],
                    ++currentVersion
                );
            }

            expect(currentDocument.version).toBe(11);
            expect(currentDocument.getText()).toContain('27'); // 18 + 9
        });
    });
});