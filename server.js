
require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// 🔥 Load MySQL connection BEFORE routes
const pool = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/menu", require("./routes/menu"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/checkout", require("./routes/checkout"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Food Ordering API is running",
        database: "Connected"
    });
});

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "Food Ordering System API",
        version: "1.0.0",
        endpoints: {
            auth: "/api/auth",
            menu: "/api/menu",
            cart: "/api/cart",
            checkout: "/api/checkout",
            orders: "/api/orders",
            admin: "/api/admin",
        },
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at → http://localhost:${PORT}`);
    console.log(`📝 API Docs available → http://localhost:${PORT}`);
});
