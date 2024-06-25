// const express = require('express');
// const app = express();
// const port = 3000;

// const versionDetailsRoute = require('./versionDetails');

// app.use('/api', versionDetailsRoute);

// app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
// });



const express = require('express');
const app = express();
const port = 3000;

// Mock data - replace this with your actual data retrieval logic from datastore
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

app.get('/api/versions', (req, res) => {
    res.json(versionDetails);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
