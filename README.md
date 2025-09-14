# TradingView Chart Project

A TradingView Advanced Charts implementation with custom datafeed using CryptoCompare API.

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd chart-project
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp env.example .env
```

Edit the `.env` file with your actual API keys:

```env
# CryptoCompare API Configuration
CRYPTOCOMPARE_API_KEY=your_actual_api_key_here

# TradingView Configuration
TRADINGVIEW_DEFAULT_SYMBOL=Bitfinex:BTC/USDT
TRADINGVIEW_DEFAULT_INTERVAL=1D

# Development Settings
DEBUG_MODE=true
```

### 3. Get Your CryptoCompare API Key

1. Visit [CryptoCompare API](https://min-api.cryptocompare.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file

### 4. Run the Project

#### Option A: Development Version (with .env support)
```bash
# Serve the files using a local server
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

Then open: `http://localhost:8000/index-dev.html`

#### Option B: Production Version
Open `index.html` directly in your browser (API key will need to be set in config.js)

## 📁 Project Structure

```
chart-project/
├── src/
│   ├── config.js          # Environment configuration
│   ├── helpers.js         # API helpers and utilities
│   ├── datafeed.js        # TradingView datafeed implementation
│   ├── main.js           # Main application entry point
│   └── streaming.js      # Real-time streaming functionality
├── charting_library_cloned_data/  # TradingView library files
├── index.html            # Production version
├── index-dev.html        # Development version (with .env support)
├── index2.html          # Demo version with UDF datafeed
├── index-simple.html    # Simple version with mock data
├── index-debug.html     # Debug version with logging
├── load-env.js          # Environment variable loader
├── env.example          # Environment variables template
├── .gitignore           # Git ignore rules
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CRYPTOCOMPARE_API_KEY` | Your CryptoCompare API key | Required |
| `TRADINGVIEW_DEFAULT_SYMBOL` | Default symbol to display | `Bitfinex:BTC/USDT` |
| `TRADINGVIEW_DEFAULT_INTERVAL` | Default time interval | `1D` |
| `DEBUG_MODE` | Enable debug logging | `false` |

### Supported Symbols

The datafeed supports symbols from these exchanges:
- Bitfinex
- Kraken

Format: `Exchange:Symbol/Base` (e.g., `Bitfinex:BTC/USDT`)

### Supported Resolutions

- Daily: `1D`
- Weekly: `1W` 
- Monthly: `1M`

## 🔒 Security

- **Never commit your `.env` file** to version control
- The `.gitignore` file is configured to exclude sensitive files
- Use `env.example` as a template for other developers

## 🛠️ Development

### Adding New Symbols

1. Update the `getAllSymbols()` function in `src/datafeed.js`
2. Add the new exchange/symbol to the configuration

### Customizing the Chart

Modify the TradingView widget configuration in `src/main.js`:

```javascript
window.tvWidget = new TradingView.widget({
    symbol: TRADINGVIEW_DEFAULT_SYMBOL,
    interval: TRADINGVIEW_DEFAULT_INTERVAL,
    // ... other options
});
```

## 📊 Features

- ✅ Custom CryptoCompare datafeed
- ✅ Real-time data streaming
- ✅ Multiple time resolutions
- ✅ Symbol search functionality
- ✅ Environment variable configuration
- ✅ Debug mode with logging
- ✅ Multiple deployment options

## 🐛 Troubleshooting

### Chart Not Loading
1. Check browser console for errors
2. Verify your API key is correctly set
3. Ensure you're using a local server (not file:// protocol)

### API Rate Limits
- Free CryptoCompare accounts have rate limits
- Consider upgrading for higher limits
- The datafeed includes error handling for rate limits

### Environment Variables Not Loading
1. Ensure `.env` file exists in project root
2. Check file permissions
3. Use `index-dev.html` for development

## 📝 License

This project is for educational purposes. Please respect TradingView's and CryptoCompare's terms of service.
"# chart-project" 
