# Dynamic Attribute Provider - Usage Examples

## Overview

The attribute provider system now works **completely dynamically** - it fetches all available attributes from APIs without requiring manual field mapping. You can still access specific attributes when needed.

## Key Features

✅ **Fully Dynamic** - No manual mapping of API fields required
✅ **Automatic Flattening** - Nested objects are flattened to dot notation
✅ **Namespaced Keys** - All attributes are prefixed (e.g., `weather.*`, `osm.*`, `location.*`)
✅ **Flexible Access** - Access specific attributes or get all attributes
✅ **Easy to Extend** - Add new APIs without changing existing code

## Example 1: Fetch All Attributes from All Providers

```typescript
import { useAttributeProviders } from '../hooks/useAttributeProviders';
import { PhysicalPlace } from '../envTypes';

function MyComponent({ place }: { place: PhysicalPlace }) {
    const { fetchAllAttributesForPlace, loading } = useAttributeProviders();

    const handleEnrichPlace = async () => {
        // This fetches from ALL providers that can handle this location
        const attributes = await fetchAllAttributesForPlace(place);

        // Update your place
        place.attributes = {
            ...place.attributes,
            ...attributes
        };

        console.log('All attributes:', attributes);
        // Example output:
        // {
        //   'weather.temperature': 72,
        //   'weather.windSpeed': '10 mph',
        //   'weather.shortForecast': 'Sunny',
        //   'location.address.city': 'San Francisco',
        //   'location.address.state': 'California',
        //   'osm.name': 'Golden Gate Park',
        //   'osm.leisure': 'park',
        //   'osm.website': 'https://...',
        //   ... dozens more fields automatically
        // }
    };

    return (
        <button onClick={handleEnrichPlace} disabled={loading}>
            Fetch All Data
        </button>
    );
}
```

## Example 2: Fetch from Specific Provider

```typescript
function FetchWeatherButton({ place }: { place: PhysicalPlace }) {
    const { fetchAttributesForPlace } = useAttributeProviders();

    const handleFetchWeather = async () => {
        const result = await fetchAttributesForPlace(place, 'weather');

        if (result.success) {
            place.attributes = {
                ...place.attributes,
                ...result.attributes
            };
            console.log('Weather attributes:', result.attributes);
        } else {
            console.error('Error:', result.error);
        }
    };

    return <button onClick={handleFetchWeather}>Get Weather</button>;
}
```

## Example 3: Access Specific Attributes

```typescript
import { extractByPrefix, getNestedValue } from '../services/utils/attributeHelpers';

function DisplayWeather({ place }: { place: PhysicalPlace }) {
    // Get all weather attributes
    const weatherAttrs = extractByPrefix(place.attributes, 'weather');

    // Access specific fields (TypeScript safe with optional chaining)
    const temp = place.attributes['weather.temperature'];
    const forecast = place.attributes['weather.shortForecast'];

    // Or use helper for nested access
    const windSpeed = getNestedValue(place.attributes, 'weather.windSpeed');

    return (
        <div>
            <h3>Weather</h3>
            <p>Temperature: {temp}°F</p>
            <p>Forecast: {forecast}</p>
            <p>Wind: {windSpeed}</p>

            <h4>All Weather Data:</h4>
            <pre>{JSON.stringify(weatherAttrs, null, 2)}</pre>
        </div>
    );
}
```

## Example 4: Display All Attributes Dynamically

```typescript
import { extractByPrefix } from '../services/utils/attributeHelpers';

function AttributeExplorer({ place }: { place: PhysicalPlace }) {
    // Group attributes by provider
    const weatherAttrs = extractByPrefix(place.attributes, 'weather');
    const locationAttrs = extractByPrefix(place.attributes, 'location');
    const osmAttrs = extractByPrefix(place.attributes, 'osm');

    return (
        <div>
            <Section title="Weather" attributes={weatherAttrs} />
            <Section title="Location" attributes={locationAttrs} />
            <Section title="OpenStreetMap" attributes={osmAttrs} />
        </div>
    );
}

function Section({ title, attributes }: { title: string; attributes: Record<string, any> }) {
    return (
        <div>
            <h3>{title}</h3>
            {Object.entries(attributes).map(([key, value]) => (
                <div key={key}>
                    <strong>{key}:</strong> {JSON.stringify(value)}
                </div>
            ))}
        </div>
    );
}
```

## Example 5: OpenStreetMap Tags

```typescript
function FetchOSMTags({ place }: { place: PhysicalPlace }) {
    const { fetchAttributesForPlace } = useAttributeProviders();

    const handleFetch = async () => {
        // Fetch OSM tags for this location
        const result = await fetchAttributesForPlace(place, 'osm-tags');

        if (result.success) {
            console.log('OSM Tags:', result.attributes);
            // Example output:
            // {
            //   'osm.name': 'Golden Gate Park',
            //   'osm.leisure': 'park',
            //   'osm.tourism': 'attraction',
            //   'osm.website': 'https://goldengatepark.com',
            //   'osm.opening_hours': 'Mo-Su 06:00-22:00',
            //   'osm._element_type': 'way',
            //   'osm._element_id': 123456,
            //   'osm._distance': 15.3,
            //   ... any other OSM tags on the element
            // }
        }
    };

    return <button onClick={handleFetch}>Get OSM Data</button>;
}
```

## Example 6: Custom Search Radius for OSM

```typescript
const result = await fetchAttributesForPlace(place, 'osm-tags', {
    params: {
        radius: 100 // Search within 100 meters instead of default 50
    }
});
```

## Example 7: Filter and Search Attributes

```typescript
import { extractByPrefix } from '../services/utils/attributeHelpers';

function SearchAttributes({ place }: { place: PhysicalPlace }) {
    const [searchTerm, setSearchTerm] = useState('');

    // Search across all attributes
    const filteredAttributes = Object.entries(place.attributes)
        .filter(([key, value]) =>
            key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search attributes..."
            />
            <div>
                {filteredAttributes.map(([key, value]) => (
                    <div key={key}>
                        <strong>{key}:</strong> {JSON.stringify(value)}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

## Example 8: Create a Custom Provider

```typescript
// src/services/providers/CustomAPIProvider.ts
import { PhysicalPlace } from '../../envTypes';
import {
    IAttributeProvider,
    ProviderMetadata,
    AttributeSchema,
    AttributeFetchResult,
} from '../types';
import { HttpClient } from '../utils/httpClient';
import { flattenObject, prefixKeys } from '../utils/attributeHelpers';

export class CustomAPIProvider implements IAttributeProvider {
    public readonly metadata: ProviderMetadata = {
        id: 'my-custom-api',
        name: 'My Custom API',
        description: 'Fetches data from my custom API',
        version: '1.0.0',
    };

    public readonly schema: AttributeSchema = {
        'custom.*': {
            type: 'object',
            description: 'Dynamic attributes from Custom API',
        },
    };

    private httpClient: HttpClient;

    constructor() {
        this.httpClient = new HttpClient({
            baseURL: 'https://api.example.com',
            timeout: 10000,
        });
    }

    public canHandle(place: PhysicalPlace): boolean {
        return place.coordinates && place.coordinates.length > 0;
    }

    public async fetchAttributes(place: PhysicalPlace): Promise<AttributeFetchResult> {
        try {
            const [lon, lat] = place.coordinates[0];

            // Make your API call
            const data = await this.httpClient.get<any>('/endpoint', {
                queryParams: { lat, lon },
            });

            // Flatten and prefix automatically
            const flattened = flattenObject(data);
            const attributes = prefixKeys(flattened, 'custom');

            return {
                success: true,
                attributes,
                timestamp: Date.now(),
                providerId: this.metadata.id,
            };
        } catch (error) {
            return {
                success: false,
                attributes: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

// Register it in initializeProviders.ts
await registry.registerProvider(new CustomAPIProvider());
```

## Helper Functions

### flattenObject()
Converts nested objects to flat dot-notation keys:
```typescript
flattenObject({ a: { b: { c: 1 } } })
// Returns: { 'a.b.c': 1 }
```

### prefixKeys()
Adds a prefix to all keys:
```typescript
prefixKeys({ temp: 20, wind: 10 }, 'weather')
// Returns: { 'weather.temp': 20, 'weather.wind': 10 }
```

### extractByPrefix()
Gets all attributes with a specific prefix:
```typescript
extractByPrefix(attributes, 'weather')
// Returns all attributes starting with 'weather.'
```

### removePrefix()
Removes prefix from keys:
```typescript
removePrefix({ 'weather.temp': 20 }, 'weather')
// Returns: { temp: 20 }
```

### getNestedValue()
Access nested values safely:
```typescript
getNestedValue(obj, 'weather.wind.speed')
```

## What Attributes Will I Get?

### Weather Provider (`weather.*`)
- All fields from NOAA API first forecast period
- Examples: `temperature`, `temperatureUnit`, `windSpeed`, `shortForecast`, `detailedForecast`, `icon`, etc.
- Plus: `updateTime`, `elevation`

### Geocoding Provider (`location.*`)
- All fields from Nominatim reverse geocoding
- Examples: `display_name`, `address.city`, `address.state`, `address.country`, `type`, `class`, etc.

### OSM Tags Provider (`osm.*`)
- ALL tags from the nearest OSM element
- Common tags: `name`, `amenity`, `building`, `shop`, `tourism`, `website`, `phone`, `opening_hours`
- Plus metadata: `_element_id`, `_element_type`, `_distance`

**The beauty**: You don't need to know all possible fields in advance - they're all fetched and stored dynamically!

## Benefits

1. **Future-Proof**: When APIs add new fields, they're automatically available
2. **No Maintenance**: No need to update mappings when APIs change
3. **Flexible**: Access any field without predefined structure
4. **Type-Safe**: Still works with TypeScript
5. **Easy Extension**: Add new providers in minutes

## Integration with Zustand Store

You can extend your store to integrate with providers:

```typescript
import { getProviderRegistry } from './services/AttributeProviderRegistry';

const useEnvStore = create<EnvStore>((set, get) => ({
    // ... existing state ...

    enrichPlace: async (placeId: string, providerId: string) => {
        const place = get().physicalPlaces.find(p => p.id === placeId);
        if (!place) return;

        const registry = getProviderRegistry();
        const provider = registry.getProvider(providerId);
        if (!provider) return;

        const result = await provider.fetchAttributes(place);
        if (result.success) {
            get().updatePlace(placeId, {
                attributes: {
                    ...place.attributes,
                    ...result.attributes
                }
            });
        }
    },
}));
```
