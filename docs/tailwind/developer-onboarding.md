# Developer Onboarding Guide

Welcome to the Azure DevOps PR Code Reviewer extension development team! This guide will help you get up to speed with our Tailwind CSS-based component library and development practices.

## 🎯 Quick Start

### Prerequisites

- VS Code with TypeScript and Angular extensions
- Node.js 18+
- Basic understanding of Tailwind CSS
- Familiarity with Angular development

### First Steps

1. **Clone and Setup**

```bash
git clone <repository-url>
cd azdo-pr-code-reviewer
npm install
```

2. **Development Environment**

```bash
# Start development build with watch mode
npm run watch

# Start Angular development server
cd src/webview-angular-v2
npm run dev
```

3. **Open Extension in VS Code**
   - Press `F5` to open a new Extension Development Host
   - The extension will be automatically loaded

## 🎨 Design System Overview

### VS Code Integration

Our design system is built on VS Code's theme variables, ensuring seamless integration with the editor's appearance.

```html
<!-- Always use VS Code theme variables -->
<div class="bg-vscode-panel-background text-vscode-foreground">
  Content that adapts to any VS Code theme
</div>
```

### Component Philosophy

We follow a **utility-first approach** with **component classes** for common patterns:

```html
<!-- ✅ Good: Component class for common patterns -->
<button class="btn-vscode">Primary Action</button>

<!-- ✅ Good: Utilities for layout and spacing -->
<div class="flex items-center gap-vscode-md">
  <span>Label</span>
  <button class="btn-vscode-secondary">Action</button>
</div>

<!-- ❌ Avoid: Custom CSS for existing patterns -->
<style>
  .custom-button {
    /* Don't do this - use component classes */
  }
</style>
```

## 🧩 Component Library

### Core Components

Learn these essential component classes first:

```html
<!-- Buttons -->
<button class="btn-vscode">Primary Button</button>
<button class="btn-vscode-secondary">Secondary Button</button>
<button class="btn-vscode-ghost">Ghost Button</button>

<!-- Form Inputs -->
<input class="input-vscode" type="text" placeholder="Enter text" />
<input class="input-vscode input-vscode-error" type="text" />
<!-- Error state -->

<!-- Containers -->
<div class="card-vscode">Card with shadow</div>
<div class="panel-vscode">Basic panel</div>
```

### Color System

Use semantic colors that automatically adapt to themes:

```html
<!-- State colors -->
<p class="text-vscode-error">Error message</p>
<p class="text-vscode-warning">Warning message</p>
<p class="text-vscode-success">Success message</p>

<!-- Theme colors -->
<div class="bg-primary text-primary-foreground">Primary themed content</div>
<div class="text-vscode-muted">Secondary text</div>
```

### Spacing System

Use VS Code-specific spacing for consistency:

```html
<!-- VS Code spacing scale -->
<div class="p-vscode-md space-y-vscode-sm">
  <h2 class="mb-vscode-sm">Title</h2>
  <p class="mb-vscode-md">Content</p>
</div>
```

## 📱 Responsive Development

### VS Code Breakpoints

We use custom breakpoints designed for VS Code webview panels:

```html
<!-- Mobile-first responsive design -->
<div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3">
  <div class="card-vscode">Item 1</div>
  <div class="card-vscode">Item 2</div>
  <div class="card-vscode">Item 3</div>
</div>

<!-- Responsive button layout -->
<div class="flex flex-col vscode-sm:flex-row gap-vscode-sm">
  <button class="btn-vscode w-full vscode-sm:w-auto">Primary</button>
  <button class="btn-vscode-secondary w-full vscode-sm:w-auto">
    Secondary
  </button>
</div>
```

**Breakpoint Reference:**

- `vscode-sm`: 576px+ (Small panels)
- `vscode-md`: 768px+ (Medium panels)
- `vscode-lg`: 1024px+ (Large panels)
- `vscode-xl`: 1280px+ (Extra large panels)

## 🛠️ Development Workflow

### File Structure

Understanding the project structure:

```
src/webview-angular-v2/
├── tailwind.config.js          # Tailwind configuration
├── src/styles/
│   ├── globals.scss            # Global styles
│   ├── vscode-theme.scss       # VS Code theme integration
│   └── tailwind-vscode-plugin.js # Custom component plugin
├── src/app/                    # Angular application
└── libs/ui/                    # SpartanNG component library
```

### Creating New Components

Follow this pattern when creating new components:

1. **Start with utilities:**

```typescript
@Component({
  template: `
    <div class="card-vscode space-y-vscode-md">
      <h3 class="text-vscode-lg font-medium">{{ title }}</h3>
      <div class="text-vscode-sm text-vscode-muted">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class NewComponent {
  @Input() title: string = "";
}
```

2. **Add responsive behavior:**

```html
<div class="card-vscode space-y-vscode-md">
  <!-- Responsive header -->
  <div
    class="flex flex-col vscode-sm:flex-row vscode-sm:items-center vscode-sm:justify-between"
  >
    <h3 class="text-vscode-lg font-medium">{{ title }}</h3>
    <div class="flex gap-vscode-xs mt-vscode-xs vscode-sm:mt-0">
      <button class="btn-vscode-secondary text-vscode-xs">Edit</button>
      <button class="btn-vscode text-vscode-xs">Save</button>
    </div>
  </div>

  <!-- Content -->
  <div class="text-vscode-sm text-vscode-muted">
    <ng-content></ng-content>
  </div>
</div>
```

3. **Test across themes:**

```bash
# Run theme testing script
./scripts/theme-testing.sh
```

### Common Patterns

Learn these frequently used patterns:

#### Dashboard Layout

```html
<div class="grid grid-cols-1 vscode-lg:grid-cols-4 gap-vscode-lg h-full">
  <!-- Sidebar -->
  <aside class="vscode-lg:col-span-1">
    <div class="panel-vscode h-full">
      <!-- Navigation -->
    </div>
  </aside>

  <!-- Main content -->
  <main class="vscode-lg:col-span-3">
    <!-- Content -->
  </main>
</div>
```

#### Form Layout

```html
<form class="space-y-vscode-md max-w-vscode-lg">
  <div class="space-y-vscode-sm">
    <label class="block text-vscode-sm font-medium">Label</label>
    <input class="input-vscode w-full" type="text" />
    <p class="text-vscode-xs text-vscode-muted">Help text</p>
  </div>

  <div class="flex justify-end gap-vscode-sm">
    <button type="button" class="btn-vscode-secondary">Cancel</button>
    <button type="submit" class="btn-vscode">Save</button>
  </div>
</form>
```

#### Comment Card

```html
<div class="card-vscode space-y-vscode-sm">
  <div class="flex items-center justify-between">
    <h3 class="text-vscode-lg font-medium">Comment Title</h3>
    <div class="flex gap-vscode-xs">
      <button class="btn-vscode-ghost text-vscode-xs">Edit</button>
      <button class="btn-vscode text-vscode-xs">Approve</button>
    </div>
  </div>

  <div class="text-vscode-sm text-vscode-muted">
    Comment content goes here...
  </div>

  <div
    class="pt-vscode-sm border-t border-vscode-panel-border text-vscode-xs text-vscode-muted"
  >
    src/component.ts • Line 42
  </div>
</div>
```

## 🧪 Testing Guidelines

### Visual Testing

Always test your components across VS Code themes:

```bash
# Test with the automated script
./scripts/theme-testing.sh

# Manual testing checklist:
# 1. Light theme
# 2. Dark theme
# 3. High contrast themes
# 4. Different screen sizes
# 5. Keyboard navigation
```

### Component Testing

Write tests that verify component behavior:

```typescript
describe("CommentCardComponent", () => {
  it("should render with proper VS Code styling", () => {
    const fixture = TestBed.createComponent(CommentCardComponent);
    const element = fixture.debugElement.query(By.css(".card-vscode"));

    expect(element).toBeTruthy();
    expect(element.nativeElement.classList).toContain("card-vscode");
  });

  it("should be accessible with keyboard navigation", () => {
    // Test keyboard accessibility
    const button = fixture.debugElement.query(By.css(".btn-vscode"));
    button.nativeElement.focus();

    expect(document.activeElement).toBe(button.nativeElement);
  });
});
```

### Performance Testing

Monitor bundle size and performance:

```bash
# Analyze bundle size
npm run build:analyze

# Check performance
npm run performance-test
```

## ♿ Accessibility Requirements

### Focus Management

Always ensure proper focus management:

```html
<!-- Use focus-vscode utility for custom focusable elements -->
<div tabindex="0" class="focus-vscode p-vscode-md rounded-vscode">
  Custom focusable content
</div>

<!-- Buttons include focus styling by default -->
<button class="btn-vscode">Automatically accessible</button>
```

### Screen Reader Support

Provide proper labels and ARIA attributes:

```html
<!-- Form accessibility -->
<div class="space-y-vscode-sm">
  <label for="email-input" class="block text-vscode-sm font-medium">
    Email Address
  </label>
  <input
    id="email-input"
    class="input-vscode w-full"
    type="email"
    aria-describedby="email-help"
    required
  />
  <p id="email-help" class="text-vscode-xs text-vscode-muted">
    We'll never share your email
  </p>
</div>

<!-- Error states -->
<input
  class="input-vscode input-vscode-error"
  aria-describedby="error-message"
  aria-invalid="true"
/>
<div id="error-message" class="text-vscode-xs text-vscode-error" role="alert">
  This field is required
</div>
```

### Color Contrast

Always use high-contrast color combinations:

```html
<!-- ✅ Good: High contrast -->
<div class="bg-primary text-primary-foreground">Readable content</div>

<!-- ✅ Good: Theme-aware contrast -->
<div class="bg-vscode-panel-background text-vscode-foreground">
  Adapts to theme contrast
</div>
```

## 🚀 Performance Best Practices

### Efficient Class Usage

```html
<!-- ✅ Good: Use component classes for repeated patterns -->
<div class="space-y-vscode-md">
  <div class="card-vscode">Card 1</div>
  <div class="card-vscode">Card 2</div>
</div>

<!-- ❌ Avoid: Repeating utility combinations -->
<div>
  <div
    class="bg-vscode-panel-background border border-vscode-panel-border rounded-lg p-vscode-md"
  >
    Card 1
  </div>
  <div
    class="bg-vscode-panel-background border border-vscode-panel-border rounded-lg p-vscode-md"
  >
    Card 2
  </div>
</div>
```

### Bundle Optimization

The build system automatically:

- Purges unused CSS in production
- Optimizes for VS Code webview constraints
- Minifies and compresses assets

## 🔧 Debugging Common Issues

### Theme Colors Not Working

```typescript
// Check if VS Code variables are available
console.log(
  getComputedStyle(document.documentElement).getPropertyValue(
    "--vscode-foreground"
  )
);

// Ensure component is in webview context
if (!document.body.classList.contains("vscode-body")) {
  console.warn("Not in VS Code webview context");
}
```

### Responsive Issues

```html
<!-- Debug responsive breakpoints -->
<div class="block vscode-sm:hidden bg-red-500">XS Screen</div>
<div class="hidden vscode-sm:block vscode-md:hidden bg-blue-500">SM Screen</div>
<div class="hidden vscode-md:block vscode-lg:hidden bg-green-500">
  MD Screen
</div>
<div class="hidden vscode-lg:block bg-purple-500">LG+ Screen</div>
```

### Component Classes Not Applying

1. Check if the plugin is properly loaded in `tailwind.config.js`
2. Verify the file is included in Tailwind's content paths
3. Ensure the build process includes the custom plugin

## 📚 Learning Resources

### Essential Reading

1. [Getting Started Guide](./getting-started.md)
2. [Component Reference](./component-reference.md)
3. [Utility Guidelines](./utility-guidelines.md)
4. [VS Code Plugin Documentation](./vscode-plugin.md)

### External Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [SpartanNG Components](https://www.spartan.ng/)
- [Angular Documentation](https://angular.io/docs)

## 🎯 Development Tasks

### Your First Component

Create a simple notification component:

1. **Plan the component:**

   - Use `card-vscode` as base
   - Add icon support
   - Include dismiss functionality
   - Make it responsive

2. **Implement with utilities:**

```typescript
@Component({
  selector: "app-notification",
  template: `
    <div class="card-vscode flex items-start gap-vscode-md">
      <i [class]="iconClass" class="flex-shrink-0 mt-0.5"></i>
      <div class="flex-1 space-y-vscode-xs">
        <h4 class="font-medium text-vscode-foreground">{{ title }}</h4>
        <p class="text-vscode-sm text-vscode-muted">{{ message }}</p>
      </div>
      <button class="btn-vscode-ghost text-vscode-xs" (click)="dismiss()">
        Dismiss
      </button>
    </div>
  `,
})
export class NotificationComponent {
  @Input() title: string = "";
  @Input() message: string = "";
  @Input() type: "info" | "warning" | "error" | "success" = "info";
  @Output() dismissed = new EventEmitter<void>();

  get iconClass() {
    const baseClass = "codicon";
    const iconMap = {
      info: "codicon-info text-vscode-info",
      warning: "codicon-warning text-vscode-warning",
      error: "codicon-error text-vscode-error",
      success: "codicon-check text-vscode-success",
    };
    return `${baseClass} ${iconMap[this.type]}`;
  }

  dismiss() {
    this.dismissed.emit();
  }
}
```

3. **Test the component:**

```html
<app-notification
  title="Success!"
  message="Your changes have been saved."
  type="success"
  (dismissed)="onNotificationDismissed()"
>
</app-notification>
```

4. **Verify accessibility and theming**

### Next Steps

Once you're comfortable with the basics:

1. **Study existing components** in `libs/ui/`
2. **Contribute to the component library** by adding new patterns
3. **Optimize performance** by analyzing bundle size
4. **Improve accessibility** by auditing with screen readers

## 💬 Getting Help

### Team Resources

- **Code Reviews**: Always request reviews for component changes
- **Design System Discussions**: Propose new patterns in team meetings
- **Documentation**: Update docs when adding new components

### Common Questions

**Q: When should I create a new component class vs. using utilities?**
A: Create component classes for patterns used 3+ times across the application. Use utilities for one-off styling and layout.

**Q: How do I test my components in different VS Code themes?**
A: Use the `./scripts/theme-testing.sh` script or manually change themes in VS Code settings.

**Q: My component looks different in VS Code vs. browser. Why?**
A: VS Code provides specific CSS variables and context. Always test in the actual extension environment.

**Q: How do I handle complex animations?**
A: Extend the Tailwind config with custom animations or use the existing VS Code animation utilities.

## ✅ Onboarding Checklist

- [ ] Set up development environment
- [ ] Review design system documentation
- [ ] Build and run the extension locally
- [ ] Create a simple component using utility classes
- [ ] Test component across VS Code themes
- [ ] Write tests for your component
- [ ] Submit your first pull request
- [ ] Participate in code review process

Welcome to the team! 🚀

---

**Last Updated**: August 31, 2025
**Guide Version**: 1.0.0
