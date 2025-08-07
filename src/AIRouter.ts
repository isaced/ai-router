import { AIRouterConfig, ChatRequest, ChatResponse, Middleware, Provider } from "./types";

/**
 * A lightweight, framework-agnostic router for AI/LLM API requests.
 * 
 * Distribute traffic across multiple providers (OpenAI, Anthropic, Gemini, etc.), 
 * accounts, and models with built-in **load balancing**, **failover**, and **easy extensibility**.
 * 
 * @class AIRouter
 * @example
 * ```
 * const config = {
 *   providers: [
 *     {
 *       name: 'provider1',
 *       type: 'openai',
 *       endpoint: 'https://api.provider1.com',
 *       accounts: [{
 *         apiKey: 'key1',
 *         models: ['gpt-3.5-turbo', 'gpt-4']
 *       }]
 *     }
 *   ],
 *   strategy: 'random'
 * };
 * const router = new AIRouter(config);
 * ```
 */
class AIRouter {

  private config: AIRouterConfig;

  /**
   * Creates an instance of AIRouter.
   * 
   * @param {AIRouterConfig} config - Configuration object for the router
   * @param {Provider[]} config.providers - List of AI service providers
   * @param {'random' | 'least-loaded'} [config.strategy='random'] - Strategy for selecting providers
   */
  constructor(config: AIRouterConfig = { providers: [], strategy: 'random' }) {
    this.config = config;
  }

  /**
   * Adds middleware to process requests before they are routed to providers.
   * 
   * @param {Middleware} middleware - Middleware function to add
   * @returns {AIRouter} The router instance for chaining
   */
  use(middleware: Middleware): AIRouter {
    return this;
  }

  /**
   * Sends a chat request to an appropriate AI provider based on the configured strategy.
   * 
   * @param {ChatRequest} request - Chat request object
   * @param {string} request.model - Model to use for the request
   * @param {{role: string, content: string}[]} request.messages - Array of messages
   * @returns {Promise<ChatResponse>} Promise resolving to the chat response
   * @throws {Error} If no provider is found for the requested model
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const provider = this.selectProvider();
    if (!request.model) {
      throw new Error('Model is required in the request');
    }
    return await this.sendRequest(provider, request);
  }

  /**
   * Selects a provider based on the configured strategy.
   * 
   * @returns {Provider} Selected provider
   * @private
   */
  private selectProvider(): Provider {
    console.log(this.config,this.config.strategy);
    if (this.config.strategy === 'random') {
      return this.config.providers[Math.floor(Math.random() * this.config.providers.length)];
    } else if (this.config.strategy === 'least-loaded') {
      // TODO: Implement least-loaded strategy
      throw new Error('Least-loaded strategy not implemented');
    }
    throw new Error('No provider found for the requested model');
  }

  /**
   * Sends a request to the selected provider.
   * 
   * @param {Provider} provider - Provider to send the request to
   * @param {ChatRequest} request - Chat request object
   * @returns {Promise<ChatResponse>} Promise resolving to the chat response
   * @private
   */
  private async sendRequest(provider: Provider, request: ChatRequest): Promise<ChatResponse> {
    const account = provider.accounts[0];
    const url = new URL('/chat/completions', provider.endpoint);
    console.log(url.toString());
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    const data = await response.json() as ChatResponse;
    console.log(data);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return data;
  }
}

export default AIRouter;