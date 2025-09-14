// Provider factory and selector
import CryptoCompareProvider from './cryptocompare/index.js';
// import MT5Provider from './mt5/index.js'; // Will be added when MT5 is implemented

const PROVIDERS = {
    cryptocompare: CryptoCompareProvider,
    // mt5: MT5Provider, // Will be added when MT5 is implemented
};

/**
 * Get the configured provider instance
 * @param {string} providerName - Name of the provider (e.g., 'cryptocompare', 'mt5')
 * @returns {Object} Provider instance with datafeed, helpers, streaming, and config
 */
export function getProvider(providerName) {
    const Provider = PROVIDERS[providerName];
    
    if (!Provider) {
        throw new Error(`Provider '${providerName}' not found. Available providers: ${Object.keys(PROVIDERS).join(', ')}`);
    }
    
    return Provider;
}

/**
 * Get all available providers
 * @returns {Array} List of available provider names
 */
export function getAvailableProviders() {
    return Object.keys(PROVIDERS);
}

/**
 * Check if a provider is available
 * @param {string} providerName - Name of the provider
 * @returns {boolean} True if provider is available
 */
export function isProviderAvailable(providerName) {
    return providerName in PROVIDERS;
}

export default {
    getProvider,
    getAvailableProviders,
    isProviderAvailable,
    PROVIDERS
};
