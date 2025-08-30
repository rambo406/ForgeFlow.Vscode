import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Test component for verifying responsive design functionality
 * This component can be temporarily added to test responsive breakpoints
 */
@Component({
  selector: 'app-responsive-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="responsive-test-container p-4 bg-background text-foreground">
      <!-- Breakpoint Indicator -->
      <div class="breakpoint-indicator mb-6 p-4 border border-border rounded-lg bg-surface">
        <h2 class="text-lg font-semibold mb-2">Current Breakpoint</h2>
        <div class="text-2xl font-bold">
          <span class="block vscode-sm:hidden text-red-500">XS (&lt; 576px)</span>
          <span class="hidden vscode-sm:block vscode-md:hidden text-yellow-500">SM (576px+)</span>
          <span class="hidden vscode-md:block vscode-lg:hidden text-blue-500">MD (768px+)</span>
          <span class="hidden vscode-lg:block vscode-xl:hidden text-green-500">LG (1024px+)</span>
          <span class="hidden vscode-xl:block text-purple-500">XL (1280px+)</span>
        </div>
        <div class="text-sm text-muted-foreground mt-2">
          Resize the VS Code panel to see breakpoint changes
        </div>
      </div>

      <!-- Grid Layout Test -->
      <div class="grid-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Dashboard Grid Layout Test</h3>
        <div class="dashboard-grid gap-4">
          <div class="test-card p-4 bg-primary text-primary-foreground rounded-lg">
            <h4 class="font-medium">Card 1</h4>
            <p class="text-sm opacity-90">Tests grid behavior</p>
          </div>
          <div class="test-card p-4 bg-secondary text-secondary-foreground rounded-lg">
            <h4 class="font-medium">Card 2</h4>
            <p class="text-sm opacity-90">Responsive layout</p>
          </div>
          <div class="test-card p-4 bg-muted text-foreground rounded-lg">
            <h4 class="font-medium">Card 3</h4>
            <p class="text-sm opacity-90">Column adaptation</p>
          </div>
          <div class="test-card p-4 border border-border rounded-lg">
            <h4 class="font-medium">Card 4</h4>
            <p class="text-sm text-muted-foreground">Overflow test</p>
          </div>
        </div>
      </div>

      <!-- Comment Preview Grid Test -->
      <div class="comment-grid-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Comment Preview Grid Test</h3>
        <div class="comment-preview-grid gap-3">
          <div class="comment-card p-3 border border-border rounded-lg bg-surface">
            <div class="flex items-center gap-2 mb-2">
              <span class="badge-error">Error</span>
              <span class="text-sm text-muted-foreground">file.ts:25</span>
            </div>
            <p class="text-sm">This is a test comment for responsive layout testing.</p>
          </div>
          <div class="comment-card p-3 border border-border rounded-lg bg-surface">
            <div class="flex items-center gap-2 mb-2">
              <span class="badge-warning">Warning</span>
              <span class="text-sm text-muted-foreground">file.ts:42</span>
            </div>
            <p class="text-sm">Another test comment to verify grid behavior.</p>
          </div>
          <div class="comment-card p-3 border border-border rounded-lg bg-surface">
            <div class="flex items-center gap-2 mb-2">
              <span class="badge-info">Info</span>
              <span class="text-sm text-muted-foreground">file.ts:67</span>
            </div>
            <p class="text-sm">Third comment for testing column wrapping.</p>
          </div>
        </div>
      </div>

      <!-- Flex Layout Test -->
      <div class="flex-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Responsive Flex Layout Test</h3>
        <div class="flex-responsive gap-4">
          <div class="flex-1 p-4 bg-primary text-primary-foreground rounded-lg">
            <h4 class="font-medium">Main Content</h4>
            <p class="text-sm opacity-90">Should be full width on small screens</p>
          </div>
          <div class="w-full vscode-md:w-64 p-4 border border-border rounded-lg bg-surface">
            <h4 class="font-medium">Sidebar</h4>
            <p class="text-sm text-muted-foreground">Stacks on small screens</p>
          </div>
        </div>
      </div>

      <!-- Button Test -->
      <div class="button-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Responsive Button Test</h3>
        <div class="space-responsive">
          <button class="btn-vscode-primary btn-responsive">
            Primary Button
          </button>
          <button class="btn-vscode-secondary btn-responsive">
            Secondary Button
          </button>
          <button class="btn-vscode-primary btn-responsive">
            Long Button Text That Tests Wrapping
          </button>
        </div>
      </div>

      <!-- Form Test -->
      <div class="form-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Responsive Form Test</h3>
        <div class="space-y-4">
          <div class="form-group-inline">
            <label class="form-label form-label-inline">
              Field Label:
            </label>
            <input type="text" class="input-vscode flex-1" placeholder="Test input field">
          </div>
          <div class="form-group-inline">
            <label class="form-label form-label-inline">
              Long Label Name:
            </label>
            <select class="input-vscode flex-1">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Table Test -->
      <div class="table-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Responsive Table Test</h3>
        <div class="table-responsive">
          <table class="table-vscode">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th class="hide-vscode-sm">Author</th>
                <th class="hide-vscode-md">Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="ID">1</td>
                <td data-label="Title">Test Pull Request</td>
                <td data-label="Author" class="hide-vscode-sm">John Doe</td>
                <td data-label="Date" class="hide-vscode-md">2024-01-15</td>
                <td data-label="Status">
                  <span class="badge-info">Active</span>
                </td>
              </tr>
              <tr>
                <td data-label="ID">2</td>
                <td data-label="Title">Another PR for Testing</td>
                <td data-label="Author" class="hide-vscode-sm">Jane Smith</td>
                <td data-label="Date" class="hide-vscode-md">2024-01-14</td>
                <td data-label="Status">
                  <span class="badge-warning">Review</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Container Test -->
      <div class="container-test mb-6">
        <h3 class="text-lg font-semibold mb-3">Container Responsiveness Test</h3>
        <div class="container-vscode bg-muted/20 border border-border rounded-lg p-4">
          <p class="text-sm text-muted-foreground">
            This container uses the responsive container utility class.
            It should have appropriate max-widths and centering at different breakpoints.
          </p>
        </div>
      </div>

      <!-- Viewport Information -->
      <div class="viewport-info p-4 bg-muted/10 border border-border rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Viewport Information</h3>
        <div class="text-sm space-y-1">
          <div>Window Width: <span id="window-width">-</span>px</div>
          <div>Window Height: <span id="window-height">-</span>px</div>
          <div>Device Pixel Ratio: <span id="device-pixel-ratio">-</span></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .responsive-test-container {
      max-width: 100%;
      overflow-x: hidden;
    }

    .test-card {
      min-height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .comment-card {
      min-height: 80px;
    }

    /* Demonstration of responsive utilities */
    @media (max-width: 575px) {
      .btn-responsive {
        width: 100%;
        margin-bottom: 8px;
      }
    }
  `]
})
export class ResponsiveTestComponent {
  
  ngOnInit() {
    this.updateViewportInfo();
    window.addEventListener('resize', () => this.updateViewportInfo());
  }

  private updateViewportInfo() {
    const widthElement = document.getElementById('window-width');
    const heightElement = document.getElementById('window-height');
    const dprElement = document.getElementById('device-pixel-ratio');

    if (widthElement) widthElement.textContent = window.innerWidth.toString();
    if (heightElement) heightElement.textContent = window.innerHeight.toString();
    if (dprElement) dprElement.textContent = window.devicePixelRatio.toString();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.updateViewportInfo());
  }
}