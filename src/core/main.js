// Main application entry point with provider-based architecture
import { getProvider } from '../providers/index.js';
import { 
    TRADINGVIEW_DEFAULT_SYMBOL, 
    TRADINGVIEW_DEFAULT_INTERVAL, 
    DEBUG_MODE, 
    validateConfig,
    getCurrentProvider,
    getCurrentProviderConfig
} from './config.js';

console.log('🔧 Configuration loaded:');
console.log('Current Provider:', getCurrentProvider());
console.log('Provider Config:', getCurrentProviderConfig());
console.log('TRADINGVIEW_DEFAULT_SYMBOL:', TRADINGVIEW_DEFAULT_SYMBOL);
console.log('TRADINGVIEW_DEFAULT_INTERVAL:', TRADINGVIEW_DEFAULT_INTERVAL);
console.log('DEBUG_MODE:', DEBUG_MODE);

// Validate configuration now that everything is loaded
validateConfig();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    console.log('TradingView available:', typeof TradingView !== 'undefined');
    
    // Wait a bit more for TradingView library to be fully loaded
    setTimeout(() => {
        console.log('⏰ Timeout reached, checking TradingView library...');
        console.log('TradingView available:', typeof TradingView !== 'undefined');
        
        if (typeof TradingView === 'undefined') {
            console.error('❌ TradingView library not loaded');
            console.error('Available globals:', Object.keys(window).filter(k => k.includes('Trading') || k.includes('tv')));
            return;
        }
        
        console.log('✅ TradingView library found, creating widget...');
        
        try {
            // Get the configured provider
            const provider = getProvider(getCurrentProvider());
            console.log('🔌 Using provider:', provider.name);
            
            // Create the TradingView widget with provider-specific datafeed
            window.tvWidget = new TradingView.widget({
                symbol: TRADINGVIEW_DEFAULT_SYMBOL,       // Default symbol pair with exchange
                interval: TRADINGVIEW_DEFAULT_INTERVAL,   // Default interval
                fullscreen: true,                        // Displays the chart in the fullscreen mode
                container: 'tv_chart_container',         // Reference to an attribute of a DOM element
                datafeed: provider.datafeed,             // Provider-specific datafeed
                library_path: './charting_library_cloned_data/charting_library/', // Fixed path
                locale: 'en',
                debug: DEBUG_MODE === 'true',
                disabled_features: [
                    'use_localstorage_for_settings',
                    'volume_force_overlay',
                    'create_volume_indicator_by_default'
                ],
                enabled_features: [
                    'side_toolbar_in_fullscreen_mode',
                    'header_in_fullscreen_mode'
                ],
                theme: 'light',
                toolbar_bg: '#f1f3f6'
            });
            
            console.log('✅ TradingView widget created successfully');
        } catch (error) {
            console.error('❌ Error creating TradingView widget:', error);
        }
    }, 1000);
});