const bcrypt = require('bcryptjs');
const db = require('../db/connection');

const USE_DUMMY_AUTH = String(process.env.USE_DUMMY_AUTH || 'true').toLowerCase() === 'true';

const dummyUsers = [
  {
    user_id: 1,
    full_name: 'Super Admin',
    email: 'admin@smartbus.com',
    phone: '9999999999',
    password_hash: bcrypt.hashSync('password', 10),
    role: 'ADMIN'
  },
  {
    user_id: 2,
    full_name: 'Test Driver',
    email: 'driver@smartbus.com',
    phone: '8888888888',
    password_hash: bcrypt.hashSync('password', 10),
    role: 'DRIVER'
  }
];
let nextDummyUserId = 3;

async function register(req, res) {
  try {
    const { full_name, email, phone, password, role } = req.body;

    // Validate
    if (!full_name || !email || !phone || !password) {
      return res.json({ success: false, message: 'All fields are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.json({ success: false, message: 'Invalid email format.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.json({ success: false, message: 'Phone must be 10 digits.' });
    }
    if (password.length < 8 || !/\d/.test(password)) {
      return res.json({ success: false, message: 'Password must be at least 8 characters with at least 1 number.' });
    }

    const allowedRoles = ['PASSENGER', 'DRIVER', 'ADMIN'];
    const userRole = allowedRoles.includes(role) ? role : 'PASSENGER';

    const hash = await bcrypt.hash(password, 10);
    if (USE_DUMMY_AUTH) {
      const normalizedEmail = email.toLowerCase();
      const exists = dummyUsers.some(
        (u) => u.email.toLowerCase() === normalizedEmail || u.phone === phone
      );
      if (exists) {
        return res.json({ success: false, message: 'Email or phone already registered.' });
      }

      dummyUsers.push({
        user_id: nextDummyUserId++,
        full_name,
        email,
        phone,
        password_hash: hash,
        role: userRole
      });
    } else {
      await db.execute(
        'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, phone, hash, userRole]
      );
    }

    res.json({ success: true, message: 'Account created. You can now log in.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'Email or phone already registered.' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required.' });
    }

    let user;
    if (USE_DUMMY_AUTH) {
      user = dummyUsers.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
      if (!user) {
        return res.json({ success: false, message: 'Invalid email or password.' });
      }
    } else {
      const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (!rows.length) {
        return res.json({ success: false, message: 'Invalid email or password.' });
      }
      user = rows[0];
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.userId = user.user_id;
    req.session.fullName = user.full_name;
    req.session.email = user.email;
    req.session.role = user.role;

    const redirectMap = {
      ADMIN: '/admin/dashboard.html',
      DRIVER: '/driver/scanner.html',
      PASSENGER: '/dashboard.html'
    };

    res.json({ success: true, role: user.role, redirect: redirectMap[user.role] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ success: true });
  });
}

function me(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false });
  }
  res.json({
    success: true,
    userId: req.session.userId,
    fullName: req.session.fullName,
    email: req.session.email,
    role: req.session.role
  });
}

module.exports = { register, login, logout, me };
