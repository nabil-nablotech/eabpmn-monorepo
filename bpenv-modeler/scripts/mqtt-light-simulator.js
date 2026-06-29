/**
 * MQTT Light Sensor Simulator
 *
 * Publishes random lux values to simulate a light sensor.
 *
 * Usage:
 *   node scripts/mqtt-light-simulator.js [placeId] [brokerUrl]
 *
 * Examples:
 *   node scripts/mqtt-light-simulator.js room1
 *   node scripts/mqtt-light-simulator.js room1 mqtt://broker.hivemq.com
 *   node scripts/mqtt-light-simulator.js room1 mqtt://broker.emqx.io
 *
 * The script publishes to: bpenv/demo/rooms/{placeId}/sensors/light
 *
 * Payload format:
 *   { "lux": 450, "timestamp": "2026-01-27T10:30:00Z" }
 *
 * Light status logic:
 *   lux > 300  = Light ON
 *   lux <= 300 = Light OFF
 */

import mqtt from 'mqtt';

const DEFAULT_BROKER = 'mqtt://test.mosquitto.org';
const TOPIC_PREFIX = 'bpenv/demo/rooms';
const PUBLISH_INTERVAL = 2000; // 2 seconds
const LIGHT_THRESHOLD = 300;

// Parse arguments: node script.js [placeId] [brokerUrl]
const placeId = process.argv[2] || 'room1';
const BROKER_URL = process.argv[3] || DEFAULT_BROKER;
const topic = `${TOPIC_PREFIX}/${placeId}/sensors/light`;

console.log('='.repeat(50));
console.log('MQTT Light Sensor Simulator');
console.log('='.repeat(50));
console.log(`Broker: ${BROKER_URL}`);
console.log(`Topic: ${topic}`);
console.log(`Light threshold: ${LIGHT_THRESHOLD} lux`);
console.log(`Publish interval: ${PUBLISH_INTERVAL}ms`);
console.log('='.repeat(50));
console.log('');

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    console.log('Publishing light sensor data...');
    console.log('');

    // Publish initial value
    publishLuxValue();

    // Publish every PUBLISH_INTERVAL ms
    setInterval(publishLuxValue, PUBLISH_INTERVAL);
});

client.on('error', (error) => {
    console.error('MQTT Error:', error.message);
    process.exit(1);
});

client.on('close', () => {
    console.log('Disconnected from MQTT broker');
});

function publishLuxValue() {
    // Generate random lux value between 0 and 600
    const lux = Math.floor(Math.random() * 601);
    const lightOn = lux > LIGHT_THRESHOLD;
    const timestamp = new Date().toISOString();

    const payload = JSON.stringify({
        lux,
        timestamp
    });

    client.publish(topic, payload, (error) => {
        if (error) {
            console.error('Publish error:', error.message);
        } else {
            const status = lightOn ? 'ON ' : 'OFF';
            const icon = lightOn ? '💡' : '⚫';
            console.log(`${icon} [${timestamp.split('T')[1].split('.')[0]}] lux: ${lux.toString().padStart(3)} | Light ${status}`);
        }
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    client.end();
    process.exit(0);
});
