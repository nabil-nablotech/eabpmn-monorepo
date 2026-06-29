import { useState, useEffect, useCallback } from 'react';
import { getProviderRegistry } from '../services/AttributeProviderRegistry';
import { ProviderMetadata, AttributeFetchResult } from '../services/types';
import { PhysicalPlace } from '../envTypes';

/**
 * React hook for using attribute providers
 * Provides easy access to fetch attributes for places
 */
export const useAttributeProviders = () => {
    const [providers, setProviders] = useState<ProviderMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Load available providers on mount
    useEffect(() => {
        const registry = getProviderRegistry();
        setProviders(registry.getAvailableProviders());
    }, []);

    /**
     * Fetch attributes for a place using a specific provider
     */
    const fetchAttributesForPlace = useCallback(
        async (place: PhysicalPlace, providerId: string): Promise<AttributeFetchResult> => {
            setLoading(true);
            setError(null);

            try {
                const registry = getProviderRegistry();
                const provider = registry.getProvider(providerId);

                if (!provider) {
                    throw new Error(`Provider '${providerId}' not found`);
                }

                const result = await provider.fetchAttributes(place);

                if (!result.success) {
                    setError(result.error || 'Unknown error');
                }

                return result;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                return {
                    success: false,
                    attributes: {},
                    error: errorMessage,
                };
            } finally {
                setLoading(false);
            }
        },
        []
    );

    /**
     * Fetch attributes from all available providers that can handle the place
     */
    const fetchAllAttributesForPlace = useCallback(
        async (place: PhysicalPlace): Promise<Record<string, any>> => {
            setLoading(true);
            setError(null);

            try {
                const registry = getProviderRegistry();
                const allProviders = registry.getAllProviders();

                // Filter providers that can handle this place
                const capableProviders = allProviders.filter(provider =>
                    provider.canHandle(place)
                );

                if (capableProviders.length === 0) {
                    throw new Error('No providers available for this location');
                }

                // Fetch from all capable providers in parallel
                const results = await Promise.allSettled(
                    capableProviders.map(provider => provider.fetchAttributes(place))
                );

                // Combine all successful results
                const combinedAttributes: Record<string, any> = {};
                const errors: string[] = [];

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value.success) {
                        Object.assign(combinedAttributes, result.value.attributes);
                    } else if (result.status === 'fulfilled' && result.value.error) {
                        errors.push(`${capableProviders[index].metadata.name}: ${result.value.error}`);
                    } else if (result.status === 'rejected') {
                        errors.push(`${capableProviders[index].metadata.name}: ${result.reason}`);
                    }
                });

                if (errors.length > 0) {
                    console.warn('Some providers failed:', errors);
                    setError(errors.join('; '));
                }

                return combinedAttributes;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                return {};
            } finally {
                setLoading(false);
            }
        },
        []
    );

    /**
     * Check which providers can handle a given place
     */
    const getCapableProviders = useCallback((place: PhysicalPlace): ProviderMetadata[] => {
        const registry = getProviderRegistry();
        const allProviders = registry.getAllProviders();

        return allProviders
            .filter(provider => provider.canHandle(place))
            .map(provider => provider.metadata);
    }, []);

    /**
     * Get the schema for a specific provider
     */
    const getProviderSchema = useCallback((providerId: string) => {
        const registry = getProviderRegistry();
        return registry.getProviderSchema(providerId);
    }, []);

    /**
     * Get combined schema from all providers
     */
    const getCombinedSchema = useCallback(() => {
        const registry = getProviderRegistry();
        return registry.getCombinedSchema();
    }, []);

    return {
        providers,
        loading,
        error,
        fetchAttributesForPlace,
        fetchAllAttributesForPlace,
        getCapableProviders,
        getProviderSchema,
        getCombinedSchema,
    };
};