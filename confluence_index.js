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

const fetchPageVersion = async (pageId, auth) => {
    const confluenceUrl = `https://confluence.barcapint.com/rest/api/content/${pageId}?expand=version`;

    try {
        const response = await fetch(confluenceUrl, {
            method: 'GET',
            headers: {
                "Authorization": auth,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();
        return result.version.number; // Return the current version number
    } catch (error) {
        console.error('Error fetching page version:', error);
        throw error;
    }
};

const confluenceUrl = 'https://confluence.barcapint.com/rest/api/content/';
const auth = "Bearer OTETT330a91VertxScZIbsEyQH+shgaga"; // Replace with your actual token
const pageId = "2464689130"; // Replace with your Confluence page ID

const getConfluencePageVersion = async () => {
    try {
        const response = await fetch(`${confluenceUrl}/${pageId}?expand=version`, {
            headers: {
                "Authorization": auth
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.version.number;
    } catch (error) {
        console.error("Error fetching Confluence page version:", error);
        throw error;
    }
};

const getLatestVersions = (data) => {
    const latestVersions = new Map();

    data.forEach(item => {
        const key = `${item.ApplicationName}-${item.TargetEnvironment}`;
        const existingItem = latestVersions.get(key);

        if (!existingItem || convertDate(item.Date_Time) > convertDate(existingItem.Date_Time)) {
            latestVersions.set(key, item);
        }
    });

    return Array.from(latestVersions.values()).sort((a, b) => convertDate(b.Date_Time) - convertDate(a.Date_Time));
};

const convertDate = (dateString) => {
    if (typeof dateString !== 'string') {
        console.error("Invalid Date Time format:", dateString);
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

const postToConfluence = async (data) => {
    try {
        const currentVersion = await getConfluencePageVersion();
        const newVersion = currentVersion + 1;

        // Fetch the current content of the Confluence page
        const pageResponse = await fetch(`${confluenceUrl}/${pageId}?expand=body.storage`, {
            headers: {
                "Authorization": auth,
                "Content-Type": "application/json"
            }
        });

        if (!pageResponse.ok) {
            throw new Error(`HTTP error! status: ${pageResponse.status}`);
        }

        const pageResult = await pageResponse.json();
        const existingContent = pageResult.body.storage.value;

        // Find the index of the section where the table needs to be inserted
        const sectionStart = '<h3 style=""><strong>Version Control</strong></h3>';
        const insertionPoint = existingContent.indexOf(sectionStart);

        if (insertionPoint === -1) {
            throw new Error('Section "Version Control" not found in the page.');
        }

        // Construct the new content to be inserted
        const newTable = `
            <h3 style=""><strong>Version Control</strong></h3>
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
                    </tr>
                `).join('')}
            </table>
        `;

        // Insert the new content before the existing content
        const updatedContent = existingContent.slice(0, insertionPoint + sectionStart.length) + newTable + existingContent.slice(insertionPoint + sectionStart.length);

        const requestBody = {
            version: { number: newVersion },
            title: 'Build Information',
            type: 'page',
            body: {
                storage: {
                    value: updatedContent,
                    representation: "storage"
                }
            }
        };

        const response = await fetch(`${confluenceUrl}/${pageId}`, {
            method: "PUT",
            headers: {
                "Authorization": auth,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const text = await response.text();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        }

        const result = JSON.parse(text);
        console.log("Confluence response:", result);

        return result; // Return the result if needed
    } catch (error) {
        console.error('Error posting to Confluence:', error);
        throw error; // Throw the error to be handled by the caller
    }
};

app.get('/postToConfluence', async (req, res) => {
    try {
        const query = 'SELECT * FROM maebuildinfo';
        const results = await executeQuery(query);
        const latestVersions = getLatestVersions(results);

        if (latestVersions.length > 0) {
            const dataToPost = latestVersions;
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

app.get("/mae/getBuild", (req, res) => {
    const query = 'SELECT * FROM maebuildinfo';
    executeQuery(query)
        .then(results => res.json(results))
        .catch(err => res.status(500).json({ error: 'Error fetching build details' }));
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
    const applicationName = req.params.applicationName;
    const query = 'SELECT * FROM maebuildinfo WHERE ApplicationName = ? ORDER BY STR_TO_DATE(Date_Time, \'%d/%m/%Y %H:%i:%s\') DESC';
    
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

pool.query('SELECT 1', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
