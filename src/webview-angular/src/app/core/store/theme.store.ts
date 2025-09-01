import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';

export type ThemeKind = 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast';

export interface ThemeColors {
  [key: string]: string;
}

export interface ThemeColorMappings {
  '--color-primary': string;
  '--color-primary-foreground': string;
  '--color-primary-hover': string;
  '--color-background': string;
  '--color-surface': string;
  '--color-foreground': string;
  '--color-border': string;
  '--color-border-focus': string;
  '--color-input-background': string;
  '--color-input-foreground': string;
  '--color-input-border': string;
  '--color-error': string;
  '--color-warning': string;
  '--color-info': string;
  '--color-muted'?: string;
  '--color-muted-foreground'?: string;
  '--color-success'?: string;
  '--color-shadow'?: string;
  [key: string]: string | undefined;
}

export interface TailwindThemeVariables {
  '--background': string;
  '--foreground': string;
  '--muted': string;
  '--muted-foreground': string;
  '--border': string;
  '--input': string;
  isDarkClass: boolean;
}

export interface ThemeState {
  currentTheme: ThemeKind;
  themeColors: ThemeColors;
  isInitialized: boolean;
  error: string | undefined;
}

const initialState: ThemeState = {
  currentTheme: 'vscode-dark',
  themeColors: {},
  isInitialized: false,
  error: undefined
};

/**
 * Theme SignalStore for managing theme state and business logic
 * Separates theme logic from DOM manipulation for better testability
 */
export const ThemeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * Check if current theme is dark
     */
    isDarkTheme: computed(() => 
      store.currentTheme() === 'vscode-dark' || store.currentTheme() === 'vscode-high-contrast'
    ),

    /**
     * Check if current theme is light
     */
    isLightTheme: computed(() => 
      store.currentTheme() === 'vscode-light'
    ),

    /**
     * Check if current theme is high contrast
     */
    isHighContrast: computed(() => 
      store.currentTheme() === 'vscode-high-contrast'
    ),

    /**
     * Generate semantic color mappings based on current theme
     */
    semanticColorMappings: computed((): ThemeColorMappings => {
      const colors = store.themeColors();
      const theme = store.currentTheme();
      
      // Base color mappings
      const colorMappings: ThemeColorMappings = {
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

      return colorMappings;
    }),

    /**
     * Generate Tailwind theme variables
     */
    tailwindThemeVariables: computed((): TailwindThemeVariables => {
      const theme = store.currentTheme();
      
      if (theme === 'vscode-light') {
        return {
          '--background': '0deg 0% 100%',
          '--foreground': '0deg 0.02% 3.94%',
          '--muted': '0deg 0.24% 96.06%',
          '--muted-foreground': '0deg 0.01% 45.16%',
          '--border': '0deg 0.09% 89.82%',
          '--input': '0deg 0.09% 89.82%',
          isDarkClass: false
        };
      } else {
        return {
          '--background': '0deg 0.02% 3.94%',
          '--foreground': '0deg 0.5% 98.03%',
          '--muted': '0deg 0.01% 14.94%',
          '--muted-foreground': '0deg 0.02% 63.02%',
          '--border': '0deg 0% 13.73%',
          '--input': '0deg 0% 18.43%',
          isDarkClass: true
        };
      }
    }),

    /**
     * Get all theme class names that should be applied
     */
    themeClassNames: computed(() => {
      const theme = store.currentTheme();
      return [theme];
    }),

    /**
     * Get data attributes for theme
     */
    themeDataAttributes: computed(() => {
      const theme = store.currentTheme();
      return {
        'data-vscode-theme-kind': theme
      };
    })
  })),
  withMethods((store) => ({
    /**
     * Initialize theme from external data (e.g., VS Code body classes)
     */
    initializeTheme(theme: ThemeKind, colors?: ThemeColors) {
      try {
        patchState(store, {
          currentTheme: theme,
          themeColors: colors || {},
          isInitialized: true,
          error: undefined
        });
        console.log('Theme initialized:', theme);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize theme';
        console.warn('Failed to initialize theme:', error);
        patchState(store, {
          currentTheme: 'vscode-dark', // Fallback
          isInitialized: true,
          error: errorMessage
        });
      }
    },

    /**
     * Update theme
     */
    setTheme(theme: ThemeKind) {
      patchState(store, { 
        currentTheme: theme,
        error: undefined
      });
      console.log('Theme updated:', theme);
    },

    /**
     * Update theme colors (from CSS custom properties extraction)
     */
    updateThemeColors(colors: ThemeColors) {
      patchState(store, { 
        themeColors: colors,
        error: undefined
      });
    },

    /**
     * Get a specific theme color
     */
    getThemeColor(variableName: string): string | undefined {
      return store.themeColors()[variableName];
    },

    /**
     * Get semantic color value by mapping computed values
     */
    getSemanticColorValue(colorName: string): string {
      const mappings = store.semanticColorMappings();
      const key = `--color-${colorName}` as keyof ThemeColorMappings;
      return mappings[key] || '#cccccc';
    },

    /**
     * Handle theme change from external source (VS Code event)
     */
    handleThemeChange(theme: ThemeKind, colors?: ThemeColors) {
      patchState(store, {
        currentTheme: theme,
        themeColors: colors || store.themeColors(),
        error: undefined
      });
      console.log('Theme changed:', theme);
    },

    /**
     * Clear error state
     */
    clearError() {
      patchState(store, { error: undefined });
    },

    /**
     * Reset store to initial state
     */
    reset() {
      patchState(store, initialState);
    }
  }))
);