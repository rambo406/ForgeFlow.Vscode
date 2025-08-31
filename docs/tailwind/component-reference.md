# Component Reference

This document provides a comprehensive reference for all Tailwind CSS components and utilities available in the Azure DevOps PR Code Reviewer extension.

## 🔘 Button Components

### `.btn-vscode` - Primary Button

The main action button using VS Code's primary button styling.

```html
<button class="btn-vscode">Primary Action</button>
<button class="btn-vscode" disabled>Disabled Primary</button>
```

**Properties:**
- Background: `var(--vscode-button-background)`
- Color: `var(--vscode-button-foreground)`
- Hover: `var(--vscode-button-hoverBackground)`
- Focus: 2px outline with `var(--vscode-focusBorder)`
- Disabled: 50% opacity, no pointer events

**Sizing:**
- Default padding: `8px 16px`
- Min height: `26px`
- Font size: `13px`

### `.btn-vscode-secondary` - Secondary Button

Secondary action button for less prominent actions.

```html
<button class="btn-vscode-secondary">Secondary Action</button>
<button class="btn-vscode-secondary" disabled>Disabled Secondary</button>
```

**Properties:**
- Background: `var(--vscode-button-secondaryBackground)`
- Color: `var(--vscode-button-secondaryForeground)`
- Border: `1px solid var(--vscode-panel-border)`
- Hover: `var(--vscode-button-secondaryHoverBackground)`

### `.btn-vscode-ghost` - Ghost Button

Transparent button for subtle actions.

```html
<button class="btn-vscode-ghost">Ghost Action</button>
<button class="btn-vscode-ghost">
  <i class="codicon codicon-edit"></i>
  Edit
</button>
```

**Properties:**
- Background: `transparent`
- Color: `var(--vscode-foreground)`
- Hover: `var(--vscode-list-hoverBackground)`

### Button Usage Examples

```html
<!-- Button group -->
<div class="flex gap-vscode-sm">
  <button class="btn-vscode">Save</button>
  <button class="btn-vscode-secondary">Cancel</button>
  <button class="btn-vscode-ghost">Reset</button>
</div>

<!-- Responsive button layout -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-sm">
  <button class="btn-vscode w-full vscode-sm:w-auto">Primary</button>
  <button class="btn-vscode-secondary w-full vscode-sm:w-auto">Secondary</button>
</div>

<!-- Icon buttons -->
<button class="btn-vscode flex items-center gap-vscode-xs">
  <i class="codicon codicon-play"></i>
  Run Analysis
</button>
```

## 📝 Input Components

### `.input-vscode` - Standard Input

Standard form input field with VS Code theming.

```html
<input class="input-vscode" type="text" placeholder="Enter text...">
<input class="input-vscode w-full" type="email" placeholder="Email address">
```

**Properties:**
- Background: `var(--vscode-input-background)`
- Color: `var(--vscode-input-foreground)`
- Border: `1px solid var(--vscode-input-border)`
- Focus border: `var(--vscode-focusBorder)`
- Border radius: `4px`
- Padding: `8px 12px`

### `.input-vscode-error` - Error State

Input field with error styling.

```html
<input class="input-vscode input-vscode-error" 
       type="text" 
       placeholder="Invalid input">
```

**Properties:**
- Border color: `var(--vscode-errorForeground)`
- Can be combined with `.input-vscode`

### Input Usage Examples

```html
<!-- Form field with label -->
<div class="space-y-vscode-sm">
  <label class="block text-vscode-sm font-medium">Organization URL</label>
  <input class="input-vscode w-full" 
         type="url" 
         placeholder="https://dev.azure.com/your-org">
  <p class="text-vscode-xs text-vscode-muted">
    Enter your Azure DevOps organization URL
  </p>
</div>

<!-- Input with validation -->
<div class="space-y-vscode-sm">
  <label class="block text-vscode-sm font-medium">Access Token</label>
  <input class="input-vscode input-vscode-error w-full" 
         type="password" 
         placeholder="Enter PAT">
  <p class="text-vscode-xs text-vscode-error">
    Token is required and must be valid
  </p>
</div>

<!-- Search input -->
<div class="relative">
  <input class="input-vscode pl-8 w-full" 
         type="search" 
         placeholder="Search pull requests...">
  <i class="codicon codicon-search absolute left-2 top-2 text-vscode-muted"></i>
</div>
```

## 📦 Container Components

### `.card-vscode` - Card Container

Card component with VS Code theming and subtle shadow.

```html
<div class="card-vscode">
  <h3 class="text-vscode-lg font-medium mb-vscode-sm">Card Title</h3>
  <p class="text-vscode-sm text-vscode-muted">Card content goes here...</p>
</div>
```

**Properties:**
- Background: `var(--vscode-panel-background)`
- Border: `1px solid var(--vscode-panel-border)`
- Border radius: `8px`
- Padding: `16px`
- Box shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`

### `.panel-vscode` - Panel Container

Basic panel container without shadow.

```html
<div class="panel-vscode">
  <h2 class="text-vscode-lg font-medium mb-vscode-md">Panel Title</h2>
  <div class="space-y-vscode-sm">
    <p>Panel content...</p>
  </div>
</div>
```

**Properties:**
- Background: `var(--vscode-panel-background)`
- Border: `1px solid var(--vscode-panel-border)`
- Border radius: `8px`
- Padding: `16px`

### Container Usage Examples

```html
<!-- Comment card -->
<div class="card-vscode space-y-vscode-sm">
  <div class="flex items-center justify-between">
    <h3 class="text-vscode-lg font-medium">Code Review Comment</h3>
    <div class="flex gap-vscode-xs">
      <button class="btn-vscode-ghost text-vscode-xs">Edit</button>
      <button class="btn-vscode text-vscode-xs">Approve</button>
    </div>
  </div>
  <div class="text-vscode-sm">
    Consider using const instead of let for this variable since it's never reassigned.
  </div>
  <div class="pt-vscode-sm border-t border-vscode-panel-border text-vscode-xs text-vscode-muted">
    src/services/AzureDevOpsClient.ts • Line 42
  </div>
</div>

<!-- Dashboard panel -->
<div class="panel-vscode h-full">
  <h2 class="text-vscode-lg font-medium mb-vscode-md">Pull Requests</h2>
  <div class="space-y-vscode-sm">
    <div class="p-vscode-sm border border-vscode-panel-border rounded-vscode">
      <h4 class="font-medium">Feature: Add new dashboard</h4>
      <p class="text-vscode-xs text-vscode-muted">#123 • 2 files changed</p>
    </div>
  </div>
</div>

<!-- Grid of cards -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3 gap-vscode-md">
  <div class="card-vscode">Card 1</div>
  <div class="card-vscode">Card 2</div>
  <div class="card-vscode">Card 3</div>
</div>
```

## 🎨 Utility Classes

### Text Colors

Semantic text colors that adapt to VS Code themes.

```html
<!-- State colors -->
<p class="text-vscode-error">Error message</p>
<p class="text-vscode-warning">Warning message</p>
<p class="text-vscode-info">Info message</p>
<p class="text-vscode-success">Success message</p>

<!-- VS Code theme colors -->
<p class="text-vscode-foreground">Primary text</p>
<p class="text-vscode-muted">Muted text</p>
<p class="text-primary-foreground">Primary button text</p>
<p class="text-secondary-foreground">Secondary button text</p>
```

### Background Colors

Background utilities using VS Code theme variables.

```html
<!-- Semantic backgrounds -->
<div class="bg-primary text-primary-foreground">Primary background</div>
<div class="bg-secondary text-secondary-foreground">Secondary background</div>

<!-- State backgrounds -->
<div class="bg-vscode-error text-white">Error background</div>
<div class="bg-vscode-warning text-white">Warning background</div>
<div class="bg-vscode-info text-white">Info background</div>
<div class="bg-vscode-success text-white">Success background</div>

<!-- VS Code panel backgrounds -->
<div class="bg-vscode-panel-background">Panel background</div>
</div>
```

### Focus Utility

Custom focus styling that matches VS Code patterns.

```html
<button class="focus-vscode">Button with VS Code focus</button>
<input class="input-vscode focus-vscode">Input with focus styling</div>
```

**Properties:**
- Outline: `2px solid var(--vscode-focusBorder)`
- Outline offset: `1px`
- Applied on `:focus-visible`

## 📐 Spacing System

### VS Code Spacing Scale

Custom spacing utilities designed for VS Code interfaces.

```html
<!-- Padding -->
<div class="p-vscode-xs">4px padding</div>
<div class="p-vscode-sm">8px padding</div>
<div class="p-vscode-md">12px padding</div>
<div class="p-vscode-lg">16px padding</div>
<div class="p-vscode-xl">24px padding</div>
<div class="p-vscode-2xl">32px padding</div>

<!-- Margins -->
<div class="m-vscode-md">12px margin</div>
<div class="mt-vscode-lg">16px top margin</div>
<div class="space-y-vscode-sm">8px space between children</div>

<!-- Gaps -->
<div class="flex gap-vscode-md">16px gap between flex items</div>
<div class="grid gap-vscode-lg">24px gap between grid items</div>
```

### Spacing Reference

| Class | Value | Pixels |
|-------|-------|--------|
| `vscode-xs` | 0.25rem | 4px |
| `vscode-sm` | 0.5rem | 8px |
| `vscode-md` | 0.75rem | 12px |
| `vscode-lg` | 1rem | 16px |
| `vscode-xl` | 1.5rem | 24px |
| `vscode-2xl` | 2rem | 32px |
| `vscode-3xl` | 3rem | 48px |

## 🔤 Typography System

### Font Sizes

VS Code-specific typography scale.

```html
<h1 class="text-vscode-xl">Extra large text (1.25rem)</h1>
<h2 class="text-vscode-lg">Large text (1.125rem)</h2>
<p class="text-vscode">Default text (var(--vscode-font-size))</p>
<p class="text-vscode-sm">Small text (0.875rem)</p>
<small class="text-vscode-xs">Extra small text (0.75rem)</small>
```

### Font Families

```html
<p class="font-vscode">VS Code system font</p>
<code class="font-vscode-mono">Monospace font</code>
```

### Typography Examples

```html
<!-- Heading hierarchy -->
<div class="space-y-vscode-md">
  <h1 class="text-vscode-xl font-semibold text-vscode-foreground">
    Main Heading
  </h1>
  <h2 class="text-vscode-lg font-medium text-vscode-foreground">
    Section Heading
  </h2>
  <h3 class="text-vscode font-medium text-vscode-foreground">
    Subsection Heading
  </h3>
  <p class="text-vscode text-vscode-muted">
    Body text with proper line height and spacing.
  </p>
</div>

<!-- Code block -->
<pre class="font-vscode-mono text-vscode-sm bg-vscode-panel-background p-vscode-md rounded-vscode border border-vscode-panel-border">
<code>const example = "code example";</code>
</pre>
```

## 📱 Responsive Design

### VS Code Breakpoints

Responsive utilities using VS Code-specific breakpoints.

```html
<!-- Responsive grid -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Responsive flex direction -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-md">
  <div class="flex-1">Content 1</div>
  <div class="flex-1">Content 2</div>
</div>

<!-- Responsive visibility -->
<div class="hidden vscode-md:block">Large screen only</div>
<div class="block vscode-md:hidden">Small screen only</div>

<!-- Responsive sizing -->
<button class="btn-vscode w-full vscode-sm:w-auto">
  Responsive Button
</button>
```

### Breakpoint Reference

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `vscode-sm` | 576px | Small webview panels |
| `vscode-md` | 768px | Medium webview panels |
| `vscode-lg` | 1024px | Large webview panels |
| `vscode-xl` | 1280px | Extra large webview panels |

## 🎬 Animation & Transitions

### Custom VS Code Animations

```html
<!-- Fade in animation -->
<div class="animate-vscode-fade-in">Fading in content</div>

<!-- Slide in animation -->
<div class="animate-vscode-slide-in">Sliding in content</div>

<!-- Pulse animation -->
<div class="animate-vscode-pulse">Pulsing indicator</div>
```

### Custom Transitions

```html
<!-- Custom transition duration -->
<button class="btn-vscode transition-all duration-vscode">
  Button with VS Code timing
</button>

<div class="transition-colors duration-vscode-fast hover:bg-vscode-list-hover">
  Fast color transition
</div>
```

## 🧩 Layout Patterns

### Dashboard Layout

```html
<div class="grid grid-cols-1 vscode-lg:grid-cols-4 gap-vscode-lg h-full">
  <!-- Sidebar -->
  <div class="vscode-lg:col-span-1">
    <div class="panel-vscode h-full">
      <nav class="space-y-vscode-sm">
        <a href="#" class="block p-vscode-sm rounded-vscode hover:bg-vscode-list-hover">
          Dashboard
        </a>
        <a href="#" class="block p-vscode-sm rounded-vscode hover:bg-vscode-list-hover">
          Pull Requests
        </a>
      </nav>
    </div>
  </div>
  
  <!-- Main content -->
  <div class="vscode-lg:col-span-3">
    <div class="space-y-vscode-lg">
      <!-- Main content here -->
    </div>
  </div>
</div>
```

### Comment Preview Grid

```html
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3 gap-vscode-md">
  <div class="card-vscode">
    <!-- Comment card content -->
  </div>
  <!-- More comment cards -->
</div>
```

### Form Layout

```html
<form class="space-y-vscode-md max-w-vscode-lg">
  <div class="grid grid-cols-1 vscode-sm:grid-cols-2 gap-vscode-md">
    <div class="space-y-vscode-sm">
      <label class="block text-vscode-sm font-medium">First Name</label>
      <input class="input-vscode w-full" type="text">
    </div>
    <div class="space-y-vscode-sm">
      <label class="block text-vscode-sm font-medium">Last Name</label>
      <input class="input-vscode w-full" type="text">
    </div>
  </div>
  
  <div class="space-y-vscode-sm">
    <label class="block text-vscode-sm font-medium">Email</label>
    <input class="input-vscode w-full" type="email">
  </div>
  
  <div class="flex justify-end gap-vscode-sm">
    <button type="button" class="btn-vscode-secondary">Cancel</button>
    <button type="submit" class="btn-vscode">Save</button>
  </div>
</form>
```

## ♿ Accessibility Features

### Focus Management

All components include proper focus management:

```html
<!-- Buttons with focus indicators -->
<button class="btn-vscode focus-vscode">Accessible Button</button>

<!-- Inputs with proper labeling -->
<label for="search-input" class="sr-only">Search</label>
<input id="search-input" class="input-vscode focus-vscode" type="search">

<!-- Skip links -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-primary text-primary-foreground p-vscode-sm">
  Skip to main content
</a>
```

### Screen Reader Support

```html
<!-- Error messages with proper ARIA -->
<input class="input-vscode input-vscode-error" 
       aria-describedby="error-message" 
       aria-invalid="true">
<div id="error-message" class="text-vscode-xs text-vscode-error" role="alert">
  This field is required
</div>

<!-- Status indicators -->
<div class="flex items-center gap-vscode-xs">
  <i class="codicon codicon-check text-vscode-success" aria-hidden="true"></i>
  <span class="sr-only">Success:</span>
  <span>Configuration saved successfully</span>
</div>
```

## 🔧 Customization

### Extending Components

You can extend existing components with additional utilities:

```html
<!-- Custom button variant -->
<button class="btn-vscode bg-red-500 hover:bg-red-600">
  Danger Button
</button>

<!-- Custom card with gradient -->
<div class="card-vscode bg-gradient-to-r from-blue-500 to-purple-600 text-white">
  Gradient Card
</div>
```

### Creating Custom Components

Use the utility-first approach to create new components:

```html
<!-- Custom notification component -->
<div class="flex items-start gap-vscode-md p-vscode-md bg-vscode-panel-background border border-vscode-panel-border rounded-vscode shadow-vscode">
  <i class="codicon codicon-info text-vscode-info flex-shrink-0 mt-0.5"></i>
  <div class="flex-1">
    <h4 class="font-medium text-vscode-foreground">Information</h4>
    <p class="text-vscode-sm text-vscode-muted mt-1">
      This is an informational message.
    </p>
  </div>
  <button class="btn-vscode-ghost text-vscode-xs">Dismiss</button>
</div>
```

---

**Last Updated**: August 31, 2025
**Total Components**: 6 component classes, 20+ utility classes
**Responsive Breakpoints**: 4 VS Code-specific breakpoints