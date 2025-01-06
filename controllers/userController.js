const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../models/db");

// Utility function for structured logging
const logError = (operation, error) => {
  console.error(`[${new Date().toISOString()}] Error in ${operation}:`, error.message);
};

// User Registration
const registerUser = async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Required fields are missing" });
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "Phone number must be a valid 10-digit number" });
  }

  try {
    // Check if email already exists
    const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, phone, created_at`,
      [firstName, lastName, email, phone || null, hashedPassword] // Use null for empty phone
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.rows[0].id,
        firstName: newUser.rows[0].first_name,
        lastName: newUser.rows[0].last_name,
        email: newUser.rows[0].email,
        phone: newUser.rows[0].phone,
        createdAt: newUser.rows[0].created_at,
      },
    });
  } catch (err) {
    logError("registerUser", err);
    res.status(500).json({ error: "Server error" });
  }
};

// User Login - Generate JWT Token
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please provide email and password" });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, first_name, last_name, email, password FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" }); // 401 Unauthorized
    }

    const user = userResult.rows[0];

    // Compare hashed passwords
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET_KEY, // Ensure this is set in your environment
      { expiresIn: process.env.JWT_EXPIRATION || "1h" } // Default to 1 hour if not provided
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (err) {
    logError("loginUser", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Middleware for token verification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = decoded; // Attach user info to the request
    next();
  });
};

module.exports = { registerUser, loginUser, verifyToken };
