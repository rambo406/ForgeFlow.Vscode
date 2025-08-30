import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeKind } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDocumentBody: HTMLElement;
  let mockDocumentElement: HTMLElement;

  beforeEach(() => {
    // Create mocked DOM elements
    mockDocumentBody = document.createElement('body');
    mockDocumentElement = document.createElement('html');
    
    // Setup DOM mocks
    Object.defineProperty(document, 'body', {
      value: mockDocumentBody,
      writable: true
    });
    
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true
    });

    // Mock getComputedStyle
    const mockComputedStyle = {
      getPropertyValue: jasmine.createSpy('getPropertyValue').and.returnValue('')
    };
    spyOn(window, 'getComputedStyle').and.returnValue(mockComputedStyle as any);

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
  });

  beforeEach(() => {
    // Reset body classes before each test
    mockDocumentBody.className = '';
    mockDocumentElement.className = '';
    
    service = TestBed.inject(ThemeService);
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with dark theme by default', () => {
      expect(service.currentTheme()).toBe('vscode-dark');
      expect(service.isDarkTheme()).toBe(true);
      expect(service.isLightTheme()).toBe(false);
      expect(service.isHighContrast()).toBe(false);
    });

    it('should detect light theme from body class', () => {
      mockDocumentBody.classList.add('vscode-light');
      
      // Re-create service to trigger initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      expect(service.currentTheme()).toBe('vscode-light');
      expect(service.isLightTheme()).toBe(true);
      expect(service.isDarkTheme()).toBe(false);
    });

    it('should detect high contrast theme from body class', () => {
      mockDocumentBody.classList.add('vscode-high-contrast');
      
      // Re-create service to trigger initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      expect(service.currentTheme()).toBe('vscode-high-contrast');
      expect(service.isHighContrast()).toBe(true);
      expect(service.isDarkTheme()).toBe(true);
    });

    it('should handle initialization errors gracefully', () => {
      // Mock getComputedStyle to throw an error
      (window.getComputedStyle as jasmine.Spy).and.throwError('Mock error');
      
      const consoleSpy = spyOn(console, 'warn');
      
      // Re-create service to trigger initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize theme:', jasmine.any(Error));
      expect(service.currentTheme()).toBe('vscode-dark'); // Should fallback to dark
    });
  });

  describe('theme detection', () => {
    it('should detect theme changes from body class mutations', (done) => {
      // Set up mutation observer spy
      const observeSpy = spyOn(MutationObserver.prototype, 'observe');
      
      // Re-initialize service to set up observer
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      expect(observeSpy).toHaveBeenCalledWith(mockDocumentBody, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      done();
    });

    it('should listen for VS Code theme change events', () => {
      const addEventListenerSpy = spyOn(window, 'addEventListener');
      
      // Re-initialize service to set up event listener
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'vscode-theme-changed',
        jasmine.any(Function)
      );
    });

    it('should handle custom theme change events', () => {
      const event = new CustomEvent('vscode-theme-changed', {
        detail: {
          theme: 'vscode-light',
          colors: { '--vscode-foreground': '#000000' }
        }
      });
      
      window.dispatchEvent(event);
      
      expect(service.currentTheme()).toBe('vscode-light');
      expect(service.themeColors()).toEqual({ '--vscode-foreground': '#000000' });
    });
  });

  describe('theme colors extraction', () => {
    it('should extract VS Code theme colors', () => {
      const mockStyle = {
        getPropertyValue: jasmine.createSpy('getPropertyValue').and.callFake((prop: string) => {
          const colors: Record<string, string> = {
            '--vscode-foreground': '#cccccc',
            '--vscode-editor-background': '#1e1e1e',
            '--vscode-panel-background': '#252526',
            '--vscode-button-background': '#0e639c'
          };
          return colors[prop] || '';
        })
      };
      
      (window.getComputedStyle as jasmine.Spy).and.returnValue(mockStyle);
      
      // Re-initialize service to trigger color extraction
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      const themeColors = service.themeColors();
      expect(themeColors['--vscode-foreground']).toBe('#cccccc');
      expect(themeColors['--vscode-editor-background']).toBe('#1e1e1e');
      expect(themeColors['--vscode-panel-background']).toBe('#252526');
      expect(themeColors['--vscode-button-background']).toBe('#0e639c');
    });

    it('should skip empty color values', () => {
      const mockStyle = {
        getPropertyValue: jasmine.createSpy('getPropertyValue').and.callFake((prop: string) => {
          if (prop === '--vscode-foreground') {
            return '#cccccc';
          }
          return ''; // Empty value for other properties
        })
      };
      
      (window.getComputedStyle as jasmine.Spy).and.returnValue(mockStyle);
      
      // Re-initialize service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ThemeService]
      });
      service = TestBed.inject(ThemeService);
      
      const themeColors = service.themeColors();
      expect(themeColors['--vscode-foreground']).toBe('#cccccc');
      expect(Object.keys(themeColors)).toEqual(['--vscode-foreground']);
    });
  });

  describe('theme application', () => {
    it('should apply dark theme classes and attributes', () => {
      service.setTheme('vscode-dark');
      
      expect(mockDocumentBody.classList.contains('vscode-dark')).toBe(true);
      expect(mockDocumentBody.getAttribute('data-vscode-theme-kind')).toBe('vscode-dark');
      expect(mockDocumentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light theme classes and attributes', () => {
      service.setTheme('vscode-light');
      
      expect(mockDocumentBody.classList.contains('vscode-light')).toBe(true);
      expect(mockDocumentBody.getAttribute('data-vscode-theme-kind')).toBe('vscode-light');
      expect(mockDocumentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply high contrast theme', () => {
      service.setTheme('vscode-high-contrast');
      
      expect(mockDocumentBody.classList.contains('vscode-high-contrast')).toBe(true);
      expect(mockDocumentBody.getAttribute('data-vscode-theme-kind')).toBe('vscode-high-contrast');
      expect(mockDocumentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove existing theme classes when applying new theme', () => {
      // Set initial theme
      mockDocumentBody.classList.add('vscode-light');
      
      // Change to dark theme
      service.setTheme('vscode-dark');
      
      expect(mockDocumentBody.classList.contains('vscode-light')).toBe(false);
      expect(mockDocumentBody.classList.contains('vscode-dark')).toBe(true);
    });

    it('should set CSS custom properties for theme colors', () => {
      const setSpy = spyOn(mockDocumentElement.style, 'setProperty');
      
      service.setTheme('vscode-dark');
      
      expect(setSpy).toHaveBeenCalledWith('--color-primary', jasmine.any(String));
      expect(setSpy).toHaveBeenCalledWith('--color-background', jasmine.any(String));
      expect(setSpy).toHaveBeenCalledWith('--color-foreground', jasmine.any(String));
    });

    it('should apply light theme specific color overrides', () => {
      const setSpy = spyOn(mockDocumentElement.style, 'setProperty');
      
      service.setTheme('vscode-light');
      
      // Verify light theme specific properties are set
      expect(setSpy).toHaveBeenCalledWith('--color-muted', 'rgba(51, 51, 51, 0.6)');
      expect(setSpy).toHaveBeenCalledWith('--color-success', '#28a745');
    });

    it('should apply high contrast theme specific color overrides', () => {
      const setSpy = spyOn(mockDocumentElement.style, 'setProperty');
      
      service.setTheme('vscode-high-contrast');
      
      // Verify high contrast theme specific properties are set
      expect(setSpy).toHaveBeenCalledWith('--color-muted', 'rgba(255, 255, 255, 0.6)');
      expect(setSpy).toHaveBeenCalledWith('--color-success', '#89d185');
    });
  });

  describe('computed properties', () => {
    it('should compute isDarkTheme correctly', () => {
      service.setTheme('vscode-dark');
      expect(service.isDarkTheme()).toBe(true);
      
      service.setTheme('vscode-high-contrast');
      expect(service.isDarkTheme()).toBe(true);
      
      service.setTheme('vscode-light');
      expect(service.isDarkTheme()).toBe(false);
    });

    it('should compute isLightTheme correctly', () => {
      service.setTheme('vscode-light');
      expect(service.isLightTheme()).toBe(true);
      
      service.setTheme('vscode-dark');
      expect(service.isLightTheme()).toBe(false);
      
      service.setTheme('vscode-high-contrast');
      expect(service.isLightTheme()).toBe(false);
    });

    it('should compute isHighContrast correctly', () => {
      service.setTheme('vscode-high-contrast');
      expect(service.isHighContrast()).toBe(true);
      
      service.setTheme('vscode-dark');
      expect(service.isHighContrast()).toBe(false);
      
      service.setTheme('vscode-light');
      expect(service.isHighContrast()).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should get theme color by variable name', () => {
      // Set up theme colors
      service.setTheme('vscode-dark');
      
      // Mock theme colors
      const mockColors = { '--vscode-foreground': '#cccccc' };
      (service as any)._themeColors.set(mockColors);
      
      const color = service.getThemeColor('--vscode-foreground');
      expect(color).toBe('#cccccc');
    });

    it('should return undefined for non-existent theme color', () => {
      const color = service.getThemeColor('--non-existent-color');
      expect(color).toBeUndefined();
    });

    it('should get semantic color from CSS properties', () => {
      const mockStyle = {
        getPropertyValue: jasmine.createSpy('getPropertyValue').and.returnValue('#0e639c')
      };
      (window.getComputedStyle as jasmine.Spy).and.returnValue(mockStyle);
      
      const color = service.getSemanticColor('primary');
      expect(color).toBe('#0e639c');
    });

    it('should return default color for missing semantic color', () => {
      const mockStyle = {
        getPropertyValue: jasmine.createSpy('getPropertyValue').and.returnValue('')
      };
      (window.getComputedStyle as jasmine.Spy).and.returnValue(mockStyle);
      
      const color = service.getSemanticColor('primary');
      expect(color).toBe('#cccccc');
    });

    it('should check if theme is dark', () => {
      service.setTheme('vscode-dark');
      expect(service.isDark()).toBe(true);
      
      service.setTheme('vscode-light');
      expect(service.isDark()).toBe(false);
    });

    it('should check if theme is light', () => {
      service.setTheme('vscode-light');
      expect(service.isLight()).toBe(true);
      
      service.setTheme('vscode-dark');
      expect(service.isLight()).toBe(false);
    });
  });

  describe('theme change listeners', () => {
    it('should call callback when theme changes', (done) => {
      let callCount = 0;
      const callback = jasmine.createSpy('themeCallback').and.callFake((theme: ThemeKind) => {
        callCount++;
        if (callCount === 1) {
          expect(theme).toBe('vscode-light');
          done();
        }
      });
      
      const cleanup = service.onThemeChange(callback);
      
      // Change theme to trigger callback
      service.setTheme('vscode-light');
      
      cleanup();
    });

    it('should not call callback if theme does not change', (done) => {
      const callback = jasmine.createSpy('themeCallback');
      
      service.setTheme('vscode-dark'); // Set to current theme
      
      const cleanup = service.onThemeChange(callback);
      
      // Wait a bit and verify callback was not called
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        cleanup();
        done();
      }, 1100); // Wait longer than the interval
    });

    it('should cleanup interval when cleanup function is called', () => {
      const clearIntervalSpy = spyOn(window, 'clearInterval');
      
      const cleanup = service.onThemeChange(() => {});
      cleanup();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Tailwind integration', () => {
    it('should update Tailwind theme variables for light theme', () => {
      const setSpy = spyOn(mockDocumentElement.style, 'setProperty');
      
      service.setTheme('vscode-light');
      
      expect(setSpy).toHaveBeenCalledWith('--background', '0deg 0% 100%');
      expect(setSpy).toHaveBeenCalledWith('--foreground', '0deg 0.02% 3.94%');
    });

    it('should update Tailwind theme variables for dark theme', () => {
      const setSpy = spyOn(mockDocumentElement.style, 'setProperty');
      
      service.setTheme('vscode-dark');
      
      expect(setSpy).toHaveBeenCalledWith('--background', '0deg 0.02% 3.94%');
      expect(setSpy).toHaveBeenCalledWith('--foreground', '0deg 0.5% 98.03%');
    });
  });
  
  describe('error handling', () => {
    it('should handle errors in theme application gracefully', () => {
      // Mock setProperty to throw an error
      spyOn(mockDocumentElement.style, 'setProperty').and.throwError('CSS error');
      
      // Should not throw error
      expect(() => {
        service.setTheme('vscode-dark');
      }).not.toThrow();
    });

    it('should handle missing body element gracefully', () => {
      // Mock document.body to be null
      Object.defineProperty(document, 'body', {
        value: null,
        writable: true
      });
      
      expect(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [ThemeService]
        });
        TestBed.inject(ThemeService);
      }).not.toThrow();
    });
  });
});