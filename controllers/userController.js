const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../models/db");

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
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
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
    console.error(err.message);
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
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET_KEY,  // Your secret key
      { expiresIn: '1h' }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { registerUser, loginUser };
