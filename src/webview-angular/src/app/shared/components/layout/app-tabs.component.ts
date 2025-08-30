import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="additionalClasses">
      <div class="flex border-b border-border">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            [class.border-primary]="activeTab === tab.id"
            [class.text-primary]="activeTab === tab.id"
            [class.border-transparent]="activeTab !== tab.id"
            [class.text-muted-foreground]="activeTab !== tab.id"
            [class.opacity-50]="tab.disabled"
            [class.cursor-not-allowed]="tab.disabled"
            [disabled]="tab.disabled"
            (click)="onTabChange(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
      <div class="mt-4">
        @for (tab of tabs; track tab.id) {
          @if (activeTab === tab.id) {
            <div>
              <ng-content [select]="'[data-tab-id=' + tab.id + ']'"></ng-content>
            </div>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTabsComponent {
  @Input() tabs: TabItem[] = [];
  @Input() activeTab = '';
  @Input() additionalClasses = '';
  @Output() tabChange = new EventEmitter<string>();

  onTabChange(tabId: string): void {
    if (this.tabs.find(tab => tab.id === tabId)?.disabled) return;
    this.activeTab = tabId;
    this.tabChange.emit(tabId);
  }
}