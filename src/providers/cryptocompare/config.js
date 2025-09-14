// CryptoCompare provider configuration
import { getCurrentProviderConfig } from '../../core/config.js';

/**
 * Get the current provider configuration
 * @returns {Object} Provider configuration
 */
export function getProviderConfig() {
    return getCurrentProviderConfig();
}

/**
 * Get the API key for the current provider
 * @returns {string} API key
 */
export function getApiKey() {
    const config = getProviderConfig();
    return config.apiKey || '';
}

/**
 * Get the base URL for the current provider
 * @returns {string} Base URL
 */
export function getBaseUrl() {
    const config = getProviderConfig();
    return config.baseUrl || 'https://min-api.cryptocompare.com/';
}

/**
 * Get the WebSocket URL for the current provider
 * @returns {string} WebSocket URL
 */
export function getWebSocketUrl() {
    const config = getProviderConfig();
    return config.wsUrl || 'wss://streamer.cryptocompare.com/v2';
}

/**
 * Validate the provider configuration
 * @returns {boolean} True if configuration is valid
 */
export function validateConfig() {
    const config = getProviderConfig();
    const errors = [];
    
    if (!config.apiKey || config.apiKey === '') {
        errors.push('API key is not configured');
    }
    
    if (!config.baseUrl || config.baseUrl === '') {
        errors.push('Base URL is not configured');
    }
    
    if (!config.wsUrl || config.wsUrl === '') {
        errors.push('WebSocket URL is not configured');
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ [CryptoCompare Config]: Validation errors:', errors);
        return false;
    }
    
    console.log('✅ [CryptoCompare Config]: Configuration is valid');
    return true;
}

// Export for backward compatibility
export const CRYPTOCOMPARE_API_KEY = getApiKey();
