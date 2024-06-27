const express = require('express');
const app = express();
const port = 3000;

// Example data (replace with your actual data retrieval logic)
const buildDetails = [
    {
        "ApplicationName": "composite-code-template",
        "TargetEnvironment": "MAE-CIT",
        "Version": "1.6.131",
        "Release": "R1.0 Calculator",
        "JiraTaskId": "https://estjira.barcapint.com/browse/MAEAPIRELE-7",
        "ReleaseNotes": "https://estjira.barcapint.com/browse/SECBOW23-11946",
        "Date_Time": "17/01/2024 09:14:03"
    },
    {
        "ApplicationName": "composite-code-template",
        "TargetEnvironment": "MAE-SIT",
        "Version": "1.6.132",
        "Release": "R1.0 Calculator",
        "JiraTaskId": "https://estjira.barcapint.com/browse/MAEAPIRELE-7",
        "ReleaseNotes": "https://estjira.barcapint.com/browse/SECBOW23-11946",
        "Date_Time": "17/01/2024 09:14:03"
    },
    {
        "ApplicationName": "composite-code-template1",
        "TargetEnvironment": "MAE-SIT1",
        "Version": "1.6.132",
        "Release": "R1.0 Calculator",
        "JiraTaskId": "https://estjira.barcapint.com/browse/MAEAPIRELE-7",
        "ReleaseNotes": "https://estjira.barcapint.com/browse/SECBOW23-11946",
        "Date_Time": "17/01/2024 09:14:03"
    }
];

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
    const { applicationName } = req.params;
    const filteredBuilds = buildDetails.filter(build => build.ApplicationName === applicationName);
    if (filteredBuilds.length > 0) {
        res.json(filteredBuilds);
    } else {
        res.status(404).json({ message: "Build details not found for the application name" });
    }
});

// GET endpoint to fetch all build details
app.get('/mae/getBuild', (req, res) => {
    res.json(buildDetails);
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
