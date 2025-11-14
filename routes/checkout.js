const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Checkout - Place order with transaction
router.post('/', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const userId = req.user.userId;
        const { restaurant_id, items, payment_type, destination, distance_km } = req.body;

        // Validation
        if (!restaurant_id || !items || !Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invalid order data' });
        }

        // Validate items availability and stock
        let totalAmount = 0;
        for (const item of items) {
            const [menuItems] = await connection.execute(
                'SELECT * FROM MenuItems WHERE item_id = ?',
                [item.itemId]
            );

            if (menuItems.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: `Item ${item.itemId} not found` });
            }

            const menuItem = menuItems[0];
            if (!menuItem.availability || menuItem.stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: `Item ${menuItem.item_name} is unavailable or insufficient stock` 
                });
            }

            totalAmount += menuItem.price * item.quantity;
        }

        // Apply discount if loyalty points used (optional)
        let discount = 0;
        if (req.body.useLoyaltyPoints && req.user.loyaltyPoints >= 100) {
            discount = Math.min(totalAmount * 0.1, req.user.loyaltyPoints / 10); // 10% discount or points/10
            totalAmount -= discount;
        }

        // Create order
        const [orderResult] = await connection.execute(
            'INSERT INTO Orders (user_id, restaurant_id, total_amount, status) VALUES (?, ?, ?, ?)',
            [userId, restaurant_id, totalAmount, 'pending']
        );

        const orderId = orderResult.insertId;

        // Insert order details (triggers will update stock automatically)
        for (const item of items) {
            const [menuItems] = await connection.execute(
                'SELECT price FROM MenuItems WHERE item_id = ?',
                [item.itemId]
            );
            const price = menuItems[0].price;
            const subtotal = price * item.quantity;

            await connection.execute(
                'INSERT INTO OrderDetails (order_id, item_id, quantity, subtotal) VALUES (?, ?, ?, ?)',
                [orderId, item.itemId, item.quantity, subtotal]
            );
        }

        // Create payment record
        await connection.execute(
            'INSERT INTO Payments (order_id, payment_type, amount, status) VALUES (?, ?, ?, ?)',
            [orderId, payment_type || 'card', totalAmount, 'pending']
        );

        // Assign delivery partner if destination provided
        if (destination && distance_km) {
            const [partners] = await connection.execute(
                'SELECT partner_id FROM DeliveryPartner WHERE status = "available" LIMIT 1'
            );

            if (partners.length > 0) {
                const partnerId = partners[0].partner_id;
                await connection.execute(
                    'INSERT INTO Delivery (order_id, destination, partner_id, distance_km, status) VALUES (?, ?, ?, ?, ?)',
                    [orderId, destination, partnerId, distance_km, 'assigned']
                );

                await connection.execute(
                    'UPDATE DeliveryPartner SET status = "busy" WHERE partner_id = ?',
                    [partnerId]
                );
            }
        }

        // Update order status to confirmed
        await connection.execute(
            'UPDATE Orders SET status = "confirmed" WHERE order_id = ?',
            [orderId]
        );

        // Update payment status to completed
        await connection.execute(
            'UPDATE Payments SET status = "completed" WHERE order_id = ?',
            [orderId]
        );

        // Commit transaction
        await connection.commit();

        res.status(201).json({
            message: 'Order placed successfully',
            orderId,
            totalAmount
        });

    } catch (error) {
        await connection.rollback();
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Order placement failed', details: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;


