const express = require("express");
const pool = require("../models/db");
const { authenticateToken } = require("../utils/jwt");

const router = express.Router();
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 10;

// Get all stocks with pagination and optional search   http://localhost:5000/api/stocks?page=1&limit=5&search=AAPL
router.get("/", async (req, res) => {
  const { page = 1, limit = DEFAULT_PAGE_SIZE, search } = req.query;

  const offset = (page - 1) * limit;

  try {
    let query = "SELECT * FROM stocks";
    let params = [];

    // Search filter
    if (search) {
      query += " WHERE symbol ILIKE $1 OR name ILIKE $1";
      params.push(`%${search}%`);
    }

    query += " ORDER BY symbol ASC LIMIT $2 OFFSET $3";
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countQuery = search
      ? "SELECT COUNT(*) FROM stocks WHERE symbol ILIKE $1 OR name ILIKE $1"
      : "SELECT COUNT(*) FROM stocks";

    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);

    res.status(200).json({
      stocks: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      pageSize: parseInt(limit, 10),
    });
  } catch (err) {
    console.error("Error fetching stocks:", err.message);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// Get stock by symbol
router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;

  // Validate input
  if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
    return res.status(400).json({ error: "Invalid or missing stock symbol" });
  }

  try {
    const result = await pool.query("SELECT * FROM stocks WHERE symbol = $1", [symbol]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching stock with symbol ${symbol}:`, err.message);
    res.status(500).json({ error: "Failed to fetch stock" });
  }
});

module.exports = router;
