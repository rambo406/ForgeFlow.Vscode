import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmTableImports } from '@spartan-ng/helm/table';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, HlmTableImports],
  template: `
    <div hlmTable [class]="additionalClasses">
      <table hlmTbl>
        <thead hlmThead>
          <tr hlmTr>
            @for (column of columns; track column.key) {
              <th hlmTh [class]="column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() additionalClasses = '';
}

@Component({
  selector: 'app-table-row',
  standalone: true,
  imports: [CommonModule, HlmTableImports],
  template: `
    <tr hlmTr [class]="additionalClasses">
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
    <td hlmTd [class]="additionalClasses">
      <ng-content></ng-content>
    </td>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTableCellComponent {
  @Input() additionalClasses = '';
}