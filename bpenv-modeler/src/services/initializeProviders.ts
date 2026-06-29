import { getProviderRegistry } from './AttributeProviderRegistry';
import { WeatherAttributeProvider } from './providers/WeatherAttributeProvider';
import { GeocodingAttributeProvider } from './providers/GeocodingAttributeProvider';
import { OSMTagsAttributeProvider } from './providers/OSMTagsAttributeProvider';

/**
 * Initialize all attribute providers
 * Call this function once at application startup
 */
export async function initializeProviders() {
    const registry = getProviderRegistry({
        timeout: 30000,
        enableCache: true,
        cacheTTL: 300000, // 5 minutes
        providers: {
            'osm-tags': {
                searchRadius: 50, // Search within 50 meters by default
            },
        },
    });

    try {
        // Register all providers
        await registry.registerProvider(new WeatherAttributeProvider());
        console.log('Weather provider registered');

        await registry.registerProvider(new GeocodingAttributeProvider());
        console.log('Geocoding provider registered');

        await registry.registerProvider(new OSMTagsAttributeProvider());
        console.log('OSM Tags provider registered');

        console.log('All attribute providers initialized successfully');
        console.log('Available providers:', registry.getAvailableProviders());
    } catch (error) {
        console.error('Error initializing providers:', error);
        throw error;
    }
}