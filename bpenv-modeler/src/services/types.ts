import { PhysicalPlace } from '../envTypes';

/**
 * Attribute schema definition - describes what attributes a provider can populate
 */
export interface AttributeSchema {
    [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
        description: string;
        required?: boolean;
    };
}

/**
 * Metadata about an attribute provider
 */
export interface ProviderMetadata {
    id: string;
    name: string;
    description: string;
    version: string;
}

/**
 * Options for fetching attributes
 */
export interface FetchAttributesOptions {
    /** Override default configuration */
    config?: Record<string, any>;
    /** Force refresh, bypass cache */
    forceRefresh?: boolean;
    /** Additional parameters specific to the provider */
    params?: Record<string, any>;
}

/**
 * Result of fetching attributes from a provider
 */
export interface AttributeFetchResult {
    success: boolean;
    attributes: Record<string, any>;
    error?: string;
    /** Timestamp of when data was fetched */
    timestamp?: number;
    /** Provider that generated this data */
    providerId?: string;
}

/**
 * Core interface that all attribute providers must implement
 */
export interface IAttributeProvider {
    /**
     * Metadata about this provider
     */
    readonly metadata: ProviderMetadata;

    /**
     * Schema defining what attributes this provider can populate
     */
    readonly schema: AttributeSchema;

    /**
     * Fetch and return attributes for a given physical place
     * @param place The physical place to fetch attributes for
     * @param options Optional configuration for the fetch operation
     * @returns Promise resolving to the fetched attributes
     */
    fetchAttributes(
        place: PhysicalPlace,
        options?: FetchAttributesOptions
    ): Promise<AttributeFetchResult>;

    /**
     * Validate if this provider can handle the given place
     * (e.g., check if coordinates are within supported region)
     * @param place The physical place to validate
     * @returns true if this provider can handle the place
     */
    canHandle(place: PhysicalPlace): boolean;

    /**
     * Optional: Initialize the provider with configuration
     * @param config Provider-specific configuration
     */
    initialize?(config: Record<string, any>): Promise<void>;

    /**
     * Optional: Cleanup resources when provider is no longer needed
     */
    destroy?(): Promise<void>;
}

/**
 * Configuration for the entire attribute provider system
 */
export interface AttributeProviderConfig {
    /** Global timeout for all API requests (ms) */
    timeout?: number;
    /** Enable caching of responses */
    enableCache?: boolean;
    /** Cache TTL in milliseconds */
    cacheTTL?: number;
    /** Provider-specific configurations */
    providers?: {
        [providerId: string]: Record<string, any>;
    };
}