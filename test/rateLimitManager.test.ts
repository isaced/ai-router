import { describe, test, expect, beforeEach } from 'bun:test';
import type { Account } from '../src/types/types';
import { RateLimitManager } from '../src/core/rateLimitManager';
import type { ChatRequest } from '../src/types/chat';
import { MemoryUsageStorage } from '../src/core/usageStorage';

describe('RateLimitManager', () => {

    let storage: MemoryUsageStorage;
    let rateLimitManager: RateLimitManager;
    let mockAccount: Account;
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

        chatRequest = {
            messages: [
                { role: 'user', content: 'Hello, how are you?' }
            ]
        };

        // Clear storage before each test
        storage.clear();
    });

    test('should allow requests when no limits are set', async () => {
        const unlimitedAccount: Account = {
            apiKey: 'unlimited-key',
            models: ['gpt-3.5-turbo']
            // No rateLimit set
        };

        const canHandle = await rateLimitManager.canHandleRequest(unlimitedAccount, 1000);
        expect(canHandle).toBe(true);
    });

    test('should check RPM limits', async () => {
        // Use up all RPM allowance
        for (let i = 0; i < 10; i++) {
            await rateLimitManager.recordRequest(mockAccount, 10);
        }

        // Should now be at limit
        const canHandle = await rateLimitManager.canHandleRequest(mockAccount, 0);
        expect(canHandle).toBe(false);
    });

    test('should check TPM limits', async () => {
        // Request with tokens that would exceed TPM
        const canHandle = await rateLimitManager.canHandleRequest(mockAccount, 1001);
        expect(canHandle).toBe(false);
    });

    test('should check RPD limits', async () => {
        // Use up all RPD allowance
        for (let i = 0; i < 100; i++) {
            await rateLimitManager.recordRequest(mockAccount, 1);
        }

        // Should now be at limit
        const canHandle = await rateLimitManager.canHandleRequest(mockAccount, 0);
        expect(canHandle).toBe(false);
    });

    test('should record request usage correctly', async () => {
        await rateLimitManager.recordRequest(mockAccount, 50);

        const usage = await rateLimitManager.getUsage(mockAccount);
        expect(usage?.requestsThisMinute).toBe(1);
        expect(usage?.tokensThisMinute).toBe(50);
        expect(usage?.requestsToday).toBe(1);
    });

    test('should calculate availability score correctly', async () => {
        // Fresh account should have score of 1.0
        let score = await rateLimitManager.getAvailabilityScore(mockAccount);
        expect(score).toBe(1.0);

        // Use half of RPM allowance
        for (let i = 0; i < 5; i++) {
            await rateLimitManager.recordRequest(mockAccount, 50);
        }

        score = await rateLimitManager.getAvailabilityScore(mockAccount);
        expect(score).toBeLessThan(1.0);
        expect(score).toBeGreaterThan(0);
    });

    test('should estimate tokens for requests', () => {
        const tokens = rateLimitManager.estimateTokens(chatRequest, 'gpt-3.5-turbo');
        expect(tokens).toBeGreaterThan(0);
    });
});