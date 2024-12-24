const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];  // Get token from header

  if (!token) return res.status(403).send('Access denied');  // No token, access denied

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);  // Verify token
    req.user = decoded;  // Attach user info to the request object
    next();  // Pass to the next middleware
  } catch (err) {
    res.status(403).send('Invalid token');  // Token is invalid
  }
};

module.exports = { authenticateToken };
