import { create } from 'zustand';
import { ConnectionStatus, LightSensorData, PlaceSubscription, isLightOn } from '../services/mqtt/types';
import { getLightSensorTopic, parseTopic } from '../services/mqtt/config';
import MqttService from '../services/mqtt/MqttService';
import { useEnvStore } from '../envStore';

interface MqttStore {
    // Connection state
    connectionStatus: ConnectionStatus;
    brokerUrl: string | null;
    error: string | null;

    // Subscriptions: placeId -> subscription info
    subscriptions: Map<string, PlaceSubscription>;

    // Sensor data: placeId -> sensor data
    sensorData: Map<string, LightSensorData>;

    // Actions
    setConnectionStatus: (status: ConnectionStatus) => void;
    setBrokerUrl: (url: string | null) => void;
    setError: (error: string | null) => void;

    // Subscription management
    addSubscription: (placeId: string, subscription: PlaceSubscription) => void;
    removeSubscription: (placeId: string) => void;
    hasSubscription: (placeId: string) => boolean;

    // Sensor data management
    updateSensorData: (placeId: string, data: LightSensorData) => void;
    getSensorData: (placeId: string) => LightSensorData | undefined;
    clearSensorData: (placeId: string) => void;

    // Connection actions
    connect: (brokerUrl?: string) => Promise<void>;
    disconnect: () => Promise<void>;

    // Subscription actions
    subscribePlace: (placeId: string) => Promise<void>;
    unsubscribePlace: (placeId: string) => Promise<void>;

    // Handle incoming MQTT messages
    handleMessage: (topic: string, payload: any) => void;
}

export const useMqttStore = create<MqttStore>((set, get) => ({
    // Initial state
    connectionStatus: 'disconnected',
    brokerUrl: null,
    error: null,
    subscriptions: new Map(),
    sensorData: new Map(),

    // Basic setters
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setBrokerUrl: (url) => set({ brokerUrl: url }),
    setError: (error) => set({ error }),

    // Subscription management
    addSubscription: (placeId, subscription) =>
        set((state) => {
            const newSubscriptions = new Map(state.subscriptions);
            newSubscriptions.set(placeId, subscription);
            return { subscriptions: newSubscriptions };
        }),

    removeSubscription: (placeId) =>
        set((state) => {
            const newSubscriptions = new Map(state.subscriptions);
            newSubscriptions.delete(placeId);
            return { subscriptions: newSubscriptions };
        }),

    hasSubscription: (placeId) => get().subscriptions.has(placeId),

    // Sensor data management
    updateSensorData: (placeId, data) =>
        set((state) => {
            const newSensorData = new Map(state.sensorData);
            newSensorData.set(placeId, data);
            return { sensorData: newSensorData };
        }),

    getSensorData: (placeId) => get().sensorData.get(placeId),

    clearSensorData: (placeId) =>
        set((state) => {
            const newSensorData = new Map(state.sensorData);
            newSensorData.delete(placeId);
            return { sensorData: newSensorData };
        }),

    // Connection actions
    connect: async (brokerUrl) => {
        const mqtt = MqttService.getInstance();
        set({ connectionStatus: 'connecting', error: null });

        mqtt.setCallbacks({
            onConnect: () => {
                set({ connectionStatus: 'connected', brokerUrl: mqtt.getBrokerUrl() });
            },
            onDisconnect: () => {
                set({ connectionStatus: 'disconnected' });
            },
            onError: (error) => {
                set({ connectionStatus: 'error', error: error.message });
            },
            onMessage: (topic, payload) => {
                get().handleMessage(topic, payload);
            },
        });

        try {
            await mqtt.connect(brokerUrl ? { brokerUrl } : undefined);
        } catch (error) {
            set({
                connectionStatus: 'error',
                error: error instanceof Error ? error.message : 'Connection failed',
            });
            throw error;
        }
    },

    disconnect: async () => {
        const mqtt = MqttService.getInstance();
        await mqtt.disconnect();
        set({
            connectionStatus: 'disconnected',
            brokerUrl: null,
            subscriptions: new Map(),
            sensorData: new Map(),
        });
    },

    // Subscription actions
    subscribePlace: async (placeId) => {
        const mqtt = MqttService.getInstance();
        const topic = getLightSensorTopic(placeId);

        if (get().connectionStatus !== 'connected') {
            throw new Error('Not connected to MQTT broker');
        }

        await mqtt.subscribe(topic);

        get().addSubscription(placeId, {
            placeId,
            topic,
            sensorType: 'light',
        });
    },

    unsubscribePlace: async (placeId) => {
        const mqtt = MqttService.getInstance();
        const subscription = get().subscriptions.get(placeId);

        if (subscription) {
            await mqtt.unsubscribe(subscription.topic);
            get().removeSubscription(placeId);
            get().clearSensorData(placeId);
        }
    },

    // Handle incoming MQTT messages
    handleMessage: (topic, payload) => {
        const parsed = parseTopic(topic);
        if (!parsed) {
            console.warn('[MqttStore] Unknown topic format:', topic);
            return;
        }

        const { placeId, sensorType } = parsed;

        if (sensorType === 'light' && typeof payload.lux === 'number') {
            const sensorData: LightSensorData = {
                lux: payload.lux,
                lightOn: isLightOn(payload.lux),
                timestamp: payload.timestamp || new Date().toISOString(),
            };

            get().updateSensorData(placeId, sensorData);

            // Sync to envStore for logical place condition evaluation
            useEnvStore.getState().updateMqttAttributes(placeId, sensorData);

            console.log(`[MqttStore] Light sensor update for ${placeId}:`, sensorData);
        }
    },
}));
