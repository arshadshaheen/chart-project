// Core configuration for the TradingView chart project
// All configuration is hardcoded here for simplicity

// Provider configuration - Change this to switch providers
const PROVIDER = 'mt5'; // Options: 'mt5' or 'cryptocompare'

// API Keys - Set your API keys here
const API_KEYS = {
    mt5: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwMTQzNSwicm9sZSI6eyJpZCI6MiwibmFtZSI6IkNsaWVudCIsImFwcE5hbWUiOiJjbGllbnQgcG9ydGFsIiwiZGVzY3JpcHRpb24iOm51bGwsImRlZmF1bHREYXNoYm9hcmQiOiJHZW5lcmFsIERhc2hib2FyZCIsImRhc2hib2FyZElkIjoxMDIsImlzUmVhZE9ubHkiOnRydWUsImRlcGFydG1lbnRJZCI6bnVsbCwiaXNIaWRkZW4iOnRydWUsImNhblNlZUVtYWlsIjp0cnVlLCJjYW5TZWVQaG9uZU51bWJlciI6dHJ1ZSwic2VlT3RoZXJDb25maWRlbnRpYWxEYXRhIjp0cnVlLCJjbG9uZWRGcm9tIjpudWxsLCJpc0FjdGl2ZSI6dHJ1ZSwiY3JlYXRlZEF0IjoiMjAyNC0wNS0yN1QxMjozMjo1Ni4wOTdaIiwidXBkYXRlZEF0IjoiMjAyNC0wNi0yM1QxNTowODowMi42NDBaIiwiX19lbnRpdHkiOiJSb2xlIn0sImxhbmd1YWdlSXNvIjoiRU4iLCJzZXNzaW9uSWQiOjc1MDAsImVtYWlsIjoiaGFuYW4uYSt0ZXlzeTFzdEBnYXRlc28uY29tIiwiaWF0IjoxNzU4MTc5NTM1LCJleHAiOjE3NTgyNjU5MzV9.kzSVQdvakEnNGldaSeusOF60Y1z4u0GIU_3dTOHz4xE',
    cryptocompare: 'e459128e835fcf1a73fdd58a89bedabf6efcb788838ebc612a613bb5166f8cc1'
};

// Provider configurations with hardcoded values
const PROVIDER_CONFIG = {
    cryptocompare: {
        apiKey: API_KEYS.cryptocompare,
        baseUrl: 'https://min-api.cryptocompare.com/',
        wsUrl: 'wss://streamer.cryptocompare.com/v2',
        defaultSymbol: 'Bitfinex:BTC/USDT',
        defaultInterval: '1D'
    },
    mt5: {
        apiKey: API_KEYS.mt5,
        baseUrl: 'http://localhost:3000',
        wsUrl: 'wss://live-mt5-sockets-staging.naqdi.com',
        defaultSymbol: 'EURUSD.s',
        defaultInterval: '1'
    }
};

// Get the active provider configuration
const activeProviderConfig = PROVIDER_CONFIG[PROVIDER];

// Final configuration object
const config = {
    PROVIDER: PROVIDER,
    PROVIDER_API_KEY: API_KEYS[PROVIDER],
    TRADINGVIEW_DEFAULT_SYMBOL: activeProviderConfig.defaultSymbol,
    TRADINGVIEW_DEFAULT_INTERVAL: activeProviderConfig.defaultInterval,
    DEBUG_MODE: 'true',
    PROVIDER_CONFIG: PROVIDER_CONFIG
};

// Validation function
export function validateConfig() {
    const errors = [];
    
    // Validate provider configuration
    const currentProvider = config.PROVIDER;
    const providerConfig = config.PROVIDER_CONFIG[currentProvider];
    
    if (!currentProvider) {
        errors.push('PROVIDER is not configured');
    }
    
    if (!providerConfig) {
        errors.push(`Provider configuration for '${currentProvider}' not found`);
    } else {
        if (!providerConfig.apiKey || providerConfig.apiKey === '') {
            errors.push(`API key for ${currentProvider} provider is not configured`);
        }
        
        if (!providerConfig.baseUrl || providerConfig.baseUrl === '') {
            errors.push(`Base URL for ${currentProvider} provider is not configured`);
        }
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ [validateConfig]: Configuration validation errors:', errors);
        console.warn('📝 [validateConfig]: Chart will work but with limitations');
        console.warn('📝 [validateConfig]: To fix: Update API keys in src/core/config.js');
    } else {
        console.log('✅ [validateConfig]: Configuration is valid');
    }
    
    return errors.length === 0;
}

// Helper functions
export function getCurrentProvider() {
    return config.PROVIDER;
}

export function getCurrentProviderConfig() {
    return config.PROVIDER_CONFIG[config.PROVIDER] || {};
}

export function getProviderConfig(providerName) {
    return config.PROVIDER_CONFIG[providerName] || {};
}

// Backward compatibility exports
export const CRYPTOCOMPARE_API_KEY = config.PROVIDER_CONFIG?.cryptocompare?.apiKey || '';

// Export the config object
export { config };
export default config;