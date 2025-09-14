// Core configuration for the TradingView chart project
// This file handles loading environment variables and provider configuration

// Default configuration values
const DEFAULT_CONFIG = {
    // Provider configuration
    PROVIDER: 'cryptocompare', // Default provider
    PROVIDER_CONFIG: {
        cryptocompare: {
            apiKey: '',
            baseUrl: 'https://min-api.cryptocompare.com/',
            wsUrl: 'wss://streamer.cryptocompare.com/v2'
        },
        mt5: {
            apiKey: '',
            baseUrl: '', // Will be set when MT5 is implemented
            wsUrl: '' // Will be set when MT5 is implemented
        }
    },
    
    // TradingView configuration
    TRADINGVIEW_DEFAULT_SYMBOL: 'Bitfinex:BTC/USDT',
    TRADINGVIEW_DEFAULT_INTERVAL: '1D',
    DEBUG_MODE: 'true'
};

// Function to load environment variables
function loadEnvironmentConfig() {
    const config = { ...DEFAULT_CONFIG };
    
    // Try to load from window.env (set by a build process or script)
    if (typeof window !== 'undefined' && window.env) {
        Object.assign(config, window.env);
    }
    
    // Try to load from process.env (if available in build environment)
    if (typeof process !== 'undefined' && process.env) {
        Object.assign(config, process.env);
    }
    
    // For development, you can also check for a local config
    if (typeof window !== 'undefined' && window.localConfig) {
        Object.assign(config, window.localConfig);
    }
    
    // Check if provider is configured
    const currentProvider = config.PROVIDER;
    const providerConfig = config.PROVIDER_CONFIG[currentProvider];
    
    if (providerConfig && providerConfig.apiKey && providerConfig.apiKey !== '') {
        console.log(`✅ [config]: ${currentProvider} provider configured`);
    } else {
        console.log(`⚠️ [config]: No API key configured for ${currentProvider} provider`);
        console.log('📝 [config]: To add an API key:');
        if (currentProvider === 'cryptocompare') {
            console.log('   1. Get a free key from: https://min-api.cryptocompare.com/');
            console.log('   2. Add it to PROVIDER_CONFIG.cryptocompare.apiKey in your HTML');
        } else {
            console.log(`   1. Configure API key for ${currentProvider} provider`);
            console.log(`   2. Add it to PROVIDER_CONFIG.${currentProvider}.apiKey in your HTML`);
        }
    }
    
    return config;
}

// Load the configuration
export const config = loadEnvironmentConfig();

// Validation function
export function validateConfig() {
    const errors = [];
    
    // Check if config is loaded
    if (!config) {
        console.warn('⚠️ [validateConfig]: Config not yet loaded');
        return false;
    }
    
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
        console.warn('📝 [validateConfig]: To fix: Configure provider settings in your HTML');
    } else {
        console.log('✅ [validateConfig]: Configuration is valid');
    }
    
    return errors.length === 0;
}

// Export individual config values for convenience
export const {
    PROVIDER,
    PROVIDER_CONFIG,
    TRADINGVIEW_DEFAULT_SYMBOL,
    TRADINGVIEW_DEFAULT_INTERVAL,
    DEBUG_MODE
} = config;

// Backward compatibility exports
export const CRYPTOCOMPARE_API_KEY = config.PROVIDER_CONFIG?.cryptocompare?.apiKey || '';

// Helper functions
export function getCurrentProvider() {
    return PROVIDER;
}

export function getCurrentProviderConfig() {
    return PROVIDER_CONFIG[PROVIDER] || {};
}

export function getProviderConfig(providerName) {
    return PROVIDER_CONFIG[providerName] || {};
}

// Export the config object
export default config;
