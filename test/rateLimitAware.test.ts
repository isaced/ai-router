import { describe, test, expect, beforeEach } from 'bun:test';
import type { AIRouterConfig, Account } from '../src/types/types';
import type { ChatRequest } from '../src/types/chat';
import { MemoryUsageStorage } from '../src/core/usageStorage';
import { RateLimitManager } from '../src/core/rateLimitManager';
import { selectProvider } from '../src/core/selectProvider';

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockAccount = (overrides?: Partial<Account>): Account => ({
    apiKey: 'test-api-key-123',
    models: ['gpt-3.5-turbo'],
    rateLimit: {
        rpm: 10,
        tpm: 1000,
        rpd: 100
    },
    ...overrides
});

const createSecondaryAccount = (overrides?: Partial<Account>): Account => ({
    apiKey: 'test-api-key-456',
    models: ['gpt-3.5-turbo'],
    rateLimit: {
        rpm: 10,
        tpm: 1000,
        rpd: 100
    },
    ...overrides
});

const createMockConfig = (accounts: Account[], storage: MemoryUsageStorage): AIRouterConfig => ({
    providers: [
        {
            name: 'TestProvider',
            endpoint: 'https://api.test.com/v1',
            accounts
        }
    ],
    strategy: 'rate-limit-aware',
    usageStorage: storage
});

const createChatRequest = (): ChatRequest => ({
    messages: [
        { role: 'user', content: 'Hello, how are you?' }
    ]
});

// ============================================================================
// Test Helper Functions
// ============================================================================

const exhaustAccountRPM = async (manager: RateLimitManager, account: Account): Promise<void> => {
    const limit = account.rateLimit?.rpm || 0;
    for (let i = 0; i < limit; i++) {
        await manager.recordRequest(account, 50);
    }
};

const exhaustAccountTPM = async (manager: RateLimitManager, account: Account): Promise<void> => {
    const limit = account.rateLimit?.tpm || 0;
    await manager.recordRequest(account, limit);
};

const verifyAccountAtLimit = async (manager: RateLimitManager, account: Account, tokens = 50): Promise<void> => {
    const canHandle = await manager.canHandleRequest(account, tokens);
    expect(canHandle).toBe(false);
};

// ============================================================================
// Main Test Suite
// ============================================================================

describe('Rate Limit Aware Strategy', () => {
    let storage: MemoryUsageStorage;
    let rateLimitManager: RateLimitManager;
    let mockAccount: Account;
    let config: AIRouterConfig;
    let chatRequest: ChatRequest;

    beforeEach(() => {
        // Initialize core components
        storage = new MemoryUsageStorage();
        rateLimitManager = new RateLimitManager(storage);

        // Create test data
        mockAccount = createMockAccount();
        config = createMockConfig([mockAccount], storage);
        chatRequest = createChatRequest();

// Reset state
        storage.clear();
    });

    // ========================================================================
    // Integration Tests - Basic functionality
    // ========================================================================

    describe('Integration Tests', () => {
        test('should handle full request lifecycle with rate limiting', async () => {
            // Make several requests
            for (let i = 0; i < 3; i++) {
                const provider = await selectProvider(config, rateLimitManager, chatRequest);
                expect(provider).toBeDefined();

                // Simulate recording usage after request
                await rateLimitManager.recordRequest(mockAccount, 25);
            }

            // Verify usage was recorded correctly
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

            // Verify final usage is correct
            const usage = await rateLimitManager.getUsage(mockAccount);
            expect(usage?.requestsThisMinute).toBe(5);
            expect(usage?.tokensThisMinute).toBe(50);
        });

        test('should maintain separate usage for different accounts', async () => {
            const account2 = createMockAccount({
                apiKey: 'different-key',
                models: ['gpt-4'],
                rateLimit: { rpm: 5, tpm: 500, rpd: 50 }
            });

            // Record usage for both accounts
            await rateLimitManager.recordRequest(mockAccount, 100);
            await rateLimitManager.recordRequest(account2, 200);

            // Verify usage is tracked separately
            const usage1 = await rateLimitManager.getUsage(mockAccount);
            const usage2 = await rateLimitManager.getUsage(account2);

            expect(usage1?.tokensThisMinute).toBe(100);
            expect(usage2?.tokensThisMinute).toBe(200);
        });
    });

    // ========================================================================
    // Account Rotation Tests - Core rotation logic
    // ========================================================================

    describe('Account Rotation Tests', () => {
        let account2: Account;
        let multiAccountConfig: AIRouterConfig;

        beforeEach(() => {
            account2 = createSecondaryAccount();
            multiAccountConfig = createMockConfig([mockAccount, account2], storage);
        });

        describe('Basic Rotation Logic', () => {
            test('should rotate when first account reaches RPM limit', async () => {
                // Exhaust first account's RPM limit
                await exhaustAccountRPM(rateLimitManager, mockAccount);
                await verifyAccountAtLimit(rateLimitManager, mockAccount);

                // Next request should use second account
                const provider = await selectProvider(multiAccountConfig, rateLimitManager, chatRequest);
                expect(provider).toBeDefined();
                expect(provider.apiKey).toBe(account2.apiKey);
            });

            test('should rotate when first account reaches TPM limit', async () => {
                // Exhaust first account's TPM limit
                await exhaustAccountTPM(rateLimitManager, mockAccount);
                await verifyAccountAtLimit(rateLimitManager, mockAccount);

                // Next request should use second account
                const provider = await selectProvider(multiAccountConfig, rateLimitManager, chatRequest);
                expect(provider).toBeDefined();
                expect(provider.apiKey).toBe(account2.apiKey);
            });
        });

        describe('Load Distribution', () => {
            test('should distribute load across multiple available accounts', async () => {
                const selectedAccounts: string[] = [];

                // Make multiple requests and track selected accounts
                for (let i = 0; i < 6; i++) {
                    const provider = await selectProvider(multiAccountConfig, rateLimitManager, chatRequest);
                    selectedAccounts.push(provider.apiKey);

                    // Record moderate usage for selected account
                    const account = provider.apiKey === mockAccount.apiKey ? mockAccount : account2;
                    await rateLimitManager.recordRequest(account, 50);
                }

                // Verify both accounts were used
                const uniqueAccounts = new Set(selectedAccounts);
                expect(uniqueAccounts.size).toBeGreaterThan(1);
                expect(uniqueAccounts).toContain(mockAccount.apiKey);
                expect(uniqueAccounts).toContain(account2.apiKey);
            });

            test('should prefer account with higher availability score', async () => {
                // Give first account high usage (80% of token limit)
                await rateLimitManager.recordRequest(mockAccount, 800);

                // Second account with no usage should be preferred
                const provider = await selectProvider(multiAccountConfig, rateLimitManager, chatRequest);
                expect(provider.apiKey).toBe(account2.apiKey);
            });
        });

        describe('Error Handling', () => {
            test('should throw error when all accounts exceed rate limits', async () => {
                // Exhaust both accounts' RPM limits
                await exhaustAccountRPM(rateLimitManager, mockAccount);
                await exhaustAccountRPM(rateLimitManager, account2);

                // Verify both accounts are at limit
                await verifyAccountAtLimit(rateLimitManager, mockAccount);
                await verifyAccountAtLimit(rateLimitManager, account2);

                // Should throw error when no accounts available
                await expect(selectProvider(multiAccountConfig, rateLimitManager, chatRequest))
                    .rejects.toThrow('All accounts have exceeded their rate limits');
            });

            test('should handle single account configuration gracefully', async () => {
                const singleAccountConfig = createMockConfig([mockAccount], storage);

                // Should work normally with single account
                const provider = await selectProvider(singleAccountConfig, rateLimitManager, chatRequest);
                expect(provider).toBeDefined();
                expect(provider.apiKey).toBe(mockAccount.apiKey);

                // Exhaust the single account
                await exhaustAccountRPM(rateLimitManager, mockAccount);

                // Should throw error when single account is exhausted
                await expect(selectProvider(singleAccountConfig, rateLimitManager, chatRequest))
                    .rejects.toThrow('All accounts have exceeded their rate limits');
            });
        });
    });
});
