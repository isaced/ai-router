import type { ChatRequest } from '../types/chat';

/**
 * Simple token estimation utility
 */
export class TokenEstimator {

    /**
     * Estimate the number of tokens in a string
     * Handles CJK (Chinese, Japanese, Korean) characters and mixed content
     * @param str The input string
     * @returns The estimated number of tokens
     */
    estimateStringTokens(str: string): number {
        if (!str) return 0;

        let cjkCount = 0;
        let latinCount = 0;
        let otherCount = 0;

        for (const char of str) {
            const code = char.codePointAt(0) || 0;

            // CJK characters (Chinese, Japanese, Korean)
            if (
                (code >= 0x4e00 && code <= 0x9fff) ||    // CJK Unified Ideographs
                (code >= 0x3400 && code <= 0x4dbf) ||    // CJK Extension A
                (code >= 0x20000 && code <= 0x2a6df) ||  // CJK Extension B
                (code >= 0x2a700 && code <= 0x2b73f) ||  // CJK Extension C
                (code >= 0x2b740 && code <= 0x2b81f) ||  // CJK Extension D
                (code >= 0x2b820 && code <= 0x2ceaf) ||  // CJK Extension E
                (code >= 0x2ceb0 && code <= 0x2ebef) ||  // CJK Extension F
                (code >= 0x30000 && code <= 0x3134f) ||  // CJK Extension G
                (code >= 0x3190 && code <= 0x319f) ||    // Kanbun
                (code >= 0x3100 && code <= 0x312f) ||    // Bopomofo
                (code >= 0x31a0 && code <= 0x31bf) ||    // Bopomofo Extended
                (code >= 0x3040 && code <= 0x309f) ||    // Hiragana
                (code >= 0x30a0 && code <= 0x30ff) ||    // Katakana
                (code >= 0xac00 && code <= 0xd7af)       // Hangul Syllables
            ) {
                cjkCount++;
            }
            // Latin characters, numbers, and common punctuation
            else if (
                (code >= 0x0020 && code <= 0x007f) ||    // Basic Latin
                (code >= 0x00a0 && code <= 0x00ff) ||    // Latin-1 Supplement
                (code >= 0x0100 && code <= 0x017f) ||    // Latin Extended-A
                (code >= 0x0180 && code <= 0x024f)       // Latin Extended-B
            ) {
                latinCount++;
            }
            // Other characters (symbols, emoji, etc.)
            else {
                otherCount++;
            }
        }

        // CJK characters: 1 token per character
        // Latin characters: approximately 4 characters per token
        // Other characters: approximately 2 characters per token (conservative estimate)
        return cjkCount + Math.ceil(latinCount / 4) + Math.ceil(otherCount / 2);
    }

    /**
     * Estimate the number of input tokens for a chat request
     * @param request The chat request
     * @returns The estimated number of input tokens
     */
    estimateInputTokens(request: ChatRequest): number {
        let tokens = 0;
        for (const msg of request.messages) {
            tokens += this.estimateStringTokens(msg.content || '');
        }
        return tokens;
    }
}
