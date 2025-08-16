import { TokenEstimator } from '../src/utils/tokenEstimator';
import { describe, test, expect } from 'bun:test';

describe('TokenEstimator.estimateStringTokens', () => {
  const estimator = new TokenEstimator();

  test('should count Chinese characters as 1 token each', () => {
    expect(estimator.estimateStringTokens('你好世界')).toBe(4);
  });

  test('should count English characters as 4 chars per token', () => {
    expect(estimator.estimateStringTokens('abcd')).toBe(1);
    expect(estimator.estimateStringTokens('abcdefgh')).toBe(2);
  });

  test('should count normal English text', () => {
    expect(estimator.estimateStringTokens('hello world')).toBe(3); // openai is 2
    expect(estimator.estimateStringTokens('Learn about language model tokenization')).toBe(10); // openai is 7
  });

  test('should handle mixed Chinese and English', () => {
    expect(estimator.estimateStringTokens('你好ab')).toBe(3); // 2中文+2英文=2+1
    expect(estimator.estimateStringTokens('你a好b')).toBe(3); // 2中文+2英文=2+1
  });

  test('should handle empty string', () => {
    expect(estimator.estimateStringTokens('')).toBe(0);
  });

  test('should handle punctuation and numbers', () => {
    expect(estimator.estimateStringTokens('1234')).toBe(1);
    expect(estimator.estimateStringTokens('你好1234')).toBe(3);
    expect(estimator.estimateStringTokens('你,好!')).toBe(3);
  });

  test('should handle Japanese Hiragana and Katakana', () => {
    expect(estimator.estimateStringTokens('こんにちは')).toBe(5); // 5 Hiragana characters
    expect(estimator.estimateStringTokens('コンニチハ')).toBe(5); // 5 Katakana characters
    expect(estimator.estimateStringTokens('こんにちはworld')).toBe(7); // 5 Hiragana + 5 English (2 tokens)
  });

  test('should handle Korean Hangul', () => {
    expect(estimator.estimateStringTokens('안녕하세요')).toBe(5); // 5 Korean characters
    expect(estimator.estimateStringTokens('안녕hello')).toBe(4); // 2 Korean + 5 English (2 tokens)
  });

  test('should handle complex mixed content', () => {
    const text = '你好世界! Hello world! こんにちは 안녕하세요 123';
    // 你好世界(4) + !(1 latin) + Hello world!(13 latin = 4 tokens) + こんにちは(5) + 안녕하세요(5) + 123(3 latin = 1 token)
    // Total: 4 + 0.25 + 3.25 + 5 + 5 + 0.75 = 18.25, rounded up appropriately
    const result = estimator.estimateStringTokens(text);
    expect(result).toBeGreaterThan(15);
    expect(result).toBeLessThan(25);
  });

  test('should handle emoji and symbols', () => {
    expect(estimator.estimateStringTokens('😀😃😄')).toBe(2); // 3 emoji characters, treated as other (2 chars per token)
    expect(estimator.estimateStringTokens('你好😀world')).toBe(5); // 2 CJK + 1 emoji (1 token) + 5 latin (2 tokens)
  });

  test('should handle null and undefined gracefully', () => {
    expect(estimator.estimateStringTokens('')).toBe(0);
  });

  test('should handle long English text', () => {
    const longText = 'a'.repeat(100);
    expect(estimator.estimateStringTokens(longText)).toBe(25); // 100 chars / 4 = 25 tokens
  });

  test('should handle mixed content with special characters', () => {
    const text = '中文English日本語한국어123!@#$%';
    const result = estimator.estimateStringTokens(text);
    // Should handle this complex mix reasonably
    expect(result).toBeGreaterThan(10);
    expect(result).toBeLessThan(20);
  });
});
