const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();

// Get all portfolio entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const portfolioQuery = 'SELECT * FROM portfolio';
    const portfolioResult = await pool.query(portfolioQuery);

    res.status(200).json(portfolioResult.rows);
  } catch (err) {
    console.error('Error fetching portfolio:', err.message);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Get portfolio by user_id
router.get('/:user_id', authenticateToken, async (req, res) => {
  const { user_id } = req.params;

  try {
    const portfolioQuery = `
      SELECT p.*, s.symbol, s.name
      FROM portfolio p
      JOIN stocks s ON p.stock_id = s.id
      WHERE p.user_id = $1;
    `;
    const portfolioResult = await pool.query(portfolioQuery, [user_id]);

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found for the user' });
    }

    res.status(200).json(portfolioResult.rows);
  } catch (err) {
    console.error('Error fetching portfolio for user:', err.message);
    res.status(500).json({ error: 'Failed to fetch portfolio for user' });
  }
});

// Add a new stock to the portfolio
router.post('/', authenticateToken, async (req, res) => {
  const { user_id, stock_id, quantity } = req.body;

  if (!user_id || !stock_id || !quantity) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const upsertPortfolioQuery = `
      INSERT INTO portfolio (user_id, stock_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, stock_id)
      DO UPDATE SET quantity = portfolio.quantity + EXCLUDED.quantity
      RETURNING *;
    `;
    const portfolioResult = await pool.query(upsertPortfolioQuery, [user_id, stock_id, quantity]);

    res.status(201).json({ message: 'Stock added to portfolio', portfolio: portfolioResult.rows[0] });
  } catch (err) {
    console.error('Error adding stock to portfolio:', err.message);
    res.status(500).json({ error: 'Failed to add stock to portfolio' });
  }
});

// Update portfolio stock quantity
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  try {
    const updatePortfolioQuery = `
      UPDATE portfolio
      SET quantity = $1
      WHERE id = $2
      RETURNING *;
    `;
    const portfolioResult = await pool.query(updatePortfolioQuery, [quantity, id]);

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio entry not found' });
    }

    res.status(200).json({ message: 'Portfolio updated successfully', portfolio: portfolioResult.rows[0] });
  } catch (err) {
    console.error('Error updating portfolio:', err.message);
    res.status(500).json({ error: 'Failed to update portfolio' });
  }
});

// Remove a stock from the portfolio
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deletePortfolioQuery = `DELETE FROM portfolio WHERE id = $1 RETURNING *`;
    const portfolioResult = await pool.query(deletePortfolioQuery, [id]);

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio entry not found' });
    }

    res.status(200).json({ message: 'Stock removed from portfolio', portfolio: portfolioResult.rows[0] });
  } catch (err) {
    console.error('Error deleting portfolio entry:', err.message);
    res.status(500).json({ error: 'Failed to delete portfolio entry' });
  }
});

module.exports = router;
