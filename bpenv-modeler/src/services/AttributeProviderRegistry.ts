import {
    IAttributeProvider,
    AttributeProviderConfig,
    ProviderMetadata,
    AttributeSchema,
} from './types';

/**
 * Registry for managing multiple attribute providers
 * Implements Singleton pattern to ensure single source of truth
 */
export class AttributeProviderRegistry {
    private static instance: AttributeProviderRegistry;
    private providers: Map<string, IAttributeProvider> = new Map();
    private config: AttributeProviderConfig;

    private constructor(config: AttributeProviderConfig = {}) {
        this.config = {
            timeout: 30000, // 30 seconds default
            enableCache: true,
            cacheTTL: 300000, // 5 minutes default
            ...config,
        };
    }

    /**
     * Get the singleton instance of the registry
     */
    public static getInstance(config?: AttributeProviderConfig): AttributeProviderRegistry {
        if (!AttributeProviderRegistry.instance) {
            AttributeProviderRegistry.instance = new AttributeProviderRegistry(config);
        }
        return AttributeProviderRegistry.instance;
    }

    /**
     * Register a new attribute provider
     * @param provider The provider to register
     * @throws Error if a provider with the same ID is already registered
     */
    public async registerProvider(provider: IAttributeProvider): Promise<void> {
        const providerId = provider.metadata.id;

        if (this.providers.has(providerId)) {
            throw new Error(
                `Provider with ID '${providerId}' is already registered. ` +
                `Use unregisterProvider() first if you want to replace it.`
            );
        }

        // Initialize provider if it has an initialize method
        if (provider.initialize && this.config.providers?.[providerId]) {
            try {
                await provider.initialize(this.config.providers[providerId]);
            } catch (error) {
                console.error(`Failed to initialize provider '${providerId}':`, error);
                throw new Error(`Provider initialization failed: ${error}`);
            }
        }

        this.providers.set(providerId, provider);
        console.log(`Provider '${providerId}' registered successfully`);
    }

    /**
     * Unregister a provider
     * @param providerId The ID of the provider to unregister
     */
    public async unregisterProvider(providerId: string): Promise<void> {
        const provider = this.providers.get(providerId);

        if (!provider) {
            console.warn(`Provider '${providerId}' not found in registry`);
            return;
        }

        // Cleanup provider if it has a destroy method
        if (provider.destroy) {
            try {
                await provider.destroy();
            } catch (error) {
                console.error(`Error destroying provider '${providerId}':`, error);
            }
        }

        this.providers.delete(providerId);
        console.log(`Provider '${providerId}' unregistered`);
    }

    /**
     * Get a specific provider by ID
     * @param providerId The ID of the provider to retrieve
     * @returns The provider, or undefined if not found
     */
    public getProvider(providerId: string): IAttributeProvider | undefined {
        return this.providers.get(providerId);
    }

    /**
     * Get all registered providers
     * @returns Array of all registered providers
     */
    public getAllProviders(): IAttributeProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * Get metadata for all registered providers
     * @returns Array of provider metadata
     */
    public getAvailableProviders(): ProviderMetadata[] {
        return Array.from(this.providers.values()).map(provider => provider.metadata);
    }

    /**
     * Get the combined schema from all registered providers
     * @returns Combined attribute schema
     */
    public getCombinedSchema(): AttributeSchema {
        const combined: AttributeSchema = {};

        for (const provider of this.providers.values()) {
            Object.assign(combined, provider.schema);
        }

        return combined;
    }

    /**
     * Get the schema for a specific provider
     * @param providerId The ID of the provider
     * @returns The provider's schema, or undefined if provider not found
     */
    public getProviderSchema(providerId: string): AttributeSchema | undefined {
        const provider = this.providers.get(providerId);
        return provider?.schema;
    }

    /**
     * Check if a provider is registered
     * @param providerId The ID to check
     * @returns true if the provider is registered
     */
    public hasProvider(providerId: string): boolean {
        return this.providers.has(providerId);
    }

    /**
     * Update global configuration
     * @param config New configuration (merged with existing)
     */
    public updateConfig(config: Partial<AttributeProviderConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     * @returns Current configuration
     */
    public getConfig(): AttributeProviderConfig {
        return { ...this.config };
    }

    /**
     * Clear all registered providers
     */
    public async clearAll(): Promise<void> {
        const providerIds = Array.from(this.providers.keys());

        for (const providerId of providerIds) {
            await this.unregisterProvider(providerId);
        }

        console.log('All providers cleared from registry');
    }

    /**
     * Reset the singleton instance (mainly for testing)
     */
    public static resetInstance(): void {
        if (AttributeProviderRegistry.instance) {
            AttributeProviderRegistry.instance.clearAll();
        }
        AttributeProviderRegistry.instance = null as any;
    }
}

// Export a convenience function to get the registry instance
export const getProviderRegistry = (config?: AttributeProviderConfig) =>
    AttributeProviderRegistry.getInstance(config);