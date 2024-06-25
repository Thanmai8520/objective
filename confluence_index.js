const axios = require('axios');

app.post('/api/post-to-confluence', async (req, res) => {
    const confluenceUrl = 'https://your-confluence-instance.atlassian.net/wiki/rest/api/content/';
    const pageId = 'YOUR_PAGE_ID';
    const auth = Buffer.from('your-email@example.com:your-api-token').toString('base64');

    const versionDetails = [
        { environment: 'Development', version: '1.0.0', deployedAt: '2024-06-20T10:00:00Z' },
        { environment: 'Testing', version: '1.1.0', deployedAt: '2024-06-21T11:00:00Z' },
        { environment: 'Production', version: '1.2.0', deployedAt: '2024-06-22T12:00:00Z' }
    ];

    const versionTableHtml = versionDetails.map(version => `
        <tr>
            <td>${version.environment}</td>
            <td>${version.version}</td>
            <td>${new Date(version.deployedAt).toLocaleString()}</td>
        </tr>
    `).join('');

    const pageContent = `
        <table>
            <thead>
                <tr>
                    <th>Environment</th>
                    <th>Version</th>
                    <th>Deployed At</th>
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
