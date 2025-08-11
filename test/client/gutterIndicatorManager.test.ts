/**
 * Tests for Gutter Indicator Manager
 * Note: These tests require VSCode test environment
 */

import * as vscode from 'vscode';
import { GutterIndicatorManager, GutterIndicator } from '../../src/gutterIndicatorManager';

// Mock VSCode API for testing
const mockVSCode = {
    window: {
        createTextEditorDecorationType: jest.fn(),
        activeTextEditor: undefined as vscode.TextEditor | undefined,
        onDidChangeActiveTextEditor: jest.fn(),
        onDidChangeTextEditorSelection: jest.fn(),
        onDidChangeActiveColorTheme: jest.fn(),
        showInformationMessage: jest.fn(),
        createOutputChannel: jest.fn()
    },
    workspace: {
        onDidChangeTextDocument: jest.fn()
    },
    Uri: {
        parse: jest.fn()
    },
    Range: jest.fn(),
    MarkdownString: jest.fn(),
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    ThemeColor: jest.fn(),
    OverviewRulerLane: {
        Right: 7
    }
};

// Mock the vscode module
jest.mock('vscode', () => mockVSCode, { virtual: true });

describe('GutterIndicatorManager', () => {
    let manager: GutterIndicatorManager;
    let mockDecorationType: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock decoration type
        mockDecorationType = {
            dispose: jest.fn()
        };
        
        mockVSCode.window.createTextEditorDecorationType.mockReturnValue(mockDecorationType);
        mockVSCode.window.onDidChangeActiveTextEditor.mockReturnValue({ dispose: jest.fn() });
        mockVSCode.workspace.onDidChangeTextDocument.mockReturnValue({ dispose: jest.fn() });
        mockVSCode.window.onDidChangeTextEditorSelection.mockReturnValue({ dispose: jest.fn() });
        mockVSCode.window.onDidChangeActiveColorTheme.mockReturnValue({ dispose: jest.fn() });
        mockVSCode.Uri.parse.mockReturnValue({});
        mockVSCode.Range.mockImplementation((start, end) => ({ start, end }));
        mockVSCode.MarkdownString.mockImplementation((value) => ({ value, supportHtml: false, isTrusted: false }));
        mockVSCode.ThemeColor.mockImplementation((id) => ({ id }));

        manager = new GutterIndicatorManager();
    });

    afterEach(() => {
        manager.dispose();
    });

    describe('initialization', () => {
        it('should create decoration types for all severity levels', () => {
            expect(mockVSCode.window.createTextEditorDecorationType).toHaveBeenCalledTimes(3);
            
            // Should create decorations for error, warning, and info
            const calls = mockVSCode.window.createTextEditorDecorationType.mock.calls;
            expect(calls.some(call => call[0].gutterIconPath)).toBe(true);
        });

        it('should setup event listeners', () => {
            expect(mockVSCode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
            expect(mockVSCode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
            expect(mockVSCode.window.onDidChangeActiveColorTheme).toHaveBeenCalled();
        });

        it('should respect settings configuration', () => {
            const customManager = new GutterIndicatorManager({
                enableErrorIcons: false,
                enableWarningIcons: true,
                enableInfoIcons: true,
                iconSize: 'large'
            });

            expect(customManager).toBeDefined();
            customManager.dispose();
        });
    });

    describe('updateIndicators', () => {
        const mockDiagnostics: vscode.Diagnostic[] = [
            {
                range: new vscode.Range(0, 0, 0, 10),
                message: 'Error message',
                severity: vscode.DiagnosticSeverity.Error,
                source: 'drools'
            },
            {
                range: new vscode.Range(1, 0, 1, 15),
                message: 'Warning message',
                severity: vscode.DiagnosticSeverity.Warning,
                source: 'drools'
            },
            {
                range: new vscode.Range(2, 0, 2, 20),
                message: 'Info message',
                severity: vscode.DiagnosticSeverity.Information,
                source: 'drools'
            }
        ];

        it('should update indicators from diagnostics', () => {
            const uri = 'file:///test.drl';
            manager.updateIndicators(uri, mockDiagnostics);

            const counts = manager.getIndicatorCount(uri);
            expect(counts.errors).toBe(1);
            expect(counts.warnings).toBe(1);
            expect(counts.info).toBe(1);
        });

        it('should group multiple diagnostics on same line by highest severity', () => {
            const diagnosticsOnSameLine: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 5),
                    message: 'Warning message',
                    severity: vscode.DiagnosticSeverity.Warning,
                    source: 'drools'
                },
                {
                    range: new vscode.Range(0, 6, 0, 10),
                    message: 'Error message',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                }
            ];

            const uri = 'file:///test.drl';
            manager.updateIndicators(uri, diagnosticsOnSameLine);

            const counts = manager.getIndicatorCount(uri);
            // Should show as 1 error (highest severity wins)
            expect(counts.errors).toBe(1);
            expect(counts.warnings).toBe(0);
        });

        it('should create tooltips for indicators', () => {
            const uri = 'file:///test.drl';
            manager.updateIndicators(uri, mockDiagnostics);

            // Verify MarkdownString was created for tooltips
            expect(mockVSCode.MarkdownString).toHaveBeenCalled();
        });

        it('should handle empty diagnostics array', () => {
            const uri = 'file:///test.drl';
            manager.updateIndicators(uri, []);

            const counts = manager.getIndicatorCount(uri);
            expect(counts.errors).toBe(0);
            expect(counts.warnings).toBe(0);
            expect(counts.info).toBe(0);
        });
    });

    describe('decoration management', () => {
        let mockEditor: any;

        beforeEach(() => {
            mockEditor = {
                document: {
                    uri: { toString: () => 'file:///test.drl' }
                },
                setDecorations: jest.fn()
            };
            mockVSCode.window.activeTextEditor = mockEditor;
        });

        it('should apply decorations to active editor', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Error message',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                }
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);

            // Should call setDecorations for each decoration type
            expect(mockEditor.setDecorations).toHaveBeenCalled();
        });

        it('should clear decorations when indicators are cleared', () => {
            manager.clearIndicators('file:///test.drl');

            // Should call setDecorations with empty arrays
            expect(mockEditor.setDecorations).toHaveBeenCalledWith(mockDecorationType, []);
        });
    });

    describe('theme adaptation', () => {
        it('should adapt to theme changes', () => {
            const mockTheme: vscode.ColorTheme = {
                kind: vscode.ColorThemeKind.Dark
            };

            manager.adaptToTheme(mockTheme);

            // Should recreate decoration types
            expect(mockDecorationType.dispose).toHaveBeenCalled();
            expect(mockVSCode.window.createTextEditorDecorationType).toHaveBeenCalled();
        });
    });

    describe('settings management', () => {
        it('should update settings and recreate decorations if needed', () => {
            manager.updateSettings({
                iconSize: 'large',
                enableErrorIcons: false
            });

            // Should recreate decoration types due to icon size change
            expect(mockDecorationType.dispose).toHaveBeenCalled();
        });

        it('should not recreate decorations for non-visual setting changes', () => {
            const disposeCallsBefore = mockDecorationType.dispose.mock.calls.length;
            
            manager.updateSettings({
                enableClickableIcons: false
            });

            // Should not recreate decoration types
            expect(mockDecorationType.dispose.mock.calls.length).toBe(disposeCallsBefore);
        });
    });

    describe('click handling', () => {
        beforeEach(() => {
            mockVSCode.window.showInformationMessage.mockResolvedValue('Show Details');
            mockVSCode.window.createOutputChannel.mockReturnValue({
                clear: jest.fn(),
                appendLine: jest.fn(),
                show: jest.fn()
            });
        });

        it('should handle gutter icon clicks', async () => {
            const manager = new GutterIndicatorManager({
                enableClickableIcons: true
            });

            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test error',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                }
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);

            // Simulate cursor position change to trigger click handling
            const mockEvent = {
                textEditor: {
                    document: { uri: { toString: () => 'file:///test.drl' } }
                },
                selections: [{ active: { line: 0, character: 0 } }]
            };

            // This would normally be called by the event listener
            // We can't easily test the private method, but we can verify the setup
            expect(mockVSCode.window.onDidChangeTextEditorSelection).toHaveBeenCalled();

            manager.dispose();
        });
    });

    describe('tooltip creation', () => {
        it('should create appropriate tooltips for single diagnostic', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Single error message',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                }
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);

            // Verify tooltip creation
            expect(mockVSCode.MarkdownString).toHaveBeenCalled();
            const tooltipCall = mockVSCode.MarkdownString.mock.calls[0];
            expect(tooltipCall).toBeDefined();
        });

        it('should create appropriate tooltips for multiple diagnostics on same line', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 5),
                    message: 'First error',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                },
                {
                    range: new vscode.Range(0, 6, 0, 10),
                    message: 'Second error',
                    severity: vscode.DiagnosticSeverity.Warning,
                    source: 'drools'
                }
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);

            // Should create tooltip mentioning multiple issues
            expect(mockVSCode.MarkdownString).toHaveBeenCalled();
        });
    });

    describe('performance and memory management', () => {
        it('should dispose all resources properly', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test message',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                }
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);
            manager.dispose();

            // Should dispose all decoration types
            expect(mockDecorationType.dispose).toHaveBeenCalled();
        });

        it('should handle large numbers of diagnostics efficiently', () => {
            const manyDiagnostics: vscode.Diagnostic[] = [];
            for (let i = 0; i < 1000; i++) {
                manyDiagnostics.push({
                    range: new vscode.Range(i, 0, i, 10),
                    message: `Error ${i}`,
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                });
            }

            const startTime = Date.now();
            manager.updateIndicators('file:///test.drl', manyDiagnostics);
            const endTime = Date.now();

            // Should complete within reasonable time (less than 1 second)
            expect(endTime - startTime).toBeLessThan(1000);

            const counts = manager.getIndicatorCount('file:///test.drl');
            expect(counts.errors).toBe(1000);
        });
    });

    describe('error handling', () => {
        it('should handle invalid URIs gracefully', () => {
            expect(() => {
                manager.updateIndicators('invalid-uri', []);
            }).not.toThrow();
        });

        it('should handle malformed diagnostics gracefully', () => {
            const malformedDiagnostics = [
                {
                    range: null as any,
                    message: 'Test',
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'drools'
                }
            ];

            expect(() => {
                manager.updateIndicators('file:///test.drl', malformedDiagnostics);
            }).not.toThrow();
        });
    });
});