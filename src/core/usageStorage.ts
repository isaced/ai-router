import type { UsageStorage, UsageData } from '../types/types';

/**
 * Default in-memory storage implementation with atomic operations
 */
export class MemoryUsageStorage implements UsageStorage {
    private data: Map<string, UsageData> = new Map();

    async get(accountId: string): Promise<UsageData | null> {
        return this.data.get(accountId) || null;
    }

    async set(accountId: string, usage: UsageData): Promise<void> {
        this.data.set(accountId, usage);
    }

    /**
     * Atomically increment usage counters with automatic reset logic
     */
    async increment(accountId: string, requestCount: number, tokenCount: number): Promise<UsageData> {
        let usage = this.data.get(accountId);

        if (!usage) {
            // Initialize new usage data
            const now = Date.now();
            usage = {
                requestsThisMinute: 0,
                tokensThisMinute: 0,
                requestsToday: 0,
                lastResetTime: {
                    minute: Math.floor(now / 60000),
                    day: Math.floor(now / 86400000)
                }
            };
        }

        // Check if we need to reset counters
        const now = Date.now();
        const currentMinute = Math.floor(now / 60000);
        const currentDay = Math.floor(now / 86400000);

        // Reset minute counters
        if (usage.lastResetTime.minute !== currentMinute) {
            usage.requestsThisMinute = 0;
            usage.tokensThisMinute = 0;
            usage.lastResetTime.minute = currentMinute;
        }

        // Reset day counters
        if (usage.lastResetTime.day !== currentDay) {
            usage.requestsToday = 0;
            usage.lastResetTime.day = currentDay;
        }

        // Increment counters
        usage.requestsThisMinute += requestCount;
        usage.tokensThisMinute += tokenCount;
        usage.requestsToday += requestCount;

        // Save back to storage
        this.data.set(accountId, usage);

        return { ...usage }; // Return a copy
    }

    /**
     * Clear all usage data (useful for testing)
     */
    clear(): void {
        this.data.clear();
    }
}
