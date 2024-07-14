const express = require('express');
const cors = require('cors');
const mysql = require('mysql');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS

// MySQL database configuration
const pool = mysql.createPool({
  host: '28.10.146.81',
  user: 'root',
  password: 'T@bleau',
  database: 'mortgages_sv',
  connectionLimit: 10,
  connectTimeout: 10000 // Increase the connection timeout if needed
});

// Utility function to execute MySQL queries
const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
  const { applicationName } = req.params;
  const query = `
    SELECT *
    FROM maebuildinfo
    WHERE ApplicationName = ${mysql.escape(applicationName)}
    ORDER BY STR_TO_DATE(Date_Time, '%d/%m/%Y %H:%i:%s') DESC
  `;
  
  executeQuery(query)
    .then(results => {
      if (results.length > 0) {
        res.json(results);
      } else {
        res.status(404).json({ message: 'Build details not found for the application name' });
      }
    })
    .catch(err => {
      console.error('Error fetching build details:', err);
      res.status(500).json({ error: 'Error fetching build details' });
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
