/**
 * Account configuration for an AI service provider.
 */
export interface Account {

  /**
   * API key for the account.
   */
  apiKey: string;

  /**
   * List of models supported by the account.
   */
  models: string[];
}

/**
 * Configuration for an AI service provider.
 */
export interface Provider {

  /**
   * Name of the provider.
   */
  name: string;

  /**
   * Type of the provider.
   */
  type?: 'openai' | 'ollama';

  /**
   * Endpoint for the provider's API.
   * 
   * @default 'https://api.openai.com/v1'
   */
  endpoint?: string;

  /**
   * List of accounts for the provider.
   */
  accounts: Account[];
}

/**
 * Configuration for the AIRouter.
 */
export interface AIRouterConfig {
  /**
   * List of providers to use.
   */
  providers: Provider[];

  /**
   * Strategy for selecting providers.
   * 
   * @default 'random'
   */
  strategy?: 'random' | 'least-loaded';

  /**
   * List of middleware functions to use.
   */
  middleware?: Middleware[];
}

/**
 * Request object for a chat request.
 */
export interface ChatRequest {
  model?: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Response object for a chat request.
 */
export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type Middleware = (req: any, next: (req: any) => Promise<any>) => Promise<any>;