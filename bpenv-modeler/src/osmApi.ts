import { PhysicalPlace } from './envTypes';

/**
 * OSM node with coordinates
 */
type OSMNode = {
    lat: number;
    lon: number;
};

/**
 * OSM feature from Overpass API
 */
type OSMFeature = {
    id: number;
    tags: Record<string, string>;
    geometry: OSMNode[];
};

/**
 * Result from Overpass API query
 */
type QueryResult = {
    success: boolean;
    data?: OSMFeature[];
    error?: string;
};

/**
 * Queries Overpass API for any features near a point
 * @param lat - Latitude of the center point
 * @param lon - Longitude of the center point
 * @param radiusMeters - Search radius in meters (default: 50)
 * @returns Query result with features or error
 */
export async function queryNearbyFeatures(
    lat: number,
    lon: number,
    radiusMeters: number = 30
): Promise<QueryResult> {
    const query = `
[out:json][timeout:10];
(
  way["building"](around:${radiusMeters},${lat},${lon});
  way["amenity"](around:${radiusMeters},${lat},${lon});
  way["shop"](around:${radiusMeters},${lat},${lon});
  way["tourism"](around:${radiusMeters},${lat},${lon});
  way["leisure"](around:${radiusMeters},${lat},${lon});
  way["landuse"](around:${radiusMeters},${lat},${lon});
  way["natural"](around:${radiusMeters},${lat},${lon});
  way["highway"]["name"](around:${radiusMeters},${lat},${lon});
  node["amenity"](around:${radiusMeters},${lat},${lon});
  node["shop"](around:${radiusMeters},${lat},${lon});
  node["tourism"](around:${radiusMeters},${lat},${lon});
  node["historic"](around:${radiusMeters},${lat},${lon});
);
out geom 100;
`;

    try {
        // Try the faster kumi.systems instance first, fallback to overpass-api.de
        const endpoints = [
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass-api.de/api/interpreter'
        ];

        let response;
        let lastError;

        for (const endpoint of endpoints) {
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    body: 'data=' + encodeURIComponent(query),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (response.ok) {
                    break; // Success, use this response
                }
                lastError = response;
            } catch (err) {
                lastError = err;
                continue; // Try next endpoint
            }
        }

        if (!response || !response.ok) {
            const status = (response as Response)?.status;
            if (status === 429) {
                return {
                    success: false,
                    error: 'Too many requests. Please wait a moment before selecting another feature.'
                };
            }
            if (status === 504 || status === 503) {
                return {
                    success: false,
                    error: 'OpenStreetMap server is busy. Please try again in a moment.'
                };
            }
            return {
                success: false,
                error: 'Unable to connect to OpenStreetMap. Please try again.'
            };
        }

        const data = await response.json();

        if (!data.elements || !Array.isArray(data.elements)) {
            return {
                success: false,
                error: 'Invalid data received from OpenStreetMap.'
            };
        }

        // Filter out features without geometry and handle both ways and nodes
        const features = data.elements
            .filter((element: any) => {
                // Must have tags to be meaningful
                if (!element.tags || Object.keys(element.tags).length === 0) {
                    return false;
                }

                // For nodes (points), create a small square polygon
                if (element.type === 'node' && element.lat && element.lon) {
                    return true;
                }
                // For ways, ensure they have geometry
                if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
                    return true;
                }
                return false;
            })
            .map((element: any) => {
                // Convert nodes (points) to small square polygons (5 meter radius)
                if (element.type === 'node') {
                    const offset = 0.00005; // Approximately 5 meters
                    const lat = element.lat;
                    const lon = element.lon;
                    return {
                        ...element,
                        geometry: [
                            { lat: lat - offset, lon: lon - offset },
                            { lat: lat - offset, lon: lon + offset },
                            { lat: lat + offset, lon: lon + offset },
                            { lat: lat + offset, lon: lon - offset },
                        ]
                    };
                }
                return element;
            });

        return {
            success: true,
            data: features
        };

    } catch (error) {
        console.error('Overpass API error:', error);
        return {
            success: false,
            error: 'Unable to connect to OpenStreetMap. Please check your internet connection.'
        };
    }
}

/**
 * Calculates the shortest distance from a point to a line segment
 * @param point - The point [lon, lat]
 * @param segmentStart - Start of line segment [lon, lat]
 * @param segmentEnd - End of line segment [lon, lat]
 * @returns Distance in coordinate units
 */
function distanceToSegment(
    point: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number]
): number {
    const [px, py] = point;
    const [x1, y1] = segmentStart;
    const [x2, y2] = segmentEnd;

    // Calculate segment length squared
    const segmentLengthSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;

    if (segmentLengthSq === 0) {
        // Segment is a point
        return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    // Calculate projection parameter
    const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / segmentLengthSq));

    // Calculate closest point on segment
    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);

    // Return distance to closest point
    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

/**
 * Calculates the shortest distance from a point to a polygon boundary
 * @param point - The point [lon, lat]
 * @param polygon - Array of coordinates [[lon, lat], ...]
 * @returns Minimum distance to polygon boundary
 */
export function distanceToPolygonBoundary(
    point: [number, number],
    polygon: [number, number][]
): number {
    if (polygon.length < 2) return Infinity;

    let minDistance = Infinity;

    // Check distance to each edge
    for (let i = 0; i < polygon.length - 1; i++) {
        const distance = distanceToSegment(point, polygon[i], polygon[i + 1]);
        minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
}

/**
 * Finds the closest feature to a click point by boundary distance
 * @param clickPoint - The click coordinates [lon, lat]
 * @param features - Array of OSM features
 * @returns The closest feature or null if none found
 */
export function findClosestFeature(
    clickPoint: [number, number],
    features: OSMFeature[]
): OSMFeature | null {
    if (features.length === 0) return null;

    let closestFeature: OSMFeature | null = null;
    let minDistance = Infinity;

    for (const feature of features) {
        // Convert OSM geometry to coordinate array
        const polygon = feature.geometry.map(node => [node.lon, node.lat] as [number, number]);

        const distance = distanceToPolygonBoundary(clickPoint, polygon);

        if (distance < minDistance) {
            minDistance = distance;
            closestFeature = feature;
        }
    }

    return closestFeature;
}

/**
 * Converts an OSM feature to PhysicalPlace format
 * @param feature - The OSM feature
 * @returns PhysicalPlace object
 */
export function osmFeatureToPhysicalPlace(feature: OSMFeature): PhysicalPlace {
    // Convert OSM geometry to coordinates array [lon, lat]
    const coordinates = feature.geometry.map(node => [node.lon, node.lat] as [number, number]);

    // Close polygon if not already closed
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];

    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates.push([firstPoint[0], firstPoint[1]]);
    }

    // Generate ID from OSM feature ID
    const id = `OSM_${feature.id}`;

    // Generate name from OSM tags with intelligent prioritization
    let name = id; // Default fallback

    const tags = feature.tags || {}; // Safety check for missing tags

    // Priority order for naming:
    // 1. name tag (most specific)
    if (tags.name) {
        name = tags.name;
    }
    // 2. address (for buildings)
    else if (tags['addr:street'] && tags['addr:housenumber']) {
        name = `${tags['addr:street']} ${tags['addr:housenumber']}`;
    } else if (tags['addr:street']) {
        name = tags['addr:street'];
    }
    // 3. amenity/shop/tourism (for POIs)
    else if (tags.amenity) {
        name = tags.amenity;
    } else if (tags.shop) {
        name = `${tags.shop} shop`;
    } else if (tags.tourism) {
        name = tags.tourism;
    }
    // 4. highway (for roads)
    else if (tags.highway) {
        name = tags.highway;
    }
    // 5. building type
    else if (tags.building && tags.building !== 'yes') {
        name = tags.building;
    }
    // 6. any other descriptive tag
    else if (tags.landuse) {
        name = tags.landuse;
    } else if (tags.natural) {
        name = tags.natural;
    } else if (tags.leisure) {
        name = tags.leisure;
    }

    // Store all OSM tags as attributes
    const attributes: Record<string, any> = { ...tags };

    return {
        id,
        name,
        coordinates,
        attributes
    };
}
