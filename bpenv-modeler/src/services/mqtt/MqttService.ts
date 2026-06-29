import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { MqttConfig, ConnectionStatus, MqttEventCallbacks } from './types';
import { DEFAULT_MQTT_CONFIG } from './config';

/**
 * Singleton MQTT service for managing connections and subscriptions
 */
class MqttService {
    private static instance: MqttService | null = null;
    private client: MqttClient | null = null;
    private config: MqttConfig = DEFAULT_MQTT_CONFIG;
    private callbacks: MqttEventCallbacks = {};
    private subscriptions: Set<string> = new Set();
    private connectionStatus: ConnectionStatus = 'disconnected';

    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): MqttService {
        if (!MqttService.instance) {
            MqttService.instance = new MqttService();
        }
        return MqttService.instance;
    }

    /**
     * Get current connection status
     */
    public getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    /**
     * Get current broker URL
     */
    public getBrokerUrl(): string | null {
        return this.client ? this.config.brokerUrl : null;
    }

    /**
     * Set event callbacks
     */
    public setCallbacks(callbacks: MqttEventCallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * Connect to MQTT broker
     */
    public connect(config?: Partial<MqttConfig>): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.client && this.connectionStatus === 'connected') {
                resolve();
                return;
            }

            this.config = { ...DEFAULT_MQTT_CONFIG, ...config };
            this.connectionStatus = 'connecting';

            const options: IClientOptions = {
                clientId: this.config.clientId || `bpenv_${Math.random().toString(16).slice(2, 10)}`,
                keepalive: this.config.keepalive,
                reconnectPeriod: this.config.reconnectPeriod,
                connectTimeout: this.config.connectTimeout,
            };

            if (this.config.username) {
                options.username = this.config.username;
            }
            if (this.config.password) {
                options.password = this.config.password;
            }

            try {
                this.client = mqtt.connect(this.config.brokerUrl, options);

                this.client.on('connect', () => {
                    this.connectionStatus = 'connected';
                    console.log('[MqttService] Connected to broker:', this.config.brokerUrl);

                    // Resubscribe to any existing subscriptions
                    this.subscriptions.forEach(topic => {
                        this.client?.subscribe(topic);
                    });

                    this.callbacks.onConnect?.();
                    resolve();
                });

                this.client.on('error', (error) => {
                    console.error('[MqttService] Connection error:', error);
                    this.connectionStatus = 'error';
                    this.callbacks.onError?.(error);
                    reject(error);
                });

                this.client.on('close', () => {
                    console.log('[MqttService] Connection closed');
                    this.connectionStatus = 'disconnected';
                    this.callbacks.onDisconnect?.();
                });

                this.client.on('reconnect', () => {
                    console.log('[MqttService] Reconnecting...');
                    this.connectionStatus = 'connecting';
                });

                this.client.on('message', (topic, message) => {
                    try {
                        const payload = JSON.parse(message.toString());
                        this.callbacks.onMessage?.(topic, payload);
                    } catch (e) {
                        console.error('[MqttService] Failed to parse message:', e);
                    }
                });
            } catch (error) {
                this.connectionStatus = 'error';
                reject(error);
            }
        });
    }

    /**
     * Disconnect from MQTT broker
     */
    public disconnect(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.client) {
                this.connectionStatus = 'disconnected';
                resolve();
                return;
            }

            this.client.end(false, {}, () => {
                this.connectionStatus = 'disconnected';
                this.client = null;
                console.log('[MqttService] Disconnected from broker');
                resolve();
            });
        });
    }

    /**
     * Subscribe to a topic
     */
    public subscribe(topic: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client || this.connectionStatus !== 'connected') {
                reject(new Error('Not connected to MQTT broker'));
                return;
            }

            this.client.subscribe(topic, (error) => {
                if (error) {
                    console.error('[MqttService] Subscribe error:', error);
                    reject(error);
                } else {
                    this.subscriptions.add(topic);
                    console.log('[MqttService] Subscribed to:', topic);
                    resolve();
                }
            });
        });
    }

    /**
     * Unsubscribe from a topic
     */
    public unsubscribe(topic: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                this.subscriptions.delete(topic);
                resolve();
                return;
            }

            this.client.unsubscribe(topic, (error) => {
                if (error) {
                    console.error('[MqttService] Unsubscribe error:', error);
                    reject(error);
                } else {
                    this.subscriptions.delete(topic);
                    console.log('[MqttService] Unsubscribed from:', topic);
                    resolve();
                }
            });
        });
    }

    /**
     * Get all current subscriptions
     */
    public getSubscriptions(): string[] {
        return Array.from(this.subscriptions);
    }

    /**
     * Check if subscribed to a topic
     */
    public isSubscribed(topic: string): boolean {
        return this.subscriptions.has(topic);
    }

    /**
     * Publish a message (useful for testing)
     */
    public publish(topic: string, payload: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.client || this.connectionStatus !== 'connected') {
                reject(new Error('Not connected to MQTT broker'));
                return;
            }

            const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
            this.client.publish(topic, message, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}

export default MqttService;
