# Getting Started with Tailwind CSS

This guide will help you get started with the Tailwind CSS component library for the Azure DevOps PR Code Reviewer extension.

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+
- VS Code extension development environment
- Basic understanding of Tailwind CSS

### Installation
The Tailwind CSS system is already configured in the project. No additional installation is required.

### File Structure
```
src/webview-angular-v2/
├── tailwind.config.js          # Tailwind configuration
├── src/styles/
│   ├── globals.scss            # Global styles and Tailwind imports
│   ├── vscode-theme.scss       # VS Code theme integration
│   └── tailwind-vscode-plugin.js # Custom VS Code component plugin
└── libs/ui/                    # Component library
```

## 🎯 Basic Usage

### 1. VS Code Component Classes

Use pre-built component classes for common VS Code patterns:

```html
<!-- Buttons -->
<button class="btn-vscode">Primary Button</button>
<button class="btn-vscode-secondary">Secondary Button</button>
<button class="btn-vscode-ghost">Ghost Button</button>

<!-- Form inputs -->
<input class="input-vscode" type="text" placeholder="Enter text">
<input class="input-vscode input-vscode-error" type="text"> <!-- Error state -->

<!-- Containers -->
<div class="card-vscode">Card content</div>
<div class="panel-vscode">Panel content</div>
```

### 2. VS Code Color System

Use semantic colors that automatically adapt to VS Code themes:

```html
<!-- Text colors -->
<p class="text-vscode-error">Error message</p>
<p class="text-vscode-warning">Warning message</p>
<p class="text-vscode-info">Info message</p>
<p class="text-vscode-success">Success message</p>
<p class="text-vscode-muted">Muted text</p>

<!-- Background colors -->
<div class="bg-primary text-primary-foreground">Primary background</div>
<div class="bg-secondary text-secondary-foreground">Secondary background</div>

<!-- Utility colors -->
<div class="bg-vscode-error text-white">Error background</div>
<div class="border-vscode-panel-border">Panel border</div>
```

### 3. VS Code Spacing System

Use VS Code-specific spacing utilities:

```html
<!-- Padding -->
<div class="p-vscode-xs">Extra small padding (4px)</div>
<div class="p-vscode-sm">Small padding (8px)</div>
<div class="p-vscode-md">Medium padding (12px)</div>
<div class="p-vscode-lg">Large padding (16px)</div>
<div class="p-vscode-xl">Extra large padding (24px)</div>

<!-- Margins -->
<div class="m-vscode-md">Medium margin</div>
<div class="space-y-vscode-sm">Small vertical spacing between children</div>

<!-- Gaps in flexbox/grid -->
<div class="flex gap-vscode-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### 4. Typography

Use VS Code typography utilities:

```html
<!-- Font sizes -->
<h1 class="text-vscode-xl font-semibold">Large heading</h1>
<h2 class="text-vscode-lg font-medium">Medium heading</h2>
<p class="text-vscode">Default text</p>
<small class="text-vscode-sm">Small text</small>
<span class="text-vscode-xs">Extra small text</span>

<!-- Font families -->
<p class="font-vscode">VS Code system font</p>
<code class="font-vscode-mono">Monospace font</code>
```

## 📱 Responsive Design

### VS Code Breakpoints

Use VS Code-specific responsive breakpoints:

```html
<!-- Grid responsive layout -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3">
  <div class="card-vscode">Card 1</div>
  <div class="card-vscode">Card 2</div>
  <div class="card-vscode">Card 3</div>
</div>

<!-- Responsive flex layout -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-md">
  <div class="flex-1">Content 1</div>
  <div class="flex-1">Content 2</div>
</div>

<!-- Responsive visibility -->
<div class="hidden vscode-md:block">Hidden on small screens</div>
<div class="block vscode-md:hidden">Visible only on small screens</div>
```

### Breakpoint Reference
- `vscode-sm`: 576px+ (Small webview panels)
- `vscode-md`: 768px+ (Medium webview panels)
- `vscode-lg`: 1024px+ (Large webview panels)
- `vscode-xl`: 1280px+ (Extra large webview panels)

## 🎨 Common Patterns

### 1. Dashboard Layout
```html
<div class="grid grid-cols-1 vscode-lg:grid-cols-4 gap-vscode-lg h-full">
  <!-- Sidebar -->
  <div class="vscode-lg:col-span-1">
    <div class="panel-vscode h-full">
      <h2 class="text-vscode-lg font-medium mb-vscode-md">Navigation</h2>
      <!-- Navigation content -->
    </div>
  </div>
  
  <!-- Main content -->
  <div class="vscode-lg:col-span-3">
    <div class="space-y-vscode-lg">
      <!-- Content cards -->
    </div>
  </div>
</div>
```

### 2. Comment Card
```html
<div class="card-vscode space-y-vscode-sm">
  <!-- Header -->
  <div class="flex flex-col vscode-sm:flex-row vscode-sm:items-center vscode-sm:justify-between">
    <h3 class="text-vscode-lg font-medium">Comment Title</h3>
    <div class="flex gap-vscode-xs mt-vscode-xs vscode-sm:mt-0">
      <button class="btn-vscode-secondary text-vscode-xs">Edit</button>
      <button class="btn-vscode text-vscode-xs">Approve</button>
    </div>
  </div>
  
  <!-- Content -->
  <div class="text-vscode-sm text-vscode-muted">
    Comment content goes here...
  </div>
  
  <!-- Footer -->
  <div class="pt-vscode-sm border-t border-vscode-panel-border">
    <div class="flex items-center gap-vscode-sm text-vscode-xs text-vscode-muted">
      <span>Line 42</span>
      <span>•</span>
      <span>src/component.ts</span>
    </div>
  </div>
</div>
```

### 3. Form Layout
```html
<form class="space-y-vscode-md">
  <div class="space-y-vscode-sm">
    <label class="block text-vscode-sm font-medium text-vscode-foreground">
      Organization URL
    </label>
    <input class="input-vscode w-full" 
           type="url" 
           placeholder="https://dev.azure.com/your-org">
    <p class="text-vscode-xs text-vscode-muted">
      Enter your Azure DevOps organization URL
    </p>
  </div>
  
  <div class="space-y-vscode-sm">
    <label class="block text-vscode-sm font-medium text-vscode-foreground">
      Personal Access Token
    </label>
    <input class="input-vscode w-full" 
           type="password" 
           placeholder="Enter your PAT">
    <p class="text-vscode-xs text-vscode-error">
      Token must have Code (read) and Pull Request (read & write) permissions
    </p>
  </div>
  
  <div class="flex flex-col vscode-sm:flex-row gap-vscode-sm">
    <button type="submit" class="btn-vscode flex-1 vscode-sm:flex-none">
      Save Configuration
    </button>
    <button type="button" class="btn-vscode-secondary flex-1 vscode-sm:flex-none">
      Test Connection
    </button>
  </div>
</form>
```

## 🔧 Development Tips

### 1. Theme Testing
Always test your components across all VS Code themes:
```bash
# Run the theme testing script
./scripts/theme-testing.sh
```

### 2. Responsive Testing
Use VS Code's responsive testing:
- Resize the webview panel to test different breakpoints
- Test on mobile devices using browser dev tools
- Verify touch interactions work properly

### 3. Accessibility
Ensure your components are accessible:
```html
<!-- Use proper focus indicators -->
<button class="btn-vscode focus-vscode">Accessible Button</button>

<!-- Provide proper labels -->
<label for="search" class="sr-only">Search</label>
<input id="search" class="input-vscode" type="search">

<!-- Use semantic colors for state -->
<div class="text-vscode-error" role="alert">
  Error message for screen readers
</div>
```

### 4. Performance
- Use utility classes instead of custom CSS
- Leverage Tailwind's CSS purging for production builds
- Avoid deep nesting of utility classes

## 🐛 Troubleshooting

### Common Issues

**Classes not applying**
- Ensure the file is included in Tailwind's content paths
- Check that the class name is spelled correctly
- Verify the class exists in the generated CSS

**Theme colors not working**
- Make sure you're using CSS custom properties correctly
- Check that the VS Code theme variables are available
- Test in different VS Code themes

**Responsive breakpoints not working**
- Use the correct VS Code breakpoint prefixes (`vscode-sm:`, etc.)
- Ensure you're following mobile-first principles
- Test in the actual webview environment

### Getting Help
- Check the [Component Reference](./component-reference.md)
- Review [Migration Patterns](./migration-patterns.md)
- Test with the theme testing script

## 📚 Next Steps

1. [Component Reference](./component-reference.md) - Explore all available components
2. [Design Tokens](./design-tokens.md) - Understand the design system
3. [Utility Guidelines](./utility-guidelines.md) - Learn best practices
4. [Migration Patterns](./migration-patterns.md) - Migration strategies

---

**Last Updated**: August 31, 2025