const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors()); // Middleware
app.disable('etag');

console.log('Server Started..');

const pool = mysql.createPool({
  host: '28.10.146.81',
  user: 'root',
  password: 'T@bleau',
  database: 'mortgages_sv',
  connectionLimit: 10
}).promise();

// Refresh VS file endpoint
app.get('/refreshVSfile', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM vs_switchs');
    const data = JSON.stringify(results);

    fs.writeFile('vsflags.json', data, (err) => {
      if (err) {
        res.status(500).send([]);
      } else {
        res.send({ message: "VSFile JSON file is updated" });
      }
    });
  } catch (error) {
    res.status(500).send([]);
  }
});

// Get VS flags endpoint
app.get('/getvsflags/:envname', (req, res) => {
  const env = req.params.envname;

  try {
    const vsfile = fs.readFileSync('./vsflags.json', 'utf8');
    const jsonData = JSON.parse(vsfile).filter(x => x.Env_flag === env);
    res.send(jsonData);
  } catch (err) {
    res.status(500).send([]);
  }
});

// GET endpoint to fetch all build details
app.get('/mae/getBuild', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM maebuildinfo');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', async (req, res) => {
  const { applicationName } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM maebuildinfo WHERE ApplicationName = ?', [applicationName]);
    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(404).json({ message: 'Build details not found for the application name' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
