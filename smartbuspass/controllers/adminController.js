const db = require('../db/connection');
const { generateQR } = require('../utils/qrGenerator');
const mailer = require('../utils/mailer');

async function getStats(req, res) {
  try {
    const [[{ pending }]] = await db.execute("SELECT COUNT(*) as pending FROM bus_passes WHERE status='PENDING'");
    const [[{ total }]] = await db.execute("SELECT COUNT(*) as total FROM bus_passes WHERE status='APPROVED'");
    const [[{ activeRoutes }]] = await db.execute("SELECT COUNT(*) as activeRoutes FROM routes WHERE is_active=1");
    const [[{ revenue }]] = await db.execute("SELECT COALESCE(SUM(amount),0) as revenue FROM payments WHERE status='COMPLETED'");
    res.json({ success: true, pendingApplications: pending, totalPassesIssued: total, activeRoutes, totalRevenue: revenue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getApplications(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `SELECT bp.*, u.full_name, u.email, r.route_name, r.start_point, r.end_point
                 FROM bus_passes bp
                 JOIN users u ON bp.user_id = u.user_id
                 JOIN routes r ON bp.route_id = r.route_id`;
    const params = [];
    if (status) { query += ' WHERE bp.status = ?'; params.push(status); }
    query += ' ORDER BY bp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const [rows] = await db.execute(query, params);

    const [[{ total }]] = await db.execute(
      'SELECT COUNT(*) as total FROM bus_passes' + (status ? ' WHERE status=?' : ''),
      status ? [status] : []
    );
    res.json({ success: true, applications: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function approveApplication(req, res) {
  try {
    const { passId } = req.params;
    const [passes] = await db.execute(
      `SELECT bp.*, u.email, u.full_name, r.route_name
       FROM bus_passes bp JOIN users u ON bp.user_id=u.user_id JOIN routes r ON bp.route_id=r.route_id
       WHERE bp.pass_id=?`, [passId]
    );
    if (!passes.length) return res.json({ success: false, message: 'Pass not found.' });
    const pass = passes[0];

    const payload = { passId: pass.pass_id, userId: pass.user_id, routeId: pass.route_id, expiryDate: pass.expiry_date, issuedAt: new Date().toISOString() };
    const { token, qrBase64 } = await generateQR(payload);

    await db.execute(
      `UPDATE bus_passes SET status='APPROVED', issue_date=CURDATE(), qr_code=?, approved_by=? WHERE pass_id=?`,
      [qrBase64, req.session.userId, passId]
    );

    try { await mailer.sendApprovalEmail(pass.email, pass.full_name, pass.route_name, pass.expiry_date, qrBase64); } catch (e) { console.warn('Email failed:', e.message); }

    res.json({ success: true, message: 'Pass approved and QR generated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function rejectApplication(req, res) {
  try {
    const { passId } = req.params;
    const [passes] = await db.execute(
      `SELECT bp.*, u.email, u.full_name, r.route_name FROM bus_passes bp JOIN users u ON bp.user_id=u.user_id JOIN routes r ON bp.route_id=r.route_id WHERE bp.pass_id=?`,
      [passId]
    );
    if (!passes.length) return res.json({ success: false, message: 'Pass not found.' });
    const pass = passes[0];

    await db.execute("UPDATE bus_passes SET status='REJECTED' WHERE pass_id=?", [passId]);
    try { await mailer.sendRejectionEmail(pass.email, pass.full_name, pass.route_name); } catch (e) { console.warn('Email failed:', e.message); }

    res.json({ success: true, message: 'Pass rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getRoutes(req, res) {
  try {
    const [routes] = await db.execute('SELECT * FROM routes ORDER BY route_id');
    res.json({ success: true, routes });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function addRoute(req, res) {
  try {
    const { route_name, start_point, end_point, distance_km, stops, fee_amount } = req.body;
    const stopsJson = Array.isArray(stops) ? JSON.stringify(stops) : stops || '[]';
    await db.execute(
      'INSERT INTO routes (route_name, start_point, end_point, distance_km, stops, fee_amount) VALUES (?,?,?,?,?,?)',
      [route_name, start_point, end_point, distance_km, stopsJson, fee_amount]
    );
    res.json({ success: true, message: 'Route added.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function updateRoute(req, res) {
  try {
    const { id } = req.params;
    const { route_name, start_point, end_point, distance_km, stops, fee_amount } = req.body;
    const stopsJson = Array.isArray(stops) ? JSON.stringify(stops) : stops || '[]';
    await db.execute(
      'UPDATE routes SET route_name=?, start_point=?, end_point=?, distance_km=?, stops=?, fee_amount=? WHERE route_id=?',
      [route_name, start_point, end_point, distance_km, stopsJson, fee_amount, id]
    );
    res.json({ success: true, message: 'Route updated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function deleteRoute(req, res) {
  try {
    await db.execute('UPDATE routes SET is_active=0 WHERE route_id=?', [req.params.id]);
    res.json({ success: true, message: 'Route deactivated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function getUsers(req, res) {
  try {
    const { role } = req.query;
    let query = 'SELECT user_id, full_name, email, phone, role, created_at FROM users';
    const params = [];
    if (role) { query += ' WHERE role=?'; params.push(role); }
    const [users] = await db.execute(query, params);
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function getReports(req, res) {
  try {
    const { period } = req.query;
    const [byRoute] = await db.execute(
      `SELECT r.route_name, COUNT(bp.pass_id) as total_passes, COALESCE(SUM(p.amount),0) as revenue
       FROM routes r LEFT JOIN bus_passes bp ON r.route_id=bp.route_id AND bp.status='APPROVED'
       LEFT JOIN payments p ON bp.pass_id=p.pass_id AND p.status='COMPLETED'
       GROUP BY r.route_id`
    );
    const [daily] = await db.execute(
      `SELECT DATE(paid_at) as day, COALESCE(SUM(amount),0) as revenue
       FROM payments WHERE status='COMPLETED' AND paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(paid_at) ORDER BY day`
    );
    res.json({ success: true, byRoute, daily });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

module.exports = { getStats, getApplications, approveApplication, rejectApplication, getRoutes, addRoute, updateRoute, deleteRoute, getUsers, getReports };
