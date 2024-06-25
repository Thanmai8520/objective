const express = require('express');
const app = express();
const port = 3000;

const versionDetailsRoute = require('./versionDetails');

app.use('/api', versionDetailsRoute);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});



// const express = require('express');
// const app = express();
// const port = 3000;

// // Mock data - replace this with your actual data retrieval logic
// const versionDetails = [
//     { environment: 'Development', version: '1.0.0', deployedAt: '2024-06-20T10:00:00Z' },
//     { environment: 'Testing', version: '1.1.0', deployedAt: '2024-06-21T11:00:00Z' },
//     { environment: 'Production', version: '1.2.0', deployedAt: '2024-06-22T12:00:00Z' }
// ];

// app.get('/api/versions', (req, res) => {
//     res.json(versionDetails);
// });

// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });
