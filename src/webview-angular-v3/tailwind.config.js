/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{html,ts}'
    ],
    theme: {
        extend: {
            colors: {
                vs: {
                    fg: 'var(--vscode-foreground)',
                    bg: 'var(--vscode-editor-background)',
                    desc: 'var(--vscode-descriptionForeground)',
                    panelBorder: 'var(--vscode-panel-border)',
                    textBlockQuoteBg: 'var(--vscode-textBlockQuote-background)'
                }
            }
        },
    },
    plugins: [],
};
