import { getApiKey, getBaseUrl, validateConfig, isFakeDataEnabled } from './config.js';
import { generateFakeHistory } from './fakeDataProvider.js';

// Generate fake API response for m1-history requests
function generateFakeApiResponse(path, params) {
    if (!path.includes('m1-history') || !params.symbol || !params.from || !params.to) {
        throw new Error('Invalid fake API request parameters');
    }
    
    console.log('[MT5 makeApiRequest]: Generating fake API response for', path, params);
    
    // Convert timestamps back to UTC for fake data generation
    const SERVER_TIMEZONE_OFFSET = 3 * 60 * 60; // 3 hours in seconds
    const fromUtc = params.from - SERVER_TIMEZONE_OFFSET;
    const toUtc = params.to - SERVER_TIMEZONE_OFFSET;
    
    const fakeBars = generateFakeHistory(params.symbol, fromUtc, toUtc);
    
    // Return in MT5 API format
    return {
        result: {
            answer: fakeBars
        },
        status: 'success',
        message: 'Fake data generated successfully'
    };
}

// Makes requests to MT5 API
export async function makeApiRequest(path, params = {}) {
    try {
        // Check if fake data mode is enabled
        if (isFakeDataEnabled() && path.includes('m1-history')) {
            console.log('[MT5 makeApiRequest]: Using fake data for', path, params);
            return generateFakeApiResponse(path, params);
        }
        
        const baseUrl = getBaseUrl();
        const apiKey = getApiKey();
        
        // Build URL with path and query parameters
        const url = new URL(`${baseUrl}/${path}`);
        
        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        console.log('[MT5 makeApiRequest]: Making request to:', url.toString());
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Bearer token authentication
        if (apiKey) {
            // Check if apiKey already includes "Bearer " prefix
            if (apiKey.startsWith('Bearer ')) {
                headers['Authorization'] = apiKey;
            } else {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            console.log('[MT5 makeApiRequest]: Using Bearer token authentication');
        } else {
            console.warn('[MT5 makeApiRequest]: No API key configured');
        }
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: headers
        });
        
        console.log('[MT5 makeApiRequest]: Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[MT5 makeApiRequest]: Response data:', data);
        
        // Check for MT5 API errors
        if (data.status !== 0) {
            throw new Error(`MT5 API Error: ${data.message || 'Unknown error'}`);
        }
        
        return data;
    } catch (error) {
        console.error('[MT5 makeApiRequest]: Request error:', error);
        throw new Error(`MT5 request error: ${error.message}`);
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
    console.log('[MT5 parseFullSymbol]: Parsing symbol:', fullSymbol);
    
    // Handle format: MT5:EURUSD.s
    let match = fullSymbol.match(/^(\w+):([A-Z]{3})([A-Z]{3})\.([spe])$/);
    if (match) {
        const exchange = match[1]; // e.g., "MT5"
        const fromSymbol = match[2]; // e.g., "EUR"
        const baseToSymbol = match[3]; // e.g., "USD"
        const accountType = match[4]; // e.g., "s"
        const toSymbol = `${baseToSymbol}.${accountType}`; // e.g., "USD.s"
        
        const result = { exchange, fromSymbol, toSymbol, accountType };
        console.log('[MT5 parseFullSymbol]: Matched MT5:SYMBOL.s format:', result);
        return result;
    }
    
    // Handle format: EURUSD.s (assume MT5 exchange)
    // Format: EURUSD.s where EUR is fromSymbol and USD.s is toSymbol (with account type suffix)
    match = fullSymbol.match(/^([A-Z]{3})([A-Z]{3})\.([spe])$/);
    if (match) {
        const fromSymbol = match[1]; // e.g., "EUR"
        const baseToSymbol = match[2]; // e.g., "USD" 
        const accountType = match[3]; // e.g., "s" (standard), "p" (premium), "e" (elite)
        const toSymbol = `${baseToSymbol}.${accountType}`; // e.g., "USD.s"
        
        const result = { exchange: 'MT5', fromSymbol, toSymbol, accountType };
        console.log('[MT5 parseFullSymbol]: Matched SYMBOL.s format:', result);
        return result;
    }
    
    // Handle format: EURUSD (assume MT5 exchange and no suffix)
    // For symbols without account type suffix, we need to split the 6-character pair
    match = fullSymbol.match(/^([A-Z]{3})([A-Z]{3})$/);
    if (match) {
        const fromSymbol = match[1]; // e.g., "EUR"
        const toSymbol = match[2]; // e.g., "USD"
        const result = { exchange: 'MT5', fromSymbol, toSymbol };
        console.log('[MT5 parseFullSymbol]: Matched SYMBOL format:', result);
        return result;
    }
    
    // Handle format: MT5:EUR/USD (legacy format)
    match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
    if (match) {
        const result = { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
        console.log('[MT5 parseFullSymbol]: Matched MT5:EUR/USD format:', result);
        return result;
    }
    
    console.log('[MT5 parseFullSymbol]: No match found for:', fullSymbol);
    return null;
}

// Helper function to convert MT5 timestamp to JavaScript Date
export function convertMt5Timestamp(timestamp) {
    // MT5 timestamps are typically in seconds since Unix epoch
    return new Date(timestamp * 1000);
}

// Helper function to format symbol for MT5 API
export function formatSymbolForMt5(fromSymbol, toSymbol) {
    // MT5 typically uses symbols like EURUSD.s, GBPUSD.s, etc.
    return `${fromSymbol}${toSymbol}.s`;
}

// Helper function to parse MT5 DOHLC data from API response
export function parseMt5DohlcData(apiResponse) {
    // Check if response has the expected structure
    if (!apiResponse || !apiResponse.result || !apiResponse.result.answer) {
        throw new Error('Invalid MT5 API response structure');
    }
    
    const rawData = apiResponse.result.answer;
    
    if (!Array.isArray(rawData)) {
        throw new Error('MT5 data must be an array');
    }
    
    return rawData.map(candle => {
        if (!Array.isArray(candle) || candle.length < 5) {
            throw new Error('Invalid MT5 candle format');
        }
        
        const [timestamp, open, high, low, close] = candle;
        
        return {
            time: timestamp * 1000, // Convert to milliseconds
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close)
        };
    });
}

// Helper function to parse MT5 API response and extract data
export function parseMt5ApiResponse(apiResponse) {
    if (!apiResponse || apiResponse.status !== 0) {
        throw new Error(`MT5 API Error: ${apiResponse?.message || 'Unknown error'}`);
    }
    
    return {
        success: true,
        data: apiResponse.result?.answer || [],
        retcode: apiResponse.result?.retcode,
        message: apiResponse.message
    };
}

// Helper function to validate MT5 symbol
export function isValidMt5Symbol(symbol) {
    // MT5 symbols are typically 6 characters for forex pairs
    const forexPattern = /^[A-Z]{6}$/;
    return forexPattern.test(symbol);
}

// Helper function to get symbol precision
export function getSymbolPrecision(symbol) {
    // Most forex pairs have 5 decimal places
    const majorPairs = ['EURUSD.s', 'GBPUSD.s', 'USDJPY.s', 'USDCHF.s', 'AUDUSD.s', 'USDCAD.s', 'NZDUSD.s',
        'EURGBP.s', 'EURJPY.s', 'EURCHF.s', 'EURAUD.s', 'EURCAD.s', 'EURNZD.s',
        'GBPJPY.s', 'GBPCHF.s', 'GBPAUD.s', 'GBPCAD.s', 'GBPNZD.s',
        'AUDJPY.s', 'AUDCHF.s', 'AUDCAD.s', 'AUDNZD.s',
        'CADJPY.s', 'CADCHF.s', 'CADNZD.s',
        'CHFJPY.s', 'CHFNZD.s',
        'NZDJPY.s', 'NZDCHF.s'];
    
    if (majorPairs.includes(symbol.toUpperCase())) {
        return 100000; // 5 decimal places
    }
    
    // JPY pairs typically have 3 decimal places
    if (symbol.toUpperCase().includes('JPY')) {
        return 1000; // 3 decimal places
    }
    
    // Default to 5 decimal places
    return 100000;
}
