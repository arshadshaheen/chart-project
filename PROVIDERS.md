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

### 🔐 Secure Configuration with Environment Variables

**IMPORTANT**: All sensitive configuration (API keys, provider settings) is now loaded from environment variables for security.

### Setting Up Environment Variables

1. **Copy the example file**:
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file** with your actual values:
   ```bash
   # Provider selection
   PROVIDER=mt5
   
   # API Keys (keep secure!)
   MT5_API_KEY=Bearer your_actual_mt5_token_here
   CRYPTOCOMPARE_API_KEY=your_actual_cryptocompare_key_here
   
   # MT5 Settings
   MT5_FAKE_DATA=0  # Set to 1 for fake data mode
   ```

3. **Restart the server** for changes to take effect

### 🚨 Security Benefits

- ✅ **No hardcoded secrets** in source code
- ✅ **Environment-based configuration** 
- ✅ **Server-side validation** before serving config
- ✅ **Fallback configuration** if server fails
- ✅ **`.env` file ignored** by version control

### Switching Providers

Change the `PROVIDER` value in your `.env` file:

```bash
# For MT5 provider
PROVIDER=mt5

# For CryptoCompare provider  
PROVIDER=cryptocompare
```

---

## 🎭 MT5 Fake Data Mode

The MT5 provider includes a **fake data mode** for testing when the real MT5 server is unavailable.

### 🚀 Enabling Fake Data Mode

1. **Edit Environment Variable**:
   ```bash
   # In your .env file
   MT5_FAKE_DATA=1  # Set to 1 to enable fake data
   ```

2. **Restart Server**: Restart the Node.js server for changes to take effect

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
```bash
# In your .env file
PROVIDER=mt5
MT5_API_KEY=Bearer your_actual_mt5_token_here
MT5_FAKE_DATA=0
```

### Using MT5 Provider with Fake Data
```bash
# In your .env file
PROVIDER=mt5
MT5_API_KEY=Bearer your_actual_mt5_token_here
MT5_FAKE_DATA=1
```

### Using CryptoCompare Provider
```bash
# In your .env file
PROVIDER=cryptocompare
CRYPTOCOMPARE_API_KEY=your_actual_cryptocompare_key_here
```

---

## 🐛 Troubleshooting

### Fake Data Not Working
- ✅ Ensure `MT5_FAKE_DATA=1` in your `.env` file
- ✅ Restart the Node.js server (not just reload page)
- ✅ Check browser console for fake data initialization messages

### Provider Not Loading
- ✅ Verify `PROVIDER` value in `.env` file matches available providers
- ✅ Check API keys are properly configured in `.env`
- ✅ Review server console for environment variable loading messages
- ✅ Review browser console for configuration loading messages

### Real-time Data Issues
- ✅ Verify WebSocket URL is correct in `.env`
- ✅ Check API key authentication in `.env`
- ✅ Ensure network connectivity to data source
- ✅ Restart server after changing environment variables

---

## 🔄 Provider Switching

The application supports **secure switching** between providers:

1. **Change Provider**: Update `PROVIDER` in your `.env` file
2. **Update API Keys**: Set appropriate API keys in `.env`
3. **Restart Server**: Restart the Node.js server to load new configuration

The provider system is designed to be **modular and extensible** - new providers can be added by following the existing structure and implementing the required interfaces.

---

*Last updated: December 2024*
