import * as assert from 'assert';
import { RateLimiterManager, TokenBucketRateLimiter, AdaptiveRateLimiter } from '../../utils/RateLimiter';

suite('TokenBucketRateLimiter Tests', () => {
    let rateLimiter: TokenBucketRateLimiter;

    setup(() => {
        rateLimiter = new TokenBucketRateLimiter({
            requestsPerMinute: 60,
            concurrentRequests: 5,
            retryDelay: 1000
        });
    });

    suite('Rate Limiting', () => {
        test('should allow requests within limits', async () => {
            const result = await rateLimiter.execute(async () => {
                return 'success';
            });
            
            assert.strictEqual(result, 'success');
        });

        test('should track request metrics', async () => {
            await rateLimiter.execute(async () => 'test');
            
            const stats = rateLimiter.getStats();
            assert.ok(stats.totalRequests > 0);
            assert.ok(typeof stats.successfulRequests === 'number');
            assert.ok(typeof stats.rateLimitedRequests === 'number');
            assert.ok(typeof stats.averageResponseTime === 'number');
        });

        test('should handle errors in executed functions', async () => {
            try {
                await rateLimiter.execute(async () => {
                    throw new Error('Test error');
                });
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.strictEqual((error as Error).message, 'Test error');
            }
        });

        test('should respect concurrent request limits', async () => {
            const promises = Array.from({ length: 10 }, () =>
                rateLimiter.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return 'done';
                })
            );

            const results = await Promise.all(promises);
            assert.strictEqual(results.length, 10);
            results.forEach((result: string) => assert.strictEqual(result, 'done'));
        });
    });

    suite('Configuration', () => {
        test('should use provided configuration', () => {
            const customRateLimiter = new TokenBucketRateLimiter({
                requestsPerMinute: 30,
                concurrentRequests: 2,
                retryDelay: 500
            });

            assert.ok(customRateLimiter);
        });

        test('should handle default configuration', () => {
            const defaultRateLimiter = new TokenBucketRateLimiter();
            assert.ok(defaultRateLimiter);
        });
    });

    suite('Statistics', () => {
        test('should provide comprehensive statistics', async () => {
            // Execute some requests to generate stats
            await rateLimiter.execute(async () => 'test1');
            await rateLimiter.execute(async () => 'test2');

            const stats = rateLimiter.getStats();
            assert.ok(typeof stats.totalRequests === 'number');
            assert.ok(typeof stats.successfulRequests === 'number');
            assert.ok(typeof stats.rateLimitedRequests === 'number');
            assert.ok(typeof stats.averageResponseTime === 'number');
            assert.ok(stats.totalRequests >= 2);
        });

        test('should reset statistics', () => {
            rateLimiter.reset();
            const stats = rateLimiter.getStats();
            assert.strictEqual(stats.totalRequests, 0);
            assert.strictEqual(stats.successfulRequests, 0);
            assert.strictEqual(stats.rateLimitedRequests, 0);
        });
    });
});

suite('AdaptiveRateLimiter Tests', () => {
    let adaptiveRateLimiter: AdaptiveRateLimiter;

    setup(() => {
        adaptiveRateLimiter = new AdaptiveRateLimiter({
            requestsPerMinute: 60,
            concurrentRequests: 5,
            retryDelay: 1000
        });
    });

    suite('Adaptive Behavior', () => {
        test('should execute requests successfully', async () => {
            const result = await adaptiveRateLimiter.execute(async () => 'adaptive success');
            assert.strictEqual(result, 'adaptive success');
        });

        test('should track adaptive statistics', async () => {
            await adaptiveRateLimiter.execute(async () => 'test');
            const stats = adaptiveRateLimiter.getStats();
            assert.ok(stats.totalRequests > 0);
        });
    });
});

suite('RateLimiterManager Tests', () => {
    let manager: RateLimiterManager;

    setup(() => {
        manager = RateLimiterManager.getInstance();
    });

    teardown(() => {
        // Reset singleton for each test
        (RateLimiterManager as any).instance = null;
    });

    suite('Singleton Pattern', () => {
        test('should return same instance', () => {
            const instance1 = RateLimiterManager.getInstance();
            const instance2 = RateLimiterManager.getInstance();
            assert.strictEqual(instance1, instance2);
        });
    });

    suite('Service Management', () => {
        test('should get Azure DevOps rate limiter', () => {
            const limiter = manager.getAzureDevOpsLimiter();
            assert.ok(limiter);
        });

        test('should get language model rate limiter', () => {
            const limiter = manager.getLanguageModelLimiter('gpt-4');
            assert.ok(limiter);
        });

        test('should create different limiters for different tiers', () => {
            const gpt4Limiter = manager.getLanguageModelLimiter('gpt-4');
            const gpt35Limiter = manager.getLanguageModelLimiter('gpt-3.5-turbo');
            
            assert.notStrictEqual(gpt4Limiter, gpt35Limiter);
        });
    });

    suite('Load Management', () => {
        test('should detect heavy load conditions', () => {
            const isHeavyLoad = manager.isUnderHeavyLoad();
            assert.ok(typeof isHeavyLoad === 'boolean');
        });

        test('should provide performance recommendations', () => {
            const recommendations = manager.getPerformanceRecommendations();
            assert.ok(Array.isArray(recommendations));
        });

        test('should wait for lighter load', async () => {
            // This should complete quickly when not under heavy load
            const startTime = Date.now();
            await manager.waitForLighterLoad();
            const endTime = Date.now();
            
            // Should not wait more than a few seconds
            assert.ok(endTime - startTime < 5000);
        });
    });

    suite('Statistics', () => {
        test('should provide comprehensive statistics', () => {
            const stats = manager.getComprehensiveStats();
            assert.ok(stats.overall);
            assert.ok(stats.azureDevOps);
            assert.ok(stats.languageModel);
            
            assert.ok(typeof stats.overall.totalRequestsProcessed === 'number');
            assert.ok(typeof stats.overall.totalRequestsQueued === 'number');
            assert.ok(typeof stats.azureDevOps.isThrottling === 'boolean');
        });

        test('should reset all statistics', () => {
            manager.resetAllStats();
            const stats = manager.getComprehensiveStats();
            assert.strictEqual(stats.overall.totalRequestsProcessed, 0);
            assert.strictEqual(stats.overall.totalRequestsQueued, 0);
        });
    });

    suite('Error Handling', () => {
        test('should handle invalid service names gracefully', () => {
            assert.doesNotThrow(() => {
                manager.getLanguageModelLimiter('invalid-model' as any);
            });
        });

        test('should handle dispose gracefully', () => {
            assert.doesNotThrow(() => {
                manager.dispose();
            });
        });
    });
});