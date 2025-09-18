// Fake MT5 data provider for testing when real MT5 is not available
import { isFakeDataEnabled } from './config.js';

// Base prices for different symbols (current market prices)
const BASE_PRICES = {
    'EURUSD': { ask: 1.09550, bid: 1.09500, spread: 0.00050 },
    'GBPUSD': { ask: 1.27500, bid: 1.27450, spread: 0.00050 },
    'USDJPY': { ask: 149.500, bid: 149.450, spread: 0.050 },
    'AUDUSD': { ask: 0.65800, bid: 0.65750, spread: 0.00050 },
    'USDCAD': { ask: 1.36200, bid: 1.36150, spread: 0.00050 },
    'EURJPY': { ask: 163.800, bid: 163.750, spread: 0.050 },
    'GBPJPY': { ask: 190.600, bid: 190.550, spread: 0.050 },
    'EURGBP': { ask: 0.85900, bid: 0.85850, spread: 0.00050 }
};

// Price volatility factors (how much prices can move)
const VOLATILITY = {
    'EURUSD': 0.00020,  // ±20 pips
    'GBPUSD': 0.00025,  // ±25 pips
    'USDJPY': 0.100,    // ±10 pips
    'AUDUSD': 0.00030,  // ±30 pips
    'USDCAD': 0.00025,  // ±25 pips
    'EURJPY': 0.150,    // ±15 pips
    'GBPJPY': 0.200,    // ±20 pips
    'EURGBP': 0.00015   // ±15 pips
};

// Track current prices for each symbol
const currentPrices = {};

/**
 * Initialize fake data provider
 */
export function initializeFakeData() {
    if (!isFakeDataEnabled()) {
        console.log('[Fake MT5] Fake data mode is disabled');
        return;
    }
    
    console.log('[Fake MT5] Fake data mode enabled - initializing fake data provider');
    
    // Initialize current prices for all symbols
    Object.keys(BASE_PRICES).forEach(symbol => {
        const base = BASE_PRICES[symbol];
        currentPrices[symbol] = {
            ask: base.ask,
            bid: base.bid,
            spread: base.spread,
            lastUpdate: Date.now()
        };
    });
    
    console.log('[Fake MT5] Initialized prices for symbols:', Object.keys(currentPrices));
}

/**
 * Generate fake historical data for m1-history API
 * @param {string} symbol - Symbol (e.g., 'EURUSD')
 * @param {number} from - Start timestamp (seconds)
 * @param {number} to - End timestamp (seconds)
 * @returns {Array} Array of OHLC bars in MT5 format
 */
export function generateFakeHistory(symbol, from, to) {
    if (!isFakeDataEnabled()) {
        throw new Error('Fake data mode is disabled');
    }
    
    const symbolKey = symbol.replace('.s', ''); // Remove .s suffix if present
    const basePrice = BASE_PRICES[symbolKey];
    
    if (!basePrice) {
        console.warn(`[Fake MT5] Unknown symbol: ${symbol}, using EURUSD as default`);
        symbolKey = 'EURUSD';
    }
    
    const bars = [];
    const volatility = VOLATILITY[symbolKey] || VOLATILITY['EURUSD'];
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Start with a realistic price based on the symbol
    let currentPrice = basePrice.ask;
    let trendDirection = Math.random() > 0.5 ? 1 : -1; // Random initial trend
    let trendStrength = 0.1 + Math.random() * 0.3; // 0.1 to 0.4 trend strength
    let trendDuration = 0;
    let maxTrendDuration = 30 + Math.random() * 60; // 30-90 minutes trend duration
    
    // Generate bars for each minute in the range
    for (let timestamp = from; timestamp <= to; timestamp += 60) {
        // Don't generate future data
        if (timestamp > currentTime) break;
        
        // Change trend direction occasionally
        trendDuration++;
        if (trendDuration > maxTrendDuration) {
            trendDirection = Math.random() > 0.5 ? 1 : -1;
            trendStrength = 0.1 + Math.random() * 0.3;
            trendDuration = 0;
            maxTrendDuration = 30 + Math.random() * 60;
        }
        
        // Calculate price movement
        const timeSinceBase = (timestamp - from) / 3600; // Hours since start
        
        // Multi-layered price movement simulation
        const longTermTrend = Math.sin(timeSinceBase * 0.2) * volatility * 0.5; // Long-term cycle
        const mediumTermTrend = trendDirection * trendStrength * volatility * (1 + Math.sin(timeSinceBase * 2) * 0.3);
        const shortTermNoise = (Math.random() - 0.5) * volatility * 0.4;
        const marketSpike = Math.random() < 0.05 ? (Math.random() - 0.5) * volatility * 2 : 0; // 5% chance of spike
        
        // Update current price with all factors
        currentPrice += longTermTrend + mediumTermTrend + shortTermNoise + marketSpike;
        
        // Ensure price stays within reasonable bounds (prevent runaway prices)
        const maxDeviation = volatility * 10; // Max 10x volatility deviation from base
        currentPrice = Math.max(
            basePrice.ask - maxDeviation,
            Math.min(basePrice.ask + maxDeviation, currentPrice)
        );
        
        // Generate realistic OHLC for this minute
        const spread = basePrice.spread;
        
        // Open price: use previous candle's close (or current price for first candle)
        const open = bars.length > 0 ? bars[bars.length - 1][4] : currentPrice + (Math.random() - 0.5) * spread;
        
        // Intraday movement within the minute
        const minuteMovement = (Math.random() - 0.5) * volatility * 0.8;
        const close = open + minuteMovement;
        
        // High and low with very small or no wicks (more realistic)
        const maxWickPercent = 0.0002; // Maximum 0.02% wick
        const minWickPercent = 0.00005; // Minimum 0.005% wick
        const wickChance = 0.3; // 30% chance of having any wick at all
        
        let high, low;
        
        if (Math.random() < wickChance) {
            // Sometimes add very small wicks (0.0001% to 0.0004%)
            const wickSize = (minWickPercent + Math.random() * (maxWickPercent - minWickPercent)) * Math.max(open, close);
            const highWick = Math.random() * wickSize;
            const lowWick = Math.random() * wickSize;
            
            high = Math.max(open, close) + highWick;
            low = Math.min(open, close) - lowWick;
        } else {
            // Most of the time: no wicks (high/low equal to open/close)
            high = Math.max(open, close);
            low = Math.min(open, close);
        }
        
        // Ensure realistic OHLC relationships
        const adjustedHigh = Math.max(open, close, high);
        const adjustedLow = Math.min(open, close, low);
        
        // Round to appropriate precision (5 decimal places for most pairs)
        const precision = symbolKey.includes('JPY') ? 3 : 5;
        
        bars.push([
            timestamp,           // Timestamp
            parseFloat(open.toFixed(precision)),   // Open
            parseFloat(adjustedHigh.toFixed(precision)), // High
            parseFloat(adjustedLow.toFixed(precision)),  // Low
            parseFloat(close.toFixed(precision))   // Close
        ]);
        
        // Update current price for next iteration - use the close price
        currentPrice = close;
    }
    
    console.log(`[Fake MT5] Generated ${bars.length} historical bars for ${symbol} from ${new Date(from * 1000).toISOString()} to ${new Date(to * 1000).toISOString()}`);
    
    return bars;
}

/**
 * Generate fake tick data for WebSocket
 * @param {string} symbol - Symbol (e.g., 'EURUSD')
 * @returns {Object} Fake tick data in MT5 format
 */
export function generateFakeTick(symbol) {
    if (!isFakeDataEnabled()) {
        throw new Error('Fake data mode is disabled');
    }
    
    const symbolKey = symbol.replace('.s', ''); // Remove .s suffix if present
    const basePrice = BASE_PRICES[symbolKey];
    
    if (!basePrice) {
        console.warn(`[Fake MT5] Unknown symbol: ${symbol}, using EURUSD as default`);
        symbolKey = 'EURUSD';
    }
    
    const volatility = VOLATILITY[symbolKey] || VOLATILITY['EURUSD'];
    const spread = basePrice.spread;
    
    // Initialize or get current price tracking
    if (!currentPrices[symbolKey]) {
        currentPrices[symbolKey] = {
            ask: basePrice.ask,
            bid: basePrice.bid,
            spread: spread,
            lastUpdate: Date.now(),
            trendDirection: Math.random() > 0.5 ? 1 : -1,
            trendStrength: 0.1 + Math.random() * 0.2,
            lastTrendChange: Date.now(),
            trendDuration: Math.random() * 300000 // 0-5 minutes
        };
    }
    
    const current = currentPrices[symbolKey];
    const now = Date.now();
    const timeSinceLastUpdate = (now - current.lastUpdate) / 1000; // seconds
    
    // Change trend direction occasionally (every 30 seconds to 5 minutes)
    if (now - current.lastTrendChange > current.trendDuration) {
        current.trendDirection = Math.random() > 0.5 ? 1 : -1;
        current.trendStrength = 0.05 + Math.random() * 0.15; // 0.05 to 0.2
        current.lastTrendChange = now;
        current.trendDuration = 30000 + Math.random() * 270000; // 30 seconds to 5 minutes
    }
    
    // Multi-factor price movement (similar to historical data)
    const timeSinceBase = (now / 1000) % 86400 / 3600; // Hours in day for daily cycle
    const longTermCycle = Math.sin(timeSinceBase * 0.3) * volatility * 0.1;
    const trendMovement = current.trendDirection * current.trendStrength * volatility;
    const randomNoise = (Math.random() - 0.5) * volatility * 0.2;
    const spikeChance = Math.random() < 0.02 ? (Math.random() - 0.5) * volatility * 0.5 : 0; // 2% chance of spike
    
    // Calculate price change
    const totalMovement = (longTermCycle + trendMovement + randomNoise + spikeChance) * (timeSinceLastUpdate / 60); // Scale by time
    
    // Update prices
    const midPrice = (current.ask + current.bid) / 2 + totalMovement;
    current.ask = midPrice + spread / 2;
    current.bid = midPrice - spread / 2;
    current.lastUpdate = now;
    
    // Round to appropriate precision
    const precision = symbolKey.includes('JPY') ? 3 : 5;
    
    // Generate fake tick data
    const tickData = {
        Symbol: symbolKey,
        Ask: parseFloat(current.ask.toFixed(precision)),
        Bid: parseFloat(current.bid.toFixed(precision)),
        Datetime: Math.floor(now / 1000),
        Datetime_Msc: now,
        Volume: Math.floor(Math.random() * 100) + 1
    };
    
    return tickData;
}

/**
 * Start fake tick generation for WebSocket simulation
 * @param {Function} onTick - Callback function for tick data
 * @param {string} symbol - Symbol to generate ticks for
 * @returns {Object} Object with stop function
 */
export function startFakeTickGeneration(onTick, symbol) {
    if (!isFakeDataEnabled()) {
        console.warn('[Fake MT5] Fake data mode is disabled, cannot start fake tick generation');
        return { stop: () => {} };
    }
    
    console.log(`[Fake MT5] Starting fake tick generation for ${symbol}`);
    
    // Generate ticks every 1-3 seconds (realistic frequency)
    const interval = setInterval(() => {
        try {
            const tickData = generateFakeTick(symbol);
            onTick(tickData);
        } catch (error) {
            console.error('[Fake MT5] Error generating fake tick:', error);
        }
    }, Math.random() * 2000 + 1000); // 1-3 seconds
    
    return {
        stop: () => {
            clearInterval(interval);
            console.log(`[Fake MT5] Stopped fake tick generation for ${symbol}`);
        }
    };
}

/**
 * Check if fake data mode is enabled
 * @returns {boolean} True if fake data mode is enabled
 */
export function isFakeModeEnabled() {
    return isFakeDataEnabled();
}
