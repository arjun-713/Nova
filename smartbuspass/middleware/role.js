function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { requireRole };
