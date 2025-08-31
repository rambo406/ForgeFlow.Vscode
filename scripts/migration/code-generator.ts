import * as ts from 'typescript';
import { 
  AsyncMethodPattern, 
  ConversionResult, 
  RxMethodImplementation,
  PatternContext,
  ImportStatement 
} from './types';
import { generateConversionTemplate } from './conversion-templates';
import { generateEnhancedCompatibilityWrapper } from './compatibility-wrapper';
import { mergeImports, generateImportSection } from './import-manager';
import { recognizePattern } from './pattern-recognition';

/**
 * Code generation engine for converting async methods to RxMethod implementations
 * Orchestrates the complete conversion process including templates, imports, and compatibility
 */

/**
 * Configuration for code generation
 */
export interface CodeGenerationConfig {
  preserveComments: boolean;
  addConversionComments: boolean;
  generateCompatibilityWrappers: boolean;
  updateImports: boolean;
  validateOutput: boolean;
  dryRun: boolean;
  outputFormat: 'replace' | 'append' | 'separate-file';
  backupOriginal: boolean;
}

/**
 * Default configuration for code generation
 */
export const DEFAULT_CODE_GEN_CONFIG: CodeGenerationConfig = {
  preserveComments: true,
  addConversionComments: true,
  generateCompatibilityWrappers: true,
  updateImports: true,
  validateOutput: true,
  dryRun: false,
  outputFormat: 'replace',
  backupOriginal: true
};

/**
 * Result of code generation process
 */
export interface CodeGenerationResult {
  success: boolean;
  originalCode: string;
  convertedCode: string;
  methodsConverted: number;
  methodsSkipped: number;
  errors: Array<{ method: string; error: string }>;
  warnings: Array<{ method: string; warning: string }>;
  conversions: Array<{
    methodName: string;
    pattern: string;
    confidence: number;
    template: string;
    wrapper?: string;
  }>;
  importChanges: {
    added: ImportStatement[];
    modified: ImportStatement[];
    final: string;
  };
  validationResults: {
    isValid: boolean;
    syntaxErrors: string[];
    typeErrors: string[];
  };
}

/**
 * Main code generation engine
 */
export async function generateConvertedCode(
  sourceCode: string,
  filePath: string,
  asyncMethods: AsyncMethodPattern[],
  context: PatternContext,
  config: CodeGenerationConfig = DEFAULT_CODE_GEN_CONFIG
): Promise<CodeGenerationResult> {
  const result: CodeGenerationResult = {
    success: false,
    originalCode: sourceCode,
    convertedCode: sourceCode,
    methodsConverted: 0,
    methodsSkipped: 0,
    errors: [],
    warnings: [],
    conversions: [],
    importChanges: {
      added: [],
      modified: [],
      final: ''
    },
    validationResults: {
      isValid: true,
      syntaxErrors: [],
      typeErrors: []
    }
  };
  
  try {
    console.log(`🔧 Starting code generation for ${filePath}`);
    console.log(`   Methods to convert: ${asyncMethods.length}`);
    
    // Step 1: Parse source file
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    
    // Step 2: Generate conversions for each method
    const conversions: Array<{
      method: AsyncMethodPattern;
      rxMethodCode: string;
      wrapperCode?: string;
      pattern: string;
      confidence: number;
    }> = [];
    
    for (const method of asyncMethods) {
      try {
        console.log(`   🔄 Converting: ${method.methodName}`);
        
        // Get pattern recognition
        const recognition = recognizePattern(method, context);
        
        // Generate RxMethod template
        const template = generateConversionTemplate(method, recognition.recommendedPattern);
        
        // Generate compatibility wrapper if needed
        let wrapperCode: string | undefined;
        if (config.generateCompatibilityWrappers) {
          const wrapper = generateEnhancedCompatibilityWrapper(method);
          wrapperCode = wrapper.code;
        }
        
        conversions.push({
          method,
          rxMethodCode: template.template,
          wrapperCode,
          pattern: recognition.recommendedPattern,
          confidence: recognition.confidence
        });
        
        result.conversions.push({
          methodName: method.methodName,
          pattern: recognition.recommendedPattern,
          confidence: recognition.confidence,
          template: template.template,
          wrapper: wrapperCode
        });
        
        result.methodsConverted++;
        
        if (recognition.requiresManualReview) {
          result.warnings.push({
            method: method.methodName,
            warning: `Method requires manual review (${recognition.confidence}% confidence)`
          });
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to convert ${method.methodName}:`, error);
        result.errors.push({
          method: method.methodName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.methodsSkipped++;
      }
    }
    
    // Step 3: Replace async methods with RxMethod implementations
    console.log(`   🔄 Replacing methods in source code...`);
    let convertedCode = await replaceAsyncMethods(sourceCode, conversions, config);
    
    // Step 4: Update imports
    if (config.updateImports) {
      console.log(`   📦 Updating imports...`);
      const importUpdate = await updateImportsInCode(convertedCode, asyncMethods, context);
      convertedCode = importUpdate.updatedCode;
      result.importChanges = importUpdate.changes;
    }
    
    // Step 5: Add compatibility wrappers if needed
    if (config.generateCompatibilityWrappers) {
      console.log(`   🔗 Adding compatibility wrappers...`);
      convertedCode = await addCompatibilityWrappers(convertedCode, conversions, config);
    }
    
    // Step 6: Validate the generated code
    if (config.validateOutput) {
      console.log(`   ✅ Validating generated code...`);
      result.validationResults = validateGeneratedCode(convertedCode, filePath);
    }
    
    result.convertedCode = convertedCode;
    result.success = result.errors.length === 0;
    
    console.log(`✅ Code generation completed:`);
    console.log(`   Methods converted: ${result.methodsConverted}`);
    console.log(`   Methods skipped: ${result.methodsSkipped}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Code generation failed:`, error);
    result.success = false;
    result.errors.push({
      method: 'GENERAL',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return result;
  }
}

/**
 * Replaces async methods with RxMethod implementations in source code
 */
async function replaceAsyncMethods(
  sourceCode: string,
  conversions: Array<{
    method: AsyncMethodPattern;
    rxMethodCode: string;
    wrapperCode?: string;
    pattern: string;
    confidence: number;
  }>,
  config: CodeGenerationConfig
): Promise<string> {
  let modifiedCode = sourceCode;
  
  // Sort conversions by start line (descending) to avoid position shifts
  const sortedConversions = conversions.sort((a, b) => b.method.startLine - a.method.startLine);
  
  for (const conversion of sortedConversions) {
    const { method, rxMethodCode, pattern, confidence } = conversion;
    
    try {
      // Find the method in the source code
      const lines = modifiedCode.split('\n');
      const methodStartLine = method.startLine - 1; // Convert to 0-based
      const methodEndLine = method.endLine - 1;
      
      if (methodStartLine >= lines.length || methodEndLine >= lines.length) {
        throw new Error(`Method ${method.methodName} line numbers are out of range`);
      }
      
      // Extract method indentation from the original method
      const originalMethodLine = lines[methodStartLine];
      const indentMatch = originalMethodLine.match(/^(\s*)/);
      const baseIndent = indentMatch ? indentMatch[1] : '';
      
      // Apply indentation to the RxMethod code
      const indentedRxMethodCode = applyIndentation(rxMethodCode, baseIndent);
      
      // Add conversion comment if configured
      let replacementCode = indentedRxMethodCode;
      if (config.addConversionComments) {
        const comment = `${baseIndent}// Converted from async method to rxMethod (${pattern} pattern, ${confidence}% confidence)`;
        replacementCode = `${comment}\n${indentedRxMethodCode}`;
      }
      
      // Replace the method
      const beforeMethod = lines.slice(0, methodStartLine);
      const afterMethod = lines.slice(methodEndLine + 1);
      
      modifiedCode = [
        ...beforeMethod,
        replacementCode,
        ...afterMethod
      ].join('\n');
      
      console.log(`     ✅ Replaced ${method.methodName} (${pattern} pattern)`);
      
    } catch (error) {
      console.error(`     ❌ Failed to replace ${method.methodName}:`, error);
      throw error;
    }
  }
  
  return modifiedCode;
}

/**
 * Updates imports in the code based on conversion requirements
 */
async function updateImportsInCode(
  sourceCode: string,
  asyncMethods: AsyncMethodPattern[],
  context: PatternContext
): Promise<{
  updatedCode: string;
  changes: {
    added: ImportStatement[];
    modified: ImportStatement[];
    final: string;
  };
}> {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  
  // Import analysis is handled by import-manager
  const { analyzeExistingImports } = await import('./import-manager');
  const analysis = analyzeExistingImports(sourceFile);
  
  // Determine required imports based on patterns
  const patterns = asyncMethods.map(m => recognizePattern(m, context).recommendedPattern);
  const uniquePatterns = Array.from(new Set(patterns));
  
  // Create required imports
  const requiredImports: ImportStatement[] = [
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
  
  // Add utility imports based on patterns
  const utilityImports: string[] = [];
  if (uniquePatterns.includes('optimistic-update')) {
    utilityImports.push('createOptimisticUpdatePattern');
  }
  if (uniquePatterns.includes('bulk-operation')) {
    utilityImports.push('createBulkOperationPattern');
  }
  if (uniquePatterns.includes('simple-load')) {
    utilityImports.push('createLoadingStatePattern');
  }
  
  if (utilityImports.length > 0) {
    requiredImports.push({
      modulePath: '../../../utils/RxMethodUtils',
      namedImports: utilityImports,
      defaultImport: undefined,
      namespaceImport: undefined
    });
  }
  
  // Merge imports
  const mergeResult = mergeImports(analysis.existingImports, requiredImports);
  
  // Generate new import section
  const newImportSection = generateImportSection(mergeResult.updatedImports);
  
  // Replace import section in code
  const lines = sourceCode.split('\n');
  let firstNonImportLine = 0;
  
  // Find where imports end
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('import') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
      firstNonImportLine = i;
      break;
    }
  }
  
  // Replace the import section
  const codeAfterImports = lines.slice(firstNonImportLine).join('\n');
  const updatedCode = newImportSection + codeAfterImports;
  
  return {
    updatedCode,
    changes: {
      added: mergeResult.addedImports,
      modified: mergeResult.modifiedImports,
      final: newImportSection
    }
  };
}

/**
 * Adds compatibility wrappers to the code
 */
async function addCompatibilityWrappers(
  sourceCode: string,
  conversions: Array<{
    method: AsyncMethodPattern;
    rxMethodCode: string;
    wrapperCode?: string;
    pattern: string;
    confidence: number;
  }>,
  config: CodeGenerationConfig
): Promise<string> {
  let modifiedCode = sourceCode;
  
  // Find the end of the store definition to add wrappers
  const lines = modifiedCode.split('\n');
  let insertionPoint = lines.length - 1;
  
  // Look for the closing brace of withMethods
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('});') && i > 0) {
      const prevLine = lines[i - 1].trim();
      if (prevLine.includes(')') || prevLine.includes('},')) {
        insertionPoint = i;
        break;
      }
    }
  }
  
  // Add compatibility wrappers before the closing brace
  const wrappersToAdd = conversions
    .filter(c => c.wrapperCode)
    .map(c => c.wrapperCode!)
    .join('\n\n');
  
  if (wrappersToAdd) {
    const beforeInsert = lines.slice(0, insertionPoint);
    const afterInsert = lines.slice(insertionPoint);
    
    const wrapperSection = `\n  // Compatibility wrappers (TODO: Remove after migration)\n${wrappersToAdd}\n`;
    
    modifiedCode = [
      ...beforeInsert,
      wrapperSection,
      ...afterInsert
    ].join('\n');
  }
  
  return modifiedCode;
}

/**
 * Applies consistent indentation to generated code
 */
function applyIndentation(code: string, baseIndent: string): string {
  const lines = code.split('\n');
  return lines
    .map((line, index) => {
      if (index === 0 || line.trim() === '') {
        return line;
      }
      return baseIndent + line;
    })
    .join('\n');
}

/**
 * Validates the generated TypeScript code
 */
function validateGeneratedCode(
  code: string,
  filePath: string
): {
  isValid: boolean;
  syntaxErrors: string[];
  typeErrors: string[];
} {
  const syntaxErrors: string[] = [];
  const typeErrors: string[] = [];
  
  try {
    // Parse the code to check for syntax errors
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    
    // Simple syntax validation - just check if file parses without errors
    try {
      // If createSourceFile succeeded without throwing, basic syntax is valid
      // We can add more sophisticated validation later if needed
      
      // Check for obvious syntax issues by looking for unmatched braces
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        syntaxErrors.push(`Unmatched braces: ${openBraces} opening, ${closeBraces} closing`);
      }
      
      // Check for obvious syntax issues with parentheses
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        syntaxErrors.push(`Unmatched parentheses: ${openParens} opening, ${closeParens} closing`);
      }
      
    } catch (parseError) {
      syntaxErrors.push(`Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // TODO: Add type checking using TypeScript compiler API
    // This would require a more complex setup with compiler options and project references
    
  } catch (error) {
    syntaxErrors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: syntaxErrors.length === 0 && typeErrors.length === 0,
    syntaxErrors,
    typeErrors
  };
}

/**
 * Generates a summary report of the conversion process
 */
export function generateConversionReport(
  result: CodeGenerationResult,
  filePath: string
): string {
  const report = `
# Async to RxMethod Conversion Report

**File:** ${filePath}
**Generated:** ${new Date().toISOString()}

## Summary
- ✅ **Success:** ${result.success ? 'Yes' : 'No'}
- 🔄 **Methods Converted:** ${result.methodsConverted}
- ⏭️ **Methods Skipped:** ${result.methodsSkipped}
- ❌ **Errors:** ${result.errors.length}
- ⚠️ **Warnings:** ${result.warnings.length}

## Conversions
${result.conversions.map(conv => `
### ${conv.methodName}
- **Pattern:** ${conv.pattern}
- **Confidence:** ${conv.confidence}%
- **Status:** ${conv.confidence >= 80 ? '✅ High Confidence' : conv.confidence >= 60 ? '⚠️ Medium Confidence' : '🔍 Requires Review'}
`).join('')}

## Import Changes
- **Added:** ${result.importChanges.added.length} imports
- **Modified:** ${result.importChanges.modified.length} imports

## Validation
- **Syntax Valid:** ${result.validationResults.isValid ? '✅' : '❌'}
- **Syntax Errors:** ${result.validationResults.syntaxErrors.length}
- **Type Errors:** ${result.validationResults.typeErrors.length}

${result.errors.length > 0 ? `
## Errors
${result.errors.map(err => `- **${err.method}:** ${err.error}`).join('\n')}
` : ''}

${result.warnings.length > 0 ? `
## Warnings
${result.warnings.map(warn => `- **${warn.method}:** ${warn.warning}`).join('\n')}
` : ''}

## Next Steps
${result.success ? `
1. Review the converted code, especially methods marked for manual review
2. Test the application to ensure functionality is preserved
3. Update unit tests to work with the new RxMethod implementations
4. Remove compatibility wrappers after migration is complete
` : `
1. Address the errors listed above
2. Re-run the conversion process
3. Consider converting methods individually if bulk conversion fails
`}
`;
  
  return report.trim();
}