// Development script to load environment variables
// This script reads from a .env file and makes the variables available to the browser

// Function to parse .env file content
function parseEnvContent(envContent) {
    const config = {};
    const lines = envContent.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }
        
        // Parse KEY=VALUE format
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            
            // Remove quotes if present
            config[key] = value.replace(/^["']|["']$/g, '');
        }
    }
    
    return config;
}

// Function to load environment variables
async function loadEnvironmentVariables() {
    try {
        // Try to fetch .env file
        const response = await fetch('.env');
        if (response.ok) {
            const envContent = await response.text();
            const config = parseEnvContent(envContent);
            
            // Make config available globally
            window.env = config;
            
            console.log('✅ Environment variables loaded successfully');
            return config;
        } else {
            console.warn('⚠️ .env file not found, using default configuration');
            return {};
        }
    } catch (error) {
        console.warn('⚠️ Could not load .env file:', error.message);
        console.warn('Using default configuration');
        return {};
    }
}

// Load environment variables when script runs
loadEnvironmentVariables();
