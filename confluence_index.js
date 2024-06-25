const axios = require('axios');

app.post('/api/post-to-confluence', async (req, res) => {
    const confluenceUrl = 'https://your-confluence-instance.atlassian.net/wiki/rest/api/content/';
    const pageId = 'YOUR_PAGE_ID';
    const auth = Buffer.from('your-email@example.com:your-api-token').toString('base64');

    const versionDetails = [
        {
            "ApplicationName": "composite-code-template",
            "TargetEnvironment": "MAE-CIT",
            "Version": "1.6.131",
            "Release": "R1.0 Calculator",
            "JiraTaskId": "https://estjira.barcapint.com/browse/MAEAPIRELE-7",
            "ReleaseNotes": "https://estjira.barcapint.com/browse/SECBOW23-11946",
            "Date_Time": "17/01/2024 09:14:03"
        }
    ];

    const versionTableHtml = versionDetails.map(version => `
        <tr>
            <td>${version.ApplicationName}</td>
            <td>${version.TargetEnvironment}</td>
            <td>${version.Version}</td>
            <td>${version.Release}</td>
            <td><a href="${version.JiraTaskId}">${version.JiraTaskId}</a></td>
            <td><a href="${version.ReleaseNotes}">${version.ReleaseNotes}</a></td>
            <td>${version.Date_Time}</td>
        </tr>
    `).join('');

    const pageContent = `
        <table>
            <thead>
                <tr>
                    <th>Application Name</th>
                    <th>Environment</th>
                    <th>Version</th>
                    <th>Release</th>
                    <th>Jira Task ID</th>
                    <th>Release Notes</th>
                    <th>Date/Time</th>
                </tr>
            </thead>
            <tbody>
                ${versionTableHtml}
            </tbody>
        </table>
    `;

    try {
        const response = await axios.get(`${confluenceUrl}${pageId}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        const currentPage = response.data;
        const newPage = {
            version: {
                number: currentPage.version.number + 1
            },
            title: currentPage.title,
            type: 'page',
            body: {
                storage: {
                    value: pageContent,
                    representation: 'storage'
                }
            }
        };

        await axios.put(`${confluenceUrl}${pageId}`, newPage, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).send('Posted to Confluence successfully');
    } catch (error) {
        console.error('Error posting to Confluence', error);
        res.status(500).send('Error posting to Confluence');
    }
});
