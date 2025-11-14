const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user's cart (stored in session/localStorage on frontend, but can sync with server)
// For this implementation, we'll use a simple in-memory approach
// In production, you might want to store cart in database

// Get cart items (from localStorage on frontend)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // In a real app, you might store cart in database
        // For now, return empty array - cart is managed on frontend
        res.json({ items: [] });
    } catch (error) {
        console.error('Cart fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate cart items (check availability and stock)
router.post('/validate', authenticateToken, async (req, res) => {
    try {
        const { items } = req.body; // [{itemId, quantity}, ...]

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid cart items' });
        }

        const validationResults = [];

        for (const item of items) {
            const [menuItems] = await pool.execute(
                'SELECT * FROM MenuItems WHERE item_id = ?',
                [item.itemId]
            );

            if (menuItems.length === 0) {
                validationResults.push({
                    itemId: item.itemId,
                    valid: false,
                    error: 'Item not found'
                });
            } else {
                const menuItem = menuItems[0];
                const isValid = menuItem.availability && menuItem.stock >= item.quantity;

                validationResults.push({
                    itemId: item.itemId,
                    valid: isValid,
                    available: menuItem.availability,
                    stock: menuItem.stock,
                    requested: item.quantity,
                    error: !isValid ? 'Item unavailable or insufficient stock' : null
                });
            }
        }

        res.json({ validation: validationResults });
    } catch (error) {
        console.error('Cart validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;


