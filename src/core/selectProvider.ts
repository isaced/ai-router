import type { AIRouterConfig, ProviderModel } from '../types/types';

/**
 * Selects a provider model based on the configuration.
 * 
 * @param config - The configuration for the router.
 * @returns The selected provider model.
 */
export function selectProvider(config: AIRouterConfig): ProviderModel {
    if (!config.providers || config.providers.length === 0) {
        throw new Error('No providers configured');
    }

    // Flatten the providers structure
    const providerModels: Array<ProviderModel> = config.providers.flatMap(provider =>
        provider.accounts.flatMap(account =>
            account.models.map(model => ({
                model,
                endpoint: provider.endpoint || 'https://api.openai.com/v1',
                apiKey: account.apiKey
            }))
        )
    );


    // Random strategy
    if (config.strategy === 'random' || !config.strategy) {
        return providerModels[Math.floor(Math.random() * providerModels.length)];
    }

    // Least-loaded strategy
    if (config.strategy === 'least-loaded') {
        // TODO: Implement least-loaded strategy
        throw new Error('Least-loaded strategy not implemented');
    }

    throw new Error('No provider found for the requested model');
}