import { describe, test, expect, beforeEach } from 'bun:test';
import type { ChatRequest } from '../src/types/chat';
import { TokenEstimator } from '../src/utils/tokenEstimator';

describe('TokenEstimator', () => {

    let tokenEstimator: TokenEstimator;

    beforeEach(() => {
        tokenEstimator = new TokenEstimator();
    });

    test('should estimate tokens correctly', () => {
        const request: ChatRequest = {
            messages: [
                { role: 'user', content: 'Hello world!' } // 12 characters
            ]
        };

        const tokens = tokenEstimator.estimateInputTokens(request);
        expect(tokens).toBe(Math.ceil(12 / 4)); // Should be 3 tokens
    });

    test('should handle multiple messages', () => {
        const request: ChatRequest = {
            messages: [
                { role: 'user', content: 'Hello!' }, // 6 characters = 2 tokens
                { role: 'assistant', content: 'Hi there!' }, // 9 characters = 3 tokens
                { role: 'user', content: 'How are you?' } // 12 characters = 3 tokens
            ]
        };

        const tokens = tokenEstimator.estimateInputTokens(request);
        expect(tokens).toBe(8); // 2 + 3 + 3 = 8 tokens
    });

    test('should handle empty or null content', () => {
        const request: ChatRequest = {
            messages: [
                { role: 'user', content: '' },
                { role: 'assistant' } // no content
            ]
        };

        const tokens = tokenEstimator.estimateInputTokens(request);
        expect(tokens).toBe(0);
    });
});