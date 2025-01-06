const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const { authenticateToken } = require("./utils/jwt");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./utils/swagger");
const stockRoutes = require("./routes/stockRoutes");
const orderRoutes = require("./routes/orderRoutes");
const balanceRoutes = require('./routes/balanceRoutes'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/users", userRoutes); // User-related routes
app.use("/api/trade", tradeRoutes); // Trade-related routes
// Serve Swagger Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/stocks", stockRoutes); // Stock-related routes
app.use("/api/orders", orderRoutes); // Order-related routes
app.use('/balances', balanceRoutes);
// Example of protected route using authenticateToken middleware
app.get("/api/protected", authenticateToken, (req, res) => {
  res.send("This is a protected route");
});

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    uptime: process.uptime(),
    message: "Server is healthy",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
