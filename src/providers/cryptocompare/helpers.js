import { getApiKey, getBaseUrl, validateConfig } from './config.js';

// Note: validateConfig() is not called automatically here to avoid module loading issues
// It will be called when needed or can be called manually

// Makes requests to CryptoCompare API
export async function makeApiRequest(path) {
    try {
        const baseUrl = getBaseUrl();
        const apiKey = getApiKey();
        const url = new URL(`${baseUrl}${path}`);
        
        // Only append API key if it's available
        if (apiKey) {
            url.searchParams.append('api_key', apiKey);
            console.log('🔑 [makeApiRequest]: Using API key');
        } else {
            console.warn('⚠️ [makeApiRequest]: API key not configured. API calls may be rate limited.');
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