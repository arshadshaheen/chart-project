// MT5 provider implementation
import Datafeed from './datafeed.js';
import { makeApiRequest, generateSymbol, parseFullSymbol, parseMt5DohlcData, getSymbolPrecision, parseMt5ApiResponse } from './helpers.js';
import { subscribeOnStream, unsubscribeFromStream } from './streaming.js';
import { validateConfig, getAuthHeaders } from './config.js';

export default {
    name: 'mt5',
    displayName: 'MT5 (Naqdi)',
    description: 'MT5-based provider for trading data with DOHLC format support',
    
    // Provider modules
    datafeed: Datafeed,
    helpers: {
        makeApiRequest,
        generateSymbol,
        parseFullSymbol,
        parseMt5DohlcData,
        getSymbolPrecision,
        parseMt5ApiResponse
    },
    streaming: {
        subscribeOnStream,
        unsubscribeFromStream
    },
    config: {
        validateConfig,
        getAuthHeaders
    },
    
    // Provider-specific configuration
    configSchema: {
        apiKey: {
            type: 'string',
            required: true,
            description: 'MT5 Bearer token for API authentication'
        },
        baseUrl: {
            type: 'string',
            required: true,
            description: 'Base URL for MT5 REST API'
        },
        wsUrl: {
            type: 'string',
            required: true,
            description: 'WebSocket URL for real-time data streaming'
        },
        timeout: {
            type: 'number',
            default: 10000,
            description: 'Request timeout in milliseconds'
        },
        retries: {
            type: 'number',
            default: 3,
            description: 'Number of retry attempts for failed requests'
        }
    },
    
    // Authentication type
    authType: 'bearer_token',
    
    // Data format support
    supportedDataFormats: ['dohlc', 'json'],
    defaultDataFormat: 'dohlc',
    
    // Status
    status: 'implemented'
};
