import { describe, test, expect, beforeEach } from 'bun:test';
import { MemoryUsageStorage } from '../src/core/usageStorage';
import type { UsageData } from '../src/types/types';

describe('MemoryUsageStorage', () => {
    let storage: MemoryUsageStorage;

    beforeEach(() => {
        storage = new MemoryUsageStorage();
    });

    test('should initialize with empty data', async () => {
        const usage = await storage.get('test-account');
        expect(usage).toBeNull();
    });

    test('should store and retrieve usage data', async () => {
        const usageData: UsageData = {
            requestsThisMinute: 5,
            tokensThisMinute: 100,
            requestsToday: 20,
            lastResetTime: {
                minute: Math.floor(Date.now() / 60000),
                day: Math.floor(Date.now() / 86400000)
            }
        };

        await storage.set('test-account', usageData);
        const retrieved = await storage.get('test-account');

        expect(retrieved).toEqual(usageData);
    });

    test('should atomically increment usage data', async () => {
        const result = await storage.increment('test-account', 2, 50);

        expect(result.requestsThisMinute).toBe(2);
        expect(result.tokensThisMinute).toBe(50);
        expect(result.requestsToday).toBe(2);
        expect(result.lastResetTime.minute).toBe(Math.floor(Date.now() / 60000));
        expect(result.lastResetTime.day).toBe(Math.floor(Date.now() / 86400000));
    });

    test('should reset minute counters when time changes', async () => {
        // Set initial usage
        const initialUsage: UsageData = {
            requestsThisMinute: 5,
            tokensThisMinute: 100,
            requestsToday: 10,
            lastResetTime: {
                minute: Math.floor(Date.now() / 60000) - 1, // 1 minute ago
                day: Math.floor(Date.now() / 86400000)
            }
        };

        await storage.set('test-account', initialUsage);

        // Increment should reset minute counters
        const result = await storage.increment('test-account', 1, 20);

        expect(result.requestsThisMinute).toBe(1); // Reset + increment
        expect(result.tokensThisMinute).toBe(20); // Reset + increment
        expect(result.requestsToday).toBe(11); // Should not reset
    });

    test('should reset day counters when day changes', async () => {
        // Set initial usage
        const initialUsage: UsageData = {
            requestsThisMinute: 5,
            tokensThisMinute: 100,
            requestsToday: 50,
            lastResetTime: {
                minute: Math.floor(Date.now() / 60000),
                day: Math.floor(Date.now() / 86400000) - 1 // 1 day ago
            }
        };

        await storage.set('test-account', initialUsage);

        // Increment should reset day counters
        const result = await storage.increment('test-account', 1, 20);

        expect(result.requestsToday).toBe(1); // Reset + increment
    });
});