import { useCallback } from 'react';
import { useMqttStore } from '../stores/mqttStore';
import { LightSensorData } from '../services/mqtt/types';
import { DEFAULT_MQTT_CONFIG } from '../services/mqtt/config';

/**
 * React hook for MQTT functionality
 * Provides easy access to MQTT connection, subscriptions, and sensor data
 */
export const useMqtt = () => {
    const connectionStatus = useMqttStore((state) => state.connectionStatus);
    const brokerUrl = useMqttStore((state) => state.brokerUrl);
    const error = useMqttStore((state) => state.error);
    const subscriptions = useMqttStore((state) => state.subscriptions);
    const sensorData = useMqttStore((state) => state.sensorData);

    const connect = useMqttStore((state) => state.connect);
    const disconnect = useMqttStore((state) => state.disconnect);
    const subscribePlace = useMqttStore((state) => state.subscribePlace);
    const unsubscribePlace = useMqttStore((state) => state.unsubscribePlace);
    const hasSubscription = useMqttStore((state) => state.hasSubscription);

    /**
     * Connect to the default MQTT broker
     */
    const connectToDefault = useCallback(async () => {
        await connect();
    }, [connect]);

    /**
     * Connect to a custom MQTT broker
     */
    const connectToBroker = useCallback(async (url: string) => {
        await connect(url);
    }, [connect]);

    /**
     * Get sensor data for a specific place
     */
    const getSensorData = useCallback((placeId: string): LightSensorData | undefined => {
        return sensorData.get(placeId);
    }, [sensorData]);

    /**
     * Check if a place is subscribed to MQTT
     */
    const isPlaceSubscribed = useCallback((placeId: string): boolean => {
        return hasSubscription(placeId);
    }, [hasSubscription]);

    /**
     * Get all subscribed place IDs
     */
    const getSubscribedPlaceIds = useCallback((): string[] => {
        return Array.from(subscriptions.keys());
    }, [subscriptions]);

    /**
     * Check if connected to MQTT
     */
    const isConnected = connectionStatus === 'connected';

    /**
     * Check if currently connecting
     */
    const isConnecting = connectionStatus === 'connecting';

    return {
        // State
        connectionStatus,
        brokerUrl,
        error,
        isConnected,
        isConnecting,
        defaultBrokerUrl: DEFAULT_MQTT_CONFIG.brokerUrl,

        // Connection actions
        connect: connectToDefault,
        connectToBroker,
        disconnect,

        // Subscription actions
        subscribePlace,
        unsubscribePlace,
        isPlaceSubscribed,
        getSubscribedPlaceIds,

        // Sensor data
        getSensorData,
        sensorData,
    };
};

export default useMqtt;
