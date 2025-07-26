import * as vscode from 'vscode';

export interface DroolsConfiguration {
    features: {
        enableSyntaxHighlighting: boolean;
        enableCompletion: boolean;
        enableDiagnostics: boolean;
        enableFormatting: boolean;
        enableBracketMatching: boolean;
        enableSnippets: boolean;
        enableSymbolProvider: boolean;
    };
    completion: {
        enableKeywords: boolean;
        enableFactTypes: boolean;
        enableFunctions: boolean;
        enableVariables: boolean;
        maxItems: number;
        triggerCharacters: string[];
    };
    diagnostics: {
        enableSyntaxValidation: boolean;
        enableSemanticValidation: boolean;
        enableBestPracticeWarnings: boolean;
        maxProblems: number;
        severity: {
            syntaxErrors: 'error' | 'warning' | 'info' | 'hint';
            semanticErrors: 'error' | 'warning' | 'info' | 'hint';
            bestPracticeViolations: 'error' | 'warning' | 'info' | 'hint';
        };
    };
    formatting: {
        formatOnSave: boolean;
        formatOnType: boolean;
        indentSize: number;
        insertSpaces: boolean;
        trimTrailingWhitespace: boolean;
        insertFinalNewline: boolean;
        spaceAroundOperators: boolean;
        spaceAfterCommas: boolean;
        alignRuleBlocks: boolean;
        preserveBlankLines: number;
    };
    snippets: {
        enableBuiltIn: boolean;
        enableCustom: boolean;
        customPath: string;
        triggerCharacters: string[];
        showInCompletion: boolean;
        templates: {
            basicRule: boolean;
            conditionalRule: boolean;
            functionDefinition: boolean;
            importStatement: boolean;
            packageDeclaration: boolean;
            globalDeclaration: boolean;
            queryDefinition: boolean;
        };
    };
    server: {
        maxFileSize: number;
        timeout: number;
        logLevel: 'off' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    };
    performance: {
        enableIncrementalParsing: boolean;
        enableCaching: boolean;
        debounceDelay: number;
    };
}

export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private configuration: DroolsConfiguration;
    private disposables: vscode.Disposable[] = [];

    private constructor() {
        this.configuration = this.loadConfiguration();
        this.setupConfigurationWatcher();
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    public getConfiguration(resource?: vscode.Uri): DroolsConfiguration {
        // Reload configuration for the specific resource to get workspace-specific settings
        if (resource) {
            return this.loadConfiguration(resource);
        }
        return this.configuration;
    }

    public getFeatureConfiguration(resource?: vscode.Uri): DroolsConfiguration['features'] {
        return this.getConfiguration(resource).features;
    }

    public getCompletionConfiguration(resource?: vscode.Uri): DroolsConfiguration['completion'] {
        return this.getConfiguration(resource).completion;
    }

    public getDiagnosticsConfiguration(resource?: vscode.Uri): DroolsConfiguration['diagnostics'] {
        return this.getConfiguration(resource).diagnostics;
    }

    public getFormattingConfiguration(resource?: vscode.Uri): DroolsConfiguration['formatting'] {
        return this.getConfiguration(resource).formatting;
    }

    public getSnippetsConfiguration(resource?: vscode.Uri): DroolsConfiguration['snippets'] {
        return this.getConfiguration(resource).snippets;
    }

    public getServerConfiguration(): DroolsConfiguration['server'] {
        return this.configuration.server;
    }

    public getPerformanceConfiguration(): DroolsConfiguration['performance'] {
        return this.configuration.performance;
    }

    public isFeatureEnabled(feature: keyof DroolsConfiguration['features'], resource?: vscode.Uri): boolean {
        return this.getFeatureConfiguration(resource)[feature];
    }

    public onConfigurationChanged(callback: (config: DroolsConfiguration) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('drools')) {
                this.configuration = this.loadConfiguration();
                callback(this.configuration);
            }
        });
    }

    private loadConfiguration(resource?: vscode.Uri): DroolsConfiguration {
        const config = vscode.workspace.getConfiguration('drools', resource);

        return {
            features: {
                enableSyntaxHighlighting: config.get('features.enableSyntaxHighlighting', true),
                enableCompletion: config.get('features.enableCompletion', true),
                enableDiagnostics: config.get('features.enableDiagnostics', true),
                enableFormatting: config.get('features.enableFormatting', true),
                enableBracketMatching: config.get('features.enableBracketMatching', true),
                enableSnippets: config.get('features.enableSnippets', true),
                enableSymbolProvider: config.get('features.enableSymbolProvider', true),
            },
            completion: {
                enableKeywords: config.get('completion.enableKeywords', true),
                enableFactTypes: config.get('completion.enableFactTypes', true),
                enableFunctions: config.get('completion.enableFunctions', true),
                enableVariables: config.get('completion.enableVariables', true),
                maxItems: config.get('completion.maxItems', 50),
                triggerCharacters: config.get('completion.triggerCharacters', ['.', ' ', '(', ',']),
            },
            diagnostics: {
                enableSyntaxValidation: config.get('diagnostics.enableSyntaxValidation', true),
                enableSemanticValidation: config.get('diagnostics.enableSemanticValidation', true),
                enableBestPracticeWarnings: config.get('diagnostics.enableBestPracticeWarnings', true),
                maxProblems: config.get('diagnostics.maxProblems', 1000),
                severity: config.get('diagnostics.severity', {
                    syntaxErrors: 'error',
                    semanticErrors: 'error',
                    bestPracticeViolations: 'warning',
                }),
            },
            formatting: {
                formatOnSave: config.get('formatting.formatOnSave', true),
                formatOnType: config.get('formatting.formatOnType', false),
                indentSize: config.get('formatting.indentSize', 4),
                insertSpaces: config.get('formatting.insertSpaces', true),
                trimTrailingWhitespace: config.get('formatting.trimTrailingWhitespace', true),
                insertFinalNewline: config.get('formatting.insertFinalNewline', true),
                spaceAroundOperators: config.get('formatting.spaceAroundOperators', true),
                spaceAfterCommas: config.get('formatting.spaceAfterCommas', true),
                alignRuleBlocks: config.get('formatting.alignRuleBlocks', true),
                preserveBlankLines: config.get('formatting.preserveBlankLines', 1),
            },
            snippets: {
                enableBuiltIn: config.get('snippets.enableBuiltIn', true),
                enableCustom: config.get('snippets.enableCustom', true),
                customPath: config.get('snippets.customPath', ''),
                triggerCharacters: config.get('snippets.triggerCharacters', ['r', 'f', 'i', 'p', 'g', 'q', 'w', 't']),
                showInCompletion: config.get('snippets.showInCompletion', true),
                templates: config.get('snippets.templates', {
                    basicRule: true,
                    conditionalRule: true,
                    functionDefinition: true,
                    importStatement: true,
                    packageDeclaration: true,
                    globalDeclaration: true,
                    queryDefinition: true,
                }),
            },
            server: {
                maxFileSize: config.get('server.maxFileSize', 5242880),
                timeout: config.get('server.timeout', 30000),
                logLevel: config.get('server.logLevel', 'info'),
            },
            performance: {
                enableIncrementalParsing: config.get('performance.enableIncrementalParsing', true),
                enableCaching: config.get('performance.enableCaching', true),
                debounceDelay: config.get('performance.debounceDelay', 300),
            },
        };
    }

    private setupConfigurationWatcher(): void {
        const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('drools')) {
                this.configuration = this.loadConfiguration();
            }
        });
        this.disposables.push(disposable);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

// Utility functions for common configuration checks
export function isFormattingEnabled(resource?: vscode.Uri): boolean {
    return ConfigurationManager.getInstance().isFeatureEnabled('enableFormatting', resource);
}

export function isCompletionEnabled(resource?: vscode.Uri): boolean {
    return ConfigurationManager.getInstance().isFeatureEnabled('enableCompletion', resource);
}

export function isDiagnosticsEnabled(resource?: vscode.Uri): boolean {
    return ConfigurationManager.getInstance().isFeatureEnabled('enableDiagnostics', resource);
}

export function isSnippetsEnabled(resource?: vscode.Uri): boolean {
    return ConfigurationManager.getInstance().isFeatureEnabled('enableSnippets', resource);
}

export function getFormattingOptions(resource?: vscode.Uri): vscode.FormattingOptions {
    const config = ConfigurationManager.getInstance().getFormattingConfiguration(resource);
    return {
        insertSpaces: config.insertSpaces,
        tabSize: config.indentSize,
    };
}