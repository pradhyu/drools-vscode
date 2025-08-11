import * as vscode from 'vscode';
import { SnippetRegistry } from './snippetRegistry';
import { ContextAnalyzer, RuleContext } from './contextAnalyzer';

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

interface DroolsSnippetCollection {
    [key: string]: DroolsSnippet;
}



export class DroolsSnippetProvider implements vscode.CompletionItemProvider {
    private context: vscode.ExtensionContext;
    private builtInSnippets: DroolsSnippet[] = [];
    private contextAnalyzer: ContextAnalyzer;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.contextAnalyzer = new ContextAnalyzer();
        this.initializeBuiltInSnippets();
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const config = vscode.workspace.getConfiguration('drools', document.uri);
        const enableSnippets = config.get<boolean>('enableSnippets', true);
        const enableJavaSnippets = config.get<boolean>('enableJavaSnippets', true);
        const enableDroolsSnippets = config.get<boolean>('enableDroolsSnippets', true);
        const contextAwarePriority = config.get<boolean>('contextAwarePriority', true);
        
        if (!enableSnippets) {
            return [];
        }

        // Analyze current context using enhanced analyzer
        const ruleContext = this.contextAnalyzer.analyzeContext(document, position);
        
        // Get relevant snippets based on context and configuration
        const relevantSnippets = this.getRelevantSnippets(ruleContext, {
            enableJavaSnippets,
            enableDroolsSnippets,
            contextAwarePriority
        });

        // Load custom snippets
        const customSnippets = await this.loadCustomSnippets();
        
        const completionItems: vscode.CompletionItem[] = [];

        // Convert built-in snippets to completion items
        for (const snippet of relevantSnippets) {
            const item = this.createCompletionItem(snippet, ruleContext, contextAwarePriority);
            completionItems.push(item);
        }

        // Convert custom snippets to completion items
        for (const [name, snippet] of Object.entries(customSnippets)) {
            const item = new vscode.CompletionItem(snippet.label, snippet.kind);
            item.detail = `Custom: ${snippet.detail}`;
            item.documentation = new vscode.MarkdownString(snippet.documentation);
            item.insertText = snippet.insertText;
            item.sortText = `z_custom_${snippet.label}`;
            
            completionItems.push(item);
        }

        return completionItems;
    }

    private initializeBuiltInSnippets(): void {
        // Initialize the snippet registry
        SnippetRegistry.initialize();
        
        // Get all snippets from the registry
        this.builtInSnippets = SnippetRegistry.getAllSnippets();
    }



    private getRelevantSnippets(
        context: RuleContext, 
        config: { enableJavaSnippets: boolean; enableDroolsSnippets: boolean; contextAwarePriority: boolean }
    ): DroolsSnippet[] {
        let relevantSnippets = [...this.builtInSnippets];
        
        if (!config.contextAwarePriority) {
            return relevantSnippets;
        }
        
        // Filter snippets based on context
        switch (context) {
            case RuleContext.RULE_HEADER:
                relevantSnippets = relevantSnippets.filter(s => 
                    s.category === 'rule' || s.category === 'attribute'
                );
                break;
            case RuleContext.WHEN_CLAUSE:
                relevantSnippets = relevantSnippets.filter(s => 
                    s.category === 'condition'
                );
                break;
            case RuleContext.THEN_CLAUSE:
                relevantSnippets = relevantSnippets.filter(s => 
                    s.category === 'action' || 
                    (config.enableJavaSnippets && s.category === 'java') ||
                    (config.enableDroolsSnippets && s.category === 'drools')
                );
                break;
            case RuleContext.GLOBAL:
            case RuleContext.FUNCTION:
                relevantSnippets = relevantSnippets.filter(s => 
                    s.category === 'function'
                );
                break;
            default:
                // Show all snippets if context is unclear
                break;
        }
        
        return relevantSnippets;
    }

    private createCompletionItem(
        snippet: DroolsSnippet, 
        context: RuleContext, 
        contextAwarePriority: boolean
    ): vscode.CompletionItem {
        const item = new vscode.CompletionItem(snippet.label, snippet.kind);
        item.detail = snippet.detail;
        item.documentation = new vscode.MarkdownString(snippet.documentation);
        item.insertText = snippet.insertText;
        
        // Set sort priority based on context and snippet relevance
        let sortPrefix = '1'; // Default priority
        
        if (contextAwarePriority) {
            if (context === RuleContext.THEN_CLAUSE && 
                (snippet.category === 'java' || snippet.category === 'drools')) {
                sortPrefix = '0'; // Higher priority for Java/Drools snippets in then clause
            } else if (snippet.category === 'action' && context === RuleContext.THEN_CLAUSE) {
                sortPrefix = '0'; // Higher priority for action snippets in then clause
            } else if (snippet.category === 'condition' && context === RuleContext.WHEN_CLAUSE) {
                sortPrefix = '0'; // Higher priority for condition snippets in when clause
            }
        }
        
        item.sortText = `${sortPrefix}_${snippet.priority || 5}_${snippet.label}`;
        
        return item;
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
        this.initializeBuiltInSnippets();
    }

    // Method to add snippets programmatically (for use in subsequent tasks)
    public addSnippets(snippets: DroolsSnippet[]): void {
        this.builtInSnippets.push(...snippets);
    }

    // Method to get current context (for testing and debugging)
    public getCurrentContext(document: vscode.TextDocument, position: vscode.Position): RuleContext {
        return this.contextAnalyzer.analyzeContext(document, position);
    }
}