const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON parsing

console.log("Server Started..");

// Ignore certificates for development purposes only
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

app.disable('etag');

const pool = mysql.createPool({
    host: '28.20.136.141',
    user: 'root',
    password: 'Tibleau',
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

const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
const auth = "Bearer OTEMMTIxNTc3Mzg30ta91VBrtK5WCZ]bsEyQH+mhgqgm"; // Personal access token
const pageId = 2464689130; // Confluence page ID

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
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }
        const result = await response.json();
        return result.version.number;
    } catch (error) {
        console.error('Error fetching page version:', error.message);
        throw error;
    }
};

const getConfluencePageVersion = async () => {
    const url = `${confluenceUrl}/${pageId}?expand=version`;
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': auth
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }
        const result = await response.json();
        return result.version.number;
    } catch (error) {
        console.error('Error fetching Confluence page version:', error.message);
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
        return 0; // Handle undefined, null, or invalid format
    }

    const parts = dateString.split(' ');
    if (parts.length !== 2) {
        console.error("Invalid Date Time format:", dateString);
        return 0; // Handle unexpected format
    }

    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length !== 3 || timeParts.length !== 3) {
        console.error("Invalid Date Time format:", dateString);
        return 0; // Handle unexpected format
    }

    const formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    return formattedDate.getTime(); // Return milliseconds for comparison
};

app.get('/postToConfluence', async (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';

    try {
        const results = await executeQuery(query);
        const latestVersions = getLatestVersions(results);

        console.log(latestVersions);
        if (latestVersions.length > 0) {
            await postToConfluence(latestVersions);
            res.json({ message: 'Data posted to Confluence successfully' });
        } else {
            res.status(404).json({ message: "Build details not found for the application name" });
        }
    } catch (err) {
        console.error('Error fetching build details or posting to Confluence:', err.message);
        res.status(500).json({ error: 'Error fetching build details or posting to Confluence' });
    }
});

const postToConfluence = async (data) => {
    const currentVersion = await getConfluencePageVersion();
    const newVersion = currentVersion + 1;

    const requestBody = {
        version: { number: newVersion },
        title: 'Build Information',
        type: 'page',
        body: {
            storage: {
                value: `<h1>Build Information of the latest details</h1>
                <table id="tableId">
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
                    </tr>
                    `).join('')}
                </table>`,
                representation: 'storage'
            }
        }
    };

    try {
        const response = await fetch(`${confluenceUrl}/${pageId}`, {
            method: 'PUT',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseBody = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${responseBody}`);
        }

        const result = JSON.parse(responseBody);
        console.log('Confluence response:', result);
        return result;
    } catch (error) {
        console.error('Error posting to Confluence:', error.message);
        throw error;
    }
};

app.get("/mae/getBuild", (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';
    executeQuery(query)
        .then(results => res.json(results))
        .catch(err => res.status(500).json({ error: 'Error fetching build details' }));
});

app.get("/mae/getBuild/:applicationName", async (req, res) => {
    const { applicationName } = req.params;
    const query = `SELECT * FROM maebuildinfo WHERE ApplicationName = ? ORDER BY STR_TO_DATE(Date_Time, '%d/%m/%Y %H:%i:%s') DESC`;

    try {
        const results = await executeQuery(query, [applicationName]);
        if (results.length > 0) {
            res.json(results);
        } else {
            res.status(404).json({ message: 'Build details not found for the application name' });
        }
    } catch (err) {
        console.error('Error fetching build details:', err.message);
        res.status(500).json({ error: 'Error fetching build details' });
    }
});

pool.query('SELECT 1', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log("Connected to the database");
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
