const db = require('../db/connection');
const USE_DUMMY_AUTH = String(process.env.USE_DUMMY_AUTH || 'true').toLowerCase() === 'true';
const { dummyRoutes, dummyPasses, createDummyPass } = require('../utils/dummyStore');

async function getMyPasses(req, res) {
  try {
    if (USE_DUMMY_AUTH) {
      const userPasses = dummyPasses
        .filter((p) => p.user_id === req.session.userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json({ success: true, passes: userPasses });
    }

    const [passes] = await db.execute(
      `SELECT bp.*, r.route_name, r.start_point, r.end_point
       FROM bus_passes bp
       JOIN routes r ON bp.route_id = r.route_id
       WHERE bp.user_id = ?
       ORDER BY bp.created_at DESC`,
      [req.session.userId]
    );
    res.json({ success: true, passes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function applyPass(req, res) {
  try {
    const { route_id, duration_months } = req.body;
    const userId = req.session.userId;

    const validDurations = [1, 3, 6];
    const dur = parseInt(duration_months);
    if (!route_id || !validDurations.includes(dur)) {
      return res.json({ success: false, message: 'Invalid route or duration.' });
    }

    const feeFactors = { 1: 1, 3: 2.5, 6: 4.5 };
    if (USE_DUMMY_AUTH) {
      const route = dummyRoutes.find((r) => r.route_id === Number(route_id) && r.is_active === 1);
      if (!route) return res.json({ success: false, message: 'Route not found.' });
      const totalFee = parseFloat(route.fee_amount) * feeFactors[dur];

      const issueDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + dur);

      const pass = createDummyPass({
        user_id: userId,
        route_id: route.route_id,
        issue_date: issueDate,
        expiry_date: expiryDate,
        status: 'PENDING',
        fee_amount: totalFee,
        route_name: route.route_name,
        start_point: route.start_point,
        end_point: route.end_point,
        qr_code: null,
        approved_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        full_name: req.session.fullName,
        email: req.session.email
      });

      return res.json({ success: true, passId: pass.pass_id, message: 'Application submitted. Awaiting admin approval.' });
    }

    const [routes] = await db.execute('SELECT * FROM routes WHERE route_id = ? AND is_active = 1', [route_id]);
    if (!routes.length) return res.json({ success: false, message: 'Route not found.' });
    const route = routes[0];
    const totalFee = parseFloat(route.fee_amount) * feeFactors[dur];

    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + dur);

    const [result] = await db.execute(
      `INSERT INTO bus_passes (user_id, route_id, issue_date, expiry_date, status, fee_amount)
       VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      [userId, route_id, issueDate, expiryDate, totalFee]
    );

    const passId = result.insertId;

    await db.execute(
      `INSERT INTO payments (pass_id, amount, status, paid_at, payment_ref)
       VALUES (?, ?, 'COMPLETED', NOW(), ?)`,
      [passId, totalFee, 'SIM-' + Date.now()]
    );

    res.json({ success: true, passId, message: 'Application submitted. Awaiting admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getActiveRoutes(req, res) {
  try {
    if (USE_DUMMY_AUTH) {
      return res.json({ success: true, routes: dummyRoutes.filter((r) => r.is_active === 1) });
    }

    const [routes] = await db.execute('SELECT * FROM routes WHERE is_active = 1');
    res.json({ success: true, routes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getMyPasses, applyPass, getActiveRoutes };
