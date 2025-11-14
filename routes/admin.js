const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken);
router.use(isAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                u.*,
                COUNT(o.order_id) AS total_orders
            FROM Users u
            LEFT JOIN Orders o ON u.user_id = o.user_id
            GROUP BY u.user_id
            ORDER BY u.created_at DESC
        `);

        res.json(users);
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT role, username FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Allow deleting admin users (no restriction)
        // Delete user (trigger will log to DeletedUsersLog)
        await pool.execute('DELETE FROM Users WHERE user_id = ?', [userId]);

        res.json({ 
            message: 'User deleted successfully',
            deletedUser: {
                userId: parseInt(userId),
                role: users[0].role,
                username: users[0].username
            }
        });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all restaurants
router.get('/restaurants', async (req, res) => {
    try {
        const [restaurants] = await pool.execute(
            'SELECT * FROM Restaurants ORDER BY name'
        );

        res.json(restaurants);
    } catch (error) {
        console.error('Restaurants fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status
router.put('/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await pool.execute(
            'UPDATE Orders SET status = ? WHERE order_id = ?',
            [status, orderId]
        );

        res.json({ message: 'Order status updated' });
    } catch (error) {
        console.error('Order status update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate sales report
router.get('/reports', async (req, res) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: 'Start and end dates are required' });
        }

        // Get restaurant sales
        const [restaurants] = await pool.execute(`
            SELECT 
                r.restaurant_id,
                r.name,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0) AS total_revenue,
                COALESCE(AVG(o.total_amount), 0) AS avg_order_value
            FROM Restaurants r
            LEFT JOIN Orders o ON r.restaurant_id = o.restaurant_id
                AND DATE(o.order_date) BETWEEN ? AND ?
            GROUP BY r.restaurant_id, r.name
            ORDER BY total_revenue DESC
        `, [start, end]);

        // Get summary
        const [summary] = await pool.execute(`
            SELECT 
                COUNT(order_id) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(AVG(total_amount), 0) AS avg_order_value
            FROM Orders
            WHERE DATE(order_date) BETWEEN ? AND ?
        `, [start, end]);

        res.json({
            startDate: start,
            endDate: end,
            restaurants,
            summary: summary[0] || { total_orders: 0, total_revenue: 0, avg_order_value: 0 }
        });
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;


