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

/**
 * Weather Provider using Open-Meteo API
 * Dynamically fetches all weather attributes without manual mapping
 */
export class WeatherAttributeProvider implements IAttributeProvider {
    public readonly metadata: ProviderMetadata = {
        id: 'weather',
        name: 'Weather Provider',
        description: 'Provides current weather data from Open-Meteo (worldwide)',
        version: '2.0.0',
    };

    public readonly schema: AttributeSchema = {
        'weather.*': {
            type: 'object',
            description: 'Dynamic weather attributes from Open-Meteo API (worldwide coverage)',
        },
    };

    private httpClient: HttpClient;

    constructor() {
        this.httpClient = new HttpClient({
            baseURL: 'https://api.open-meteo.com',
            timeout: 10000,
        });
    }

    public async initialize(_config: Record<string, any>): Promise<void> {
        console.log('Weather provider initialized (Open-Meteo)');
    }

    public canHandle(place: PhysicalPlace): boolean {
        if (!place.coordinates || place.coordinates.length === 0) {
            return false;
        }

        const [lon, lat] = place.coordinates[0];
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
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
                    error: 'Invalid coordinates',
                };
            }

            const [lon, lat] = place.coordinates[0];

            // Fetch current weather with all available parameters
            const data = await this.httpClient.get<any>('/v1/forecast', {
                queryParams: {
                    latitude: lat.toString(),
                    longitude: lon.toString(),
                    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',
                    timezone: 'auto',
                },
            });

            // Flatten entire response dynamically (like OSM provider)
            const flattenedData = flattenObject(data);

            // Prefix all keys with 'weather.'
            const attributes = prefixKeys(flattenedData, 'weather');

            return {
                success: true,
                attributes,
                timestamp: Date.now(),
                providerId: this.metadata.id,
            };
        } catch (error) {
            console.error('Weather provider error:', error);
            return {
                success: false,
                attributes: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    public async destroy(): Promise<void> {
        console.log('Weather provider destroyed');
    }
}