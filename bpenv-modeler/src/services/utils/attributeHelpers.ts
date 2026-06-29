/**
 * Utility functions for working with dynamic attributes
 */

/**
 * Flatten a nested object into dot-notation keys
 * Example: { weather: { temp: 20, wind: { speed: 10 } } }
 * Becomes: { 'weather.temp': 20, 'weather.wind.speed': 10 }
 */
export function flattenObject(
    obj: any,
    prefix: string = '',
    result: Record<string, any> = {}
): Record<string, any> {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively flatten nested objects
                flattenObject(value, newKey, result);
            } else {
                // Store primitive values and arrays as-is
                result[newKey] = value;
            }
        }
    }

    return result;
}

/**
 * Get a nested value from an object using dot notation
 * Example: getNestedValue(obj, 'weather.wind.speed')
 */
export function getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[key];
    }

    return current;
}

/**
 * Set a nested value in an object using dot notation
 * Example: setNestedValue(obj, 'weather.wind.speed', 10)
 */
export function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();

    if (!lastKey) return;

    let current = obj;
    for (const key of keys) {
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
}

/**
 * Prefix all keys in an object with a namespace
 * Example: prefixKeys({ temp: 20, wind: 10 }, 'weather')
 * Returns: { 'weather.temp': 20, 'weather.wind': 10 }
 */
export function prefixKeys(obj: Record<string, any>, prefix: string): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[`${prefix}.${key}`] = obj[key];
        }
    }

    return result;
}

/**
 * Extract attributes by prefix
 * Example: extractByPrefix({ 'weather.temp': 20, 'location.city': 'NY' }, 'weather')
 * Returns: { 'weather.temp': 20 }
 */
export function extractByPrefix(
    attributes: Record<string, any>,
    prefix: string
): Record<string, any> {
    const result: Record<string, any> = {};
    const prefixWithDot = `${prefix}.`;

    for (const key in attributes) {
        if (key.startsWith(prefixWithDot) || key === prefix) {
            result[key] = attributes[key];
        }
    }

    return result;
}

/**
 * Remove prefix from all keys
 * Example: removePrefix({ 'weather.temp': 20, 'weather.wind': 10 }, 'weather')
 * Returns: { temp: 20, wind: 10 }
 */
export function removePrefix(
    attributes: Record<string, any>,
    prefix: string
): Record<string, any> {
    const result: Record<string, any> = {};
    const prefixWithDot = `${prefix}.`;

    for (const key in attributes) {
        if (key.startsWith(prefixWithDot)) {
            const newKey = key.substring(prefixWithDot.length);
            result[newKey] = attributes[key];
        } else if (key === prefix) {
            result[key] = attributes[key];
        }
    }

    return result;
}