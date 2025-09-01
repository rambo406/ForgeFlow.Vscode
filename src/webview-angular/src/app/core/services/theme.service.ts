import { Injectable, effect, inject, OnDestroy } from '@angular/core';
import { ThemeStore, ThemeKind } from '../store/theme.store';
import { ThemeDomService } from './theme-dom.service';

export type { ThemeKind } from '../store/theme.store';

/**
 * Service for managing VS Code theme integration
 * Coordinates between theme store and DOM operations
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  private readonly themeStore = inject(ThemeStore);
  private readonly themeDomService = inject(ThemeDomService);
  
  private observer?: MutationObserver;
  private cleanupEventListener?: () => void;

  // Expose store computed properties
  readonly currentTheme = this.themeStore.currentTheme;
  readonly themeColors = this.themeStore.themeColors;
  readonly isDarkTheme = this.themeStore.isDarkTheme;
  readonly isLightTheme = this.themeStore.isLightTheme;
  readonly isHighContrast = this.themeStore.isHighContrast;

  constructor() {
    this.initializeTheme();
    this.observeThemeChanges();
    
    // Set up effect to apply theme changes to DOM
    effect(() => {
      this.applyThemeToDOM();
    });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.cleanupEventListener) {
      this.cleanupEventListener();
    }
  }

  /**
   * Initialize theme from VS Code context
   */
  private initializeTheme(): void {
    try {
      const theme = this.themeDomService.extractThemeFromBody();
      const colors = this.themeDomService.extractThemeColors();
      
      this.themeStore.initializeTheme(theme, colors);
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
      this.themeStore.initializeTheme('vscode-dark', {});
    }
  }

  /**
   * Set up observers for theme changes
   */
  private observeThemeChanges(): void {
    // Observe body class mutations
    this.observer = this.themeDomService.observeBodyClassChanges((theme) => {
      const colors = this.themeDomService.extractThemeColors();
      this.themeStore.handleThemeChange(theme, colors);
    });

    // Listen for custom VS Code theme change events
    this.cleanupEventListener = this.themeDomService.setupThemeEventListener((theme, colors) => {
      this.themeStore.handleThemeChange(theme, colors);
    });
  }

  /**
   * Apply current theme state to DOM
   */
  private applyThemeToDOM(): void {
  const theme = (this.themeStore as any).currentTheme();
  const classNames = (this.themeStore as any).themeClassNames();
  const dataAttributes = (this.themeStore as any).themeDataAttributes();
  const semanticColors = (this.themeStore as any).semanticColorMappings();
  const tailwindVars = (this.themeStore as any).tailwindThemeVariables() as any;

    // Apply DOM changes
    this.themeDomService.applyThemeClasses(theme, classNames);
    this.themeDomService.applyDataAttributes(dataAttributes);
    // Ensure we only pass defined string values to the DOM service
    const definedSemanticColors: Record<string, string> = {};
    Object.keys(semanticColors).forEach(k => {
      const v = (semanticColors as any)[k];
      if (v !== undefined && v !== null) {
        definedSemanticColors[k] = v as string;
      }
    });

    this.themeDomService.applySemanticColors(definedSemanticColors);
    
    // Extract non-boolean properties for Tailwind variables
  const { isDarkClass, ...tailwindProperties } = tailwindVars as any;
  this.themeDomService.applyTailwindVariables(tailwindProperties as Record<string, string>, !!isDarkClass);
  }

  /**
   * Get a theme color by VS Code variable name
   */
  getThemeColor(variableName: string): string | undefined {
    return this.themeStore.getThemeColor(variableName);
  }

  /**
   * Get semantic color value
   */
  getSemanticColor(colorName: string): string {
    // Try to get from store first (computed), fallback to DOM
    const storeValue = this.themeStore.getSemanticColorValue(colorName);
    if (storeValue !== '#cccccc') { // Not the fallback value
      return storeValue;
    }
    
    // Fallback to DOM for actual computed value
    return this.themeDomService.getSemanticColorFromDOM(colorName);
  }

  /**
   * Check if current theme is dark
   */
  isDark(): boolean {
    return this.themeStore.isDarkTheme();
  }

  /**
   * Check if current theme is light
   */
  isLight(): boolean {
    return this.themeStore.isLightTheme();
  }

  /**
   * Manually set theme (for testing/development)
   */
  setTheme(theme: ThemeKind): void {
    this.themeStore.setTheme(theme);
  }

  /**
   * Listen for theme changes
   */
  onThemeChange(callback: (theme: ThemeKind) => void): () => void {
    let previousTheme = this.themeStore.currentTheme();
    
    const checkForChanges = () => {
      const currentTheme = this.themeStore.currentTheme();
      if (currentTheme !== previousTheme) {
        callback(currentTheme);
        previousTheme = currentTheme;
      }
    };
    
    // Set up interval to check for changes (fallback)
    const interval = setInterval(checkForChanges, 1000);
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }
}