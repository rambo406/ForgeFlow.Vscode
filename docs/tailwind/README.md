# Tailwind CSS Component Library Documentation

This documentation provides comprehensive information about the Tailwind CSS-based component library for the Azure DevOps PR Code Reviewer VS Code extension.

## 📚 Documentation Structure

### Getting Started
- [Getting Started Guide](./getting-started.md) - Setup and basic usage
- [Developer Onboarding](./developer-onboarding.md) - New developer guide

### Component Library
- [Component Reference](./component-reference.md) - Complete component catalog
- [VS Code Plugin](./vscode-plugin.md) - Custom VS Code component classes
- [SpartanNG Integration](./spartanng-integration.md) - SpartanNG component overrides

### Design System
- [Design Tokens](./design-tokens.md) - Colors, spacing, typography
- [Theme Integration](./theme-integration.md) - VS Code theme system
- [Responsive Design](./responsive-design.md) - Breakpoints and mobile-first approach

### Development
- [Utility Guidelines](./utility-guidelines.md) - Best practices for using Tailwind utilities
- [Migration Patterns](./migration-patterns.md) - Patterns for future migrations
- [Build Configuration](./build-configuration.md) - Webpack and build system setup

## 🎯 Quick Start

### Basic Usage
```html
<!-- VS Code themed button -->
<button class="btn-vscode">Primary Action</button>

<!-- Secondary button -->
<button class="btn-vscode-secondary">Secondary Action</button>

<!-- Input field -->
<input class="input-vscode" placeholder="Enter text..." />

<!-- Card container -->
<div class="card-vscode">
  <h3 class="text-vscode-lg font-medium">Card Title</h3>
  <p class="text-vscode-sm text-vscode-muted">Card content</p>
</div>
```

### Responsive Layout
```html
<!-- Mobile-first responsive grid -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3 gap-vscode-md">
  <div class="card-vscode">Item 1</div>
  <div class="card-vscode">Item 2</div>
  <div class="card-vscode">Item 3</div>
</div>
```

### Theme Integration
```html
<!-- Semantic colors that adapt to VS Code themes -->
<div class="text-vscode-error">Error message</div>
<div class="text-vscode-warning">Warning message</div>
<div class="text-vscode-success">Success message</div>
<div class="bg-primary text-primary-foreground p-vscode-md rounded-vscode">
  Primary themed content
</div>
```

## 🎨 Key Features

### VS Code Theme Integration
- Automatic adaptation to light, dark, and high-contrast themes
- Semantic color system that respects user preferences
- CSS custom properties for dynamic theme switching

### Component Classes
- `.btn-vscode` - Primary button styling
- `.btn-vscode-secondary` - Secondary button variant
- `.input-vscode` - Form input styling
- `.card-vscode` - Card container with proper shadows
- `.panel-vscode` - Basic panel container

### Responsive Design
- Mobile-first approach with VS Code-specific breakpoints
- Touch-friendly interfaces on mobile devices
- Optimized for webview panel constraints

### Performance Optimizations
- CSS purging for production builds
- Optimized utility generation
- Minimal bundle size impact

## 📖 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [SpartanNG Components](https://www.spartan.ng/)

## 🤝 Contributing

When contributing to the component library:

1. Follow the utility-first approach
2. Use semantic VS Code color tokens
3. Ensure accessibility compliance
4. Test across all VS Code themes
5. Document new patterns and components

## 🔄 Migration Guide

For migrating from the previous CSS system:

1. Replace custom CSS classes with Tailwind utilities
2. Use VS Code component classes for common patterns
3. Implement responsive design with VS Code breakpoints
4. Validate theme integration across all VS Code themes

---

**Last Updated**: August 31, 2025
**Version**: 1.0.0