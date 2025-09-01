import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppButtonComponent } from './button/app-button.component';
import { AppInputComponent } from './form/app-input.component';
import { AppFormFieldComponent } from './form/app-form-field.component';
import { AppCardComponent } from './data-display/app-card.component';
import { AppTableComponent, AppTableRowComponent, AppTableCellComponent } from './data-display/app-table.component';
import { AppBadgeComponent } from './data-display/app-badge.component';

/**
 * Theme testing component for visual regression testing across VS Code themes
 * Tests all components in light, dark, and high-contrast themes
 */
@Component({
  selector: 'app-theme-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppButtonComponent,
    AppInputComponent,
    AppFormFieldComponent,
    AppCardComponent,
    AppTableComponent,
    AppTableRowComponent,
    AppTableCellComponent,
    AppBadgeComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="theme-test-container p-vscode-lg bg-background text-foreground">
      <!-- Theme Information Header -->
      <div class="panel-vscode bg-surface border border-border mb-vscode-xl">
        <div class="p-vscode-lg">
          <h1 class="text-xl font-bold mb-vscode-md">VS Code Theme Visual Regression Test</h1>
          <div class="grid grid-cols-1 vscode-md:grid-cols-3 gap-vscode-md text-vscode-sm">
            <div>
              <strong>Current Theme:</strong> 
              <span id="current-theme" class="text-vscode-info">{{ getCurrentTheme() }}</span>
            </div>
            <div>
              <strong>Body Classes:</strong> 
              <span class="font-mono text-vscode-xs">{{ getBodyClasses() }}</span>
            </div>
            <div>
              <strong>Theme Kind:</strong> 
              <span class="text-vscode-warning">{{ getThemeKind() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Theme Color Palette Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Color Palette & Theme Integration</h2>
        <div class="grid grid-cols-2 vscode-md:grid-cols-4 gap-vscode-md">
          <!-- Primary Colors -->
          <div class="space-y-vscode-sm">
            <h3 class="text-vscode-sm font-medium">Primary Colors</h3>
            <div class="color-swatch bg-vscode-primary text-vscode-primary-foreground p-vscode-sm rounded">Primary</div>
            <div class="color-swatch bg-vscode-secondary text-vscode-secondary-foreground p-vscode-sm rounded border border-border">Secondary</div>
          </div>

          <!-- State Colors -->
          <div class="space-y-vscode-sm">
            <h3 class="text-vscode-sm font-medium">State Colors</h3>
            <div class="color-swatch bg-vscode-error text-white p-vscode-sm rounded">Error</div>
            <div class="color-swatch bg-vscode-warning text-black p-vscode-sm rounded">Warning</div>
            <div class="color-swatch bg-vscode-info text-white p-vscode-sm rounded">Info</div>
            <div class="color-swatch bg-vscode-success text-white p-vscode-sm rounded">Success</div>
          </div>

          <!-- Surface Colors -->
          <div class="space-y-vscode-sm">
            <h3 class="text-vscode-sm font-medium">Surface Colors</h3>
            <div class="color-swatch bg-background border border-border p-vscode-sm rounded">Background</div>
            <div class="color-swatch bg-surface border border-border p-vscode-sm rounded">Surface</div>
            <div class="color-swatch bg-muted text-muted-foreground p-vscode-sm rounded">Muted</div>
          </div>

          <!-- Text Colors -->
          <div class="space-y-vscode-sm">
            <h3 class="text-vscode-sm font-medium">Text Colors</h3>
            <div class="color-swatch text-foreground p-vscode-sm">Foreground</div>
            <div class="color-swatch text-muted-foreground p-vscode-sm">Muted</div>
            <div class="color-swatch text-vscode-error p-vscode-sm">Error Text</div>
            <div class="color-swatch text-vscode-warning p-vscode-sm">Warning Text</div>
          </div>
        </div>
      </section>

      <!-- Button Component Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Button Components</h2>
        <div class="grid grid-cols-1 vscode-md:grid-cols-2 gap-vscode-lg">
          <!-- Button Variants -->
          <div class="panel-vscode bg-surface p-vscode-lg">
            <h3 class="text-vscode-md font-medium mb-vscode-md">Button Variants</h3>
            <div class="space-y-vscode-md">
              <div class="flex flex-wrap gap-vscode-sm">
                <app-button variant="default">Primary Button</app-button>
                <app-button variant="secondary">Secondary Button</app-button>
                <app-button variant="outline">Outline Button</app-button>
                <app-button variant="ghost">Ghost Button</app-button>
              </div>
              <div class="flex flex-wrap gap-vscode-sm">
                <app-button variant="destructive">Destructive</app-button>
                <app-button variant="link">Link Button</app-button>
                <app-button disabled="true">Disabled</app-button>
              </div>
            </div>
          </div>

          <!-- Button Sizes -->
          <div class="panel-vscode bg-surface p-vscode-lg">
            <h3 class="text-vscode-md font-medium mb-vscode-md">Button Sizes</h3>
            <div class="space-y-vscode-md">
              <div class="flex flex-wrap items-center gap-vscode-sm">
                <app-button size="sm">Small Button</app-button>
                <app-button size="default">Default Button</app-button>
                <app-button size="lg">Large Button</app-button>
              </div>
              <div class="flex gap-vscode-sm">
                <app-button additionalClasses="w-full vscode-sm:w-auto">Responsive Button</app-button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Form Components Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Form Components</h2>
        <div class="grid grid-cols-1 vscode-lg:grid-cols-2 gap-vscode-lg">
          <!-- Input Fields -->
          <div class="panel-vscode bg-surface p-vscode-lg">
            <h3 class="text-vscode-md font-medium mb-vscode-md">Input Fields</h3>
            <div class="space-y-vscode-lg">
              <app-form-field label="Standard Input" helpText="Help text example">
                <app-input placeholder="Enter text here..." />
              </app-form-field>
              
              <app-form-field label="Required Field" [required]="true">
                <app-input placeholder="Required input" />
              </app-form-field>
              
              <app-form-field label="Error State" error="This field has an error">
                <app-input additionalClasses="input-vscode-error" placeholder="Error input" />
              </app-form-field>

              <app-form-field label="Disabled Field">
                <app-input [disabled]="true" placeholder="Disabled input" />
              </app-form-field>
            </div>
          </div>

          <!-- Form Controls -->
          <div class="panel-vscode bg-surface p-vscode-lg">
            <h3 class="text-vscode-md font-medium mb-vscode-md">Form Controls</h3>
            <div class="space-y-vscode-lg">
              <!-- Checkbox -->
              <div class="flex items-center gap-vscode-sm">
                <input type="checkbox" id="test-checkbox" class="input-vscode" />
                <label for="test-checkbox" class="text-vscode-sm">Checkbox control</label>
              </div>

              <!-- Radio buttons -->
              <div class="space-y-vscode-xs">
                <label class="text-vscode-sm font-medium">Radio Options:</label>
                <div class="flex flex-col gap-vscode-xs">
                  <div class="flex items-center gap-vscode-sm">
                    <input type="radio" name="test-radio" id="radio1" class="input-vscode" />
                    <label for="radio1" class="text-vscode-sm">Option 1</label>
                  </div>
                  <div class="flex items-center gap-vscode-sm">
                    <input type="radio" name="test-radio" id="radio2" class="input-vscode" />
                    <label for="radio2" class="text-vscode-sm">Option 2</label>
                  </div>
                </div>
              </div>

              <!-- Textarea -->
              <app-form-field label="Textarea">
                <textarea class="input-vscode w-full resize-y" rows="3" placeholder="Enter multiline text..."></textarea>
              </app-form-field>
            </div>
          </div>
        </div>
      </section>

      <!-- Card Components Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Card Components</h2>
        <div class="grid grid-cols-1 vscode-md:grid-cols-2 vscode-xl:grid-cols-3 gap-vscode-lg">
          <!-- Basic Card -->
          <app-card 
            title="Basic Card" 
            subtitle="Simple card component"
            additionalClasses="card-vscode"
          >
            <p class="text-vscode-sm">This is a basic card component with title, subtitle, and content area.</p>
          </app-card>

          <!-- Card with Actions -->
          <app-card 
            title="Interactive Card" 
            subtitle="Card with header actions"
            [hasHeaderActions]="true"
            [hasFooter]="true"
            additionalClasses="card-vscode"
          >
            <div slot="header-actions">
              <app-button variant="ghost" size="sm">
                <lucide-icon name="more-horizontal" size="16" />
              </app-button>
            </div>
            <p class="text-vscode-sm">Card content with header actions and footer.</p>
            <div slot="footer">
              <app-button variant="outline" size="sm">Cancel</app-button>
              <app-button variant="default" size="sm">Save</app-button>
            </div>
          </app-card>

          <!-- Status Card -->
          <app-card 
            title="Status Card" 
            subtitle="Card with status badges"
            additionalClasses="card-vscode"
          >
            <div class="space-y-vscode-md">
              <div class="flex flex-wrap gap-vscode-sm">
                <app-badge variant="success">Active</app-badge>
                <app-badge variant="warning">Pending</app-badge>
                <app-badge variant="error">Error</app-badge>
                <app-badge variant="info">Info</app-badge>
              </div>
              <p class="text-vscode-sm">Card demonstrating badge components and color states.</p>
            </div>
          </app-card>
        </div>
      </section>

      <!-- Table Components Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Table Components</h2>
        <div class="panel-vscode bg-surface p-vscode-lg">
          <app-table [columns]="tableColumns">
            <app-table-row>
              <app-table-cell mobileLabel="ID">1</app-table-cell>
              <app-table-cell mobileLabel="Name">John Doe</app-table-cell>
              <app-table-cell mobileLabel="Email" additionalClasses="hidden vscode-md:table-cell">john@example.com</app-table-cell>
              <app-table-cell mobileLabel="Status">
                <app-badge variant="success">Active</app-badge>
              </app-table-cell>
            </app-table-row>
            <app-table-row>
              <app-table-cell mobileLabel="ID">2</app-table-cell>
              <app-table-cell mobileLabel="Name">Jane Smith</app-table-cell>
              <app-table-cell mobileLabel="Email" additionalClasses="hidden vscode-md:table-cell">jane@example.com</app-table-cell>
              <app-table-cell mobileLabel="Status">
                <app-badge variant="warning">Pending</app-badge>
              </app-table-cell>
            </app-table-row>
            <app-table-row>
              <app-table-cell mobileLabel="ID">3</app-table-cell>
              <app-table-cell mobileLabel="Name">Bob Johnson</app-table-cell>
              <app-table-cell mobileLabel="Email" additionalClasses="hidden vscode-md:table-cell">bob@example.com</app-table-cell>
              <app-table-cell mobileLabel="Status">
                <app-badge variant="error">Inactive</app-badge>
              </app-table-cell>
            </app-table-row>
          </app-table>
        </div>
      </section>

      <!-- Accessibility & Focus Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Accessibility & Focus States</h2>
        <div class="panel-vscode bg-surface p-vscode-lg">
          <p class="text-vscode-sm text-muted-foreground mb-vscode-md">
            Tab through these elements to test focus indicators across all themes:
          </p>
          <div class="space-y-vscode-md">
            <div class="flex flex-wrap gap-vscode-md">
              <button class="btn-vscode focus-vscode">Focusable Button</button>
              <input type="text" class="input-vscode focus-vscode" placeholder="Focusable input" />
              <a href="#" class="text-vscode-info hover:underline focus-vscode">Focusable Link</a>
            </div>
            
            <div class="text-vscode-sm">
              <p><strong>Focus indicators should be clearly visible in all themes</strong></p>
              <ul class="list-disc list-inside mt-vscode-sm space-y-vscode-xs text-muted-foreground">
                <li>High contrast themes should have enhanced focus borders</li>
                <li>Dark themes should have light focus indicators</li>
                <li>Light themes should have dark focus indicators</li>
                <li>Focus should never be invisible or barely visible</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Theme Switching Test -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Theme Switching Validation</h2>
        <div class="panel-vscode bg-surface p-vscode-lg">
          <div class="grid grid-cols-1 vscode-md:grid-cols-2 gap-vscode-lg">
            <!-- Theme Instructions -->
            <div>
              <h3 class="text-vscode-md font-medium mb-vscode-md">Testing Instructions</h3>
              <ol class="list-decimal list-inside space-y-vscode-xs text-vscode-sm">
                <li>Switch VS Code to Light theme and verify all components look correct</li>
                <li>Switch VS Code to Dark theme and verify theme transition is smooth</li>
                <li>Test High Contrast themes (both light and dark variants)</li>
                <li>Verify color contrast ratios meet accessibility standards</li>
                <li>Check that no elements become invisible or barely visible</li>
                <li>Validate that animations and transitions work in all themes</li>
              </ol>
            </div>

            <!-- Theme Detection -->
            <div>
              <h3 class="text-vscode-md font-medium mb-vscode-md">Current Theme Detection</h3>
              <div class="space-y-vscode-sm text-vscode-sm">
                <div class="flex justify-between">
                  <span>Theme Kind:</span>
                  <span class="font-mono">{{ getThemeKind() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Body Class:</span>
                  <span class="font-mono">{{ getBodyClasses() }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Theme Name:</span>
                  <span class="font-mono">{{ getCurrentTheme() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Responsive Testing -->
      <section class="mb-vscode-xl">
        <h2 class="text-lg font-semibold mb-vscode-lg">Responsive Design Validation</h2>
        <div class="panel-vscode bg-surface p-vscode-lg">
          <div class="mb-vscode-md">
            <h3 class="text-vscode-md font-medium mb-vscode-sm">Current Viewport</h3>
            <div class="text-vscode-sm space-y-vscode-xs">
              <div>Width: <span id="viewport-width" class="font-mono">{{ getViewportWidth() }}px</span></div>
              <div>Height: <span id="viewport-height" class="font-mono">{{ getViewportHeight() }}px</span></div>
              <div>Breakpoint: <span class="font-mono text-vscode-info">{{ getCurrentBreakpoint() }}</span></div>
            </div>
          </div>
          
          <!-- Responsive Grid Test -->
          <div class="responsive-grid grid grid-cols-1 vscode-sm:grid-cols-2 vscode-md:grid-cols-3 vscode-lg:grid-cols-4 gap-vscode-md">
            @for (item of [1, 2, 3, 4, 5, 6, 7, 8]; track item) {
              <div class="bg-muted p-vscode-md rounded text-center text-vscode-sm">
                Grid Item {{ item }}
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Visual Regression Checklist -->
      <section>
        <h2 class="text-lg font-semibold mb-vscode-lg">Visual Regression Checklist</h2>
        <div class="panel-vscode bg-surface p-vscode-lg">
          <div class="grid grid-cols-1 vscode-lg:grid-cols-2 gap-vscode-lg">
            <div>
              <h3 class="text-vscode-md font-medium mb-vscode-md">Light Theme Validation</h3>
              <div class="space-y-vscode-xs text-vscode-sm">
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>All components render correctly</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Text contrast meets WCAG standards</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Focus indicators are clearly visible</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Buttons and controls are functional</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-vscode-md font-medium mb-vscode-md">Dark Theme Validation</h3>
              <div class="space-y-vscode-xs text-vscode-sm">
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>All components render correctly</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Theme transitions are smooth</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>No visual artifacts or flashing</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Color scheme is consistent</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-vscode-md font-medium mb-vscode-md">High Contrast Validation</h3>
              <div class="space-y-vscode-xs text-vscode-sm">
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Enhanced borders and outlines visible</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>All interactive elements identifiable</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Maximum contrast maintained</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>No content becomes invisible</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-vscode-md font-medium mb-vscode-md">Responsive Validation</h3>
              <div class="space-y-vscode-xs text-vscode-sm">
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Mobile layout works on small screens</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Touch targets are 44px+ on mobile</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>Content reflows correctly</span>
                </label>
                <label class="flex items-center gap-vscode-sm">
                  <input type="checkbox" class="input-vscode">
                  <span>No horizontal scrolling required</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .theme-test-container {
      font-family: var(--vscode-font-family);
      line-height: 1.5;
    }

    .color-swatch {
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-vscode-xs);
      font-weight: 500;
    }

    /* Enhanced focus styles for testing */
    .focus-vscode:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    /* High contrast enhancements */
    @media (prefers-contrast: high) {
      .color-swatch {
        border: 2px solid currentColor;
      }
      
      .focus-vscode:focus {
        outline-width: 3px;
        outline-offset: 3px;
      }
    }

    /* Animation testing */
    .transition-test {
      transition: all 0.3s ease;
    }

    .transition-test:hover {
      transform: scale(1.05);
    }

    /* Grid debugging for responsive testing */
    .responsive-grid > div {
      position: relative;
    }

    .responsive-grid > div::before {
      content: attr(data-breakpoint);
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 10px;
      opacity: 0.6;
    }

    /* Print styles for documentation */
    @media print {
      .theme-test-container {
        color: black !important;
        background: white !important;
      }
    }
  `]
})
export class ThemeTestComponent implements OnInit {
  
  tableColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', hideOnMobile: true },
    { key: 'status', label: 'Status' }
  ];

  ngOnInit() {
    this.updateViewportInfo();
    window.addEventListener('resize', () => this.updateViewportInfo());
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.updateViewportInfo());
  }

  protected getCurrentTheme(): string {
    const html = document.documentElement;
    const themeKind = html.getAttribute('data-vscode-theme-kind') || 'unknown';
    const themeName = html.getAttribute('data-vscode-theme-name') || 'unknown';
    return `${themeName} (${themeKind})`;
  }

  protected getThemeKind(): string {
    return document.documentElement.getAttribute('data-vscode-theme-kind') || 'vscode-dark';
  }

  protected getBodyClasses(): string {
    return document.body.className || 'none';
  }

  protected getViewportWidth(): number {
    return window.innerWidth;
  }

  protected getViewportHeight(): number {
    return window.innerHeight;
  }

  protected getCurrentBreakpoint(): string {
    const width = window.innerWidth;
    if (width >= 1280) return 'vscode-xl (1280px+)';
    if (width >= 1024) return 'vscode-lg (1024px+)';
    if (width >= 768) return 'vscode-md (768px+)';
    if (width >= 576) return 'vscode-sm (576px+)';
    return 'xs (<576px)';
  }

  private updateViewportInfo() {
    // Update viewport info in real-time
    const widthEl = document.getElementById('viewport-width');
    const heightEl = document.getElementById('viewport-height');
    
    if (widthEl) widthEl.textContent = `${this.getViewportWidth()}px`;
    if (heightEl) heightEl.textContent = `${this.getViewportHeight()}px`;
  }
}