/**
 * Rate limiting configuration for an account
 */
export interface RateLimit {
  /**
   * Requests per minute limit
   */
  rpm?: number;

  /**
   * Tokens per minute limit (input tokens)
   */
  tpm?: number;

  /**
   * Requests per day limit
   */
  rpd?: number;
}

/**
 * Usage tracking data for rate limits
 */
export interface UsageData {
  requestsThisMinute: number;
  tokensThisMinute: number;
  requestsToday: number;
  lastResetTime: {
    minute: number;  // Timestamp in minutes
    day: number;     // Timestamp in days
  };
}

/**
 * Abstract interface for storing and retrieving usage data
 */
export interface UsageStorage {
  /**
   * Get usage data for an account
   */
  get(accountId: string): Promise<UsageData | null>;

  /**
   * Set usage data for an account
   */
  set(accountId: string, usage: UsageData): Promise<void>;

  /**
   * Atomically increment usage counters
   * Returns the updated usage data after increment
   */
  increment?(accountId: string, requestCount: number, tokenCount: number): Promise<UsageData>;
}

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

  /**
   * Rate limiting configuration for this account
   */
  rateLimit?: RateLimit;
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
  type?: "openai" | "ollama";

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
 * Configuration for a model of an AI service provider.
 */
export interface ProviderModel {
  /**
   * Model name.
   */
  model: string;

  /**
   * Endpoint for the model.
   */
  endpoint: string;

  /**
   * API key for the model.
   */
  apiKey: string;
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
  strategy?: "random" | "rate-limit-aware";

  /**
   * Custom storage adapter for usage data
   */
  usageStorage?: UsageStorage;
}
