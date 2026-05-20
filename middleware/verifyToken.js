const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const jwt = require("jsonwebtoken");

const verifyToken = async (req, res, next) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers?.authorization;
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  // Email/Password login → cookie token
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(403).json({ message: "Invalid token" });
    }
  }

  // Google login → BetterAuth JWT token
  if (headerToken) {
    try {
      const JWKS = createRemoteJWKSet(
        new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`),
      );

      const { payload } = await jwtVerify(headerToken, JWKS);
      req.user = payload;
      return next();
    } catch (error) {
      return res.status(403).json({ message: "Invalid token" });
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
};

module.exports = verifyToken;
