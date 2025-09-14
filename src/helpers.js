import { CRYPTOCOMPARE_API_KEY, validateConfig } from './config.js';

// Validate configuration on import
validateConfig();

// Makes requests to CryptoCompare API
export async function makeApiRequest(path) {
    try {
        const url = new URL(`https://min-api.cryptocompare.com/${path}`);
        
        // Only append API key if it's available
        if (CRYPTOCOMPARE_API_KEY) {
            url.searchParams.append('api_key', CRYPTOCOMPARE_API_KEY);
            console.log('🔑 [makeApiRequest]: Using API key');
        } else {
            console.warn('⚠️ [makeApiRequest]: CRYPTOCOMPARE_API_KEY not configured. API calls may be rate limited.');
        }
        
        console.log('🌐 [makeApiRequest]: Making request to:', url.toString());
        
        const response = await fetch(url.toString());
        console.log('📡 [makeApiRequest]: Response status:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📊 [makeApiRequest]: Response data:', data);
        
        return data;
    } catch (error) {
        console.error('❌ [makeApiRequest]: Request error:', error);
        throw new Error(`CryptoCompare request error: ${error.status || error.message}`);
    }
}

// Generates a symbol ID from a pair of the coins
export function generateSymbol(exchange, fromSymbol, toSymbol) {
    const short = `${fromSymbol}/${toSymbol}`;
    const full = `${exchange}:${short}`;
    return {
        short,
        full,
    };
}

// Returns all parts of the symbol
export function parseFullSymbol(fullSymbol) {
    const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
    if (!match) {
        return null;
    }
    return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}