# Design Tokens

This document defines the design tokens used in the Azure DevOps PR Code Reviewer extension's Tailwind CSS system, focusing on VS Code theme integration and semantic color mapping.

## 🎨 Color System

### VS Code Theme Variables

Our color system is built on VS Code's CSS custom properties, ensuring automatic adaptation to any VS Code theme.

#### Primary UI Colors

```css
/* Button colors */
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-button-secondaryBackground
--vscode-button-secondaryForeground
--vscode-button-secondaryHoverBackground

/* Input colors */
--vscode-input-background
--vscode-input-foreground
--vscode-input-border
--vscode-input-placeholderForeground

/* Panel colors */
--vscode-panel-background
--vscode-panel-border

/* Text colors */
--vscode-foreground
--vscode-descriptionForeground
```

#### State Colors

```css
/* Semantic state colors */
--vscode-errorForeground
--vscode-warningForeground
--vscode-infoForeground
--vscode-testing-iconPassed (success)

/* Interactive colors */
--vscode-list-hoverBackground
--vscode-list-activeSelectionBackground
--vscode-focusBorder
```

### Semantic Color Mapping

We map VS Code variables to semantic tokens for consistent usage:

```javascript
// tailwind.config.js color mapping
colors: {
  // Primary semantic colors
  'primary': 'var(--vscode-button-background)',
  'primary-foreground': 'var(--vscode-button-foreground)',
  'primary-hover': 'var(--vscode-button-hoverBackground)',
  
  'secondary': 'var(--vscode-button-secondaryBackground)',
  'secondary-foreground': 'var(--vscode-button-secondaryForeground)',
  'secondary-hover': 'var(--vscode-button-secondaryHoverBackground)',
  
  // Base colors
  'background': 'var(--vscode-editor-background)',
  'foreground': 'var(--vscode-foreground)',
  'muted': 'var(--vscode-panel-background)',
  'muted-foreground': 'var(--vscode-descriptionForeground)',
  'border': 'var(--vscode-panel-border)',
  
  // State colors
  'error': 'var(--vscode-errorForeground)',
  'warning': 'var(--vscode-warningForeground)',
  'info': 'var(--vscode-infoForeground)',
  'success': 'var(--vscode-testing-iconPassed)',
}
```

### Color Usage Guidelines

#### Text Colors

```html
<!-- Primary text -->
<p class="text-vscode-foreground">Primary content</p>
<p class="text-foreground">Semantic equivalent</p>

<!-- Secondary text -->
<p class="text-vscode-muted">Secondary content</p>
<p class="text-muted-foreground">Semantic equivalent</p>

<!-- State colors -->
<p class="text-vscode-error">Error message</p>
<p class="text-vscode-warning">Warning message</p>
<p class="text-vscode-info">Info message</p>
<p class="text-vscode-success">Success message</p>
```

#### Background Colors

```html
<!-- Panel backgrounds -->
<div class="bg-vscode-panel-background">Panel content</div>
<div class="bg-muted">Semantic equivalent</div>

<!-- Interactive backgrounds -->
<div class="bg-primary text-primary-foreground">Primary action</div>
<div class="bg-secondary text-secondary-foreground">Secondary action</div>

<!-- State backgrounds -->
<div class="bg-vscode-error text-white">Error background</div>
<div class="bg-vscode-warning text-white">Warning background</div>
```

### Theme Adaptation Examples

```html
<!-- Light theme: Light background, dark text -->
<!-- Dark theme: Dark background, light text -->
<!-- High contrast: Maximum contrast maintained -->
<div class="bg-background text-foreground border border-border">
  Automatically adapts to all VS Code themes
</div>
```

## 📐 Spacing System

### VS Code Spacing Scale

Our spacing system is designed to match VS Code's interface spacing:

```javascript
// tailwind.config.js spacing scale
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
}
```

### Spacing Usage Guidelines

#### Component-level Spacing

```html
<!-- Card padding -->
<div class="card-vscode p-vscode-lg">
  <!-- 16px padding -->
</div>

<!-- Section spacing -->
<section class="space-y-vscode-md">
  <!-- 12px vertical spacing between children -->
</section>
```

#### Layout Spacing

```html
<!-- Grid gaps -->
<div class="grid gap-vscode-md">
  <!-- 12px gap between grid items -->
</div>

<!-- Flex gaps -->
<div class="flex gap-vscode-sm">
  <!-- 8px gap between flex items -->
</div>
```

### Spacing Hierarchy

| Token | Value | Use Case |
|-------|-------|----------|
| `vscode-xs` | 4px | Fine details, borders |
| `vscode-sm` | 8px | Small components, icons |
| `vscode-md` | 12px | Default component spacing |
| `vscode-lg` | 16px | Section spacing, padding |
| `vscode-xl` | 24px | Layout spacing |
| `vscode-2xl` | 32px | Major layout gaps |
| `vscode-3xl` | 48px | Page-level spacing |

## 🔤 Typography System

### Font Families

```javascript
// tailwind.config.js font families
fontFamily: {
  'vscode': [
    'var(--vscode-font-family)', 
    'var(--vscode-editor-font-family)', 
    'Segoe UI', 
    'system-ui', 
    'sans-serif'
  ],
  'vscode-mono': [
    'var(--vscode-editor-font-family)', 
    'Consolas', 
    'Monaco', 
    'monospace'
  ],
}
```

### Font Size Scale

```javascript
// tailwind.config.js font sizes
fontSize: {
  'vscode-xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
  'vscode-sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  'vscode': ['var(--vscode-font-size)', { lineHeight: '1.5' }], // Dynamic
  'vscode-base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
  'vscode-lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  'vscode-xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  'vscode-2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
}
```

### Typography Usage Guidelines

#### Text Hierarchy

```html
<!-- Headings -->
<h1 class="text-vscode-2xl font-semibold">Main Heading</h1>
<h2 class="text-vscode-xl font-semibold">Section Heading</h2>
<h3 class="text-vscode-lg font-medium">Subsection</h3>

<!-- Body text -->
<p class="text-vscode">Default body text</p>
<p class="text-vscode-sm">Small text</p>
<small class="text-vscode-xs">Fine print</small>

<!-- Code -->
<code class="font-vscode-mono text-vscode-sm">Monospace text</code>
```

#### Font Weight Guidelines

```html
<!-- Headings: semibold (600) or medium (500) -->
<h2 class="text-vscode-xl font-semibold">Important Heading</h2>
<h3 class="text-vscode-lg font-medium">Section Title</h3>

<!-- UI elements: medium (500) -->
<button class="btn-vscode font-medium">Button Text</button>
<label class="text-vscode-sm font-medium">Form Label</label>

<!-- Body text: normal (400) -->
<p class="text-vscode font-normal">Regular text</p>
```

## 📏 Border Radius System

```javascript
// tailwind.config.js border radius
borderRadius: {
  'vscode': '3px',      // VS Code standard
  'vscode-sm': '2px',   // Small elements
  'vscode-lg': '6px',   // Cards and panels
  'vscode-xl': '8px',   // Large containers
}
```

### Border Radius Usage

```html
<!-- Buttons and small elements -->
<button class="btn-vscode rounded-vscode">Button</button>

<!-- Cards and panels -->
<div class="card-vscode rounded-vscode-lg">Card content</div>

<!-- Large containers -->
<div class="panel-vscode rounded-vscode-xl">Panel content</div>
```

## 🌟 Shadow System

```javascript
// tailwind.config.js box shadows
boxShadow: {
  'vscode': 'var(--vscode-widget-shadow)',
  'vscode-sm': '0 1px 3px var(--vscode-widget-shadow)',
  'vscode-md': '0 2px 8px var(--vscode-widget-shadow)',
  'vscode-lg': '0 4px 16px var(--vscode-widget-shadow)',
  'vscode-xl': '0 8px 32px var(--vscode-widget-shadow)',
}
```

### Shadow Usage Guidelines

```html
<!-- Cards with subtle elevation -->
<div class="card-vscode shadow-vscode-sm">Subtle shadow</div>

<!-- Modals and overlays -->
<div class="panel-vscode shadow-vscode-lg">Prominent shadow</div>

<!-- Tooltips and popovers -->
<div class="bg-background shadow-vscode-md">Medium shadow</div>
```

## 📱 Breakpoint System

### VS Code Specific Breakpoints

```javascript
// tailwind.config.js screens
screens: {
  'vscode-sm': '576px',   // Small webview panels
  'vscode-md': '768px',   // Medium webview panels  
  'vscode-lg': '1024px',  // Large webview panels
  'vscode-xl': '1280px',  // Extra large webview panels
}
```

### Breakpoint Usage

```html
<!-- Responsive grid -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3">
  Content
</div>

<!-- Responsive flex direction -->
<div class="flex flex-col vscode-sm:flex-row">
  Content
</div>
```

### Responsive Design Principles

1. **Mobile-first**: Start with mobile styles, enhance for larger screens
2. **Progressive enhancement**: Add features as screen size increases
3. **Touch-friendly**: Ensure adequate touch targets on mobile
4. **Content priority**: Most important content visible at all sizes

## 🎬 Animation Tokens

### Duration Scale

```javascript
// tailwind.config.js transition duration
transitionDuration: {
  'vscode': '200ms',      // Standard VS Code timing
  'vscode-fast': '100ms', // Quick interactions
  'vscode-slow': '300ms', // Deliberate animations
}
```

### Custom Animations

```javascript
// tailwind.config.js animations
animation: {
  'vscode-fade-in': 'fadeIn 200ms ease-in-out',
  'vscode-slide-in': 'slideIn 200ms ease-out',
  'vscode-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}

keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  slideIn: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
}
```

### Animation Usage

```html
<!-- Fade in content -->
<div class="animate-vscode-fade-in">Fading content</div>

<!-- Slide in notifications -->
<div class="animate-vscode-slide-in">Sliding notification</div>

<!-- Loading indicators -->
<div class="animate-vscode-pulse">Pulsing loader</div>
```

## 🏗️ Max Width System

```javascript
// tailwind.config.js max widths
maxWidth: {
  'vscode-sm': '20rem',   // 320px
  'vscode-md': '28rem',   // 448px
  'vscode-lg': '32rem',   // 512px
  'vscode-xl': '36rem',   // 576px
  'vscode-2xl': '42rem',  // 672px
  'vscode-3xl': '48rem',  // 768px
}
```

### Container Sizing

```html
<!-- Form containers -->
<form class="max-w-vscode-lg mx-auto">
  Form content
</form>

<!-- Content cards -->
<div class="card-vscode max-w-vscode-md">
  Card content
</div>

<!-- Reading width -->
<article class="max-w-vscode-2xl">
  Article content
</article>
```

## 🎯 Token Usage Best Practices

### Do's ✅

- Use semantic tokens (`primary`, `secondary`) over specific VS Code variables
- Maintain consistent spacing hierarchy throughout the application
- Test typography across different VS Code themes
- Use appropriate shadow levels for elevation
- Follow mobile-first responsive principles

### Don'ts ❌

- Don't use hard-coded values that don't scale
- Don't mix standard Tailwind tokens with VS Code tokens
- Don't ignore the spacing hierarchy
- Don't use excessive shadow or animation
- Don't forget to test responsive breakpoints

### Design Token Checklist

When designing new components:

- [ ] Uses semantic color tokens
- [ ] Follows VS Code spacing scale
- [ ] Implements proper typography hierarchy
- [ ] Includes appropriate responsive breakpoints
- [ ] Uses VS Code-specific border radius
- [ ] Applies consistent shadow elevation
- [ ] Implements accessible focus indicators

## 🔧 Extending Design Tokens

### Adding New Tokens

To add new design tokens, extend the Tailwind configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add new semantic colors
        'accent': 'var(--vscode-charts-blue)',
        'accent-foreground': 'white',
      },
      spacing: {
        // Add new spacing values
        'vscode-6xl': '8rem', // 128px
      },
      fontSize: {
        // Add new font sizes
        'vscode-3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      },
    },
  },
}
```

### Custom CSS Properties

For dynamic values, use CSS custom properties:

```css
/* In vscode-theme.scss */
:root {
  --custom-spacing: calc(var(--vscode-font-size) * 1.5);
  --custom-radius: calc(var(--vscode-font-size) * 0.25);
}
```

```html
<!-- Use in components -->
<div style="padding: var(--custom-spacing); border-radius: var(--custom-radius);">
  Dynamic sizing based on VS Code font size
</div>
```

---

**Last Updated**: August 31, 2025
**Token System Version**: 1.0.0
**Total Tokens**: 50+ design tokens across 7 categories