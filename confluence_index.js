const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS
app.disable('etag');

// MySQL connection pool setup
const pool = mysql.createPool({
    host: '28.20.136.141',
    user: 'root',
    password: 'Tibleau',
    database: 'mortgages_sv',
    connectionLimit: 10
});

// Helper function to execute SQL queries
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

// Confluence details
const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
const auth = 'Bearer OTEMMTIxNTc3Mzg30ta91VBrtK5WCZ]bsEyQH+mhgqgm'; // Personal access token
const pageId = 2464689130; // Confluence page ID

// Fetch current page version from Confluence
const fetchPageVersion = async (pageId, auth) => {
    const url = `${confluenceUrl}/${pageId}`;
    try {
        const response = await fetch(url, {
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
        return result.version.number;
    } catch (error) {
        console.error('Error fetching page version:', error);
        throw error;
    }
};

// Update Confluence page with new data
const postToConfluence = async (data) => {
    try {
        const currentVersion = await fetchPageVersion(pageId, auth);
        const newVersion = currentVersion + 1;

        // Construct the request body for Confluence
        const requestBody = {
            version: { number: newVersion },
            title: 'Build Information',
            type: 'page',
            body: {
                storage: {
                    value: `
                        <h1>Build Information of the latest details</h1>
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
        return result;
    } catch (error) {
        console.error('Error posting to Confluence:', error);
        throw error;
    }
};

// Endpoint to fetch and post build details to Confluence
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

// Function to get latest versions of build details
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

// Helper function to convert date string to milliseconds for comparison
const convertDate = (dateString) => {
    if (typeof dateString !== 'string') {
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

// Endpoint to fetch build details by application name
app.get('/mae/getBuild', async (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';
    try {
        const results = await executeQuery(query);
        res.json(results);
    } catch (err) {
        console.error('Error fetching build details:', err);
        res.status(500).json({ error: 'Error fetching build details' });
    }
});

app.get('/mae/getBuild/:applicationName', async (req, res) => {
    const { applicationName } = req.params;
    const query = `SELECT * FROM maebuildinfo WHERE ApplicationName = ${mysql.escape(applicationName)} ORDER BY STR_TO_DATE(Date_Time, '%d/%m/%Y %H:%i:%s') DESC`;
    try {
        const results = await executeQuery(query);
        if (results.length > 0) {
            res.json(results);
        } else {
            res.status(404).json({ message: 'Build details not found for the application name' });
        }
    } catch (err) {
        console.error('Error fetching build details:', err);
        res.status(500).json({ error: 'Error fetching build details' });
    }
});

// Test MySQL connection
pool.query('SELECT 1', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
