import { useMqttStore } from '../../../stores/mqttStore';
import { LIGHT_THRESHOLD } from '../../../services/mqtt/types';

type Props = {
    placeId: string;
};

const LightStatusIndicator = ({ placeId }: Props) => {
    // Subscribe directly to store state for proper reactivity
    const subscriptions = useMqttStore((state) => state.subscriptions);
    const sensorData = useMqttStore((state) => state.sensorData);

    const isSubscribed = subscriptions.has(placeId);
    const data = sensorData.get(placeId);

    if (!isSubscribed) {
        return null;
    }

    if (!data) {
        return (
            <div className="d-flex align-items-center gap-2 mt-2 p-2 bg-secondary bg-opacity-25 rounded">
                <span style={{ fontSize: '1.2em' }}>...</span>
                <span className="text-muted small">Waiting for sensor data...</span>
            </div>
        );
    }

    const { lux, lightOn, timestamp } = data;
    const timeStr = new Date(timestamp).toLocaleTimeString();

    return (
        <div className="d-flex align-items-center gap-2 mt-2 p-2 bg-secondary bg-opacity-25 rounded">
            <span
                style={{
                    fontSize: '1.5em',
                    filter: lightOn ? 'drop-shadow(0 0 4px yellow)' : 'none',
                }}
                title={lightOn ? 'Light ON' : 'Light OFF'}
            >
                {lightOn ? '\u{1F4A1}' : '\u26AB'}
            </span>
            <div className="d-flex flex-column">
                <span className={lightOn ? 'text-warning fw-bold' : 'text-secondary'}>
                    {lightOn ? 'Light ON' : 'Light OFF'}
                </span>
                <span className="text-muted small">
                    {lux} lux (threshold: {LIGHT_THRESHOLD})
                </span>
                <span className="text-muted small">{timeStr}</span>
            </div>
        </div>
    );
};

export default LightStatusIndicator;
