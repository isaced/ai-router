import { AIRouter, type AIRouterConfig } from '@isaced/ai-router';
import { Hono } from 'hono';

const app = new Hono()

const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL;

const routerConfig: AIRouterConfig = {
  providers: [
    {
      name: 'TestProvider',
      endpoint: OPENAI_API_BASE_URL,
      accounts: [
        {
          apiKey: OPENAI_API_KEY!,
          models: [LLM_MODEL!],
          rateLimit: {
            rpm: 2,
          }
        },
        {
          apiKey: OPENAI_API_KEY!,
          models: [LLM_MODEL!],
          rateLimit: {
            rpm: 1,
          }
        }
      ],
    }
  ],
  strategy: 'rate-limit-aware'
};

const router = new AIRouter(routerConfig);

app.post('/v1/chat/completions', async (c) => {
  console.log('[Request] /v1/chat/completions...');

  try {
    const body = await c.req.json()
    const response = await router.chat({
      messages: body.messages
    })
    return c.json(response);
  } catch (error) {
    console.error('[Error] /v1/chat/completions:', error);
    return c.json({ error: error.message }, 500);
  }
});


export default app