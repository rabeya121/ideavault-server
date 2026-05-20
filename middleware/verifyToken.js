const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers?.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;