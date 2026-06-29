import { PhysicalPlace } from '../../envTypes';
import {
    IAttributeProvider,
    ProviderMetadata,
    AttributeSchema,
    FetchAttributesOptions,
    AttributeFetchResult,
} from '../types';
import { HttpClient } from '../utils/httpClient';
import { flattenObject, prefixKeys } from '../utils/attributeHelpers';

export class GeocodingAttributeProvider implements IAttributeProvider {
    public readonly metadata: ProviderMetadata = {
        id: 'geocoding',
        name: 'Geocoding Provider',
        description: 'Provides reverse geocoding data (address information from coordinates)',
        version: '1.0.0',
    };

    public readonly schema: AttributeSchema = {
        'location.*': {
            type: 'object',
            description: 'Dynamic location attributes from Nominatim (all fields from response)',
        },
    };

    private httpClient: HttpClient;

    constructor() {
        this.httpClient = new HttpClient({
            baseURL: 'https://nominatim.openstreetmap.org',
            timeout: 10000,
        });
    }

    public canHandle(place: PhysicalPlace): boolean {
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
                    error: 'No valid coordinates found',
                };
            }

            const [lon, lat] = place.coordinates[0];

            const data = await this.httpClient.get<any>('/reverse', {
                queryParams: {
                    lat: lat,
                    lon: lon,
                    format: 'json',
                },
                headers: {
                    'User-Agent': 'bpenv-modeler',
                },
            });

            // Flatten the entire response dynamically
            const flattenedData = flattenObject(data);

            // Prefix all keys with 'location.'
            const attributes = prefixKeys(flattenedData, 'location');

            return {
                success: true,
                attributes,
                timestamp: Date.now(),
                providerId: this.metadata.id,
            };
        } catch (error) {
            console.error('Geocoding provider error:', error);
            return {
                success: false,
                attributes: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    public async destroy(): Promise<void> {
        console.log('Geocoding provider destroyed');
    }
}