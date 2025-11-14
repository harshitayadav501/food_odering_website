const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function setupDatabase() {
    let connection;
    
    try {
        // Connect to MySQL (without specifying database first)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL server');

        // Create database if it doesn't exist
        const dbName = process.env.DB_NAME || 'food_ordering_system';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database '${dbName}' ready`);

        // Use the database
        await connection.query(`USE \`${dbName}\``);

        // Read and execute DDL script
        const ddlPath = path.resolve(__dirname, '../database/exp1_ddl.sql');
        const ddlScript = fs.readFileSync(ddlPath, 'utf8');
        
        console.log('📝 Creating tables...');
        await connection.query(ddlScript);
        console.log('✅ Tables created successfully');

        // Note: Triggers, stored procedures, and views use DELIMITER which doesn't work with mysql2
        // These need to be run manually via MySQL command line if needed
        // For now, we'll skip them as they're not essential for basic functionality
        console.log('ℹ️  Note: Triggers, stored procedures, and views are skipped (require DELIMITER)');
        console.log('   You can run them manually via MySQL command line if needed');

        // Read and execute initial data script
        const initDataPath = path.resolve(__dirname, '../database/init_data.sql');
        if (fs.existsSync(initDataPath)) {
            const initDataScript = fs.readFileSync(initDataPath, 'utf8');
            console.log('📝 Inserting initial data...');
            await connection.query(initDataScript);
            console.log('✅ Initial data inserted successfully');
        }

        console.log('\n🎉 Database setup completed successfully!');
        console.log('You can now start the server with: npm start or nodemon server.js');

    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDatabase();

