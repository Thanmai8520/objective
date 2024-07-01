const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const app = express();
const port = 3000;

app.use(cors());

const pool = mysql.createPool({
    host: '28.10.146.81',
    user: 'root',
    password: 'T@bleau',
    database: 'mortgages_sv',
    connectionLimit: 10
});

// GET endpoint to fetch all build details
app.get('/mae/getBuild', (req, res) => {
    pool.query('SELECT * FROM maebuildinfo', (err, results) => {
        if (err) {
            console.error('Error fetching build details:', err);
            res.status(500).json({ error: 'Error fetching build details' });
        } else {
            res.json(results);
        }
    });
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
    const { applicationName } = req.params;
    pool.query('SELECT * FROM maebuildinfo WHERE ApplicationName = ?', [applicationName], (err, results) => {
        if (err) {
            console.error(`Error fetching build details for ${applicationName}:`, err);
            res.status(500).json({ error: `Error fetching build details for ${applicationName}` });
        } else if (results.length > 0) {
            res.json(results);
        } else {
            res.status(404).json({ message: 'Build details not found for the application name' });
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
