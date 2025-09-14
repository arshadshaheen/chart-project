/* global WebSocket */
import { CRYPTOCOMPARE_API_KEY } from './config.js';
import { parseFullSymbol } from './helpers.js';

let socket = null;

console.log('🔑 [streaming]: Using API key:', CRYPTOCOMPARE_API_KEY);

// Create WebSocket using the exact format from your working code
const wsUrl = `wss://streamer.cryptocompare.com/v2?api_key=${CRYPTOCOMPARE_API_KEY}`;
console.log('🔌 [streaming]: Connecting to WebSocket:', wsUrl);
socket = new WebSocket(wsUrl);
const channelToSubscription = new Map();

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
  const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time);

  let bar;
  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
    };
    console.log('[socket] Generate new bar', bar);
  } else {
    bar = {
      ...lastDailyBar,
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice,
    };
    console.log('[socket] Update the latest bar by price', tradePrice);
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
