import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VersionTable = () => {
  const [versions, setVersions] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState('');
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/mae/getBuild')
      .then(response => response.json())
      .then(data => {
        setVersions(data);
        const uniqueApps = [...new Set(data.map(item => item.ApplicationName))];
        setApplications(uniqueApps);
      })
      .catch(error => {
        console.error('Error fetching version details:', error);
        setError(error.message);
      });
  }, []);

  const handleApplicationChange = (event) => {
    const applicationName = event.target.value;
    setSelectedApplication(applicationName);

    if (applicationName === '') {
      // Fetch all versions
      fetch('http://localhost:3000/mae/getBuild')
        .then(response => response.json())
        .then(data => setVersions(data))
        .catch(error => {
          console.error('Error fetching version details:', error);
          setError(error.message);
        });
    } else {
      // Fetch versions for the selected application
      fetch(`http://localhost:3000/mae/getBuild/${applicationName}`)
        .then(response => response.json())
        .then(data => setVersions(data))
        .catch(error => {
          console.error('Error fetching version details:', error);
          setError(error.message);
        });
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container">
      <h2 className="my-4">Version Details</h2>
      <div className="form-group">
        <label htmlFor="applicationSelect">Select Application:</label>
        <select id="applicationSelect" className="form-control" value={selectedApplication} onChange={handleApplicationChange}>
          <option value="">All Applications</option>
          {applications.map((app, index) => (
            <option key={index} value={app}>{app}</option>
          ))}
        </select>
      </div>
      <div className="table-responsive">
        <table className="table table-striped mt-4">
          <thead>
            <tr>
              <th>Application Name</th>
              <th>Target Environment</th>
              <th>Version</th>
              <th>Release</th>
              <th>Jira Task ID</th>
              <th>Release Notes</th>
              <th>Date and Time</th>
            </tr>
          </thead>
          <tbody>
            {versions.length > 0 ? (
              versions.map((version, index) => (
                <tr key={index}>
                  <td>{version.ApplicationName}</td>
                  <td>{version.TargetEnvironment}</td>
                  <td>{version.Version}</td>
                  <td>{version.Release}</td>
                  <td><a href={version.JiraTaskId} target="_blank" rel="noopener noreferrer">{version.JiraTaskId}</a></td>
                  <td><a href={version.ReleaseNotes} target="_blank" rel="noopener noreferrer">{version.ReleaseNotes}</a></td>
                  <td>{version.Date_Time}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VersionTable;
