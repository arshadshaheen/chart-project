import { makeApiRequest, generateSymbol, parseFullSymbol, getSymbolPrecision } from './helpers.js';
import { subscribeOnStream, unsubscribeFromStream } from './streaming.js';
import { getTimezoneOffset } from './config.js';
import { getCurrentProviderConfig } from '../../core/config.js';

const lastBarsCache = new Map();
const requestCache = new Map();

// Cache management functions
function generateCacheKey(symbol, resolution, from, to) {
    // Normalize timestamps to reduce cache misses due to minor time differences
    // Round to nearest minute for better cache hit rate
    const normalizedFrom = Math.floor(from / 60) * 60;
    const normalizedTo = Math.floor(to / 60) * 60;
    return `${symbol}_${resolution}_${normalizedFrom}_${normalizedTo}`;
}

function getCachedRequest(cacheKey) {
    const cached = requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 60000) { // Cache valid for 1 minute
        console.log('[MT5 Datafeed]: Using cached request for key:', cacheKey);
        return cached.data;
    }
    return null;
}

function setCachedRequest(cacheKey, data) {
    requestCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
    });
    console.log('[MT5 Datafeed]: Cached request for key:', cacheKey);
    
    // Clean up old cache entries (keep only last 50 entries)
    if (requestCache.size > 50) {
        const entries = Array.from(requestCache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const toKeep = entries.slice(0, 50);
        requestCache.clear();
        toKeep.forEach(([key, value]) => requestCache.set(key, value));
        console.log('[MT5 Datafeed]: Cleaned up cache, kept 50 most recent entries');
    }
}

function normalizeTimestamp(timestamp, resolution) {
    // Normalize timestamp based on resolution to ensure consistent time ranges
    const resolutionSeconds = parseResolutionToSeconds(resolution);
    return Math.floor(timestamp / resolutionSeconds) * resolutionSeconds;
}

function parseResolutionToSeconds(resolution) {
    const resolutionMap = {
        '1': 60,        // 1 minute
        '5': 300,       // 5 minutes
        '15': 900,      // 15 minutes
        '30': 1800,     // 30 minutes
        '60': 3600,     // 1 hour
        '240': 14400,   // 4 hours
        '1D': 86400,    // 1 day
        '1W': 604800,   // 1 week
        '1M': 2592000   // 1 month (approximate)
    };
    return resolutionMap[resolution] || 60; // Default to 1 minute
}

// Get server timezone - hardcoded to UTC+2
function getServerTimezone() {
    // Use configured timezone from config (UTC+2)
    const config = getCurrentProviderConfig();
    const serverTimezone = config.serverTimezone || 'Europe/Bucharest'; // UTC+2
    console.log('[MT5 Datafeed]: Using configured server timezone:', serverTimezone);
    return serverTimezone;
}

// Process API response and convert to TradingView format
function processApiResponse(data, normalizedFrom, normalizedTo, symbolInfo, firstDataRequest) {
    // Debug the actual data range returned
    if (data.result && data.result.answer && data.result.answer.length > 0) {
        const firstBar = data.result.answer[0];
        const lastBar = data.result.answer[data.result.answer.length - 1];
        
        console.log('[MT5 Datafeed]: Data range analysis:', {
            requestedFrom: normalizedFrom,
            requestedTo: normalizedTo,
            requestedFromDate: new Date(normalizedFrom * 1000).toISOString(),
            requestedToDate: new Date(normalizedTo * 1000).toISOString(),
            actualFirstBar: firstBar[0],
            actualLastBar: lastBar[0],
            actualFirstBarDate: new Date(firstBar[0] * 1000).toISOString(),
            actualLastBarDate: new Date(lastBar[0] * 1000).toISOString(),
            totalBars: data.result.answer.length,
            gapFromRequestedStart: firstBar[0] - normalizedFrom,
            gapToRequestedEnd: normalizedTo - lastBar[0],
            gapToRequestedEndSeconds: normalizedTo - lastBar[0],
            gapToRequestedEndMinutes: Math.round((normalizedTo - lastBar[0]) / 60)
        });
    }

    // Parse the MT5 API response
    if (!data || !data.result || !data.result.answer || data.result.answer.length === 0) {
        console.log('[MT5 Datafeed]: No data received');
        return [];
    }

    // Convert MT5 DOHLC format to TradingView format
    const bars = data.result.answer.map((candle, index) => {
        // MT5 format: [timestamp, open, high, low, close]
        const [timestamp, open, high, low, close] = candle;
        
        // Subtract 3 hours from server timestamp to convert back to UTC
        // MT5 server (Windows UTC OS + GMT+3 settings) sends data with +3 hours from UTC
        const SERVER_TIMEZONE_OFFSET = 3 * 60 * 60; // 3 hours in seconds
        const utcTimestamp = timestamp - SERVER_TIMEZONE_OFFSET;
        const timeInMs = utcTimestamp * 1000;
        
        // Debug first few bars to see timestamp conversion
        if (index < 3 || index >= data.result.answer.length - 3) {
            const currentTime = Math.floor(Date.now() / 1000);
            const timeDifference = Math.floor(timeInMs / 1000) - currentTime;
            
            console.log(`[MT5 Datafeed]: Bar ${index} timestamp conversion:`, {
                originalServerTimestamp: timestamp,
                serverDate: new Date(timestamp * 1000).toISOString(),
                utcTimestamp: utcTimestamp,
                utcDate: new Date(timeInMs).toISOString(),
                serverOffset: SERVER_TIMEZONE_OFFSET,
                serverOffsetHours: SERVER_TIMEZONE_OFFSET / 3600,
                currentTimeSeconds: currentTime,
                currentTimeDate: new Date(currentTime * 1000).toISOString(),
                timeDifferenceSeconds: timeDifference,
                timeDifferenceMinutes: Math.round(timeDifference / 60),
                isPast: timeDifference < 0 ? 'YES' : 'NO',
                isLastBar: index >= data.result.answer.length - 3 ? 'YES - compare with first tick' : 'NO',
                note: 'Server timestamp converted from +3hrs to UTC (Windows UTC OS + GMT+3 settings)'
            });
        }
        
        return {
            time: timeInMs, // Convert to milliseconds
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: 0 // MT5 doesn't provide volume in this format
        };
    }).filter(bar => {
        // Filter bars within the requested time range using normalized timestamps
        const barTime = bar.time / 1000; // Convert back to seconds
        
        // Debug filtering for last few bars
        if (barTime >= normalizedTo - 300) { // Last 5 minutes
            console.log(`[MT5 Datafeed]: Filtering bar at ${barTime} (${new Date(barTime * 1000).toISOString()}):`, {
                barTime: barTime,
                normalizedFrom: normalizedFrom,
                normalizedTo: normalizedTo,
                withinRange: barTime >= normalizedFrom && barTime <= normalizedTo,
                isExcluded: barTime < normalizedFrom || barTime > normalizedTo,
                reason: barTime < normalizedFrom ? 'before from' : barTime > normalizedTo ? 'after to' : 'included'
            });
        }
        
        // Use <= instead of < to include bars at the exact 'to' time
        return barTime >= normalizedFrom && barTime <= normalizedTo;
    });

    console.log(`[MT5 Datafeed]: Converted ${bars.length} bars from MT5 format`);

    // Cache the last bar for real-time updates
    if (firstDataRequest && bars.length > 0) {
        lastBarsCache.set(symbolInfo.full_name, bars[bars.length - 1]);
    }

    return bars;
}

// Clear cache for a specific symbol or all cache
function clearCache(symbol = null) {
    if (symbol) {
        // Clear cache entries for specific symbol
        const keysToDelete = [];
        for (const key of requestCache.keys()) {
            if (key.startsWith(symbol)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => requestCache.delete(key));
        console.log(`[MT5 Datafeed]: Cleared ${keysToDelete.length} cache entries for symbol: ${symbol}`);
    } else {
        // Clear all cache
        requestCache.clear();
        console.log('[MT5 Datafeed]: Cleared all cache entries');
    }
}

// DatafeedConfiguration implementation
const configurationData = {
    // Represents the resolutions for bars supported by your datafeed
    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
    // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
    exchanges: [
        { value: 'MT5', name: 'MetaTrader 5', desc: 'MT5 Trading Platform' },
    ],
    // Symbol types that the datafeed supports
    symbols_types: [
        { name: 'forex', value: 'forex' },
        { name: 'crypto', value: 'crypto' },
        { name: 'stock', value: 'stock' },
        { name: 'index', value: 'index' },
        { name: 'commodity', value: 'commodity' }
    ],
};

// Datafeed implementation
const Datafeed = {
    onReady: (callback) => {
        console.log('[MT5 Datafeed]: onReady called');
        console.log('[MT5 Datafeed]: Configuration data:', configurationData);
        setTimeout(() => callback(configurationData), 0);
    },

    resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
        console.log('[MT5 Datafeed]: resolveSymbol called', symbolName);

        try {
            // Parse the symbol name (e.g., "MT5:EURUSD")
            const parsedSymbol = parseFullSymbol(symbolName);
            if (!parsedSymbol) {
                onResolveErrorCallback('Invalid symbol format');
                return;
            }

            console.log('[MT5 Datafeed]: Parsed symbol:', parsedSymbol);

            // Since MT5 API doesn't provide symbol info endpoint, we'll create it based on the symbol
            const symbol = `${parsedSymbol.fromSymbol}${parsedSymbol.toSymbol}`;
            
            // Determine price scale based on symbol type
            const pricescale = getSymbolPrecision(symbol);
            
            // Use UTC for symbol timezone - we'll handle conversion in API calls
            const symbolTimezone = 'UTC';
            console.log('[MT5 Datafeed]: Symbol timezone set to UTC');
            
            const symbolInfo = {
                ticker: symbolName,
                name: `${parsedSymbol.fromSymbol}/${parsedSymbol.toSymbol}`,
                description: `${parsedSymbol.fromSymbol}/${parsedSymbol.toSymbol} on MT5`,
                type: 'forex',
                session: '24x7',
                timezone: symbolTimezone, // Use UTC - conversion handled in API calls
                exchange: parsedSymbol.exchange,
                minmov: 1,
                pricescale: pricescale,
                has_intraday: true,
                has_weekly_and_monthly: true,
                supported_resolutions: configurationData.supported_resolutions,
                volume_precision: 2,
                data_status: 'streaming',
                visible_plots_set: 'ohlcv'
            };

            console.log('[MT5 Datafeed]: Symbol resolved', symbolName);
            onSymbolResolvedCallback(symbolInfo);
        } catch (error) {
            console.error('[MT5 Datafeed]: Error resolving symbol:', error);
            onResolveErrorCallback(error.message);
        }
    },

    getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        const { from, to, firstDataRequest } = periodParams;
        
        // Normalize timestamps to ensure consistent requests
        const normalizedFrom = normalizeTimestamp(from, resolution);
        const normalizedTo = normalizeTimestamp(to, resolution);
        
        console.log('[MT5 Datafeed]: getBars called', symbolInfo, resolution, from, to);
        console.log('[MT5 Datafeed]: Normalized timestamps:', {
            originalFrom: from,
            originalTo: to,
            normalizedFrom: normalizedFrom,
            normalizedTo: normalizedTo,
            fromDate: new Date(from * 1000).toISOString(),
            toDate: new Date(to * 1000).toISOString(),
            normalizedFromDate: new Date(normalizedFrom * 1000).toISOString(),
            normalizedToDate: new Date(normalizedTo * 1000).toISOString(),
            firstDataRequest: firstDataRequest
        });
        
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToCurrent = currentTime - normalizedTo;
        
        console.log('[MT5 Datafeed]: Timestamp details:', {
            from: normalizedFrom,
            to: normalizedTo,
            timeRange: `${normalizedTo - normalizedFrom} seconds (${Math.round((normalizedTo - normalizedFrom) / 3600)} hours)`,
            currentTime: new Date().toISOString(),
            currentTimeSeconds: currentTime,
            timeToCurrentSeconds: timeToCurrent,
            timeToCurrentMinutes: Math.round(timeToCurrent / 60),
            isRequestingFuture: timeToCurrent < 0 ? 'YES - requesting future data!' : 'NO',
            firstDataRequest: firstDataRequest
        });

        const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
        console.log('[MT5 Datafeed]: Parsed symbol:', parsedSymbol);
        
        if (!parsedSymbol) {
            console.error('[MT5 Datafeed]: Failed to parse symbol:', symbolInfo.full_name);
            onErrorCallback('Invalid symbol format');
            return;
        }

        // Format symbol for MT5 API (e.g., EURUSD.s)
        let toSymbol = parsedSymbol.toSymbol;
        if (!toSymbol.includes('.')) {
            toSymbol = `${toSymbol}.s`; // Default to standard account type
        }
        const symbol = `${parsedSymbol.fromSymbol}${toSymbol}`;
        
        // Generate cache key for this request
        const cacheKey = generateCacheKey(symbol, resolution, normalizedFrom, normalizedTo);
        
        // Check if we have a cached response for this request
        const cachedData = getCachedRequest(cacheKey);
        if (cachedData) {
            console.log('[MT5 Datafeed]: Using cached data, skipping API request');
            
            // Process cached data the same way as fresh data
            if (!cachedData || !cachedData.result || !cachedData.result.answer || cachedData.result.answer.length === 0) {
                console.log('[MT5 Datafeed]: Cached data is empty');
                onHistoryCallback([], { noData: true });
                return;
            }

            // Convert cached data and return
            const bars = processApiResponse(cachedData, normalizedFrom, normalizedTo, symbolInfo, firstDataRequest);
            onHistoryCallback(bars, { noData: false });
            return;
        }

        try {
            // Map TradingView resolution to MT5 timeframe
            const timeframe = mapResolutionToTimeframe(resolution);
            
            // Add 3 hours to timestamps to match MT5 server timezone
            // MT5 server runs on Windows UTC OS but configured with GMT+3 settings
            const SERVER_TIMEZONE_OFFSET = 3 * 60 * 60; // 3 hours in seconds
            const fromTimestamp = Math.floor(normalizedFrom + SERVER_TIMEZONE_OFFSET);
            const toTimestamp = Math.floor(normalizedTo + SERVER_TIMEZONE_OFFSET);

            console.log('[MT5 Datafeed]: Requesting data for:', { 
                symbol, 
                timeframe, 
                fromTimestamp, 
                toTimestamp,
                originalFrom: from,
                originalTo: to,
                normalizedFrom: normalizedFrom,
                normalizedTo: normalizedTo,
                serverOffset: SERVER_TIMEZONE_OFFSET,
                serverOffsetHours: SERVER_TIMEZONE_OFFSET / 3600,
                parsedSymbol: parsedSymbol,
                cacheKey: cacheKey
            });

            // Make API request to MT5 using the correct endpoint
            const data = await makeApiRequest(`forex/m1-history`, {
                symbol: symbol,
                from: fromTimestamp, 
                to: toTimestamp,
                data: 'dohlc'
            });
            
            // Cache the response
            setCachedRequest(cacheKey, data);

            console.log('[MT5 Datafeed]: API response received:', data);
            
            // Process the API response
            const bars = processApiResponse(data, normalizedFrom, normalizedTo, symbolInfo, firstDataRequest);
            onHistoryCallback(bars, { noData: false });
        } catch (error) {
            console.error('[MT5 Datafeed]: Error getting bars:', error);
            onErrorCallback(error.message);
        }
    },

    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
        console.log('[MT5 Datafeed]: subscribeBars called', symbolInfo, resolution);
        
        // Get the last bar from cache
        const lastBar = lastBarsCache.get(symbolInfo.full_name);
        
        // Subscribe to real-time updates
        subscribeOnStream(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback, lastBar);
    },

    unsubscribeBars: (subscriberUID) => {
        console.log('[MT5 Datafeed]: unsubscribeBars called', subscriberUID);
        unsubscribeFromStream(subscriberUID);
    },
 
    searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {
        console.log('[MT5 Datafeed]: searchSymbols called', userInput, exchange, symbolType);

        try {
            // Since MT5 API doesn't provide a symbols list endpoint, we'll use a predefined list
            const commonSymbols = [
                'EURUSD.s', 'GBPUSD.s', 'USDJPY.s', 'USDCHF.s', 'AUDUSD.s', 'USDCAD.s', 'NZDUSD.s',
                'EURGBP.s', 'EURJPY.s', 'EURCHF.s', 'EURAUD.s', 'EURCAD.s', 'EURNZD.s',
                'GBPJPY.s', 'GBPCHF.s', 'GBPAUD.s', 'GBPCAD.s', 'GBPNZD.s',
                'AUDJPY.s', 'AUDCHF.s', 'AUDCAD.s', 'AUDNZD.s',
                'CADJPY.s', 'CADCHF.s', 'CADNZD.s',
                'CHFJPY.s', 'CHFNZD.s',
                'NZDJPY.s', 'NZDCHF.s'
            ];
            
            // Filter symbols based on user input
            const filteredSymbols = commonSymbols
                .filter(symbol => {
                    return symbol.toLowerCase().includes(userInput.toLowerCase());
                })
                .map(symbol => {
                    // Split symbol into base and quote currencies
                    const base = symbol.substring(0, 3);
                    const quote = symbol.substring(3, 6);
                    
                    return {
                        symbol: symbol,
                        full_name: `MT5:${base}/${quote}`,
                        description: `${base}/${quote} on MT5`,
                        exchange: 'MT5',
                        ticker: symbol,
                        type: symbolType || 'forex'
                    };
                });

            console.log(`[MT5 Datafeed]: Found ${filteredSymbols.length} symbols`);
            onResultReadyCallback(filteredSymbols);
        } catch (error) {
            console.error('[MT5 Datafeed]: Error searching symbols:', error);
            onResultReadyCallback([]);
        }
    },

    // Cache management methods for external access
    clearCache: clearCache,
    getCacheStats: () => ({
        requestCacheSize: requestCache.size,
        lastBarsCacheSize: lastBarsCache.size,
        cacheEntries: Array.from(requestCache.keys())
    })
};

// Helper function to map TradingView resolution to MT5 timeframe
function mapResolutionToTimeframe(resolution) {
    const resolutionMap = {
        '1': 'M1',
        '5': 'M5',
        '15': 'M15',
        '30': 'M30',
        '60': 'H1',
        '240': 'H4',
        '1D': 'D1',
        '1W': 'W1',
        '1M': 'MN1'
    };
    
    return resolutionMap[resolution] || 'M1';
}

export default Datafeed;
