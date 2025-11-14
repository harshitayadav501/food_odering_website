const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [orders] = await pool.execute(`
            SELECT 
                o.*,
                r.name AS restaurant_name,
                r.address AS restaurant_address,
                p.payment_type,
                p.status AS payment_status
            FROM Orders o
            INNER JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
            LEFT JOIN Payments p ON o.order_id = p.order_id
            WHERE o.user_id = ?
            ORDER BY o.order_date DESC
        `, [userId]);

        // Get order details for each order
        for (const order of orders) {
            const [details] = await pool.execute(`
                SELECT 
                    od.*,
                    mi.item_name,
                    mi.image_url,
                    mi.price
                FROM OrderDetails od
                INNER JOIN MenuItems mi ON od.item_id = mi.item_id
                WHERE od.order_id = ?
            `, [order.order_id]);

            order.items = details;
        }

        res.json(orders);
    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single order
router.get('/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        const [orders] = await pool.execute(`
            SELECT 
                o.*,
                r.name AS restaurant_name,
                r.address AS restaurant_address,
                p.payment_type,
                p.status AS payment_status,
                d.destination,
                d.distance_km,
                d.status AS delivery_status,
                dp.name AS delivery_partner
            FROM Orders o
            INNER JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
            LEFT JOIN Payments p ON o.order_id = p.order_id
            LEFT JOIN Delivery d ON o.order_id = d.order_id
            LEFT JOIN DeliveryPartner dp ON d.partner_id = dp.partner_id
            WHERE o.order_id = ? AND o.user_id = ?
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        const [details] = await pool.execute(`
            SELECT 
                od.*,
                mi.item_name,
                mi.image_url,
                mi.price,
                mi.category
            FROM OrderDetails od
            INNER JOIN MenuItems mi ON od.item_id = mi.item_id
            WHERE od.order_id = ?
        `, [orderId]);

        order.items = details;

        res.json(order);
    } catch (error) {
        console.error('Order fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Get all orders
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [orders] = await pool.execute(`
            SELECT 
                o.*,
                u.username,
                u.email,
                r.name AS restaurant_name,
                p.payment_type,
                p.status AS payment_status
            FROM Orders o
            INNER JOIN Users u ON o.user_id = u.user_id
            INNER JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
            LEFT JOIN Payments p ON o.order_id = p.order_id
            ORDER BY o.order_date DESC
        `);

        res.json(orders);
    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;


