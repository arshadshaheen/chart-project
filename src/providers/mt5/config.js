// MT5 provider configuration
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
 * @returns {string} API key (Bearer token)
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
    return config.baseUrl || 'http://localhost:3000';
}

/**
 * Get the WebSocket URL for the current provider
 * @returns {string} WebSocket URL
 */
export function getWebSocketUrl() {
    const config = getProviderConfig();
    return config.wsUrl || '';
}

/**
 * Validate the provider configuration
 * @returns {boolean} True if configuration is valid
 */
export function validateConfig() {
    const config = getProviderConfig();
    const errors = [];
    
    if (!config.apiKey || config.apiKey === '') {
        errors.push('API key (Bearer token) is not configured');
    }
    
    if (!config.baseUrl || config.baseUrl === '') {
        errors.push('Base URL is not configured');
    }
    
    if (!config.wsUrl || config.wsUrl === '') {
        errors.push('WebSocket URL is not configured');
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ [MT5 Config]: Validation errors:', errors);
        return false;
    }
    
    console.log('✅ [MT5 Config]: Configuration is valid');
    return true;
}

/**
 * Get MT5-specific configuration
 * @returns {Object} MT5 configuration
 */
export function getMt5Config() {
    const config = getProviderConfig();
    
    return {
        apiKey: config.apiKey || '',
        baseUrl: config.baseUrl || '',
        wsUrl: config.wsUrl || '',
        authType: 'bearer_token',
        timeout: config.timeout || 10000,
        retries: config.retries || 3,
        retryDelay: config.retryDelay || 1000
    };
}

/**
 * Get authentication headers for MT5 API
 * @returns {Object} Headers object
 */
export function getAuthHeaders() {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        return {};
    }
    
    return {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Get WebSocket authentication parameters
 * @returns {Object} WebSocket auth parameters
 */
export function getWebSocketAuth() {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        return {};
    }
    
    return {
        token: apiKey,
        type: 'bearer'
    };
}

// Export for backward compatibility
export const MT5_API_KEY = getApiKey();
