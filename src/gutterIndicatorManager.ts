/**
 * Client-side gutter indicator manager for enhanced tooltips
 * Manages visual gutter indicators (error/warning/info icons) and their interactions
 */

import * as vscode from 'vscode';

export interface GutterIndicator {
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    tooltip: vscode.MarkdownString;
    range: vscode.Range;
}

export interface GutterIndicatorSettings {
    enableErrorIcons: boolean;
    enableWarningIcons: boolean;
    enableInfoIcons: boolean;
    enableClickableIcons: boolean;
    iconSize: 'small' | 'medium' | 'large';
}

export class GutterIndicatorManager {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType>;
    private indicators: Map<string, GutterIndicator[]>;
    private settings: GutterIndicatorSettings;
    private disposables: vscode.Disposable[];

    constructor(settings: Partial<GutterIndicatorSettings> = {}) {
        this.decorationTypes = new Map();
        this.indicators = new Map();
        this.disposables = [];
        
        this.settings = {
            enableErrorIcons: true,
            enableWarningIcons: true,
            enableInfoIcons: true,
            enableClickableIcons: true,
            iconSize: 'medium',
            ...settings
        };

        this.initializeDecorationTypes();
        this.setupEventListeners();
    }

    /**
     * Initialize decoration types for different severity levels
     */
    private initializeDecorationTypes(): void {
        // Error decoration (red)
        this.decorationTypes.set('error', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getIconPath('error'),
            gutterIconSize: this.settings.iconSize,
            overviewRulerColor: new vscode.ThemeColor('errorForeground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            light: {
                gutterIconPath: this.getIconPath('error', 'light')
            },
            dark: {
                gutterIconPath: this.getIconPath('error', 'dark')
            }
        }));

        // Warning decoration (yellow)
        this.decorationTypes.set('warning', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getIconPath('warning'),
            gutterIconSize: this.settings.iconSize,
            overviewRulerColor: new vscode.ThemeColor('warningForeground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            light: {
                gutterIconPath: this.getIconPath('warning', 'light')
            },
            dark: {
                gutterIconPath: this.getIconPath('warning', 'dark')
            }
        }));

        // Info decoration (blue)
        this.decorationTypes.set('info', vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.getIconPath('info'),
            gutterIconSize: this.settings.iconSize,
            overviewRulerColor: new vscode.ThemeColor('notificationInfoForeground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            light: {
                gutterIconPath: this.getIconPath('info', 'light')
            },
            dark: {
                gutterIconPath: this.getIconPath('info', 'dark')
            }
        }));
    }

    /**
     * Get icon path for severity and theme
     */
    private getIconPath(severity: string, theme?: 'light' | 'dark'): vscode.Uri {
        // Use VSCode's built-in icons
        const iconName = this.getIconName(severity);
        return vscode.Uri.parse(`$(${iconName})`);
    }

    /**
     * Get VSCode icon name for severity
     */
    private getIconName(severity: string): string {
        switch (severity) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'circle-outline';
        }
    }

    /**
     * Adapt to theme changes
     */
    public adaptToTheme(theme: vscode.ColorTheme): void {
        // Recreate decoration types with theme-appropriate colors
        this.disposeDecorationTypes();
        this.initializeDecorationTypes();

        // Update decorations for active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.updateDecorations(activeEditor);
        }
    }

    /**
     * Setup event listeners for editor changes and clicks
     */
    private setupEventListeners(): void {
        // Listen for active editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.updateDecorations(editor);
                }
            })
        );

        // Listen for document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === event.document) {
                    // Debounce updates to avoid excessive decoration updates
                    setTimeout(() => this.updateDecorations(editor), 100);
                }
            })
        );

        // Listen for cursor position changes to show tooltips
        if (this.settings.enableClickableIcons) {
            this.disposables.push(
                vscode.window.onDidChangeTextEditorSelection(event => {
                    this.handleCursorPositionChange(event);
                })
            );
        }

        // Listen for theme changes
        this.disposables.push(
            vscode.window.onDidChangeActiveColorTheme(theme => {
                this.adaptToTheme(theme);
            })
        );
    }

    /**
     * Update indicators for a document
     */
    public updateIndicators(uri: string, diagnostics: vscode.Diagnostic[]): void {
        const indicators: GutterIndicator[] = [];

        // Group diagnostics by line and severity
        const lineMap = new Map<number, { diagnostics: vscode.Diagnostic[], highestSeverity: vscode.DiagnosticSeverity }>();

        diagnostics.forEach(diagnostic => {
            // Handle malformed diagnostics gracefully
            if (!diagnostic || !diagnostic.range || !diagnostic.range.start) {
                return;
            }
            
            const line = diagnostic.range.start.line;
            if (!lineMap.has(line)) {
                lineMap.set(line, { diagnostics: [], highestSeverity: diagnostic.severity });
            }
            
            const lineData = lineMap.get(line)!;
            lineData.diagnostics.push(diagnostic);
            
            // Update highest severity (lower number = higher severity)
            if (diagnostic.severity < lineData.highestSeverity) {
                lineData.highestSeverity = diagnostic.severity;
            }
        });

        // Create indicators for each line
        lineMap.forEach((lineData, line) => {
            const severity = this.mapDiagnosticSeverityToString(lineData.highestSeverity);
            
            // Skip if this severity type is disabled
            if (!this.isSeverityEnabled(severity)) {
                return;
            }

            const tooltip = this.createTooltipForLine(lineData.diagnostics);
            
            indicators.push({
                line,
                severity,
                message: lineData.diagnostics[0].message,
                tooltip,
                range: lineData.diagnostics[0].range
            });
        });

        this.indicators.set(uri, indicators);

        // Update decorations for active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.toString() === uri) {
            this.updateDecorations(activeEditor);
        }
    }

    /**
     * Create tooltip content for diagnostics on a line
     */
    private createTooltipForLine(diagnostics: vscode.Diagnostic[]): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.supportHtml = true;
        tooltip.isTrusted = true;

        if (diagnostics.length === 1) {
            const diagnostic = diagnostics[0];
            const severityIcon = this.getSeverityIcon(diagnostic.severity);
            tooltip.appendMarkdown(`${severityIcon} **${this.getSeverityLabel(diagnostic.severity)}**\n\n`);
            tooltip.appendMarkdown(diagnostic.message);
        } else {
            tooltip.appendMarkdown(`**${diagnostics.length} Issues on this line:**\n\n`);
            
            diagnostics.forEach((diagnostic, index) => {
                const severityIcon = this.getSeverityIcon(diagnostic.severity);
                const severityLabel = this.getSeverityLabel(diagnostic.severity);
                tooltip.appendMarkdown(`${index + 1}. ${severityIcon} **${severityLabel}:** ${diagnostic.message}\n\n`);
            });
        }

        // Add click instruction if clickable icons are enabled
        if (this.settings.enableClickableIcons) {
            tooltip.appendMarkdown('\n---\n💡 *Click on the gutter icon for more details*');
        }

        return tooltip;
    }

    /**
     * Get severity icon for markdown
     */
    private getSeverityIcon(severity: vscode.DiagnosticSeverity): string {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return '🔴';
            case vscode.DiagnosticSeverity.Warning:
                return '🟡';
            case vscode.DiagnosticSeverity.Information:
                return '🔵';
            case vscode.DiagnosticSeverity.Hint:
                return '💡';
            default:
                return '⚪';
        }
    }

    /**
     * Get severity label
     */
    private getSeverityLabel(severity: vscode.DiagnosticSeverity): string {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'Error';
            case vscode.DiagnosticSeverity.Warning:
                return 'Warning';
            case vscode.DiagnosticSeverity.Information:
                return 'Info';
            case vscode.DiagnosticSeverity.Hint:
                return 'Hint';
            default:
                return 'Unknown';
        }
    }

    /**
     * Map VSCode diagnostic severity to string
     */
    private mapDiagnosticSeverityToString(severity: vscode.DiagnosticSeverity): 'error' | 'warning' | 'info' {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'error';
            case vscode.DiagnosticSeverity.Warning:
                return 'warning';
            case vscode.DiagnosticSeverity.Information:
            case vscode.DiagnosticSeverity.Hint:
                return 'info';
            default:
                return 'info';
        }
    }

    /**
     * Check if severity type is enabled
     */
    private isSeverityEnabled(severity: 'error' | 'warning' | 'info'): boolean {
        switch (severity) {
            case 'error':
                return this.settings.enableErrorIcons;
            case 'warning':
                return this.settings.enableWarningIcons;
            case 'info':
                return this.settings.enableInfoIcons;
            default:
                return false;
        }
    }

    /**
     * Update decorations for an editor
     */
    private updateDecorations(editor: vscode.TextEditor): void {
        const uri = editor.document.uri.toString();
        const indicators = this.indicators.get(uri) || [];

        // Group indicators by severity
        const errorRanges: vscode.DecorationOptions[] = [];
        const warningRanges: vscode.DecorationOptions[] = [];
        const infoRanges: vscode.DecorationOptions[] = [];

        indicators.forEach(indicator => {
            const decorationOptions: vscode.DecorationOptions = {
                range: new vscode.Range(indicator.line, 0, indicator.line, 0),
                hoverMessage: indicator.tooltip
            };

            switch (indicator.severity) {
                case 'error':
                    errorRanges.push(decorationOptions);
                    break;
                case 'warning':
                    warningRanges.push(decorationOptions);
                    break;
                case 'info':
                    infoRanges.push(decorationOptions);
                    break;
            }
        });

        // Apply decorations
        const errorDecoration = this.decorationTypes.get('error');
        const warningDecoration = this.decorationTypes.get('warning');
        const infoDecoration = this.decorationTypes.get('info');

        if (errorDecoration) {
            editor.setDecorations(errorDecoration, errorRanges);
        }
        if (warningDecoration) {
            editor.setDecorations(warningDecoration, warningRanges);
        }
        if (infoDecoration) {
            editor.setDecorations(infoDecoration, infoRanges);
        }
    }

    /**
     * Handle cursor position changes for clickable icons
     */
    private handleCursorPositionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        if (!this.settings.enableClickableIcons) return;

        const editor = event.textEditor;
        const position = event.selections[0].active;
        const uri = editor.document.uri.toString();
        const indicators = this.indicators.get(uri) || [];

        // Check if cursor is on a line with indicators
        const lineIndicator = indicators.find(indicator => indicator.line === position.line);
        if (lineIndicator) {
            // Show enhanced tooltip or trigger action
            this.handleGutterIconClick(lineIndicator, editor);
        }
    }

    /**
     * Handle gutter icon click
     */
    private handleGutterIconClick(indicator: GutterIndicator, editor: vscode.TextEditor): void {
        // Show information message with action buttons
        const actions = ['Show Details', 'Quick Fix', 'Ignore'];
        
        vscode.window.showInformationMessage(
            `${this.getSeverityLabel(this.mapStringToSeverity(indicator.severity))}: ${indicator.message}`,
            ...actions
        ).then(action => {
            switch (action) {
                case 'Show Details':
                    this.showDetailedTooltip(indicator, editor);
                    break;
                case 'Quick Fix':
                    this.triggerQuickFix(indicator, editor);
                    break;
                case 'Ignore':
                    // Could implement ignore functionality
                    break;
            }
        });
    }

    /**
     * Show detailed tooltip
     */
    private showDetailedTooltip(indicator: GutterIndicator, editor: vscode.TextEditor): void {
        // Create a webview or show in output channel
        const channel = vscode.window.createOutputChannel('Drools Diagnostics');
        channel.clear();
        channel.appendLine(`=== ${this.getSeverityLabel(this.mapStringToSeverity(indicator.severity))} Details ===`);
        channel.appendLine(`Line: ${indicator.line + 1}`);
        channel.appendLine(`Message: ${indicator.message}`);
        channel.appendLine('');
        channel.appendLine('Tooltip Content:');
        channel.appendLine(indicator.tooltip.value);
        channel.show();
    }

    /**
     * Trigger quick fix
     */
    private triggerQuickFix(indicator: GutterIndicator, editor: vscode.TextEditor): void {
        // Trigger VSCode's quick fix command
        vscode.commands.executeCommand('editor.action.quickFix', {
            uri: editor.document.uri,
            range: indicator.range
        });
    }

    /**
     * Map string severity to VSCode severity
     */
    private mapStringToSeverity(severity: 'error' | 'warning' | 'info'): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'info':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }

    /**
     * Clear indicators for a document
     */
    public clearIndicators(uri: string): void {
        this.indicators.delete(uri);
        
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.toString() === uri) {
            // Clear all decorations
            this.decorationTypes.forEach(decoration => {
                activeEditor.setDecorations(decoration, []);
            });
        }
    }

    /**
     * Update settings
     */
    public updateSettings(newSettings: Partial<GutterIndicatorSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        
        // Recreate decoration types if icon size changed
        if (newSettings.iconSize) {
            this.disposeDecorationTypes();
            this.initializeDecorationTypes();
        }

        // Update decorations for active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.updateDecorations(activeEditor);
        }
    }

    /**
     * Dispose decoration types
     */
    private disposeDecorationTypes(): void {
        this.decorationTypes.forEach(decoration => decoration.dispose());
        this.decorationTypes.clear();
    }

    /**
     * Get indicator count for a document
     */
    public getIndicatorCount(uri: string): { errors: number; warnings: number; info: number } {
        const indicators = this.indicators.get(uri) || [];
        
        return {
            errors: indicators.filter(i => i.severity === 'error').length,
            warnings: indicators.filter(i => i.severity === 'warning').length,
            info: indicators.filter(i => i.severity === 'info').length
        };
    }

    /**
     * Dispose all resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable?.dispose());
        this.disposeDecorationTypes();
        this.indicators.clear();
    }
}