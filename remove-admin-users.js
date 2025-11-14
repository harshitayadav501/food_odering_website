const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function removeAdminUsers() {
    let connection;
    
    try {
        // Connect to MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'food_ordering_system',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ Connected to MySQL server');

        // Get admin users before deletion
        const [adminUsers] = await connection.execute(
            'SELECT user_id, username, email FROM Users WHERE role = ?',
            ['admin']
        );

        if (adminUsers.length === 0) {
            console.log('ℹ️  No admin users found in the database');
            return;
        }

        console.log(`📋 Found ${adminUsers.length} admin user(s):`);
        adminUsers.forEach(user => {
            console.log(`   - ${user.username} (${user.email})`);
        });

        // Delete admin users
        const [result] = await connection.execute(
            'DELETE FROM Users WHERE role = ?',
            ['admin']
        );

        console.log(`✅ Successfully removed ${result.affectedRows} admin user(s) from the database`);

    } catch (error) {
        console.error('❌ Error removing admin users:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

removeAdminUsers();

