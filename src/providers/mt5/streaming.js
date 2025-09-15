import { getApiKey, getWebSocketUrl } from './config.js';
import { parseFullSymbol } from './helpers.js';

let socket = null;
const channelToSubscription = new Map();   // key: `tick:EURUSD.s` -> { handlers, lastDailyBar, ... }
const subscribedSymbols = new Set();       // symbols like "EURUSD.s"

const apiKey = getApiKey();                // e.g. "Bearer eyJ..." (already includes "Bearer ")
const wsBaseUrl = getWebSocketUrl();

console.log('[MT5 streaming] API key:', apiKey ? 'configured' : 'missing');
console.log('[MT5 streaming] WebSocket URL:', wsBaseUrl);

function openSocket() {
  if (!wsBaseUrl || !apiKey) {
    console.warn('[MT5 streaming] Not connecting: missing URL or API key');
    return;
  }

  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    try { socket.close(); } catch {}
  }

  // Add Bearer token as query parameter since WebSocket doesn't support headers in browsers
  const urlWithAuth = `${wsBaseUrl}?Authorization=${encodeURIComponent(apiKey)}`;
  console.log('[MT5 socket] Connecting to:', urlWithAuth);
  
  try {
    socket = new WebSocket(urlWithAuth);
  } catch (error) {
    console.error('[MT5 socket] Failed to create WebSocket:', error);
    return;
  }

  socket.onopen = () => {
    console.log('[MT5 socket] Connected with Authorization header in URL');
    
    // Re-send current subscriptions (idempotent)
    if (subscribedSymbols.size > 0) {
      const subRequest = { id: 'subscribe_symbol', payload: Array.from(subscribedSymbols) };
      console.log('[MT5 socket] Resubscribe on connect:', subRequest);
      socket.send(JSON.stringify(subRequest));
    }
  };

  socket.onclose = (event) => {
    console.log('[MT5 socket] Disconnected:', event.code, event.reason);
    
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      console.log('[MT5 socket] Attempting to reconnect...');
      openSocket();
    }, 5000);
  };

  socket.onerror = (error) => {
    console.error('[MT5 socket] Connection error:', error);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[MT5 socket] Received message:', data);
      
      // Handle authentication response (if server sends one)
      if (data?.type === 'auth') {
        if (data?.status === 'success') {
          console.log('[MT5 socket] Auth success');
        } else {
          console.error('[MT5 socket] Auth failed:', data?.message);
        }
        return;
      }
      
      // Handle mt5_events_tick data
      if (data?.Topic === 'mt5_events_tick' && data?.Payload?.Type === 'Tick') {
        console.log('[MT5 socket] Received mt5_events_tick:', data.Payload.Data);
        handleMt5TickData(data.Payload.Data);
        return;
      }
      
      // Some servers may push tick data directly
      if (data?.Type === 'Tick' && data?.Data) {
        console.log('[MT5 socket] Received direct tick data:', data.Data);
        handleMt5TickData(data.Data);
        return;
      }
      
      console.log('[MT5 socket] Unhandled message:', data?.Topic || data?.type, data);
    } catch (e) {
      console.error('[MT5 socket] Error handling message:', e);
    }
  };
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

  const mt5Symbol = Symbol; // keep as-is unless you need to strip suffixes
  const sub = findSubscriptionBySymbol(mt5Symbol);
  if (!sub) return;

  const mid = (Ask + Bid) / 2;
  const tsMs = typeof Datetime_Msc === 'number' ? Datetime_Msc : Datetime * 1000;

  const incomingBar = {
    time: tsMs,         // ms timestamp (TradingView can handle ms)
    open: mid,
    high: mid,
    low: mid,
    close: mid,
    volume: typeof Volume === 'number' ? Volume : 0,
  };

  if (sub.lastDailyBar) {
    sub.lastDailyBar = {
      ...sub.lastDailyBar,
      high: Math.max(sub.lastDailyBar.high, mid),
      low: Math.min(sub.lastDailyBar.low, mid),
      close: mid,
    };
  } else {
    sub.lastDailyBar = incomingBar;
  }

  // Notify all handlers
  sub.handlers.forEach((h) => h.callback(sub.lastDailyBar));
}

function findSubscriptionBySymbol(symbol) {
  // Exact match using the canonical channel key
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

  const mt5Symbol = `${parsed.fromSymbol}${parsed.toSymbol}`;  // e.g., EURUSD.s
  const channelKey = `tick:${mt5Symbol}`;

  const handler = { id: subscriberUID, callback: onRealtimeCallback };

  let entry = channelToSubscription.get(channelKey);
  if (entry) {
    entry.handlers.push(handler);
  } else {
    entry = { subscriberUID, resolution, lastDailyBar, handlers: [handler] };
    channelToSubscription.set(channelKey, entry);
  }

  // Track the symbol
  subscribedSymbols.add(mt5Symbol);
  console.log('[MT5 subscribe] Added symbol to subscription list:', mt5Symbol);
  console.log('[MT5 subscribe] Current subscribed symbols:', Array.from(subscribedSymbols));

  // Send consolidated subscription list (idempotent)
  const subRequest = { id: 'subscribe_symbol', payload: Array.from(subscribedSymbols) };
  if (socket?.readyState === WebSocket.OPEN) {
    console.log('[MT5 subscribe] -> subscribe_symbols', subRequest);
    socket.send(JSON.stringify(subRequest));
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

    // Remove this handler
    entry.handlers.splice(idx, 1);

    if (entry.handlers.length === 0) {
      // No more listeners for this channel
      channelToSubscription.delete(channelKey);

      // Remove the exact symbol (no ".s" suffix)
      const mt5Symbol = channelKey.replace('tick:', '');
      subscribedSymbols.delete(mt5Symbol);

      // Re-send the current full list (idempotent approach)
      const subRequest = { id: 'subscribe_symbol', payload: Array.from(subscribedSymbols) };
      console.log('[MT5 unsubscribe] -> subscribe_symbols', subRequest);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(subRequest));
      }
    }

    // Done after we handled this UID
    break;
  }
}

// Optional: helper if you ever need daily bar boundaries
function getNextDailyBarTime(barTime) {
  const date = new Date((barTime || 0) * 1000);
  date.setDate(date.getDate() + 1);
  return Math.floor(date.getTime() / 1000);
}
