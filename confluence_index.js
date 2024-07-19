const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS

console.log('Server Started..');

// Ignore certificates for development purposes only
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

app.disable('etag');

const pool = mysql.createPool({
  host: '28.20.136.141',
  user: 'root',
  password: 'T@bieau',
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

const fetchPageVersion = async (pageId, auth) => {
  const confluenceUrl = `https://confluence.barcapint.com/rest/api/content/${pageId}?expand=body.storage,version`;

  try {
    const response = await fetch(confluenceUrl, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
    }

    const result = await response.json();
    if (result.body && result.body.storage) {
      return { version: result.version.number, content: result.body.storage.value };
    } else {
      throw new Error('Unexpected response structure from Confluence');
    }
  } catch (error) {
    console.error('Error fetching page version:', error);
    throw error;
  }
};

const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
const auth = 'Bearer OTEWMTIxMTc3Mzg30ta91VBrtK5WCZlbsEyQH+whgqgm'; // Replace with your actual token
const pageId = '2464689130'; // Replace with your Confluence page ID

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
  if (!dateString || typeof dateString !== 'string') {
    console.error('Invalid Date Time format:', dateString);
    return 0; // Handle undefined, null, or invalid format
  }

  const parts = dateString.split(' ');
  if (parts.length !== 2) {
    console.error('Invalid Date Time format:', dateString);
    return 0; // Handle unexpected format
  }

  const dateParts = parts[0].split('/');
  const timeParts = parts[1].split(':');
  if (dateParts.length !== 3 || timeParts.length !== 3) {
    console.error('Invalid Date Time format:', dateString);
    return 0; // Handle unexpected format
  }

  const formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
  return formattedDate.getTime(); // Return milliseconds for comparison
};

app.get('/postToConfluence', async (req, res) => {
  const query = 'SELECT * FROM maebuildinfo';

  try {
    const results = await executeQuery(query);
    const latestResults = getLatestVersions(results);

    if (latestResults.length > 0) {
      await postToConfluence(latestResults);
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
    const { version, content } = await fetchPageVersion(pageId, auth);
    const newVersion = version + 1;

    // Ensure the content is a string before using indexOf
    if (typeof content !== 'string') {
      throw new Error('Fetched page content is not a string');
    }

    // Locate the "Version Control" section
    const sectionIndex = content.indexOf('<h3 style=""><strong>Version Control</strong></h3>');
    if (sectionIndex === -1) {
      throw new Error('Could not find the "Version Control" section in the Confluence page.');
    }

    // Locate the table after "Version Control"
    const tableStartIndex = content.indexOf('<table', sectionIndex);
    const tableEndIndex = content.indexOf('</table>', tableStartIndex) + 8;
    if (tableStartIndex === -1 || tableEndIndex === -1) {
      throw new Error('Could not find the table after the "Version Control" section.');
    }

    // Generate the new table content
    const newTableContent = `
      <table>
        <tr>
          <th>Application Name</th>
          <th>CIT Version</th>
          <th>SIT Version</th>
          <th>OAT</th>
          <th>VPT</th>
          <th>Prod Version</th>
          <th>Release</th>
          <th>Jira Task ID</th>
          <th>Release Notes</th>
          <th>Date and Time</th>
        </tr>
        ${data.map(item => `
          <tr>
            <td>${item.ApplicationName || ''}</td>
            <td>${item.CIT_Version || ''}</td>
            <td>${item.SIT_Version || ''}</td>
            <td>${item.OAT || ''}</td>
            <td>${item.VPT || ''}</td>
            <td>${item.Prod_Version || ''}</td>
            <td>${item.Release || ''}</td>
            <td>${item.JiraTaskId || ''}</td>
            <td>${item.ReleaseNotes || ''}</td>
            <td>${item.Date_Time || ''}</td>
          </tr>`).join('')}
      </table>
    `;

    // Replace the old table with the new one
    const updatedContent = content.substring(0, tableStartIndex) + newTableContent + content.substring(tableEndIndex);

    // Construct the request body for Confluence
    const requestBody = {
      version: { number: newVersion },
      title: 'Build Information',
      type: 'page',
      body: {
        storage: {
          value: updatedContent,
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
    }

    const result = await response.json();
    console.log('Confluence response:', result);
    return result; // Return the result if needed
  } catch (error) {
    console.error('Error posting to Confluence:', error);
    throw error; // Throw the error to be handled by the caller
  }
};

app.get('/mae/getBuild', (req, res) => {
  const query = 'SELECT * FROM maebuildinfo';

  executeQuery(query)
    .then(results => res.json(results))
    .catch(err => res.status(500).json({ error: 'Error fetching build details' }));
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
  const { applicationName } = req.params;
  const query = `SELECT * FROM maebuildinfo WHERE ApplicationName = ? ORDER BY STR_TO_DATE(Date_Time, '%d/%m/%Y %H:%i:%s') DESC`;

  executeQuery(query, [applicationName])
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

pool.query('SELECT 1', (err, results) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the database');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
