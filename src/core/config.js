// Core configuration for the TradingView chart project
// Configuration is now loaded securely from server via /api/config endpoint

// Default fallback configuration (used if server config fails)
const FALLBACK_CONFIG = {
    PROVIDER: 'mt5',
    PROVIDER_API_KEY: '',
    TRADINGVIEW_DEFAULT_SYMBOL: 'EURUSD.s',
    TRADINGVIEW_DEFAULT_INTERVAL: '1',
    DEBUG_MODE: 'true',
    PROVIDER_CONFIG: {
        cryptocompare: {
            apiKey: '',
            baseUrl: 'https://min-api.cryptocompare.com/',
            wsUrl: 'wss://streamer.cryptocompare.com/v2',
            defaultSymbol: 'Bitfinex:BTC/USDT',
            defaultInterval: '1D'
        },
        mt5: {
            apiKey: '',
            baseUrl: 'http://localhost:3000',
            wsUrl: 'wss://live-mt5-sockets-staging.naqdi.com',
            defaultSymbol: 'EURUSD.s',
            defaultInterval: '1',
            isFakeData: 0
        }
    }
};

// Global config object - will be populated by loadConfig()
let config = { ...FALLBACK_CONFIG };
let configLoaded = false;
let configLoadPromise = null;

/**
 * Load configuration from server endpoint
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfigFromServer() {
    try {
        console.log('🔄 [Config] Loading configuration from server...');
        
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const serverConfig = await response.json();
        console.log('✅ [Config] Configuration loaded from server:', serverConfig);
        
        // Merge server config with fallback config
        config = {
            ...FALLBACK_CONFIG,
            ...serverConfig,
            PROVIDER_CONFIG: {
                ...FALLBACK_CONFIG.PROVIDER_CONFIG,
                ...serverConfig.PROVIDER_CONFIG
            }
        };
        
        configLoaded = true;
        return config;
        
    } catch (error) {
        console.warn('⚠️ [Config] Failed to load configuration from server:', error);
        console.warn('⚠️ [Config] Using fallback configuration');
        
        config = { ...FALLBACK_CONFIG };
        configLoaded = true;
        return config;
    }
}

/**
 * Get configuration (loads from server if not already loaded)
 * @returns {Promise<Object>} Configuration object
 */
export async function getConfig() {
    if (configLoaded) {
        return config;
    }
    
    if (configLoadPromise) {
        return configLoadPromise;
    }
    
    configLoadPromise = loadConfigFromServer();
    return configLoadPromise;
}

/**
 * Synchronous config getter (returns current config, may be fallback)
 * @returns {Object} Configuration object
 */
export function getConfigSync() {
    return config;
}

/**
 * Check if config has been loaded from server
 * @returns {boolean} True if config loaded from server
 */
export function isConfigLoaded() {
    return configLoaded;
}

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
        console.warn('📝 [validateConfig]: To fix: Update environment variables in .env file');
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
export const CRYPTOCOMPARE_API_KEY = () => config.PROVIDER_CONFIG?.cryptocompare?.apiKey || '';

// Export the config object (for backward compatibility)
export { config };
export default config;