import express from 'express';
import cors from 'cors';
import mysql from 'mysql';
import fetch from 'node-fetch';

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

const executeQuery = (query) => {
    return new Promise((resolve, reject) => {
        pool.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

const fetch = require('node-fetch');

const postToConfluence = async (data) => {
    const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
    const auth = 'Bearer NzY5NjUyNTM3MTQ20p5XYOLIJe+GABLVxIkobKJWpv7y'; // Replace with your actual token
    const pageId = '2464689130'; // Replace with your Confluence page ID
    const spaceKey = 'viewspace.action?key=~G01515269'; // Replace with your Confluence space key

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

        const text = await response.text();
        console.log('Confluence response text:', text); // Log the raw response text

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = JSON.parse(text); // Attempt to parse JSON response
        console.log('Confluence response:', result); // Log the parsed response
    } catch (error) {
        console.error('Error posting to Confluence:', error);
    }
};


// Example endpoint to trigger posting to Confluence
app.get('/postToConfluence', async (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';
    try {
        const results = await executeQuery(query);
        await postToConfluence(results);
        res.json({ message: 'Data posted to Confluence successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching build details or posting to Confluence' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
