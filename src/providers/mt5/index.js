// MT5 provider implementation (placeholder)
// This will be implemented when MT5 API responses are shared

export default {
    name: 'mt5',
    displayName: 'MT5 (Naqdi)',
    description: 'MT5-based provider for trading data',
    
    // Provider modules (to be implemented)
    datafeed: null, // Will be implemented
    helpers: {
        makeApiRequest: null, // Will be implemented
        generateSymbol: null, // Will be implemented
        parseFullSymbol: null, // Will be implemented
    },
    streaming: {
        subscribeOnStream: null, // Will be implemented
        unsubscribeFromStream: null, // Will be implemented
    },
    config: {
        validateConfig: null, // Will be implemented
    },
    
    // Provider-specific configuration
    configSchema: {
        apiKey: {
            type: 'string',
            required: true,
            description: 'MT5 API key or Bearer token'
        },
        baseUrl: {
            type: 'string',
            required: true,
            description: 'Base URL for MT5 API'
        },
        wsUrl: {
            type: 'string',
            required: true,
            description: 'WebSocket URL for real-time data'
        }
    },
    
    // Authentication type
    authType: 'bearer_token', // or 'api_key' depending on MT5 implementation
    
    // Status
    status: 'not_implemented'
};
