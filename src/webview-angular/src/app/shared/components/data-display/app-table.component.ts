import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmTableImports } from '@spartan-ng/helm/table';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, HlmTableImports],
  template: `
    <div class="table-responsive overflow-x-auto -mx-vscode-md vscode-md:mx-0" [class]="additionalClasses">
      <div hlmTable class="min-w-full">
        <table hlmTbl class="w-full">
          <thead hlmThead>
            <tr hlmTr>
              @for (column of columns; track column.key) {
                <th 
                  hlmTh 
                  [class]="getColumnClasses(column)"
                >
                  {{ column.label }}
                </th>
              }
            </tr>
          </thead>
          <tbody hlmTbody>
            <ng-content></ng-content>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .table-responsive {
      -webkit-overflow-scrolling: touch;
    }
    
    /* Mobile responsive table styling */
    @media (max-width: 575px) {
      .table-responsive table {
        border-collapse: separate;
        border-spacing: 0;
      }
      
      .hide-mobile {
        display: none;
      }
    }
    
    @media (max-width: 767px) {
      .hide-tablet {
        display: none;
      }
    }
    
    /* Better touch targets on mobile */
    @media (max-width: 767px) {
      th, td {
        padding: 12px 8px;
        min-height: 44px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() additionalClasses = '';

  protected getColumnClasses(column: TableColumn): string {
    const classes = [];
    
    if (column.sortable) {
      classes.push('cursor-pointer hover:bg-muted/50');
    }
    
    if (column.hideOnMobile) {
      classes.push('hidden vscode-sm:table-cell');
    }
    
    if (column.hideOnTablet) {
      classes.push('hidden vscode-md:table-cell');
    }
    
    return classes.join(' ');
  }
}

@Component({
  selector: 'app-table-row',
  standalone: true,
  imports: [CommonModule, HlmTableImports],
  template: `
    <tr hlmTr [class]="additionalClasses" class="hover:bg-muted/50 transition-colors">
      <ng-content></ng-content>
    </tr>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTableRowComponent {
  @Input() additionalClasses = '';
}

@Component({
  selector: 'app-table-cell',
  standalone: true,
  imports: [CommonModule, HlmTableImports],
  template: `
    <td 
      hlmTd 
      [class]="additionalClasses"
      [attr.data-label]="mobileLabel"
      class="relative"
    >
      <ng-content></ng-content>
    </td>
  `,
  styles: [`
    /* Mobile card-style layout */
    @media (max-width: 575px) {
      td[data-label]:before {
        content: attr(data-label) ": ";
        font-weight: 600;
        color: var(--vscode-foreground);
        display: inline-block;
        min-width: 100px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTableCellComponent {
  @Input() additionalClasses = '';
  @Input() mobileLabel = '';
}