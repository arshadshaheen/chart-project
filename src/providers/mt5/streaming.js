/* global io */
import { getApiKey, getWebSocketUrl } from './config.js';
import { parseFullSymbol } from './helpers.js';

let socket = null;
const channelToSubscription = new Map();   // key: `tick:EURUSD.s` -> { handlers, lastDailyBar, ... }
const subscribedSymbols = new Set();       // symbols like "EURUSD.s"

const apiKey = getApiKey();                // e.g. "Bearer eyJ..." (already includes "Bearer ")
const wsBaseUrl = getWebSocketUrl();       // e.g. "wss://live-mt5-sockets-staging.naqdi.com"

console.log('[MT5 streaming] API key:', apiKey ? 'configured' : 'missing');
console.log('[MT5 streaming] Socket.IO URL:', wsBaseUrl);

function openSocket() {
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
  socket.on('mt5_events_tick', (data) => {
    try {
      console.log('[MT5 socket] Received mt5_events_tick:', data);
      
      if (data?.Payload?.Type === 'Tick') {
        console.log('[MT5 socket] Processing tick data:', data.Payload.Data);
        handleMt5TickData(data.Payload.Data);
        return;
      }
      
      if (data?.Type === 'Tick' && data?.Data) {
        console.log('[MT5 socket] Processing direct tick data:', data.Data);
        handleMt5TickData(data.Data);
        return;
      }
      
      console.log('[MT5 socket] Unhandled mt5_events_tick:', data);
    } catch (e) {
      console.error('[MT5 socket] Error handling mt5_events_tick:', e);
    }
  });

  // Handle other possible event names
  socket.on('tick', (data) => {
    console.log('[MT5 socket] Received tick event:', data);
    if (data?.Type === 'Tick' && data?.Data) {
      handleMt5TickData(data.Data);
    }
  });
}

// Start connection
openSocket();

// ---------- Tick handling ----------

function handleMt5TickData(tick) {
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
  const tsMs = typeof Datetime_Msc === 'number' ? Datetime_Msc : Datetime * 1000;
  const tsSeconds = Math.floor(tsMs / 1000);

  // Calculate the bar time based on the resolution
  const barTime = calculateBarTime(tsSeconds, sub.resolution);

  const incomingBar = {
    time: barTime * 1000, // Convert back to milliseconds for TradingView
    open: mid,
    high: mid,
    low: mid,
    close: mid,
    volume: typeof Volume === 'number' ? Volume : 0,
  };

  // Check if this tick belongs to the current bar or starts a new one
  if (sub.lastDailyBar && sub.lastDailyBar.time === incomingBar.time) {
    // Update existing bar
    sub.lastDailyBar = {
      ...sub.lastDailyBar,
      high: Math.max(sub.lastDailyBar.high, mid),
      low: Math.min(sub.lastDailyBar.low, mid),
      close: mid,
      volume: sub.lastDailyBar.volume + (typeof Volume === 'number' ? Volume : 0),
    };
    console.log(`[MT5 socket] Updated bar for ${mt5Symbol} at ${new Date(barTime * 1000).toISOString()}: close=${mid}`);
  } else {
    // Start new bar
    sub.lastDailyBar = incomingBar;
    console.log(`[MT5 socket] New bar for ${mt5Symbol} at ${new Date(barTime * 1000).toISOString()}: open=${mid}, close=${mid}`);
  }

  // Notify all handlers with the updated bar
  sub.handlers.forEach((h) => h.callback(sub.lastDailyBar));
}

function calculateBarTime(timestampSeconds, resolution) {
  // Convert resolution string to seconds
  const resolutionSeconds = parseResolutionToSeconds(resolution);
  
  // Calculate the start time of the bar this timestamp belongs to
  return Math.floor(timestampSeconds / resolutionSeconds) * resolutionSeconds;
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
  
  return resolutionMap[resolution] || 86400; // Default to 1 day
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

  const mt5Symbol = `${parsed.fromSymbol}${parsed.toSymbol}`;  // e.g., EURUSD.s (if that’s your MT5 format)
  const channelKey = `tick:${mt5Symbol}`;

  const handler = { id: subscriberUID, callback: onRealtimeCallback };

  let entry = channelToSubscription.get(channelKey);
  if (entry) {
    entry.handlers.push(handler);
  } else {
    entry = { subscriberUID, resolution, lastDailyBar, handlers: [handler] };
    channelToSubscription.set(channelKey, entry);
  }

  subscribedSymbols.add(mt5Symbol);
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
