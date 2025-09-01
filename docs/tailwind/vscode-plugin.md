# VS Code Tailwind Plugin Documentation

This document provides detailed information about the custom Tailwind CSS plugin that provides VS Code-specific component classes and utilities.

## 📋 Overview

The VS Code Tailwind plugin (`tailwind-vscode-plugin.js`) extends Tailwind CSS with custom component classes and utilities specifically designed for VS Code webview integration. It provides pre-built components that match VS Code's design system and automatically adapt to different themes.

## 📁 File Location

```
src/webview-angular-v2/src/styles/tailwind-vscode-plugin.js
```

## 🔧 Plugin Configuration

The plugin is registered in `tailwind.config.js`:

```javascript
module.exports = {
  // ... other config
  plugins: [
    require('./src/styles/tailwind-vscode-plugin.js'),
  ],
}
```

## 🧩 Component Classes

The plugin provides several component classes using Tailwind's `addComponents` API.

### Button Components

#### `.btn-vscode` - Primary Button

The main action button that uses VS Code's primary button styling.

```css
.btn-vscode {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  transition: all 0.2s ease;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid transparent;
  padding: 8px 16px;
  min-height: 26px;
}

.btn-vscode:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.btn-vscode:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 1px;
}

.btn-vscode:disabled {
  pointer-events: none;
  opacity: 0.5;
}
```

**Usage:**
```html
<button class="btn-vscode">Primary Action</button>
<button class="btn-vscode" disabled>Disabled Button</button>
```

#### `.btn-vscode-secondary` - Secondary Button

Secondary action button with different styling for less prominent actions.

```css
.btn-vscode-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-panel-border);
}

.btn-vscode-secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}
```

**Usage:**
```html
<button class="btn-vscode-secondary">Secondary Action</button>
```

#### `.btn-vscode-ghost` - Ghost Button

Transparent button for subtle actions, often used for icon buttons or less important actions.

```css
.btn-vscode-ghost {
  background-color: transparent;
  color: var(--vscode-foreground);
  border: 1px solid transparent;
}

.btn-vscode-ghost:hover {
  background-color: var(--vscode-list-hoverBackground);
}
```

**Usage:**
```html
<button class="btn-vscode-ghost">Ghost Action</button>
<button class="btn-vscode-ghost">
  <i class="codicon codicon-edit"></i>
</button>
```

### Form Components

#### `.input-vscode` - Standard Input

Standard form input field with VS Code theming.

```css
.input-vscode {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--vscode-font-family);
  line-height: 1.4;
  transition: border-color 0.2s ease;
}

.input-vscode:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.input-vscode::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.input-vscode:disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

**Usage:**
```html
<input class="input-vscode" type="text" placeholder="Enter text...">
<input class="input-vscode w-full" type="email" placeholder="Email">
```

#### `.input-vscode-error` - Error State Input

Input field with error styling for validation feedback.

```css
.input-vscode-error {
  border-color: var(--vscode-errorForeground);
}
```

**Usage:**
```html
<input class="input-vscode input-vscode-error" 
       type="text" 
       placeholder="Invalid input">
```

### Container Components

#### `.panel-vscode` - Panel Container

Basic panel container without shadow, suitable for sidebar panels and basic containers.

```css
.panel-vscode {
  background-color: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 16px;
}
```

**Usage:**
```html
<div class="panel-vscode">
  <h2 class="text-vscode-lg font-medium mb-vscode-md">Panel Title</h2>
  <p>Panel content goes here...</p>
</div>
```

#### `.card-vscode` - Card Container

Card component with subtle shadow, perfect for content cards and elevated containers.

```css
.card-vscode {
  background-color: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Usage:**
```html
<div class="card-vscode">
  <h3 class="text-vscode-lg font-medium mb-vscode-sm">Card Title</h3>
  <p class="text-vscode-sm text-vscode-muted">Card content...</p>
</div>
```

## 🎨 Utility Classes

The plugin provides utility classes using Tailwind's `addUtilities` API.

### Text Color Utilities

Semantic text colors that automatically adapt to VS Code themes.

```css
.text-vscode-error { color: var(--vscode-errorForeground); }
.text-vscode-warning { color: var(--vscode-warningForeground); }
.text-vscode-info { color: var(--vscode-infoForeground); }
.text-vscode-success { color: #89d185; }
.text-vscode-muted { color: var(--vscode-descriptionForeground); }
.text-vscode-foreground { color: var(--vscode-foreground); }
```

**Usage:**
```html
<p class="text-vscode-error">Error message</p>
<p class="text-vscode-warning">Warning message</p>
<p class="text-vscode-info">Info message</p>
<p class="text-vscode-success">Success message</p>
<p class="text-vscode-muted">Muted text</p>
```

### Background Color Utilities

Background colors using VS Code theme variables.

```css
.bg-vscode-error { background-color: var(--vscode-errorForeground); }
.bg-vscode-warning { background-color: var(--vscode-warningForeground); }
.bg-vscode-info { background-color: var(--vscode-infoForeground); }
.bg-vscode-success { background-color: #89d185; }
.bg-vscode-primary { background-color: var(--vscode-button-background); }
.bg-vscode-secondary { background-color: var(--vscode-button-secondaryBackground); }
.bg-vscode-panel-background { background-color: var(--vscode-panel-background); }
```

**Usage:**
```html
<div class="bg-vscode-primary text-vscode-primary-foreground">Primary background</div>
<div class="bg-vscode-error text-white">Error background</div>
```

### Button Text Color Utilities

Text colors specifically for button components.

```css
.text-vscode-primary-foreground { color: var(--vscode-button-foreground); }
.text-vscode-secondary-foreground { color: var(--vscode-button-secondaryForeground); }
```

### Border Utilities

Border color utilities using VS Code theme variables.

```css
.border-vscode-panel-border { border-color: var(--vscode-panel-border); }
```

### Focus Utility

Custom focus styling that matches VS Code patterns.

```css
.focus-vscode:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 1px;
}
```

**Usage:**
```html
<button class="focus-vscode">Custom focusable element</button>
```

## 🔧 Extending the Plugin

You can extend the plugin to add more components or utilities:

```javascript
const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addComponents, addUtilities }) {
  // Existing components...
  
  // Add new components
  addComponents({
    '.btn-vscode-danger': {
      'background-color': 'var(--vscode-errorForeground)',
      'color': 'white',
      '&:hover': {
        'background-color': 'var(--vscode-errorForeground)',
        'opacity': '0.9',
      },
    },
    
    '.input-vscode-success': {
      'border-color': '#89d185',
    },
  });
  
  // Add new utilities
  addUtilities({
    '.text-vscode-link': {
      'color': 'var(--vscode-textLink-foreground)',
    },
    '.text-vscode-link-active': {
      'color': 'var(--vscode-textLink-activeForeground)',
    },
  });
});
```

## 🎭 Theme Integration

All component classes and utilities use CSS custom properties that map to VS Code theme variables. This ensures automatic adaptation to:

- **Light themes**: Standard VS Code light theme
- **Dark themes**: Standard VS Code dark theme  
- **High-contrast themes**: Both light and dark high-contrast variants
- **Custom themes**: Any user-installed VS Code theme

### VS Code Theme Variables Used

| Variable | Purpose |
|----------|---------|
| `--vscode-button-background` | Primary button background |
| `--vscode-button-foreground` | Primary button text |
| `--vscode-button-hoverBackground` | Primary button hover state |
| `--vscode-button-secondaryBackground` | Secondary button background |
| `--vscode-button-secondaryForeground` | Secondary button text |
| `--vscode-button-secondaryHoverBackground` | Secondary button hover |
| `--vscode-input-background` | Input field background |
| `--vscode-input-foreground` | Input field text |
| `--vscode-input-border` | Input field border |
| `--vscode-panel-background` | Panel and card background |
| `--vscode-panel-border` | Panel and card border |
| `--vscode-focusBorder` | Focus outline color |
| `--vscode-foreground` | Primary text color |
| `--vscode-errorForeground` | Error state color |
| `--vscode-warningForeground` | Warning state color |
| `--vscode-infoForeground` | Info state color |
| `--vscode-descriptionForeground` | Muted text color |
| `--vscode-list-hoverBackground` | Hover background color |

## 🧪 Testing the Plugin

To test the plugin components across different VS Code themes:

```bash
# Run the theme testing script
./scripts/theme-testing.sh
```

### Manual Testing Checklist

1. **Light Theme Testing**
   - All components render with proper contrast
   - Hover states are visible and appropriate
   - Focus indicators are clearly visible

2. **Dark Theme Testing**
   - Colors invert properly for dark background
   - All text remains readable
   - Shadows and borders remain visible

3. **High-Contrast Testing**
   - Maximum contrast is maintained
   - Focus indicators are highly visible
   - All interactive elements are clearly distinguishable

## 📚 Best Practices

### When to Use Component Classes

Use component classes for:
- Common UI patterns (buttons, inputs, cards)
- Elements that need consistent VS Code theming
- Components used across multiple templates

### When to Use Utility Classes

Use utility classes for:
- One-off styling adjustments
- Layout and spacing
- Responsive design modifications

### Combining Classes

You can combine component classes with utility classes:

```html
<!-- Component class + spacing utilities -->
<button class="btn-vscode w-full sm:w-auto mb-4">
  Responsive Button
</button>

<!-- Component class + custom styling -->
<div class="card-vscode max-w-md mx-auto">
  Centered Card
</div>
```

## 🚀 Performance Considerations

- All component classes use CSS custom properties for efficient theme switching
- No JavaScript is required for theme adaptation
- Classes are generated at build time for optimal performance
- CSS purging removes unused component classes in production

## 🔍 Debugging

### Common Issues

**Component classes not applying:**
- Ensure the plugin is properly registered in `tailwind.config.js`
- Check that the file is included in Tailwind's content paths
- Verify the build process includes the plugin

**Theme colors not working:**
- Check that VS Code theme variables are available
- Test in the actual VS Code webview environment
- Verify CSS custom properties are supported

**Focus styles not visible:**
- Ensure you're testing with keyboard navigation
- Check that `:focus-visible` is supported in your target browser
- Test across different VS Code themes

### Development Tools

Use VS Code's developer tools to inspect generated CSS and theme variables:

```javascript
// Check available theme variables in browser console
console.log(getComputedStyle(document.documentElement));
```

---

**Last Updated**: August 31, 2025
**Plugin Version**: 1.0.0
**Components**: 6 component classes
**Utilities**: 15+ utility classes