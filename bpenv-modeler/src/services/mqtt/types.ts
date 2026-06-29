/**
 * MQTT connection configuration
 */
export interface MqttConfig {
    brokerUrl: string;
    clientId?: string;
    username?: string;
    password?: string;
    keepalive?: number;
    reconnectPeriod?: number;
    connectTimeout?: number;
}

/**
 * MQTT connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Light sensor data from MQTT message
 */
export interface LightSensorData {
    lux: number;
    lightOn: boolean;
    timestamp: string;
}

/**
 * Raw MQTT payload for light sensor
 */
export interface LightSensorPayload {
    lux: number;
    timestamp: string;
}

/**
 * Subscription info for a place
 */
export interface PlaceSubscription {
    placeId: string;
    topic: string;
    sensorType: 'light';
}

/**
 * MQTT event callbacks
 */
export interface MqttEventCallbacks {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onMessage?: (topic: string, payload: any) => void;
}

/**
 * Light threshold for determining on/off status
 */
export const LIGHT_THRESHOLD = 300;

/**
 * Convert lux value to light on/off status
 */
export function isLightOn(lux: number): boolean {
    return lux > LIGHT_THRESHOLD;
}
