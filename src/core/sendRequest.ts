import type { ChatCompletion } from '../types/completions';
import type { ChatRequest, ProviderModel } from '../types/types';

/**
 * Sends a chat request to an AI provider.
 * 
 * @param providerModel - The provider model to use.
 * @param request - The chat request to send.
 * @returns The chat completion response.
 */
export async function sendRequest(providerModel: ProviderModel, request: ChatRequest): Promise<ChatCompletion.ChatCompletion> {
    const endpoint = providerModel.endpoint;
    const url = `${endpoint}/chat/completions`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${providerModel.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, model: providerModel.model })
    });
    const data = await response.json() as ChatCompletion.ChatCompletion;
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    return data;
}


