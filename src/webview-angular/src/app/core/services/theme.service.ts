import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeKind = 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast';

/**
 * Service for managing VS Code theme integration
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _currentTheme = signal<ThemeKind>('vscode-dark');
  private _themeColors = signal<Record<string, string>>({});
  
  readonly currentTheme = this._currentTheme.asReadonly();
  readonly themeColors = this._themeColors.asReadonly();
  readonly isDarkTheme = computed(() => 
    this._currentTheme() === 'vscode-dark' || this._currentTheme() === 'vscode-high-contrast'
  );
  readonly isLightTheme = computed(() => this._currentTheme() === 'vscode-light');
  readonly isHighContrast = computed(() => this._currentTheme() === 'vscode-high-contrast');

  constructor() {
    this.initializeTheme();
    this.observeThemeChanges();
    
    // Set up effect to apply theme changes
    effect(() => {
      this.applyTheme();
    });
  }

  /**
   * Initialize theme from VS Code context
   */
  private initializeTheme(): void {
    try {
      // Check for VS Code theme data in document body
      const body = document.body;
      
      if (body.classList.contains('vscode-light')) {
        this._currentTheme.set('vscode-light');
      } else if (body.classList.contains('vscode-high-contrast')) {
        this._currentTheme.set('vscode-high-contrast');
      } else {
        this._currentTheme.set('vscode-dark');
      }
      
      // Extract theme colors from CSS custom properties
      this.extractThemeColors();
      
      console.log('Theme initialized:', this._currentTheme());
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
      // Fallback to dark theme
      this._currentTheme.set('vscode-dark');
    }
  }

  /**
   * Observe theme changes from VS Code
   */
  private observeThemeChanges(): void {
    // Observe changes to body class list
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.updateThemeFromBody();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also listen for custom VS Code theme change events
    window.addEventListener('vscode-theme-changed', (event: Event) => {
      this.handleThemeChange(event as CustomEvent);
    });
  }

  /**
   * Update theme based on body classes
   */
  private updateThemeFromBody(): void {
    const body = document.body;
    
    if (body.classList.contains('vscode-light')) {
      this._currentTheme.set('vscode-light');
    } else if (body.classList.contains('vscode-high-contrast')) {
      this._currentTheme.set('vscode-high-contrast');
    } else {
      this._currentTheme.set('vscode-dark');
    }
    
    this.extractThemeColors();
  }

  /**
   * Handle theme change events
   */
  private handleThemeChange(event: CustomEvent): void {
    const { theme, colors } = event.detail;
    
    if (theme) {
      this._currentTheme.set(theme as ThemeKind);
    }
    
    if (colors) {
      this._themeColors.set(colors);
    }
    
    this.applyTheme();
  }

  /**
   * Extract theme colors from CSS custom properties
   */
  private extractThemeColors(): void {
    const computedStyle = getComputedStyle(document.documentElement);
    const themeColors: Record<string, string> = {};
    
    // VS Code theme variables to extract
    const vscodeVars = [
      '--vscode-foreground',
      '--vscode-editor-background',
      '--vscode-panel-background',
      '--vscode-panel-border',
      '--vscode-button-background',
      '--vscode-button-foreground',
      '--vscode-button-hoverBackground',
      '--vscode-input-background',
      '--vscode-input-foreground',
      '--vscode-input-border',
      '--vscode-errorForeground',
      '--vscode-warningForeground',
      '--vscode-infoForeground',
      '--vscode-focusBorder'
    ];
    
    vscodeVars.forEach(varName => {
      const value = computedStyle.getPropertyValue(varName).trim();
      if (value) {
        themeColors[varName] = value;
      }
    });
    
    this._themeColors.set(themeColors);
  }

  /**
   * Apply theme to the application
   */
  private applyTheme(): void {
    const body = document.body;
    const theme = this._currentTheme();
    
    // Remove existing theme classes
    body.classList.remove('vscode-light', 'vscode-dark', 'vscode-high-contrast');
    
    // Add current theme class
    body.classList.add(theme);
    
    // Set data attribute for CSS selectors
    body.setAttribute('data-vscode-theme-kind', theme);
    
    // Apply semantic color mappings
    this.applySemanicColors();
  }

  /**
   * Apply semantic color mappings based on current theme
   */
  private applySemanicColors(): void {
    const root = document.documentElement;
    const colors = this._themeColors();
    const theme = this._currentTheme();
    
    // Base color mappings
    const colorMappings = {
      '--color-primary': colors['--vscode-button-background'] || '#0e639c',
      '--color-primary-foreground': colors['--vscode-button-foreground'] || '#ffffff',
      '--color-primary-hover': colors['--vscode-button-hoverBackground'] || '#1177bb',
      '--color-background': colors['--vscode-editor-background'] || '#1e1e1e',
      '--color-surface': colors['--vscode-panel-background'] || '#252526',
      '--color-foreground': colors['--vscode-foreground'] || '#cccccc',
      '--color-border': colors['--vscode-panel-border'] || '#2b2b2b',
      '--color-border-focus': colors['--vscode-focusBorder'] || '#007acc',
      '--color-input-background': colors['--vscode-input-background'] || '#3c3c3c',
      '--color-input-foreground': colors['--vscode-input-foreground'] || '#cccccc',
      '--color-input-border': colors['--vscode-input-border'] || '#3c3c3c',
      '--color-error': colors['--vscode-errorForeground'] || '#f14c4c',
      '--color-warning': colors['--vscode-warningForeground'] || '#ffcc02',
      '--color-info': colors['--vscode-infoForeground'] || '#3794ff'
    };

    // Theme-specific color overrides
    if (theme === 'vscode-light') {
      Object.assign(colorMappings, {
        '--color-background': colors['--vscode-editor-background'] || '#ffffff',
        '--color-surface': colors['--vscode-panel-background'] || '#f3f3f3',
        '--color-foreground': colors['--vscode-foreground'] || '#333333',
        '--color-border': colors['--vscode-panel-border'] || '#e0e0e0',
        '--color-input-background': colors['--vscode-input-background'] || '#ffffff',
        '--color-input-foreground': colors['--vscode-input-foreground'] || '#333333',
        '--color-input-border': colors['--vscode-input-border'] || '#cecece',
        '--color-muted': 'rgba(51, 51, 51, 0.6)',
        '--color-muted-foreground': 'rgba(51, 51, 51, 0.7)',
        '--color-success': '#28a745',
        '--color-shadow': 'rgba(0, 0, 0, 0.1)'
      });
    } else if (theme === 'vscode-high-contrast') {
      Object.assign(colorMappings, {
        '--color-background': colors['--vscode-editor-background'] || '#000000',
        '--color-surface': colors['--vscode-panel-background'] || '#000000',
        '--color-foreground': colors['--vscode-foreground'] || '#ffffff',
        '--color-border': colors['--vscode-panel-border'] || '#6fc3df',
        '--color-border-focus': colors['--vscode-focusBorder'] || '#f38518',
        '--color-muted': 'rgba(255, 255, 255, 0.6)',
        '--color-muted-foreground': 'rgba(255, 255, 255, 0.8)',
        '--color-success': '#89d185',
        '--color-shadow': 'rgba(255, 255, 255, 0.2)'
      });
    } else {
      // Dark theme (default)
      Object.assign(colorMappings, {
        '--color-muted': 'rgba(204, 204, 204, 0.6)',
        '--color-muted-foreground': 'rgba(204, 204, 204, 0.7)',
        '--color-success': '#89d185',
        '--color-shadow': 'rgba(0, 0, 0, 0.3)'
      });
    }

    // Apply all color mappings with smooth transitions
    Object.entries(colorMappings).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Update Tailwind-specific CSS variables for better integration
    this.updateTailwindThemeVariables(theme);
  }

  /**
   * Update Tailwind theme variables for better integration
   */
  private updateTailwindThemeVariables(theme: ThemeKind): void {
    const root = document.documentElement;
    
    if (theme === 'vscode-light') {
      root.style.setProperty('--background', '0deg 0% 100%');
      root.style.setProperty('--foreground', '0deg 0.02% 3.94%');
      root.style.setProperty('--muted', '0deg 0.24% 96.06%');
      root.style.setProperty('--muted-foreground', '0deg 0.01% 45.16%');
      root.style.setProperty('--border', '0deg 0.09% 89.82%');
      root.style.setProperty('--input', '0deg 0.09% 89.82%');
      root.classList.remove('dark');
    } else {
      root.style.setProperty('--background', '0deg 0.02% 3.94%');
      root.style.setProperty('--foreground', '0deg 0.5% 98.03%');
      root.style.setProperty('--muted', '0deg 0.01% 14.94%');
      root.style.setProperty('--muted-foreground', '0deg 0.02% 63.02%');
      root.style.setProperty('--border', '0deg 0% 13.73%');
      root.style.setProperty('--input', '0deg 0% 18.43%');
      root.classList.add('dark');
    }
  }

  /**
   * Get a theme color by VS Code variable name
   */
  getThemeColor(variableName: string): string | undefined {
    return this._themeColors()[variableName];
  }

  /**
   * Get semantic color value
   */
  getSemanticColor(colorName: string): string {
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue(`--color-${colorName}`).trim() || '#cccccc';
  }

  /**
   * Check if current theme is dark
   */
  isDark(): boolean {
    return this.isDarkTheme();
  }

  /**
   * Check if current theme is light
   */
  isLight(): boolean {
    return this.isLightTheme();
  }

  /**
   * Manually set theme (for testing/development)
   */
  setTheme(theme: ThemeKind): void {
    this._currentTheme.set(theme);
  }

  /**
   * Listen for theme changes
   */
  onThemeChange(callback: (theme: ThemeKind) => void): () => void {
    let previousTheme = this._currentTheme();
    
    const effect = () => {
      const currentTheme = this._currentTheme();
      if (currentTheme !== previousTheme) {
        callback(currentTheme);
        previousTheme = currentTheme;
      }
    };
    
    // Set up interval to check for changes (fallback)
    const interval = setInterval(effect, 1000);
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }
}