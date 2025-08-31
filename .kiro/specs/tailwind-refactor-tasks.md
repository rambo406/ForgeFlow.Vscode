# Tailwind CSS Refactoring - Tasks Specification

## Project Overview

This document provides detailed specifications for each task in the Tailwind CSS refactoring project for the Azure DevOps PR Code Reviewer VS Code extension. The project transforms the Angular webview application from mixed CSS/Tailwind to a pure Tailwind utility-first approach while maintaining VS Code theme integration.

## Task Execution Guidelines

### Execution Rules
- Execute ONE task at a time following the specified sequence
- Mark task as `in-progress` before starting work
- Complete all acceptance criteria before marking `completed`
- Validate changes don't break existing functionality
- Test VS Code theme integration for all changes

### Quality Standards
- Maintain visual parity with existing design
- Preserve all accessibility features
- Ensure responsive design integrity
- Follow TypeScript and Angular best practices
- Maintain component API compatibility

---

## Task 1: Create Enhanced Tailwind Config

### Description
Update `tailwind.config.js` with comprehensive VS Code theme integration, semantic color system, enhanced spacing, typography, and VS Code-specific breakpoints.

### Acceptance Criteria
- [ ] Enhanced color system with VS Code theme variables
- [ ] Semantic color mappings (primary, secondary, error, warning, info, success)
- [ ] VS Code-specific spacing system (`vscode.xs` through `vscode.3xl`)
- [ ] Typography scale matching VS Code font specifications
- [ ] Custom breakpoints for VS Code webview constraints
- [ ] Content paths correctly configured for Angular components
- [ ] Plugin registration for custom VS Code components

### Technical Requirements
- File: `src/webview-angular/tailwind.config.js`
- Color variables must use CSS custom properties
- Breakpoints: `vscode-sm: 576px`, `vscode-md: 768px`, `vscode-lg: 1024px`, `vscode-xl: 1280px`
- Typography scale from `vscode.xs` to `vscode.xl`
- Content scanning includes `./src/**/*.{html,ts}` and `./libs/**/*.{html,ts}`

### Implementation Steps
1. Backup existing `tailwind.config.js`
2. Implement enhanced color system with VS Code variables
3. Add semantic color mappings for consistent theming
4. Configure VS Code-specific spacing and typography scales
5. Set up custom breakpoints for webview responsiveness
6. Register custom plugin for VS Code components
7. Test configuration with build system

### Testing Criteria
- [ ] Build system compiles without errors
- [ ] All VS Code theme variables resolve correctly
- [ ] Color utilities generate properly in CSS output
- [ ] Spacing and typography utilities work as expected
- [ ] Breakpoint utilities function correctly

---

## Task 2: Build Custom VS Code Tailwind Plugin

### Description
Create `src/styles/tailwind-vscode-plugin.js` with custom component classes and utilities specifically designed for VS Code webview integration.

### Acceptance Criteria
- [ ] `.btn-vscode` component class with VS Code button styling
- [ ] `.btn-vscode-secondary` variant for secondary buttons
- [ ] `.input-vscode` component for consistent form inputs
- [ ] `.panel-vscode` and `.card-vscode` for container components
- [ ] Utility classes for VS Code semantic colors
- [ ] Focus management following VS Code patterns
- [ ] Hover states matching VS Code design system

### Technical Requirements
- File: `src/webview-angular/src/styles/tailwind-vscode-plugin.js`
- Use Tailwind's `addComponents` and `addUtilities` APIs
- Components must use CSS custom properties for theming
- Include proper focus-visible styling for accessibility
- Support disabled states for interactive elements
- Maintain consistent spacing with VS Code design system

### Component Classes to Implement
- `.btn-vscode` - Primary button styling
- `.btn-vscode-secondary` - Secondary button variant
- `.input-vscode` - Form input styling
- `.panel-vscode` - Basic panel container
- `.card-vscode` - Card component with shadow

### Utility Classes to Implement
- `.text-vscode-error`, `.text-vscode-warning`, `.text-vscode-info`, `.text-vscode-success`
- `.bg-vscode-error`, `.bg-vscode-warning`, `.bg-vscode-info`, `.bg-vscode-success`

### Testing Criteria
- [ ] Plugin loads without errors in Tailwind build
- [ ] All component classes generate correct CSS
- [ ] Utility classes work across all VS Code themes
- [ ] Focus states are accessible and visible
- [ ] Hover effects match VS Code design patterns

---

## Task 3: Refactor Core Stylesheets

### Description
Reduce `globals.scss` to essential styles (<100 lines), enhance `vscode-theme.scss` with semantic tokens, and eliminate redundant CSS by replacing with Tailwind utilities.

### Acceptance Criteria
- [ ] `globals.scss` reduced to <100 lines
- [ ] Only essential global styles remain (resets, VS Code integration, scrollbars)
- [ ] Enhanced `vscode-theme.scss` with semantic color mappings
- [ ] Removal of duplicate utility classes replaced by Tailwind
- [ ] Proper CSS layer organization (@layer base, components, utilities)
- [ ] Maintained VS Code scrollbar styling

### Files to Modify
- `src/webview-angular/src/styles/globals.scss`
- `src/webview-angular/src/styles/vscode-theme.scss`

### globals.scss Requirements
- Include Tailwind directives (@tailwind base, components, utilities)
- Preserve VS Code theme import
- Maintain essential box-sizing reset
- Keep VS Code scrollbar styling
- Add custom @layer components for app-specific patterns
- Remove all utility classes that Tailwind provides

### vscode-theme.scss Enhancements
- Add semantic color mappings (--color-primary, --color-secondary, etc.)
- Include theme-specific shadow definitions
- Support high-contrast theme adjustments
- Maintain existing VS Code variable mappings

### Testing Criteria
- [ ] Build system works without errors
- [ ] All VS Code themes render correctly
- [ ] No visual regression in existing components
- [ ] CSS bundle size reduced significantly
- [ ] Scrollbars maintain VS Code styling

---

## Task 4: Update Build System Configuration

### Description
Update `webpack.config.js` for optimal Tailwind integration, configure CSS purging for production builds, and ensure seamless Angular build process integration.

### Acceptance Criteria
- [ ] Webpack configuration optimized for Tailwind CSS
- [ ] CSS purging configured for production builds
- [ ] Source maps work correctly in development
- [ ] Angular build integration maintains functionality
- [ ] Hot reload works with Tailwind changes
- [ ] Build performance maintained or improved

### Technical Requirements
- File: `src/webview-angular/webpack.config.js`
- Configure postcss-loader for Tailwind processing
- Set up CSS optimization for production
- Ensure proper asset handling for webview
- Maintain Angular CLI compatibility

### Implementation Details
- Add postcss-loader to CSS processing pipeline
- Configure Tailwind CSS processing with autoprefixer
- Set up CSS minification for production builds
- Ensure proper source map generation
- Optimize chunk splitting for CSS assets

### Testing Criteria
- [ ] Development build works with hot reload
- [ ] Production build generates optimized CSS
- [ ] Source maps work correctly in development
- [ ] CSS purging removes unused styles in production
- [ ] Build times remain acceptable
- [ ] Angular components compile without issues

---

## Task 5: Migrate SpartanNG Component Overrides

### Description
Replace `spartan-overrides.scss` with Tailwind-based component variants, focusing on button, input, card, and form components while maintaining API compatibility.

### Acceptance Criteria
- [ ] Button variants converted to Tailwind classes
- [ ] Input components use Tailwind utilities
- [ ] Card components migrate to `.card-vscode` pattern
- [ ] Form components maintain accessibility
- [ ] Component APIs remain unchanged
- [ ] All variants and states preserved

### Files to Modify
- `libs/ui/ui-button-helm/src/lib/hlm-button.ts`
- `libs/ui/ui-input-helm/src/lib/hlm-input.ts`
- `libs/ui/ui-card-helm/src/lib/hlm-card.ts`
- Other SpartanNG component files as needed

### Button Variants Migration
- Update `buttonVariants` function to use Tailwind classes
- Maintain `default`, `secondary`, `outline`, `destructive`, `ghost`, `link` variants
- Preserve `sm`, `default`, `lg`, `icon` sizes
- Use `.btn-vscode` base classes

### Input Components Migration
- Replace custom CSS with `.input-vscode` classes
- Maintain focus states and validation styling
- Preserve accessibility attributes
- Support error and disabled states

### Testing Criteria
- [ ] All button variants render correctly
- [ ] Input components maintain functionality
- [ ] Form validation styling works
- [ ] Accessibility features preserved
- [ ] No breaking changes to component APIs

---

## Task 6: Refactor Dashboard Layout Components

### Description
Convert dashboard layout templates to use pure Tailwind utilities with enhanced responsive design patterns, implementing `dashboard-grid` and `comment-preview-grid` patterns.

### Acceptance Criteria
- [ ] Main dashboard layout uses Tailwind grid utilities
- [ ] Responsive breakpoints use VS Code-specific classes
- [ ] Sidebar and main content areas properly structured
- [ ] Mobile-first responsive design maintained
- [ ] Grid patterns optimize for different screen sizes
- [ ] Touch-friendly interface on mobile devices

### Components to Modify
- Main dashboard layout component
- Sidebar navigation component
- Content area grid layouts
- Panel and card arrangements

### Responsive Patterns
- Use `grid-cols-1 vscode-lg:grid-cols-4` for main layout
- Implement `comment-preview-grid` with `grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3`
- Apply `flex flex-col vscode-sm:flex-row` for responsive headers
- Use `w-full vscode-sm:w-auto` for responsive button sizing

### Testing Criteria
- [ ] Dashboard renders correctly on all screen sizes
- [ ] Grid layouts adapt properly to viewport changes
- [ ] Touch interactions work on mobile devices
- [ ] Sidebar collapses appropriately on small screens
- [ ] Content remains accessible at all breakpoints

---

## Task 7: Migrate Comment Preview Components

### Description
Update comment preview templates to use Tailwind utilities with mobile-first responsive design and full VS Code theme integration.

### Acceptance Criteria
- [ ] Comment cards use `.card-vscode` base class
- [ ] Headers adapt between stacked and inline layouts
- [ ] Action buttons responsive sizing
- [ ] Content areas use proper typography utilities
- [ ] Mobile-optimized button layouts
- [ ] Consistent spacing throughout components

### Templates to Update
- Comment preview card template
- Comment header component
- Comment action buttons
- Comment content display
- Comment footer layout

### Mobile-First Patterns
- Headers: `flex flex-col vscode-sm:flex-row vscode-sm:items-center`
- Buttons: `w-full vscode-sm:w-auto` with `gap-2 vscode-sm:gap-4`
- Typography: `text-base`, `text-sm`, `text-xs` with responsive scaling
- Spacing: Use `space-y-2` and `gap-4` for consistent layouts

### Testing Criteria
- [ ] Comment cards render correctly across all themes
- [ ] Mobile layout provides good user experience
- [ ] Button interactions work on touch devices
- [ ] Typography scales appropriately
- [ ] Spacing remains consistent

---

## Task 8: Convert Form Components

### Description
Refactor all form components to use `.input-vscode` classes and Tailwind utilities while maintaining accessibility and validation styling.

### Acceptance Criteria
- [ ] All input fields use `.input-vscode` class
- [ ] Form layouts use Tailwind spacing utilities
- [ ] Labels maintain proper accessibility attributes
- [ ] Validation states preserved and styled correctly
- [ ] Error messages use appropriate color utilities
- [ ] Help text styling consistent

### Components to Update
- Text input components
- Select dropdown components
- Textarea components
- Form field wrapper components
- Validation message components

### Form Patterns
- Form containers: `space-y-4` for consistent spacing
- Form fields: `space-y-2` for label, input, help text grouping
- Labels: `text-sm font-medium text-vscode-foreground`
- Help text: `text-xs text-vscode-muted-foreground`
- Error text: `text-xs text-vscode-error`

### Testing Criteria
- [ ] All form inputs styled consistently
- [ ] Validation messages display correctly
- [ ] Accessibility features work properly
- [ ] Focus management follows VS Code patterns
- [ ] Form submissions work without issues

---

## Task 9: Implement Responsive Design Enhancements

### Description
Apply mobile-first responsive patterns using VS Code breakpoints across all components, ensuring optimal user experience on all device sizes.

### Acceptance Criteria
- [ ] All components use mobile-first responsive design
- [ ] VS Code breakpoints used consistently
- [ ] Touch-friendly interfaces on mobile devices
- [ ] Proper responsive typography scaling
- [ ] Optimized spacing for different screen sizes
- [ ] Webview panel resizing handled gracefully

### Responsive Patterns to Implement
- Grid layouts with responsive column counts
- Flexible button arrangements
- Adaptive navigation patterns
- Responsive spacing and typography
- Touch-optimized interactive elements

### Breakpoint Usage Guidelines
- `vscode-sm`: Basic layout adjustments (576px+)
- `vscode-md`: Tablet optimizations (768px+)
- `vscode-lg`: Desktop layouts (1024px+)
- `vscode-xl`: Large desktop optimizations (1280px+)

### Testing Criteria
- [ ] Components work well on mobile devices
- [ ] Layout adapts smoothly across breakpoints
- [ ] Touch targets are appropriately sized
- [ ] Content remains readable at all sizes
- [ ] Performance maintained across devices

---

## Task 10: Conduct Visual Regression Testing

### Description
Test all components across VS Code themes (light, dark, high-contrast) to ensure visual parity and correct theme integration.

### Acceptance Criteria
- [ ] All components render correctly in light theme
- [ ] Dark theme integration works properly
- [ ] High-contrast theme maintains accessibility
- [ ] Theme switching works without issues
- [ ] Color contrast meets accessibility standards
- [ ] No visual regressions from original design

### Testing Scope
- All converted components
- Form elements and interactions
- Button states and variants
- Layout grids and responsive behavior
- Typography and color usage

### Theme Testing Checklist
- Light theme: Standard VS Code light appearance
- Dark theme: Standard VS Code dark appearance
- High-contrast themes: Both light and dark variants
- Custom themes: Verify compatibility with user themes

### Testing Criteria
- [ ] Visual consistency across all themes
- [ ] Proper color contrast ratios maintained
- [ ] Interactive elements clearly visible
- [ ] Focus indicators work in all themes
- [ ] No broken layouts or styling

---

## Task 11: Performance Testing & Bundle Analysis

### Description
Analyze CSS bundle size reduction, verify build performance, and conduct runtime performance testing to ensure no regressions.

### Acceptance Criteria
- [ ] CSS bundle size reduced by 30-50%
- [ ] Build times maintained or improved
- [ ] Runtime performance preserved
- [ ] Memory usage optimized
- [ ] Loading times improved or maintained
- [ ] No performance regressions identified

### Metrics to Measure
- CSS bundle size before and after
- JavaScript bundle impact
- Build time comparisons
- Runtime rendering performance
- Memory usage patterns
- Initial load time

### Performance Testing Tools
- Bundle analyzer for size analysis
- Browser DevTools for runtime profiling
- VS Code extension performance metrics
- Automated performance regression tests

### Testing Criteria
- [ ] Significant reduction in CSS bundle size
- [ ] No increase in JavaScript bundle size
- [ ] Build performance maintained
- [ ] Component rendering performance preserved
- [ ] Memory usage optimized

---

## Task 12: Update Component Documentation

### Description
Create comprehensive documentation for the new Tailwind-based component library, styling guidelines, and migration patterns for future development.

### Acceptance Criteria
- [ ] Component library documentation updated
- [ ] Tailwind utility usage guidelines created
- [ ] VS Code theme integration guide written
- [ ] Migration patterns documented
- [ ] Code examples provided for all patterns
- [ ] Developer onboarding guide updated

### Documentation Scope
- Component library reference
- Tailwind utility guidelines
- Responsive design patterns
- VS Code theme integration
- Migration patterns for future changes
- Best practices and conventions

### Documentation Structure
- Getting started guide
- Component reference with examples
- Utility class reference
- Responsive design guide
- Theme integration guide
- Migration patterns and examples

### Testing Criteria
- [ ] Documentation is comprehensive and clear
- [ ] Code examples work correctly
- [ ] Guidelines are easy to follow
- [ ] Migration patterns are well-documented
- [ ] Developer onboarding improved

---

## Task 13: Clean Up Legacy CSS Files

### Description
Remove or significantly reduce `spartan-overrides.scss` and other legacy CSS files that have been replaced by Tailwind utilities.

### Acceptance Criteria
- [ ] `spartan-overrides.scss` removed or reduced to essentials
- [ ] Legacy CSS files identified and cleaned up
- [ ] No unused CSS imports remain
- [ ] Build system updated to exclude removed files
- [ ] No broken references to removed styles
- [ ] CSS architecture simplified

### Files to Review and Clean
- `spartan-overrides.scss` (580+ lines to be reduced/removed)
- Component-specific CSS files
- Unused utility classes
- Redundant style imports
- Legacy responsive patterns

### Cleanup Process
1. Identify all references to legacy CSS
2. Verify components work with Tailwind replacements
3. Remove unused files and imports
4. Update build configuration
5. Test for any broken styling

### Testing Criteria
- [ ] All components continue to work correctly
- [ ] No console errors related to missing styles
- [ ] Build process works without issues
- [ ] Significant reduction in overall CSS
- [ ] Maintained visual consistency

---

## Task 14: Final Integration Testing

### Description
Comprehensive testing of the complete refactored application including extension packaging, webview functionality, and VS Code integration.

### Acceptance Criteria
- [ ] Extension packages correctly
- [ ] All webview functionality works
- [ ] VS Code integration preserved
- [ ] No regressions in core features
- [ ] Performance meets or exceeds baseline
- [ ] All themes work correctly

### Testing Scope
- Complete extension functionality
- Webview communication with extension
- All user workflows and features
- Theme switching and persistence
- Error handling and edge cases
- Performance under load

### Integration Tests
- Extension activation and deactivation
- Webview creation and communication
- Azure DevOps API integration
- Comment analysis and preview workflow
- Settings and configuration management
- Error recovery and user feedback

### Testing Criteria
- [ ] All extension features work correctly
- [ ] No performance regressions
- [ ] Webview displays properly in all contexts
- [ ] User workflows complete successfully
- [ ] Extension ready for production deployment

---

## Success Metrics

### Technical Achievements
- 30-50% reduction in CSS bundle size
- <100 lines in globals.scss
- Zero visual regressions
- Maintained or improved performance
- Complete Tailwind utility adoption

### Developer Experience Improvements
- Simplified CSS architecture
- Consistent styling patterns
- Improved component maintainability
- Better responsive design patterns
- Enhanced documentation

### Quality Assurance
- All VS Code themes supported
- Accessibility standards maintained
- Mobile-first responsive design
- Production-ready performance
- Comprehensive test coverage

---

This specification provides the detailed roadmap for successfully completing the Tailwind CSS refactoring project while maintaining the quality and functionality of the Azure DevOps PR Code Reviewer extension.