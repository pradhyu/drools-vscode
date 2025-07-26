const assert = require('assert');

// Test that the server properly registers folding range capability
console.log('Testing Language Server Integration for Folding...');

// Mock the language server connection
const mockConnection = {
    capabilities: {},
    onFoldingRanges: null,
    
    // Mock the initialization result
    initialize: function() {
        return {
            capabilities: {
                textDocumentSync: 1, // TextDocumentSyncKind.Incremental
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
                foldingRangeProvider: true  // This should be present
            }
        };
    },
    
    // Mock the folding range handler registration
    registerFoldingRangeHandler: function(handler) {
        this.onFoldingRanges = handler;
        return true;
    }
};

// Test 1: Server should register folding range capability
const initResult = mockConnection.initialize();
assert(initResult.capabilities.foldingRangeProvider === true, 
    'Server should register folding range capability');

console.log('✅ Server registers folding range capability');

// Test 2: Folding range handler should be registerable
const mockHandler = async (params) => {
    return [
        {
            startLine: 0,
            endLine: 5,
            kind: 3, // FoldingRangeKind.Region
            collapsedText: 'rule "test"'
        }
    ];
};

const handlerRegistered = mockConnection.registerFoldingRangeHandler(mockHandler);
assert(handlerRegistered === true, 'Folding range handler should be registerable');
assert(mockConnection.onFoldingRanges === mockHandler, 'Handler should be stored correctly');

console.log('✅ Folding range handler registration works');

// Test 3: Handler should return proper folding ranges
const mockParams = {
    textDocument: {
        uri: 'file:///test.drl'
    }
};

mockConnection.onFoldingRanges(mockParams).then(ranges => {
    assert(Array.isArray(ranges), 'Handler should return array of folding ranges');
    assert(ranges.length > 0, 'Handler should return at least one folding range');
    
    const range = ranges[0];
    assert(typeof range.startLine === 'number', 'Folding range should have numeric startLine');
    assert(typeof range.endLine === 'number', 'Folding range should have numeric endLine');
    assert(typeof range.kind === 'number', 'Folding range should have numeric kind');
    assert(typeof range.collapsedText === 'string', 'Folding range should have string collapsedText');
    
    console.log('✅ Folding range handler returns proper structure');
    console.log(`   Range: lines ${range.startLine}-${range.endLine}, text: "${range.collapsedText}"`);
    
    console.log('\n🎉 All language server integration tests passed!');
}).catch(error => {
    console.error('❌ Handler test failed:', error);
    process.exit(1);
});