// Test script to verify symbol parsing
import { parseFullSymbol } from './src/providers/mt5/helpers.js';

console.log('Testing symbol parsing...');

// Test cases
const testSymbols = [
    'EURUSD.s',
    'GBPUSD.p', 
    'USDJPY.e',
    'EURGBP.s',
    'MT5:EURUSD.s',
    'EURUSD',
    'GBPJPY'
];

testSymbols.forEach(symbol => {
    console.log(`\nTesting: ${symbol}`);
    const result = parseFullSymbol(symbol);
    console.log('Result:', result);
    
    if (result) {
        const formattedSymbol = `${result.fromSymbol}${result.toSymbol}`;
        console.log('Formatted for API:', formattedSymbol);
    }
});
