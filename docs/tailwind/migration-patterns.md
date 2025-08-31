# Migration Patterns

This document provides patterns and strategies for migrating existing CSS to the Tailwind-based system and for future development.

## 🔄 Overview

This guide covers migration patterns used during the Tailwind CSS refactoring project and provides templates for future migrations in the Azure DevOps PR Code Reviewer extension.

## 📋 Migration Strategy

### Phase-by-Phase Approach

The migration follows a systematic approach to minimize risk and ensure quality:

1. **Assessment**: Identify and catalog existing CSS
2. **Planning**: Map CSS patterns to Tailwind equivalents
3. **Implementation**: Convert components incrementally
4. **Testing**: Validate visual and functional parity
5. **Cleanup**: Remove redundant CSS files

## 🧩 Component Migration Patterns

### Button Migration Pattern

**Before (Custom CSS):**
```scss
.custom-button {
  display: inline-block;
  padding: 8px 16px;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #005a9e;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.secondary-button {
  @extend .custom-button;
  background-color: #f3f3f3;
  color: #333;
  border: 1px solid #ccc;
  
  &:hover {
    background-color: #e6e6e6;
  }
}
```

**After (Tailwind + VS Code Plugin):**
```html
<!-- Primary button using component class -->
<button class="btn-vscode">Primary Button</button>

<!-- Secondary button using component class -->
<button class="btn-vscode-secondary">Secondary Button</button>

<!-- Custom variant using component class + utilities -->
<button class="btn-vscode bg-red-500 hover:bg-red-600">
  Danger Button
</button>
```

### Form Input Migration Pattern

**Before (Custom CSS):**
```scss
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #333;
  
  &:focus {
    outline: none;
    border-color: #007acc;
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  }
  
  &.error {
    border-color: #d73a49;
    box-shadow: 0 0 0 2px rgba(215, 58, 73, 0.2);
  }
  
  &::placeholder {
    color: #999;
  }
}
```

**After (Tailwind + VS Code Plugin):**
```html
<!-- Standard input -->
<input class="input-vscode w-full" 
       type="text" 
       placeholder="Enter text">

<!-- Error state input -->
<input class="input-vscode input-vscode-error w-full" 
       type="text" 
       placeholder="Invalid input">

<!-- Custom input with additional utilities -->
<input class="input-vscode w-full max-w-vscode-md" 
       type="email" 
       placeholder="Email address">
```

### Card Component Migration Pattern

**Before (Custom CSS):**
```scss
.content-card {
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  
  .card-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e1e4e8;
    
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #24292e;
    }
  }
  
  .card-content {
    color: #586069;
    line-height: 1.5;
    
    p {
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
```

**After (Tailwind + VS Code Plugin):**
```html
<div class="card-vscode space-y-vscode-md">
  <!-- Card header -->
  <div class="pb-vscode-sm border-b border-vscode-panel-border">
    <h3 class="text-vscode-lg font-semibold text-vscode-foreground">
      Card Title
    </h3>
  </div>
  
  <!-- Card content -->
  <div class="text-vscode-muted space-y-vscode-sm">
    <p>First paragraph of content.</p>
    <p>Second paragraph of content.</p>
  </div>
</div>
```

## 📱 Responsive Migration Patterns

### Layout Migration Pattern

**Before (Custom CSS):**
```scss
.dashboard-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 24px;
  height: 100vh;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .sidebar {
    background: #f6f8fa;
    padding: 20px;
    
    @media (max-width: 768px) {
      padding: 16px;
    }
  }
  
  .main-content {
    padding: 24px;
    overflow-y: auto;
    
    @media (max-width: 768px) {
      padding: 16px;
    }
  }
}
```

**After (Tailwind + VS Code Breakpoints):**
```html
<div class="grid grid-cols-1 vscode-md:grid-cols-[250px_1fr] gap-vscode-lg h-screen">
  <!-- Sidebar -->
  <aside class="bg-vscode-panel-background p-vscode-md vscode-md:p-vscode-lg">
    <!-- Sidebar content -->
  </aside>
  
  <!-- Main content -->
  <main class="p-vscode-md vscode-md:p-vscode-lg overflow-y-auto">
    <!-- Main content -->
  </main>
</div>
```

### Navigation Migration Pattern

**Before (Custom CSS):**
```scss
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e1e4e8;
  
  .nav-title {
    font-size: 20px;
    font-weight: 600;
    color: #24292e;
  }
  
  .nav-actions {
    display: flex;
    gap: 12px;
    
    @media (max-width: 576px) {
      flex-direction: column;
      gap: 8px;
    }
  }
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
}
```

**After (Tailwind + VS Code Breakpoints):**
```html
<nav class="flex flex-col vscode-sm:flex-row vscode-sm:items-center vscode-sm:justify-between gap-vscode-md p-vscode-md bg-vscode-panel-background border-b border-vscode-panel-border">
  <!-- Title -->
  <h1 class="text-vscode-xl font-semibold text-vscode-foreground">
    Application Title
  </h1>
  
  <!-- Actions -->
  <div class="flex flex-col vscode-sm:flex-row gap-vscode-sm vscode-sm:gap-vscode-md">
    <button class="btn-vscode-secondary">Secondary Action</button>
    <button class="btn-vscode">Primary Action</button>
  </div>
</nav>
```

## 🎨 Theme Migration Patterns

### Color Variable Migration

**Before (Hard-coded Colors):**
```scss
.error-message {
  color: #d73a49;
  background-color: #ffeef0;
  border-color: #f97583;
}

.warning-message {
  color: #b08800;
  background-color: #fffbdd;
  border-color: #ffdf5d;
}

.success-message {
  color: #28a745;
  background-color: #dcffe4;
  border-color: #7bc96f;
}
```

**After (VS Code Theme Variables):**
```html
<!-- Error message using theme-aware utilities -->
<div class="text-vscode-error bg-error-background border border-vscode-error/20 p-vscode-sm rounded-vscode">
  Error message content
</div>

<!-- Warning message -->
<div class="text-vscode-warning bg-warning-background border border-vscode-warning/20 p-vscode-sm rounded-vscode">
  Warning message content
</div>

<!-- Success message -->
<div class="text-vscode-success bg-success-background border border-vscode-success/20 p-vscode-sm rounded-vscode">
  Success message content
</div>
```

### Dark Mode Migration

**Before (Manual Dark Mode):**
```scss
.content-panel {
  background: white;
  color: #24292e;
  border: 1px solid #e1e4e8;
  
  @media (prefers-color-scheme: dark) {
    background: #0d1117;
    color: #c9d1d9;
    border-color: #30363d;
  }
}
```

**After (Automatic VS Code Theme):**
```html
<!-- Automatically adapts to VS Code theme -->
<div class="bg-vscode-panel-background text-vscode-foreground border border-vscode-panel-border">
  Content that automatically adapts to all VS Code themes
</div>
```

## 🔧 SpartanNG Migration Patterns

### Component Override Migration

**Before (spartan-overrides.scss):**
```scss
// Button overrides
.hlm-button {
  &[data-variant="default"] {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    
    &:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
  }
  
  &[data-variant="secondary"] {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-panel-border);
  }
}

// Input overrides
.hlm-input {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  
  &:focus {
    border-color: var(--vscode-focusBorder);
  }
}
```

**After (Component Class Integration):**
```typescript
// Button component using Tailwind component classes
export const buttonVariants = cva(
  "btn-vscode", // Base VS Code button class
  {
    variants: {
      variant: {
        default: "", // Default btn-vscode styling
        secondary: "btn-vscode-secondary", // Secondary variant
        ghost: "btn-vscode-ghost", // Ghost variant
        outline: "border-2 border-vscode-panel-border bg-transparent hover:bg-vscode-list-hover",
      },
      size: {
        sm: "text-vscode-xs px-vscode-sm py-vscode-xs",
        default: "", // Default btn-vscode sizing
        lg: "text-vscode-lg px-vscode-lg py-vscode-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

```html
<!-- Updated component templates -->
<button [class]="buttonVariants({ variant: 'default' })">
  Primary Button
</button>

<button [class]="buttonVariants({ variant: 'secondary', size: 'sm' })">
  Small Secondary
</button>
```

## 🧪 Testing Migration Patterns

### Visual Regression Testing

**Before Migration Testing:**
```bash
# Capture baseline screenshots before migration
npm run test:visual:baseline

# Store current CSS bundle size
npm run analyze:bundle
```

**After Migration Testing:**
```bash
# Compare visual changes after migration
npm run test:visual:compare

# Verify bundle size reduction
npm run analyze:bundle:compare

# Run theme testing across all VS Code themes
./scripts/theme-testing.sh
```

### Component Testing Pattern

**Before (Testing CSS Classes):**
```typescript
// Testing custom CSS classes
it('should apply correct button styling', () => {
  const button = fixture.debugElement.query(By.css('.custom-button'));
  expect(button.nativeElement.classList).toContain('custom-button');
  
  // Check computed styles
  const styles = getComputedStyle(button.nativeElement);
  expect(styles.backgroundColor).toBe('rgb(0, 122, 204)');
});
```

**After (Testing Component Classes):**
```typescript
// Testing Tailwind component classes
it('should apply VS Code button styling', () => {
  const button = fixture.debugElement.query(By.css('.btn-vscode'));
  expect(button.nativeElement.classList).toContain('btn-vscode');
  
  // Test theme adaptation
  expect(button.nativeElement.style.backgroundColor).toBe('var(--vscode-button-background)');
});

it('should adapt to different themes', () => {
  // Test light theme
  component.setTheme('light');
  fixture.detectChanges();
  // Verify light theme styles
  
  // Test dark theme
  component.setTheme('dark');
  fixture.detectChanges();
  // Verify dark theme styles
});
```

## 🚀 Future Migration Patterns

### New Component Pattern

When adding new components, follow this pattern:

```typescript
// 1. Create component with Tailwind utilities
@Component({
  template: `
    <div class="card-vscode space-y-vscode-md">
      <h3 class="text-vscode-lg font-medium text-vscode-foreground">
        {{ title }}
      </h3>
      <div class="text-vscode text-vscode-muted">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class NewCardComponent {
  @Input() title: string = '';
}
```

```html
<!-- 2. Use component with additional utilities if needed -->
<app-new-card title="Example Card" 
              class="max-w-vscode-md mx-auto">
  Card content goes here.
</app-new-card>
```

### Plugin Extension Pattern

When extending the VS Code plugin:

```javascript
// Add new component classes to the plugin
addComponents({
  '.notification-vscode': {
    'display': 'flex',
    'align-items': 'flex-start',
    'gap': 'var(--vscode-sm)',
    'padding': 'var(--vscode-md)',
    'background-color': 'var(--vscode-panel-background)',
    'border': '1px solid var(--vscode-panel-border)',
    'border-radius': '8px',
    'box-shadow': 'var(--vscode-widget-shadow)',
    
    '&.notification-error': {
      'border-left': '4px solid var(--vscode-errorForeground)',
    },
    
    '&.notification-warning': {
      'border-left': '4px solid var(--vscode-warningForeground)',
    },
  },
});
```

### Legacy CSS Cleanup Pattern

When removing legacy CSS:

```bash
# 1. Identify all usages of legacy CSS classes
grep -r "legacy-class-name" src/

# 2. Replace with Tailwind equivalents
# 3. Test thoroughly across all themes
npm run test:visual

# 4. Remove from CSS files
# 5. Update documentation
```

## 📋 Migration Checklist

### Pre-Migration
- [ ] Audit existing CSS files and classes
- [ ] Document current component behavior
- [ ] Capture visual baseline screenshots
- [ ] Measure current bundle size
- [ ] Plan Tailwind equivalent patterns

### During Migration
- [ ] Convert components incrementally
- [ ] Maintain visual parity
- [ ] Test across all VS Code themes
- [ ] Update component documentation
- [ ] Verify accessibility compliance

### Post-Migration
- [ ] Remove redundant CSS files
- [ ] Update build configuration
- [ ] Run comprehensive testing
- [ ] Update developer documentation
- [ ] Measure bundle size reduction

## 🔍 Common Migration Challenges

### Challenge: Complex CSS Selectors

**Before:**
```scss
.component {
  .nested {
    .deeply-nested {
      &:hover {
        &:not(.disabled) {
          background: blue;
        }
      }
    }
  }
}
```

**Solution:**
```html
<!-- Flatten structure and use utility classes -->
<div class="component">
  <div class="nested">
    <div class="deeply-nested hover:bg-blue-500 disabled:hover:bg-transparent">
      Content
    </div>
  </div>
</div>
```

### Challenge: CSS Variables

**Before:**
```scss
.component {
  --custom-color: #007acc;
  background: var(--custom-color);
}
```

**Solution:**
```html
<!-- Use VS Code theme variables instead -->
<div class="bg-primary" style="--custom-property: value;">
  Content
</div>
```

### Challenge: Animation Keyframes

**Before:**
```scss
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.animated {
  animation: slideIn 0.3s ease-out;
}
```

**Solution:**
```html
<!-- Use Tailwind animation utilities or extend config -->
<div class="animate-vscode-slide-in">
  Animated content
</div>
```

---

**Last Updated**: August 31, 2025
**Migration Version**: 1.0.0
**Patterns Documented**: 15+ migration patterns