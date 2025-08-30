import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { BrnAccordionImports } from '@spartan-ng/brain/accordion';

export interface AccordionItem {
  id: string;
  title: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [CommonModule, BrnAccordionImports, HlmAccordionImports],
  template: `
    <brn-accordion hlmAccordion [class]="additionalClasses">
      @for (item of items; track item.id) {
        <brn-accordion-item hlmAccordionItem>
          <brn-accordion-trigger hlmAccordionTrigger>{{ item.title }}</brn-accordion-trigger>
          <brn-accordion-content hlmAccordionContent>
            <ng-content [select]="'[data-item-id=' + item.id + ']'"></ng-content>
          </brn-accordion-content>
        </brn-accordion-item>
      }
    </brn-accordion>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppAccordionComponent {
  @Input() items: AccordionItem[] = [];
  @Input() additionalClasses = '';
}