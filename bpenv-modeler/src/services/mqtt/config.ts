import { MqttConfig } from './types';

/**
 * Default MQTT broker configuration using public Mosquitto test broker
 */
export const DEFAULT_MQTT_CONFIG: MqttConfig = {
    brokerUrl: 'wss://test.mosquitto.org:8081',
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
};

/**
 * Topic prefix for bpenv sensor data
 */
export const TOPIC_PREFIX = 'bpenv/demo/rooms';

/**
 * Generate a topic for a light sensor in a specific place
 */
export function getLightSensorTopic(placeId: string): string {
    return `${TOPIC_PREFIX}/${placeId}/sensors/light`;
}

/**
 * Parse a topic to extract the place ID
 */
export function parseTopic(topic: string): { placeId: string; sensorType: string } | null {
    const regex = new RegExp(`^${TOPIC_PREFIX}/([^/]+)/sensors/([^/]+)$`);
    const match = topic.match(regex);
    if (match) {
        return {
            placeId: match[1],
            sensorType: match[2],
        };
    }
    return null;
}
