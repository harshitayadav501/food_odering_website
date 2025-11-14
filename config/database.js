const mysql = require("mysql2/promise");
const path = require("path");

// Load environment variables directly
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Debug: Check if env vars are loaded
console.log("🔍 Debug - DB Environment Variables:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "MISSING");
console.log("DB_NAME:", process.env.DB_NAME);

// Validate environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error("❌ Missing required database environment variables:", missingVars);
    process.exit(1);
}

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test MySQL connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ MySQL Connected Successfully!");
        connection.release();
    } catch (error) {
        console.error("❌ MySQL Connection Failed:", error.message);
        console.error("💡 Check if:");
        console.error("   - MySQL server is running");
        console.error("   - Database 'food_ordering_system' exists");
        console.error("   - Username and password are correct");
        console.error("   - User has proper privileges");
        process.exit(1);
    }
})();

module.exports = pool;