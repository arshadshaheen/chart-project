// Provider factory and selector
import { getCurrentProvider } from '../core/config.js';

/**
 * Get the currently active provider based on core configuration
 * @returns {Object} Active provider instance
 */
export function getActiveProvider() {
    const currentProviderName = getCurrentProvider();
    console.log(`🔄 [Provider Selector]: Active provider set to: ${currentProviderName}`);
    
    if (currentProviderName === 'mt5') {
        // Import MT5 provider dynamically
        return import('./mt5/index.js').then(m => m.default);
    } else if (currentProviderName === 'cryptocompare') {
        // Import CryptoCompare provider dynamically
        return import('./cryptocompare/index.js').then(m => m.default);
    } else {
        throw new Error(`Unknown provider: ${currentProviderName}`);
    }
}

export default {
    getActiveProvider
};
