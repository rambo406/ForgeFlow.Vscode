/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./libs/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code theme variables
        'vscode-foreground': 'var(--vscode-foreground)',
        'vscode-background': 'var(--vscode-editor-background)',
        'vscode-button-background': 'var(--vscode-button-background)',
        'vscode-button-foreground': 'var(--vscode-button-foreground)',
        'vscode-button-hover-background': 'var(--vscode-button-hoverBackground)',
        'vscode-input-background': 'var(--vscode-input-background)',
        'vscode-input-foreground': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-panel-background': 'var(--vscode-panel-background)',
        'vscode-panel-border': 'var(--vscode-panel-border)',
        'vscode-sidebar-background': 'var(--vscode-sideBar-background)',
        'vscode-sidebar-foreground': 'var(--vscode-sideBar-foreground)',
        'vscode-error-foreground': 'var(--vscode-errorForeground)',
        'vscode-warning-foreground': 'var(--vscode-warningForeground)',
        'vscode-info-foreground': 'var(--vscode-infoForeground)',
        
        // Semantic colors based on VS Code theme
        'primary': 'var(--color-primary)',
        'primary-foreground': 'var(--color-primary-foreground)',
        'secondary': 'var(--color-secondary)',
        'secondary-foreground': 'var(--color-secondary-foreground)',
        'background': 'var(--color-background)',
        'foreground': 'var(--color-foreground)',
        'muted': 'var(--color-muted)',
        'muted-foreground': 'var(--color-muted-foreground)',
        'border': 'var(--color-border)',
        'input': 'var(--color-input-background)',
        'ring': 'var(--color-border-focus)',
        'destructive': 'var(--color-error)',
        'destructive-foreground': 'var(--color-background)',
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'info': 'var(--color-info)',
      },
      fontFamily: {
        'vscode': 'var(--vscode-font-family)',
      },
      fontSize: {
        'vscode': 'var(--vscode-font-size)',
        'vscode-xs': '0.75rem',
        'vscode-sm': '0.875rem',
        'vscode-lg': '1.125rem',
        'vscode-xl': '1.25rem',
      },
      spacing: {
        'vscode-xs': '0.25rem',
        'vscode-sm': '0.5rem',
        'vscode-md': '0.75rem',
        'vscode-lg': '1rem',
        'vscode-xl': '1.5rem',
        'vscode-2xl': '2rem',
        'vscode-3xl': '3rem',
      },
      borderRadius: {
        'vscode': '3px',
        'vscode-sm': '2px',
        'vscode-lg': '6px',
      },
      maxWidth: {
        'vscode-sm': '20rem',
        'vscode-md': '28rem',
        'vscode-lg': '32rem',
        'vscode-xl': '36rem',
        'vscode-2xl': '42rem',
      },
      boxShadow: {
        'vscode': '0 2px 8px var(--color-shadow)',
        'vscode-lg': '0 4px 16px var(--color-shadow)',
      },
      transitionDuration: {
        'vscode': '200ms',
      },
      screens: {
        'vscode-sm': '576px',   // Small webview panels
        'vscode-md': '768px',   // Medium webview panels
        'vscode-lg': '1024px',  // Large webview panels
        'vscode-xl': '1280px',  // Extra large webview panels
      },
    },
  },
  plugins: [],
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
  // Safelist important utility classes that might be used dynamically
  safelist: [
    // VS Code specific utilities
    'vscode-font',
    'text-vscode-error',
    'text-vscode-warning', 
    'text-vscode-info',
    'text-vscode-success',
    'bg-vscode-error',
    'bg-vscode-warning',
    'bg-vscode-info',
    'bg-vscode-success',
    'border-vscode',
    'border-vscode-focus',
    
    // Component state classes
    'btn-vscode-primary',
    'btn-vscode-secondary',
    'input-vscode',
    'panel-vscode',
    'card-vscode',
    'table-vscode',
    'badge-error',
    'badge-warning',
    'badge-info',
    'badge-success',
    
    // Responsive utilities
    'container-vscode',
    'dashboard-grid',
    'comment-preview-grid',
    'flex-responsive',
    'text-responsive',
    'btn-responsive',
    'panel-responsive',
    
    // Animation classes
    'fade-in',
    'slide-in-right',
    'slide-in-left',
    'loading-spinner',
    'skeleton-vscode',
    
    // Theme classes
    'spartan-vscode-theme',
  ],
}