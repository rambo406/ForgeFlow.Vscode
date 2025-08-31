import * as ts from 'typescript';
import { ImportStatement } from './types';

/**
 * Import statement manager for handling TypeScript imports during migration
 * Manages existing imports, adds new imports, and resolves conflicts
 */

/**
 * Configuration for import management
 */
export interface ImportManagerConfig {
  preserveOriginalOrder: boolean;
  groupImports: boolean;
  removeUnusedImports: boolean;
  sortImports: boolean;
  addComments: boolean;
  validateImports: boolean;
}

/**
 * Default configuration for import management
 */
export const DEFAULT_IMPORT_CONFIG: ImportManagerConfig = {
  preserveOriginalOrder: false,
  groupImports: true,
  removeUnusedImports: false, // Conservative approach
  sortImports: true,
  addComments: true,
  validateImports: true
};

/**
 * Result of import analysis
 */
export interface ImportAnalysisResult {
  existingImports: ImportStatement[];
  duplicateImports: Array<{
    modulePath: string;
    duplicatedImports: string[];
  }>;
  conflictingImports: Array<{
    importName: string;
    modules: string[];
  }>;
  unusedImports: string[];
  missingImports: ImportStatement[];
}

/**
 * Result of import management operations
 */
export interface ImportUpdateResult {
  updatedImports: ImportStatement[];
  addedImports: ImportStatement[];
  modifiedImports: ImportStatement[];
  removedImports: ImportStatement[];
  conflicts: Array<{
    importName: string;
    resolution: string;
  }>;
  warnings: string[];
  importStatements: string[];
}

/**
 * Analyzes existing imports in a TypeScript source file
 */
export function analyzeExistingImports(sourceFile: ts.SourceFile): ImportAnalysisResult {
  const existingImports: ImportStatement[] = [];
  const moduleImportMap = new Map<string, Set<string>>();
  const importNameModuleMap = new Map<string, Set<string>>();
  
  // Extract all import statements
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const importInfo = extractImportFromNode(node);
      if (importInfo) {
        existingImports.push(importInfo);
        
        // Track imports by module
        if (!moduleImportMap.has(importInfo.modulePath)) {
          moduleImportMap.set(importInfo.modulePath, new Set());
        }
        importInfo.namedImports.forEach(namedImport => {
          moduleImportMap.get(importInfo.modulePath)!.add(namedImport);
        });
        
        // Track modules by import name
        importInfo.namedImports.forEach(namedImport => {
          if (!importNameModuleMap.has(namedImport)) {
            importNameModuleMap.set(namedImport, new Set());
          }
          importNameModuleMap.get(namedImport)!.add(importInfo.modulePath);
        });
        
        if (importInfo.defaultImport) {
          if (!importNameModuleMap.has(importInfo.defaultImport)) {
            importNameModuleMap.set(importInfo.defaultImport, new Set());
          }
          importNameModuleMap.get(importInfo.defaultImport)!.add(importInfo.modulePath);
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  // Find duplicates
  const duplicateImports: Array<{ modulePath: string; duplicatedImports: string[] }> = [];
  moduleImportMap.forEach((imports, modulePath) => {
    if (imports.size > 0) {
      // Check if same module is imported multiple times
      const moduleImports = existingImports.filter(imp => imp.modulePath === modulePath);
      if (moduleImports.length > 1) {
        const allImports = new Set<string>();
        moduleImports.forEach(imp => {
          imp.namedImports.forEach(namedImport => allImports.add(namedImport));
        });
        
        if (allImports.size < moduleImports.reduce((total, imp) => total + imp.namedImports.length, 0)) {
          duplicateImports.push({
            modulePath,
            duplicatedImports: Array.from(allImports)
          });
        }
      }
    }
  });
  
  // Find conflicts
  const conflictingImports: Array<{ importName: string; modules: string[] }> = [];
  importNameModuleMap.forEach((modules, importName) => {
    if (modules.size > 1) {
      conflictingImports.push({
        importName,
        modules: Array.from(modules)
      });
    }
  });
  
  return {
    existingImports,
    duplicateImports,
    conflictingImports,
    unusedImports: [], // Would require full code analysis
    missingImports: []
  };
}

/**
 * Extracts import information from a TypeScript import declaration node
 */
function extractImportFromNode(node: ts.ImportDeclaration): ImportStatement | null {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return null;
  }
  
  const modulePath = node.moduleSpecifier.text;
  const namedImports: string[] = [];
  let defaultImport: string | undefined;
  let namespaceImport: string | undefined;
  
  if (node.importClause) {
    // Default import
    if (node.importClause.name) {
      defaultImport = node.importClause.name.text;
    }
    
    // Named imports and namespace imports
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          namedImports.push(element.name.text);
        });
      } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        namespaceImport = node.importClause.namedBindings.name.text;
      }
    }
  }
  
  return {
    modulePath,
    namedImports,
    defaultImport,
    namespaceImport
  };
}

/**
 * Merges new imports with existing imports, handling conflicts and duplicates
 */
export function mergeImports(
  existingImports: ImportStatement[],
  newImports: ImportStatement[],
  config: ImportManagerConfig = DEFAULT_IMPORT_CONFIG
): ImportUpdateResult {
  const updatedImports: ImportStatement[] = [];
  const addedImports: ImportStatement[] = [];
  const modifiedImports: ImportStatement[] = [];
  const removedImports: ImportStatement[] = [];
  const conflicts: Array<{ importName: string; resolution: string }> = [];
  const warnings: string[] = [];
  
  // Create a map of existing imports by module path
  const existingImportMap = new Map<string, ImportStatement>();
  existingImports.forEach(imp => {
    existingImportMap.set(imp.modulePath, imp);
  });
  
  // Process new imports
  newImports.forEach(newImport => {
    const existing = existingImportMap.get(newImport.modulePath);
    
    if (existing) {
      // Merge with existing import
      const mergedImport = mergeImportStatements(existing, newImport);
      
      if (hasImportChanged(existing, mergedImport)) {
        modifiedImports.push(mergedImport);
        existingImportMap.set(newImport.modulePath, mergedImport);
      }
    } else {
      // Add new import
      addedImports.push(newImport);
      existingImportMap.set(newImport.modulePath, newImport);
    }
  });
  
  // Check for conflicts
  const importNameToModules = new Map<string, string[]>();
  existingImportMap.forEach((importStmt, modulePath) => {
    importStmt.namedImports.forEach(namedImport => {
      if (!importNameToModules.has(namedImport)) {
        importNameToModules.set(namedImport, []);
      }
      importNameToModules.get(namedImport)!.push(modulePath);
    });
    
    if (importStmt.defaultImport) {
      if (!importNameToModules.has(importStmt.defaultImport)) {
        importNameToModules.set(importStmt.defaultImport, []);
      }
      importNameToModules.get(importStmt.defaultImport)!.push(modulePath);
    }
  });
  
  // Detect and resolve conflicts
  importNameToModules.forEach((modules, importName) => {
    if (modules.length > 1) {
      const resolution = resolveImportConflict(importName, modules);
      conflicts.push({ importName, resolution });
      
      if (resolution.includes('renamed')) {
        warnings.push(`Import conflict detected for '${importName}' from modules: ${modules.join(', ')}`);
      }
    }
  });
  
  // Create final import list
  updatedImports.push(...Array.from(existingImportMap.values()));
  
  // Sort and group imports if configured
  if (config.groupImports) {
    updatedImports.sort((a, b) => {
      const aGroup = getImportGroup(a.modulePath);
      const bGroup = getImportGroup(b.modulePath);
      
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }
      
      return config.sortImports ? a.modulePath.localeCompare(b.modulePath) : 0;
    });
  }
  
  // Generate import statements
  const importStatements = updatedImports.map(imp => generateImportStatement(imp, config));
  
  return {
    updatedImports,
    addedImports,
    modifiedImports,
    removedImports,
    conflicts,
    warnings,
    importStatements
  };
}

/**
 * Merges two import statements for the same module
 */
function mergeImportStatements(existing: ImportStatement, newImport: ImportStatement): ImportStatement {
  const mergedNamedImports = Array.from(new Set([...existing.namedImports, ...newImport.namedImports]));
  
  return {
    modulePath: existing.modulePath,
    namedImports: mergedNamedImports,
    defaultImport: existing.defaultImport || newImport.defaultImport,
    namespaceImport: existing.namespaceImport || newImport.namespaceImport
  };
}

/**
 * Checks if an import statement has changed
 */
function hasImportChanged(original: ImportStatement, updated: ImportStatement): boolean {
  if (original.namedImports.length !== updated.namedImports.length) {
    return true;
  }
  
  const originalSet = new Set(original.namedImports);
  const updatedSet = new Set(updated.namedImports);
  
  for (const imp of Array.from(updatedSet)) {
    if (!originalSet.has(imp)) {
      return true;
    }
  }
  
  return original.defaultImport !== updated.defaultImport ||
         original.namespaceImport !== updated.namespaceImport;
}

/**
 * Resolves import naming conflicts
 */
function resolveImportConflict(importName: string, modules: string[]): string {
  // Strategy: Keep the first import, rename subsequent ones
  if (modules.length === 2) {
    const primaryModule = modules[0];
    const conflictingModule = modules[1];
    
    // Generate a unique name for the conflicting import
    const conflictingModuleName = conflictingModule.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'Module';
    const renamedImport = `${importName}From${conflictingModuleName}`;
    
    return `Renamed '${importName}' from '${conflictingModule}' to '${renamedImport}'`;
  }
  
  return `Multiple conflicts detected for '${importName}' - manual resolution required`;
}

/**
 * Gets import group for sorting (lower numbers = higher priority)
 */
function getImportGroup(modulePath: string): number {
  // 1. Node.js built-ins
  if (!modulePath.startsWith('.') && !modulePath.startsWith('@') && !modulePath.includes('/')) {
    return 1;
  }
  
  // 2. External packages (@ngrx, rxjs, etc.)
  if (modulePath.startsWith('@') || (!modulePath.startsWith('.') && modulePath.includes('/'))) {
    return 2;
  }
  
  // 3. Relative imports
  if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
    return 3;
  }
  
  // 4. Everything else
  return 4;
}

/**
 * Generates import statement string from ImportStatement object
 */
function generateImportStatement(importStmt: ImportStatement, config: ImportManagerConfig): string {
  const parts: string[] = [];
  
  // Handle default import
  if (importStmt.defaultImport) {
    parts.push(importStmt.defaultImport);
  }
  
  // Handle namespace import
  if (importStmt.namespaceImport) {
    parts.push(`* as ${importStmt.namespaceImport}`);
  }
  
  // Handle named imports
  if (importStmt.namedImports.length > 0) {
    const namedImports = config.sortImports 
      ? importStmt.namedImports.slice().sort()
      : importStmt.namedImports;
    
    // Format named imports based on length
    if (namedImports.length <= 3) {
      parts.push(`{ ${namedImports.join(', ')} }`);
    } else {
      parts.push(`{\n  ${namedImports.join(',\n  ')}\n}`);
    }
  }
  
  const importClause = parts.join(', ');
  const statement = `import ${importClause} from '${importStmt.modulePath}';`;
  
  // Add comment if this is a new import
  if (config.addComments && isNewImportForMigration(importStmt)) {
    return `// Added for async/await to RxMethod migration\n${statement}`;
  }
  
  return statement;
}

/**
 * Checks if an import is new for the migration (heuristic)
 */
function isNewImportForMigration(importStmt: ImportStatement): boolean {
  // Check for migration-related imports
  const migrationImports = ['rxMethod', 'pipe', 'switchMap', 'tap', 'finalize', 'from', 'lastValueFrom', 'catchError', 'EMPTY'];
  const utilityModules = ['../../../utils/RxMethodUtils'];
  
  return migrationImports.some(imp => importStmt.namedImports.includes(imp)) ||
         utilityModules.includes(importStmt.modulePath);
}

/**
 * Validates import statements for common issues
 */
export function validateImports(imports: ImportStatement[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  imports.forEach(importStmt => {
    // Check for empty imports
    if (importStmt.namedImports.length === 0 && !importStmt.defaultImport && !importStmt.namespaceImport) {
      errors.push(`Empty import statement for module: ${importStmt.modulePath}`);
    }
    
    // Check for duplicate named imports
    const uniqueNamedImports = new Set(importStmt.namedImports);
    if (uniqueNamedImports.size !== importStmt.namedImports.length) {
      warnings.push(`Duplicate named imports in module: ${importStmt.modulePath}`);
    }
    
    // Check for suspicious module paths
    if (importStmt.modulePath.includes('//') || importStmt.modulePath.endsWith('/')) {
      warnings.push(`Suspicious module path: ${importStmt.modulePath}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generates the complete import section for a file
 */
export function generateImportSection(
  imports: ImportStatement[],
  config: ImportManagerConfig = DEFAULT_IMPORT_CONFIG
): string {
  if (imports.length === 0) {
    return '';
  }
  
  const importStatements = imports.map(imp => generateImportStatement(imp, config));
  
  let result = importStatements.join('\n');
  
  // Add grouping spacing if configured
  if (config.groupImports) {
    result = addImportGroupSpacing(result);
  }
  
  return result + '\n\n';
}

/**
 * Adds spacing between import groups
 */
function addImportGroupSpacing(importSection: string): string {
  const lines = importSection.split('\n');
  const groupedLines: string[] = [];
  let currentGroup = -1;
  
  lines.forEach(line => {
    if (line.trim() === '') return;
    
    const modulePath = extractModulePathFromImportLine(line);
    const group = getImportGroup(modulePath);
    
    if (currentGroup !== -1 && group !== currentGroup) {
      groupedLines.push(''); // Add spacing between groups
    }
    
    groupedLines.push(line);
    currentGroup = group;
  });
  
  return groupedLines.join('\n');
}

/**
 * Extracts module path from an import statement line
 */
function extractModulePathFromImportLine(line: string): string {
  const match = line.match(/from ['"]([^'"]+)['"]/);
  return match ? match[1] : '';
}

/**
 * Creates import statements for RxMethod migration
 */
export function createMigrationImports(): ImportStatement[] {
  return [
    {
      modulePath: '@ngrx/signals/rxjs-interop',
      namedImports: ['rxMethod'],
      defaultImport: undefined,
      namespaceImport: undefined
    },
    {
      modulePath: 'rxjs',
      namedImports: ['pipe', 'switchMap', 'tap', 'finalize', 'from', 'lastValueFrom', 'catchError', 'EMPTY'],
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];
}

/**
 * Creates utility imports for specific patterns
 */
export function createUtilityImports(patterns: string[]): ImportStatement[] {
  const utilityImports: string[] = [];
  
  if (patterns.includes('optimistic-update')) {
    utilityImports.push('createOptimisticUpdatePattern');
  }
  
  if (patterns.includes('bulk-operation')) {
    utilityImports.push('createBulkOperationPattern');
  }
  
  if (patterns.includes('simple-load')) {
    utilityImports.push('createLoadingStatePattern');
  }
  
  if (utilityImports.length === 0) {
    return [];
  }
  
  return [
    {
      modulePath: '../../../utils/RxMethodUtils',
      namedImports: utilityImports,
      defaultImport: undefined,
      namespaceImport: undefined
    }
  ];
}