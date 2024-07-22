const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fetch = require('node-fetch');

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
    const confluenceUrlWithPageId = `${confluenceUrl}/${pageId}?expand=version`;

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
        return result.version.number;
    } catch (error) {
        console.error('Error fetching Confluence page version:', error);
        throw error;
    }
};

const getConfluencePageContent = async (pageId, auth) => {
    const confluenceUrlWithPageId = `${confluenceUrl}/${pageId}?expand=body.storage`;

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
        return result.body.storage.value;
    } catch (error) {
        console.error('Error fetching Confluence page content:', error);
        throw error;
    }
};

const updateConfluencePageContent = async (pageId, auth, newContent, newVersion) => {
    const confluenceUrlWithPageId = `${confluenceUrl}/${pageId}`;

    const requestBody = {
        version: { number: newVersion },
        title: 'Build Information',
        type: 'page',
        body: {
            storage: {
                value: newContent,
                representation: 'storage'
            }
        }
    };

    try {
        const response = await fetch(confluenceUrlWithPageId, {
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
        return result;
    } catch (error) {
        console.error('Error updating Confluence page content:', error);
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

app.get('/postToConfluence/', async (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';

    try {
        const result = await executeQuery(query);
        const results = getLatestVersions(result);

        console.log(results);

        if (results.length > 0) {
            const dataToPost = results;
            await postToConfluence(dataToPost);

            res.json({ message: 'Data posted to Confluence successfully' });
        } else {
            res.status(404).json({ message: 'Build details not found for the application name' });
        }
    } catch (err) {
        console.error('Error fetching build details or posting to confluence:', err);
        res.status(500).json({ error: 'Error fetching build details or posting to confluence' });
    }
});

const postToConfluence = async (data) => {
    try {
        const currentVersion = await getConfluencePageVersion(pageId, auth);
        const newVersion = currentVersion + 1;
        const currentContent = await getConfluencePageContent(pageId, auth);

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

        const newContent = updateOrInsertTable(currentContent, tableHtml, 'Version Control');
        await updateConfluencePageContent(pageId, auth, newContent, newVersion);

    } catch (error) {
        console.error('Error posting to Confluence:', error);
        throw error;
    }
};

const updateOrInsertTable = (content, tableHtml, heading) => {
    const headingRegex = new RegExp(`<h3[^>]*>${heading}</h3>`, 'i');
    const tableRegex = new RegExp(`<table[^>]*>.*?<\\/table>`, 'is');

    let newContent = content;

    if (headingRegex.test(content)) {
        const headingIndex = content.search(headingRegex);

        const contentAfterHeading = content.substring(headingIndex);
        if (tableRegex.test(contentAfterHeading)) {
            newContent = content.replace(tableRegex, tableHtml);
        } else {
            newContent = content.replace(headingRegex, `$&${tableHtml}`);
        }
    } else {
        newContent = `${content}<h3><strong>${heading}</strong></h3>${tableHtml}`;
    }

    return newContent;
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
