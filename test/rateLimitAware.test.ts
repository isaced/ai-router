import { describe, test, expect, beforeEach } from 'bun:test';
import type { AIRouterConfig, Account } from '../src/types/types';
import type { ChatRequest } from '../src/types/chat';
import { MemoryUsageStorage } from '../src/core/usageStorage';
import { RateLimitManager } from '../src/core/rateLimitManager';
import { selectProvider, resetRateLimitManager } from '../src/core/selectProvider';

describe('Rate Limit Aware Strategy', () => {
    let storage: MemoryUsageStorage;
    let rateLimitManager: RateLimitManager;
    let mockAccount: Account;
    let config: AIRouterConfig;
    let chatRequest: ChatRequest;

    beforeEach(() => {
        storage = new MemoryUsageStorage();
        rateLimitManager = new RateLimitManager(storage);

        mockAccount = {
            apiKey: 'test-api-key-123',
            models: ['gpt-3.5-turbo'],
            rateLimit: {
                rpm: 10,
                tpm: 1000,
                rpd: 100
            }
        };

        config = {
            providers: [
                {
                    name: 'TestProvider',
                    endpoint: 'https://api.test.com/v1',
                    accounts: [mockAccount]
                }
            ],
            strategy: 'rate-limit-aware',
            usageStorage: storage
        };

        chatRequest = {
            messages: [
                { role: 'user', content: 'Hello, how are you?' }
            ]
        };

        // Clear storage and reset global state before each test
        storage.clear();
        resetRateLimitManager();
    });

    describe('Integration Tests', () => {
        test('should handle full request lifecycle with rate limiting', async () => {
            // Make several requests
            for (let i = 0; i < 3; i++) {
                const provider = await selectProvider(config, chatRequest);
                expect(provider).toBeDefined();

                // Simulate recording usage after request
                await rateLimitManager.recordRequest(mockAccount, 25);
            }

            // Check that usage was recorded
            const usage = await rateLimitManager.getUsage(mockAccount);
            expect(usage?.requestsThisMinute).toBe(3);
            expect(usage?.tokensThisMinute).toBe(75);
            expect(usage?.requestsToday).toBe(3);
        });

        test('should handle concurrent requests safely', async () => {
            // Create multiple concurrent requests
            const promises: Promise<void>[] = [];
            for (let i = 0; i < 5; i++) {
                promises.push(rateLimitManager.recordRequest(mockAccount, 10));
            }

            await Promise.all(promises);

            // Check final usage
            const usage = await rateLimitManager.getUsage(mockAccount);
            expect(usage?.requestsThisMinute).toBe(5);
            expect(usage?.tokensThisMinute).toBe(50);
        });

        test('should maintain separate usage for different accounts', async () => {
            const account2: Account = {
                apiKey: 'different-key',
                models: ['gpt-4'],
                rateLimit: { rpm: 5, tpm: 500, rpd: 50 }
            };

            // Record usage for both accounts
            await rateLimitManager.recordRequest(mockAccount, 100);
            await rateLimitManager.recordRequest(account2, 200);

            // Check that usage is separate
            const usage1 = await rateLimitManager.getUsage(mockAccount);
            const usage2 = await rateLimitManager.getUsage(account2);

            expect(usage1?.tokensThisMinute).toBe(100);
            expect(usage2?.tokensThisMinute).toBe(200);
        });
    });
});
