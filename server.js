import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Load environment variables from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

console.log('🔍 [Server] Looking for .env file at:', envPath);
console.log('🔍 [Server] .env file exists:', existsSync(envPath));

dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get configuration
app.get('/api/config', (req, res) => {
    const provider = process.env.PROVIDER || 'mt5';
    const apiKey = process.env.PROVIDER_API_KEY || '';
    
    console.log('🔍 [Server] Environment variables loaded:');
    console.log('PROVIDER:', provider);
    console.log('API_KEY:', apiKey ? 'configured' : 'missing');
    
    // Provider-specific configurations (hardcoded)
    const providerConfigs = {
        cryptocompare: {
            apiKey: provider === 'cryptocompare' ? apiKey : '',
            baseUrl: 'https://min-api.cryptocompare.com/',
            wsUrl: 'wss://streamer.cryptocompare.com/v2',
            defaultSymbol: 'Bitfinex:BTC/USDT',
            defaultInterval: '1D'
        },
        mt5: {
            apiKey: provider === 'mt5' ? apiKey : '',
            baseUrl: 'http://localhost:3000',
            wsUrl: 'wss://live-mt5-sockets-staging.naqdi.com',
            defaultSymbol: 'EURUSD.s',
            defaultInterval: '1D'
        }
    };
    
    const activeProviderConfig = providerConfigs[provider] || providerConfigs.mt5;
    
    const config = {
        PROVIDER: provider,
        PROVIDER_API_KEY: apiKey,
        TRADINGVIEW_DEFAULT_SYMBOL: activeProviderConfig.defaultSymbol,
        TRADINGVIEW_DEFAULT_INTERVAL: activeProviderConfig.defaultInterval,
        DEBUG_MODE: 'true',
        PROVIDER_CONFIG: {
            cryptocompare: providerConfigs.cryptocompare,
            mt5: providerConfigs.mt5
        }
    };
    
    console.log('🔧 [Server] Serving config:', config);
    res.json(config);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 TradingView Chart with Multi-Provider Support`);
    console.log(`🔧 Provider: ${process.env.PROVIDER || 'mt5'}`);
});
