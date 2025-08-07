import { describe } from 'node:test';
import AIRouter from '../src/AIRouter';

describe('AIRouter', async () => {
  const router = new AIRouter({
    providers: [
      {
        name: 'TestProvider',
        endpoint: process.env.OPENAI_API_BASE_URL!,
        accounts: [
          {
            apiKey: process.env.OPENAI_API_KEY!,
            models: [process.env.LLM_MODEL!]
          }
        ],
      }
    ],
    strategy: 'random'
  });
  
  const res = await router.chat({
    messages: [{
      role: 'user',
      content: '你好'
    }]
  })
  console.log(res)
});