/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./libs/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Enhanced VS Code theme variables
        'vscode-foreground': 'var(--vscode-foreground)',
        'vscode-background': 'var(--vscode-editor-background)',
        'vscode-button-background': 'var(--vscode-button-background)',
        'vscode-button-foreground': 'var(--vscode-button-foreground)',
        'vscode-button-hover-background': 'var(--vscode-button-hoverBackground)',
        'vscode-button-secondary-background': 'var(--vscode-button-secondaryBackground)',
        'vscode-button-secondary-foreground': 'var(--vscode-button-secondaryForeground)',
        'vscode-button-secondary-hover-background': 'var(--vscode-button-secondaryHoverBackground)',
        'vscode-input-background': 'var(--vscode-input-background)',
        'vscode-input-foreground': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-input-focus-border': 'var(--vscode-inputOption-activeBorder)',
        'vscode-panel-background': 'var(--vscode-panel-background)',
        'vscode-panel-border': 'var(--vscode-panel-border)',
        'vscode-sidebar-background': 'var(--vscode-sideBar-background)',
        'vscode-sidebar-foreground': 'var(--vscode-sideBar-foreground)',
        'vscode-error-foreground': 'var(--vscode-errorForeground)',
        'vscode-warning-foreground': 'var(--vscode-warningForeground)',
        'vscode-info-foreground': 'var(--vscode-infoForeground)',
        'vscode-success-foreground': 'var(--vscode-testing-iconPassed)',
        'vscode-editor-selection': 'var(--vscode-editor-selectionBackground)',
        'vscode-editor-hover': 'var(--vscode-editor-hoverHighlightBackground)',
        'vscode-list-hover': 'var(--vscode-list-hoverBackground)',
        'vscode-list-active': 'var(--vscode-list-activeSelectionBackground)',
        
        // Enhanced semantic color system
        'primary': 'var(--vscode-button-background)',
        'primary-foreground': 'var(--vscode-button-foreground)',
        'primary-hover': 'var(--vscode-button-hoverBackground)',
        'secondary': 'var(--vscode-button-secondaryBackground)',
        'secondary-foreground': 'var(--vscode-button-secondaryForeground)',
        'secondary-hover': 'var(--vscode-button-secondaryHoverBackground)',
        'background': 'var(--vscode-editor-background)',
        'foreground': 'var(--vscode-foreground)',
        'muted': 'var(--vscode-panel-background)',
        'muted-foreground': 'var(--vscode-descriptionForeground)',
        'border': 'var(--vscode-panel-border)',
        'input': 'var(--vscode-input-background)',
        'ring': 'var(--vscode-inputOption-activeBorder)',
        'error': 'var(--vscode-errorForeground)',
        'error-background': 'var(--vscode-inputValidation-errorBackground)',
        'warning': 'var(--vscode-warningForeground)', 
        'warning-background': 'var(--vscode-inputValidation-warningBackground)',
        'info': 'var(--vscode-infoForeground)',
        'info-background': 'var(--vscode-inputValidation-infoBackground)',
        'success': 'var(--vscode-testing-iconPassed)',
        'success-background': 'var(--vscode-editorGutter-addedBackground)',
      },
      fontFamily: {
        'vscode': ['var(--vscode-font-family)', 'var(--vscode-editor-font-family)', 'Segoe UI', 'system-ui', 'sans-serif'],
        'vscode-mono': ['var(--vscode-editor-font-family)', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        'vscode-xs': ['0.75rem', { lineHeight: '1rem' }],
        'vscode-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'vscode': ['var(--vscode-font-size)', { lineHeight: '1.5' }],
        'vscode-base': ['1rem', { lineHeight: '1.5rem' }],
        'vscode-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'vscode-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'vscode-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      spacing: {
        'vscode-xs': '0.25rem',    // 4px
        'vscode-sm': '0.5rem',     // 8px
        'vscode-md': '0.75rem',    // 12px
        'vscode-lg': '1rem',       // 16px
        'vscode-xl': '1.5rem',     // 24px
        'vscode-2xl': '2rem',      // 32px
        'vscode-3xl': '3rem',      // 48px
        'vscode-4xl': '4rem',      // 64px
        'vscode-5xl': '6rem',      // 96px
      },
      borderRadius: {
        'vscode': '3px',
        'vscode-sm': '2px',
        'vscode-lg': '6px',
        'vscode-xl': '8px',
      },
      maxWidth: {
        'vscode-sm': '20rem',
        'vscode-md': '28rem',
        'vscode-lg': '32rem',
        'vscode-xl': '36rem',
        'vscode-2xl': '42rem',
        'vscode-3xl': '48rem',
      },
      boxShadow: {
        'vscode': 'var(--vscode-widget-shadow)',
        'vscode-sm': '0 1px 3px var(--vscode-widget-shadow)',
        'vscode-md': '0 2px 8px var(--vscode-widget-shadow)',
        'vscode-lg': '0 4px 16px var(--vscode-widget-shadow)',
        'vscode-xl': '0 8px 32px var(--vscode-widget-shadow)',
      },
      transitionDuration: {
        'vscode': '200ms',
        'vscode-fast': '100ms',
        'vscode-slow': '300ms',
      },
      screens: {
        'vscode-sm': '576px',   // Small webview panels
        'vscode-md': '768px',   // Medium webview panels  
        'vscode-lg': '1024px',  // Large webview panels
        'vscode-xl': '1280px',  // Extra large webview panels
      },
      animation: {
        'vscode-fade-in': 'fadeIn 200ms ease-in-out',
        'vscode-slide-in': 'slideIn 200ms ease-out',
        'vscode-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Register custom VS Code plugin
    require('./src/styles/tailwind-vscode-plugin.js'),
  ],
  corePlugins: {
    preflight: false, // Disable preflight to avoid conflicts with VS Code styles
  },
  // Optimize for production builds
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Optimize CSS output
  experimental: {
    optimizeUniversalDefaults: true,
  },
  // Enhanced safelist for dynamic classes
  safelist: [
    // VS Code component classes
    'btn-vscode',
    'btn-vscode-secondary',
    'input-vscode',
    'panel-vscode',
    'card-vscode',
    
    // VS Code semantic utility classes
    'text-vscode-error',
    'text-vscode-warning', 
    'text-vscode-info',
    'text-vscode-success',
    'bg-vscode-error',
    'bg-vscode-warning',
    'bg-vscode-info',
    'bg-vscode-success',
    'border-vscode-error',
    'border-vscode-warning',
    'border-vscode-info',
    'border-vscode-success',
    
    // Enhanced state classes
    {
      pattern: /btn-vscode-(primary|secondary|outline|ghost|link)/,
    },
    {
      pattern: /text-(vscode-xs|vscode-sm|vscode|vscode-lg|vscode-xl)/,
    },
    {
      pattern: /space-(vscode-xs|vscode-sm|vscode-md|vscode-lg|vscode-xl)/,
    },
    {
      pattern: /gap-(vscode-xs|vscode-sm|vscode-md|vscode-lg|vscode-xl)/,
    },
    
    // Responsive utilities
    {
      pattern: /(vscode-sm|vscode-md|vscode-lg|vscode-xl):(flex|grid|hidden|block)/,
    },
    {
      pattern: /(vscode-sm|vscode-md|vscode-lg|vscode-xl):grid-cols-[1-6]/,
    },
    
    // Animation classes
    'animate-vscode-fade-in',
    'animate-vscode-slide-in',
    'animate-vscode-pulse',
  ],
  plugins: [
    require('./src/styles/tailwind-vscode-plugin.js'),
  ],
}