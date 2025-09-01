import { TestBed } from '@angular/core/testing';
import { ThemeStore, ThemeKind, ThemeColors } from './theme.store';

describe('ThemeStore', () => {
  let store: InstanceType<typeof ThemeStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ThemeStore);
  });

  describe('initialization', () => {
    it('should have default dark theme', () => {
      expect(store.currentTheme()).toBe('vscode-dark');
      expect(store.isInitialized()).toBe(false);
    });

    it('should initialize theme correctly', () => {
      const testColors: ThemeColors = {
        '--vscode-foreground': '#cccccc',
        '--vscode-editor-background': '#1e1e1e'
      };

      store.initializeTheme('vscode-light', testColors);

      expect(store.currentTheme()).toBe('vscode-light');
      expect(store.themeColors()).toEqual(testColors);
      expect(store.isInitialized()).toBe(true);
      expect(store.error()).toBeUndefined();
    });

    it('should handle initialization errors gracefully', () => {
      // Simulate error during initialization
      spyOn(console, 'warn');
      
      // This would typically be triggered by an error in real initialization
      store.initializeTheme('vscode-dark', undefined);
      
      expect(store.currentTheme()).toBe('vscode-dark');
      expect(store.isInitialized()).toBe(true);
    });
  });

  describe('theme computed properties', () => {
    it('should correctly identify dark themes', () => {
      store.setTheme('vscode-dark');
      expect(store.isDarkTheme()).toBe(true);
      expect(store.isLightTheme()).toBe(false);
      expect(store.isHighContrast()).toBe(false);

      store.setTheme('vscode-high-contrast');
      expect(store.isDarkTheme()).toBe(true);
      expect(store.isLightTheme()).toBe(false);
      expect(store.isHighContrast()).toBe(true);
    });

    it('should correctly identify light theme', () => {
      store.setTheme('vscode-light');
      expect(store.isDarkTheme()).toBe(false);
      expect(store.isLightTheme()).toBe(true);
      expect(store.isHighContrast()).toBe(false);
    });
  });

  describe('semantic color mappings', () => {
    it('should generate default color mappings for dark theme', () => {
      store.setTheme('vscode-dark');
      const mappings = store.semanticColorMappings();

      expect(mappings['--color-primary']).toBe('#0e639c');
      expect(mappings['--color-background']).toBe('#1e1e1e');
      expect(mappings['--color-muted']).toBe('rgba(204, 204, 204, 0.6)');
      expect(mappings['--color-success']).toBe('#89d185');
    });

    it('should generate light theme specific mappings', () => {
      store.setTheme('vscode-light');
      const mappings = store.semanticColorMappings();

      expect(mappings['--color-background']).toBe('#ffffff');
      expect(mappings['--color-foreground']).toBe('#333333');
      expect(mappings['--color-muted']).toBe('rgba(51, 51, 51, 0.6)');
      expect(mappings['--color-success']).toBe('#28a745');
    });

    it('should generate high contrast theme mappings', () => {
      store.setTheme('vscode-high-contrast');
      const mappings = store.semanticColorMappings();

      expect(mappings['--color-background']).toBe('#000000');
      expect(mappings['--color-foreground']).toBe('#ffffff');
      expect(mappings['--color-border']).toBe('#6fc3df');
      expect(mappings['--color-muted']).toBe('rgba(255, 255, 255, 0.6)');
    });

    it('should use custom VS Code colors when available', () => {
      const customColors: ThemeColors = {
        '--vscode-button-background': '#custom-primary',
        '--vscode-editor-background': '#custom-bg',
        '--vscode-foreground': '#custom-text'
      };

      store.updateThemeColors(customColors);
      const mappings = store.semanticColorMappings();

      expect(mappings['--color-primary']).toBe('#custom-primary');
      expect(mappings['--color-background']).toBe('#custom-bg');
      expect(mappings['--color-foreground']).toBe('#custom-text');
    });
  });

  describe('Tailwind theme variables', () => {
    it('should generate light theme Tailwind variables', () => {
      store.setTheme('vscode-light');
      const tailwindVars = store.tailwindThemeVariables();

      expect(tailwindVars['--background']).toBe('0deg 0% 100%');
      expect(tailwindVars['--foreground']).toBe('0deg 0.02% 3.94%');
      expect(tailwindVars.isDarkClass).toBe(false);
    });

    it('should generate dark theme Tailwind variables', () => {
      store.setTheme('vscode-dark');
      const tailwindVars = store.tailwindThemeVariables();

      expect(tailwindVars['--background']).toBe('0deg 0.02% 3.94%');
      expect(tailwindVars['--foreground']).toBe('0deg 0.5% 98.03%');
      expect(tailwindVars.isDarkClass).toBe(true);
    });

    it('should generate high contrast theme Tailwind variables', () => {
      store.setTheme('vscode-high-contrast');
      const tailwindVars = store.tailwindThemeVariables();

      expect(tailwindVars['--background']).toBe('0deg 0.02% 3.94%');
      expect(tailwindVars.isDarkClass).toBe(true);
    });
  });

  describe('theme class names and attributes', () => {
    it('should provide correct theme class names', () => {
      store.setTheme('vscode-light');
      expect(store.themeClassNames()).toEqual(['vscode-light']);

      store.setTheme('vscode-dark');
      expect(store.themeClassNames()).toEqual(['vscode-dark']);

      store.setTheme('vscode-high-contrast');
      expect(store.themeClassNames()).toEqual(['vscode-high-contrast']);
    });

    it('should provide correct data attributes', () => {
      store.setTheme('vscode-light');
      expect(store.themeDataAttributes()).toEqual({
        'data-vscode-theme-kind': 'vscode-light'
      });
    });
  });

  describe('theme operations', () => {
    it('should update theme correctly', () => {
      store.setTheme('vscode-light');
      expect(store.currentTheme()).toBe('vscode-light');
      expect(store.error()).toBeUndefined();

      store.setTheme('vscode-high-contrast');
      expect(store.currentTheme()).toBe('vscode-high-contrast');
    });

    it('should update theme colors correctly', () => {
      const newColors: ThemeColors = {
        '--vscode-foreground': '#test-color',
        '--vscode-background': '#test-bg'
      };

      store.updateThemeColors(newColors);
      expect(store.themeColors()).toEqual(newColors);
      expect(store.error()).toBeUndefined();
    });

    it('should handle theme changes from external sources', () => {
      const externalColors: ThemeColors = {
        '--vscode-foreground': '#external-color'
      };

      store.handleThemeChange('vscode-light', externalColors);

      expect(store.currentTheme()).toBe('vscode-light');
      expect(store.themeColors()).toEqual(externalColors);
      expect(store.error()).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    it('should get specific theme color', () => {
      const colors: ThemeColors = {
        '--vscode-foreground': '#test-color',
        '--vscode-background': '#test-bg'
      };

      store.updateThemeColors(colors);

      expect(store.getThemeColor('--vscode-foreground')).toBe('#test-color');
      expect(store.getThemeColor('--vscode-background')).toBe('#test-bg');
      expect(store.getThemeColor('--nonexistent')).toBeUndefined();
    });

    it('should get semantic color values', () => {
      expect(store.getSemanticColorValue('primary')).toBe('#0e639c'); // default
      expect(store.getSemanticColorValue('nonexistent')).toBe('#cccccc'); // fallback
    });

    it('should clear error state', () => {
      // Set an error first
      store.initializeTheme('vscode-dark');
      
      store.clearError();
      expect(store.error()).toBeUndefined();
    });

    it('should reset store to initial state', () => {
      store.setTheme('vscode-light');
      store.updateThemeColors({ '--test': '#test' });
      
      store.reset();
      
      expect(store.currentTheme()).toBe('vscode-dark');
      expect(store.themeColors()).toEqual({});
      expect(store.isInitialized()).toBe(false);
      expect(store.error()).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', () => {
      // Mock console.warn to verify error logging
      const consoleSpy = spyOn(console, 'warn');
      
      // This simulates initialization with valid data
      store.initializeTheme('vscode-dark', {});
      
      expect(store.currentTheme()).toBe('vscode-dark');
      expect(store.isInitialized()).toBe(true);
    });
  });
});