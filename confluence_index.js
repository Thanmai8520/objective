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

const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
const auth = 'Bearer NzY5NjUyNTM3MTQ20p5XYOLIJe+GABLVxIkobKJWpv7y'; // Replace with your actual token
const pageId = '2464689130'; // Replace with your Confluence page ID

const getConfluencePageVersion = async () => {
  try {
    const response = await fetch(`${confluenceUrl}/${pageId}?expand=version`, {
      headers: {
        'Authorization': auth
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.version.number;
  } catch (error) {
    console.error('Error fetching Confluence page version:', error);
    throw error;
  }
};

const postToConfluence = async (data) => {
  try {
    const currentVersion = await getConfluencePageVersion();
    const newVersion = currentVersion + 1;

    // Ensure data is an array
    if (!Array.isArray(data)) {
      // Try to convert data to an array if it's not one
      if (data && typeof data === 'object') {
        data = [data]; // Wrap the object in an array
      } else {
        console.error('Data is not an array or an object that can be converted to an array:', data);
        throw new Error('Data is not an array or convertible to an array');
      }
    }

    // Log the data being posted
    console.log('Data being posted to Confluence:', JSON.stringify(data, null, 2));

    let tableRows = data.map(row => `
      <tr>
        <td>${row.ApplicationName || ''}</td>
        <td>${row.TargetEnvironment || ''}</td>
        <td>${row.Version || ''}</td>
        <td>${row.Release || ''}</td>
        <td>${row.JiraTaskId || ''}</td>
        <td>${row.ReleaseNotes || ''}</td>
        <td>${row.Date_Time || ''}</td>
      </tr>
    `).join('');

    // Log the generated table rows
    console.log('Generated table rows:', tableRows);

    const requestBody = {
      version: { number: newVersion },
      title: 'Build Information',
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

    const response = await fetch(`${confluenceUrl}/${pageId}`, {
      method: 'PUT',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
    }

    const result = JSON.parse(text);
    console.log('Confluence response:', result);
    return result; // Return the result if needed
  } catch (error) {
    console.error('Error posting to Confluence:', error);
    throw error; // Throw the error to be handled by the caller
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
  const apiUrl = 'http://localhost:3000/mae/getBuild/demo-app';

  try {
    console.log('Fetching build details from API:', apiUrl);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    console.log('Fetched build details:', results);

    // Log the fetched data
    console.log('Fetched build details (logged):', JSON.stringify(results, null, 2));
    
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
