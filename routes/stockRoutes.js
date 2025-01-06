const express = require("express");
const pool = require("../models/db");
const { authenticateToken } = require("../utils/jwt");

const router = express.Router();

// Get all stocks
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM stocks");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// Get stock by symbol
router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;
  try {
    const result = await pool.query("SELECT * FROM stocks WHERE symbol = $1", [symbol]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch stock" });
  }
});

module.exports = router;
