const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const jwt = require('jsonwebtoken');

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
);

const verifyToken = async (req, res, next) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers?.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  // Email/Password login → cookie token
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      req.user = decoded;
      return next(); // ← return দিয়ে বের হয়ে যাও
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }
  }

  // Google login → BetterAuth JWT token
  if (headerToken) {
    try {
      const { payload } = await jwtVerify(headerToken, JWKS);
      req.user = payload;
      return next(); // ← return দিয়ে বের হয়ে যাও
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }
  }

  // কোনো token নেই
  return res.status(401).json({ message: 'Unauthorized' });
};

module.exports = verifyToken;