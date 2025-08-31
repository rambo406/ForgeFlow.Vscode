import * as ts from 'typescript';
import * as path from 'path';
import { 
  AsyncMethodPattern, 
  MethodParameter, 
  ImportStatement,
  PatternContext
} from './types';
import { readStoreFile, findStoreFiles } from './file-utils';

/**
 * TypeScript AST parser for identifying async methods in store files
 */

/**
 * Scans a directory recursively to find all .store.ts files
 */
export async function discoverStoreFiles(rootDirectory: string): Promise<string[]> {
  console.log(`Scanning for .store.ts files in: ${rootDirectory}`);
  
  const storeFiles = await findStoreFiles(rootDirectory);
  
  console.log(`Found ${storeFiles.length} store files:`);
  storeFiles.forEach(file => console.log(`  - ${path.relative(rootDirectory, file)}`));
  
  return storeFiles;
}

/**
 * Parses a TypeScript file and extracts async method information
 */
export async function parseStoreFile(filePath: string): Promise<{
  asyncMethods: AsyncMethodPattern[];
  context: PatternContext;
  sourceFile: ts.SourceFile;
}> {
  const content = await readStoreFile(filePath);
  
  // Create TypeScript source file for AST parsing
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  
  const asyncMethods: AsyncMethodPattern[] = [];
  const context = extractPatternContext(sourceFile);
  
  // Visit all nodes in the AST to find async methods
  function visit(node: ts.Node) {
    if (isAsyncMethod(node)) {
      const method = extractAsyncMethod(node, sourceFile, content);
      if (method) {
        // Set the filePath for the extracted method
        method.filePath = filePath;
        asyncMethods.push(method);
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  console.log(`Parsed ${filePath}: found ${asyncMethods.length} async methods`);
  
  return {
    asyncMethods,
    context,
    sourceFile
  };
}

/**
 * Checks if a TypeScript AST node represents an async method
 */
function isAsyncMethod(node: ts.Node): boolean {
  // Check for async method declaration
  if (ts.isMethodDeclaration(node)) {
    return node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
  }
  
  // Check for async property assignment with arrow function
  if (ts.isPropertyAssignment(node)) {
    if (ts.isArrowFunction(node.initializer)) {
      return node.initializer.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    }
  }
  
  // Check for async property declaration
  if (ts.isPropertyDeclaration(node)) {
    if (node.initializer && ts.isArrowFunction(node.initializer)) {
      return node.initializer.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    }
  }
  
  return false;
}

/**
 * Extracts detailed information about an async method
 */
function extractAsyncMethod(
  node: ts.Node, 
  sourceFile: ts.SourceFile,
  fileContent: string
): AsyncMethodPattern | null {
  try {
    let methodName: string = 'unknown';
    let parameters: MethodParameter[] = [];
    let returnType: string = 'Promise<unknown>';
    let sourceCode: string;
    
    const start = node.getFullStart();
    const end = node.getEnd();
    const startPos = sourceFile.getLineAndCharacterOfPosition(start);
    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
    
    sourceCode = fileContent.substring(start, end);
    
    if (ts.isMethodDeclaration(node)) {
      // Method declaration: async methodName() {}
      methodName = node.name?.getText(sourceFile) ?? 'unknown';
      returnType = node.type?.getText(sourceFile) ?? 'unknown';
      
      if (node.parameters) {
        parameters = extractParameters(node.parameters, sourceFile);
      }
    } else if (ts.isPropertyAssignment(node)) {
      // Property assignment: methodName: async () => {}
      methodName = node.name?.getText(sourceFile) ?? 'unknown';
      
      if (ts.isArrowFunction(node.initializer)) {
        const arrowFn = node.initializer;
        returnType = arrowFn.type?.getText(sourceFile) ?? 'Promise<unknown>';
        
        if (arrowFn.parameters) {
          parameters = extractParameters(arrowFn.parameters, sourceFile);
        }
      }
    } else if (ts.isPropertyDeclaration(node)) {
      // Property declaration: methodName = async () => {}
      methodName = node.name?.getText(sourceFile) ?? 'unknown';
      returnType = node.type?.getText(sourceFile) ?? 'Promise<unknown>';
      
      if (node.initializer && ts.isArrowFunction(node.initializer)) {
        const arrowFn = node.initializer;
        if (arrowFn.parameters) {
          parameters = extractParameters(arrowFn.parameters, sourceFile);
        }
      }
    } else {
      return null;
    }
    
    // Analyze the method's pattern and characteristics
    const pattern = determineMethodPattern(sourceCode);
    const hasErrorHandling = sourceCode.includes('catch') || sourceCode.includes('try');
    const hasLoadingState = sourceCode.includes('isLoading') || sourceCode.includes('setLoading');
    const usesOptimisticUpdate = sourceCode.includes('optimistic') || 
                                 (sourceCode.includes('patchState') && sourceCode.includes('rollback'));
    
    // Extract dependencies (method calls)
    const dependencies = extractDependencies(sourceCode);
    
    return {
      methodName,
      returnType,
      parameters,
      pattern,
      hasErrorHandling,
      hasLoadingState,
      usesOptimisticUpdate,
      dependencies,
      sourceCode,
      startLine: startPos.line + 1,
      endLine: endPos.line + 1,
      filePath: '', // Will be set by the caller
      confidence: 85, // Default confidence level
      type: pattern // Same as pattern
    };
  } catch (error) {
    console.warn(`Failed to extract method information:`, error);
    return null;
  }
}

/**
 * Extracts parameter information from method parameters
 */
function extractParameters(
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  sourceFile: ts.SourceFile
): MethodParameter[] {
  return parameters.map(param => {
    const name = param.name?.getText(sourceFile) ?? 'unknown';
    const type = param.type?.getText(sourceFile) ?? 'unknown';
    const isOptional = !!param.questionToken;
    const defaultValue = param.initializer?.getText(sourceFile);
    
    return {
      name,
      type,
      isOptional,
      defaultValue
    };
  });
}

/**
 * Determines the pattern type of an async method based on its code
 */
function determineMethodPattern(sourceCode: string): AsyncMethodPattern['pattern'] {
  // Check for simple loading pattern
  if (sourceCode.includes('isLoading: true') && 
      sourceCode.includes('messageService.') && 
      !sourceCode.includes('optimistic')) {
    return 'simple-load';
  }
  
  // Check for optimistic update pattern
  if (sourceCode.includes('optimistic') || 
      (sourceCode.includes('patchState') && sourceCode.includes('originalComments'))) {
    return 'optimistic-update';
  }
  
  // Check for bulk operation pattern
  if (sourceCode.includes('bulk') || 
      sourceCode.includes('forEach') ||
      sourceCode.includes('Promise.all') ||
      sourceCode.includes('.map(') && sourceCode.includes('async')) {
    return 'bulk-operation';
  }
  
  // Default to custom for complex patterns
  return 'custom';
}

/**
 * Extracts method dependencies (service calls, utility calls)
 */
function extractDependencies(sourceCode: string): string[] {
  const dependencies: string[] = [];
  
  // Extract messageService calls
  const serviceCallRegex = /messageService\.(\w+)/g;
  let match;
  while ((match = serviceCallRegex.exec(sourceCode)) !== null) {
    dependencies.push(`messageService.${match[1]}`);
  }
  
  // Extract utility function calls
  const utilityCallRegex = /(create\w+Pattern|lastValueFrom|from|patchState)/g;
  while ((match = utilityCallRegex.exec(sourceCode)) !== null) {
    if (!dependencies.includes(match[1])) {
      dependencies.push(match[1]);
    }
  }
  
  return Array.from(new Set(dependencies)); // Remove duplicates
}

/**
 * Extracts context information from the store file
 */
function extractPatternContext(sourceFile: ts.SourceFile): PatternContext {
  const storeState: string[] = [];
  const injectedServices: string[] = [];
  const existingRxMethods: string[] = [];
  const existingImports: ImportStatement[] = [];
  let hasLoadingState = false;
  let hasErrorState = false;
  
  function visit(node: ts.Node) {
    // Extract import statements
    if (ts.isImportDeclaration(node)) {
      const importInfo = extractImportStatement(node, sourceFile);
      if (importInfo) {
        existingImports.push(importInfo);
      }
    }
    
    // Extract state properties
    if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
      const propertyName = node.name?.getText(sourceFile);
      if (propertyName) {
        storeState.push(propertyName);
        
        if (propertyName.includes('loading') || propertyName === 'isLoading') {
          hasLoadingState = true;
        }
        if (propertyName.includes('error')) {
          hasErrorState = true;
        }
      }
    }
    
    // Extract injected services
    if (ts.isParameter(node) && node.name && ts.isIdentifier(node.name)) {
      const paramName = node.name.text;
      if (paramName.includes('Service')) {
        injectedServices.push(paramName);
      }
    }
    
    // Extract existing rxMethod calls
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && expression.text === 'rxMethod') {
        // Find the property name this rxMethod is assigned to
        let parent = node.parent;
        while (parent && !ts.isPropertyAssignment(parent) && !ts.isPropertyDeclaration(parent)) {
          parent = parent.parent;
        }
        
        if (parent && (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent))) {
          const methodName = parent.name?.getText(sourceFile);
          if (methodName) {
            existingRxMethods.push(methodName);
          }
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  return {
    storeState,
    injectedServices,
    existingRxMethods,
    existingImports,
    hasLoadingState,
    hasErrorState
  };
}

/**
 * Extracts import statement information
 */
function extractImportStatement(
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile
): ImportStatement | null {
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
    
    // Named imports
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          namedImports.push(element.name.text);
        });
      }
      
      // Namespace import
      if (ts.isNamespaceImport(node.importClause.namedBindings)) {
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
 * Validates that a file contains a valid NgRx signals store
 */
export function validateStoreStructure(sourceFile: ts.SourceFile): {
  isValidStore: boolean;
  hasSignalStore: boolean;
  hasWithMethods: boolean;
  errors: string[];
} {
  let hasSignalStore = false;
  let hasWithMethods = false;
  const errors: string[] = [];
  
  function visit(node: ts.Node) {
    // Check for signalStore call
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && expression.text === 'signalStore') {
        hasSignalStore = true;
      }
      if (ts.isIdentifier(expression) && expression.text === 'withMethods') {
        hasWithMethods = true;
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  
  if (!hasSignalStore) {
    errors.push('File does not contain a signalStore declaration');
  }
  
  return {
    isValidStore: errors.length === 0,
    hasSignalStore,
    hasWithMethods,
    errors
  };
}

/**
 * Extracts method signatures for compatibility checking
 */
export function extractMethodSignatures(
  asyncMethods: AsyncMethodPattern[]
): Array<{ name: string; signature: string }> {
  return asyncMethods.map(method => {
    const paramString = method.parameters
      .map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
      .join(', ');
    
    const signature = `${method.methodName}(${paramString}): ${method.returnType}`;
    
    return {
      name: method.methodName,
      signature
    };
  });
}