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
  strategy?: "random" | "least-loaded";
}
