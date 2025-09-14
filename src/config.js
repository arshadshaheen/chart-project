// Environment configuration for the TradingView chart project
// This file handles loading environment variables from different sources

// Default configuration values
const DEFAULT_CONFIG = {
    CRYPTOCOMPARE_API_KEY: '',
    TRADINGVIEW_DEFAULT_SYMBOL: 'Bitfinex:BTC/USDT',
    TRADINGVIEW_DEFAULT_INTERVAL: '1D',
    DEBUG_MODE: 'false'
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
    
    return config;
}

// Load the configuration
export const config = loadEnvironmentConfig();

// Validation function
export function validateConfig() {
    const errors = [];
    
    if (!config.CRYPTOCOMPARE_API_KEY) {
        errors.push('CRYPTOCOMPARE_API_KEY is required');
    }
    
    if (errors.length > 0) {
        console.warn('Configuration validation errors:', errors);
        console.warn('Please check your environment configuration');
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
