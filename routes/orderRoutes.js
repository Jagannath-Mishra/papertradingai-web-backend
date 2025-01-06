const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();

// Get all orders with optional pagination
router.get('/', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default to page 1, 10 items per page
  const offset = (page - 1) * limit;

  try {
    const ordersQuery = `
      SELECT * 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2;
    `;
    const orders = await pool.query(ordersQuery, [limit, offset]);

    res.json({ orders: orders.rows, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get a single order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const orderQuery = `SELECT * FROM orders WHERE id = $1`;
    const orderResult = await pool.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(orderResult.rows[0]);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create a new order
router.post('/', authenticateToken, async (req, res) => {
  const { user_id, stock_id, qty, price, order_type, description } = req.body;

  if (!user_id || !stock_id || !qty || !price || !order_type) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  try {
    const insertOrderQuery = `
      INSERT INTO orders (user_id, stock_id, qty, price, order_type, description, state)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const orderResult = await pool.query(insertOrderQuery, [
      user_id,
      stock_id,
      qty,
      price,
      order_type,
      description || null,
      'pending',
    ]);

    res.status(201).json({ message: 'Order created successfully', order: orderResult.rows[0] });
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update an existing order
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { qty, price, state, description } = req.body;

  if (!qty && !price && !state && !description) {
    return res.status(400).json({ error: 'At least one field must be provided to update' });
  }

  try {
    const updateFields = [];
    const values = [];
    let query = 'UPDATE orders SET ';

    if (qty) {
      updateFields.push(`qty = $${values.length + 1}`);
      values.push(qty);
    }

    if (price) {
      updateFields.push(`price = $${values.length + 1}`);
      values.push(price);
    }

    if (state) {
      updateFields.push(`state = $${values.length + 1}`);
      values.push(state);
    }

    if (description) {
      updateFields.push(`description = $${values.length + 1}`);
      values.push(description);
    }

    query += updateFields.join(', ') + ` WHERE id = $${values.length + 1} RETURNING *;`;
    values.push(id);

    const updatedOrder = await pool.query(query, values);

    if (updatedOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order updated successfully', order: updatedOrder.rows[0] });
  } catch (err) {
    console.error('Error updating order:', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete an order by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deleteOrderQuery = `DELETE FROM orders WHERE id = $1 RETURNING *;`;
    const deletedOrder = await pool.query(deleteOrderQuery, [id]);

    if (deletedOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully', order: deletedOrder.rows[0] });
  } catch (err) {
    console.error('Error deleting order:', err.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
