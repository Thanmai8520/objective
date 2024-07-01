const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());

// MySQL pool connection
var pool = mysql.createPool({
    host: '28.10.146.81',
    user: 'root',
    password: 'T@bleau',
    database: 'mortgages_sv',
    connectionLimit: 10
});

// Utility function to execute a query and get results
const executeQuery = (query, callback) => {
    pool.query(query, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results);
    });
};

// GET endpoint to fetch all build details
app.get('/mae/getBuild', (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';
    executeQuery(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching build details' });
        } else {
            res.json(results);
        }
    });
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
    const { applicationName } = req.params;
    const query = `SELECT * FROM maebuildinfo WHERE ApplicationName = ${mysql.escape(applicationName)}`;
    executeQuery(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching build details' });
        } else {
            if (results.length > 0) {
                res.json(results);
            } else {
                res.status(404).json({ message: 'Build details not found for the application name' });
            }
        }
    });
});

// Test database connection
pool.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
