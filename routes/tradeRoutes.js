const express = require("express");
const { pool } = require("../models/db"); // PostgreSQL connection pool
const { authenticateToken } = require("../utils/jwt");
const router = express.Router();

// Buy Stock
router.post("/buy", authenticateToken, async (req, res) => {
    const { stock_id, quantity } = req.body;
  
    try {
      // Fetch stock and user data
      const stockResult = await pool.query("SELECT * FROM stocks WHERE id = $1", [stock_id]);
      const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
  
      if (!stockResult.rows.length || !userResult.rows.length)
        return res.status(404).json({ message: "Stock or user not found" });
  
      const stock = stockResult.rows[0];
      const user = userResult.rows[0];
      const totalCost = stock.current_price * quantity;
  
      // Calculate broker charge and tax
      const brokerCharge = totalCost * 0.005; // 0.5% broker charge
      const tax = totalCost * 0.002; // 0.2% tax
      const totalAmount = totalCost + brokerCharge + tax;
  
      // Validate balance
      if (user.balance < totalAmount)
        return res.status(400).json({ message: "Insufficient balance" });
  
      // Update user balance
      await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [
        totalAmount,
        req.user.id,
      ]);
  
      // Log balance adjustments in virtual_balance
      await pool.query(
        `INSERT INTO virtual_balance (user_id, type, amount, description)
         VALUES
         ($1, 'withdrawal', $2, 'Stock purchase'),
         ($1, 'charge', $3, 'Broker charge for stock purchase'),
         ($1, 'tax', $4, 'Tax for stock purchase')`,
        [req.user.id, -totalCost, -brokerCharge, -tax]
      );
  
      // Insert or update portfolio
      await pool.query(
        `INSERT INTO portfolio (user_id, stock_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, stock_id)
         DO UPDATE SET quantity = portfolio.quantity + $3`,
        [req.user.id, stock_id, quantity]
      );
  
      // Log transaction
      await pool.query(
        `INSERT INTO transactions (user_id, stock_id, type, quantity, price, broker_charge, tax)
         VALUES ($1, $2, 'buy', $3, $4, $5, $6)`,
        [req.user.id, stock_id, quantity, stock.current_price, brokerCharge, tax]
      );
  
      res.status(200).json({ message: "Stock purchased successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

// Sell Stock
router.post("/sell", authenticateToken, async (req, res) => {
    const { stock_id, quantity } = req.body;
  
    try {
      const portfolioResult = await pool.query(
        "SELECT * FROM portfolio WHERE user_id = $1 AND stock_id = $2",
        [req.user.id, stock_id]
      );
  
      if (!portfolioResult.rows.length || portfolioResult.rows[0].quantity < quantity)
        return res.status(400).json({ message: "Insufficient stock holdings" });
  
      const stockResult = await pool.query("SELECT * FROM stocks WHERE id = $1", [stock_id]);
      const stock = stockResult.rows[0];
      const saleValue = stock.current_price * quantity;
  
      // Calculate broker charge and tax
      const brokerCharge = saleValue * 0.005; // 0.5% broker charge
      const tax = saleValue * 0.002; // 0.2% tax
      const totalAmount = saleValue - brokerCharge - tax;
  
      // Update portfolio
      await pool.query(
        "UPDATE portfolio SET quantity = quantity - $1 WHERE user_id = $2 AND stock_id = $3",
        [quantity, req.user.id, stock_id]
      );
  
      // Update user balance
      await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
        totalAmount,
        req.user.id,
      ]);
  
      // Log balance adjustments in virtual_balance
      await pool.query(
        `INSERT INTO virtual_balance (user_id, type, amount, description)
         VALUES
         ($1, 'deposit', $2, 'Stock sale'),
         ($1, 'charge', $3, 'Broker charge for stock sale'),
         ($1, 'tax', $4, 'Tax for stock sale')`,
        [req.user.id, saleValue, -brokerCharge, -tax]
      );
  
      // Log transaction
      await pool.query(
        `INSERT INTO transactions (user_id, stock_id, type, quantity, price, broker_charge, tax)
         VALUES ($1, $2, 'sell', $3, $4, $5, $6)`,
        [req.user.id, stock_id, quantity, stock.current_price, brokerCharge, tax]
      );
  
      res.status(200).json({ message: "Stock sold successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

// Fetch Portfolio
router.get("/portfolio", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stocks.symbol, stocks.name, portfolio.quantity
       FROM portfolio
       JOIN stocks ON portfolio.stock_id = stocks.id
       WHERE portfolio.user_id = $1`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/balance", authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM virtual_balance WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

module.exports = router;
