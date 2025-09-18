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
    const mt5ApiKey = process.env.MT5_API_KEY || '';
    const cryptocompareApiKey = process.env.CRYPTOCOMPARE_API_KEY || '';
    
    console.log('🔍 [Server] Environment variables loaded:');
    console.log('PROVIDER:', provider);
    console.log('MT5_API_KEY:', mt5ApiKey ? 'configured' : 'missing');
    console.log('CRYPTOCOMPARE_API_KEY:', cryptocompareApiKey ? 'configured' : 'missing');
    
    // Provider-specific configurations from environment variables
    const providerConfigs = {
        cryptocompare: {
            apiKey: cryptocompareApiKey,
            baseUrl: process.env.CRYPTOCOMPARE_BASE_URL || 'https://min-api.cryptocompare.com/',
            wsUrl: process.env.CRYPTOCOMPARE_WS_URL || 'wss://streamer.cryptocompare.com/v2',
            defaultSymbol: process.env.CRYPTOCOMPARE_DEFAULT_SYMBOL || 'Bitfinex:BTC/USDT',
            defaultInterval: process.env.CRYPTOCOMPARE_DEFAULT_INTERVAL || '1D'
        },
        mt5: {
            apiKey: mt5ApiKey,
            baseUrl: process.env.MT5_BASE_URL || 'http://localhost:3000',
            wsUrl: process.env.MT5_WS_URL || 'wss://live-mt5-sockets-staging.naqdi.com',
            defaultSymbol: process.env.MT5_DEFAULT_SYMBOL || 'EURUSD.s',
            defaultInterval: process.env.MT5_DEFAULT_INTERVAL || '1',
            isFakeData: parseInt(process.env.MT5_FAKE_DATA || '0')
        }
    };
    
    const activeProviderConfig = providerConfigs[provider] || providerConfigs.mt5;
    
    const config = {
        PROVIDER: provider,
        PROVIDER_API_KEY: provider === 'mt5' ? mt5ApiKey : cryptocompareApiKey,
        TRADINGVIEW_DEFAULT_SYMBOL: activeProviderConfig.defaultSymbol,
        TRADINGVIEW_DEFAULT_INTERVAL: activeProviderConfig.defaultInterval,
        DEBUG_MODE: process.env.DEBUG_MODE || 'true',
        PROVIDER_CONFIG: {
            cryptocompare: providerConfigs.cryptocompare,
            mt5: providerConfigs.mt5
        }
    };
    
    console.log('🔧 [Server] Serving config for provider:', provider);
    console.log('🔧 [Server] Config keys:', Object.keys(config));
    res.json(config);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 TradingView Chart with Multi-Provider Support`);
    console.log(`🔧 Provider: ${process.env.PROVIDER || 'mt5'}`);
});
