const express = require('express');
const app = express();
const port = 3000;
const { pollvs } = require('./polling');

// GET endpoint to fetch all build details
app.get('/mae/getBuild', (req, res) => {
  pollvs('maebuildinfo', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET endpoint to fetch build details by applicationName
app.get('/mae/getBuild/:applicationName', (req, res) => {
  const { applicationName } = req.params;
  pollvs('maebuildinfo', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const filteredBuilds = rows.filter(build => build.ApplicationName === applicationName);
      if (filteredBuilds.length > 0) {
        res.json(filteredBuilds);
      } else {
        res.status(404).json({ message: 'Build details not found for the application name' });
      }
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
