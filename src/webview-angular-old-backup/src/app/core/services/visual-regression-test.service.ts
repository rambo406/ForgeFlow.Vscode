import { Injectable } from '@angular/core';

export interface VisualSnapshot {
  componentName: string;
  timestamp: number;
  screenshot: string; // Base64 encoded image
  dimensions: {
    width: number;
    height: number;
  };
  hash: string;
}

export interface VisualRegressionResult {
  componentName: string;
  passed: boolean;
  differences: number;
  baseline?: VisualSnapshot;
  current?: VisualSnapshot;
  diffImage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VisualRegressionTestService {
  private baselines = new Map<string, VisualSnapshot>();
  private threshold = 0.05; // 5% difference threshold

  /**
   * Capture visual snapshot of a component
   */
  async captureSnapshot(
    element: HTMLElement, 
    componentName: string
  ): Promise<VisualSnapshot> {
    return new Promise((resolve, reject) => {
      try {
        // Create canvas for screenshot
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        const rect = element.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Use html2canvas-like approach for capturing
        this.drawElementToCanvas(element, canvas, ctx).then(() => {
          const screenshot = canvas.toDataURL('image/png');
          const hash = this.generateImageHash(screenshot);

          const snapshot: VisualSnapshot = {
            componentName,
            timestamp: Date.now(),
            screenshot,
            dimensions: {
              width: rect.width,
              height: rect.height
            },
            hash
          };

          resolve(snapshot);
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Draw element to canvas (simplified implementation)
   */
  private async drawElementToCanvas(
    element: HTMLElement, 
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D
  ): Promise<void> {
    return new Promise((resolve) => {
      // Simplified approach - in production, use html2canvas or similar
      const rect = element.getBoundingClientRect();
      
      // Get computed styles
      const styles = window.getComputedStyle(element);
      
      // Fill background
      ctx.fillStyle = styles.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw borders
      if (styles.borderWidth && styles.borderWidth !== '0px') {
        ctx.strokeStyle = styles.borderColor || '#000000';
        ctx.lineWidth = parseInt(styles.borderWidth) || 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }

      // Draw text content (simplified)
      if (element.textContent) {
        ctx.fillStyle = styles.color || '#000000';
        ctx.font = `${styles.fontSize || '14px'} ${styles.fontFamily || 'Arial'}`;
        ctx.fillText(element.textContent.slice(0, 50), 10, 20);
      }

      // Draw child elements (basic implementation)
      Array.from(element.children).forEach((child, index) => {
        const childRect = child.getBoundingClientRect();
        const childStyles = window.getComputedStyle(child as HTMLElement);
        
        ctx.fillStyle = childStyles.backgroundColor || 'rgba(200, 200, 200, 0.5)';
        ctx.fillRect(
          childRect.left - rect.left,
          childRect.top - rect.top,
          childRect.width,
          childRect.height
        );
      });

      resolve();
    });
  }

  /**
   * Generate simple hash for image comparison
   */
  private generateImageHash(imageData: string): string {
    let hash = 0;
    for (let i = 0; i < imageData.length; i++) {
      const char = imageData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Set baseline snapshot for component
   */
  setBaseline(snapshot: VisualSnapshot): void {
    this.baselines.set(snapshot.componentName, snapshot);
    console.log(`📸 Baseline set for ${snapshot.componentName}`);
  }

  /**
   * Compare current snapshot with baseline
   */
  async compareWithBaseline(
    current: VisualSnapshot
  ): Promise<VisualRegressionResult> {
    const baseline = this.baselines.get(current.componentName);
    
    if (!baseline) {
      console.warn(`No baseline found for ${current.componentName}, setting current as baseline`);
      this.setBaseline(current);
      return {
        componentName: current.componentName,
        passed: true,
        differences: 0,
        current
      };
    }

    // Compare dimensions
    const dimensionsDiff = this.compareDimensions(baseline.dimensions, current.dimensions);
    
    // Compare image hashes (simplified comparison)
    const hashMatch = baseline.hash === current.hash;
    
    // Calculate difference percentage
    const differences = hashMatch ? 0 : dimensionsDiff > 0 ? 1 : 0.5;
    const passed = differences <= this.threshold;

    const result: VisualRegressionResult = {
      componentName: current.componentName,
      passed,
      differences,
      baseline,
      current
    };

    if (!passed) {
      result.diffImage = await this.generateDiffImage(baseline, current);
    }

    return result;
  }

  /**
   * Compare dimensions
   */
  private compareDimensions(
    baseline: { width: number; height: number }, 
    current: { width: number; height: number }
  ): number {
    const widthDiff = Math.abs(baseline.width - current.width) / baseline.width;
    const heightDiff = Math.abs(baseline.height - current.height) / baseline.height;
    return Math.max(widthDiff, heightDiff);
  }

  /**
   * Generate diff image (simplified)
   */
  private async generateDiffImage(
    baseline: VisualSnapshot, 
    current: VisualSnapshot
  ): Promise<string> {
    // Simplified diff generation - in production, use pixelmatch or similar
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    canvas.width = Math.max(baseline.dimensions.width, current.dimensions.width);
    canvas.height = Math.max(baseline.dimensions.height, current.dimensions.height);

    // Draw baseline in red channel
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(0, 0, baseline.dimensions.width, baseline.dimensions.height);

    // Draw current in green channel
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.fillRect(0, 0, current.dimensions.width, current.dimensions.height);

    return canvas.toDataURL('image/png');
  }

  /**
   * Run visual regression test for component
   */
  async testComponent(
    element: HTMLElement, 
    componentName: string
  ): Promise<VisualRegressionResult> {
    console.log(`📸 Testing visual regression for ${componentName}`);
    
    const snapshot = await this.captureSnapshot(element, componentName);
    const result = await this.compareWithBaseline(snapshot);
    
    if (result.passed) {
      console.log(`✅ Visual test passed for ${componentName}`);
    } else {
      console.warn(`❌ Visual regression detected for ${componentName}: ${(result.differences * 100).toFixed(2)}% difference`);
    }

    return result;
  }

  /**
   * Test multiple components
   */
  async testComponents(components: { element: HTMLElement; name: string }[]): Promise<VisualRegressionResult[]> {
    console.log(`📸 Running visual regression tests for ${components.length} components`);
    
    const results: VisualRegressionResult[] = [];
    
    for (const { element, name } of components) {
      try {
        const result = await this.testComponent(element, name);
        results.push(result);
      } catch (error) {
        console.error(`Error testing ${name}:`, error);
        results.push({
          componentName: name,
          passed: false,
          differences: 1,
          diffImage: ''
        });
      }
    }

    return results;
  }

  /**
   * Generate visual regression report
   */
  generateReport(results: VisualRegressionResult[]): void {
    console.group('📸 Visual Regression Test Report');
    
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;
    
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${((passedTests / results.length) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  • ${result.componentName}: ${(result.differences * 100).toFixed(2)}% difference`);
        });
    }

    console.groupEnd();
  }

  /**
   * Set difference threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(1, threshold));
    console.log(`📸 Visual regression threshold set to ${(this.threshold * 100).toFixed(1)}%`);
  }

  /**
   * Clear all baselines
   */
  clearBaselines(): void {
    this.baselines.clear();
    console.log('📸 All visual baselines cleared');
  }

  /**
   * Export baselines for storage
   */
  exportBaselines(): string {
    const data = Array.from(this.baselines.entries()).map(([name, snapshot]) => ({
      name,
      snapshot: {
        ...snapshot,
        screenshot: snapshot.screenshot.slice(0, 100) + '...' // Truncate for export
      }
    }));
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import baselines from storage
   */
  importBaselines(data: string): void {
    try {
      const baselines = JSON.parse(data);
      this.baselines.clear();
      
      baselines.forEach(({ name, snapshot }: any) => {
        this.baselines.set(name, snapshot);
      });
      
      console.log(`📸 Imported ${baselines.length} visual baselines`);
    } catch (error) {
      console.error('Failed to import baselines:', error);
    }
  }
}