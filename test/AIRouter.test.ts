import { describe, test, expect } from 'bun:test';
import AIRouter from '../src/AIRouter';
import type { AIRouterConfig } from '../src/types/types';

const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL;

if (!OPENAI_API_BASE_URL || !OPENAI_API_KEY || !LLM_MODEL) {
  throw new Error('Missing environment variables');
}

const routerConfig: AIRouterConfig = {
  providers: [
    {
      name: 'TestProvider',
      endpoint: OPENAI_API_BASE_URL,
      accounts: [
        {
          apiKey: OPENAI_API_KEY,
          models: [LLM_MODEL]
        }
      ],
    }
  ],
  strategy: 'random'
};


describe('AIRouter', () => {
  test('should return a chat completion response', async () => {
    const router = new AIRouter(routerConfig);

    const res = await router.chat({
      messages: [{
        role: 'user',
        content: '1+1=?'
      }]
    });
    expect(res).toBeDefined();
    expect(res.choices[0].message?.content).toBeDefined();
    expect(res.choices[0].message?.content?.length).toBeGreaterThanOrEqual(1);
  });
});