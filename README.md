# TradingView Multi-Provider Datafeed Project

A comprehensive TradingView Advanced Charts implementation with multiple datafeed providers, originally a TradingView tutorial project that has been enhanced to support **CryptoCompare**, **MT5**, and **Fake Data** providers for learning and development purposes.

## 🎯 Project Purpose

This project serves as a **learning resource and contribution platform** for developers interested in:
- TradingView Charting Library integration
- Custom datafeed implementations
- Real-time financial data streaming
- Multi-provider architecture patterns
- Secure configuration management

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/tradingview-multi-provider-datafeed.git
cd tradingview-multi-provider-datafeed
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp env.example .env
```

Edit the `.env` file with your API keys:

```env
# Provider Configuration
PROVIDER=mt5  # Options: 'mt5' or 'cryptocompare'

# API Keys (Keep these secure!)
MT5_API_KEY=Bearer your_mt5_bearer_token_here
CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key_here

# MT5 Configuration
MT5_FAKE_DATA=0  # Set to 1 for fake data mode (testing)

# Development Settings
DEBUG_MODE=true
PORT=3001
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Project
```bash
# Start the Node.js server
node server.js

# Open in browser
# http://localhost:3001
```

## 📊 Supported Providers

### 🏦 MT5 Provider
- **Real-time forex data** from MetaTrader 5
- **WebSocket streaming** for live tick data
- **Historical data API** with timezone conversion
- **Fake data mode** for testing (when MT5 unavailable)

### 🪙 CryptoCompare Provider  
- **Cryptocurrency data** from CryptoCompare API
- **Multiple exchanges** support
- **Real-time streaming** via WebSocket
- **Historical data** with period-based accuracy

### 🎭 Fake Data Provider
- **Simulated market data** for testing
- **Realistic price movements** with trends and volatility
- **Multiple forex pairs** support
- **Configurable parameters** for different scenarios

## 📁 Project Structure

```
chart-project/
├── src/
│   ├── core/
│   │   ├── config.js          # Secure configuration management
│   │   └── main.js           # Application entry point
│   ├── providers/
│   │   ├── mt5/              # MT5 provider implementation
│   │   │   ├── datafeed.js   # TradingView datafeed interface
│   │   │   ├── streaming.js  # Real-time WebSocket handling
│   │   │   ├── fakeDataProvider.js # Fake data generation
│   │   │   ├── helpers.js    # Utility functions
│   │   │   └── config.js     # Provider configuration
│   │   ├── cryptocompare/    # CryptoCompare provider implementation
│   │   │   ├── datafeed.js   # TradingView datafeed interface
│   │   │   ├── streaming.js  # Real-time WebSocket handling
│   │   │   ├── helpers.js    # Utility functions
│   │   │   └── config.js     # Provider configuration
│   │   └── index.js          # Provider factory and selector
│   └── charting_library_cloned_data/  # TradingView library files
├── server.js                 # Node.js server with .env support
├── index.html               # Main application
├── env.example              # Environment variables template
├── PROVIDERS.md             # Detailed provider documentation
└── README.md               # This file
```

## 🔧 Configuration

### Provider Selection
Change the active provider in your `.env` file:

```env
# For MT5 provider
PROVIDER=mt5

# For CryptoCompare provider
PROVIDER=cryptocompare
```

### API Keys
- **MT5**: Bearer token from your MT5 server
- **CryptoCompare**: API key from [CryptoCompare](https://min-api.cryptocompare.com/)

### Fake Data Mode
Enable fake data for testing when real providers are unavailable:

```env
MT5_FAKE_DATA=1  # Set to 1 to enable fake data
```

## 📖 Detailed Documentation

For comprehensive information about each provider, configuration options, and advanced features, see:

**👉 [PROVIDERS.md](./PROVIDERS.md)** - Complete provider documentation including:
- Provider-specific configurations
- API endpoints and authentication
- Fake data mode setup
- Troubleshooting guides
- Usage examples

## 🔒 Security Features

- ✅ **Environment-based configuration** - No hardcoded secrets
- ✅ **Server-side validation** before serving config
- ✅ **Fallback configuration** if server fails
- ✅ **`.env` file ignored** by version control
- ✅ **Secure API key handling**

## 🛠️ Development & Contributing

### Contributing Guidelines

This project welcomes contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Areas for Contribution

- 🔧 **New Providers**: Add support for additional data sources
- 🐛 **Bug Fixes**: Report and fix issues
- 📚 **Documentation**: Improve guides and examples
- 🎨 **UI/UX**: Enhance chart customization options
- ⚡ **Performance**: Optimize data handling and caching
- 🧪 **Testing**: Add unit tests and integration tests

### Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/tradingview-multi-provider-datafeed.git

# Install dependencies
npm install

# Start development server
node server.js

# Make changes and test
# Submit pull request when ready
```

## 📊 Features

### Core Features
- ✅ **Multi-provider architecture** - Switch between MT5, CryptoCompare, and Fake Data
- ✅ **Real-time streaming** - Live tick data via WebSocket
- ✅ **Historical data** - Accurate server data with period-based requests
- ✅ **Secure configuration** - Environment-based setup
- ✅ **Fake data mode** - Testing without real data sources
- ✅ **Timezone handling** - Proper UTC conversion
- ✅ **Error handling** - Robust error management and fallbacks

### TradingView Integration
- ✅ **Full TradingView compatibility** - Uses official Charting Library
- ✅ **Symbol search** - Dynamic symbol discovery
- ✅ **Multiple timeframes** - 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M
- ✅ **Real-time updates** - Live chart updates
- ✅ **Chart customization** - Themes, indicators, and settings

## 🐛 Troubleshooting

### Common Issues

**Chart Not Loading**
- Check browser console for errors
- Verify API keys in `.env` file
- Ensure server is running on correct port

**Provider Not Working**
- Verify `PROVIDER` setting in `.env`
- Check API key authentication
- Review server console for connection errors

**Fake Data Not Working**
- Ensure `MT5_FAKE_DATA=1` in `.env`
- Restart server after configuration changes
- Check browser console for initialization messages

For detailed troubleshooting, see [PROVIDERS.md](./PROVIDERS.md).

## 📝 License

This project is for **educational and learning purposes**. Please respect the terms of service of:
- [TradingView](https://www.tradingview.com/)
- [CryptoCompare](https://min-api.cryptocompare.com/)
- [MetaTrader 5](https://www.metatrader5.com/)

## 👨‍💻 Author

**Muhammad Arshad Shaheen**

- 🌐 **GitHub**: [@arshadshaheen](https://github.com/arshadshaheen)
- 💼 **LinkedIn**: [arshadshaheen](https://www.linkedin.com/in/arshadshaheen/)
- 📧 **Twitter**: [@arshad_shaheen](https://twitter.com/arshad_shaheen)

---

## 🤝 Support

If you find this project helpful, please:
- ⭐ **Star the repository**
- 🍴 **Fork for your own projects**
- 🐛 **Report issues** you encounter
- 💡 **Suggest improvements**
- 📢 **Share with other developers**

**Happy coding! 🚀**