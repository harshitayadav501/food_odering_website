const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all menu items (public route, but shows all items if admin)
router.get('/', async (req, res) => {
    try {
        // Check if user is admin from token (optional authentication)
        let isAdmin = false;
        try {
            const authHeader = req.headers['authorization'];
            if (authHeader) {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
                isAdmin = decoded.role === 'admin';
            }
        } catch (e) {
            // Not authenticated or invalid token - treat as regular user
        }
        
        const query = isAdmin 
            ? `SELECT 
                mi.*,
                r.name AS restaurant_name,
                r.address AS restaurant_address
            FROM MenuItems mi
            INNER JOIN Restaurants r ON mi.restaurant_id = r.restaurant_id
            ORDER BY mi.category, mi.item_name`
            : `SELECT 
                mi.*,
                r.name AS restaurant_name,
                r.address AS restaurant_address
            FROM MenuItems mi
            INNER JOIN Restaurants r ON mi.restaurant_id = r.restaurant_id
            WHERE mi.availability = TRUE
            ORDER BY mi.category, mi.item_name`;

        const [items] = await pool.execute(query);

        res.json(items);
    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get menu items by restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const [items] = await pool.execute(`
            SELECT * FROM MenuItems 
            WHERE restaurant_id = ? AND availability = TRUE
            ORDER BY category, item_name
        `, [restaurantId]);

        res.json(items);
    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get menu items by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const [items] = await pool.execute(`
            SELECT 
                mi.*,
                r.name AS restaurant_name
            FROM MenuItems mi
            INNER JOIN Restaurants r ON mi.restaurant_id = r.restaurant_id
            WHERE mi.category = ? AND mi.availability = TRUE
            ORDER BY mi.item_name
        `, [category]);

        res.json(items);
    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Add menu item
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { restaurant_id, item_name, price, category, stock, image_url, rating, description } = req.body;

        if (!restaurant_id || !item_name || !price || !category) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const [result] = await pool.execute(
            `INSERT INTO MenuItems (restaurant_id, item_name, price, category, stock, availability, image_url, rating, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [restaurant_id, item_name, price, category, stock || 0, true, image_url || null, rating || 4.5, description || null]
        );

        res.status(201).json({ message: 'Menu item added', itemId: result.insertId });
    } catch (error) {
        console.error('Menu item creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Update menu item
router.put('/:itemId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { item_name, price, category, stock, availability, image_url, rating, description } = req.body;

        const updates = [];
        const values = [];

        if (item_name) { updates.push('item_name = ?'); values.push(item_name); }
        if (price) { updates.push('price = ?'); values.push(price); }
        if (category) { updates.push('category = ?'); values.push(category); }
        if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
        if (availability !== undefined) { updates.push('availability = ?'); values.push(availability); }
        if (image_url) { updates.push('image_url = ?'); values.push(image_url); }
        if (rating) { updates.push('rating = ?'); values.push(rating); }
        if (description) { updates.push('description = ?'); values.push(description); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(itemId);
        await pool.execute(
            `UPDATE MenuItems SET ${updates.join(', ')} WHERE item_id = ?`,
            values
        );

        res.json({ message: 'Menu item updated' });
    } catch (error) {
        console.error('Menu item update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Delete menu item
router.delete('/:itemId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { itemId } = req.params;
        await pool.execute('DELETE FROM MenuItems WHERE item_id = ?', [itemId]);
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        console.error('Menu item deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

