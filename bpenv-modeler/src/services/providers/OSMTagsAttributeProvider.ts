import { PhysicalPlace } from '../../envTypes';
import {
    IAttributeProvider,
    ProviderMetadata,
    AttributeSchema,
    FetchAttributesOptions,
    AttributeFetchResult,
} from '../types';
import { HttpClient } from '../utils/httpClient';
import { prefixKeys } from '../utils/attributeHelpers';

/**
 * OpenStreetMap Tags Provider
 * Fetches OSM tags/attributes for a specific location using the Overpass API
 *
 * This provider queries nearby OSM elements and extracts their tags dynamically
 */
export class OSMTagsAttributeProvider implements IAttributeProvider {
    public readonly metadata: ProviderMetadata = {
        id: 'osm-tags',
        name: 'OpenStreetMap Tags Provider',
        description: 'Fetches OSM tags and attributes for locations using Overpass API',
        version: '1.0.0',
    };

    public readonly schema: AttributeSchema = {
        'osm.*': {
            type: 'object',
            description: 'Dynamic OSM tags from OpenStreetMap (all tags from nearest elements)',
        },
    };

    private httpClient: HttpClient;
    private searchRadius: number = 50; // meters

    constructor() {
        this.httpClient = new HttpClient({
            baseURL: 'https://overpass-api.de/api',
            timeout: 15000,
        });
    }

    public async initialize(config: Record<string, any>): Promise<void> {
        if (config.searchRadius) {
            this.searchRadius = config.searchRadius;
        }
        console.log('OSM Tags provider initialized with search radius:', this.searchRadius);
    }

    public canHandle(place: PhysicalPlace): boolean {
        return place.coordinates && place.coordinates.length > 0;
    }

    public async fetchAttributes(
        place: PhysicalPlace,
        options?: FetchAttributesOptions
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
            const radius = options?.params?.radius || this.searchRadius;

            // Overpass QL query to find nearest elements within radius
            // This searches for nodes, ways, and relations with any tags
            const overpassQuery = `
                [out:json][timeout:10];
                (
                    node(around:${radius},${lat},${lon});
                    way(around:${radius},${lat},${lon});
                    relation(around:${radius},${lat},${lon});
                );
                out tags center;
            `;

            const response = await this.httpClient.post<any>('/interpreter', overpassQuery, {
                headers: {
                    'Content-Type': 'text/plain',
                },
            });

            if (!response.elements || response.elements.length === 0) {
                return {
                    success: false,
                    attributes: {},
                    error: 'No OSM elements found near this location',
                };
            }

            // Find the closest element
            const closestElement = this.findClosestElement(response.elements, lat, lon);

            if (!closestElement || !closestElement.tags) {
                return {
                    success: false,
                    attributes: {},
                    error: 'Closest element has no tags',
                };
            }

            // Extract all tags dynamically
            const tags = closestElement.tags;

            // Add metadata about the element
            const enrichedTags = {
                ...tags,
                _element_id: closestElement.id,
                _element_type: closestElement.type,
                _distance: this.calculateDistance(
                    lat,
                    lon,
                    closestElement.lat || closestElement.center?.lat || lat,
                    closestElement.lon || closestElement.center?.lon || lon
                ),
            };

            // Prefix all keys with 'osm.'
            const attributes = prefixKeys(enrichedTags, 'osm');

            return {
                success: true,
                attributes,
                timestamp: Date.now(),
                providerId: this.metadata.id,
            };
        } catch (error) {
            console.error('OSM Tags provider error:', error);
            return {
                success: false,
                attributes: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Find the closest element to the given coordinates
     */
    private findClosestElement(elements: any[], targetLat: number, targetLon: number): any {
        let closestElement = null;
        let minDistance = Infinity;

        for (const element of elements) {
            // Skip elements without tags
            if (!element.tags || Object.keys(element.tags).length === 0) {
                continue;
            }

            const elementLat = element.lat || element.center?.lat;
            const elementLon = element.lon || element.center?.lon;

            if (!elementLat || !elementLon) {
                continue;
            }

            const distance = this.calculateDistance(targetLat, targetLon, elementLat, elementLon);

            if (distance < minDistance) {
                minDistance = distance;
                closestElement = element;
            }
        }

        return closestElement;
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     * Returns distance in meters
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    public async destroy(): Promise<void> {
        console.log('OSM Tags provider destroyed');
    }
}