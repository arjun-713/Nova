const db = require('../db/connection');
const { verifyPayload } = require('../utils/qrGenerator');

async function updateGPS(req, res) {
  try {
    const { bus_id, latitude, longitude, speed_kmh } = req.body;
    await db.execute(
      'INSERT INTO gps_logs (bus_id, latitude, longitude, speed_kmh) VALUES (?,?,?,?)',
      [bus_id, latitude, longitude, speed_kmh || 0]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getLive(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT g.bus_id, b.bus_number, r.route_name, g.latitude, g.longitude, g.speed_kmh, g.recorded_at
       FROM gps_logs g
       JOIN buses b ON g.bus_id = b.bus_id
       JOIN routes r ON b.route_id = r.route_id
       WHERE g.recorded_at = (SELECT MAX(g2.recorded_at) FROM gps_logs g2 WHERE g2.bus_id = g.bus_id)
       AND b.is_active = 1`
    );
    res.json({ success: true, buses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getBusHistory(req, res) {
  try {
    const { busId } = req.params;
    const hours = parseInt(req.query.hours) || 1;
    const [rows] = await db.execute(
      `SELECT latitude, longitude, speed_kmh, recorded_at FROM gps_logs
       WHERE bus_id=? AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY recorded_at ASC`,
      [busId, hours]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function validateScan(req, res) {
  try {
    const { qr_payload, bus_id } = req.body;
    if (!qr_payload) return res.json({ valid: false, message: 'No QR data provided.' });

    const data = verifyPayload(qr_payload);
    if (!data) return res.json({ valid: false, message: 'Invalid or tampered QR code.' });

    const { passId, expiryDate } = data;
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(expiryDate);

    const [passes] = await db.execute(
      `SELECT bp.*, u.full_name, r.route_name FROM bus_passes bp
       JOIN users u ON bp.user_id=u.user_id JOIN routes r ON bp.route_id=r.route_id
       WHERE bp.pass_id=?`, [passId]
    );

    if (!passes.length) return res.json({ valid: false, message: 'Pass not found.' });
    const pass = passes[0];

    let result = 'VALID';
    let valid = true;
    let message = 'Valid pass.';

    if (pass.status !== 'APPROVED' || expiry < today) {
      result = 'EXPIRED'; valid = false; message = 'Pass is expired or not approved.';
    }

    await db.execute(
      'INSERT INTO scan_logs (pass_id, bus_id, result) VALUES (?,?,?)',
      [passId, bus_id || null, result]
    );

    res.json({ valid, passengerName: pass.full_name, routeName: pass.route_name, expiryDate: pass.expiry_date, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, message: 'Server error.' });
  }
}

module.exports = { updateGPS, getLive, getBusHistory, validateScan };
