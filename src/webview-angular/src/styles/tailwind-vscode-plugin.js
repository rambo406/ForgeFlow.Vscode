const plugin = require('tailwindcss/plugin');

/**
 * VS Code Tailwind Plugin
 * Custom component classes and utilities for VS Code webview integration
 */
module.exports = plugin(function({ addComponents, addUtilities, theme }) {
  // Button Components
  addComponents({
    '.btn-vscode': {
      'display': 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'white-space': 'nowrap',
      'border-radius': theme('borderRadius.vscode'),
      'font-size': theme('fontSize.vscode-sm[0]'),
      'font-weight': '500',
      'line-height': theme('fontSize.vscode-sm[1].lineHeight'),
      'transition-property': 'color, background-color, border-color, text-decoration-color, fill, stroke',
      'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
      'transition-duration': theme('transitionDuration.vscode'),
      'focus-visible': {
        'outline': '2px solid',
        'outline-color': 'var(--vscode-focusBorder)',
        'outline-offset': '1px',
      },
      '&:disabled': {
        'pointer-events': 'none',
        'opacity': '0.5',
      },
      // Primary variant (default)
      'background-color': 'var(--vscode-button-background)',
      'color': 'var(--vscode-button-foreground)',
      'border': '1px solid transparent',
      'padding': theme('spacing.vscode-sm') + ' ' + theme('spacing.vscode-md'),
      'min-height': '26px',
      '&:hover': {
        'background-color': 'var(--vscode-button-hoverBackground)',
      },
    },

    '.btn-vscode-secondary': {
      'background-color': 'var(--vscode-button-secondaryBackground)',
      'color': 'var(--vscode-button-secondaryForeground)',
      'border': '1px solid var(--vscode-button-border)',
      '&:hover': {
        'background-color': 'var(--vscode-button-secondaryHoverBackground)',
      },
    },

    '.btn-vscode-outline': {
      'background-color': 'transparent',
      'color': 'var(--vscode-button-foreground)',
      'border': '1px solid var(--vscode-button-background)',
      '&:hover': {
        'background-color': 'var(--vscode-button-background)',
        'color': 'var(--vscode-button-foreground)',
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

    '.btn-vscode-link': {
      'background-color': 'transparent',
      'color': 'var(--vscode-textLink-foreground)',
      'border': 'none',
      'padding': '0',
      'min-height': 'auto',
      'text-decoration': 'underline',
      '&:hover': {
        'color': 'var(--vscode-textLink-activeForeground)',
      },
    },

    '.btn-vscode-sm': {
      'padding': theme('spacing.vscode-xs') + ' ' + theme('spacing.vscode-sm'),
      'font-size': theme('fontSize.vscode-xs[0]'),
      'line-height': theme('fontSize.vscode-xs[1].lineHeight'),
      'min-height': '22px',
    },

    '.btn-vscode-lg': {
      'padding': theme('spacing.vscode-md') + ' ' + theme('spacing.vscode-lg'),
      'font-size': theme('fontSize.vscode-base[0]'),
      'line-height': theme('fontSize.vscode-base[1].lineHeight'),
      'min-height': '32px',
    },

    '.btn-vscode-icon': {
      'width': '28px',
      'height': '28px',
      'padding': '0',
      'min-height': '28px',
    },
  });

  // Input Components
  addComponents({
    '.input-vscode': {
      'display': 'flex',
      'width': '100%',
      'border-radius': theme('borderRadius.vscode'),
      'border': '1px solid var(--vscode-input-border)',
      'background-color': 'var(--vscode-input-background)',
      'color': 'var(--vscode-input-foreground)',
      'padding': theme('spacing.vscode-sm') + ' ' + theme('spacing.vscode-md'),
      'font-size': theme('fontSize.vscode-sm[0]'),
      'line-height': theme('fontSize.vscode-sm[1].lineHeight'),
      'font-family': theme('fontFamily.vscode').join(', '),
      'transition-property': 'border-color, box-shadow',
      'transition-duration': theme('transitionDuration.vscode'),
      '&:focus': {
        'outline': 'none',
        'border-color': 'var(--vscode-inputOption-activeBorder)',
        'box-shadow': '0 0 0 1px var(--vscode-inputOption-activeBorder)',
      },
      '&:disabled': {
        'cursor': 'not-allowed',
        'opacity': '0.5',
      },
      '&::placeholder': {
        'color': 'var(--vscode-input-placeholderForeground)',
      },
    },

    '.input-vscode-error': {
      'border-color': 'var(--vscode-inputValidation-errorBorder)',
      'background-color': 'var(--vscode-inputValidation-errorBackground)',
      '&:focus': {
        'border-color': 'var(--vscode-inputValidation-errorBorder)',
        'box-shadow': '0 0 0 1px var(--vscode-inputValidation-errorBorder)',
      },
    },

    '.input-vscode-warning': {
      'border-color': 'var(--vscode-inputValidation-warningBorder)',
      'background-color': 'var(--vscode-inputValidation-warningBackground)',
      '&:focus': {
        'border-color': 'var(--vscode-inputValidation-warningBorder)',
        'box-shadow': '0 0 0 1px var(--vscode-inputValidation-warningBorder)',
      },
    },
  });

  // Panel and Card Components
  addComponents({
    '.panel-vscode': {
      'background-color': 'var(--vscode-panel-background)',
      'border': '1px solid var(--vscode-panel-border)',
      'border-radius': theme('borderRadius.vscode'),
      'padding': theme('spacing.vscode-lg'),
      'box-shadow': theme('boxShadow.vscode'),
    },

    '.card-vscode': {
      'background-color': 'var(--vscode-editor-background)',
      'border': '1px solid var(--vscode-panel-border)',
      'border-radius': theme('borderRadius.vscode'),
      'padding': theme('spacing.vscode-lg'),
      'box-shadow': theme('boxShadow.vscode-sm'),
      'transition-property': 'box-shadow, border-color',
      'transition-duration': theme('transitionDuration.vscode'),
      '&:hover': {
        'box-shadow': theme('boxShadow.vscode-md'),
        'border-color': 'var(--vscode-focusBorder)',
      },
    },

    '.card-vscode-header': {
      'padding': theme('spacing.vscode-lg'),
      'border-bottom': '1px solid var(--vscode-panel-border)',
      'margin': '-' + theme('spacing.vscode-lg') + ' -' + theme('spacing.vscode-lg') + ' ' + theme('spacing.vscode-lg'),
    },

    '.card-vscode-content': {
      'padding': theme('spacing.vscode-lg'),
      'margin': '0 -' + theme('spacing.vscode-lg'),
    },

    '.card-vscode-footer': {
      'padding': theme('spacing.vscode-lg'),
      'border-top': '1px solid var(--vscode-panel-border)',
      'margin': theme('spacing.vscode-lg') + ' -' + theme('spacing.vscode-lg') + ' -' + theme('spacing.vscode-lg'),
    },
  });

  // Badge Components
  addComponents({
    '.badge-vscode': {
      'display': 'inline-flex',
      'align-items': 'center',
      'border-radius': theme('borderRadius.vscode-sm'),
      'padding': theme('spacing.vscode-xs') + ' ' + theme('spacing.vscode-sm'),
      'font-size': theme('fontSize.vscode-xs[0]'),
      'font-weight': '500',
      'line-height': theme('fontSize.vscode-xs[1].lineHeight'),
      'white-space': 'nowrap',
      'background-color': 'var(--vscode-badge-background)',
      'color': 'var(--vscode-badge-foreground)',
    },

    '.badge-vscode-error': {
      'background-color': 'var(--vscode-inputValidation-errorBackground)',
      'color': 'var(--vscode-errorForeground)',
      'border': '1px solid var(--vscode-inputValidation-errorBorder)',
    },

    '.badge-vscode-warning': {
      'background-color': 'var(--vscode-inputValidation-warningBackground)',
      'color': 'var(--vscode-warningForeground)',
      'border': '1px solid var(--vscode-inputValidation-warningBorder)',
    },

    '.badge-vscode-info': {
      'background-color': 'var(--vscode-inputValidation-infoBackground)',
      'color': 'var(--vscode-infoForeground)',
      'border': '1px solid var(--vscode-inputValidation-infoBorder)',
    },

    '.badge-vscode-success': {
      'background-color': 'var(--vscode-editorGutter-addedBackground)',
      'color': 'var(--vscode-testing-iconPassed)',
      'border': '1px solid var(--vscode-testing-iconPassed)',
    },
  });

  // List Components
  addComponents({
    '.list-vscode': {
      'background-color': 'var(--vscode-list-background)',
      'color': 'var(--vscode-list-foreground)',
    },

    '.list-item-vscode': {
      'padding': theme('spacing.vscode-sm') + ' ' + theme('spacing.vscode-md'),
      'border-bottom': '1px solid var(--vscode-panel-border)',
      'transition-property': 'background-color',
      'transition-duration': theme('transitionDuration.vscode'),
      '&:hover': {
        'background-color': 'var(--vscode-list-hoverBackground)',
      },
      '&:focus': {
        'outline': 'none',
        'background-color': 'var(--vscode-list-focusBackground)',
      },
      '&.active': {
        'background-color': 'var(--vscode-list-activeSelectionBackground)',
        'color': 'var(--vscode-list-activeSelectionForeground)',
      },
    },
  });

  // Utility Classes
  addUtilities({
    // Semantic Text Colors
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
      'color': 'var(--vscode-testing-iconPassed)',
    },
    '.text-vscode-muted': {
      'color': 'var(--vscode-descriptionForeground)',
    },

    // Semantic Background Colors
    '.bg-vscode-error': {
      'background-color': 'var(--vscode-inputValidation-errorBackground)',
    },
    '.bg-vscode-warning': {
      'background-color': 'var(--vscode-inputValidation-warningBackground)',
    },
    '.bg-vscode-info': {
      'background-color': 'var(--vscode-inputValidation-infoBackground)',
    },
    '.bg-vscode-success': {
      'background-color': 'var(--vscode-editorGutter-addedBackground)',
    },

    // Semantic Border Colors
    '.border-vscode-error': {
      'border-color': 'var(--vscode-inputValidation-errorBorder)',
    },
    '.border-vscode-warning': {
      'border-color': 'var(--vscode-inputValidation-warningBorder)',
    },
    '.border-vscode-info': {
      'border-color': 'var(--vscode-inputValidation-infoBorder)',
    },
    '.border-vscode-success': {
      'border-color': 'var(--vscode-testing-iconPassed)',
    },

    // Focus Utilities
    '.focus-vscode': {
      '&:focus': {
        'outline': '2px solid var(--vscode-focusBorder)',
        'outline-offset': '1px',
      },
    },

    '.focus-visible-vscode': {
      '&:focus-visible': {
        'outline': '2px solid var(--vscode-focusBorder)',
        'outline-offset': '1px',
      },
    },

    // Scrollbar Utilities
    '.scrollbar-vscode': {
      '&::-webkit-scrollbar': {
        'width': '14px',
        'height': '14px',
      },
      '&::-webkit-scrollbar-thumb': {
        'background-color': 'var(--vscode-scrollbarSlider-background)',
        'border-radius': '9px',
        'border': '3px solid transparent',
        'background-clip': 'content-box',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        'background-color': 'var(--vscode-scrollbarSlider-hoverBackground)',
      },
      '&::-webkit-scrollbar-thumb:active': {
        'background-color': 'var(--vscode-scrollbarSlider-activeBackground)',
      },
      '&::-webkit-scrollbar-track': {
        'background-color': 'var(--vscode-scrollbar-shadow)',
      },
      '&::-webkit-scrollbar-corner': {
        'background-color': 'var(--vscode-editor-background)',
      },
    },

    // Animation Utilities
    '.animate-vscode-fade-in': {
      'animation': 'fadeIn 200ms ease-in-out',
    },

    '.animate-vscode-slide-in': {
      'animation': 'slideIn 200ms ease-out',
    },

    '.animate-vscode-pulse': {
      'animation': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },

    // Grid Utilities for VS Code layouts
    '.dashboard-grid': {
      'display': 'grid',
      'grid-template-columns': 'repeat(1, minmax(0, 1fr))',
      'gap': theme('spacing.vscode-lg'),
      '@screen vscode-lg': {
        'grid-template-columns': 'repeat(4, minmax(0, 1fr))',
      },
    },

    '.dashboard-main-grid': {
      'display': 'grid',
      'grid-template-columns': '1fr',
      'grid-template-rows': '1fr',
      'gap': '0',
      'height': '100%',
      'overflow': 'hidden',
    },

    '.comment-preview-grid': {
      'display': 'grid',
      'grid-template-columns': 'repeat(1, minmax(0, 1fr))',
      'gap': theme('spacing.vscode-md'),
      '@screen vscode-md': {
        'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
      },
      '@screen vscode-xl': {
        'grid-template-columns': 'repeat(3, minmax(0, 1fr))',
      },
    },

    // Container Utilities
    '.container-vscode': {
      'width': '100%',
      'max-width': '1200px',
      'margin-left': 'auto',
      'margin-right': 'auto',
      'padding-left': theme('spacing.vscode-lg'),
      'padding-right': theme('spacing.vscode-lg'),
      '@screen vscode-sm': {
        'padding-left': theme('spacing.vscode-xl'),
        'padding-right': theme('spacing.vscode-xl'),
      },
      '@screen vscode-lg': {
        'padding-left': theme('spacing.vscode-2xl'),
        'padding-right': theme('spacing.vscode-2xl'),
      },
    },

    // Responsive Flex Utilities
    '.flex-responsive': {
      'display': 'flex',
      'flex-direction': 'column',
      '@screen vscode-sm': {
        'flex-direction': 'row',
        'align-items': 'center',
      },
    },
  });
});