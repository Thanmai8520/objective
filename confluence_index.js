const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

app.use(cors()); // Enable CORS

console.log("Server Started..");

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; // Ignore certificates for development purposes only

app.disable('etag');

const pool = mysql.createPool({
  host: '28.20.136.141',
  user: 'root',
  password: 'Tableau',
  database: 'mortgages_sv',
  connectionLimit: 10
});

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

const fetchPageContent = async (pageId, auth) => {
  const confluenceUrl = `https://confluence.barcapint.com/rest/api/content/${pageId}?expand=body.storage`;
  try {
    const response = await fetch(confluenceUrl, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching page content:', error);
    throw error;
  }
};

const updateConfluencePage = async (pageId, auth, newContent) => {
  const confluenceUrl = `https://confluence.barcapint.com/rest/api/content/${pageId}`;
  try {
    const response = await fetch(confluenceUrl, {
      method: 'PUT',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newContent)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating Confluence page:', error);
    throw error;
  }
};

const getLatestVersions = (data) => {
  const latestVersionsMap = new Map();

  data.forEach(item => {
    const key = `${item.ApplicationName}-${item.TargetEnvironment}`;
    const existingItem = latestVersionsMap.get(key);

    if (!existingItem || convertDate(item.Date_Time) > convertDate(existingItem.Date_Time)) {
      latestVersionsMap.set(key, item);
    }
  });

  return Array.from(latestVersionsMap.values()).sort((a, b) => convertDate(b.Date_Time) - convertDate(a.Date_Time));
};

const convertDate = (dateString) => {
  if (typeof dateString !== 'string') {
    console.error("Invalid Date Time format:", dateString);
    return 0;
  }

  const parts = dateString.split(' ');
  if (parts.length !== 2) {
    console.error("Invalid Date Time format:", dateString);
    return 0;
  }

  const dateParts = parts[0].split('/');
  const timeParts = parts[1].split(':');
  if (dateParts.length !== 3 || timeParts.length !== 3) {
    console.error("Invalid Date Time format:", dateString);
    return 0;
  }

  const formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
  return formattedDate.getTime();
};

const postToConfluence = async (data) => {
  const pageId = 2464689130; // Your Confluence page ID
  const auth = "Bearer OTEMMTIxNTc3Mzg0NTAwMTE1OGVqDW+xRrFsbEyQH+mhgqgm"; // Personal access token

  try {
    const pageContent = await fetchPageContent(pageId, auth);
    const currentVersion = pageContent.version.number;

    const newVersion = currentVersion + 1; // Increment version

    const requestBody = {
      version: { number: newVersion },
      title: 'Build Information',
      type: 'page',
      body: {
        storage: {
          value: `
            <h1>Build Information of the latest details</h1>
            <h3><strong>Version Details</strong></h3>
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
              ${data.map(item => `
                <tr>
                  <td>${item.ApplicationName || ''}</td>
                  <td>${item.TargetEnvironment || ''}</td>
                  <td>${item.Version || ''}</td>
                  <td>${item.Release || ''}</td>
                  <td>${item.JiraTaskId || ''}</td>
                  <td>${item.ReleaseNotes || ''}</td>
                  <td>${item.Date_Time || ''}</td>
                </tr>
              `).join('')}
            </table>
          `,
          representation: 'storage'
        }
      }
    };

    return await updateConfluencePage(pageId, auth, requestBody);
  } catch (error) {
    console.error('Error posting to Confluence:', error);
    throw error;
  }
};

app.get('/postToConfluence', async (req, res) => {
  const query = 'SELECT * FROM maebuildinfo';
  try {
    const results = await executeQuery(query);
    const latestVersions = getLatestVersions(results);

    if (latestVersions.length > 0) {
      await postToConfluence(latestVersions);
      res.json({ message: 'Data posted to Confluence successfully' });
    } else {
      res.status(404).json({ message: 'Build details not found for the application name' });
    }
  } catch (err) {
    console.error('Error fetching build details or posting to Confluence:', err);
    res.status(500).json({ error: 'Error fetching build details or posting to Confluence' });
  }
});

app.get("/mae/getBuild", (req, res) => {
  const query = 'SELECT * FROM maebuildinfo';
  executeQuery(query)
    .then(results => res.json(results))
    .catch(err => res.status(500).json({ error: 'Error fetching build details' }));
});

app.get("/mae/getBuild/:applicationName", (req, res) => {
  const applicationName = req.params.applicationName;
  const query = `SELECT * FROM maebuildinfo WHERE ApplicationName = ${mysql.escape(applicationName)} ORDER BY STR_TO_DATE(Date_Time, '%d/%m/%Y %H:%i:%s') DESC`;
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

pool.query('SELECT 1', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log("Connected to the database");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
