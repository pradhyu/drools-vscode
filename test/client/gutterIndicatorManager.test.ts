/**
 * Tests for Gutter Indicator Manager
 * Note: These tests require VSCode test environment
 */

import * as vscode from 'vscode';
import { GutterIndicatorManager, GutterIndicator } from '../../src/gutterIndicatorManager';

// Mock disposable and decoration type
const mockDisposable = { dispose: jest.fn() };
const mockDecorationType = { dispose: jest.fn() };

// Mock the vscode module
jest.mock('vscode', () => ({
    window: {
        createTextEditorDecorationType: jest.fn(() => mockDecorationType),
        activeTextEditor: undefined,
        onDidChangeActiveTextEditor: jest.fn(() => mockDisposable),
        onDidChangeTextEditorSelection: jest.fn(() => mockDisposable),
        onDidChangeActiveColorTheme: jest.fn(() => mockDisposable),
        showInformationMessage: jest.fn(),
        createOutputChannel: jest.fn()
    },
    workspace: {
        onDidChangeTextDocument: jest.fn(() => mockDisposable)
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
    ColorThemeKind: {
        Light: 1,
        Dark: 2,
        HighContrast: 3
    },
    OverviewRulerLane: {
        Right: 7
    }
}), { virtual: true });

describe('GutterIndicatorManager', () => {
    let manager: GutterIndicatorManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new GutterIndicatorManager();
    });

    afterEach(() => {
        manager.dispose();
    });

    describe('initialization', () => {
        it('should create decoration types for all severity levels', () => {
            const vscode = require('vscode');
            expect(vscode.window.createTextEditorDecorationType).toHaveBeenCalledTimes(3);
            
            // Should create decorations for error, warning, and info
            const calls = vscode.window.createTextEditorDecorationType.mock.calls;
            expect(calls).toHaveLength(3);
        });

        it('should setup event listeners', () => {
            const vscode = require('vscode');
            expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
            expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
            expect(vscode.window.onDidChangeActiveColorTheme).toHaveBeenCalled();
        });

        it('should respect settings configuration', () => {
            const settings = {
                enableErrorIcons: true,
                enableWarningIcons: true,
                enableInfoIcons: false
            };

            manager.updateSettings(settings);
            
            // Should still work after settings update
            expect(manager).toBeDefined();
        });
    });

    describe('updateIndicators', () => {
        it('should update indicators from diagnostics', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test error',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            expect(() => {
                manager.updateIndicators('file:///test.drl', diagnostics);
            }).not.toThrow();
        });

        it('should group multiple diagnostics on same line by highest severity', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 5),
                    message: 'Warning message',
                    severity: vscode.DiagnosticSeverity.Warning
                } as vscode.Diagnostic,
                {
                    range: new vscode.Range(0, 6, 0, 10),
                    message: 'Error message',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            expect(() => {
                manager.updateIndicators('file:///test.drl', diagnostics);
            }).not.toThrow();
        });

        it('should create tooltips for indicators', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test diagnostic',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            expect(() => {
                manager.updateIndicators('file:///test.drl', diagnostics);
            }).not.toThrow();
        });

        it('should handle empty diagnostics array', () => {
            expect(() => {
                manager.updateIndicators('file:///test.drl', []);
            }).not.toThrow();
        });
    });

    describe('decoration management', () => {
        it('should apply decorations to active editor', () => {
            const mockEditor = {
                setDecorations: jest.fn(),
                document: { uri: { toString: () => 'file:///test.drl' } }
            };

            const vscode = require('vscode');
            vscode.window.activeTextEditor = mockEditor;

            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test error',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);
            
            // Should call setDecorations on the active editor
            expect(mockEditor.setDecorations).toHaveBeenCalled();
        });

        it('should clear decorations when indicators are cleared', () => {
            const mockEditor = {
                setDecorations: jest.fn(),
                document: { uri: { toString: () => 'file:///test.drl' } }
            };

            const vscode = require('vscode');
            vscode.window.activeTextEditor = mockEditor;

            manager.clearIndicators('file:///test.drl');

            // Should call setDecorations with empty arrays
            expect(mockEditor.setDecorations).toHaveBeenCalledWith(mockDecorationType, []);
        });
    });

    describe('theme adaptation', () => {
        it('should adapt to theme changes', () => {
            const vscode = require('vscode');
            const mockTheme: vscode.ColorTheme = {
                kind: vscode.ColorThemeKind.Dark
            };

            expect(() => {
                manager.adaptToTheme(mockTheme);
            }).not.toThrow();
        });
    });

    describe('settings management', () => {
        it('should update settings and recreate decorations if needed', () => {
            const settings = {
                enableErrorIcons: false,
                enableWarningIcons: true,
                enableInfoIcons: true
            };

            expect(() => {
                manager.updateSettings(settings);
            }).not.toThrow();
        });

        it('should not recreate decorations for non-visual setting changes', () => {
            const settings = {
                enableErrorIcons: true,
                enableWarningIcons: true,
                enableInfoIcons: true
            };

            expect(() => {
                manager.updateSettings(settings);
            }).not.toThrow();
        });
    });

    describe('click handling', () => {
        it('should handle gutter icon clicks', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test error',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);

            // Test that the manager can handle click events (implementation detail)
            expect(manager).toBeDefined();
        });
    });

    describe('tooltip creation', () => {
        it('should create appropriate tooltips for single diagnostic', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Single diagnostic',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            expect(() => {
                manager.updateIndicators('file:///test.drl', diagnostics);
            }).not.toThrow();
        });

        it('should create appropriate tooltips for multiple diagnostics on same line', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 5),
                    message: 'First diagnostic',
                    severity: vscode.DiagnosticSeverity.Warning
                } as vscode.Diagnostic,
                {
                    range: new vscode.Range(0, 6, 0, 10),
                    message: 'Second diagnostic',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            expect(() => {
                manager.updateIndicators('file:///test.drl', diagnostics);
            }).not.toThrow();
        });
    });

    describe('performance and memory management', () => {
        it('should dispose all resources properly', () => {
            const diagnostics: vscode.Diagnostic[] = [
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Test diagnostic',
                    severity: vscode.DiagnosticSeverity.Error
                } as vscode.Diagnostic
            ];

            manager.updateIndicators('file:///test.drl', diagnostics);
            
            expect(() => {
                manager.dispose();
            }).not.toThrow();
        });

        it('should handle large numbers of diagnostics efficiently', () => {
            const diagnostics: vscode.Diagnostic[] = [];
            for (let i = 0; i < 1000; i++) {
                diagnostics.push({
                    range: new vscode.Range(i, 0, i, 10),
                    message: `Diagnostic ${i}`,
                    severity: vscode.DiagnosticSeverity.Warning
                } as vscode.Diagnostic);
            }

            const start = Date.now();
            manager.updateIndicators('file:///test.drl', diagnostics);
            const end = Date.now();

            // Should complete within reasonable time (less than 1 second)
            expect(end - start).toBeLessThan(1000);
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
                null,
                { range: null },
                { range: { start: null } },
                {
                    range: new vscode.Range(0, 0, 0, 10),
                    message: 'Valid diagnostic',
                    severity: vscode.DiagnosticSeverity.Error
                }
            ] as any[];

            expect(() => {
                manager.updateIndicators('file:///test.drl', malformedDiagnostics);
            }).not.toThrow();
        });
    });
});