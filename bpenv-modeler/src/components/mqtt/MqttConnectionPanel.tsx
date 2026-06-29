import { useState } from 'react';
import { FaWifi } from 'react-icons/fa';
import { useMqtt } from '../../hooks/useMqtt';

const MqttConnectionPanel = () => {
    const [showModal, setShowModal] = useState(false);
    const [customUrl, setCustomUrl] = useState('');
    const [useCustomUrl, setUseCustomUrl] = useState(false);

    const {
        connectionStatus,
        brokerUrl,
        error,
        isConnected,
        isConnecting,
        defaultBrokerUrl,
        connect,
        connectToBroker,
        disconnect,
    } = useMqtt();

    const handleConnect = async () => {
        try {
            if (useCustomUrl && customUrl.trim()) {
                await connectToBroker(customUrl.trim());
            } else {
                await connect();
            }
            setShowModal(false);
        } catch (err) {
            console.error('Connection failed:', err);
        }
    };

    const handleDisconnect = async () => {
        await disconnect();
        setShowModal(false);
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return '#28a745';
            case 'connecting':
                return '#ffc107';
            case 'error':
                return '#dc3545';
            default:
                return '#6c757d';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'Connected';
            case 'connecting':
                return 'Connecting...';
            case 'error':
                return 'Error';
            default:
                return 'Disconnected';
        }
    };

    return (
        <>
            <button
                className="toolbar-btn"
                onClick={() => setShowModal(true)}
                title={`MQTT: ${getStatusText()}`}
                style={{ position: 'relative' }}
            >
                <FaWifi style={{ color: getStatusColor() }} />
                <span
                    style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(),
                    }}
                />
            </button>

            {showModal && (
                <div
                    className="modal show d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="modal-dialog modal-dialog-centered"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content bg-dark text-white">
                            <div className="modal-header border-secondary">
                                <h5 className="modal-title">
                                    <FaWifi className="me-2" />
                                    MQTT Connection
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <span className="fw-bold">Status: </span>
                                    <span style={{ color: getStatusColor() }}>
                                        {getStatusText()}
                                    </span>
                                </div>

                                {brokerUrl && (
                                    <div className="mb-3">
                                        <span className="fw-bold">Broker: </span>
                                        <span className="text-info">{brokerUrl}</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                {!isConnected && (
                                    <>
                                        <div className="form-check mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="useCustomUrl"
                                                checked={useCustomUrl}
                                                onChange={(e) => setUseCustomUrl(e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="useCustomUrl">
                                                Use custom broker URL
                                            </label>
                                        </div>

                                        {useCustomUrl ? (
                                            <div className="mb-3">
                                                <label className="form-label">Custom Broker URL</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-secondary text-white border-0"
                                                    placeholder="wss://broker.example.com:8084"
                                                    value={customUrl}
                                                    onChange={(e) => setCustomUrl(e.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="mb-3">
                                                <label className="form-label">Default Broker</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-secondary text-white border-0"
                                                    value={defaultBrokerUrl}
                                                    disabled
                                                />
                                                <small className="text-muted">
                                                    Public Mosquitto test broker
                                                </small>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-secondary">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Close
                                </button>
                                {isConnected ? (
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={handleDisconnect}
                                    >
                                        Disconnect
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-success"
                                        onClick={handleConnect}
                                        disabled={isConnecting}
                                    >
                                        {isConnecting ? 'Connecting...' : 'Connect'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MqttConnectionPanel;
