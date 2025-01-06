const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();

// Get all balances
router.get('/', authenticateToken, async (req, res) => {
  try {
    const balances = await pool.query('SELECT * FROM virtual_balance');
    res.json(balances.rows);
  } catch (err) {
    console.error('Error fetching balances:', err.message);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});



// Get balance by user_id
router.get('/:user_id', authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM virtual_balance WHERE user_id = $1', [user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching balance:', err.message);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Create a new balance
router.post('/', authenticateToken, async (req, res) => {
  const {
    user_id,
    type,
    description,
    opening_cash_balance,
    trading_balance,
    available_cash,
    margin_from_pledge_holdings,
    amount_added,
    amount_utilized,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO virtual_balance 
      (user_id, type, description, opening_cash_balance, trading_balance, available_cash, margin_from_pledge_holdings, amount_added, amount_utilized)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        user_id,
        type,
        description,
        opening_cash_balance,
        trading_balance,
        available_cash,
        margin_from_pledge_holdings,
        amount_added,
        amount_utilized,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating balance:', err.message);
    res.status(500).json({ error: 'Failed to create balance' });
  }
});

// Update a balance by id
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const setQuery = Object.keys(updates)
    .map((key, idx) => `${key} = $${idx + 2}`)
    .join(', ');

  try {
    const result = await pool.query(
      `UPDATE virtual_balance SET ${setQuery} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating balance:', err.message);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Delete a balance by id
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM virtual_balance WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting balance:', err.message);
    res.status(500).json({ error: 'Failed to delete balance' });
  }
});

module.exports = router;
