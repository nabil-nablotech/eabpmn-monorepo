/**
 * HTTP Client utility for making API requests
 * Provides consistent error handling, timeout, and response parsing
 */

export interface HttpClientConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
}

export interface RequestConfig extends HttpClientConfig {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    queryParams?: Record<string, string | number | boolean>;
}

export class HttpError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public url: string,
        message?: string
    ) {
        super(message || `HTTP ${status}: ${statusText}`);
        this.name = 'HttpError';
    }
}

/**
 * Simple HTTP client with timeout support
 */
export class HttpClient {
    private defaultConfig: HttpClientConfig;

    constructor(config: HttpClientConfig = {}) {
        this.defaultConfig = {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
            ...config,
        };
    }

    /**
     * Make an HTTP request
     */
    public async request<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
        const mergedConfig = this.mergeConfig(config);
        const fullURL = this.buildURL(url, mergedConfig);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), mergedConfig.timeout);

        try {
            // Determine if body should be stringified
            let requestBody: string | undefined;
            if (mergedConfig.body) {
                if (typeof mergedConfig.body === 'string') {
                    // Already a string, use as-is
                    requestBody = mergedConfig.body;
                } else {
                    // Object/array, stringify it
                    requestBody = JSON.stringify(mergedConfig.body);
                }
            }

            const response = await fetch(fullURL, {
                method: mergedConfig.method || 'GET',
                headers: mergedConfig.headers,
                body: requestBody,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new HttpError(
                    response.status,
                    response.statusText,
                    fullURL,
                    `Request failed: ${response.status} ${response.statusText}`
                );
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            }

            // Return text for non-JSON responses
            const text = await response.text();
            return text as unknown as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof HttpError) {
                throw error;
            }

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${mergedConfig.timeout}ms: ${fullURL}`);
            }

            throw new Error(`Request failed: ${error}`);
        }
    }

    /**
     * GET request
     */
    public async get<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
        return this.request<T>(url, { ...config, method: 'GET' });
    }

    /**
     * POST request
     */
    public async post<T = any>(url: string, body?: any, config: RequestConfig = {}): Promise<T> {
        return this.request<T>(url, { ...config, method: 'POST', body });
    }

    /**
     * PUT request
     */
    public async put<T = any>(url: string, body?: any, config: RequestConfig = {}): Promise<T> {
        return this.request<T>(url, { ...config, method: 'PUT', body });
    }

    /**
     * DELETE request
     */
    public async delete<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
        return this.request<T>(url, { ...config, method: 'DELETE' });
    }

    /**
     * PATCH request
     */
    public async patch<T = any>(url: string, body?: any, config: RequestConfig = {}): Promise<T> {
        return this.request<T>(url, { ...config, method: 'PATCH', body });
    }

    private mergeConfig(config: RequestConfig): Required<RequestConfig> {
        return {
            baseURL: config.baseURL || this.defaultConfig.baseURL || '',
            timeout: config.timeout || this.defaultConfig.timeout || 30000,
            headers: {
                ...this.defaultConfig.headers,
                ...config.headers,
            },
            method: config.method || 'GET',
            body: config.body,
            queryParams: config.queryParams || {},
        };
    }

    private buildURL(url: string, config: Required<RequestConfig>): string {
        let fullURL = config.baseURL ? `${config.baseURL}${url}` : url;

        // Add query parameters
        if (config.queryParams && Object.keys(config.queryParams).length > 0) {
            const params = new URLSearchParams();
            Object.entries(config.queryParams).forEach(([key, value]) => {
                params.append(key, String(value));
            });
            fullURL += `?${params.toString()}`;
        }

        return fullURL;
    }

    /**
     * Update default configuration
     */
    public updateConfig(config: Partial<HttpClientConfig>): void {
        this.defaultConfig = { ...this.defaultConfig, ...config };
    }
}

// Export a default instance for convenience
export const httpClient = new HttpClient();