import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ff-configuration',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationComponent {}

