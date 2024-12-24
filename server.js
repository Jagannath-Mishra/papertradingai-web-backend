const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const { authenticateToken } = require("./utils/jwt");  // Import JWT auth middleware

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/users", userRoutes); // Public route for user registration and login

// Example of protected route using authenticateToken middleware
app.get("/api/protected", authenticateToken, (req, res) => {
  res.send("This is a protected route");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
