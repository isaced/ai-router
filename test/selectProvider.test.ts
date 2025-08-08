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

    describe('selectProvider with rate-limit-aware strategy', () => {
        test('should select available provider', async () => {
            const provider = await selectProvider(config, chatRequest);
            expect(provider).toBeDefined();
            expect(provider.model).toBe('gpt-3.5-turbo');
            expect(provider.apiKey).toBe('test-api-key-123');
        });

        test('should throw error when all providers are rate limited', async () => {
            // Exhaust the rate limit
            for (let i = 0; i < 10; i++) {
                await rateLimitManager.recordRequest(mockAccount, 100);
            }

            await expect(selectProvider(config, chatRequest)).rejects.toThrow(
                'All accounts have exceeded their rate limits'
            );
        });

        test('should select provider with highest availability score', async () => {
            // Create config with multiple accounts
            const account1: Account = {
                apiKey: 'key-1',
                models: ['gpt-3.5-turbo'],
                rateLimit: { rpm: 10, tpm: 1000, rpd: 100 }
            };

            const account2: Account = {
                apiKey: 'key-2',
                models: ['gpt-3.5-turbo'],
                rateLimit: { rpm: 10, tpm: 1000, rpd: 100 }
            };

            const multiAccountConfig: AIRouterConfig = {
                providers: [
                    {
                        name: 'TestProvider',
                        accounts: [account1, account2]
                    }
                ],
                strategy: 'rate-limit-aware',
                usageStorage: storage
            };

            // Use some quota on account1
            for (let i = 0; i < 5; i++) {
                await rateLimitManager.recordRequest(account1, 50);
            }

            // Should select account2 (higher availability)
            const provider = await selectProvider(multiAccountConfig, chatRequest);
            expect(provider.apiKey).toBe('key-2');
        });

        test('should work with random strategy fallback', async () => {
            const randomConfig: AIRouterConfig = {
                ...config,
                strategy: 'random'
            };

            const provider = await selectProvider(randomConfig, chatRequest);
            expect(provider).toBeDefined();
        });

        test('should throw error for unknown strategy', async () => {
            const unknownConfig: AIRouterConfig = {
                ...config,
                strategy: 'unknown-strategy' as any
            };

            await expect(selectProvider(unknownConfig, chatRequest)).rejects.toThrow('Unknown strategy');
        });

        test('should handle empty providers array', async () => {
            const emptyConfig: AIRouterConfig = {
                providers: [],
                strategy: 'rate-limit-aware'
            };

            await expect(selectProvider(emptyConfig, chatRequest)).rejects.toThrow('No providers configured');
        });
    });
});
