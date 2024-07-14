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
  connectTimeout: 10000 // Increase the connection timeout if needed
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

app.get('/postToConfluence/:applicationName', async (req, res) => {
  const { applicationName } = req.params;
  const query = `
    SELECT *
    FROM maebuildinfo
    WHERE ApplicationName = ${mysql.escape(applicationName)}
    ORDER BY STR_TO_DATE(Date_Time, '%d/%m/%Y %H:%i:%s') DESC
    LIMIT 1
  `;
  
  try {
    const results = await executeQuery(query);
    if (results.length > 0) {
      const dataToPost = results[0];
      await postToConfluence(dataToPost);
      res.json({ message: 'Data posted to Confluence successfully' });
    } else {
      res.status(404).json({ message: 'Build details not found for the application name' });
    }
  } catch (err) {
    console.error('Error fetching build details or posting to Confluence:', err);
    res.status(500).json({ error: 'Error fetching build details or posting to Confluence' });
  }
});

const postToConfluence = async (data) => {
  try {
    const currentVersion = await getConfluencePageVersion();
    const newVersion = currentVersion + 1;

    // Construct the request body for Confluence
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
              <tr>
                <td>${data.ApplicationName || ''}</td>
                <td>${data.TargetEnvironment || ''}</td>
                <td>${data.Version || ''}</td>
                <td>${data.Release || ''}</td>
                <td>${data.JiraTaskId || ''}</td>
                <td>${data.ReleaseNotes || ''}</td>
                <td>${data.Date_Time || ''}</td>
              </tr>
            </table>
          `,
          representation: 'storage'
        }
      }
    };

    // Post the data to Confluence
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
