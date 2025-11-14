const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function setupTriggersAndViews() {
    let connection;
    
    try {
        // Connect to MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'food_ordering_system',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL server');

        // Process triggers script - remove DELIMITER commands and split by //
        const triggersPath = path.resolve(__dirname, '../database/exp10_triggers.sql');
        if (fs.existsSync(triggersPath)) {
            console.log('📝 Processing triggers...');
            let triggersScript = fs.readFileSync(triggersPath, 'utf8');
            
            // Remove DELIMITER commands
            triggersScript = triggersScript.replace(/DELIMITER\s+[^\n]*\n/g, '');
            
            // Split by // and process each trigger
            const triggerStatements = triggersScript.split('//').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
            
            for (const statement of triggerStatements) {
                if (statement && !statement.startsWith('--') && statement.length > 10) {
                    try {
                        await connection.query(statement);
                    } catch (err) {
                        // Skip if trigger already exists
                        if (err.code !== 'ER_TRG_ALREADY_EXISTS') {
                            console.warn('⚠️  Trigger creation warning:', err.message);
                        }
                    }
                }
            }
            console.log('✅ Triggers processed successfully');
        }

        // Process stored procedures script
        const proceduresPath = path.resolve(__dirname, '../database/exp9_stored_procedures.sql');
        if (fs.existsSync(proceduresPath)) {
            console.log('📝 Processing stored procedures...');
            let proceduresScript = fs.readFileSync(proceduresPath, 'utf8');
            
            // Remove DELIMITER commands
            proceduresScript = proceduresScript.replace(/DELIMITER\s+[^\n]*\n/g, '');
            
            // Split by // and process each procedure
            const procedureStatements = proceduresScript.split('//').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
            
            for (const statement of procedureStatements) {
                if (statement && !statement.startsWith('--') && statement.length > 10) {
                    try {
                        await connection.query(statement);
                    } catch (err) {
                        // Skip if procedure already exists
                        if (err.code !== 'ER_SP_ALREADY_EXISTS') {
                            console.warn('⚠️  Procedure creation warning:', err.message);
                        }
                    }
                }
            }
            console.log('✅ Stored procedures processed successfully');
        }

        // Process views script - views don't use DELIMITER, so we can execute directly
        const viewsPath = path.resolve(__dirname, '../database/exp8_views.sql');
        if (fs.existsSync(viewsPath)) {
            console.log('📝 Processing views...');
            let viewsScript = fs.readFileSync(viewsPath, 'utf8');
            
            // Remove DELIMITER if present
            viewsScript = viewsScript.replace(/DELIMITER\s+[^\n]*\n/g, '');
            
            // Split by semicolon but keep CREATE VIEW statements together
            const statements = viewsScript
                .split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--') && s.length > 10);
            
            for (const statement of statements) {
                try {
                    await connection.query(statement + ';');
                } catch (err) {
                    // Skip if view already exists
                    if (err.code !== 'ER_TABLE_EXISTS_ERROR' && !err.message.includes('already exists')) {
                        console.warn('⚠️  View creation warning:', err.message);
                    }
                }
            }
            console.log('✅ Views processed successfully');
        }

        console.log('\n🎉 All triggers, stored procedures, and views setup completed!');

    } catch (error) {
        console.error('❌ Error setting up triggers/views:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupTriggersAndViews();

