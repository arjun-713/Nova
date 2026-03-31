function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  next();
}

module.exports = { requireAuth };
