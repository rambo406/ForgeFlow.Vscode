/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // VS Code theme integration
        "vscode-bg": "var(--vscode-editor-background)",
        "vscode-fg": "var(--vscode-editor-foreground)",
        "vscode-accent": "var(--vscode-button-background)",
        "vscode-border": "var(--vscode-widget-border)",
        "vscode-hover": "var(--vscode-list-hoverBackground)",
      },
    },
  },
  plugins: [],
};
