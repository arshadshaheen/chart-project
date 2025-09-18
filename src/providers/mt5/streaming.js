/* global io */
import { getApiKey, getWebSocketUrl, getTimezoneOffset, isFakeDataEnabled } from './config.js';
import { parseFullSymbol, makeApiRequest } from './helpers.js';
import { startFakeTickGeneration, initializeFakeData } from './fakeDataProvider.js';

let socket = null;
const channelToSubscription = new Map();   // key: `tick:EURUSD.s` -> { handlers, lastDailyBar, ... }
const subscribedSymbols = new Set();       // symbols like "EURUSD.s"
const periodRequestCache = new Map();      // Cache for period requests to avoid duplicates

const apiKey = getApiKey();                // e.g. "Bearer eyJ..." (already includes "Bearer ")
const wsBaseUrl = getWebSocketUrl();       // e.g. "wss://live-mt5-sockets-staging.naqdi.com"

console.log('[MT5 streaming] API key:', apiKey ? 'configured' : 'missing');
console.log('[MT5 streaming] Socket.IO URL:', wsBaseUrl);

function openSocket() {
  // Initialize fake data if enabled
  if (isFakeDataEnabled()) {
    console.log('[MT5 streaming] Fake data mode enabled - initializing fake data provider');
    initializeFakeData();
    return; // Don't open real socket connection
  }
  
  if (!wsBaseUrl || !apiKey) {
    console.warn('[MT5 streaming] Not connecting: missing URL or API key');
    return;
  }

  try { if (socket?.connected || socket?.connecting) socket.disconnect(); } catch {}

  // Socket.IO connection with extraHeaders (matches your working pattern)
  const ioOptions = {
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ["polling", "websocket"],
    extraHeaders: {
      Authorization: apiKey  
    }
  };

  console.log('[MT5 socket] Connecting with Socket.IO...');
  socket = io(wsBaseUrl, ioOptions);

  socket.on('connect', () => {
    console.log('[MT5 socket] Connected to MT5 server');
    
    // Re-send current subscriptions (idempotent)
    if (subscribedSymbols.size > 0) {
      const payload = Array.from(subscribedSymbols);
      console.log('[MT5 socket] Resubscribe on connect:', payload);
      socket.emit('subscribe_symbol', payload);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[MT5 socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[MT5 socket] Connection error:', err?.message || err);
  });

  // Handle authentication response (if server sends one)
  socket.on('auth', (payload) => {
    if (payload?.status === 'success') {
      console.log('[MT5 socket] Auth success');
    } else {
      console.error('[MT5 socket] Auth failed:', payload?.message);
    }
  });

  // Handle mt5_events_tick data
  socket.on('mt5_events_tick', async (data) => {
    try {
      console.log('[MT5 socket] Received mt5_events_tick:', data);
      
      if (data?.Payload?.Type === 'Tick') {
        console.log('[MT5 socket] Processing tick data:', data.Payload.Data);
        await handleMt5TickData(data.Payload.Data);
        return;
      }
      
      if (data?.Type === 'Tick' && data?.Data) {
        console.log('[MT5 socket] Processing direct tick data:', data.Data);
        await handleMt5TickData(data.Data);
        return;
      }
      
      console.log('[MT5 socket] Unhandled mt5_events_tick:', data);
    } catch (e) {
      console.error('[MT5 socket] Error handling mt5_events_tick:', e);
    }
  });

  // Handle other possible event names
  socket.on('tick', async (data) => {
    console.log('[MT5 socket] Received tick event:', data);
    if (data?.Type === 'Tick' && data?.Data) {
      await handleMt5TickData(data.Data);
    }
  });
}

// Start connection
openSocket();

// ---------- Helper Functions ----------

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

function calculateBarTime(timestampSeconds, resolution) {
    const resolutionSeconds = parseResolutionToSeconds(resolution);
    return Math.floor(timestampSeconds / resolutionSeconds) * resolutionSeconds;
}

async function requestHistoryForPeriod(symbol, resolution, fromTime, toTime, sub) {
    const cacheKey = `${symbol}_${resolution}_${fromTime}_${toTime}`;
    
    // Check if we already requested this period recently
    if (periodRequestCache.has(cacheKey)) {
        const lastRequest = periodRequestCache.get(cacheKey);
        if (Date.now() - lastRequest < 5000) { // 5 seconds cooldown
            console.log(`[MT5 streaming] Skipping duplicate period request: ${cacheKey}`);
            return;
        }
    }
    
    periodRequestCache.set(cacheKey, Date.now());
    
    try {
        console.log(`[MT5 streaming] Requesting history to replace tick-built candle: ${symbol} ${resolution}`, {
            from: new Date(fromTime * 1000).toISOString(),
            to: new Date(toTime * 1000).toISOString(),
            note: 'Replacing inaccurate tick-built candle with server data'
        });
        
        // Add 3 hours to match server timezone
        const SERVER_TIMEZONE_OFFSET = 3 * 60 * 60; // 3 hours in seconds
        const fromTimestamp = fromTime + SERVER_TIMEZONE_OFFSET;
        const toTimestamp = toTime + SERVER_TIMEZONE_OFFSET;
        
        const data = await makeApiRequest(`forex/m1-history`, {
            symbol: symbol,
            from: fromTimestamp,
            to: toTimestamp,
            data: 'dohlc'
        });
        
        if (data && data.result && data.result.answer && data.result.answer.length > 0) {
            console.log(`[MT5 streaming] Received ${data.result.answer.length} historical bars for period`);
            
            // Process historical bars and send to handlers
            const bars = data.result.answer.map(candle => {
                const [timestamp, open, high, low, close] = candle;
                
                // Convert server timestamp back to UTC
                const utcTimestamp = timestamp - SERVER_TIMEZONE_OFFSET;
                const timeInMs = utcTimestamp * 1000;
                
                return {
                    time: timeInMs,
                    open: parseFloat(open),
                    high: parseFloat(high),
                    low: parseFloat(low),
                    close: parseFloat(close),
                    volume: 0
                };
            }).filter(bar => {
                const barTime = bar.time / 1000;
                return barTime >= fromTime && barTime <= toTime;
            });
            
            // Send historical bars to handlers with detailed logging
            bars.forEach((bar, index) => {
                // Compare with existing tick-built bar if it exists
                const existingBar = sub.lastDailyBar && sub.lastDailyBar.time === bar.time ? sub.lastDailyBar : null;
                
                console.log(`[MT5 streaming] Sending historical bar ${index + 1}/${bars.length} to TradingView:`, {
                    time: new Date(bar.time).toISOString(),
                    serverData: {
                        open: bar.open,
                        high: bar.high,
                        low: bar.low,
                        close: bar.close,
                        volume: bar.volume
                    },
                    tickData: existingBar ? {
                        open: existingBar.open,
                        high: existingBar.high,
                        low: existingBar.low,
                        close: existingBar.close,
                        volume: existingBar.volume
                    } : 'No tick data for this period',
                    note: 'Server data will replace tick-built candle'
                });
                
                // Add a small delay to ensure proper timing
                setTimeout(() => {
                    sub.handlers.forEach(handler => {
                        handler.callback(bar);
                    });
                }, index * 10); // 10ms delay between each bar
            });
            
            // Store historical bar separately - DON'T update current tick-based bar
            if (bars.length > 0) {
                sub.lastHistoricalBar = bars[bars.length - 1]; // Store separately from tick-based bar
                console.log(`[MT5 streaming] Stored historical bar separately: ${new Date(sub.lastHistoricalBar.time).toISOString()}`);
                console.log(`[MT5 streaming] Current tick-based bar remains: ${sub.lastDailyBar ? new Date(sub.lastDailyBar.time).toISOString() : 'None'}`);
                
                // DON'T trigger cache reset - it disrupts real-time tick updates
                // The historical bars sent via callbacks should be enough to update the chart
                console.log(`[MT5 streaming] Historical data sent to TradingView - no cache reset needed to preserve tick updates`);
            }
        }
    } catch (error) {
        console.error(`[MT5 streaming] Error requesting history for period:`, error);
    }
}


// Clean up old cache entries
function cleanupPeriodRequestCache() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [key, timestamp] of periodRequestCache.entries()) {
        if (now - timestamp > maxAge) {
            periodRequestCache.delete(key);
        }
    }
}

// Clean up cache every 30 seconds
setInterval(cleanupPeriodRequestCache, 30000);


// ---------- Tick handling ----------

async function handleMt5TickData(tick) {
  const { Symbol, Ask, Bid, Datetime, Datetime_Msc, Volume } = tick || {};
  if (
    !Symbol ||
    typeof Ask !== 'number' ||
    typeof Bid !== 'number' ||
    (typeof Datetime !== 'number' && typeof Datetime_Msc !== 'number')
  ) {
    console.warn('[MT5 socket] Invalid tick:', tick);
    return;
  }

  const mt5Symbol = Symbol;
  const sub = findSubscriptionBySymbol(mt5Symbol);
  if (!sub) return;

  const mid = (Ask + Bid) / 2;
  
  // Apply timezone conversion
  let tsMs = typeof Datetime_Msc === 'number' ? Datetime_Msc : Datetime * 1000;
  
  // Subtract 3 hours from server timestamp to convert back to UTC
  const SERVER_TIMEZONE_OFFSET = -3 * 60 * 60 * 1000; // -3 hours in milliseconds
  tsMs = tsMs + SERVER_TIMEZONE_OFFSET;
  
  const tsSeconds = Math.floor(tsMs / 1000);
  const barTime = calculateBarTime(tsSeconds, sub.resolution);
  const currentTime = Math.floor(Date.now() / 1000);

  // Debug first few ticks
  if (!sub.tickDebugCount) sub.tickDebugCount = 0;
  if (sub.tickDebugCount < 3) {
    console.log(`[MT5 streaming] Tick ${sub.tickDebugCount}:`, {
      symbol: mt5Symbol,
      barTime: new Date(barTime * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString(),
      ask: Ask,
      bid: Bid,
      mid: mid,
      lastBar: sub.lastDailyBar ? {
        time: new Date(sub.lastDailyBar.time).toISOString(),
        close: sub.lastDailyBar.close
      } : 'None'
    });
    sub.tickDebugCount++;
  }


  // Now handle the current tick for the current/last candle
  const incomingBarTime = barTime * 1000;
  
  // Check if this tick belongs to the current bar or starts a new one
  const timeDifference = sub.lastDailyBar ? Math.abs(sub.lastDailyBar.time - incomingBarTime) : Infinity;
  const isSameBarPeriod = timeDifference < 60000; // Within 1 minute = same bar period
  
  // Check if this tick starts a new period
  const isNewPeriod = !isSameBarPeriod;
  
  if (sub.lastDailyBar && isSameBarPeriod) {
    // Update existing current bar with Bid-based tick data (completely Bid-based candle)
    sub.lastDailyBar = {
      ...sub.lastDailyBar,
      // Keep original open price (Bid-based)
      open: sub.lastDailyBar.open,
      // Update high with Bid (track highest Bid during period)
      high: Math.max(sub.lastDailyBar.high, Bid),
      // Update low with Bid (track lowest Bid during period)
      low: Math.min(sub.lastDailyBar.low, Bid),
      // Update close with current Bid price (MT5 style - Bid as last price)
      close: Bid,
      // Accumulate volume
      volume: sub.lastDailyBar.volume + (typeof Volume === 'number' ? Volume : 0),
    };
    
    console.log(`[MT5 streaming] Updated current bar for ${mt5Symbol}: OHLC(${sub.lastDailyBar.open.toFixed(5)}, ${sub.lastDailyBar.high.toFixed(5)}, ${sub.lastDailyBar.low.toFixed(5)}, ${sub.lastDailyBar.close.toFixed(5)}) [Ask:${Ask.toFixed(5)}, Bid:${Bid.toFixed(5)}, Mid:${mid.toFixed(5)}] - Bid-based candle`);
  } else {
    // NEW PERIOD STARTED - Request history for the PREVIOUS completed period
    if (sub.lastDailyBar && isNewPeriod) {
      const resolutionSeconds = parseResolutionToSeconds(sub.resolution);
      const previousPeriodStart = sub.lastDailyBar.time / 1000;
      const previousPeriodEnd = previousPeriodStart + resolutionSeconds - 1;
      
      console.log(`[MT5 streaming] NEW PERIOD DETECTED for ${mt5Symbol} - requesting history for previous completed period:`, {
        previousPeriod: {
          from: new Date(previousPeriodStart * 1000).toISOString(),
          to: new Date(previousPeriodEnd * 1000).toISOString()
        },
        newPeriodStart: new Date(incomingBarTime).toISOString(),
        note: 'Replacing tick-built candle with server data'
      });
      
      // Request history for the previous completed period
      await requestHistoryForPeriod(mt5Symbol, sub.resolution, previousPeriodStart, previousPeriodEnd, sub);
    }
    
    // Start new current bar with Bid-based tick data (completely Bid-based candle)
    sub.lastDailyBar = {
      time: incomingBarTime,
      open: Bid,           // Start with current Bid price
      high: Bid,           // Initialize high with current Bid (will track highest Bid)
      low: Bid,            // Initialize low with current Bid (will track lowest Bid)
      close: Bid,          // Initialize close with current Bid (MT5 style - Bid as last price)
      volume: typeof Volume === 'number' ? Volume : 0,
    };
    console.log(`[MT5 streaming] New current bar for ${mt5Symbol}: OHLC(${sub.lastDailyBar.open.toFixed(5)}, ${sub.lastDailyBar.high.toFixed(5)}, ${sub.lastDailyBar.low.toFixed(5)}, ${sub.lastDailyBar.close.toFixed(5)}) [Ask:${Ask.toFixed(5)}, Bid:${Bid.toFixed(5)}, Mid:${mid.toFixed(5)}, Height:${(sub.lastDailyBar.high - sub.lastDailyBar.low).toFixed(5)}] - Bid-based candle`);
  }

  // Notify all handlers with the updated current bar
  console.log(`[MT5 streaming] Sending tick update to ${sub.handlers.length} handlers:`, {
    symbol: mt5Symbol,
    barTime: new Date(sub.lastDailyBar.time).toISOString(),
    close: sub.lastDailyBar.close.toFixed(5),
    note: 'Real-time tick update'
  });
  
  sub.handlers.forEach((h) => h.callback(sub.lastDailyBar));
}


function findSubscriptionBySymbol(symbol) {
  return channelToSubscription.get(`tick:${symbol}`) || null;
}

// ---------- Public API ----------

export function subscribeOnStream(
  symbolInfo,
  resolution,
  onRealtimeCallback,
  subscriberUID,
  onResetCacheNeededCallback,
  lastDailyBar
) {
  if (!socket) {
    console.warn('[MT5 subscribeOnStream] Socket not available');
    return;
  }

  const parsed = parseFullSymbol(symbolInfo.full_name);
  if (!parsed) {
    console.error('[MT5 subscribeOnStream] Invalid symbol:', symbolInfo?.full_name);
    return;
  }

  const mt5Symbol = `${parsed.fromSymbol}${parsed.toSymbol}`;  // e.g., EURUSD.s (if that's your MT5 format)
  const channelKey = `tick:${mt5Symbol}`;

  const handler = { id: subscriberUID, callback: onRealtimeCallback };

  let entry = channelToSubscription.get(channelKey);
  if (entry) {
    entry.handlers.push(handler);
    // Update the reset cache callback if provided
    if (onResetCacheNeededCallback) {
      entry.onResetCacheNeededCallback = onResetCacheNeededCallback;
    }
  } else {
    entry = { 
      subscriberUID, 
      resolution, 
      lastDailyBar, 
      handlers: [handler],
      onResetCacheNeededCallback: onResetCacheNeededCallback
    };
    channelToSubscription.set(channelKey, entry);
    
    console.log(`[MT5 streaming] New subscription created for ${mt5Symbol}:`, {
      resolution: resolution,
      lastDailyBar: lastDailyBar ? {
        time: new Date(lastDailyBar.time).toISOString(),
        close: lastDailyBar.close
      } : null,
      hasResetCallback: !!onResetCacheNeededCallback,
      note: 'This lastDailyBar came from datafeed historical data'
    });
  }

  subscribedSymbols.add(mt5Symbol);
  
  // Handle fake data mode
  if (isFakeDataEnabled()) {
    console.log(`[MT5 streaming] Starting fake tick generation for ${mt5Symbol}`);
    const fakeTickGenerator = startFakeTickGeneration((tickData) => {
      handleMt5TickData(tickData);
    }, mt5Symbol);
    
    // Store the generator so we can stop it later
    entry.fakeTickGenerator = fakeTickGenerator;
    return;
  }
  
  const payload = Array.from(subscribedSymbols);
  if (socket?.connected) {
    console.log('[MT5 subscribe] -> subscribe_symbol', payload);
    socket.emit('subscribe_symbol', payload);
  } else {
    console.warn('[MT5 subscribe] Socket not connected; will send on connect');
    // The subscription will be sent automatically when the socket reconnects
  }
}

export function unsubscribeFromStream(subscriberUID) {
  if (!socket) {
    console.warn('[MT5 unsubscribeFromStream] Socket not available');
    return;
  }

  for (const channelKey of channelToSubscription.keys()) {
    const entry = channelToSubscription.get(channelKey);
    if (!entry) continue;

    const idx = entry.handlers.findIndex((h) => h.id === subscriberUID);
    if (idx === -1) continue;

    entry.handlers.splice(idx, 1);

    if (entry.handlers.length === 0) {
      // Stop fake tick generation if it exists
      if (entry.fakeTickGenerator) {
        console.log(`[MT5 streaming] Stopping fake tick generation for ${channelKey}`);
        entry.fakeTickGenerator.stop();
      }
      
      channelToSubscription.delete(channelKey);

      const mt5Symbol = channelKey.replace('tick:', '');
      subscribedSymbols.delete(mt5Symbol);

      const payload = Array.from(subscribedSymbols);
      console.log('[MT5 unsubscribe] -> subscribe_symbol', payload);
      if (socket?.connected) {
        socket.emit('subscribe_symbol', payload);
      }
    }
    break;
  }
}
