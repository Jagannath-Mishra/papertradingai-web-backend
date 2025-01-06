const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();

// Utility to handle database errors gracefully
const handleDatabaseError = (res, error, action) => {
  console.error(`Error ${action}:`, error.message);
  res.status(500).json({ error: `Failed to ${action}` });
};

// Utility function for pagination
const paginate = async (query, params, page, limit) => {
  const offset = (page - 1) * limit;

  // Get total record count
  const totalRecordsResult = await pool.query(`SELECT COUNT(*) AS total FROM (${query}) AS subquery`, params);
  const totalRecords = parseInt(totalRecordsResult.rows[0].total, 10);

  // Get paginated results
  const paginatedQuery = `${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const paginatedResult = await pool.query(paginatedQuery, [...params, limit, offset]);

  return {
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    data: paginatedResult.rows,
  };
};

// Get all balances with optional pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await paginate('SELECT * FROM virtual_balance ORDER BY created_at DESC', [], page, limit);

    res.json({
      page,
      limit,
      ...result,
    });
  } catch (err) {
    handleDatabaseError(res, err, 'fetch balances');
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
    handleDatabaseError(res, err, 'fetch balance');
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
    handleDatabaseError(res, err, 'create balance');
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
    handleDatabaseError(res, err, 'update balance');
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
    handleDatabaseError(res, err, 'delete balance');
  }
});

module.exports = router;
