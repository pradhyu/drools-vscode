import * as vscode from 'vscode';

interface DroolsSnippet {
    prefix: string;
    body: string[];
    description: string;
}

interface DroolsSnippetCollection {
    [key: string]: DroolsSnippet;
}

export class DroolsSnippetProvider implements vscode.CompletionItemProvider {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const config = vscode.workspace.getConfiguration('drools', document.uri);
        const enableSnippets = config.get<boolean>('enableSnippets', true);
        
        if (!enableSnippets) {
            return [];
        }

        const customSnippets = await this.loadCustomSnippets();
        const completionItems: vscode.CompletionItem[] = [];

        // Convert custom snippets to completion items
        for (const [name, snippet] of Object.entries(customSnippets)) {
            const item = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
            item.detail = `Custom: ${name}`;
            item.documentation = new vscode.MarkdownString(snippet.description);
            item.insertText = new vscode.SnippetString(snippet.body.join('\n'));
            item.sortText = `z_custom_${snippet.prefix}`; // Sort custom snippets after built-in ones
            
            completionItems.push(item);
        }

        return completionItems;
    }

    private async loadCustomSnippets(): Promise<DroolsSnippetCollection> {
        try {
            const customSnippets = this.context.globalState.get<DroolsSnippetCollection>('drools.customSnippets', {});
            return customSnippets;
        } catch (error) {
            console.error('Failed to load custom snippets:', error);
            return {};
        }
    }

    // Method to refresh snippets when they are updated
    public async refreshSnippets(): Promise<void> {
        // This method can be called when snippets are updated
        // VSCode will automatically call provideCompletionItems when needed
    }
}