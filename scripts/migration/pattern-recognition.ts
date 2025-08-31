import { AsyncMethodPattern, PatternContext, ConversionWarning } from './types';

/**
 * Advanced pattern recognition engine for categorizing async methods
 * and determining the best conversion approach for each method
 */

/**
 * Pattern recognition rules and scoring system
 */
interface PatternRule {
  pattern: AsyncMethodPattern['pattern'];
  weight: number;
  condition: (method: AsyncMethodPattern, context: PatternContext) => boolean;
  confidence: number;
}

/**
 * Pattern recognition result with confidence scoring
 */
export interface PatternRecognitionResult {
  recommendedPattern: AsyncMethodPattern['pattern'];
  confidence: number;
  alternatives: Array<{
    pattern: AsyncMethodPattern['pattern'];
    confidence: number;
    reason: string;
  }>;
  warnings: ConversionWarning[];
  requiresManualReview: boolean;
}

/**
 * Simple loading pattern detector
 */
export function detectSimpleLoadingPattern(
  method: AsyncMethodPattern, 
  context: PatternContext
): PatternRecognitionResult {
  let confidence = 0;
  const warnings: ConversionWarning[] = [];
  const alternatives: Array<{ pattern: AsyncMethodPattern['pattern']; confidence: number; reason: string }> = [];
  
  // Check for loading state management
  if (method.hasLoadingState || method.sourceCode.includes('isLoading')) {
    confidence += 30;
  }
  
  // Check for single service call pattern
  const serviceCallCount = method.dependencies.filter(dep => dep.includes('messageService')).length;
  if (serviceCallCount === 1) {
    confidence += 25;
  } else if (serviceCallCount > 1) {
    confidence -= 10;
    alternatives.push({
      pattern: 'custom',
      confidence: 60,
      reason: 'Multiple service calls suggest complex pattern'
    });
  }
  
  // Check for simple state update pattern
  if (method.sourceCode.includes('patchState') && !method.usesOptimisticUpdate) {
    confidence += 20;
  }
  
  // Check for error handling
  if (method.hasErrorHandling) {
    confidence += 15;
  }
  
  // Check for return value usage
  if (method.returnType !== 'Promise<void>' && method.returnType !== 'Promise<unknown>') {
    confidence += 10;
  }
  
  // Negative indicators
  if (method.sourceCode.includes('optimistic') || method.sourceCode.includes('rollback')) {
    confidence -= 40;
    alternatives.push({
      pattern: 'optimistic-update',
      confidence: 80,
      reason: 'Contains optimistic update keywords'
    });
  }
  
  if (method.sourceCode.includes('bulk') || method.sourceCode.includes('forEach')) {
    confidence -= 30;
    alternatives.push({
      pattern: 'bulk-operation',
      confidence: 70,
      reason: 'Contains bulk operation indicators'
    });
  }
  
  // Complexity warnings
  if (method.sourceCode.length > 1000) {
    warnings.push({
      type: 'complexity',
      message: 'Method is quite large and may benefit from splitting',
      methodName: method.methodName,
      recommendation: 'Consider breaking into smaller methods'
    });
    confidence -= 10;
  }
  
  return {
    recommendedPattern: 'simple-load',
    confidence: Math.max(0, Math.min(100, confidence)),
    alternatives,
    warnings,
    requiresManualReview: confidence < 60
  };
}

/**
 * Optimistic update pattern detector
 */
export function detectOptimisticUpdatePattern(
  method: AsyncMethodPattern,
  context: PatternContext
): PatternRecognitionResult {
  let confidence = 0;
  const warnings: ConversionWarning[] = [];
  const alternatives: Array<{ pattern: AsyncMethodPattern['pattern']; confidence: number; reason: string }> = [];
  
  // Strong indicators for optimistic updates
  if (method.sourceCode.includes('optimistic')) {
    confidence += 40;
  }
  
  if (method.sourceCode.includes('originalComments') || method.sourceCode.includes('originalState')) {
    confidence += 35;
  }
  
  if (method.sourceCode.includes('rollback') || method.sourceCode.includes('revert')) {
    confidence += 30;
  }
  
  // Pattern: update state first, then call service
  const patchStateCount = (method.sourceCode.match(/patchState/g) || []).length;
  if (patchStateCount >= 2) {
    confidence += 25;
  }
  
  // Check for state restoration in catch blocks
  if (method.sourceCode.includes('catch') && patchStateCount >= 2) {
    confidence += 20;
  }
  
  // Method name patterns
  if (method.methodName.includes('update') || method.methodName.includes('modify')) {
    confidence += 15;
  }
  
  // UI responsiveness pattern
  if (method.sourceCode.includes('map(comment =>') || method.sourceCode.includes('filter(')) {
    confidence += 15;
  }
  
  // Negative indicators
  if (!method.sourceCode.includes('patchState')) {
    confidence -= 30;
    alternatives.push({
      pattern: 'simple-load',
      confidence: 70,
      reason: 'No state management detected'
    });
  }
  
  if (method.sourceCode.includes('bulk') || method.sourceCode.includes('Promise.all')) {
    confidence -= 20;
    alternatives.push({
      pattern: 'bulk-operation',
      confidence: 75,
      reason: 'Contains bulk operation patterns'
    });
  }
  
  // Warnings for complex optimistic updates
  if (patchStateCount > 3) {
    warnings.push({
      type: 'complexity',
      message: 'Complex state management detected',
      methodName: method.methodName,
      recommendation: 'Consider simplifying state updates'
    });
  }
  
  return {
    recommendedPattern: 'optimistic-update',
    confidence: Math.max(0, Math.min(100, confidence)),
    alternatives,
    warnings,
    requiresManualReview: confidence < 70
  };
}

/**
 * Bulk operation pattern detector
 */
export function detectBulkOperationPattern(
  method: AsyncMethodPattern,
  context: PatternContext
): PatternRecognitionResult {
  let confidence = 0;
  const warnings: ConversionWarning[] = [];
  const alternatives: Array<{ pattern: AsyncMethodPattern['pattern']; confidence: number; reason: string }> = [];
  
  // Strong indicators for bulk operations
  if (method.methodName.includes('bulk') || method.methodName.includes('Bulk')) {
    confidence += 40;
  }
  
  if (method.sourceCode.includes('Promise.all')) {
    confidence += 35;
  }
  
  if (method.sourceCode.includes('forEach') || method.sourceCode.includes('.map(')) {
    confidence += 30;
  }
  
  // Array parameter patterns
  const arrayParams = method.parameters.filter(p => 
    p.type.includes('[]') || p.type.includes('Array<')
  );
  if (arrayParams.length > 0) {
    confidence += 25;
  }
  
  // Multiple service calls pattern
  const serviceCallMatches = method.sourceCode.match(/messageService\.\w+/g);
  if (serviceCallMatches && serviceCallMatches.length > 1) {
    confidence += 20;
  }
  
  // Progress tracking indicators
  if (method.sourceCode.includes('progress') || method.sourceCode.includes('completed')) {
    confidence += 15;
  }
  
  // Batch processing keywords
  if (method.sourceCode.includes('batch') || method.sourceCode.includes('chunk')) {
    confidence += 15;
  }
  
  // Negative indicators
  if (!arrayParams.length && !method.sourceCode.includes('forEach') && !method.sourceCode.includes('Promise.all')) {
    confidence -= 40;
    alternatives.push({
      pattern: 'simple-load',
      confidence: 80,
      reason: 'No bulk operation indicators found'
    });
  }
  
  // Performance warnings
  if (method.sourceCode.includes('forEach') && !method.sourceCode.includes('Promise.all')) {
    warnings.push({
      type: 'performance',
      message: 'Sequential operations detected - consider parallelization',
      methodName: method.methodName,
      recommendation: 'Use Promise.all or observable operators for better performance'
    });
  }
  
  return {
    recommendedPattern: 'bulk-operation',
    confidence: Math.max(0, Math.min(100, confidence)),
    alternatives,
    warnings,
    requiresManualReview: confidence < 65
  };
}

/**
 * Fallback handler for unrecognized patterns
 */
export function detectCustomPattern(
  method: AsyncMethodPattern,
  context: PatternContext
): PatternRecognitionResult {
  const warnings: ConversionWarning[] = [];
  const alternatives: Array<{ pattern: AsyncMethodPattern['pattern']; confidence: number; reason: string }> = [];
  
  // Analyze complexity factors
  let complexityScore = 0;
  
  // Length-based complexity
  if (method.sourceCode.length > 2000) {
    complexityScore += 30;
  } else if (method.sourceCode.length > 1000) {
    complexityScore += 15;
  }
  
  // Nested async operations
  const asyncCount = (method.sourceCode.match(/await/g) || []).length;
  if (asyncCount > 3) {
    complexityScore += 20;
  }
  
  // Multiple try-catch blocks
  const tryCount = (method.sourceCode.match(/try\s*{/g) || []).length;
  if (tryCount > 1) {
    complexityScore += 15;
  }
  
  // Complex control flow
  if (method.sourceCode.includes('switch') || method.sourceCode.includes('for') || method.sourceCode.includes('while')) {
    complexityScore += 10;
  }
  
  // Suggest simpler patterns if applicable
  if (asyncCount === 1 && method.hasLoadingState) {
    alternatives.push({
      pattern: 'simple-load',
      confidence: 75,
      reason: 'Single async operation with loading state'
    });
  }
  
  if (method.sourceCode.includes('patchState') && (method.sourceCode.match(/patchState/g) || []).length >= 2) {
    alternatives.push({
      pattern: 'optimistic-update',
      confidence: 70,
      reason: 'Multiple state updates detected'
    });
  }
  
  // Warnings for custom patterns
  warnings.push({
    type: 'manual-review',
    message: 'Method requires manual review for optimal conversion',
    methodName: method.methodName,
    recommendation: 'Consider breaking down into simpler operations or using existing utility patterns'
  });
  
  if (complexityScore > 40) {
    warnings.push({
      type: 'complexity',
      message: 'High complexity method detected',
      methodName: method.methodName,
      recommendation: 'Consider refactoring before conversion'
    });
  }
  
  return {
    recommendedPattern: 'custom',
    confidence: Math.max(20, 100 - complexityScore),
    alternatives,
    warnings,
    requiresManualReview: true
  };
}

/**
 * Main pattern recognition engine
 */
export function recognizePattern(
  method: AsyncMethodPattern,
  context: PatternContext
): PatternRecognitionResult {
  // Get results from all pattern detectors
  const simpleLoadResult = detectSimpleLoadingPattern(method, context);
  const optimisticUpdateResult = detectOptimisticUpdatePattern(method, context);
  const bulkOperationResult = detectBulkOperationPattern(method, context);
  const customResult = detectCustomPattern(method, context);
  
  // Collect all results
  const allResults = [
    { ...simpleLoadResult, pattern: 'simple-load' as const },
    { ...optimisticUpdateResult, pattern: 'optimistic-update' as const },
    { ...bulkOperationResult, pattern: 'bulk-operation' as const },
    { ...customResult, pattern: 'custom' as const }
  ];
  
  // Find the highest confidence result
  const bestResult = allResults.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
  
  // Combine warnings from all detectors
  const allWarnings = allResults.flatMap(result => result.warnings);
  
  // Create alternatives from other patterns with decent confidence
  const alternatives = allResults
    .filter(result => result.pattern !== bestResult.pattern && result.confidence > 30)
    .map(result => ({
      pattern: result.pattern,
      confidence: result.confidence,
      reason: `${result.pattern} detector confidence: ${result.confidence}%`
    }))
    .sort((a, b) => b.confidence - a.confidence);
  
  // Override detection for existing RxMethods
  if (context.existingRxMethods.includes(method.methodName)) {
    allWarnings.push({
      type: 'compatibility',
      message: 'Method already uses rxMethod - may need pattern standardization',
      methodName: method.methodName,
      recommendation: 'Review existing implementation for consistency'
    });
  }
  
  return {
    recommendedPattern: bestResult.pattern,
    confidence: bestResult.confidence,
    alternatives,
    warnings: allWarnings,
    requiresManualReview: bestResult.confidence < 60 || allWarnings.some(w => w.type === 'manual-review')
  };
}

/**
 * Batch pattern recognition for multiple methods
 */
export function recognizePatterns(
  methods: AsyncMethodPattern[],
  context: PatternContext
): Array<{
  method: AsyncMethodPattern;
  recognition: PatternRecognitionResult;
}> {
  return methods.map(method => ({
    method,
    recognition: recognizePattern(method, context)
  }));
}

/**
 * Pattern statistics and analysis
 */
export function analyzePatternDistribution(
  recognitionResults: Array<{ method: AsyncMethodPattern; recognition: PatternRecognitionResult }>
): {
  distribution: Record<string, number>;
  averageConfidence: number;
  methodsRequiringReview: number;
  totalWarnings: number;
  recommendations: string[];
} {
  const distribution: Record<string, number> = {};
  let totalConfidence = 0;
  let methodsRequiringReview = 0;
  let totalWarnings = 0;
  const recommendations: string[] = [];
  
  recognitionResults.forEach(({ method, recognition }) => {
    // Count pattern distribution
    distribution[recognition.recommendedPattern] = (distribution[recognition.recommendedPattern] || 0) + 1;
    
    // Sum confidence scores
    totalConfidence += recognition.confidence;
    
    // Count methods requiring review
    if (recognition.requiresManualReview) {
      methodsRequiringReview++;
    }
    
    // Count warnings
    totalWarnings += recognition.warnings.length;
    
    // Collect recommendations
    recognition.warnings.forEach(warning => {
      if (warning.recommendation && !recommendations.includes(warning.recommendation)) {
        recommendations.push(warning.recommendation);
      }
    });
  });
  
  // Add general recommendations based on distribution
  if (distribution['custom'] > recognitionResults.length * 0.3) {
    recommendations.push('Consider refactoring complex methods before migration');
  }
  
  if (methodsRequiringReview > recognitionResults.length * 0.5) {
    recommendations.push('High percentage of methods require manual review - consider phased migration approach');
  }
  
  return {
    distribution,
    averageConfidence: recognitionResults.length > 0 ? totalConfidence / recognitionResults.length : 0,
    methodsRequiringReview,
    totalWarnings,
    recommendations
  };
}