# ai-router 🤖🔄

**A lightweight, framework-agnostic router for AI/LLM API requests.**

Distribute traffic across multiple providers (OpenAI, Anthropic, Gemini, etc.), accounts, and models with built-in **load balancing**, **failover**, and **easy extensibility**.

Perfect for developers building resilient, scalable AI applications without vendor lock-in.

> 🚀 One interface. Multiple backends. Zero downtime.

## ✨ Features

- ✅ **Multi-provider support**: OpenAI, Anthropic, Google Gemini, Azure, and more (or your own)
- 🔁 **Load balancing**: Random, or least-loaded distribution across keys/accounts
- 🛟 **Failover & retry**: Automatically switch to backup providers on error or timeout
- 🧩 **Pluggable middleware**: Add auth, logging, rate limiting, caching, etc.
- ⚡ **Lightweight & dependency-free**: Works in Node.js, serverless, and edge runtimes
- 📦 **Framework-agnostic**: Use with Hono, Express, Fastify or standalone
- 💻 **TypeScript ready**: Full type definitions included
- 🔄 **Zero dependencies**: 0 dependencies

## 📦 Installation

```bash
npm install ai-router
```

## 🚀 Quick Start

```ts
import { AIRouter } from 'ai-router';

// Define your providers and API keys
const router = new AIRouter({
  providers: [
    {
      name: 'openai-primary',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1',
      accounts: [
        {
          apiKey: 'sk-xxx',
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
        },
        {
          apiKey: 'sk-yyy',
          models: ['gpt-3.5-turbo']
        }
      ],
    },
    {
      name: 'custom-provider',
      type: 'custom',
      endpoint: 'https://your-custom-api.com/v1',
      accounts: [
        {
          apiKey: 'custom-key-1',
          models: ['custom-model-1', 'custom-model-2'],
        }
      ]
    }
  ]
});

// Route a chat completion request
const response = await router.chat({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response);
```

## ⚙️ Advanced: Middleware

Extend behavior with middleware:

```ts
router.use(async (req, next) => {
  console.log('Outgoing request:', req.url);
  const start = Date.now();
  const res = await next(req);
  console.log('Response time:', Date.now() - start, 'ms');
  return res;
});

// Add rate limiting
router.use(rateLimit({ max: 1000 / 60 })); // 1000 RPM
```

Build your own for caching, tracing, or authentication.

## 🔁 Load Balancing Strategies

```ts
new AIRouter({
  providers: [...],
  strategy: 'random' // or 'least-loaded'
})
```

- `random`: Random pick (fast)
- `least-loaded`: Pick least busy (requires health tracking)

## 🧪 Running in Serverless / Edge

Works seamlessly in Vercel, Cloudflare Workers, Netlify, etc.:

```ts
// api/chat.js (Vercel Function)
export default async function handler(req, res) {
  const { messages } = req.body;
  const response = await router.chat({ model: 'gpt-4', messages });
  res.json(response);
}
```

## 🛠️ Development

```bash
git clone https://github.com/isaced/ai-router.git
cd ai-router
npm install
npm run build
npm test
```

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.


## 📄 License

MIT

---

> 🌐 Route your AI. Balance your load. Avoid your limits.
>
> Made with ❤️ for developers building the future of AI. 