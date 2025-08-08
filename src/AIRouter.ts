import type { AIRouterConfig, ChatRequest, Middleware } from "./types/types";
import type { ChatCompletion } from "./types/completions";
import { selectProvider } from './core/selectProvider';
import { sendRequest } from './core/sendRequest';

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
    if (!this.config.middleware) {
      this.config.middleware = [];
    }
    this.config.middleware.push(middleware);
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
  async chat(request: ChatRequest): Promise<ChatCompletion.ChatCompletion> {
    const providerModel = selectProvider(this.config);
    if (!providerModel) {
      throw new Error('No provider model found for the request');
    }
    return await sendRequest(providerModel, request);
  }

  // Intentionally left without private methods; logic lives in src/core/* modules
}

export default AIRouter;