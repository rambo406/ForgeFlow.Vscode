const plugin = require('tailwindcss/plugin');

/**
 * VS Code Tailwind Plugin
 * Custom component classes and utilities for VS Code webview integration
 */
module.exports = plugin(function({ addComponents, addUtilities }) {
  // Button Components
  addComponents({
    '.btn-vscode': {
      'display': 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'white-space': 'nowrap',
      'border-radius': '6px',
      'font-size': '13px',
      'font-weight': '500',
      'line-height': '1.4',
      'transition': 'all 0.2s ease',
      'background-color': 'var(--vscode-button-background)',
      'color': 'var(--vscode-button-foreground)',
      'border': '1px solid transparent',
      'padding': '8px 16px',
      'min-height': '26px',
      '&:hover': {
        'background-color': 'var(--vscode-button-hoverBackground)',
      },
      '&:focus-visible': {
        'outline': '2px solid var(--vscode-focusBorder)',
        'outline-offset': '1px',
      },
      '&:disabled': {
        'pointer-events': 'none',
        'opacity': '0.5',
      },
    },

    '.btn-vscode-secondary': {
      'background-color': 'var(--vscode-button-secondaryBackground)',
      'color': 'var(--vscode-button-secondaryForeground)',
      'border': '1px solid var(--vscode-panel-border)',
      '&:hover': {
        'background-color': 'var(--vscode-button-secondaryHoverBackground)',
      },
    },

    '.btn-vscode-ghost': {
      'background-color': 'transparent',
      'color': 'var(--vscode-foreground)',
      'border': '1px solid transparent',
      '&:hover': {
        'background-color': 'var(--vscode-list-hoverBackground)',
      },
    },

    '.input-vscode': {
      'background-color': 'var(--vscode-input-background)',
      'color': 'var(--vscode-input-foreground)',
      'border': '1px solid var(--vscode-input-border)',
      'border-radius': '4px',
      'padding': '8px 12px',
      'font-size': '13px',
      'font-family': 'var(--vscode-font-family)',
      'line-height': '1.4',
      'transition': 'border-color 0.2s ease',
      '&:focus': {
        'outline': 'none',
        'border-color': 'var(--vscode-focusBorder)',
      },
      '&::placeholder': {
        'color': 'var(--vscode-input-placeholderForeground)',
      },
      '&:disabled': {
        'opacity': '0.5',
        'pointer-events': 'none',
      },
    },

    '.input-vscode-error': {
      'border-color': 'var(--vscode-errorForeground)',
    },

    '.panel-vscode': {
      'background-color': 'var(--vscode-panel-background)',
      'border': '1px solid var(--vscode-panel-border)',
      'border-radius': '8px',
      'padding': '16px',
    },

    '.card-vscode': {
      'background-color': 'var(--vscode-panel-background)',
      'border': '1px solid var(--vscode-panel-border)',
      'border-radius': '8px',
      'padding': '16px',
      'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.1)',
    },

    // Layout containers for consistent paddings and max width
    '.container-vscode': {
      'max-width': '1200px',
      'margin-left': 'auto',
      'margin-right': 'auto',
      'padding-left': '1rem',
      'padding-right': '1rem',
    },

    // Responsive flex helper used across views
    '.flex-responsive': {
      'display': 'flex',
      'flex-direction': 'column',
    },

    // Dashboard grid helpers used by dashboard views
    '.dashboard-main-grid': {
      'display': 'grid',
      'grid-template-columns': '1fr',
      'height': '100%',
    },
    '.dashboard-grid': {
      'display': 'grid',
      'grid-template-columns': 'repeat(12, minmax(0, 1fr))',
      'gap': '1rem',
    },
  });

  // Utility Classes
  addUtilities({
    '.text-vscode-error': {
      'color': 'var(--vscode-errorForeground)',
    },
    '.text-vscode-warning': {
      'color': 'var(--vscode-warningForeground)',
    },
    '.text-vscode-info': {
      'color': 'var(--vscode-infoForeground)',
    },
    '.text-vscode-success': {
      'color': '#89d185',
    },
    '.text-vscode-muted': {
      'color': 'var(--vscode-descriptionForeground)',
    },
    '.text-vscode-foreground': {
      'color': 'var(--vscode-foreground)',
    },
    '.bg-vscode-error': {
      'background-color': 'var(--vscode-errorForeground)',
    },
    '.bg-vscode-warning': {
      'background-color': 'var(--vscode-warningForeground)',
    },
    '.bg-vscode-info': {
      'background-color': 'var(--vscode-infoForeground)',
    },
    '.bg-vscode-success': {
      'background-color': '#89d185',
    },
    '.bg-vscode-primary': {
      'background-color': 'var(--vscode-button-background)',
    },
    '.bg-vscode-secondary': {
      'background-color': 'var(--vscode-button-secondaryBackground)',
    },
    '.text-vscode-primary-foreground': {
      'color': 'var(--vscode-button-foreground)',
    },
    '.text-vscode-secondary-foreground': {
      'color': 'var(--vscode-button-secondaryForeground)',
    },
    '.border-vscode-panel-border': {
      'border-color': 'var(--vscode-panel-border)',
    },
    '.bg-vscode-panel-background': {
      'background-color': 'var(--vscode-panel-background)',
    },
    '.focus-vscode': {
      '&:focus-visible': {
        'outline': '2px solid var(--vscode-focusBorder)',
        'outline-offset': '1px',
      },
    },

    // Sticky blurred subheaders (e.g., filter bars)
    '.sticky-subheader': {
      'position': 'sticky',
      'top': '0',
      'z-index': '10',
      'backdrop-filter': 'saturate(180%) blur(8px)',
      '-webkit-backdrop-filter': 'saturate(180%) blur(8px)'
    },
  });
});
