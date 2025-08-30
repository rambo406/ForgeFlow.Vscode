/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
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
        'input': 'var(--color-input)',
        'ring': 'var(--color-ring)',
        'destructive': 'var(--color-destructive)',
        'destructive-foreground': 'var(--color-destructive-foreground)',
      },
      fontFamily: {
        'vscode': 'var(--vscode-font-family)',
      },
      fontSize: {
        'vscode': 'var(--vscode-font-size)',
      },
      spacing: {
        'vscode-xs': '0.25rem',
        'vscode-sm': '0.5rem',
        'vscode-md': '0.75rem',
        'vscode-lg': '1rem',
        'vscode-xl': '1.5rem',
      },
      borderRadius: {
        'vscode': '3px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable preflight to avoid conflicts with VS Code styles
  },
}