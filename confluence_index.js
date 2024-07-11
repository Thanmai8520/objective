import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import mysql from 'mysql';
import fs from 'fs';

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

const postToConfluence = async (data) => {
  if (!Array.isArray(data)) {
    console.error('Expected data to be an array, but got:', typeof data, data);
    throw new Error('Data is not an array');
  }

  const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
  const auth = 'Bearer NzY5NjUyNTM3MTQ20p5XYOLIJe+GABLVxIkobKJWpv7y'; // Replace with your actual token
  const pageId = '2464689130'; // Replace with your Confluence page ID

  // Convert the data to Confluence storage format
  let tableRows = data.map(row => `
    <tr>
      <td>${row.ApplicationName}</td>
      <td>${row.TargetEnvironment}</td>
      <td>${row.Version}</td>
      <td>${row.Release}</td>
      <td>${row.JiraTaskId}</td>
      <td>${row.ReleaseNotes}</td>
      <td>${row.Date_Time}</td>
    </tr>
  `).join('');

  const requestBody = {
    version: { number: 3 }, // Set the version number statically to 3
    title: 'Build Information', // Optionally update the title if needed
    type: 'page',
    body: {
      storage: {
        value: `
          <h1>Build Information</h1>
          <table>
            <tr>
              <th>Application Name</th>
              <th>Target Environment</th>
              <th>Version</th>
              <th>Release</th>
              <th>Jira Task ID</th>
              <th>Release Notes</th>
              <th>Date and Time</th>
            </tr>
            ${tableRows}
          </table>
        `,
        representation: 'storage'
      }
    }
  };

  console.log('Posting to Confluence with request body:', requestBody);

  try {
    const response = await fetch(`${confluenceUrl}/${pageId}`, {
      method: 'PUT', // Use 'PUT' to update an existing page
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    console.log('Confluence response text:', text); // Log the raw response text

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
    }

    const result = JSON.parse(text); // Attempt to parse JSON response
    console.log('Confluence response:', result); // Log the parsed response
  } catch (error) {
    console.error('Error posting to Confluence:', error);
  }
};

// Utility function to execute a query and get results
const executeQuery = (query, callback) => {
  pool.query(query, (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Example endpoint to fetch data from /mae/getBuild and post to Confluence
app.get('/postToConfluence', async (req, res) => {
  const apiUrl = 'http://localhost:3000/mae/getBuild/demo-app'; // Replace with your actual API endpoint

  try {
    console.log('Fetching build details from API:', apiUrl);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    console.log('Fetched build details:', results);
    await postToConfluence(results);
    res.json({ message: 'Data posted to Confluence successfully' });
  } catch (error) {
    console.error('Error fetching build details or posting to Confluence:', error);
    res.status(500).json({ error: 'Error fetching build details or posting to Confluence' });
  }
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
