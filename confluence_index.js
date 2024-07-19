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
const auth = 'Bearer OTEMMTIxNTc3Mzg30ta91VBrtK5WCZ]bsEyQH+mhgqgm'; // Personal access token
const pageId = 2464689130; // Confluence page ID

const fetchPageContent = async () => {
    try {
        const response = await fetch(`${confluenceUrl}/${pageId}?expand=body.storage`, {
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const content = result.body.storage.value;
        console.log('Current Page Content:', content); // Print the current content
        return content;
    } catch (error) {
        console.error('Error fetching page content:', error);
        throw error;
    }
};

const getConfluencePageVersion = async () => {
    try {
        const response = await fetch(`${confluenceUrl}/${pageId}?expand=version`, {
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

const postToConfluence = async (data) => {
    try {
        const currentVersion = await getConfluencePageVersion();
        const newVersion = currentVersion + 1;

        // Fetch the current content
        const currentContent = await fetchPageContent();

        // Locate the "Version Control" heading using a flexible approach
        const versionControlHeadingRegex = /<h[1-6][^>]*>\s*Version Control\s*<\/h[1-6]>/i;
        const match = currentContent.match(versionControlHeadingRegex);

        if (!match) {
            throw new Error('Version Control heading not found in the page content');
        }

        const headingIndex = match.index + match[0].length;
        const postHeadingIndex = headingIndex + 1;

        // Filter data to include only the latest entry for each application
        const latestData = getLatestVersions(data);

        // Find the existing table and replace its content
        const existingTableRegex = /<table[^>]*>([\s\S]*?)<\/table>/i;
        let updatedContent;

        if (currentContent.match(existingTableRegex)) {
            const existingTableMatch = currentContent.match(existingTableRegex);
            const existingTable = existingTableMatch[0];
            const tableIndex = existingTableMatch.index;
            const existingTableContent = existingTableMatch[1];

            // Replace existing table content with new data
            updatedContent = `${currentContent.slice(0, tableIndex)}<table>
                <tr>
                    <th>Application Name</th>
                    <th>Target Environment</th>
                    <th>Version</th>
                    <th>Release</th>
                    <th>Jira Task ID</th>
                    <th>Release Notes</th>
                    <th>Date and Time</th>
                </tr>
                ${latestData.map(item => `
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
            </table>${currentContent.slice(tableIndex + existingTable.length)}`;
        } else {
            // If no table exists, insert a new one
            updatedContent = `${currentContent.slice(0, postHeadingIndex)}
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
                ${latestData.map(item => `
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
            ${currentContent.slice(postHeadingIndex)}`;
        }

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

        console.log('Request Body:', JSON.stringify(requestBody, null, 2));

        // Post the data to Confluence
        const updateResponse = await fetch(`${confluenceUrl}/${pageId}`, {
            method: 'PUT',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const text = await updateResponse.text();
        if (!updateResponse.ok) {
            throw new Error(`HTTP error! status: ${updateResponse.status}, message: ${text}`);
        }

        const updateResult = JSON.parse(text);
        console.log('Confluence response:', updateResult);
        return updateResult; // Return the result if needed
    } catch (error) {
        console.error('Error posting to Confluence:', error);
        throw error; // Throw the error to be handled by the caller
    }
};

app.get('/postToConfluence', async (req, res) => {
    try {
        const query = 'SELECT * FROM maebuildinfo';
        const dbResults = await executeQuery(query);
        const results = getLatestVersions(dbResults);

        if (results.length > 0) {
            const dataToPost = results;
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

app.get('/mae/getBuild/:applicationName', async (req, res) => {
    const { applicationName } = req.params;

    try {
        const query = 'SELECT * FROM maebuildinfo WHERE ApplicationName = ?';
        const results = await executeQuery(query, [applicationName]);

        if (results.length > 0) {
            const latestResult = getLatestVersions(results);
            res.json(latestResult);
        } else {
            res.status(404).json({ message: 'Build details not found for the application name' });
        }
    } catch (err) {
        console.error('Error fetching build details:', err);
        res.status(500).json({ error: 'Error fetching build details' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
