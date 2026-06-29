# Attribute Provider System

A flexible, extensible system for fetching data from multiple APIs and populating `PhysicalPlace` attributes dynamically.

> **🎯 Quick Start for Users:** The system is already integrated! Just click the **🌐** button next to any physical place in the sidebar to fetch attributes from APIs.
>
> This README is for developers who want to understand the architecture or add new providers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  React Components                        │
│          (use hooks to fetch attributes)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           AttributeProviderRegistry                      │
│  - Singleton registry for all providers                  │
│  - registerProvider() / getProvider()                   │
│  - getAvailableProviders()                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         IAttributeProvider Interface                     │
│  - fetchAttributes(place, options)                      │
│  - canHandle(place)                                     │
│  - metadata / schema                                    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│Weather       │ │Geocoding │ │Custom    │
│Provider      │ │Provider  │ │Provider  │
└──────────────┘ └──────────┘ └──────────┘
```

## Quick Start

### 1. Initialize Providers (in your app entry point)

```typescript
import { initializeProviders } from './services/initializeProviders';

// Call once at app startup
initializeProviders().then(() => {
    console.log('Providers ready');
});
```

### 2. Use in React Components

```typescript
import { useAttributeProviders } from '../hooks/useAttributeProviders';

function MyComponent({ place }: { place: PhysicalPlace }) {
    const {
        providers,
        loading,
        error,
        fetchAttributesForPlace,
        fetchAllAttributesForPlace,
        getCapableProviders
    } = useAttributeProviders();

    const handleFetchWeather = async () => {
        const result = await fetchAttributesForPlace(place, 'weather');
        if (result.success) {
            console.log('Weather data:', result.attributes);
            // Update your place with the new attributes
        }
    };

    const handleFetchAll = async () => {
        const attributes = await fetchAllAttributesForPlace(place);
        console.log('All attributes:', attributes);
        // Update your place with all attributes
    };

    const capableProviders = getCapableProviders(place);

    return (
        <div>
            <h3>Available Providers</h3>
            {providers.map(p => (
                <div key={p.id}>
                    {p.name} - {p.description}
                </div>
            ))}

            <button onClick={handleFetchWeather} disabled={loading}>
                Fetch Weather
            </button>

            <button onClick={handleFetchAll} disabled={loading}>
                Fetch All Attributes
            </button>

            {error && <p>Error: {error}</p>}
        </div>
    );
}
```

### 3. Use Directly with Registry

```typescript
import { getProviderRegistry } from './services/AttributeProviderRegistry';

const registry = getProviderRegistry();
const weatherProvider = registry.getProvider('weather');

if (weatherProvider && weatherProvider.canHandle(place)) {
    const result = await weatherProvider.fetchAttributes(place);
    if (result.success) {
        // Merge attributes into place
        place.attributes = {
            ...place.attributes,
            ...result.attributes
        };
    }
}
```

## Built-in Providers

### Weather Provider

**ID:** `weather`
**Description:** Fetches weather forecast from NOAA API (US locations only)
**Attributes:**
- `weather.temperature` (number)
- `weather.temperatureUnit` (string)
- `weather.shortForecast` (string)
- `weather.detailedForecast` (string)
- `weather.windSpeed` (string)
- `weather.windDirection` (string)
- `weather.probabilityOfPrecipitation` (number)
- `weather.icon` (string)
- `weather.isDaytime` (boolean)
- `weather.updateTime` (string)
- `weather.elevation` (number)

**Limitations:** Only works for coordinates within the United States

### Geocoding Provider

**ID:** `geocoding`
**Description:** Reverse geocoding using OpenStreetMap Nominatim
**Attributes:**
- `location.address` (string)
- `location.road` (string)
- `location.city` (string)
- `location.state` (string)
- `location.country` (string)
- `location.postcode` (string)
- `location.countryCode` (string)
- `location.type` (string)

**Limitations:** Rate-limited by Nominatim API

## Creating a Custom Provider

### Step 1: Implement IAttributeProvider

```typescript
import { PhysicalPlace } from '../../envTypes';
import {
    IAttributeProvider,
    ProviderMetadata,
    AttributeSchema,
    FetchAttributesOptions,
    AttributeFetchResult,
} from '../types';
import { HttpClient } from '../utils/httpClient';

export class CustomAPIProvider implements IAttributeProvider {
    public readonly metadata: ProviderMetadata = {
        id: 'custom-api',
        name: 'Custom API Provider',
        description: 'Your custom API integration',
        version: '1.0.0',
    };

    public readonly schema: AttributeSchema = {
        'custom.field1': {
            type: 'string',
            description: 'Description of field 1',
        },
        'custom.field2': {
            type: 'number',
            description: 'Description of field 2',
        },
    };

    private httpClient: HttpClient;

    constructor() {
        this.httpClient = new HttpClient({
            baseURL: 'https://api.example.com',
            timeout: 10000,
        });
    }

    public async initialize(config: Record<string, any>): Promise<void> {
        // Optional: Initialize with configuration
        console.log('Custom provider initialized', config);
    }

    public canHandle(place: PhysicalPlace): boolean {
        // Validate if this provider can handle the place
        // Example: check if coordinates are valid
        return place.coordinates && place.coordinates.length > 0;
    }

    public async fetchAttributes(
        place: PhysicalPlace,
        _options?: FetchAttributesOptions
    ): Promise<AttributeFetchResult> {
        try {
            if (!this.canHandle(place)) {
                return {
                    success: false,
                    attributes: {},
                    error: 'Cannot handle this place',
                };
            }

            const [lon, lat] = place.coordinates[0];

            // Make your API call
            const data = await this.httpClient.get('/your-endpoint', {
                queryParams: { lat, lon },
            });

            // Map API response to attributes
            const attributes = {
                'custom.field1': data.someField,
                'custom.field2': data.anotherField,
            };

            return {
                success: true,
                attributes,
                timestamp: Date.now(),
                providerId: this.metadata.id,
            };
        } catch (error) {
            console.error('Custom provider error:', error);
            return {
                success: false,
                attributes: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    public async destroy(): Promise<void> {
        console.log('Custom provider destroyed');
    }
}
```

### Step 2: Register Your Provider

Add to `initializeProviders.ts`:

```typescript
import { CustomAPIProvider } from './providers/CustomAPIProvider';

export async function initializeProviders() {
    const registry = getProviderRegistry({
        // ... existing config
        providers: {
            'custom-api': {
                // Your custom config
                apiKey: 'your-api-key',
            },
        },
    });

    // ... existing providers
    await registry.registerProvider(new CustomAPIProvider());
}
```

## API Reference

### IAttributeProvider Interface

```typescript
interface IAttributeProvider {
    readonly metadata: ProviderMetadata;
    readonly schema: AttributeSchema;

    fetchAttributes(
        place: PhysicalPlace,
        options?: FetchAttributesOptions
    ): Promise<AttributeFetchResult>;

    canHandle(place: PhysicalPlace): boolean;

    initialize?(config: Record<string, any>): Promise<void>;
    destroy?(): Promise<void>;
}
```

### AttributeProviderRegistry Methods

- `registerProvider(provider)` - Register a new provider
- `unregisterProvider(providerId)` - Remove a provider
- `getProvider(providerId)` - Get a specific provider
- `getAllProviders()` - Get all registered providers
- `getAvailableProviders()` - Get metadata for all providers
- `getCombinedSchema()` - Get combined schema from all providers
- `getProviderSchema(providerId)` - Get schema for specific provider
- `hasProvider(providerId)` - Check if provider exists
- `updateConfig(config)` - Update global configuration
- `clearAll()` - Remove all providers

### useAttributeProviders Hook

Returns:
```typescript
{
    providers: ProviderMetadata[];
    loading: boolean;
    error: string | null;
    fetchAttributesForPlace: (place, providerId) => Promise<AttributeFetchResult>;
    fetchAllAttributesForPlace: (place) => Promise<Record<string, any>>;
    getCapableProviders: (place) => ProviderMetadata[];
    getProviderSchema: (providerId) => AttributeSchema | undefined;
    getCombinedSchema: () => AttributeSchema;
}
```

## Best Practices

1. **Namespace Your Attributes**: Use dot notation for attribute keys (e.g., `weather.temperature`, `location.city`)

2. **Handle Errors Gracefully**: Always return an `AttributeFetchResult` with `success: false` and an error message

3. **Validate Coordinates**: Use `canHandle()` to check if the provider can process the place

4. **Use TypeScript**: Define interfaces for API responses to maintain type safety

5. **Configure Timeouts**: Set appropriate timeouts for API calls (default is 30 seconds)

6. **Rate Limiting**: Be mindful of API rate limits, especially for free APIs

7. **Cache When Possible**: The registry supports caching (enabled by default with 5-minute TTL)

## Troubleshooting

### Provider Not Found
```typescript
const provider = registry.getProvider('my-provider');
if (!provider) {
    console.error('Provider not registered. Did you call initializeProviders()?');
}
```

### TypeScript Errors
Ensure all types are imported from the correct paths:
```typescript
import { PhysicalPlace } from '../envTypes';
import { IAttributeProvider, ... } from './services/types';
```

### API Timeout
Increase timeout in provider configuration:
```typescript
new HttpClient({
    timeout: 60000, // 60 seconds
});
```

## Examples

See the built-in providers for implementation examples:
- [WeatherAttributeProvider.ts](providers/WeatherAttributeProvider.ts)
- [GeocodingAttributeProvider.ts](providers/GeocodingAttributeProvider.ts)