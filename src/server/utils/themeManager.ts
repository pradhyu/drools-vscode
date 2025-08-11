/**
 * Theme manager for adaptive styling in tooltips and diagnostics
 * Provides theme-aware color schemes and styling options
 */

export interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    error: string;
    warning: string;
    info: string;
    success: string;
    muted: string;
    border: string;
    highlight: string;
}

export interface ThemeConfig {
    name: string;
    type: 'light' | 'dark' | 'high-contrast';
    colors: ThemeColors;
    syntax: {
        keyword: string;
        type: string;
        variable: string;
        string: string;
        number: string;
        operator: string;
        comment: string;
    };
}

export class ThemeManager {
    private static readonly THEMES: Map<string, ThemeConfig> = new Map([
        ['light', {
            name: 'Light Theme',
            type: 'light',
            colors: {
                primary: '#0066CC',
                secondary: '#6C757D',
                accent: '#007ACC',
                background: '#FFFFFF',
                foreground: '#000000',
                error: '#D73A49',
                warning: '#F66A0A',
                info: '#0969DA',
                success: '#28A745',
                muted: '#6A737D',
                border: '#E1E4E8',
                highlight: '#FFF3CD'
            },
            syntax: {
                keyword: '#0000FF',
                type: '#267F99',
                variable: '#001080',
                string: '#A31515',
                number: '#098658',
                operator: '#000000',
                comment: '#008000'
            }
        }],
        
        ['dark', {
            name: 'Dark Theme',
            type: 'dark',
            colors: {
                primary: '#58A6FF',
                secondary: '#8B949E',
                accent: '#1F6FEB',
                background: '#0D1117',
                foreground: '#F0F6FC',
                error: '#F85149',
                warning: '#D29922',
                info: '#58A6FF',
                success: '#3FB950',
                muted: '#7D8590',
                border: '#30363D',
                highlight: '#FFF8C5'
            },
            syntax: {
                keyword: '#569CD6',
                type: '#4EC9B0',
                variable: '#9CDCFE',
                string: '#CE9178',
                number: '#B5CEA8',
                operator: '#D4D4D4',
                comment: '#6A9955'
            }
        }],
        
        ['high-contrast', {
            name: 'High Contrast Theme',
            type: 'high-contrast',
            colors: {
                primary: '#FFFFFF',
                secondary: '#CCCCCC',
                accent: '#FFFF00',
                background: '#000000',
                foreground: '#FFFFFF',
                error: '#FF0000',
                warning: '#FFFF00',
                info: '#00FFFF',
                success: '#00FF00',
                muted: '#CCCCCC',
                border: '#FFFFFF',
                highlight: '#FFFF00'
            },
            syntax: {
                keyword: '#FFFFFF',
                type: '#00FFFF',
                variable: '#FFFF00',
                string: '#00FF00',
                number: '#FF00FF',
                operator: '#FFFFFF',
                comment: '#CCCCCC'
            }
        }]
    ]);

    private static currentTheme: ThemeConfig = this.THEMES.get('dark')!;

    /**
     * Set the current theme
     */
    public static setTheme(themeName: string): void {
        const theme = this.THEMES.get(themeName);
        if (theme) {
            this.currentTheme = theme;
        }
    }

    /**
     * Get the current theme
     */
    public static getCurrentTheme(): ThemeConfig {
        return this.currentTheme;
    }

    /**
     * Get theme colors
     */
    public static getColors(): ThemeColors {
        return this.currentTheme.colors;
    }

    /**
     * Get syntax colors
     */
    public static getSyntaxColors(): ThemeConfig['syntax'] {
        return this.currentTheme.syntax;
    }

    /**
     * Get color for severity level
     */
    public static getSeverityColor(severity: 'error' | 'warning' | 'info' | 'success'): string {
        return this.currentTheme.colors[severity];
    }

    /**
     * Apply theme to markdown content
     */
    public static applyThemeToMarkdown(content: string): string {
        const colors = this.getColors();
        const syntax = this.getSyntaxColors();

        // Apply theme-specific styling to markdown
        let themedContent = content;

        // Replace color placeholders if any
        themedContent = themedContent.replace(/\{color:error\}/g, colors.error);
        themedContent = themedContent.replace(/\{color:warning\}/g, colors.warning);
        themedContent = themedContent.replace(/\{color:info\}/g, colors.info);
        themedContent = themedContent.replace(/\{color:success\}/g, colors.success);

        return themedContent;
    }

    /**
     * Get CSS variables for theme
     */
    public static getCSSVariables(): string {
        const colors = this.getColors();
        const syntax = this.getSyntaxColors();

        return `
            --theme-primary: ${colors.primary};
            --theme-secondary: ${colors.secondary};
            --theme-accent: ${colors.accent};
            --theme-background: ${colors.background};
            --theme-foreground: ${colors.foreground};
            --theme-error: ${colors.error};
            --theme-warning: ${colors.warning};
            --theme-info: ${colors.info};
            --theme-success: ${colors.success};
            --theme-muted: ${colors.muted};
            --theme-border: ${colors.border};
            --theme-highlight: ${colors.highlight};
            --syntax-keyword: ${syntax.keyword};
            --syntax-type: ${syntax.type};
            --syntax-variable: ${syntax.variable};
            --syntax-string: ${syntax.string};
            --syntax-number: ${syntax.number};
            --syntax-operator: ${syntax.operator};
            --syntax-comment: ${syntax.comment};
        `;
    }

    /**
     * Detect theme from VSCode context (would be called from client-side)
     */
    public static detectThemeFromContext(kind?: number): string {
        // VSCode theme kinds:
        // 1 = Light
        // 2 = Dark  
        // 3 = High Contrast
        switch (kind) {
            case 1:
                return 'light';
            case 2:
                return 'dark';
            case 3:
                return 'high-contrast';
            default:
                return 'dark'; // Default to dark theme
        }
    }

    /**
     * Get theme-appropriate icon for severity
     */
    public static getSeverityIcon(severity: 'error' | 'warning' | 'info', useEmoji: boolean = true): string {
        if (useEmoji) {
            switch (severity) {
                case 'error':
                    return '🔴';
                case 'warning':
                    return '🟡';
                case 'info':
                    return '🔵';
                default:
                    return '⚪';
            }
        } else {
            // Use text-based icons for high contrast
            switch (severity) {
                case 'error':
                    return '[ERROR]';
                case 'warning':
                    return '[WARN]';
                case 'info':
                    return '[INFO]';
                default:
                    return '[NOTE]';
            }
        }
    }

    /**
     * Get accessible color contrast ratio
     */
    public static getContrastRatio(color1: string, color2: string): number {
        // Simplified contrast ratio calculation
        // In a real implementation, you'd use a proper color library
        const getLuminance = (color: string): number => {
            // Simple luminance calculation for hex colors
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;
            
            const sRGB = [r, g, b].map(c => {
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            
            return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
        };

        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }

    /**
     * Ensure color meets accessibility standards
     */
    public static ensureAccessibleColor(foreground: string, background: string, minRatio: number = 4.5): string {
        const ratio = this.getContrastRatio(foreground, background);
        
        if (ratio >= minRatio) {
            return foreground;
        }
        
        // Return a more accessible alternative
        const theme = this.getCurrentTheme();
        if (theme.type === 'light') {
            return '#000000'; // Black for light themes
        } else {
            return '#FFFFFF'; // White for dark themes
        }
    }

    /**
     * Get theme-appropriate markdown styling
     */
    public static getMarkdownStyling(): string {
        const colors = this.getColors();
        const syntax = this.getSyntaxColors();
        
        return `
/* Theme-aware markdown styling */
.markdown-body {
    color: ${colors.foreground};
    background-color: ${colors.background};
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
    color: ${colors.primary};
    border-bottom-color: ${colors.border};
}

.markdown-body code {
    background-color: ${colors.background};
    color: ${syntax.string};
    border: 1px solid ${colors.border};
}

.markdown-body pre {
    background-color: ${colors.background};
    border: 1px solid ${colors.border};
}

.markdown-body blockquote {
    border-left-color: ${colors.accent};
    color: ${colors.muted};
}

.markdown-body .highlight {
    background-color: ${colors.highlight};
}

.severity-error {
    color: ${colors.error};
}

.severity-warning {
    color: ${colors.warning};
}

.severity-info {
    color: ${colors.info};
}

.severity-success {
    color: ${colors.success};
}
        `;
    }

    /**
     * Register all available themes
     */
    public static getAllThemes(): ThemeConfig[] {
        return Array.from(this.THEMES.values());
    }

    /**
     * Check if theme exists
     */
    public static hasTheme(themeName: string): boolean {
        return this.THEMES.has(themeName);
    }
}