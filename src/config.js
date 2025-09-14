// Environment configuration for the TradingView chart project
// This file handles loading environment variables from different sources

// Default configuration values
const DEFAULT_CONFIG = {
    CRYPTOCOMPARE_API_KEY: '',
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
    
    // Check if API key is set
    if (config.CRYPTOCOMPARE_API_KEY && config.CRYPTOCOMPARE_API_KEY !== 'your_api_key_here') {
        console.log('✅ [config]: API key is configured');
    } else {
        console.log('⚠️ [config]: No API key configured - chart will work but with rate limits');
        console.log('📝 [config]: To add an API key:');
        console.log('   1. Get a free key from: https://min-api.cryptocompare.com/');
        console.log('   2. Add it to window.env.CRYPTOCOMPARE_API_KEY in your HTML');
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
    
    if (!config.CRYPTOCOMPARE_API_KEY || config.CRYPTOCOMPARE_API_KEY === '') {
        errors.push('CRYPTOCOMPARE_API_KEY is not configured');
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ [validateConfig]: Configuration validation errors:', errors);
        console.warn('📝 [validateConfig]: Chart will work but with limitations');
        console.warn('📝 [validateConfig]: To fix: Add API key to window.env in your HTML');
    } else {
        console.log('✅ [validateConfig]: Configuration is valid');
    }
    
    return errors.length === 0;
}

// Export individual config values for convenience
export const {
    CRYPTOCOMPARE_API_KEY,
    TRADINGVIEW_DEFAULT_SYMBOL,
    TRADINGVIEW_DEFAULT_INTERVAL,
    DEBUG_MODE
} = config;

// Export the config object
export default config;
