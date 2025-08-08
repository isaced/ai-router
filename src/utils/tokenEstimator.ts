import type { ChatRequest } from '../types/chat';

/**
 * Simple token estimation utility
 */
export class TokenEstimator {
    /**
     * Estimate input tokens (approximately 4 characters = 1 token)
     * This is a simple estimation; for production use, consider using
     * a proper tokenizer library like tiktoken
     */
    estimateInputTokens(request: ChatRequest): number {
        const totalChars = request.messages.reduce((sum, msg) => {
            return sum + (msg.content?.length || 0);
        }, 0);

        return Math.ceil(totalChars / 4);
    }

    /**
     * Estimate tokens based on model type
     * Different models may have different tokenization patterns
     */
    estimateTokensByModel(request: ChatRequest, model: string): number {
        const baseEstimate = this.estimateInputTokens(request);

        // Apply model-specific adjustments if needed
        if (model.includes('gpt-4')) {
            return Math.ceil(baseEstimate * 1.05); // GPT-4 may use slightly more tokens
        }

        return baseEstimate;
    }
}
