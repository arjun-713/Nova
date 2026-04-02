const db = require('../db/connection');
const { generateQR } = require('../utils/qrGenerator');
const mailer = require('../utils/mailer');
const { dummyRoutes, dummyPasses, createDummyRoute } = require('../utils/dummyStore');

const USE_DUMMY_AUTH = String(process.env.USE_DUMMY_AUTH || 'true').toLowerCase() === 'true';

function mapDummyApplication(pass) {
  return {
    pass_id: pass.pass_id,
    user_id: pass.user_id,
    route_id: pass.route_id,
    status: pass.status,
    fee_amount: pass.fee_amount,
    issue_date: pass.issue_date,
    expiry_date: pass.expiry_date,
    qr_code: pass.qr_code,
    created_at: pass.created_at,
    full_name: pass.full_name || `Passenger ${pass.user_id}`,
    email: pass.email || `user${pass.user_id}@dummy.local`,
    route_name: pass.route_name,
    start_point: pass.start_point,
    end_point: pass.end_point
  };
}

async function getStats(req, res) {
  try {
    if (USE_DUMMY_AUTH) {
      const pendingApplications = dummyPasses.filter((p) => p.status === 'PENDING').length;
      const totalPassesIssued = dummyPasses.filter((p) => p.status === 'APPROVED').length;
      const activeRoutes = dummyRoutes.filter((r) => r.is_active === 1).length;
      const totalRevenue = dummyPasses
        .filter((p) => p.status === 'APPROVED')
        .reduce((sum, p) => sum + Number(p.fee_amount || 0), 0);
      return res.json({ success: true, pendingApplications, totalPassesIssued, activeRoutes, totalRevenue });
    }

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
    if (USE_DUMMY_AUTH) {
      const { status, page = 1, limit = 20 } = req.query;
      const p = parseInt(page, 10) || 1;
      const l = parseInt(limit, 10) || 20;
      const filtered = dummyPasses
        .filter((pass) => !status || pass.status === status)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const offset = (p - 1) * l;
      const rows = filtered.slice(offset, offset + l).map(mapDummyApplication);
      return res.json({ success: true, applications: rows, total: filtered.length, page: p, limit: l });
    }

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
    if (USE_DUMMY_AUTH) {
      const id = Number(passId);
      const pass = dummyPasses.find((p) => p.pass_id === id);
      if (!pass) return res.json({ success: false, message: 'Pass not found.' });
      pass.status = 'APPROVED';
      pass.issue_date = new Date();
      pass.qr_code = pass.qr_code || 'data:image/svg+xml;base64,PHN2Zy8+';
      pass.approved_by = req.session.userId;
      pass.updated_at = new Date();
      return res.json({ success: true, message: 'Pass approved and QR generated.' });
    }

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
    if (USE_DUMMY_AUTH) {
      const id = Number(passId);
      const pass = dummyPasses.find((p) => p.pass_id === id);
      if (!pass) return res.json({ success: false, message: 'Pass not found.' });
      pass.status = 'REJECTED';
      pass.updated_at = new Date();
      return res.json({ success: true, message: 'Pass rejected.' });
    }

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
    if (USE_DUMMY_AUTH) {
      const routes = [...dummyRoutes].sort((a, b) => a.route_id - b.route_id);
      return res.json({ success: true, routes });
    }

    const [routes] = await db.execute('SELECT * FROM routes ORDER BY route_id');
    res.json({ success: true, routes });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function addRoute(req, res) {
  try {
    const { route_name, start_point, end_point, distance_km, stops, fee_amount } = req.body;
    if (USE_DUMMY_AUTH) {
      createDummyRoute({
        route_name,
        start_point,
        end_point,
        distance_km: Number(distance_km),
        stops: Array.isArray(stops) ? stops : [],
        fee_amount: Number(fee_amount)
      });
      return res.json({ success: true, message: 'Route added.' });
    }

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
    if (USE_DUMMY_AUTH) {
      const route = dummyRoutes.find((r) => r.route_id === Number(id));
      if (!route) return res.json({ success: false, message: 'Route not found.' });
      route.route_name = route_name;
      route.start_point = start_point;
      route.end_point = end_point;
      route.distance_km = Number(distance_km);
      route.stops = Array.isArray(stops) ? stops : [];
      route.fee_amount = Number(fee_amount);
      return res.json({ success: true, message: 'Route updated.' });
    }

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
    if (USE_DUMMY_AUTH) {
      const route = dummyRoutes.find((r) => r.route_id === Number(req.params.id));
      if (!route) return res.json({ success: false, message: 'Route not found.' });
      route.is_active = 0;
      return res.json({ success: true, message: 'Route deactivated.' });
    }

    await db.execute('UPDATE routes SET is_active=0 WHERE route_id=?', [req.params.id]);
    res.json({ success: true, message: 'Route deactivated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
}

async function getUsers(req, res) {
  try {
    if (USE_DUMMY_AUTH) {
      const usersById = new Map();
      dummyPasses.forEach((p) => {
        if (!usersById.has(p.user_id)) {
          usersById.set(p.user_id, {
            user_id: p.user_id,
            full_name: p.full_name || `Passenger ${p.user_id}`,
            email: p.email || `user${p.user_id}@dummy.local`,
            phone: p.phone || '',
            role: 'PASSENGER',
            created_at: p.created_at
          });
        }
      });
      return res.json({ success: true, users: [...usersById.values()] });
    }

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
    if (USE_DUMMY_AUTH) {
      const byRoute = dummyRoutes.map((route) => {
        const approved = dummyPasses.filter((p) => p.route_id === route.route_id && p.status === 'APPROVED');
        return {
          route_name: route.route_name,
          total_passes: approved.length,
          revenue: approved.reduce((sum, p) => sum + Number(p.fee_amount || 0), 0)
        };
      });

      const dailyMap = new Map();
      dummyPasses
        .filter((p) => p.status === 'APPROVED')
        .forEach((p) => {
          const day = new Date(p.created_at).toISOString().slice(0, 10);
          dailyMap.set(day, (dailyMap.get(day) || 0) + Number(p.fee_amount || 0));
        });
      const daily = [...dailyMap.entries()]
        .map(([day, revenue]) => ({ day, revenue }))
        .sort((a, b) => new Date(a.day) - new Date(b.day))
        .slice(-7);

      return res.json({ success: true, byRoute, daily });
    }

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
