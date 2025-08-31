import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, HlmCardImports],
  template: `
    <div 
      hlmCard 
      [class]="additionalClasses"
      class="transition-all duration-vscode hover:shadow-vscode-md"
    >
      @if (title || subtitle) {
        <div hlmCardHeader class="pb-vscode-md">
          <div class="flex flex-col vscode-sm:flex-row vscode-sm:items-start vscode-sm:justify-between gap-vscode-sm">
            <div class="flex-1 min-w-0">
              @if (title) {
                <h3 hlmCardTitle class="text-base vscode-sm:text-lg truncate">{{ title }}</h3>
              }
              @if (subtitle) {
                <p hlmCardDescription class="text-vscode-sm text-muted-foreground mt-vscode-xs">{{ subtitle }}</p>
              }
            </div>
            @if (hasHeaderActions) {
              <div class="flex-shrink-0 w-full vscode-sm:w-auto">
                <ng-content select="[slot=header-actions]"></ng-content>
              </div>
            }
          </div>
        </div>
      }
      <div hlmCardContent class="pt-0">
        <ng-content></ng-content>
      </div>
      @if (hasFooter) {
        <div hlmCardFooter class="pt-vscode-md">
          <div class="flex flex-col vscode-sm:flex-row gap-vscode-sm vscode-sm:gap-vscode-md vscode-sm:items-center vscode-sm:justify-between">
            <ng-content select="[slot=footer]"></ng-content>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Enhanced card responsive behavior */
    .card-compact {
      padding: var(--spacing-vscode-sm);
    }
    
    .card-compact .hlm-card-header {
      padding-bottom: var(--spacing-vscode-sm);
    }
    
    .card-compact .hlm-card-footer {
      padding-top: var(--spacing-vscode-sm);
    }
    
    /* Mobile optimizations */
    @media (max-width: 575px) {
      .hlm-card {
        border-radius: var(--border-radius-vscode-sm);
        margin: var(--spacing-vscode-xs);
      }
      
      .hlm-card-title {
        font-size: var(--font-size-vscode-sm);
        line-height: 1.4;
      }
      
      .hlm-card-description {
        font-size: var(--font-size-vscode-xs);
      }
    }
    
    /* Touch-friendly hover states */
    @media (hover: hover) {
      .hlm-card:hover {
        transform: translateY(-1px);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() hasFooter = false;
  @Input() hasHeaderActions = false;
  @Input() additionalClasses = '';
}