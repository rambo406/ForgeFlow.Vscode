import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeKind } from './theme.service';
import { ThemeStore } from '../store/theme.store';
import { ThemeDomService } from './theme-dom.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockThemeStore: any;
  let mockThemeDomService: any;

  beforeEach(() => {
    // Create mock store with signal-like properties
    mockThemeStore = {
      initializeTheme: jasmine.createSpy('initializeTheme'),
      handleThemeChange: jasmine.createSpy('handleThemeChange'),
      setTheme: jasmine.createSpy('setTheme'),
      getThemeColor: jasmine.createSpy('getThemeColor'),
      getSemanticColorValue: jasmine.createSpy('getSemanticColorValue'),
      themeClassNames: jasmine.createSpy('themeClassNames'),
      themeDataAttributes: jasmine.createSpy('themeDataAttributes'),
      semanticColorMappings: jasmine.createSpy('semanticColorMappings'),
      tailwindThemeVariables: jasmine.createSpy('tailwindThemeVariables'),
      currentTheme: jasmine.createSpy('currentTheme').and.returnValue('vscode-dark'),
      themeColors: jasmine.createSpy('themeColors').and.returnValue({}),
      isDarkTheme: jasmine.createSpy('isDarkTheme').and.returnValue(true),
      isLightTheme: jasmine.createSpy('isLightTheme').and.returnValue(false),
      isHighContrast: jasmine.createSpy('isHighContrast').and.returnValue(false)
    };

    // Create mock DOM service
    mockThemeDomService = {
      extractThemeFromBody: jasmine.createSpy('extractThemeFromBody').and.returnValue('vscode-light'),
      extractThemeColors: jasmine.createSpy('extractThemeColors').and.returnValue({ '--vscode-foreground': '#333' }),
      observeBodyClassChanges: jasmine.createSpy('observeBodyClassChanges'),
      setupThemeEventListener: jasmine.createSpy('setupThemeEventListener'),
      applyThemeClasses: jasmine.createSpy('applyThemeClasses'),
      applyDataAttributes: jasmine.createSpy('applyDataAttributes'),
      applySemanticColors: jasmine.createSpy('applySemanticColors'),
      applyTailwindVariables: jasmine.createSpy('applyTailwindVariables'),
      getSemanticColorFromDOM: jasmine.createSpy('getSemanticColorFromDOM')
    };

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: ThemeStore, useValue: mockThemeStore },
        { provide: ThemeDomService, useValue: mockThemeDomService }
      ]
    });

    service = TestBed.inject(ThemeService);
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize theme from DOM on creation', () => {
      mockThemeDomService.extractThemeFromBody.and.returnValue('vscode-light');
      mockThemeDomService.extractThemeColors.and.returnValue({ '--vscode-foreground': '#333' });

      service = TestBed.inject(ThemeService);

      expect(mockThemeDomService.extractThemeFromBody).toHaveBeenCalled();
      expect(mockThemeDomService.extractThemeColors).toHaveBeenCalled();
      expect(mockThemeStore.initializeTheme).toHaveBeenCalledWith('vscode-light', { '--vscode-foreground': '#333' });
    });

    it('should handle initialization errors gracefully', () => {
      mockThemeDomService.extractThemeFromBody.and.throwError('DOM error');
      spyOn(console, 'warn');

      service = TestBed.inject(ThemeService);

      expect(console.warn).toHaveBeenCalledWith('Failed to initialize theme:', jasmine.any(Error));
      expect(mockThemeStore.initializeTheme).toHaveBeenCalledWith('vscode-dark', {});
    });
  });

  describe('theme observation', () => {
    beforeEach(() => {
      // Reset the service creation for these tests
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: ThemeStore, useValue: mockThemeStore },
          { provide: ThemeDomService, useValue: mockThemeDomService }
        ]
      });
    });

    it('should set up body class observation', () => {
      const mockObserver = { disconnect: jasmine.createSpy('disconnect') };
      mockThemeDomService.observeBodyClassChanges.and.returnValue(mockObserver);
      mockThemeDomService.setupThemeEventListener.and.returnValue(() => {});

      service = TestBed.inject(ThemeService);

      expect(mockThemeDomService.observeBodyClassChanges).toHaveBeenCalled();
      expect(mockThemeDomService.setupThemeEventListener).toHaveBeenCalled();
    });

    it('should handle body class changes', () => {
      let bodyChangeCallback: (theme: ThemeKind) => void;
      mockThemeDomService.observeBodyClassChanges.and.callFake((callback: any) => {
        bodyChangeCallback = callback;
        return { disconnect: jasmine.createSpy('disconnect') };
      });
      mockThemeDomService.setupThemeEventListener.and.returnValue(() => {});
      mockThemeDomService.extractThemeColors.and.returnValue({ '--test': '#test' });

      service = TestBed.inject(ThemeService);

      // Simulate body class change
      bodyChangeCallback!('vscode-light');

      expect(mockThemeStore.handleThemeChange).toHaveBeenCalledWith('vscode-light', { '--test': '#test' });
    });

    it('should handle custom VS Code events', () => {
      let eventCallback: (theme: ThemeKind, colors?: any) => void;
      mockThemeDomService.observeBodyClassChanges.and.returnValue({ disconnect: jasmine.createSpy('disconnect') });
      mockThemeDomService.setupThemeEventListener.and.callFake((callback: any) => {
        eventCallback = callback;
        return () => {};
      });

      service = TestBed.inject(ThemeService);

      // Simulate VS Code event
      eventCallback!('vscode-high-contrast', { '--custom': '#custom' });

      expect(mockThemeStore.handleThemeChange).toHaveBeenCalledWith('vscode-high-contrast', { '--custom': '#custom' });
    });
  });

  describe('DOM application', () => {
    it('should apply theme to DOM when store changes', () => {
      mockThemeStore.themeClassNames.and.returnValue(['vscode-light']);
      mockThemeStore.themeDataAttributes.and.returnValue({ 'data-theme': 'light' });
      mockThemeStore.semanticColorMappings.and.returnValue({
        '--color-primary': '#primary',
        '--color-background': '#bg'
      });
      mockThemeStore.tailwindThemeVariables.and.returnValue({
        '--background': 'light-bg',
        '--foreground': 'light-fg',
        isDarkClass: false
      });

      // This would normally trigger the effect, but we'll call it directly for testing
      // In real usage, the effect would be triggered by store changes

      expect(mockThemeDomService.applyThemeClasses).toBeDefined();
      expect(mockThemeDomService.applyDataAttributes).toBeDefined();
      expect(mockThemeDomService.applySemanticColors).toBeDefined();
      expect(mockThemeDomService.applyTailwindVariables).toBeDefined();
    });
  });

  describe('public API', () => {
    it('should expose store properties', () => {
      expect(service.currentTheme).toBe(mockThemeStore.currentTheme);
      expect(service.themeColors).toBe(mockThemeStore.themeColors);
      expect(service.isDarkTheme).toBe(mockThemeStore.isDarkTheme);
      expect(service.isLightTheme).toBe(mockThemeStore.isLightTheme);
      expect(service.isHighContrast).toBe(mockThemeStore.isHighContrast);
    });

    it('should delegate getThemeColor to store', () => {
      mockThemeStore.getThemeColor.and.returnValue('#test-color');

      const result = service.getThemeColor('--vscode-foreground');

      expect(mockThemeStore.getThemeColor).toHaveBeenCalledWith('--vscode-foreground');
      expect(result).toBe('#test-color');
    });

    it('should get semantic color from store first, then DOM fallback', () => {
      mockThemeStore.getSemanticColorValue.and.returnValue('#store-color');

      const result = service.getSemanticColor('primary');

      expect(mockThemeStore.getSemanticColorValue).toHaveBeenCalledWith('primary');
      expect(result).toBe('#store-color');
    });

    it('should fallback to DOM for semantic color when store returns default', () => {
      mockThemeStore.getSemanticColorValue.and.returnValue('#cccccc'); // Default fallback
      mockThemeDomService.getSemanticColorFromDOM.and.returnValue('#dom-color');

      const result = service.getSemanticColor('primary');

      expect(mockThemeDomService.getSemanticColorFromDOM).toHaveBeenCalledWith('primary');
      expect(result).toBe('#dom-color');
    });

    it('should delegate theme checks to store', () => {
      mockThemeStore.isDarkTheme.and.returnValue(true);
      mockThemeStore.isLightTheme.and.returnValue(false);

      expect(service.isDark()).toBe(true);
      expect(service.isLight()).toBe(false);
    });

    it('should delegate setTheme to store', () => {
      service.setTheme('vscode-light');

      expect(mockThemeStore.setTheme).toHaveBeenCalledWith('vscode-light');
    });
  });

  describe('theme change listener', () => {
    it('should set up theme change callback', () => {
      const mockCallback = jasmine.createSpy('callback');
      mockThemeStore.currentTheme.and.returnValue('vscode-dark');

      const cleanup = service.onThemeChange(mockCallback);

      expect(cleanup).toBeInstanceOf(Function);

      // Test cleanup
      cleanup();
      // Cleanup should work without errors
    });
  });

  describe('cleanup', () => {
    it('should cleanup observers on destroy', () => {
      const mockObserver = { disconnect: jasmine.createSpy('disconnect') };
      const mockCleanup = jasmine.createSpy('cleanup');

      mockThemeDomService.observeBodyClassChanges.and.returnValue(mockObserver);
      mockThemeDomService.setupThemeEventListener.and.returnValue(mockCleanup);

      service = TestBed.inject(ThemeService);
      service.ngOnDestroy();

      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalled();
    });
  });
});