import { Injectable, effect, inject } from '@angular/core';
import { ThemeStore, ThemeKind, ThemeColors } from '../store/theme.store';

/**
 * DOM manipulation service for theme operations
 * Separated from business logic for better testability
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeDomService {
  
  /**
   * Extract theme from document body classes
   */
  extractThemeFromBody(): ThemeKind {
    const body = document.body;
    
    if (body.classList.contains('vscode-light')) {
      return 'vscode-light';
    } else if (body.classList.contains('vscode-high-contrast')) {
      return 'vscode-high-contrast';
    } else {
      return 'vscode-dark';
    }
  }

  /**
   * Extract theme colors from CSS custom properties
   */
  extractThemeColors(): ThemeColors {
    const computedStyle = getComputedStyle(document.documentElement);
    const themeColors: ThemeColors = {};
    
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
    
    return themeColors;
  }

  /**
   * Apply theme classes to document body
   */
  applyThemeClasses(theme: ThemeKind, classNames: string[]): void {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('vscode-light', 'vscode-dark', 'vscode-high-contrast');
    
    // Add current theme classes
    classNames.forEach(className => {
      body.classList.add(className);
    });
  }

  /**
   * Apply data attributes to document body
   */
  applyDataAttributes(attributes: Record<string, string>): void {
    const body = document.body;
    
    Object.entries(attributes).forEach(([key, value]) => {
      body.setAttribute(key, value);
    });
  }

  /**
   * Apply semantic color CSS custom properties
   */
  applySemanticColors(colorMappings: Record<string, string>): void {
    const root = document.documentElement;
    
    Object.entries(colorMappings).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  /**
   * Apply Tailwind theme variables
   */
  applyTailwindVariables(tailwindVars: Record<string, string>, isDark: boolean): void {
    const root = document.documentElement;
    
    Object.entries(tailwindVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Handle dark class
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  /**
   * Get semantic color value from computed styles
   */
  getSemanticColorFromDOM(colorName: string): string {
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue(`--color-${colorName}`).trim() || '#cccccc';
  }

  /**
   * Set up mutation observer for body class changes
   */
  observeBodyClassChanges(callback: (theme: ThemeKind) => void): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const theme = this.extractThemeFromBody();
          callback(theme);
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return observer;
  }

  /**
   * Set up custom event listener for VS Code theme changes
   */
  setupThemeEventListener(callback: (theme: ThemeKind, colors?: ThemeColors) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { theme, colors } = customEvent.detail;
      callback(theme, colors);
    };

    window.addEventListener('vscode-theme-changed', handler);

    // Return cleanup function
    return () => {
      window.removeEventListener('vscode-theme-changed', handler);
    };
  }
}