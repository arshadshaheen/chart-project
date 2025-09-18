/* global WebSocket */
import { getApiKey, getWebSocketUrl } from './config.js';
import { parseFullSymbol, makeApiRequest } from './helpers.js';

let socket = null;

const apiKey = getApiKey();
const wsBaseUrl = getWebSocketUrl();

console.log('🔑 [streaming]: Using API key:', apiKey);
console.log('🔌 [streaming]: WebSocket base URL:', wsBaseUrl);

// Create WebSocket using the configured URL and API key
const wsUrl = `${wsBaseUrl}?api_key=${apiKey}`;
console.log('🔌 [streaming]: Connecting to WebSocket:', wsUrl);
socket = new WebSocket(wsUrl);
const channelToSubscription = new Map();
const periodRequestCache = new Map(); // Cache for period requests to avoid duplicates

// Clean up old cache entries periodically
setInterval(cleanupPeriodRequestCache, 60000); // Clean up every minute

// Use the exact event handler format from your working code
socket.onopen = function onStreamOpen() {
  console.log('✅ [socket] Connected successfully');

  // Test subscription using the exact format from your working code
  const testSubRequest = {
    action: 'SubAdd',
    subs: ['2~Bitfinex~BTC~USDT'],
  };
  console.log('📤 [socket] Sending test subscription:', testSubRequest);
  socket.send(JSON.stringify(testSubRequest));
};

socket.onclose = function onStreamClose(evt) {
  console.log('🔌 [socket] Disconnected:', { code: evt.code, reason: evt.reason, wasClean: evt.wasClean });
};

socket.onerror = function onStreamError(error) {
  console.error('❌ [socket] Error:', error);
};

socket.onmessage = function onStreamMessage(event) {
  // Parse the incoming data (format matches the documentation)
  const data = JSON.parse(event.data);
  console.log('📨 [socket] Message received:', data);

  const {
    TYPE: eventTypeStr,
    MARKET: exchange,        // MARKET
    FROMSYMBOL: fromSymbol,  // FROMSYMBOL
    TOSYMBOL: toSymbol,      // TOSYMBOL
    PRICE: tradePriceStr,    // PRICE
    LASTVOLUME: volume,      // LASTVOLUME
    LASTUPDATE: tradeTimeStr // LASTUPDATE (unix seconds)
  } = data;

  // Skip non-trade messages
  const eventType = parseInt(eventTypeStr, 10);
  if (eventType !== 2) {
    if (eventType === 999) {
      console.log('💓 [socket] Heartbeat received');
    } else if (eventType === 429) {
      console.warn('⚠️ [socket] Rate limit warning:', data?.MESSAGE);
    } else {
      console.log('📋 [socket] Other message type:', eventTypeStr, data);
    }
    return;
  }

  const tradePrice = parseFloat(tradePriceStr);
  const tradeTime = parseInt(tradeTimeStr, 10);

  // Ensure we have the identifiers we need
  if (!exchange || !fromSymbol || !toSymbol || Number.isNaN(tradePrice) || Number.isNaN(tradeTime)) {
    return;
  }

  // Use the same format as subscription: "2~Exchange~FromSymbol~ToSymbol"
  const channelString = `2~${exchange}~${fromSymbol}~${toSymbol}`;
  const subscriptionItem = channelToSubscription.get(channelString);
  if (!subscriptionItem) return;

  // Initialize the bar if we don't have one yet
  if (!subscriptionItem.lastDailyBar) {
    const firstBar = {
      time: tradeTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
    };
    subscriptionItem.lastDailyBar = firstBar;
    subscriptionItem.handlers.forEach((h) => h.callback(firstBar));
    return;
  }

  const lastDailyBar = subscriptionItem.lastDailyBar;
  const resolution = subscriptionItem.resolution;
  const resolutionSeconds = parseResolutionToSeconds(resolution);
  const currentBarTime = calculateBarTime(tradeTime, resolution);
  const isNewPeriod = !lastDailyBar || currentBarTime !== calculateBarTime(lastDailyBar.time / 1000, resolution);

  let bar;
  if (isNewPeriod) {
    // NEW PERIOD STARTED - Request history for the PREVIOUS completed period
    if (lastDailyBar) {
      const previousPeriodStart = lastDailyBar.time / 1000;
      const previousPeriodEnd = previousPeriodStart + resolutionSeconds - 1;
      
      console.log(`[CryptoCompare streaming] NEW PERIOD DETECTED for ${channelString} - requesting history for previous completed period:`, {
        previousPeriod: {
          from: new Date(previousPeriodStart * 1000).toISOString(),
          to: new Date(previousPeriodEnd * 1000).toISOString()
        },
        newPeriodStart: new Date(currentBarTime * 1000).toISOString(),
        note: 'Replacing tick-built candle with server data'
      });
      
      // Create a temporary symbolInfo object for the request
      const symbolInfo = {
        full_name: `${parsedSymbol.exchange}:${parsedSymbol.fromSymbol}/${parsedSymbol.toSymbol}`
      };
      
      // Request history for the previous completed period
      await requestHistoryForPeriod(symbolInfo, resolution, previousPeriodStart, previousPeriodEnd, subscriptionItem);
    }
    
    // Start new current bar with tick data
    bar = {
      time: currentBarTime * 1000, // Convert to milliseconds
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
      volume: parseFloat(volume) || 0,
    };
    console.log(`[CryptoCompare streaming] New current bar for ${channelString}: OHLC(${bar.open.toFixed(8)}, ${bar.high.toFixed(8)}, ${bar.low.toFixed(8)}, ${bar.close.toFixed(8)}) [Price:${tradePrice.toFixed(8)}, Volume:${bar.volume.toFixed(2)}] - New period started`);
  } else {
    // Update existing bar with new tick data
    bar = {
      ...lastDailyBar,
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice,
      volume: (lastDailyBar.volume || 0) + (parseFloat(volume) || 0),
    };
    console.log(`[CryptoCompare streaming] Updated current bar for ${channelString}: OHLC(${bar.open.toFixed(8)}, ${bar.high.toFixed(8)}, ${bar.low.toFixed(8)}, ${bar.close.toFixed(8)}) [Price:${tradePrice.toFixed(8)}, Volume:${bar.volume.toFixed(2)}] - Tick update`);
  }

  subscriptionItem.lastDailyBar = bar;

  // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
}; // ✅ fixed brace/paren mismatch here

function getNextDailyBarTime(barTime) {
  // Advance to the next day based on the provided bar time (UTC)
  const date = new Date((barTime || 0) * 1000);
  // (Optionally) normalize to midnight UTC, then add 1 day
  // date.setUTCHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return Math.floor(date.getTime() / 1000);
}

// Helper function to parse resolution to seconds (similar to MT5)
function parseResolutionToSeconds(resolution) {
  switch (resolution) {
    case '1': return 60;           // 1 minute
    case '5': return 300;          // 5 minutes
    case '15': return 900;         // 15 minutes
    case '30': return 1800;        // 30 minutes
    case '60': return 3600;        // 1 hour
    case '240': return 14400;      // 4 hours
    case '1D': return 86400;       // 1 day
    case '1W': return 604800;      // 1 week
    case '1M': return 2592000;     // 1 month (30 days)
    default: return 60;            // Default to 1 minute
  }
}

// Helper function to calculate bar time based on resolution
function calculateBarTime(timestampSeconds, resolution) {
  const resolutionSeconds = parseResolutionToSeconds(resolution);
  return Math.floor(timestampSeconds / resolutionSeconds) * resolutionSeconds;
}

// Request history for a specific period to replace tick-built candle
async function requestHistoryForPeriod(symbolInfo, resolution, fromTime, toTime, sub) {
  const cacheKey = `${symbolInfo.full_name}_${resolution}_${fromTime}_${toTime}`;
  
  // Check if we already requested this period recently
  if (periodRequestCache.has(cacheKey)) {
    const lastRequest = periodRequestCache.get(cacheKey);
    if (Date.now() - lastRequest < 5000) { // 5 seconds cooldown
      console.log(`[CryptoCompare streaming] Skipping duplicate period request: ${cacheKey}`);
      return;
    }
  }
  
  periodRequestCache.set(cacheKey, Date.now());
  
  try {
    console.log(`[CryptoCompare streaming] Requesting history to replace tick-built candle: ${symbolInfo.full_name} ${resolution}`, {
      from: new Date(fromTime * 1000).toISOString(),
      to: new Date(toTime * 1000).toISOString(),
      note: 'Replacing inaccurate tick-built candle with server data'
    });
    
    const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    if (!parsedSymbol) {
      console.error('[CryptoCompare streaming] Failed to parse symbol:', symbolInfo.full_name);
      return;
    }
    
    // Map resolution to CryptoCompare format
    const timeframe = mapResolutionToCryptoCompare(resolution);
    
    const data = await makeApiRequest(`v2/histominute?fsym=${parsedSymbol.fromSymbol}&tsym=${parsedSymbol.toSymbol}&limit=1&toTs=${toTime}&aggregate=${timeframe}`);
    
    if (data && data.Data && data.Data.length > 0) {
      console.log(`[CryptoCompare streaming] Received ${data.Data.length} historical bars for period`);
      
      // Process historical bars and send to handlers
      const bars = data.Data.map(candle => {
        const { time, open, high, low, close, volumefrom } = candle;
        
        return {
          time: time * 1000, // Convert to milliseconds
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volumefrom) || 0
        };
      }).filter(bar => {
        const barTime = bar.time / 1000;
        return barTime >= fromTime && barTime <= toTime;
      });
      
      // Send historical bars to handlers with detailed logging
      bars.forEach((bar, index) => {
        console.log(`[CryptoCompare streaming] Sending historical bar ${index + 1}/${bars.length}:`, {
          time: new Date(bar.time).toISOString(),
          open: bar.open.toFixed(8),
          high: bar.high.toFixed(8),
          low: bar.low.toFixed(8),
          close: bar.close.toFixed(8),
          volume: bar.volume.toFixed(2)
        });
        
        sub.handlers.forEach(handler => {
          handler.callback(bar);
        });
        
        // Small delay between bars to avoid overwhelming the chart
        if (index < bars.length - 1) {
          setTimeout(() => {}, 10); // 10ms delay between each bar
        }
      });
      
      // Store historical bar separately - DON'T update current tick-based bar
      if (bars.length > 0) {
        sub.lastHistoricalBar = bars[bars.length - 1]; // Store separately from tick-based bar
        console.log(`[CryptoCompare streaming] Stored historical bar separately: ${new Date(sub.lastHistoricalBar.time).toISOString()}`);
        console.log(`[CryptoCompare streaming] Current tick-based bar remains: ${sub.lastDailyBar ? new Date(sub.lastDailyBar.time).toISOString() : 'None'}`);
        
        // DON'T trigger cache reset - it disrupts real-time tick updates
        // The historical bars sent via callbacks should be enough to update the chart
        console.log(`[CryptoCompare streaming] Historical data sent to TradingView - no cache reset needed to preserve tick updates`);
      }
    }
  } catch (error) {
    console.error(`[CryptoCompare streaming] Error requesting history for period:`, error);
  }
}

// Map TradingView resolution to CryptoCompare aggregate parameter
function mapResolutionToCryptoCompare(resolution) {
  switch (resolution) {
    case '1': return 1;           // 1 minute
    case '5': return 5;           // 5 minutes
    case '15': return 15;         // 15 minutes
    case '30': return 30;         // 30 minutes
    case '60': return 60;         // 1 hour
    case '240': return 240;       // 4 hours
    case '1D': return 1440;       // 1 day (1440 minutes)
    case '1W': return 10080;      // 1 week (10080 minutes)
    case '1M': return 43200;      // 1 month (43200 minutes)
    default: return 1;            // Default to 1 minute
  }
}

// Clean up old cache entries
function cleanupPeriodRequestCache() {
  const now = Date.now();
  for (const [key, timestamp] of periodRequestCache.entries()) {
    if (now - timestamp > 60000) { // Remove entries older than 1 minute
      periodRequestCache.delete(key);
    }
  }
}

export function subscribeOnStream(
  symbolInfo,
  resolution,
  onRealtimeCallback,
  subscriberUID,
  onResetCacheNeededCallback,
  lastDailyBar
) {
  if (!socket) {
    console.warn('⚠️ [subscribeOnStream]: WebSocket not available, streaming disabled');
    return;
  }

  const parsedSymbol = parseFullSymbol(symbolInfo.full_name);

  // Use format from working documentation: "2~Exchange~FromSymbol~ToSymbol"
  const channelString = `2~${parsedSymbol.exchange}~${parsedSymbol.fromSymbol}~${parsedSymbol.toSymbol}`;

  const handler = { id: subscriberUID, callback: onRealtimeCallback };

  let subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.handlers.push(handler);
    return;
  }

  subscriptionItem = {
    subscriberUID,
    resolution,
    lastDailyBar,
    handlers: [handler],
    onResetCacheNeededCallback, // Store for potential use
  };
  channelToSubscription.set(channelString, subscriptionItem);

  console.log('📡 [subscribeBars]: Subscribe to streaming. Channel:', channelString);

  const subRequest = {
    action: 'SubAdd',
    subs: [channelString],
  };

  console.log('📤 [subscribeBars]: Sending subscription request:', subRequest);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(subRequest));
  } else {
    console.warn('⚠️ [subscribeBars]: WebSocket not ready, will subscribe when connected');
    // Send once on open
    const once = () => {
      socket.removeEventListener('open', once);
      socket.send(JSON.stringify(subRequest));
    };
    socket.addEventListener('open', once);
  }
}

export function unsubscribeFromStream(subscriberUID) {
  if (!socket) {
    console.warn('⚠️ [unsubscribeFromStream]: WebSocket not available');
    return;
  }

  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString);
    if (!subscriptionItem) continue;

    const idx = subscriptionItem.handlers.findIndex((h) => h.id === subscriberUID);
    if (idx === -1) continue;

    // Remove this handler
    subscriptionItem.handlers.splice(idx, 1);

    if (subscriptionItem.handlers.length === 0) {
      // Unsubscribe from the channel if it was the last handler
      console.log('📡 [unsubscribeBars]: Unsubscribe from streaming. Channel:', channelString);

      const subRequest = {
        action: 'SubRemove',
        subs: [channelString],
      };

      console.log('📤 [unsubscribeBars]: Sending unsubscribe request:', subRequest);
      socket.send(JSON.stringify(subRequest));
      channelToSubscription.delete(channelString);
    }

    // We found the subscription for this UID; no need to scan further
    break;
  }
}
