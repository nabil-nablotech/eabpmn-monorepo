export type PhysicalPlace = {
    id: string;
    name: string;
    coordinates: [number, number][];
    attributes: Record<string, any>;
}

export type Edge = {
    id: string;
    name: string;
    source: string;
    target: string;
    attributes: Record<string, any>;
}

export type LogicalPlace = {
    id: string;
    name: string;
    conditions: {
        attribute: string,
        operator: string,
        value: any
    }[],
    operator: string,
    attributes: Record<string, any>;
}

export type View = {
    id: string;
    name: string;
    logicalPlaces: string[];
}

// Weather API Types
export interface Weather {
    location: {
        coordinates: number[][][];
    };
    forecast: {
        units: string;
        generatedAt: string;
        updateTime: string;
        elevation: number;
        periods: WeatherPeriod[];
    };
}

export interface WeatherPeriod {
    number: number;
    name: string;
    startTime: string;
    endTime: string;
    isDaytime: boolean;
    temperature: number;
    temperatureUnit: string;
    temperatureTrend: string;
    probabilityOfPrecipitation: number;
    windSpeed: string;
    windDirection: string;
    icon: string;
    shortForecast: string;
    detailedForecast: string;
}

// Raw API Response Types
export interface WeatherApiResponse {
    type: string;
    geometry: {
        type: string;
        coordinates: number[][][];
    };
    properties: {
        units: string;
        generatedAt: string;
        updateTime: string;
        elevation: {
            unitCode: string;
            value: number;
        };
        periods: Array<{
            number: number;
            name: string;
            startTime: string;
            endTime: string;
            isDaytime: boolean;
            temperature: number;
            temperatureUnit: string;
            temperatureTrend: string;
            probabilityOfPrecipitation: {
                unitCode: string;
                value: number;
            };
            windSpeed: string;
            windDirection: string;
            icon: string;
            shortForecast: string;
            detailedForecast: string;
        }>;
    };
}