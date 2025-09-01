// UI Component Library
export * from './button';
export * from './form';
export * from './data-display';
export * from './feedback';

// Component collections for easy importing
export const UI_COMPONENTS = {
  // Button components
  AppButtonComponent: () => import('./button').then(m => m.AppButtonComponent),
  
  // Form components
  AppInputComponent: () => import('./form').then(m => m.AppInputComponent),
  AppSelectComponent: () => import('./form').then(m => m.AppSelectComponent),
  AppCheckboxComponent: () => import('./form').then(m => m.AppCheckboxComponent),
  
  // Data display components
  AppCardComponent: () => import('./data-display').then(m => m.AppCardComponent),
  AppBadgeComponent: () => import('./data-display').then(m => m.AppBadgeComponent),
  AppTableComponent: () => import('./data-display').then(m => m.AppTableComponent),
  AppTableRowComponent: () => import('./data-display').then(m => m.AppTableRowComponent),
  AppTableCellComponent: () => import('./data-display').then(m => m.AppTableCellComponent),
  
  // Feedback components
  AppAlertComponent: () => import('./feedback').then(m => m.AppAlertComponent),
} as const;