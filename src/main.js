// Datafeed implementation that you will add later
import Datafeed from './datafeed.js';
import { TRADINGVIEW_DEFAULT_SYMBOL, TRADINGVIEW_DEFAULT_INTERVAL, DEBUG_MODE } from './config.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit more for TradingView library to be fully loaded
    setTimeout(() => {
        if (typeof TradingView === 'undefined') {
            console.error('TradingView library not loaded');
            return;
        }
        
        console.log('Creating TradingView widget...');
        
        window.tvWidget = new TradingView.widget({
            symbol: TRADINGVIEW_DEFAULT_SYMBOL,       // Default symbol pair with exchange
            interval: TRADINGVIEW_DEFAULT_INTERVAL,   // Default interval
            fullscreen: true,                        // Displays the chart in the fullscreen mode
            container: 'tv_chart_container',         // Reference to an attribute of a DOM element
            datafeed: Datafeed,
            library_path: '../charting_library_cloned_data/charting_library/',
            locale: 'en',
            debug: true,
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
        
        console.log('TradingView widget created successfully');
    }, 1000);
});