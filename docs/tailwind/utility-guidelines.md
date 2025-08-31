# Utility Guidelines

This document provides best practices and guidelines for using Tailwind CSS utilities in the Azure DevOps PR Code Reviewer extension.

## 🎯 Utility-First Philosophy

The extension follows Tailwind's utility-first approach, prioritizing utility classes over custom CSS for maintainability and consistency.

### Core Principles

1. **Utility-First**: Use utility classes instead of writing custom CSS
2. **Composition**: Combine utilities to create complex designs
3. **Consistency**: Use the VS Code design system tokens
4. **Responsive**: Mobile-first responsive design with VS Code breakpoints
5. **Accessible**: Ensure all utilities maintain accessibility standards

## 🎨 Color Utilities

### VS Code Theme Colors

Always use VS Code theme-aware colors that adapt to different themes:

```html
<!-- ✅ Good: Uses theme-aware colors -->
<div class="text-vscode-foreground bg-vscode-panel-background">
  Theme-aware content
</div>

<!-- ❌ Avoid: Hard-coded colors that don't adapt to themes -->
<div class="text-gray-900 bg-white">
  Hard-coded colors
</div>
```

### Semantic Colors

Use semantic color utilities for consistent meaning across the application:

```html
<!-- State colors -->
<div class="text-vscode-error">Error message</div>
<div class="text-vscode-warning">Warning message</div>
<div class="text-vscode-info">Information message</div>
<div class="text-vscode-success">Success message</div>

<!-- Contextual colors -->
<div class="text-vscode-muted">Secondary text</div>
<div class="text-primary-foreground bg-primary">Primary action</div>
```

### Color Combination Guidelines

```html
<!-- ✅ Good: Proper contrast combinations -->
<button class="bg-primary text-primary-foreground">
  High contrast button
</button>

<div class="bg-vscode-panel-background text-vscode-foreground border border-vscode-panel-border">
  Proper panel styling
</div>

<!-- ❌ Avoid: Poor contrast combinations -->
<button class="bg-yellow-200 text-yellow-300">
  Poor contrast
</button>
```

## 📐 Spacing Guidelines

### VS Code Spacing Scale

Use the VS Code spacing scale for consistent spacing throughout the application:

```html
<!-- ✅ Good: VS Code spacing scale -->
<div class="p-vscode-md space-y-vscode-sm">
  <h2 class="mb-vscode-sm">Title</h2>
  <p class="mb-vscode-md">Content</p>
</div>

<!-- ❌ Avoid: Standard Tailwind spacing that doesn't match VS Code -->
<div class="p-4 space-y-2">
  <h2 class="mb-2">Title</h2>
  <p class="mb-4">Content</p>
</div>
```

### Spacing Hierarchy

Follow a consistent spacing hierarchy:

```html
<!-- Component-level spacing -->
<div class="card-vscode space-y-vscode-md">
  
  <!-- Section-level spacing -->
  <section class="space-y-vscode-sm">
    <h3 class="text-vscode-lg font-medium">Section Title</h3>
    
    <!-- Element-level spacing -->
    <div class="flex items-center gap-vscode-xs">
      <span>Item 1</span>
      <span>Item 2</span>
    </div>
  </section>
  
</div>
```

### Responsive Spacing

Use responsive spacing for different screen sizes:

```html
<!-- Responsive padding -->
<div class="p-vscode-sm vscode-md:p-vscode-lg">
  Responsive padding
</div>

<!-- Responsive gaps -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-sm vscode-md:gap-vscode-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 🔤 Typography Guidelines

### Font Size Hierarchy

Use the VS Code typography scale for consistent text sizing:

```html
<!-- ✅ Good: VS Code typography scale -->
<h1 class="text-vscode-xl font-semibold">Main Heading</h1>
<h2 class="text-vscode-lg font-medium">Section Heading</h2>
<h3 class="text-vscode font-medium">Subsection</h3>
<p class="text-vscode">Body text</p>
<small class="text-vscode-sm">Small text</small>
<span class="text-vscode-xs">Fine print</span>
```

### Font Weight Guidelines

Use appropriate font weights for hierarchy:

```html
<!-- Headings -->
<h1 class="text-vscode-xl font-semibold">Primary heading</h1>
<h2 class="text-vscode-lg font-medium">Secondary heading</h2>
<h3 class="text-vscode font-medium">Tertiary heading</h3>

<!-- Body text -->
<p class="text-vscode font-normal">Regular body text</p>
<p class="text-vscode font-medium">Emphasized text</p>

<!-- UI elements -->
<button class="btn-vscode font-medium">Button text</button>
<label class="text-vscode-sm font-medium">Form label</label>
```

### Typography Combinations

```html
<!-- Card with proper typography hierarchy -->
<div class="card-vscode space-y-vscode-sm">
  <h3 class="text-vscode-lg font-medium text-vscode-foreground">
    Card Title
  </h3>
  <p class="text-vscode text-vscode-muted">
    Card description with proper contrast
  </p>
  <div class="text-vscode-xs text-vscode-muted">
    Metadata information
  </div>
</div>
```

## 📱 Responsive Design Guidelines

### Mobile-First Approach

Always start with mobile styles and enhance for larger screens:

```html
<!-- ✅ Good: Mobile-first responsive design -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3">
  <div class="card-vscode">Item 1</div>
  <div class="card-vscode">Item 2</div>
  <div class="card-vscode">Item 3</div>
</div>

<!-- Button group responsive layout -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-sm">
  <button class="btn-vscode w-full vscode-sm:w-auto">Primary</button>
  <button class="btn-vscode-secondary w-full vscode-sm:w-auto">Secondary</button>
</div>
```

### VS Code Breakpoints

Use VS Code-specific breakpoints designed for webview constraints:

```html
<!-- Navigation responsive behavior -->
<nav class="flex flex-col vscode-lg:flex-row vscode-lg:items-center gap-vscode-md">
  <div class="flex-1">
    <h1 class="text-vscode-lg font-medium">Application Title</h1>
  </div>
  <div class="flex flex-col vscode-sm:flex-row gap-vscode-sm">
    <button class="btn-vscode">Action 1</button>
    <button class="btn-vscode-secondary">Action 2</button>
  </div>
</nav>
```

### Content Responsive Patterns

```html
<!-- Responsive content layout -->
<article class="space-y-vscode-md">
  <!-- Header responsive -->
  <header class="flex flex-col vscode-sm:flex-row vscode-sm:items-center vscode-sm:justify-between gap-vscode-sm">
    <h1 class="text-vscode-xl font-semibold">Article Title</h1>
    <div class="flex gap-vscode-xs">
      <button class="btn-vscode-secondary text-vscode-sm">Edit</button>
      <button class="btn-vscode text-vscode-sm">Publish</button>
    </div>
  </header>
  
  <!-- Content responsive -->
  <div class="grid grid-cols-1 vscode-lg:grid-cols-3 gap-vscode-lg">
    <main class="vscode-lg:col-span-2">
      <!-- Main content -->
    </main>
    <aside class="vscode-lg:col-span-1">
      <!-- Sidebar content -->
    </aside>
  </div>
</article>
```

## 🎛️ Layout Guidelines

### Flexbox Patterns

Use flexbox for component-level layouts:

```html
<!-- Header with flex alignment -->
<header class="flex items-center justify-between p-vscode-md">
  <h1 class="text-vscode-lg font-medium">Title</h1>
  <div class="flex items-center gap-vscode-sm">
    <button class="btn-vscode-secondary">Action 1</button>
    <button class="btn-vscode">Action 2</button>
  </div>
</header>

<!-- Card with flex content -->
<div class="card-vscode">
  <div class="flex items-start gap-vscode-md">
    <div class="flex-shrink-0">
      <i class="codicon codicon-info text-vscode-info"></i>
    </div>
    <div class="flex-1 space-y-vscode-sm">
      <h3 class="font-medium">Information</h3>
      <p class="text-vscode-sm text-vscode-muted">Description</p>
    </div>
  </div>
</div>
```

### Grid Patterns

Use CSS Grid for page-level layouts:

```html
<!-- Dashboard grid layout -->
<div class="min-h-screen grid grid-rows-[auto_1fr] gap-vscode-lg">
  <!-- Header -->
  <header class="border-b border-vscode-panel-border p-vscode-md">
    <h1 class="text-vscode-xl font-semibold">Dashboard</h1>
  </header>
  
  <!-- Main content grid -->
  <main class="grid grid-cols-1 vscode-lg:grid-cols-4 gap-vscode-lg p-vscode-md">
    <aside class="vscode-lg:col-span-1">
      <div class="panel-vscode sticky top-vscode-lg">
        <!-- Sidebar content -->
      </div>
    </aside>
    <section class="vscode-lg:col-span-3 space-y-vscode-lg">
      <!-- Main content -->
    </section>
  </main>
</div>
```

## 🎯 Component Composition

### Button Combinations

```html
<!-- Button group with proper spacing -->
<div class="flex items-center gap-vscode-sm">
  <button class="btn-vscode">Primary Action</button>
  <button class="btn-vscode-secondary">Secondary</button>
  <button class="btn-vscode-ghost">
    <i class="codicon codicon-gear"></i>
  </button>
</div>

<!-- Responsive button group -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-sm">
  <button class="btn-vscode flex-1 vscode-sm:flex-none">
    <i class="codicon codicon-play mr-vscode-xs"></i>
    Run Analysis
  </button>
  <button class="btn-vscode-secondary flex-1 vscode-sm:flex-none">
    Cancel
  </button>
</div>
```

### Form Composition

```html
<!-- Form with proper composition -->
<form class="space-y-vscode-md max-w-vscode-lg">
  <!-- Form field composition -->
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
  
  <!-- Error state composition -->
  <div class="space-y-vscode-sm">
    <label class="block text-vscode-sm font-medium text-vscode-foreground">
      Access Token
    </label>
    <input class="input-vscode input-vscode-error w-full" 
           type="password" 
           aria-describedby="token-error">
    <p id="token-error" class="text-vscode-xs text-vscode-error" role="alert">
      Personal Access Token is required
    </p>
  </div>
  
  <!-- Form actions -->
  <div class="flex justify-end gap-vscode-sm pt-vscode-md border-t border-vscode-panel-border">
    <button type="button" class="btn-vscode-secondary">Cancel</button>
    <button type="submit" class="btn-vscode">Save Configuration</button>
  </div>
</form>
```

## ♿ Accessibility Guidelines

### Focus Management

Ensure proper focus indicators using the `focus-vscode` utility:

```html
<!-- Custom focusable elements -->
<div tabindex="0" class="focus-vscode p-vscode-md rounded-vscode">
  Custom focusable content
</div>

<!-- Button with enhanced focus -->
<button class="btn-vscode focus-vscode">
  Enhanced Focus Button
</button>
```

### Screen Reader Support

Use semantic HTML with proper utility combinations:

```html
<!-- Error message with proper ARIA -->
<div class="space-y-vscode-sm">
  <label for="email-input" class="block text-vscode-sm font-medium">
    Email Address
  </label>
  <input id="email-input" 
         class="input-vscode input-vscode-error w-full" 
         type="email"
         aria-describedby="email-error"
         aria-invalid="true">
  <div id="email-error" 
       class="text-vscode-xs text-vscode-error" 
       role="alert">
    Please enter a valid email address
  </div>
</div>

<!-- Status indicator with screen reader text -->
<div class="flex items-center gap-vscode-xs">
  <i class="codicon codicon-check text-vscode-success" aria-hidden="true"></i>
  <span class="sr-only">Success: </span>
  <span class="text-vscode-sm">Configuration saved successfully</span>
</div>
```

### Color Contrast

Always use high-contrast color combinations:

```html
<!-- ✅ Good: High contrast combinations -->
<div class="bg-primary text-primary-foreground p-vscode-md">
  High contrast content
</div>

<div class="bg-vscode-panel-background text-vscode-foreground border border-vscode-panel-border">
  Theme-aware high contrast
</div>

<!-- ❌ Avoid: Low contrast combinations -->
<div class="bg-gray-100 text-gray-300">
  Low contrast content
</div>
```

## 🚀 Performance Guidelines

### Utility Class Optimization

```html
<!-- ✅ Good: Efficient utility usage -->
<div class="space-y-vscode-md">
  <div class="card-vscode">Card 1</div>
  <div class="card-vscode">Card 2</div>
</div>

<!-- ❌ Avoid: Excessive utility repetition -->
<div>
  <div class="bg-vscode-panel-background border border-vscode-panel-border rounded-lg p-vscode-md shadow-sm mb-vscode-md">Card 1</div>
  <div class="bg-vscode-panel-background border border-vscode-panel-border rounded-lg p-vscode-md shadow-sm mb-vscode-md">Card 2</div>
</div>
```

### Component Class Usage

Use component classes for repeated patterns:

```html
<!-- ✅ Good: Use component classes for common patterns -->
<button class="btn-vscode">Button 1</button>
<button class="btn-vscode">Button 2</button>

<!-- ❌ Avoid: Recreating component styles with utilities -->
<button class="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md">
  Button 1
</button>
```

## 🔧 Development Workflow

### Class Organization

Organize utility classes in a logical order:

```html
<!-- Layout utilities first -->
<div class="flex items-center justify-between
            <!-- Spacing utilities -->
            p-vscode-md gap-vscode-sm
            <!-- Visual utilities -->
            bg-vscode-panel-background border border-vscode-panel-border rounded-vscode
            <!-- Typography utilities -->
            text-vscode-foreground">
  Content
</div>
```

### Conditional Classes

Use conditional classes for dynamic styling:

```html
<!-- Angular conditional classes -->
<div [class]="'card-vscode ' + (isActive ? 'border-primary' : 'border-vscode-panel-border')">
  Dynamic card
</div>

<!-- Class binding -->
<button class="btn-vscode"
        [class.opacity-50]="isLoading"
        [class.pointer-events-none]="isLoading">
  {{ isLoading ? 'Loading...' : 'Submit' }}
</button>
```

## 📚 Best Practices Summary

### Do's ✅

- Use VS Code design system tokens (colors, spacing, typography)
- Follow mobile-first responsive design principles
- Use component classes for common patterns
- Combine utilities logically and consistently
- Test across all VS Code themes
- Ensure proper accessibility with focus indicators
- Use semantic HTML with utility styling

### Don'ts ❌

- Don't use hard-coded colors that don't adapt to themes
- Don't recreate component patterns with utilities
- Don't ignore responsive design considerations
- Don't skip accessibility requirements
- Don't use excessive utility class combinations
- Don't mix standard Tailwind spacing with VS Code spacing

### Testing Checklist

1. **Theme Testing**: Test in light, dark, and high-contrast themes
2. **Responsive Testing**: Test across all VS Code breakpoints
3. **Accessibility Testing**: Verify keyboard navigation and screen reader support
4. **Performance Testing**: Check for excessive CSS generation
5. **Visual Testing**: Ensure consistent spacing and typography

---

**Last Updated**: August 31, 2025
**Guidelines Version**: 1.0.0