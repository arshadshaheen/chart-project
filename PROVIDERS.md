# TradingView Chart Providers

This document describes the available data providers for the TradingView charting application and how to configure them.

## 📊 Available Providers

The application supports **two main data providers**:

### 1. **MT5 Provider** 🏦
- **Name**: MT5 (Naqdi)
- **Description**: MT5-based provider for trading data with DOHLC format support
- **Data Source**: MetaTrader 5 trading platform via REST API and WebSocket
- **Symbols**: Forex pairs (EURUSD.s, GBPUSD.s, etc.)
- **Timeframes**: 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M
- **Authentication**: Bearer Token
- **Special Features**: 
  - ✅ **Fake Data Mode** for testing (when MT5 server unavailable)
  - ✅ Real-time tick streaming via WebSocket
  - ✅ Historical data caching
  - ✅ Timezone conversion (MT5 GMT+3 to UTC)

### 2. **CryptoCompare Provider** 🪙
- **Name**: CryptoCompare
- **Description**: CryptoCompare API for cryptocurrency data
- **Data Source**: CryptoCompare public API
- **Symbols**: Cryptocurrency pairs (BTC/USDT, ETH/USDT, etc.)
- **Timeframes**: Various cryptocurrency timeframes
- **Authentication**: API Key
- **Features**: 
  - ✅ Real-time cryptocurrency data
  - ✅ WebSocket streaming support
  - ✅ Multiple exchange support

---

## 🔧 Provider Configuration

### Switching Providers

To change the active provider, edit `src/core/config.js`:

```javascript
// Change this line to switch providers
const PROVIDER = 'mt5'; // Options: 'mt5' or 'cryptocompare'
```

### API Keys Configuration

Set your API keys in `src/core/config.js`:

```javascript
const API_KEYS = {
    mt5: 'Bearer your-mt5-token-here',
    cryptocompare: 'your-cryptocompare-api-key-here'
};
```

---

## 🎭 MT5 Fake Data Mode

The MT5 provider includes a **fake data mode** for testing when the real MT5 server is unavailable.

### 🚀 Enabling Fake Data Mode

1. **Edit Configuration**:
   ```javascript
   // In src/core/config.js
   mt5: {
       // ... other config
       isFakeData: 1  // Set to 1 to enable fake data
   }
   ```

2. **Restart Application**: Reload the page for changes to take effect

### 🎯 Fake Data Features

- **✅ Realistic Price Movement**: Multi-layered price simulation with trends, cycles, and noise
- **✅ Symbol Support**: 8 major forex pairs (EURUSD, GBPUSD, USDJPY, etc.)
- **✅ Realistic Wicks**: Very small candle wicks (0.00005% - 0.0002%)
- **✅ Continuous Prices**: Next candle opens at previous candle's close
- **✅ Real-time Ticks**: Simulated WebSocket tick data
- **✅ Historical Data**: Generated historical OHLC bars
- **✅ Market Behavior**: Daily cycles, trend changes, and realistic volatility

### 📈 Supported Fake Symbols

| Symbol | Base Price | Volatility | Description |
|--------|------------|------------|-------------|
| EURUSD | ~1.09500 | ±20 pips | Euro/US Dollar |
| GBPUSD | ~1.27500 | ±25 pips | British Pound/US Dollar |
| USDJPY | ~149.500 | ±10 pips | US Dollar/Japanese Yen |
| AUDUSD | ~0.65800 | ±30 pips | Australian Dollar/US Dollar |
| USDCAD | ~1.36200 | ±25 pips | US Dollar/Canadian Dollar |
| EURJPY | ~163.800 | ±15 pips | Euro/Japanese Yen |
| GBPJPY | ~190.600 | ±20 pips | British Pound/Japanese Yen |
| EURGBP | ~0.85900 | ±15 pips | Euro/British Pound |

### 🔧 Fake Data Configuration

The fake data generator can be customized in `src/providers/mt5/fakeDataProvider.js`:

```javascript
// Base prices (current market prices)
const BASE_PRICES = {
    'EURUSD': { ask: 1.09550, bid: 1.09500, spread: 0.00050 },
    // ... more symbols
};

// Volatility factors (how much prices can move)
const VOLATILITY = {
    'EURUSD': 0.00020,  // ±20 pips
    // ... more symbols
};

// Wick size configuration
const maxWickPercent = 0.0002; // Maximum 0.02% wick
const minWickPercent = 0.00005; // Minimum 0.005% wick
const wickChance = 0.3; // 30% chance of having any wick at all
```

---

## 📁 Provider Structure

Each provider follows the same modular structure:

```
src/providers/
├── mt5/                    # MT5 Provider
│   ├── index.js           # Provider definition & exports
│   ├── config.js          # Configuration functions
│   ├── datafeed.js        # TradingView datafeed implementation
│   ├── streaming.js       # Real-time WebSocket handling
│   ├── helpers.js         # Utility functions
│   └── fakeDataProvider.js # Fake data generation (MT5 only)
├── cryptocompare/         # CryptoCompare Provider
│   ├── index.js           # Provider definition & exports
│   ├── config.js          # Configuration functions
│   ├── datafeed.js        # TradingView datafeed implementation
│   ├── streaming.js       # Real-time WebSocket handling
│   └── helpers.js         # Utility functions
└── index.js               # Provider factory & selector
```

---

## 🎮 Usage Examples

### Using MT5 Provider with Real Data
```javascript
// In src/core/config.js
const PROVIDER = 'mt5';
const PROVIDER_CONFIG = {
    mt5: {
        apiKey: 'Bearer your-token',
        baseUrl: 'http://localhost:3000',
        wsUrl: 'wss://live-mt5-sockets-staging.naqdi.com',
        defaultSymbol: 'EURUSD.s',
        isFakeData: 0  // Real data mode
    }
};
```

### Using MT5 Provider with Fake Data
```javascript
// In src/core/config.js
const PROVIDER = 'mt5';
const PROVIDER_CONFIG = {
    mt5: {
        // ... other config
        isFakeData: 1  // Fake data mode
    }
};
```

### Using CryptoCompare Provider
```javascript
// In src/core/config.js
const PROVIDER = 'cryptocompare';
const PROVIDER_CONFIG = {
    cryptocompare: {
        apiKey: 'your-api-key',
        baseUrl: 'https://min-api.cryptocompare.com/',
        wsUrl: 'wss://streamer.cryptocompare.com/v2',
        defaultSymbol: 'Bitfinex:BTC/USDT'
    }
};
```

---

## 🐛 Troubleshooting

### Fake Data Not Working
- ✅ Ensure `isFakeData: 1` in `src/core/config.js`
- ✅ Restart the application (reload page)
- ✅ Check browser console for fake data initialization messages

### Provider Not Loading
- ✅ Verify provider name in `src/core/config.js` matches available providers
- ✅ Check API keys are properly configured
- ✅ Review browser console for error messages

### Real-time Data Issues
- ✅ Verify WebSocket URL is correct
- ✅ Check API key authentication
- ✅ Ensure network connectivity to data source

---

## 🔄 Provider Switching

The application supports **hot-switching** between providers:

1. **Change Provider**: Update `PROVIDER` in `src/core/config.js`
2. **Update Configuration**: Set appropriate API keys and URLs
3. **Restart**: Reload the page to initialize the new provider

The provider system is designed to be **modular and extensible** - new providers can be added by following the existing structure and implementing the required interfaces.

---

*Last updated: December 2024*
