const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const requiredEnvVariables = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];

// Validate environment variables
requiredEnvVariables.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1); // Exit the application if any variable is missing
  }
});

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: process.env.DB_MAX_CONNECTIONS || 10, // Maximum number of connections in the pool
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT || 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT || 5000, // Timeout for a new connection
});

// Log when connected
pool.on("connect", () => {
  console.log("Connected to the PostgreSQL database.");
});

// Log errors
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
  // Optionally, terminate the process if you cannot recover from this error
});

// Retry logic for initial connection
const connectWithRetry = async (retries = 5, delay = 2000) => {
  while (retries) {
    try {
      await pool.query("SELECT 1"); // Test query to ensure the connection works
      console.log("Database connection test passed.");
      return;
    } catch (err) {
      console.error(`Database connection failed. Retries left: ${retries - 1}`);
      retries -= 1;
      if (!retries) {
        console.error("Could not establish a connection to the database.");
        process.exit(1); // Exit the application
      }
      await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
    }
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down application...");
  try {
    await pool.end(); // Close the connection pool
    console.log("Database connections closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error closing database connections:", err.message);
    process.exit(1);
  }
});

// Attempt initial connection
connectWithRetry();

module.exports = pool;
