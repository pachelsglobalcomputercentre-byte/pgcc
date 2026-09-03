const jwt = require('jsonwebtoken');

/** Requires a valid login token. Attaches { uid, role, name } to req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid — please log in again.' });
  }
}

/** Use after requireAuth. Blocks anyone whose role doesn't match. */
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Only ${role} accounts can do this.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
