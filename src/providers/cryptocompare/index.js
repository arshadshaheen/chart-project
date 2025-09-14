// CryptoCompare provider implementation
import Datafeed from './datafeed.js';
import { makeApiRequest, generateSymbol, parseFullSymbol } from './helpers.js';
import { subscribeOnStream, unsubscribeFromStream } from './streaming.js';
import { validateConfig } from './config.js';

export default {
    name: 'cryptocompare',
    displayName: 'CryptoCompare',
    description: 'CryptoCompare API for cryptocurrency data',
    
    // Provider modules
    datafeed: Datafeed,
    helpers: {
        makeApiRequest,
        generateSymbol,
        parseFullSymbol
    },
    streaming: {
        subscribeOnStream,
        unsubscribeFromStream
    },
    config: {
        validateConfig
    },
    
    // Provider-specific configuration
    configSchema: {
        apiKey: {
            type: 'string',
            required: true,
            description: 'CryptoCompare API key'
        },
        baseUrl: {
            type: 'string',
            default: 'https://min-api.cryptocompare.com/',
            description: 'Base URL for CryptoCompare API'
        },
        wsUrl: {
            type: 'string',
            default: 'wss://streamer.cryptocompare.com/v2',
            description: 'WebSocket URL for real-time data'
        }
    },
    
    // Authentication type
    authType: 'api_key'
};
