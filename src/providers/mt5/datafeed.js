import { makeApiRequest, generateSymbol, parseFullSymbol, getSymbolPrecision } from './helpers.js';
// import { subscribeOnStream, unsubscribeFromStream } from './streaming.js';

const lastBarsCache = new Map();

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
            
            const symbolInfo = {
                ticker: symbolName,
                name: `${parsedSymbol.fromSymbol}/${parsedSymbol.toSymbol}`,
                description: `${parsedSymbol.fromSymbol}/${parsedSymbol.toSymbol} on MT5`,
                type: 'forex',
                session: '24x7',
                timezone: 'Etc/UTC',
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
        console.log('[MT5 Datafeed]: getBars called', symbolInfo, resolution, from, to);
        console.log('[MT5 Datafeed]: Timestamp details:', {
            from: from,
            to: to,
            fromDate: new Date(from * 1000),
            toDate: new Date(to * 1000),
            firstDataRequest: firstDataRequest
        });

        const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
        console.log('[MT5 Datafeed]: Parsed symbol:', parsedSymbol);
        
        if (!parsedSymbol) {
            console.error('[MT5 Datafeed]: Failed to parse symbol:', symbolInfo.full_name);
            onErrorCallback('Invalid symbol format');
            return;
        }

        try {
            // Map TradingView resolution to MT5 timeframe
            const timeframe = mapResolutionToTimeframe(resolution);
            // Format symbol for MT5 API (e.g., EURUSD.s)
            // If toSymbol doesn't have account type suffix, add .s as default
            let toSymbol = parsedSymbol.toSymbol;
            if (!toSymbol.includes('.')) {
                toSymbol = `${toSymbol}.s`; // Default to standard account type
            }
            const symbol = `${parsedSymbol.fromSymbol}${toSymbol}`;
            
            // Convert timestamps to Unix timestamps (MT5 expects seconds)
            // TradingView provides timestamps in seconds, but we need to ensure they're integers
            const fromTimestamp = Math.floor(from);
            const toTimestamp = Math.floor(to);

            console.log('[MT5 Datafeed]: Requesting data for:', { 
                symbol, 
                timeframe, 
                fromTimestamp, 
                toTimestamp,
                originalFrom: from,
                originalTo: to,
                parsedSymbol: parsedSymbol
            });

            // Make API request to MT5 using the correct endpoint
            const data = await makeApiRequest(`forex/m1-history`, {
                symbol: symbol,
                from: fromTimestamp, 
                to: toTimestamp,
                data: 'dohlc'
            });

            console.log('[MT5 Datafeed]: API response received:', data);

            // Parse the MT5 API response
            if (!data || !data.result || !data.result.answer || data.result.answer.length === 0) {
                console.log('[MT5 Datafeed]: No data received');
                onHistoryCallback([], { noData: true });
                return;
            }

            // Convert MT5 DOHLC format to TradingView format
            const bars = data.result.answer.map(candle => {
                // MT5 format: [timestamp, open, high, low, close]
                const [timestamp, open, high, low, close] = candle;
                
                return {
                    time: timestamp * 1000, // Convert to milliseconds
                    open: parseFloat(open),
                    high: parseFloat(high),
                    low: parseFloat(low),
                    close: parseFloat(close),
                    volume: 0 // MT5 doesn't provide volume in this format
                };
            }).filter(bar => {
                // Filter bars within the requested time range
                const barTime = bar.time / 1000; // Convert back to seconds
                return barTime >= from && barTime < to;
            });

            console.log(`[MT5 Datafeed]: Converted ${bars.length} bars from MT5 format`);

            // Cache the last bar for real-time updates
            if (firstDataRequest && bars.length > 0) {
                lastBarsCache.set(symbolInfo.full_name, bars[bars.length - 1]);
            }

            onHistoryCallback(bars, { noData: false });
        } catch (error) {
            console.error('[MT5 Datafeed]: Error getting bars:', error);
            onErrorCallback(error.message);
        }
    },
/**
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
 */
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
    }
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
