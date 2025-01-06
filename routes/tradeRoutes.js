const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();
/**
 * @swagger
 * /trades/:
 *   post:
 *     summary: Place a stock order (Buy or Sell)
 *     description: Handles stock trades by interacting with the user's portfolio and virtual balance.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Trades
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - companyName
 *               - qty
 *               - price
 *               - orderType
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: AAPL
 *                 description: The stock symbol (ticker).
 *               companyName:
 *                 type: string
 *                 example: Apple Inc.
 *                 description: The name of the company.
 *               qty:
 *                 type: integer
 *                 example: 10
 *                 description: The quantity of stocks.
 *               price:
 *                 type: number
 *                 example: 150.25
 *                 description: The price per stock.
 *               orderType:
 *                 type: string
 *                 enum: [BUY, SELL]
 *                 example: BUY
 *                 description: The type of order (BUY or SELL).
 *     responses:
 *       201:
 *         description: Order placed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Order buyed successfully
 *                 order:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                     companyName:
 *                       type: string
 *                     qty:
 *                       type: integer
 *                     price:
 *                       type: number
 *                     orderType:
 *                       type: string
 *       400:
 *         description: Bad request. Validation error or insufficient funds/stocks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Insufficient funds
 *       404:
 *         description: Virtual balance or stock not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User virtual balance not found
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to process order
 */

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
      await handleSellOrder(req, res, pool, stockId, qty, totalAmount, userBalance);
    } else if (orderType === "BUY") {
      await handleBuyOrder(req, res, pool, stockId, qty, totalAmount, userBalance);
    } else {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    res.status(201).json({ message: `Order ${orderType.toLowerCase()}ed successfully` });
  } catch (err) {
    console.error('Error processing order:', err.message);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// Handle sell trades
async function handleSellOrder(req, res, pool, stockId, qty, totalAmount, userBalance) {
  // Check portfolio for available quantity
  const portfolioQuery = `SELECT quantity FROM portfolio WHERE user_id = $1 AND stock_id = $2`;
  const portfolioResult = await pool.query(portfolioQuery, [req.user.id, stockId]);

  if (portfolioResult.rows.length === 0 || portfolioResult.rows[0].quantity < qty) {
    return res.status(400).json({ error: 'Insufficient stock quantity to sell' });
  }

  const newQuantity = portfolioResult.rows[0].quantity - qty;

  // Update or delete the portfolio entry
  if (newQuantity === 0) {
    const deletePortfolioQuery = `DELETE FROM portfolio WHERE user_id = $1 AND stock_id = $2`;
    await pool.query(deletePortfolioQuery, [req.user.id, stockId]);
  } else {
    const updatePortfolioQuery = `UPDATE portfolio SET quantity = $1 WHERE user_id = $2 AND stock_id = $3`;
    await pool.query(updatePortfolioQuery, [newQuantity, req.user.id, stockId]);
  }

  // Update virtual balance
  const updatedTradingBalance = userBalance.trading_balance + totalAmount;
  const updatedAvailableCash = userBalance.available_cash + totalAmount;

  const updateBalanceQuery = `
    UPDATE virtual_balance
    SET trading_balance = $1, available_cash = $2
    WHERE user_id = $3
  `;
  await pool.query(updateBalanceQuery, [updatedTradingBalance, updatedAvailableCash, req.user.id]);
}

// Handle buy trades
async function handleBuyOrder(req, res, pool, stockId, qty, totalAmount, userBalance) {
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
  `;
  await pool.query(updateBalanceQuery, [
    updatedTradingBalance,
    updatedAvailableCash,
    amountUtilized,
    req.user.id,
  ]);

  // Upsert into portfolio
  const upsertPortfolioQuery = `
    INSERT INTO portfolio (user_id, stock_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, stock_id)
    DO UPDATE SET quantity = portfolio.quantity + EXCLUDED.quantity;
  `;
  await pool.query(upsertPortfolioQuery, [req.user.id, stockId, qty]);
}

module.exports = router;
