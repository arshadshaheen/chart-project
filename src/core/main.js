// Main application entry point with provider-based architecture
import { getActiveProvider } from '../providers/index.js';
import { 
    config,
    validateConfig,
    getCurrentProvider,
    getCurrentProviderConfig
} from './config.js';

console.log('🔧 Configuration loaded:');
console.log('Current Provider:', getCurrentProvider());
console.log('Provider Config:', getCurrentProviderConfig());
console.log('TRADINGVIEW_DEFAULT_SYMBOL:', config.TRADINGVIEW_DEFAULT_SYMBOL);
console.log('TRADINGVIEW_DEFAULT_INTERVAL:', config.TRADINGVIEW_DEFAULT_INTERVAL);
console.log('DEBUG_MODE:', config.DEBUG_MODE);

// Validate configuration immediately
validateConfig();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM Content Loaded');
    console.log('TradingView available:', typeof TradingView !== 'undefined');
    
    // Wait a bit more for TradingView library to be fully loaded
    setTimeout(async () => {
        console.log('⏰ Timeout reached, checking TradingView library...');
        console.log('TradingView available:', typeof TradingView !== 'undefined');
        
        if (typeof TradingView === 'undefined') {
            console.error('❌ TradingView library not loaded');
            console.error('Available globals:', Object.keys(window).filter(k => k.includes('Trading') || k.includes('tv')));
            return;
        }
        
        console.log('✅ TradingView library found, creating widget...');
        console.log('🔧 Current config:', config);
        
        try {
            // Get the configured provider
            const provider = await getActiveProvider();
            console.log('🔌 Using provider:', provider.name);
            console.log('🔌 Provider datafeed:', provider.datafeed);
            
            // Get user's timezone for chart display
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log('🌍 User timezone for chart:', userTimezone);
            
            // Create the TradingView widget with provider-specific datafeed
            window.tvWidget = new TradingView.widget({
                symbol: config.TRADINGVIEW_DEFAULT_SYMBOL,       // Default symbol pair with exchange
                interval: config.TRADINGVIEW_DEFAULT_INTERVAL,   // Default interval
                fullscreen: true,                        // Displays the chart in the fullscreen mode
                container: 'tv_chart_container',         // Reference to an attribute of a DOM element
                datafeed: provider.datafeed,             // Provider-specific datafeed
                library_path: './charting_library_cloned_data/charting_library/', // Fixed path
                locale: 'en',
                timezone: userTimezone,                  // Use user's local timezone
                debug: config.DEBUG_MODE === 'true',
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