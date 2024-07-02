const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS

console.log('Server Started..');

app.disable('etag');

const pool = mysql.createPool({
  host: '28.10.146.81',
  user: 'root',
  password: 'T@bleau',
  database: 'mortgages_sv',
  connectionLimit: 10,
  connectTimeout: 10000 // Increase the connection timeout
});

app.get('/refreshVSfile', (req, res) => {
  try {
    pool.query('SELECT * FROM vs_switchs', function (err, results) {
      if (err) {
        return res.status(500).send([]);
      }
      let data = JSON.stringify(results);
      fs.writeFile('vsflags.json', data, function (err) {
        if (err) {
          return res.status(500).send([]);
        }
        res.send({ "VSFile": "JSON file is updated" });
      });
    });
  } catch (error) {
    res.status(500).send([]);
  }
});

app.get('/getvsflags/:envname', (req, res) => {
  let env = req.params.envname;
  try {
    const vsfile = fs.readFileSync('./vsflags.json', 'utf8');
    const jsonData = JSON.parse(vsfile).filter(x => x.Env_flag === env);
    res.send(jsonData);
  } catch (err) {
    res.status(500).send([]);
  }
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
