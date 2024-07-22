const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fetch = require('node-fetch');
const schedule = require('node-schedule');

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS

console.log('Server Started..');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; // Ignore certificates for development purposes only

app.disable('etag');

const pool = mysql.createPool({
    host: '28.20.136.141',
    user: 'root',
    password: 'T@bieau',
    database: 'mortgages_sv',
    connectionLimit: 10
});

const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content';
const auth = 'Bearer OTEWMTIxMTc3Mzg30ta91VBrtK5WCZlbsEyQH+whgqgm'; // Replace with your actual token
const pageId = '2464689130'; // Replace with your Confluence page ID

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

const getConfluencePageVersion = async (pageId, auth) => {
    const confluenceUrlWithPageId = `${confluenceUrl}/${pageId}?expand=version,body.storage`;

    try {
        const response = await fetch(confluenceUrlWithPageId, {
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
        
        // Add logging to inspect the response structure
        console.log('Confluence Page Response:', result);

        if (!result.version || typeof result.version.number !== 'number') {
            throw new Error('Page version information is missing or invalid.');
        }

        return result;
    } catch (error) {
        console.error('Error fetching Confluence page version:', error);
        throw error;
    }
};

const updateOrInsertTable = (content, data) => {
    const regex = /(<h3[^>]*>\s*<strong>Version Control<\/strong>\s*<\/h3>)([\s\S]*?)(<table[\s\S]*?<\/table>)?/;
    const tableHtml = `
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
        </table>`;

    return content.replace(regex, (match, heading, beforeTable, existingTable) => {
        if (existingTable) {
            return `${heading}${beforeTable}${tableHtml}`;
        } else {
            return `${heading}${tableHtml}`;
        }
};

const postToConfluence = async (data) => {
    try {
        const pageData = await getConfluencePageVersion(pageId, auth);
        const currentVersion = pageData.version.number;
        const content = pageData.body.storage.value;

        const updatedContent = updateOrInsertTable(content, data);
        if (!updatedContent) {
            throw new Error('Version Control heading not found in the Confluence page.');
        }

        const newVersion = currentVersion + 1;

        const requestBody = {
            version: { number: newVersion },
            title: pageData.title,
            type: 'page',
            body: {
                storage: {
                    value: updatedContent,
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
        return 0;
    }

    const parts = dateString.split(' ');
    if (parts.length !== 2) {
        console.error('Invalid Date Time format:', dateString);
        return 0;
    }

    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length !== 3 || timeParts.length !== 3) {
        console.error('Invalid Date Time format:', dateString);
        return 0;
    }

    const formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    return formattedDate.getTime();
};

app.get('/postToConfluence/', async (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';

    try {
        const result = await executeQuery(query);
        const results = getLatestVersions(result);

        if (results.length > 0) {
            await postToConfluence(results);
            res.json({ message: 'Data posted to Confluence successfully' });
        } else {
            res.status(404).json({ message: 'Build details not found for the application name' });
        }
    } catch (err) {
        console.error('Error fetching build details or posting to Confluence:', err);
        res.status(500).json({ error: 'Error fetching build details or posting to Confluence' });
    }
});

app.get('/mae/getBuild', (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';

    executeQuery(query)
        .then(results => res.json(results))
        .catch(err => res.status(500).json({ error: 'Error fetching build details' }));
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
    const { applicationName } = req.params;

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

pool.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database');
    }
});

// Scheduler to automatically post to Confluence every day at 12:00 AM
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const query = 'SELECT * FROM maebuildinfo';
        const result = await executeQuery(query);
        const results = getLatestVersions(result);

        if (results.length > 0) {
            await postToConfluence(results);
            console.log('Daily Confluence update successful.');
        } else {
            console.log('No build details found for daily update.');
        }
    } catch (err) {
        console.error('Error during daily Confluence update:', err);
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
