const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./utils/swagger");

// Import routes
const userRoutes = require("./routes/userRoutes");
const stockRoutes = require("./routes/stockRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const orderRoutes = require("./routes/orderRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");

dotenv.config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Enhance security with HTTP headers
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(morgan("combined")); // Logging middleware for API requests

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/portfolio", portfolioRoutes);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "Server is healthy",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot find ${req.originalUrl}`,
  });
});

// Graceful Shutdown
const shutdown = () => {
  console.log("\nShutting down server...");
  process.exit(0);
};

process.on("SIGINT", shutdown); // Handle Ctrl+C
process.on("SIGTERM", shutdown); // Handle termination

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
