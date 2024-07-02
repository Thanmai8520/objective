const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(cors()); // middleware

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

// Function to post data to Confluence
const postToConfluence = async (data) => {
    const confluenceUrl = 'https://your-confluence-site.atlassian.net/wiki/rest/api/content';
    const auth = 'Basic ' + Buffer.from('your-email@example.com:your-api-token').toString('base64');
    const pageId = '123456'; // Replace with your Confluence page ID
    const spaceKey = 'YOUR_SPACE_KEY'; // Replace with your Confluence space key

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
        version: { number: 2 }, // Update the version number for existing pages
        title: 'Build Information',
        type: 'page',
        space: { key: spaceKey },
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

    try {
        const response = await fetch(`${confluenceUrl}/${pageId}`, {
            method: 'PUT', // Use 'POST' to create a new page or 'PUT' to update an existing page
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        console.log('Confluence response:', result);
    } catch (error) {
        console.error('Error posting to Confluence:', error);
    }
};

// Example endpoint to trigger posting to Confluence
app.get('/postToConfluence', (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';
    executeQuery(query, async (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching build details' });
        } else {
            await postToConfluence(results);
            res.json({ message: 'Data posted to Confluence successfully' });
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
