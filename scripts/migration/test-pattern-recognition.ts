import { recognizePattern, recognizePatterns, analyzePatternDistribution } from './pattern-recognition';
import { parseStoreFile } from './file-scanner';
import * as path from 'path';

/**
 * Test script for the pattern recognition engine
 */

async function testPatternRecognition() {
  console.log('=== Testing Pattern Recognition Engine ===\n');
  
  try {
    // Test with known store files
    const projectRoot = path.resolve(__dirname, '../../');
    const knownStoreFiles = [
      path.join(projectRoot, 'src/webview-angular/src/app/features/dashboard/store/dashboard.store.ts'),
      path.join(projectRoot, 'src/webview-angular/src/app/features/comment-preview/store/comment-preview.store.ts')
    ];
    
    const allRecognitionResults: Array<{
      method: any;
      recognition: any;
      file: string;
    }> = [];
    
    for (const filePath of knownStoreFiles) {
      try {
        console.log(`\n=== Analyzing ${path.basename(filePath)} ===`);
        
        const parseResult = await parseStoreFile(filePath);
        console.log(`Found ${parseResult.asyncMethods.length} async methods`);
        
        if (parseResult.asyncMethods.length === 0) {
          console.log('No async methods to analyze');
          continue;
        }
        
        // Test individual pattern recognition
        console.log('\n--- Individual Method Analysis ---');
        parseResult.asyncMethods.forEach(method => {
          const recognition = recognizePattern(method, parseResult.context);
          
          console.log(`\n📝 Method: ${method.methodName}`);
          console.log(`   Pattern: ${recognition.recommendedPattern} (${recognition.confidence}% confidence)`);
          console.log(`   Manual Review: ${recognition.requiresManualReview ? '⚠️  Yes' : '✅ No'}`);
          console.log(`   Warnings: ${recognition.warnings.length}`);
          
          if (recognition.alternatives.length > 0) {
            console.log(`   Alternatives:`);
            recognition.alternatives.forEach(alt => {
              console.log(`     - ${alt.pattern} (${alt.confidence}%): ${alt.reason}`);
            });
          }
          
          if (recognition.warnings.length > 0) {
            console.log(`   Warning Details:`);
            recognition.warnings.forEach(warning => {
              console.log(`     - ${warning.type}: ${warning.message}`);
              if (warning.recommendation) {
                console.log(`       Recommendation: ${warning.recommendation}`);
              }
            });
          }
          
          allRecognitionResults.push({
            method,
            recognition,
            file: path.basename(filePath)
          });
        });
        
        // Test batch recognition
        console.log('\n--- Batch Analysis ---');
        const batchResults = recognizePatterns(parseResult.asyncMethods, parseResult.context);
        const analysis = analyzePatternDistribution(batchResults);
        
        console.log('📊 Pattern Distribution:');
        Object.entries(analysis.distribution).forEach(([pattern, count]) => {
          console.log(`   ${pattern}: ${count} methods`);
        });
        
        console.log(`📈 Average Confidence: ${analysis.averageConfidence.toFixed(1)}%`);
        console.log(`⚠️  Methods Requiring Review: ${analysis.methodsRequiringReview}`);
        console.log(`🚨 Total Warnings: ${analysis.totalWarnings}`);
        
        if (analysis.recommendations.length > 0) {
          console.log('💡 Recommendations:');
          analysis.recommendations.forEach(rec => {
            console.log(`   - ${rec}`);
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to analyze ${path.basename(filePath)}:`, error);
      }
    }
    
    // Overall analysis across all files
    if (allRecognitionResults.length > 0) {
      console.log('\n=== Overall Project Analysis ===');
      
      const overallAnalysis = analyzePatternDistribution(allRecognitionResults);
      
      console.log('\n📊 Project-wide Pattern Distribution:');
      Object.entries(overallAnalysis.distribution).forEach(([pattern, count]) => {
        const percentage = (count / allRecognitionResults.length * 100).toFixed(1);
        console.log(`   ${pattern}: ${count} methods (${percentage}%)`);
      });
      
      console.log(`\n📈 Project Average Confidence: ${overallAnalysis.averageConfidence.toFixed(1)}%`);
      console.log(`⚠️  Total Methods Requiring Review: ${overallAnalysis.methodsRequiringReview}`);
      console.log(`🚨 Total Warnings Across Project: ${overallAnalysis.totalWarnings}`);
      
      // High-confidence methods
      const highConfidenceMethods = allRecognitionResults.filter(r => r.recognition.confidence >= 80);
      console.log(`✅ High Confidence Methods (≥80%): ${highConfidenceMethods.length}`);
      
      // Low-confidence methods
      const lowConfidenceMethods = allRecognitionResults.filter(r => r.recognition.confidence < 60);
      console.log(`⚠️  Low Confidence Methods (<60%): ${lowConfidenceMethods.length}`);
      
      if (lowConfidenceMethods.length > 0) {
        console.log('\n🔍 Methods Requiring Special Attention:');
        lowConfidenceMethods.forEach(({ method, recognition, file }) => {
          console.log(`   - ${file}: ${method.methodName} (${recognition.confidence}% confidence)`);
        });
      }
      
      console.log('\n💡 Project-wide Recommendations:');
      overallAnalysis.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    
    console.log('\n=== Pattern Recognition Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPatternRecognition().catch(console.error);
}

export { testPatternRecognition };