const cron = require('node-cron');
const db = require('../db/connection');

// Waypoints for 3 buses (lat/lng around a city)
const busRoutes = {
  1: [
    [12.9716, 77.5946], [12.9750, 77.6010], [12.9800, 77.6080],
    [12.9850, 77.6150], [12.9900, 77.6200], [12.9950, 77.6250],
    [13.0000, 77.6300], [13.0050, 77.6350], [13.0100, 77.6400], [13.0150, 77.6450]
  ],
  2: [
    [12.9352, 77.6245], [12.9400, 77.6200], [12.9450, 77.6150],
    [12.9500, 77.6100], [12.9550, 77.6050], [12.9600, 77.6000],
    [12.9650, 77.5950], [12.9700, 77.5900], [12.9750, 77.5850], [12.9800, 77.5800]
  ],
  3: [
    [12.8456, 77.6603], [12.8500, 77.6650], [12.8550, 77.6700],
    [12.8600, 77.6750], [12.8650, 77.6800], [12.8700, 77.6850],
    [12.8750, 77.6900], [12.8800, 77.6950], [12.8850, 77.7000], [12.8900, 77.7050]
  ]
};

const busIndex = { 1: 0, 2: 0, 3: 0 };

function startBusSimulator() {
  cron.schedule('*/10 * * * * *', async () => {
    try {
      const [buses] = await db.execute('SELECT bus_id FROM buses WHERE is_active=1');
      for (const bus of buses) {
        const id = bus.bus_id;
        const waypoints = busRoutes[id];
        if (!waypoints) continue;
        const idx = busIndex[id] % waypoints.length;
        const [lat, lng] = waypoints[idx];
        const speed = (20 + Math.random() * 30).toFixed(2);
        await db.execute(
          'INSERT INTO gps_logs (bus_id, latitude, longitude, speed_kmh) VALUES (?,?,?,?)',
          [id, lat, lng, speed]
        );
        busIndex[id] = (idx + 1) % waypoints.length;
      }
    } catch (err) {
      console.error('[SIM] GPS simulation error:', err.message);
    }
  });
  console.log('[SIM] Bus simulator started.');
}

module.exports = { startBusSimulator };
