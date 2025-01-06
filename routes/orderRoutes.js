const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  const { symbol, companyName, qty, price, orderType } = req.body;

  if (!symbol || !companyName || !qty || !price || !orderType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const totalAmount = qty * price; // Calculate total value of the transaction

    // Fetch the user's virtual balance
    const balanceQuery = `SELECT * FROM virtual_balance WHERE user_id = $1`;
    const balanceResult = await pool.query(balanceQuery, [req.user.id]);

    if (balanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'User virtual balance not found' });
    }

    const userBalance = balanceResult.rows[0];

    // Upsert stock information
    const upsertStockQuery = `
      INSERT INTO stocks (symbol, name, current_price)
      VALUES ($1, $2, $3)
      ON CONFLICT (symbol)
      DO UPDATE SET
        name = EXCLUDED.name,
        current_price = EXCLUDED.current_price
      RETURNING id;
    `;
    const stockResult = await pool.query(upsertStockQuery, [symbol, companyName, price]);
    const stockId = stockResult.rows[0].id;

    if (orderType === "SELL") {
      // Ensure the user has enough quantity of the stock to sell
      const stockOwnershipQuery = `
        SELECT SUM(qty) AS total_qty
        FROM orders
        WHERE user_id = $1 AND stock_id = $2 AND order_type = 'BUY'
      `;
      const stockOwnershipResult = await pool.query(stockOwnershipQuery, [req.user.id, stockId]);
    
      const totalOwnedQty = stockOwnershipResult.rows[0]?.total_qty || 0;
    
      // Fetch the total sold quantity
      const stockSoldQuery = `
        SELECT SUM(qty) AS total_sold_qty
        FROM orders
        WHERE user_id = $1 AND stock_id = $2 AND order_type = 'SELL'
      `;
      const stockSoldResult = await pool.query(stockSoldQuery, [req.user.id, stockId]);
    
      const totalSoldQty = stockSoldResult.rows[0]?.total_sold_qty || 0;
    
      // Calculate available quantity
      const availableQty = totalOwnedQty - totalSoldQty;
    
      if (availableQty < qty) {
        return res.status(400).json({ error: 'Insufficient stock quantity to sell' });
      }
    
      // Add the amount to trading_balance and available_cash
      const updatedTradingBalance = userBalance.trading_balance + totalAmount;
      const updatedAvailableCash = userBalance.available_cash + totalAmount;
    
      const updateBalanceQuery = `
        UPDATE virtual_balance
        SET trading_balance = $1, available_cash = $2
        WHERE user_id = $3
        RETURNING *;
      `;
      const updatedBalance = await pool.query(updateBalanceQuery, [
        updatedTradingBalance,
        updatedAvailableCash,
        req.user.id,
      ]);
    
      // Insert the sell order
      const insertOrderQuery = `
        INSERT INTO orders (user_id, stock_id, qty, price, order_type, state, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const orderResult = await pool.query(insertOrderQuery, [
        req.user.id,
        stockId,
        qty,
        price,
        orderType,
        "EXECUTED",
        "Stock sold",
      ]);
    
      return res.status(201).json({
        message: 'Sell order placed successfully',
        order: orderResult.rows[0],
      });
    }
    else if (orderType === "BUY") {
      // Check if the user has sufficient available cash
      if (userBalance.available_cash < totalAmount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      // Deduct the amount from trading_balance and update available_cash
      const updatedTradingBalance = userBalance.trading_balance - totalAmount;
      const updatedAvailableCash = userBalance.available_cash - totalAmount;
      const amountUtilized = userBalance.opening_cash_balance - updatedAvailableCash;

      const updateBalanceQuery = `
        UPDATE virtual_balance
        SET trading_balance = $1, available_cash = $2, amount_utilized = $3
        WHERE user_id = $4
        RETURNING *;
      `;
      const updatedBalance = await pool.query(updateBalanceQuery, [
        updatedTradingBalance,
        updatedAvailableCash,
        amountUtilized,
        req.user.id,
      ]);
    } else {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    // Insert the order
    const insertOrderQuery = `
      INSERT INTO orders (user_id, stock_id, qty, price, order_type, state, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const orderResult = await pool.query(insertOrderQuery, [
      req.user.id,
      stockId,
      qty,
      price,
      orderType,
      "EXECUTED",
      orderType === "SELL" ? "Stock sold" : "Stock purchased",
    ]);

    res.status(201).json({
      message: `Order ${orderType.toLowerCase()}ed successfully`,
      order: orderResult.rows[0],
    });
  } catch (err) {
    console.error('Error processing order:', err.message);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

module.exports = router;
