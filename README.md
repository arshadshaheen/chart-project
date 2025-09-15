# TradingView Chart with Multi-Provider Support

A TradingView charting library implementation with support for multiple data providers (CryptoCompare and MT5).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   # Simplified Configuration
   PROVIDER=mt5
   PROVIDER_API_KEY=Bearer your_api_key_here
   ```
   
   **Provider Options:**
   - `PROVIDER=mt5` - Use MT5 provider (default)
   - `PROVIDER=cryptocompare` - Use CryptoCompare provider
   
   **API Key Examples:**
   - **MT5**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **CryptoCompare**: `your_cryptocompare_api_key`

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
chart-project/
├── src/
│   ├── core/
│   │   ├── config.js          # Configuration management
│   │   └── main.js            # Main application entry
│   └── providers/
│       ├── index.js           # Provider factory
│       ├── cryptocompare/     # CryptoCompare provider
│       │   ├── index.js
│       │   ├── datafeed.js
│       │   ├── helpers.js
│       │   ├── streaming.js
│       │   └── config.js
│       └── mt5/               # MT5 provider
│           ├── index.js
│           ├── datafeed.js
│           ├── helpers.js
│           ├── streaming.js
│           └── config.js
├── server.js                  # Node.js server
├── package.json
├── .env                       # Environment variables
└── index.html                 # Main HTML file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PROVIDER` | Active provider | `mt5` or `cryptocompare` |
| `PROVIDER_API_KEY` | API key for the selected provider | `Bearer your_token` or `your_api_key` |

**Note:** All other settings (URLs, symbols, intervals) are hardcoded in the provider configurations for simplicity.

### Provider Configuration

Each provider has its own configuration:
- **API Key**: Authentication token
- **Base URL**: REST API endpoint
- **WebSocket URL**: Real-time data endpoint

## 🌐 API Endpoints

- `GET /` - Serves the main chart application
- `GET /api/config` - Returns current configuration

## 🔌 Supported Providers

### CryptoCompare
- **Data**: Historical and real-time cryptocurrency data
- **Authentication**: API key
- **WebSocket**: Real-time price updates

### MT5
- **Data**: Forex and CFD data via MT5 API
- **Authentication**: Bearer token
- **WebSocket**: Real-time tick data via Socket.IO

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Adding New Providers

1. Create a new provider directory in `src/providers/`
2. Implement the required modules:
   - `index.js` - Provider definition
   - `datafeed.js` - Historical data
   - `helpers.js` - Utility functions
   - `streaming.js` - Real-time data
   - `config.js` - Provider configuration

3. Add the provider to `src/providers/index.js`
4. Update the server configuration in `server.js`

## 🐛 Troubleshooting

### Common Issues

1. **Chart not loading**: Check browser console for errors
2. **No data**: Verify API keys and provider configuration
3. **WebSocket errors**: Check WebSocket URLs and authentication

### Debug Mode

Enable debug mode by setting `DEBUG_MODE=true` in your `.env` file to see detailed logging.

## 📝 License

MIT License